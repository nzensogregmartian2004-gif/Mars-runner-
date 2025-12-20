// ============================================
// models/transaction.js - COMPLET & CORRIGÉ
// ============================================

const { query, transaction } = require("../config/database");
const { roundToTwo } = require("../utils/helpers");

class Transaction {
  /**
   * Créer une transaction générique
   */
  static async create(transactionData, connection = null) {
    const db = connection || { query };

    const {
      userId,
      type,
      amount_mz,
      amount_fcfa,
      status = "pending",
      gameId = null,
      description = "",
    } = transactionData;

    const sql = `
      INSERT INTO transactions (
        user_id,
        type,
        amount_mz,
        amount_fcfa,
        status,
        game_id,
        description,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const result = await db.query(sql, [
      userId,
      type,
      roundToTwo(amount_mz),
      roundToTwo(amount_fcfa),
      status,
      gameId,
      description,
    ]);

    return { id: result.insertId, ...transactionData };
  }

  /**
   * Créer un bonus nouveau joueur
   */
  static async createNewPlayerBonus(userId, bonusAmount, connection = null) {
    const db = connection || { query };

    const sql = `
      INSERT INTO transactions (
        user_id,
        type,
        amount_mz,
        amount_fcfa,
        status,
        description,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;

    const result = await db.query(sql, [
      userId,
      "bonus",
      roundToTwo(bonusAmount),
      roundToTwo(bonusAmount * 100),
      "confirmed",
      `Bonus de bienvenue: ${bonusAmount} MZ`,
    ]);

    return result.insertId;
  }

  /**
   * Créer une transaction de parrainage
   */
  static async createReferralBonus(
    userId,
    bonusAmount,
    referredUserId,
    connection = null
  ) {
    const db = connection || { query };

    const sql = `
      INSERT INTO transactions (
        user_id,
        type,
        amount_mz,
        amount_fcfa,
        status,
        description,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;

    const result = await db.query(sql, [
      userId,
      "referral_bonus",
      roundToTwo(bonusAmount),
      roundToTwo(bonusAmount * 100),
      "confirmed",
      `Bonus de parrainage pour utilisateur #${referredUserId}`,
    ]);

    return result.insertId;
  }

  /**
   * Récupérer les transactions d'un user
   */
  static async findByUserId(userId, limit = 50, offset = 0, connection = null) {
    const db = connection || { query };
    const sql = `
      SELECT * FROM transactions 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    return await db.query(sql, [userId, limit, offset]);
  }

  /**
   * Récupérer une transaction par ID
   */
  static async findById(transactionId, connection = null) {
    const db = connection || { query };
    const sql = "SELECT * FROM transactions WHERE id = ? ";
    const result = await db.query(sql, [transactionId]);
    return result[0] || null;
  }

  /**
   * Mettre à jour le statut
   */
  static async updateStatus(transactionId, newStatus, connection = null) {
    const db = connection || { query };
    const sql =
      "UPDATE transactions SET status = ?, updated_at = NOW() WHERE id = ?";
    await db.query(sql, [newStatus, transactionId]);
    return true;
  }

  /**
   * Récupérer profit/perte
   */
  static async getProfitLoss(userId, connection = null) {
    const db = connection || { query };

    const gainsSql = `
      SELECT COALESCE(SUM(amount_mz), 0) as total_gains 
      FROM transactions 
      WHERE user_id = ? AND type IN ('win', 'bonus', 'referral_bonus') AND status = 'confirmed'
    `;
    const gainsResult = await db.query(gainsSql, [userId]);
    const total_gains = parseFloat(gainsResult[0]?.total_gains || 0);

    const misesSql = `
      SELECT COALESCE(SUM(amount_mz), 0) as total_mises 
      FROM transactions 
      WHERE user_id = ? AND type = 'bet' AND status = 'confirmed'
    `;
    const misesResult = await db.query(misesSql, [userId]);
    const total_mises = parseFloat(misesResult[0]?.total_mises || 0);

    return {
      total_gains: roundToTwo(total_gains),
      total_mises: roundToTwo(total_mises),
      profit_loss: roundToTwo(total_gains - total_mises),
    };
  }

  /**
   * Historique dépôts
   */
  static async getDepositHistory(userId, limit = 20, connection = null) {
    const db = connection || { query };
    const sql = `
      SELECT * FROM transactions 
      WHERE user_id = ? AND type = 'deposit' 
      ORDER BY created_at DESC 
      LIMIT ? 
    `;
    return await db.query(sql, [userId, limit]);
  }

  /**
   * Historique retraits
   */
  static async getWithdrawalHistory(userId, limit = 20, connection = null) {
    const db = connection || { query };
    const sql = `
      SELECT * FROM transactions 
      WHERE user_id = ? AND type = 'withdrawal' 
      ORDER BY created_at DESC 
      LIMIT ?
    `;
    return await db.query(sql, [userId, limit]);
  }

  /**
   * Créer un dépôt
   */
  static async createDeposit(
    userId,
    amount_mz,
    amount_fcfa,
    description = "",
    connection = null
  ) {
    const db = connection || { query };
    const sql = `
      INSERT INTO transactions (
        user_id,
        type,
        amount_mz,
        amount_fcfa,
        status,
        description,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;
    const result = await db.query(sql, [
      userId,
      "deposit",
      roundToTwo(amount_mz),
      roundToTwo(amount_fcfa),
      "pending",
      description || `Dépôt de ${amount_mz} MZ`,
    ]);
    return result.insertId;
  }

  /**
   * Créer un retrait
   */
  static async createWithdrawal(
    userId,
    amount_mz,
    amount_fcfa,
    description = "",
    connection = null
  ) {
    const db = connection || { query };
    const sql = `
      INSERT INTO transactions (
        user_id,
        type,
        amount_mz,
        amount_fcfa,
        status,
        description,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;
    const result = await db.query(sql, [
      userId,
      "withdrawal",
      roundToTwo(amount_mz),
      roundToTwo(amount_fcfa),
      "pending",
      description || `Retrait de ${amount_mz} MZ`,
    ]);
    return result.insertId;
  }

  /**
   * Récupérer tous (Admin)
   */
  static async getAll(limit = 100, offset = 0, connection = null) {
    const db = connection || { query };
    const sql = `
      SELECT t.*, u.email, u.nom, u.prenom 
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ? 
    `;
    return await db.query(sql, [limit, offset]);
  }

  /**
   * Récupérer les transactions en attente (Admin)
   */
  static async getPending(connection = null) {
    const db = connection || { query };
    const sql = `
      SELECT t.*, u.email, u. nom, u.prenom 
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.status = 'pending'
      ORDER BY t.created_at ASC
    `;
    return await db.query(sql);
  }
}

module.exports = Transaction;
