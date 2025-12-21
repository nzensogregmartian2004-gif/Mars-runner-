// config/database.js - pour Render (mysql2/promise) - prend en charge SSL via DB_SSL
const mysql = require("mysql2/promise");
require("dotenv").config();

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = parseInt(process.env.DB_PORT || "3306", 10);
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD;
if (!DB_PASSWORD) {
  throw new Error("❌ DB_PASSWORD manquant");
}

const DB_NAME = process.env.DB_NAME || "mars_runner";
const DB_CONNECTION_LIMIT = parseInt(
  process.env.DB_CONNECTION_LIMIT || "10",
  10
);
const DB_SSL = (process.env.DB_SSL || "false").toLowerCase() === "true";
const DB_SSL_CA = process.env.DB_SSL_CA || ""; // si nécessaire : contenu PEM

const poolOptions = {
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: DB_CONNECTION_LIMIT,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: "+00:00",
  dateStrings: false,
  multipleStatements: false,
};

// Ajouter SSL si demandé
if (DB_SSL) {
  poolOptions.ssl = {
    rejectUnauthorized: true,
  };
  if (DB_SSL_CA) {
    poolOptions.ssl.ca = DB_SSL_CA;
  }
}

const pool = mysql.createPool(poolOptions);

const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Connexion MySQL OK:", `${DB_HOST}:${DB_PORT}/${DB_NAME}`);
    connection.release();
    return true;
  } catch (error) {
    console.error("❌ Erreur connexion MySQL:", error && error.message);
    return false;
  }
};

const query = async (sql, params = []) => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error("❌ Erreur requête SQL:", error && error.message, sql);
    throw error;
  }
};

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
