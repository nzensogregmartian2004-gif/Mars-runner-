// ============================================
// models/referral.js - COMPLET & CORRIGÉ
// ============================================

const { query } = require("../config/database");

class Referral {
  /**
   * ✅ Créer un lien de parrainage
   */
  static async create(
    sponsorId,
    referredUserId,
    referralCode,
    connection = null
  ) {
    const db = connection || { query };

    const sql = `
      INSERT INTO referrals (
        sponsor_id,
        referred_user_id,
        referral_code,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, NOW())
    `;

    const result = await db.query(sql, [
      sponsorId,
      referredUserId,
      referralCode,
      "pending",
    ]);

    return result.insertId;
  }

  /**
   * ✅ Récupérer les filleuls d'un sponsor
   */
  /**
/**
 * ✅ Récupérer les filleuls d'un sponsor - CORRIGÉ
 */
  /**
   * ✅ Récupérer les filleuls d'un sponsor - CORRIGÉ FINAL
   */
  static async getSponsorReferrals(
    sponsorId,
    page = 1,
    limit = 10,
    connection = null
  ) {
    const offset = (parseInt(page) - 1) * parseInt(limit);

    try {
      const { pool } = require("../config/database");
      const conn = connection || (await pool.getConnection());

      try {
        // Compter total
        const [countRows] = await conn.execute(
          `SELECT COUNT(*) as total FROM referrals WHERE sponsor_id = ?`,
          [sponsorId]
        );
        const total = countRows[0]?.total || 0;

        // Récupérer les affiliés
        const [dataRows] = await conn.execute(
          `
        SELECT 
          r.id,
          r.sponsor_id,
          r.referred_user_id,
          r.referral_code,
          r.status,
          COALESCE(r.bonus_earned_mz, 0) as bonus_earned_mz,
          r.created_at,
          u.nom, 
          u.prenom, 
          u.email
        FROM referrals r
        LEFT JOIN users u ON r.referred_user_id = u.id
        WHERE r.sponsor_id = ?
        ORDER BY r.created_at DESC
        LIMIT ?, ? 
        `,
          [sponsorId, offset, parseInt(limit)]
        );

        console.log(
          `✅ Récupéré ${dataRows.length} affiliés pour l'utilisateur ${sponsorId}`
        );

        return { data: dataRows, total };
      } finally {
        if (!connection) {
          conn.release();
        }
      }
    } catch (error) {
      console.error("❌ Erreur getSponsorReferrals:", error.message);
      return { data: [], total: 0 };
    }
  }
  /**
   * ✅ Récupérer statistiques de parrainage
   */
  static async getReferralStats(sponsorId, connection = null) {
    const db = connection || { query };

    const sql = `
      SELECT 
        COUNT(*) as total_referrals,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_referrals,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_referrals,
        COALESCE(SUM(bonus_earned_mz), 0) as total_bonus_earned
      FROM referrals
      WHERE sponsor_id = ? 
    `;

    const result = await db.query(sql, [sponsorId]);
    return (
      result[0] || {
        total_referrals: 0,
        active_referrals: 0,
        pending_referrals: 0,
        total_bonus_earned: 0,
      }
    );
  }

  /**
   * ✅ Trouver par utilisateur référé
   */
  static async findByReferredId(referredUserId, connection = null) {
    const db = connection || { query };

    const sql = `
      SELECT * FROM referrals 
      WHERE referred_user_id = ? 
      LIMIT 1
    `;

    const referrals = await db.query(sql, [referredUserId]);
    return referrals[0] || null;
  }

  /**
   * ✅ Récupérer filleuls récents
   */
  static async getRecentReferrals(sponsorId, hours = 24, connection = null) {
    const db = connection || { query };

    const sql = `
      SELECT 
        r.*,
        u.nom, 
        u. prenom, 
        u. email,
        r.created_at
      FROM referrals r
      LEFT JOIN users u ON r.referred_user_id = u.id
      WHERE r. sponsor_id = ?  
        AND r.created_at >= DATE_SUB(NOW(), INTERVAL ?  HOUR)
      ORDER BY r.created_at DESC
    `;

    return await db.query(sql, [sponsorId, hours]);
  }

  /**
   * ✅ Obtenir meilleurs parrains
   */
  static async getTopSponsors(limit = 10, connection = null) {
    const db = connection || { query };

    const sql = `
      SELECT 
        u.id,
        u.nom,
        u.prenom,
        u.referral_code,
        COUNT(r.id) as total_referrals,
        COALESCE(SUM(r.bonus_earned_mz), 0) as total_bonus_earned
      FROM users u
      LEFT JOIN referrals r ON u.id = r.sponsor_id
      GROUP BY u.id, u.nom, u.prenom, u.referral_code
      HAVING total_referrals > 0
      ORDER BY total_referrals DESC, total_bonus_earned DESC
      LIMIT ? 
    `;

    return await db.query(sql, [limit]);
  }

  /**
   * ✅ Trouver par ID
   */
  static async findById(referralId, connection = null) {
    const db = connection || { query };

    const sql = "SELECT * FROM referrals WHERE id = ?";
    const referrals = await db.query(sql, [referralId]);
    return referrals[0] || null;
  }

  /**
   * ✅ Activer un parrainage
   */
  static async activate(referralId, connection = null) {
    const db = connection || { query };

    const sql = `
      UPDATE referrals 
      SET status = 'active', activated_at = NOW() 
      WHERE id = ? 
    `;

    await db.query(sql, [referralId]);
    return true;
  }

  /**
   * ✅ Mettre à jour le bonus gagné
   */
  static async updateBonusEarned(referralId, amount, connection = null) {
    const db = connection || { query };

    const sql = `
      UPDATE referrals 
      SET bonus_earned_mz = ?, status = 'active'
      WHERE id = ?
    `;

    await db.query(sql, [amount, referralId]);
    return true;
  }

  /**
   * ✅ Mettre à jour le statut
   */
  static async updateStatus(referralId, newStatus, connection = null) {
    const db = connection || { query };

    const sql = "UPDATE referrals SET status = ?  WHERE id = ?";
    await db.query(sql, [newStatus, referralId]);
    return true;
  }

  /**
   * ✅ Compter les filleuls actifs
   */
  static async countActiveReferrals(sponsorId, connection = null) {
    const db = connection || { query };

    const sql = `
      SELECT COUNT(*) as count 
      FROM referrals 
      WHERE sponsor_id = ?  AND status = 'active'
    `;

    const result = await db.query(sql, [sponsorId]);
    return parseInt(result[0]?.count || 0);
  }

  /**
   * ✅ Récupérer tous (Admin)
   */
  static async getAll(limit = 100, offset = 0, connection = null) {
    const db = connection || { query };

    const sql = `
      SELECT 
        r. *, 
        s.nom as sponsor_nom, 
        s.prenom as sponsor_prenom, 
        s.email as sponsor_email,
        u.nom as referred_nom, 
        u.prenom as referred_prenom, 
        u.email as referred_email
      FROM referrals r
      LEFT JOIN users s ON r.sponsor_id = s.id
      LEFT JOIN users u ON r.referred_user_id = u.id
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ? 
    `;

    return await db.query(sql, [limit, offset]);
  }
}

module.exports = Referral;
