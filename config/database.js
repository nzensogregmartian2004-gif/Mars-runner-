// ============================================
// config/database.js - VERSION CORRIGÉE FINALE
// ============================================

const mysql = require("mysql2/promise"); // ✅ IMPORTANT : mysql2/promise
require("dotenv").config();

// Création du pool de connexions
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "mars_runner",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: "+00:00",
  dateStrings: false,
  multipleStatements: false,
});

// Test de connexion
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Connexion MySQL établie avec succès");
    connection.release();
    return true;
  } catch (error) {
    console.error("❌ Erreur de connexion MySQL:", error.message);
    return false;
  }
};

// Fonction pour exécuter des requêtes avec gestion d'erreur
const query = async (sql, params = []) => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error("❌ Erreur requête SQL:", error.message);
    throw error;
  }
};

// ✅ Fonction pour les transactions - CORRIGÉE
const transaction = async (callback) => {
  const connection = await pool.getConnection();

  try {
    // ✅ Démarrer la transaction
    await connection.beginTransaction();

    // ✅ Créer un wrapper avec les méthodes query et execute
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

    // ✅ Exécuter le callback avec le wrapper
    const result = await callback(trx);

    // ✅ Commit si tout s'est bien passé
    await connection.commit();

    return result;
  } catch (error) {
    // ✅ Rollback en cas d'erreur
    await connection.rollback();
    console.error("❌ Erreur transaction:", error.message);
    throw error;
  } finally {
    // ✅ Toujours libérer la connexion
    connection.release();
  }
};

// Fonction pour fermer le pool proprement
const closePool = async () => {
  try {
    await pool.end();
    console.log("✅ Pool MySQL fermé proprement");
  } catch (error) {
    console.error("❌ Erreur fermeture pool:", error.message);
  }
};

module.exports = {
  pool,
  query,
  transaction,
  testConnection,
  closePool,
};
