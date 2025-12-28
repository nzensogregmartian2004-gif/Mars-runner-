/// ============================================
// models/Payment.js - VERSION CORRIGÃ‰E
// ============================================

const { query } = require("../config/database");

class Payment {
  /**
   * âœ… CRÃ‰ER UNE DEMANDE DE DÃ‰PÃ”T
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
    } = depositData;

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
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `;

    const result = await query(sql, [
      userId,
      parseFloat(amountFcfa),
      parseFloat(amountMz),
      paymentMethod,
      nom,
      prenom,
      email,
      telephone,
    ]);

    console.log(
      `ðŸ“¥ Demande de dÃ©pÃ´t crÃ©Ã©e - ID: ${result.insertId}, User: ${userId}, Montant: ${amountFcfa} FCFA`
    );

    return result.insertId;
  }

  /**
   * âœ… CRÃ‰ER UNE DEMANDE DE RETRAIT
   */
  static async createWithdrawal(userId, withdrawalData) {
    const { amountMz, paymentMethod, nom, prenom, email, telephone } =
      withdrawalData;

    const amountFcfa = parseFloat(amountMz) * 100;

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
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `;

    const result = await query(sql, [
      userId,
      parseFloat(amountFcfa),
      parseFloat(amountMz),
      paymentMethod,
      nom,
      prenom,
      email,
      telephone,
    ]);

    console.log(
      `ðŸ“¤ Demande de retrait crÃ©Ã©e - ID: ${result.insertId}, User: ${userId}, Montant: ${amountFcfa} FCFA`
    );

    return result.insertId;
  }

  /**
   * âœ… RÃ‰CUPÃ‰RER LES DÃ‰PÃ”TS D'UN UTILISATEUR
   */
  static async getDepositsByUser(userId) {
    const sql = `
      SELECT * FROM deposits 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `;

    return await query(sql, [userId]);
  }

  /**
   * âœ… RÃ‰CUPÃ‰RER LES RETRAITS D'UN UTILISATEUR
   */
  static async getWithdrawalsByUser(userId) {
    const sql = `
      SELECT * FROM withdrawals 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `;

    return await query(sql, [userId]);
  }

  /**
   * âœ… RÃ‰CUPÃ‰RER TOUS LES DÃ‰PÃ”TS (ADMIN)
   */
  static async getAllDeposits() {
    const sql = `
      SELECT 
        d.*, 
        u.nom, u.prenom, u.email, u.telephone,
        CONCAT(u.prenom, ' ', u.nom) as user_name
      FROM deposits d
      LEFT JOIN users u ON d.user_id = u.id
      ORDER BY d.created_at DESC
    `;

    return await query(sql);
  }

  /**
   * âœ… RÃ‰CUPÃ‰RER TOUS LES RETRAITS (ADMIN)
   */
  static async getAllWithdrawals() {
    const sql = `
      SELECT 
        w.*, 
        u.nom, u.prenom, u.email, u.telephone,
        CONCAT(u.prenom, ' ', u.nom) as user_name
      FROM withdrawals w
      LEFT JOIN users u ON w.user_id = u.id
      ORDER BY w.created_at DESC
    `;

    return await query(sql);
  }

  /**
   * âœ… RÃ‰CUPÃ‰RER UN DÃ‰PÃ”T PAR ID
   */
  static async getDepositById(depositId) {
    const sql = `
      SELECT d.*, u.balance_mz 
      FROM deposits d
      LEFT JOIN users u ON d.user_id = u.id
      WHERE d.id = ?
    `;

    const results = await query(sql, [depositId]);
    return results[0] || null;
  }

  /**
   * âœ… RÃ‰CUPÃ‰RER UN RETRAIT PAR ID
   */
  static async getWithdrawalById(withdrawalId) {
    const sql = `
      SELECT w.*, u.balance_mz 
      FROM withdrawals w
      LEFT JOIN users u ON w.user_id = u.id
      WHERE w.id = ?
    `;

    const results = await query(sql, [withdrawalId]);
    return results[0] || null;
  }

  /**
   * âœ… APPROUVER UN DÃ‰PÃ”T
   */
  static async approveDeposit(depositId) {
    const sql = `
      UPDATE deposits 
      SET status = 'approved', processed_at = NOW() 
      WHERE id = ?
    `;

    await query(sql, [depositId]);
    console.log(`âœ… DÃ©pÃ´t #${depositId} approuvÃ©`);
    return true;
  }

  /**
   * âœ… REJETER UN DÃ‰PÃ”T
   */
  static async rejectDeposit(depositId, reason = null) {
    const sql = `
      UPDATE deposits 
      SET status = 'rejected', processed_at = NOW(), reject_reason = ? 
      WHERE id = ?
    `;

    await query(sql, [reason, depositId]);
    console.log(`âŒ DÃ©pÃ´t #${depositId} rejetÃ©`);
    return true;
  }

  /**
   * âœ… APPROUVER UN RETRAIT
   */
  static async approveWithdrawal(withdrawalId) {
    const sql = `
      UPDATE withdrawals 
      SET status = 'approved', processed_at = NOW() 
      WHERE id = ?
    `;

    await query(sql, [withdrawalId]);
    console.log(`âœ… Retrait #${withdrawalId} approuvÃ©`);
    return true;
  }

  /**
   * âœ… REJETER UN RETRAIT
   */
  static async rejectWithdrawal(withdrawalId, reason = null) {
    const sql = `
      UPDATE withdrawals 
      SET status = 'rejected', processed_at = NOW(), reject_reason = ? 
      WHERE id = ?
    `;

    await query(sql, [reason, withdrawalId]);
    console.log(`âŒ Retrait #${withdrawalId} rejetÃ©`);
    return true;
  }
}

module.exports = Payment;
