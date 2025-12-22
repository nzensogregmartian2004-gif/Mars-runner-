// ============================================
// backend/config/database.js - VERSION OPTIMISÉE
// ============================================
const mysql = require("mysql2/promise");
require("dotenv").config();

/**
 * Vérification des variables d'environnement
 */
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("❌ DATABASE_URL manquant. Vérifiez le fichier .env");
}

/**
 * Création d'un pool de connexions MySQL
 */
/**
 * Création d'un pool de connexions MySQL - VERSION FIX RENDER
 */
const pool = mysql.createPool({
  uri: DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 20000, // Augmenté pour les réseaux lents

  // AJOUTS CRUCIAUX POUR ÉVITER "PROTOCOL_CONNECTION_LOST" :
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000, // Envoie un ping toutes les 10 secondes

  // SSL : Souvent obligatoire sur les plateformes Cloud
  ssl: {
    rejectUnauthorized: false, // Permet la connexion sécurisée sur Render/Aiven/etc.
  },
});

/**
 * Test de la connexion à la base de données au démarrage
 */
const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    await conn.query("SELECT 1"); // On force une vraie petite requête de test
    console.log("✅ Connexion MySQL confirmée et active");
    conn.release();
    return true;
  } catch (err) {
    console.error("❌ Impossible de joindre MySQL :", err.message);
    return false;
  }
};

/**
 * Requêtes simples MySQL
 */
const query = async (sql, params = []) => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error("❌ Erreur SQL:", error.message, sql);
    throw error;
  }
};

/**
 * Gestion des transactions MySQL
 */
const transaction = async (callback) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Fonction qui permet d'exécuter des requêtes dans une transaction
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
    console.error("❌ Erreur dans la transaction MySQL:", error.message);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Fermeture propre du pool de connexions
 */
const closePool = async () => {
  try {
    await pool.end();
    console.log("✅ Pool MySQL fermé proprement");
  } catch (error) {
    console.error(
      "❌ Erreur lors de la fermeture du pool MySQL:",
      error.message
    );
  }
};

/**
 * Export des fonctions pour utilisation globale
 */
module.exports = {
  pool,
  query,
  transaction,
  testConnection,
  closePool,
};
