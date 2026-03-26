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

const SEARCH_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "by",
  "find",
  "for",
  "from",
  "in",
  "me",
  "of",
  "on",
  "search",
  "show",
  "the",
  "to",
  "with",
]);

const SEARCH_INTENT_WORDS = new Set([
  "address",
  "artist",
  "best",
  "collection",
  "collections",
  "creator",
  "creators",
  "latest",
  "new",
  "newest",
  "nft",
  "nfts",
  "owner",
  "popular",
  "recent",
  "recently",
  "top",
  "trending",
  "user",
  "users",
  "wallet",
]);

const uniqueValues = (values) => [...new Set(values.filter(Boolean))];

const normalizeSearchText = (value = "") =>
  (value ?? "")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

const tokenizeSearch = (value = "") =>
  uniqueValues(normalizeSearchText(value).split(/[^a-z0-9x]+/).filter(Boolean));

const extractAddressFragment = (value = "") =>
  normalizeSearchText(value).match(/0x[a-f0-9]{4,40}/)?.[0] || null;

const describeSearchIntent = (term, scope = "everything") => {
  const normalized = normalizeSearchText(term);
  const rawTokens = tokenizeSearch(normalized);
  const addressFragment = extractAddressFragment(normalized);
  const isLatestIntent = /\b(latest|new|newest|recent|recently)\b/i.test(term);
  const isTopIntent = /\b(top|best|popular|trending)\b/i.test(term);
  const meaningfulTokens = rawTokens.filter(
    (token) =>
      token.length > 1 &&
      !SEARCH_STOP_WORDS.has(token) &&
      !SEARCH_INTENT_WORDS.has(token)
  );

  let summary = `Searching ${scope} across names, descriptions, creators, and wallet fragments.`;
  if (addressFragment) {
    summary = `Searching ${scope} by wallet fragment and creator ownership.`;
  } else if (isLatestIntent) {
    summary = `Searching ${scope} with extra weight on the newest matches.`;
  } else if (isTopIntent) {
    summary = `Searching ${scope} with extra weight on the strongest matches first.`;
  }

  return {
    mode: addressFragment ? "address" : isLatestIntent ? "latest" : isTopIntent ? "top" : "semantic",
    query: normalized,
    rawTokens,
    meaningfulTokens,
    addressFragment,
    summary,
    helperText: "Try a collection name, description, creator name, or a wallet fragment like 0x212e.",
  };
};

const scoreTextField = (
  value,
  query,
  tokens,
  {
    label,
    exact = 80,
    prefix = 54,
    phrase = 42,
    tokenExact = 18,
    tokenPrefix = 13,
    tokenIncludes = 8,
  } = {}
) => {
  const normalizedValue = normalizeSearchText(value);
  if (!normalizedValue) {
    return { score: 0, reasons: [], matchedTokens: [] };
  }

  const words = tokenizeSearch(normalizedValue);
  let score = 0;
  const reasons = [];
  const matchedTokens = new Set();

  if (query) {
    if (normalizedValue === query) {
      score += exact;
      reasons.push(`Exact ${label} match`);
    } else if (normalizedValue.startsWith(query)) {
      score += prefix;
      reasons.push(`${label} starts with your query`);
    } else if (normalizedValue.includes(query)) {
      score += phrase;
      reasons.push(`${label} mentions your query`);
    }
  }

  for (const token of tokens) {
    if (!token) {
      continue;
    }

    if (words.includes(token)) {
      score += tokenExact;
      matchedTokens.add(token);
      reasons.push(`${label} matches "${token}"`);
      continue;
    }

    if (words.some((word) => word.startsWith(token))) {
      score += tokenPrefix;
      matchedTokens.add(token);
      reasons.push(`${label} starts with "${token}"`);
      continue;
    }

    if (normalizedValue.includes(token)) {
      score += tokenIncludes;
      matchedTokens.add(token);
      reasons.push(`${label} includes "${token}"`);
    }
  }

  return {
    score,
    reasons: uniqueValues(reasons),
    matchedTokens: [...matchedTokens],
  };
};

const buildSearchMeta = ({ score, reasons, matchedFields }) => {
  const uniqueReasons = uniqueValues(reasons).slice(0, 3);
  const primaryReason =
    uniqueReasons.find((reason) => reason !== "All search terms matched") ||
    uniqueReasons[0] ||
    "Related match";

  return {
    score,
    reason: primaryReason,
    reasons: uniqueReasons,
    matchedFields: [...matchedFields],
  };
};

const scoreCollectionCandidate = (row, insight) => {
  const tokens = insight.meaningfulTokens;
  const query = tokens.join(" ") || (!insight.addressFragment ? insight.query : "");
  const reasons = [];
  const matchedFields = new Set();
  const matchedTokens = new Set();
  let score = 0;

  const applyFieldScore = (fieldResult, fieldName) => {
    if (!fieldResult.score) {
      return;
    }

    score += fieldResult.score;
    fieldResult.reasons.forEach((reason) => reasons.push(reason));
    fieldResult.matchedTokens.forEach((token) => matchedTokens.add(token));
    matchedFields.add(fieldName);
  };

  applyFieldScore(
    scoreTextField(row.name, query, tokens, {
      label: "Collection name",
      exact: 120,
      prefix: 88,
      phrase: 70,
      tokenExact: 28,
      tokenPrefix: 18,
      tokenIncludes: 12,
    }),
    "name"
  );

  applyFieldScore(
    scoreTextField(row.description, query, tokens, {
      label: "Description",
      exact: 56,
      prefix: 36,
      phrase: 28,
      tokenExact: 12,
      tokenPrefix: 10,
      tokenIncludes: 7,
    }),
    "description"
  );

  applyFieldScore(
    scoreTextField(row.owner_display_name, query, tokens, {
      label: "Creator",
      exact: 72,
      prefix: 52,
      phrase: 34,
      tokenExact: 14,
      tokenPrefix: 12,
      tokenIncludes: 8,
    }),
    "creator"
  );

  applyFieldScore(
    scoreTextField(row.owner, insight.addressFragment || query, insight.addressFragment ? [] : tokens, {
      label: "Creator address",
      exact: 110,
      prefix: 86,
      phrase: 48,
      tokenExact: 16,
      tokenPrefix: 12,
      tokenIncludes: 8,
    }),
    "owner"
  );

  if (insight.addressFragment) {
    const owner = normalizeSearchText(row.owner);
    if (owner.startsWith(insight.addressFragment)) {
      score += 90;
      reasons.push("Creator wallet starts with your address fragment");
      matchedFields.add("owner");
    } else if (owner.includes(insight.addressFragment)) {
      score += 60;
      reasons.push("Creator wallet contains your address fragment");
      matchedFields.add("owner");
    }
  }

  if (!tokens.length && !insight.addressFragment) {
    if (insight.mode === "latest") {
      score += 20;
      reasons.push("Newest collection");
    } else if (insight.mode === "top") {
      score += 12;
      reasons.push("Strong collection match");
    }
  }

  if (tokens.length && matchedTokens.size === tokens.length) {
    score += 24;
    reasons.unshift("All search terms matched");
  }

  return buildSearchMeta({ score, reasons, matchedFields });
};

const scoreUserCandidate = (row, insight) => {
  const tokens = insight.meaningfulTokens;
  const query = tokens.join(" ") || (!insight.addressFragment ? insight.query : "");
  const reasons = [];
  const matchedFields = new Set();
  const matchedTokens = new Set();
  let score = 0;

  const applyFieldScore = (fieldResult, fieldName) => {
    if (!fieldResult.score) {
      return;
    }

    score += fieldResult.score;
    fieldResult.reasons.forEach((reason) => reasons.push(reason));
    fieldResult.matchedTokens.forEach((token) => matchedTokens.add(token));
    matchedFields.add(fieldName);
  };

  applyFieldScore(
    scoreTextField(row.display_name, query, tokens, {
      label: "User name",
      exact: 118,
      prefix: 82,
      phrase: 58,
      tokenExact: 24,
      tokenPrefix: 16,
      tokenIncludes: 10,
    }),
    "displayName"
  );

  applyFieldScore(
    scoreTextField(row.bio, query, tokens, {
      label: "Bio",
      exact: 40,
      prefix: 24,
      phrase: 18,
      tokenExact: 10,
      tokenPrefix: 8,
      tokenIncludes: 6,
    }),
    "bio"
  );

  applyFieldScore(
    scoreTextField(row.address, insight.addressFragment || query, insight.addressFragment ? [] : tokens, {
      label: "Wallet",
      exact: 110,
      prefix: 86,
      phrase: 42,
      tokenExact: 14,
      tokenPrefix: 12,
      tokenIncludes: 7,
    }),
    "address"
  );

  if (insight.addressFragment) {
    const address = normalizeSearchText(row.address);
    if (address.startsWith(insight.addressFragment)) {
      score += 96;
      reasons.push("Wallet starts with your address fragment");
      matchedFields.add("address");
    } else if (address.includes(insight.addressFragment)) {
      score += 60;
      reasons.push("Wallet contains your address fragment");
      matchedFields.add("address");
    }
  }

  if (tokens.length && matchedTokens.size === tokens.length) {
    score += 18;
    reasons.unshift("All search terms matched");
  }

  return buildSearchMeta({ score, reasons, matchedFields });
};

const compareSearchRows = (left, right, insight, timestampKey) => {
  const scoreDelta = (right.searchMeta?.score || 0) - (left.searchMeta?.score || 0);
  if (scoreDelta !== 0) {
    return scoreDelta;
  }

  const timeDelta =
    Date.parse(right?.[timestampKey] || 0) - Date.parse(left?.[timestampKey] || 0);
  if (timeDelta !== 0) {
    return timeDelta;
  }

  if (insight.mode === "address") {
    return normalizeSearchText(left?.name || left?.display_name || "").localeCompare(
      normalizeSearchText(right?.name || right?.display_name || "")
    );
  }

  return normalizeSearchText(left?.name || left?.display_name || "").localeCompare(
    normalizeSearchText(right?.name || right?.display_name || "")
  );
};

const searchCollections = async (term, page = 1, perPage = 10) => {
  const offset = (page - 1) * perPage;
  const insight = describeSearchIntent(term, "collections");
  const result = await query(
    `
      SELECT collections.*, users.display_name AS owner_display_name
      FROM collections
      LEFT JOIN users ON users.address = collections.owner
      ORDER BY collections.created_at DESC
      LIMIT 500
    `
  );

  const collections = result.rows
    .map((row) => ({
      ...row,
      searchMeta: scoreCollectionCandidate(row, insight),
    }))
    .filter(
      (row) =>
        row.searchMeta.score > 0 &&
        (row.id !== config.defaultCollectionId ||
          insight.query.includes("default") ||
          row.searchMeta.score >= 100)
    )
    .sort((left, right) => compareSearchRows(left, right, insight, "created_at"));

  return {
    collections: collections.slice(offset, offset + perPage),
    total: collections.length,
    insight,
  };
};

const searchUsers = async (term, page = 1, perPage = 10) => {
  const offset = (page - 1) * perPage;
  const insight = describeSearchIntent(term, "users");
  const result = await query(
    `
      SELECT * FROM users
      ORDER BY updated_at DESC
      LIMIT 500
    `
  );

  const users = result.rows
    .map((row) => ({
      ...normalizeUser(row),
      updated_at: row.updated_at,
      searchMeta: scoreUserCandidate(row, insight),
    }))
    .filter((row) => row.searchMeta.score > 0)
    .sort((left, right) => compareSearchRows(left, right, insight, "updated_at"));

  return {
    users: users.slice(offset, offset + perPage),
    total: users.length,
    insight,
  };
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
