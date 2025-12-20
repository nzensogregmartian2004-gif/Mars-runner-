// ============================================
// models/manualPayment.js - GESTION DÉPÔTS/RETRAITS MANUELS
// ============================================

const { query } = require("../config/database");

class ManualPayment {
  /**
   * ✅ CRÉER UNE DEMANDE DE DÉPÔT
   */
  static async createDeposit(userId, amountFcfa, amountMz, connection = null) {
    const db = connection || { query };

    const sql = `
      INSERT INTO manual_deposits (
        user_id,
        amount_fcfa,
        amount_mz,
        status,
        created_at
      ) VALUES (?, ?, ?, 'pending', NOW())
    `;

    const result = await db.query(sql, [
      userId,
      parseFloat(amountFcfa),
      parseFloat(amountMz),
    ]);

    console.log(
      `📥 Demande de dépôt créée - ID: ${result.insertId}, User: ${userId}, Montant: ${amountFcfa} FCFA`
    );

    return result.insertId;
  }

  /**
   * ✅ CRÉER UNE DEMANDE DE RETRAIT
   */
  static async createWithdrawal(
    userId,
    amountFcfa,
    amountMz,
    walletName,
    walletNumber,
    connection = null
  ) {
    const db = connection || { query };

    const sql = `
      INSERT INTO manual_withdrawals (
        user_id,
        amount_fcfa,
        amount_mz,
        wallet_name,
        wallet_number,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', NOW())
    `;

    const result = await db.query(sql, [
      userId,
      parseFloat(amountFcfa),
      parseFloat(amountMz),
      walletName,
      walletNumber,
    ]);

    console.log(
      `📤 Demande de retrait créée - ID: ${result.insertId}, User: ${userId}, Montant: ${amountFcfa} FCFA`
    );

    return result.insertId;
  }

  /**
   * ✅ RÉCUPÉRER TOUS LES DÉPÔTS (avec infos utilisateur)
   */
  static async getAllDeposits(connection = null) {
    const db = connection || { query };

    const sql = `
      SELECT 
        md.*,
        u.nom, u.prenom, u.email, u.telephone,
        CONCAT(u.prenom, ' ', u.nom) as user_name
      FROM manual_deposits md
      LEFT JOIN users u ON md.user_id = u.id
      ORDER BY md.created_at DESC
    `;

    return await db.query(sql);
  }

  /**
   * ✅ RÉCUPÉRER TOUS LES RETRAITS (avec infos utilisateur)
   */
  static async getAllWithdrawals(connection = null) {
    const db = connection || { query };

    const sql = `
      SELECT 
        mw.*,
        u.nom, u.prenom, u.email, u.telephone,
        CONCAT(u.prenom, ' ', u.nom) as user_name
      FROM manual_withdrawals mw
      LEFT JOIN users u ON mw.user_id = u.id
      ORDER BY mw.created_at DESC
    `;

    return await db.query(sql);
  }

  /**
   * ✅ RÉCUPÉRER UN DÉPÔT PAR ID
   */
  static async getDepositById(depositId, connection = null) {
    const db = connection || { query };

    const sql = "SELECT * FROM manual_deposits WHERE id = ?";
    const deposits = await db.query(sql, [depositId]);
    return deposits[0] || null;
  }

  /**
   * ✅ RÉCUPÉRER UN RETRAIT PAR ID
   */
  static async getWithdrawalById(withdrawalId, connection = null) {
    const db = connection || { query };

    const sql = "SELECT * FROM manual_withdrawals WHERE id = ?";
    const withdrawals = await db.query(sql, [withdrawalId]);
    return withdrawals[0] || null;
  }

  /**
   * ✅ APPROUVER UN DÉPÔT
   */
  static async approveDeposit(depositId, connection = null) {
    const db = connection || { query };

    const sql = `
      UPDATE manual_deposits 
      SET status = 'approved', processed_at = NOW() 
      WHERE id = ?
    `;

    await db.query(sql, [depositId]);
    console.log(`✅ Dépôt #${depositId} approuvé`);
    return true;
  }

  /**
   * ✅ REJETER UN DÉPÔT
   */
  static async rejectDeposit(depositId, reason = null, connection = null) {
    const db = connection || { query };

    const sql = `
      UPDATE manual_deposits 
      SET status = 'rejected', processed_at = NOW(), reject_reason = ? 
      WHERE id = ?
    `;

    await db.query(sql, [reason, depositId]);
    console.log(`❌ Dépôt #${depositId} rejeté`);
    return true;
  }

  /**
   * ✅ APPROUVER UN RETRAIT
   */
  static async approveWithdrawal(withdrawalId, connection = null) {
    const db = connection || { query };

    const sql = `
      UPDATE manual_withdrawals 
      SET status = 'approved', processed_at = NOW() 
      WHERE id = ?
    `;

    await db.query(sql, [withdrawalId]);
    console.log(`✅ Retrait #${withdrawalId} approuvé`);
    return true;
  }

  /**
   * ✅ REJETER UN RETRAIT
   */
  static async rejectWithdrawal(
    withdrawalId,
    reason = null,
    connection = null
  ) {
    const db = connection || { query };

    const sql = `
      UPDATE manual_withdrawals 
      SET status = 'rejected', processed_at = NOW(), reject_reason = ? 
      WHERE id = ?
    `;

    await db.query(sql, [withdrawalId, reason]);
    console.log(`❌ Retrait #${withdrawalId} rejeté`);
    return true;
  }
}

module.exports = ManualPayment;
