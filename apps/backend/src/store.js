const crypto = require("crypto");
const config = require("./config");
const { query } = require("./db");

const getAvatar = (address) =>
  `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`;

const generateNonce = () => crypto.randomBytes(16).toString("hex");

const normalizeUser = (row) => {
  if (!row) {
    return null;
  }

  return {
    address: row.address,
    evmAddress: row.address,
    displayName: row.display_name || row.address,
    name: row.display_name || row.address,
    bio: row.bio || "",
    avatar: getAvatar(row.address),
  };
};

const ensureUser = async (address) => {
  const nonce = generateNonce();
  await query(
    `
      INSERT INTO users (address, display_name, nonce)
      VALUES ($1, $1, $2)
      ON CONFLICT (address) DO NOTHING
    `,
    [address, nonce]
  );
  const result = await query(`SELECT * FROM users WHERE address = $1`, [address]);
  return normalizeUser(result.rows[0]);
};

const getUser = async (address) => {
  const result = await query(`SELECT * FROM users WHERE address = $1`, [address]);
  return normalizeUser(result.rows[0]);
};

const setUserNonce = async (address, nonce) => {
  await query(
    `
      UPDATE users
      SET nonce = $2, updated_at = NOW()
      WHERE address = $1
    `,
    [address, nonce]
  );
};

const getUserNonce = async (address) => {
  const result = await query(`SELECT nonce FROM users WHERE address = $1`, [address]);
  return result.rows[0]?.nonce || null;
};

const updateUserField = async (address, field, value) => {
  const columns = {
    displayName: "display_name",
    bio: "bio",
  };
  const column = columns[field];
  if (!column) {
    throw new Error(`Unsupported user field: ${field}`);
  }

  await query(
    `
      UPDATE users
      SET ${column} = $2, updated_at = NOW()
      WHERE address = $1
    `,
    [address, value]
  );

  return getUser(address);
};

const createCollection = async (collection) => {
  await query(
    `
      INSERT INTO collections (id, owner, name, description, image, thumbnail, traits)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        owner = EXCLUDED.owner,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        image = EXCLUDED.image,
        thumbnail = EXCLUDED.thumbnail,
        traits = EXCLUDED.traits
    `,
    [
      collection.id,
      collection.owner,
      collection.name,
      collection.description || "",
      collection.image || "",
      collection.thumbnail || "",
      JSON.stringify(collection.traits || {}),
    ]
  );

  return getCollection(collection.id);
};

const getCollection = async (collectionId) => {
  const result = await query(`SELECT * FROM collections WHERE id = $1`, [collectionId]);
  return result.rows[0] || null;
};

const listCollectionsByOwner = async (owner) => {
  const result = await query(
    `SELECT * FROM collections WHERE owner = $1 ORDER BY created_at DESC`,
    [owner]
  );
  return result.rows;
};

const listCollectionsByStats = async (limit = 8) => {
  const result = await query(
    `SELECT * FROM collections ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
};

const searchCollections = async (term, page = 1, perPage = 10) => {
  const offset = (page - 1) * perPage;
  const search = `%${term.toLowerCase()}%`;
  const [items, total] = await Promise.all([
    query(
      `
        SELECT * FROM collections
        WHERE LOWER(name) LIKE $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [search, perPage, offset]
    ),
    query(
      `SELECT COUNT(*)::int AS total FROM collections WHERE LOWER(name) LIKE $1`,
      [search]
    ),
  ]);

  return {
    collections: items.rows,
    total: total.rows[0]?.total || 0,
  };
};

const searchUsers = async (term, limit = 5) => {
  const search = `%${term.toLowerCase()}%`;
  const result = await query(
    `
      SELECT * FROM users
      WHERE LOWER(display_name) LIKE $1 OR LOWER(address) LIKE $1
      ORDER BY updated_at DESC
      LIMIT $2
    `,
    [search, limit]
  );
  return result.rows.map(normalizeUser);
};

const upsertCollectible = async (collectible) => {
  await query(
    `
      INSERT INTO collectibles (item_id, token_id, collection_id, creator, uri, approved, meta)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      ON CONFLICT (item_id) DO UPDATE SET
        token_id = EXCLUDED.token_id,
        collection_id = EXCLUDED.collection_id,
        creator = EXCLUDED.creator,
        uri = EXCLUDED.uri,
        approved = EXCLUDED.approved,
        meta = EXCLUDED.meta
    `,
    [
      collectible.itemId,
      collectible.tokenId,
      collectible.collectionId || config.defaultCollectionId,
      collectible.creator,
      collectible.uri,
      collectible.approved ?? true,
      JSON.stringify(collectible.meta || {}),
    ]
  );

  return getCollectible(collectible.itemId);
};

const getCollectible = async (itemId) => {
  const result = await query(`SELECT * FROM collectibles WHERE item_id = $1`, [itemId]);
  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    itemId: Number(row.item_id),
    tokenId: Number(row.token_id),
    collectionId: row.collection_id,
    creator: row.creator,
    uri: row.uri,
    approved: row.approved,
    meta: row.meta || {},
  };
};

const listCollectiblesByCollection = async (collectionId) => {
  const result = await query(
    `SELECT * FROM collectibles WHERE collection_id = $1 ORDER BY item_id DESC`,
    [collectionId]
  );
  return result.rows;
};

const setCollectibleCollection = async (itemId, collectionId, approved = true) => {
  await query(
    `
      UPDATE collectibles
      SET collection_id = $2, approved = $3
      WHERE item_id = $1
    `,
    [itemId, collectionId, approved]
  );
};

const getHearts = async (itemId) => {
  const result = await query(
    `
      SELECT hearts.address, users.display_name
      FROM hearts
      LEFT JOIN users ON users.address = hearts.address
      WHERE hearts.item_id = $1
      ORDER BY hearts.created_at DESC
    `,
    [itemId]
  );

  return result.rows.map((row) => ({
    address: row.address,
    name: row.display_name || row.address,
  }));
};

const toggleHeart = async (itemId, address) => {
  const existing = await query(
    `SELECT 1 FROM hearts WHERE item_id = $1 AND address = $2`,
    [itemId, address]
  );

  if (existing.rowCount > 0) {
    await query(`DELETE FROM hearts WHERE item_id = $1 AND address = $2`, [
      itemId,
      address,
    ]);
  } else {
    await query(
      `INSERT INTO hearts (item_id, address) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [itemId, address]
    );
  }

  return getHearts(itemId);
};

const replaceFeaturedPositions = async (ids) => {
  await query(`DELETE FROM featured_positions`);
  for (const id of ids) {
    await query(
      `INSERT INTO featured_positions (position_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [id]
    );
  }
};

const listFeaturedPositions = async () => {
  const result = await query(
    `SELECT position_id FROM featured_positions ORDER BY created_at DESC`
  );
  return result.rows.map((row) => Number(row.position_id));
};

const isModerator = async (address) => {
  const result = await query(`SELECT 1 FROM moderators WHERE address = $1`, [address]);
  if (result.rowCount > 0) {
    return true;
  }

  const total = await query(`SELECT COUNT(*)::int AS total FROM moderators`);
  return (total.rows[0]?.total || 0) === 0;
};

const addModerator = async (address) => {
  await query(
    `INSERT INTO moderators (address) VALUES ($1) ON CONFLICT DO NOTHING`,
    [address]
  );
};

const getSyncValue = async (key, fallback = null) => {
  const result = await query(`SELECT value FROM sync_state WHERE key = $1`, [key]);
  return result.rows[0]?.value ?? fallback;
};

const setSyncValue = async (key, value) => {
  await query(
    `
      INSERT INTO sync_state (key, value, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `,
    [key, JSON.stringify(value)]
  );
};

module.exports = {
  ensureUser,
  getUser,
  setUserNonce,
  getUserNonce,
  updateUserField,
  createCollection,
  getCollection,
  listCollectionsByOwner,
  listCollectionsByStats,
  searchCollections,
  searchUsers,
  upsertCollectible,
  getCollectible,
  listCollectiblesByCollection,
  setCollectibleCollection,
  getHearts,
  toggleHeart,
  replaceFeaturedPositions,
  listFeaturedPositions,
  isModerator,
  addModerator,
  getSyncValue,
  setSyncValue,
  getAvatar,
  generateNonce,
};
