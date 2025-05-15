const { Pool } = require("pg");

// No dotenv because env vars are from Render dashboard directly

const pool = new Pool({
  user: process.env.DB_USER,              // e.g. 'aditya'
  host: process.env.DB_HOST,              // full hostname like 'dpg-xxxxxx.render.com'
  database: process.env.DB_NAME,          // your database name
  password: process.env.DB_PASSWORD,      // your password
  port: parseInt(process.env.DB_PORT, 10) || 5432,  // default to 5432 if not set
  ssl: {
    rejectUnauthorized: false,            // important for Render managed Postgres
  },
  max: 50,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

const testConnection = async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log("✅ Connected to PostgreSQL database");
    return true;
  } catch (err) {
    console.error("❌ Database connection error:");
    console.error("  - Message:", err.message);
    console.error("  - Code:", err.code);
    console.error("  - Detail:", err.detail || "No additional details");
    console.error("  - Hint:", err.hint || "No hint available");
    console.error("  - Where:", err.where || "No location provided");
    console.error("  - Stack Trace:\n", err.stack);
    return false;
  }
};

const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error("❌ Database query error:", error.message);
    throw error;
  }
};

module.exports = {
  pool,
  query,
  testConnection
};
