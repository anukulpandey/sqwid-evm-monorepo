const { migrate, pool } = require("../src/db");

migrate()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error("Migration failed", error);
    await pool.end();
    process.exit(1);
  });
