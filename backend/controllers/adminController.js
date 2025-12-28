// ============================================
// controllers/adminController.js - VERSION VISA/MASTERCARD
// ============================================

const jwt = require("jsonwebtoken");
const { query } = require("../config/database");
const { successResponse, errorResponse } = require("../utils/helpers");

class AdminController {
  /**
   * ✅ CONNEXION ADMIN
   */
  static async login(req, res, next) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return errorResponse(
          res,
          "Nom d'utilisateur et mot de passe requis",
          "VALIDATION_ERROR",
          400
        );
      }

      const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "Martian";
      const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Azerty12345";

      if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        return errorResponse(
          res,
          "Identifiants incorrects",
          "INVALID_CREDENTIALS",
          401
        );
      }

      const token = jwt.sign(
        {
          id: 1,
          username: ADMIN_USERNAME,
          isAdmin: true,
          role: "admin",
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      return successResponse(
        res,
        {
          token,
          admin: { username: ADMIN_USERNAME },
        },
        "Connexion réussie"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * ✅ STATISTIQUES GLOBALES
   */
  static async getStats(req, res, next) {
    try {
      const usersResult = await query("SELECT COUNT(*) as total FROM users");
      const totalUsers = usersResult[0].total;

      const depositsResult = await query(
        "SELECT COUNT(*) as total FROM deposits WHERE status = 'pending'"
      );
      const pendingDeposits = depositsResult[0].total;

      const withdrawalsResult = await query(
        "SELECT COUNT(*) as total FROM withdrawals WHERE status = 'pending'"
      );
      const pendingWithdrawals = withdrawalsResult[0].total;

      const revenueResult = await query(
        "SELECT COALESCE(SUM(amount_fcfa), 0) as total FROM deposits WHERE status = 'approved'"
      );
      const totalRevenue = parseFloat(revenueResult[0].total);

      // 🔥 NOUVEAU: Stats par méthode de paiement
      const paymentMethodsResult = await query(`
        SELECT 
          payment_method,
          COUNT(*) as count,
          SUM(amount_mz) as total_mz
        FROM deposits
        WHERE status = 'approved'
        GROUP BY payment_method
      `);

      return successResponse(res, {
        totalUsers,
        pendingDeposits,
        pendingWithdrawals,
        totalRevenue,
        paymentMethods: paymentMethodsResult,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 🔥 LISTE DES DÉPÔTS (AVEC INFOS CARTE)
   */
  static async getDeposits(req, res, next) {
    try {
      const sql = `
        SELECT 
          d.id,
          d.user_id,
          d.amount_fcfa,
          d.amount_mz,
          d.payment_method,
          d.name,
          d.phone,
          d.card_last4,
          d.status,
          d.created_at,
          d.processed_at,
          d.reject_reason,
          u.nom,
          u.prenom,
          u.email,
          u.telephone,
          CONCAT(u.prenom, ' ', u.nom) as user_name,
          CASE 
            WHEN d.card_last4 IS NOT NULL 
            THEN CONCAT(
              UPPER(d.payment_method), 
              ' ****', 
              d.card_last4
            )
            ELSE UPPER(d.payment_method)
          END as payment_info
        FROM deposits d
        LEFT JOIN users u ON d.user_id = u.id
        ORDER BY 
          CASE d.status
            WHEN 'pending' THEN 1
            WHEN 'approved' THEN 2
            WHEN 'rejected' THEN 3
          END,
          d.created_at DESC
        LIMIT 100
      `;

      const deposits = await query(sql);

      // 🔥 Formatter les données pour affichage admin
      const formatted = deposits.map((d) => ({
        ...d,
        amount_display: `${d.amount_mz} MZ (${d.amount_fcfa} FCFA)`,
        payment_display:
          d.payment_method === "visa" || d.payment_method === "mastercard"
            ? `${d.payment_info}` // Ex: "VISA ****1234"
            : `${d.payment_method.toUpperCase()} - ${d.phone || "N/A"}`,
        contact: d.card_last4
          ? `Carte: ****${d.card_last4}`
          : `Tél: ${d.phone || "N/A"}`,
        status_badge:
          d.status === "pending"
            ? "⏳ En attente"
            : d.status === "approved"
            ? "✅ Approuvé"
            : "❌ Rejeté",
      }));

      return successResponse(res, formatted);
    } catch (error) {
      console.error("❌ Erreur getDeposits:", error);
      next(error);
    }
  }

  /**
   * ✅ APPROUVER UN DÉPÔT
   */
  static async approveDeposit(req, res, next) {
    try {
      const { id } = req.params;

      const depositResult = await query("SELECT * FROM deposits WHERE id = ?", [
        id,
      ]);

      if (!depositResult || depositResult.length === 0) {
        return errorResponse(res, "Dépôt introuvable", "NOT_FOUND", 404);
      }

      const deposit = depositResult[0];

      if (deposit.status !== "pending") {
        return errorResponse(
          res,
          "Ce dépôt a déjà été traité",
          "ALREADY_PROCESSED",
          400
        );
      }

      // 1. Mettre à jour le statut
      await query(
        "UPDATE deposits SET status = 'approved', processed_at = NOW() WHERE id = ?",
        [id]
      );

      // 2. Créditer le compte utilisateur
      await query("UPDATE users SET balance_mz = balance_mz + ? WHERE id = ?", [
        parseFloat(deposit.amount_mz),
        deposit.user_id,
      ]);

      // 🔥 Log détaillé
      const paymentInfo = deposit.card_last4
        ? `${deposit.payment_method.toUpperCase()} ****${deposit.card_last4}`
        : `${deposit.payment_method.toUpperCase()} - ${deposit.phone}`;

      console.log(
        `✅ Dépôt #${id} approuvé - ${deposit.amount_mz} MZ crédités\n` +
          `   User: ${deposit.user_id}\n` +
          `   Méthode: ${paymentInfo}\n` +
          `   Montant: ${deposit.amount_fcfa} FCFA (${deposit.amount_mz} MZ)`
      );

      return successResponse(res, null, "Dépôt approuvé avec succès");
    } catch (error) {
      console.error("❌ Erreur approveDeposit:", error);
      next(error);
    }
  }

  /**
   * ✅ REJETER UN DÉPÔT
   */
  static async rejectDeposit(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const depositResult = await query("SELECT * FROM deposits WHERE id = ?", [
        id,
      ]);

      if (!depositResult || depositResult.length === 0) {
        return errorResponse(res, "Dépôt introuvable", "NOT_FOUND", 404);
      }

      const deposit = depositResult[0];

      if (deposit.status !== "pending") {
        return errorResponse(
          res,
          "Ce dépôt a déjà été traité",
          "ALREADY_PROCESSED",
          400
        );
      }

      await query(
        "UPDATE deposits SET status = 'rejected', processed_at = NOW(), reject_reason = ? WHERE id = ?",
        [reason || null, id]
      );

      console.log(
        `❌ Dépôt #${id} rejeté - Raison: ${reason || "Non spécifiée"}`
      );

      return successResponse(res, null, "Dépôt rejeté avec succès");
    } catch (error) {
      next(error);
    }
  }

  /**
   * 🔥 LISTE DES RETRAITS (AVEC INFOS CARTE)
   */
  static async getWithdrawals(req, res, next) {
    try {
      const sql = `
        SELECT 
          w.id,
          w.user_id,
          w.amount_fcfa,
          w.amount_mz,
          w.payment_method,
          w.name,
          w.phone,
          w.card_last4,
          w.status,
          w.created_at,
          w.processed_at,
          w.reject_reason,
          u.nom,
          u.prenom,
          u.email,
          u.telephone,
          u.balance_mz,
          CONCAT(u.prenom, ' ', u.nom) as user_name,
          CASE 
            WHEN w.card_last4 IS NOT NULL 
            THEN CONCAT(
              UPPER(w.payment_method), 
              ' ****', 
              w.card_last4
            )
            ELSE UPPER(w.payment_method)
          END as payment_info
        FROM withdrawals w
        LEFT JOIN users u ON w.user_id = u.id
        ORDER BY 
          CASE w.status
            WHEN 'pending' THEN 1
            WHEN 'approved' THEN 2
            WHEN 'rejected' THEN 3
          END,
          w.created_at DESC
        LIMIT 100
      `;

      const withdrawals = await query(sql);

      // 🔥 Formatter les données pour affichage admin
      const formatted = withdrawals.map((w) => ({
        ...w,
        amount_display: `${w.amount_mz} MZ (${w.amount_fcfa} FCFA)`,
        payment_display:
          w.payment_method === "visa" || w.payment_method === "mastercard"
            ? `${w.payment_info}` // Ex: "MASTERCARD ****5678"
            : `${w.payment_method.toUpperCase()} - ${w.phone || "N/A"}`,
        contact: w.card_last4
          ? `Carte: ****${w.card_last4}`
          : `Tél: ${w.phone || "N/A"}`,
        status_badge:
          w.status === "pending"
            ? "⏳ En attente"
            : w.status === "approved"
            ? "✅ Approuvé"
            : "❌ Rejeté",
        user_balance_display: `${w.balance_mz || 0} MZ`,
      }));

      return successResponse(res, formatted);
    } catch (error) {
      console.error("❌ Erreur getWithdrawals:", error);
      next(error);
    }
  }

  /**
   * ✅ APPROUVER UN RETRAIT
   */
  static async approveWithdrawal(req, res, next) {
    try {
      const { id } = req.params;

      const withdrawalResult = await query(
        "SELECT * FROM withdrawals WHERE id = ?",
        [id]
      );

      if (!withdrawalResult || withdrawalResult.length === 0) {
        return errorResponse(res, "Retrait introuvable", "NOT_FOUND", 404);
      }

      const withdrawal = withdrawalResult[0];

      if (withdrawal.status !== "pending") {
        return errorResponse(
          res,
          "Ce retrait a déjà été traité",
          "ALREADY_PROCESSED",
          400
        );
      }

      // Déduction de fonds
      await query(`UPDATE users SET balance_mz = balance_mz - ? WHERE id = ?`, [
        withdrawal.amount_mz,
        withdrawal.user_id,
      ]);

      await query(
        "UPDATE withdrawals SET status = 'approved', processed_at = NOW() WHERE id = ?",
        [id]
      );

      // 🔥 Log détaillé
      const paymentInfo = withdrawal.card_last4
        ? `${withdrawal.payment_method.toUpperCase()} ****${
            withdrawal.card_last4
          }`
        : `${withdrawal.payment_method.toUpperCase()} - ${withdrawal.phone}`;

      console.log(
        `✅ Retrait #${id} approuvé - ${withdrawal.amount_mz} MZ débités\n` +
          `   User: ${withdrawal.user_id}\n` +
          `   Méthode: ${paymentInfo}\n` +
          `   Montant: ${withdrawal.amount_fcfa} FCFA (${withdrawal.amount_mz} MZ)`
      );

      return successResponse(res, null, "Retrait approuvé avec succès");
    } catch (error) {
      console.error("❌ Erreur approveWithdrawal:", error);
      next(error);
    }
  }

  /**
   * ✅ REJETER UN RETRAIT
   */
  static async rejectWithdrawal(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const withdrawalResult = await query(
        "SELECT * FROM withdrawals WHERE id = ?",
        [id]
      );

      if (!withdrawalResult || withdrawalResult.length === 0) {
        return errorResponse(res, "Retrait introuvable", "NOT_FOUND", 404);
      }

      const withdrawal = withdrawalResult[0];

      if (withdrawal.status !== "pending") {
        return errorResponse(
          res,
          "Ce retrait a déjà été traité",
          "ALREADY_PROCESSED",
          400
        );
      }

      await query(
        "UPDATE withdrawals SET status = 'rejected', processed_at = NOW(), reject_reason = ? WHERE id = ?",
        [reason || null, id]
      );

      console.log(
        `❌ Retrait #${id} rejeté - Raison: ${reason || "Non spécifiée"}`
      );

      return successResponse(res, null, "Retrait rejeté avec succès");
    } catch (error) {
      next(error);
    }
  }

  /**
   * ✅ LISTE DES UTILISATEURS
   */
  static async getUsers(req, res, next) {
    try {
      const sql = `
        SELECT 
          id,
          nom,
          prenom,
          email,
          telephone,
          balance_mz,
          balance_fcfa,
          total_games_played,
          total_wins,
          sponsor_code,
          created_at,
          last_login
        FROM users
        ORDER BY created_at DESC
        LIMIT 100
      `;

      const users = await query(sql);
      return successResponse(res, users);
    } catch (error) {
      next(error);
    }
  }

  /**
   * ✅ HISTORIQUE DES PARTIES
   */
  static async getGames(req, res, next) {
    try {
      const sql = `
        SELECT 
          g.*,
          u.nom,
          u.prenom,
          u.email,
          CONCAT(u.prenom, ' ', u.nom) as player_name
        FROM games g
        LEFT JOIN users u ON g.user_id = u.id
        ORDER BY g.created_at DESC
        LIMIT 200
      `;

      const games = await query(sql);
      return successResponse(res, games);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 🔥 NOUVEAU: Détails d'une transaction
   */
  static async getTransactionDetails(req, res, next) {
    try {
      const { type, id } = req.params; // type = 'deposit' ou 'withdrawal'

      let sql, table;

      if (type === "deposit") {
        table = "deposits";
      } else if (type === "withdrawal") {
        table = "withdrawals";
      } else {
        return errorResponse(
          res,
          "Type de transaction invalide",
          "VALIDATION_ERROR",
          400
        );
      }

      sql = `
        SELECT 
          t.*,
          u.nom,
          u.prenom,
          u.email,
          u.telephone as user_telephone,
          u.balance_mz,
          CONCAT(u.prenom, ' ', u.nom) as user_name
        FROM ${table} t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.id = ?
      `;

      const result = await query(sql, [id]);

      if (!result || result.length === 0) {
        return errorResponse(res, "Transaction introuvable", "NOT_FOUND", 404);
      }

      return successResponse(res, result[0]);
    } catch (error) {
      console.error("❌ Erreur getTransactionDetails:", error);
      next(error);
    }
  }
}

module.exports = AdminController;
