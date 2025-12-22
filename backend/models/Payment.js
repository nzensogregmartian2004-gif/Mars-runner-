// ============================================
// models/payment.js - GESTION DÉPÔTS/RETRAITS
// ============================================

const { query } = require("../config/database");

class Payment {
  /**
   * ✅ CRÉER UNE DEMANDE DE DÉPÔT
   */
  static async createDeposit(
    userId,
    amountFcfa,
    amountMz,
    paymentMethod,
    phoneNumber,
    connection = null
  ) {
    const db = connection || { query };

    const sql = `
      INSERT INTO deposits (
        user_id,
        amount_fcfa,
        amount_mz,
        payment_method,
        phone_number,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', NOW())
    `;

    const result = await db.query(sql, [
      userId,
      parseFloat(amountFcfa),
      parseFloat(amountMz),
      paymentMethod,
      phoneNumber,
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
    paymentMethod,
    phoneNumber,
    walletName,
    connection = null
  ) {
    const db = connection || { query };

    const sql = `
      INSERT INTO withdrawals (
        user_id,
        amount_fcfa,
        amount_mz,
        payment_method,
        phone_number,
        wallet_name,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
    `;

    const result = await db.query(sql, [
      userId,
      parseFloat(amountFcfa),
      parseFloat(amountMz),
      paymentMethod,
      phoneNumber,
      walletName,
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
        d.*, 
        u.nom, u.prenom, u.email, u.telephone,
        CONCAT(u.prenom, ' ', u.nom) as user_name
      FROM deposits d
      LEFT JOIN users u ON d.user_id = u.id
      ORDER BY d.created_at DESC
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
        w.*, 
        u.nom, u.prenom, u.email, u.telephone,
        CONCAT(u.prenom, ' ', u.nom) as user_name
      FROM withdrawals w
      LEFT JOIN users u ON w.user_id = u.id
      ORDER BY w.created_at DESC
    `;

    return await db.query(sql);
  }

  /**
   * ✅ APPROUVER UN DÉPÔT
   */
  static async approveDeposit(depositId, connection = null) {
    const db = connection || { query };

    const sql = `
      UPDATE deposits 
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
      UPDATE deposits 
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
      UPDATE withdrawals 
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
      UPDATE withdrawals 
      SET status = 'rejected', processed_at = NOW(), reject_reason = ? 
      WHERE id = ?
    `;

    await db.query(sql, [reason, withdrawalId]);
    console.log(`❌ Retrait #${withdrawalId} rejeté`);
    return true;
  }
}

module.exports = Payment;
