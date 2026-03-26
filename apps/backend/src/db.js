const { Pool } = require("pg");
const config = require("./config");

const pool = new Pool({
  connectionString: config.databaseUrl,
});

const query = (text, params) => pool.query(text, params);

const migrate = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      address TEXT PRIMARY KEY,
      display_name TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      nonce TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      thumbnail TEXT NOT NULL DEFAULT '',
      traits JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS collectibles (
      item_id BIGINT PRIMARY KEY,
      token_id BIGINT NOT NULL,
      collection_id TEXT NOT NULL,
      creator TEXT NOT NULL,
      uri TEXT NOT NULL,
      approved BOOLEAN NOT NULL DEFAULT TRUE,
      meta JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hearts (
      item_id BIGINT NOT NULL,
      address TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (item_id, address)
    );

    CREATE TABLE IF NOT EXISTS featured_positions (
      position_id BIGINT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS moderators (
      address TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_users_display_name ON users (LOWER(display_name));
    CREATE INDEX IF NOT EXISTS idx_collections_owner ON collections (owner);
    CREATE INDEX IF NOT EXISTS idx_collections_name ON collections (LOWER(name));
    CREATE INDEX IF NOT EXISTS idx_collectibles_collection_id ON collectibles (collection_id);
    CREATE INDEX IF NOT EXISTS idx_collectibles_creator ON collectibles (creator);
  `);

  await query(
    `
      INSERT INTO collections (id, owner, name, description, image, thumbnail)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `,
    [
      config.defaultCollectionId,
      "0x0000000000000000000000000000000000000000",
      "Default Collection",
      "Default collection for freshly verified items.",
      "",
      "",
    ]
  );

  for (const moderator of config.moderators) {
    await query(
      `
        INSERT INTO moderators (address)
        VALUES ($1)
        ON CONFLICT (address) DO NOTHING
      `,
      [moderator]
    );
  }
};

module.exports = {
  pool,
  query,
  migrate,
};
