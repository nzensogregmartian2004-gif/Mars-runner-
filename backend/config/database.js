// backend/config/database.js
const mysql = require("mysql2/promise");
require("dotenv").config();

/**
 * On utilise UNIQUEMENT DATABASE_URL (Railway / Render compatible)
 * Aucun DB_HOST / DB_PASSWORD pour éviter les conflits
 */
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("❌ DATABASE_URL manquant");
}

// Pool MySQL
const pool = mysql.createPool(DATABASE_URL);

// Test connexion au démarrage
const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ Connexion MySQL OK (DATABASE_URL)");
    conn.release();
    return true;
  } catch (err) {
    console.error("❌ Erreur connexion MySQL:", err);
    return false;
  }
};

// Requêtes simples
const query = async (sql, params = []) => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error("❌ Erreur requête SQL:", error && error.message, sql);
    throw error;
  }
};

// Transactions
const transaction = async (callback) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const trx = {
      query: async (sql, params = []) => {
        const [rows] = await connection.execute(sql, params);
        return rows;
      },
      execute: async (sql, params = []) => {
        const [rows] = await connection.execute(sql, params);
        return rows;
      },
    };

    const result = await callback(trx);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    console.error("❌ Erreur transaction:", error && error.message);
    throw error;
  } finally {
    connection.release();
  }
};

// Fermeture propre
const closePool = async () => {
  try {
    await pool.end();
    console.log("✅ Pool MySQL fermé proprement");
  } catch (error) {
    console.error("❌ Erreur fermeture pool:", error && error.message);
  }
};

module.exports = {
  pool,
  query,
  transaction,
  testConnection,
  closePool,
};
