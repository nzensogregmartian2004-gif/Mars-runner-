// ============================================
// models/Payment.js - VERSION VISA/MASTERCARD
// ============================================

const { query } = require("../config/database");

class Payment {
  /**
   * ✅ CRÉER UNE DEMANDE DE DÉPÔT (AVEC CARTES BANCAIRES)
   */
  static async createDeposit(userId, depositData) {
    const {
      amountFcfa,
      amountMz,
      paymentMethod,
      nom,
      prenom,
      email,
      telephone,
      cardNumber,
      expiryDate,
      cvv,
    } = depositData;

    // 🔥 Extraire les 4 derniers chiffres de la carte
    const cardLast4 = cardNumber ? cardNumber.slice(-4) : null;

    const sql = `
      INSERT INTO deposits (
        user_id,
        amount_fcfa,
        amount_mz,
        payment_method,
        nom,
        prenom,
        email,
        telephone,
        card_last4,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `;

    const result = await query(sql, [
      userId,
      parseFloat(amountFcfa),
      parseFloat(amountMz),
      paymentMethod,
      nom,
      prenom,
      email,
      telephone || null,
      cardLast4,
    ]);

    console.log(
      `💰 Demande de dépôt créée - ID: ${result.insertId}, User: ${userId}, ` +
        `Montant: ${amountFcfa} FCFA (${amountMz} MZ), Méthode: ${paymentMethod}` +
        (cardLast4 ? `, Carte: ****${cardLast4}` : "")
    );

    return result.insertId;
  }

  /**
   * ✅ CRÉER UNE DEMANDE DE RETRAIT (AVEC CARTES BANCAIRES)
   */
  static async createWithdrawal(userId, withdrawalData) {
    const {
      amountMz,
      paymentMethod,
      nom,
      prenom,
      email,
      telephone,
      cardNumber,
      expiryDate,
      cvv,
    } = withdrawalData;

    const amountFcfa = parseFloat(amountMz) * 100;

    // 🔥 Extraire les 4 derniers chiffres de la carte
    const cardLast4 = cardNumber ? cardNumber.slice(-4) : null;

    const sql = `
      INSERT INTO withdrawals (
        user_id,
        amount_fcfa,
        amount_mz,
        payment_method,
        nom,
        prenom,
        email,
        telephone,
        card_last4,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `;

    const result = await query(sql, [
      userId,
      parseFloat(amountFcfa),
      parseFloat(amountMz),
      paymentMethod,
      nom,
      prenom,
      email,
      telephone || null,
      cardLast4,
    ]);

    console.log(
      `💸 Demande de retrait créée - ID: ${result.insertId}, User: ${userId}, ` +
        `Montant: ${amountMz} MZ (${amountFcfa} FCFA), Méthode: ${paymentMethod}` +
        (cardLast4 ? `, Carte: ****${cardLast4}` : "")
    );

    return result.insertId;
  }

  /**
   * ✅ RÉCUPÉRER LES DÉPÔTS D'UN UTILISATEUR (AVEC INFO CARTE)
   */
  static async getDepositsByUser(userId) {
    const sql = `
      SELECT 
        id, amount_fcfa, amount_mz, payment_method,
        nom, prenom, email, telephone, card_last4,
        status, created_at, processed_at, reject_reason
      FROM deposits 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `;

    return await query(sql, [userId]);
  }

  /**
   * ✅ RÉCUPÉRER LES RETRAITS D'UN UTILISATEUR (AVEC INFO CARTE)
   */
  static async getWithdrawalsByUser(userId) {
    const sql = `
      SELECT 
        id, amount_fcfa, amount_mz, payment_method,
        nom, prenom, email, telephone, card_last4,
        status, created_at, processed_at, reject_reason
      FROM withdrawals 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `;

    return await query(sql, [userId]);
  }

  /**
   * ✅ RÉCUPÉRER TOUS LES DÉPÔTS (ADMIN) - AVEC INFO CARTE
   */
  static async getAllDeposits() {
    const sql = `
      SELECT 
        d.*, 
        u.nom as user_nom, 
        u.prenom as user_prenom, 
        u.email as user_email, 
        u.telephone as user_telephone,
        CONCAT(u.prenom, ' ', u.nom) as user_name,
        CASE 
          WHEN d.card_last4 IS NOT NULL 
          THEN CONCAT(d.payment_method, ' ****', d.card_last4)
          ELSE d.payment_method
        END as payment_info
      FROM deposits d
      LEFT JOIN users u ON d.user_id = u.id
      ORDER BY d.created_at DESC
    `;

    return await query(sql);
  }

  /**
   * ✅ RÉCUPÉRER TOUS LES RETRAITS (ADMIN) - AVEC INFO CARTE
   */
  static async getAllWithdrawals() {
    const sql = `
      SELECT 
        w.*, 
        u.nom as user_nom, 
        u.prenom as user_prenom, 
        u.email as user_email, 
        u.telephone as user_telephone,
        CONCAT(u.prenom, ' ', u.nom) as user_name,
        CASE 
          WHEN w.card_last4 IS NOT NULL 
          THEN CONCAT(w.payment_method, ' ****', w.card_last4)
          ELSE w.payment_method
        END as payment_info
      FROM withdrawals w
      LEFT JOIN users u ON w.user_id = u.id
      ORDER BY w.created_at DESC
    `;

    return await query(sql);
  }

  /**
   * ✅ RÉCUPÉRER UN DÉPÔT PAR ID
   */
  static async getDepositById(depositId) {
    const sql = `
      SELECT 
        d.*, 
        u.balance_mz,
        u.nom as user_nom,
        u.prenom as user_prenom,
        u.email as user_email,
        u.telephone as user_telephone
      FROM deposits d
      LEFT JOIN users u ON d.user_id = u.id
      WHERE d.id = ?
    `;

    const results = await query(sql, [depositId]);
    return results[0] || null;
  }

  /**
   * ✅ RÉCUPÉRER UN RETRAIT PAR ID
   */
  static async getWithdrawalById(withdrawalId) {
    const sql = `
      SELECT 
        w.*, 
        u.balance_mz,
        u.nom as user_nom,
        u.prenom as user_prenom,
        u.email as user_email,
        u.telephone as user_telephone
      FROM withdrawals w
      LEFT JOIN users u ON w.user_id = u.id
      WHERE w.id = ?
    `;

    const results = await query(sql, [withdrawalId]);
    return results[0] || null;
  }

  /**
   * ✅ APPROUVER UN DÉPÔT
   */
  static async approveDeposit(depositId) {
    const sql = `
      UPDATE deposits 
      SET status = 'approved', processed_at = NOW() 
      WHERE id = ?
    `;

    await query(sql, [depositId]);
    console.log(`✅ Dépôt #${depositId} approuvé`);
    return true;
  }

  /**
   * ✅ REJETER UN DÉPÔT
   */
  static async rejectDeposit(depositId, reason = null) {
    const sql = `
      UPDATE deposits 
      SET status = 'rejected', processed_at = NOW(), reject_reason = ? 
      WHERE id = ?
    `;

    await query(sql, [reason, depositId]);
    console.log(`❌ Dépôt #${depositId} rejeté`);
    return true;
  }

  /**
   * ✅ APPROUVER UN RETRAIT
   */
  static async approveWithdrawal(withdrawalId) {
    const sql = `
      UPDATE withdrawals 
      SET status = 'approved', processed_at = NOW() 
      WHERE id = ?
    `;

    await query(sql, [withdrawalId]);
    console.log(`✅ Retrait #${withdrawalId} approuvé`);
    return true;
  }

  /**
   * ✅ REJETER UN RETRAIT
   */
  static async rejectWithdrawal(withdrawalId, reason = null) {
    const sql = `
      UPDATE withdrawals 
      SET status = 'rejected', processed_at = NOW(), reject_reason = ? 
      WHERE id = ?
    `;

    await query(sql, [reason, withdrawalId]);
    console.log(`❌ Retrait #${withdrawalId} rejeté`);
    return true;
  }

  /**
   * 🔥 NOUVELLE FONCTION: Statistiques par méthode de paiement
   */
  static async getPaymentMethodStats() {
    const depositsSql = `
      SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(amount_mz) as total_mz,
        SUM(amount_fcfa) as total_fcfa
      FROM deposits
      WHERE status = 'approved'
      GROUP BY payment_method
    `;

    const withdrawalsSql = `
      SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(amount_mz) as total_mz,
        SUM(amount_fcfa) as total_fcfa
      FROM withdrawals
      WHERE status = 'approved'
      GROUP BY payment_method
    `;

    const deposits = await query(depositsSql);
    const withdrawals = await query(withdrawalsSql);

    return {
      deposits,
      withdrawals,
    };
  }
}

module.exports = Payment;
