// db.js
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT, 10),
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  max: 50,                    // Max number of clients in the pool
  idleTimeoutMillis: 30000,  // Close idle clients after 30s
  connectionTimeoutMillis: 5000 // Wait max 5s for a new connection
});

const testConnection = async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log("✅ Connected to PostgreSQL database");
    return true;
  } catch (err) {
    console.error("❌ Database connection error:", err.message);
    return false;
  }
};

// General query executor with error handling
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
