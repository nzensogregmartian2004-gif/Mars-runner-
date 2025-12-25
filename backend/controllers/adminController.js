// ============================================
// controllers/adminController.js - VERSION COMPLÈTE
// ============================================

const jwt = require("jsonwebtoken");
const { query } = require("../config/database");
const { successResponse, errorResponse } = require("../utils/helpers");

class AdminController {
  /**
   * ✅ CONNEXION ADMIN
   * Permet l'authentification de l'administrateur avec un JWT.
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

      return successResponse(res, {
        totalUsers,
        pendingDeposits,
        pendingWithdrawals,
        totalRevenue,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * ✅ LISTE DES DÉPÔTS
   */
  static async getDeposits(req, res, next) {
    try {
      const sql = `
        SELECT 
          d.*,
          u.nom, u.prenom, u.email, u.telephone,
          CONCAT(u.prenom, ' ', u.nom) as user_name
        FROM deposits d
        LEFT JOIN users u ON d.user_id = u.id
        ORDER BY d.created_at DESC
        LIMIT 100
      `;

      const deposits = await query(sql);
      return successResponse(res, deposits);
    } catch (error) {
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

      console.log(
        `✅ Dépôt #${id} approuvé - ${deposit.amount_mz} MZ crédités`
      );

      return successResponse(res, null, "Dépôt approuvé avec succès");
    } catch (error) {
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

      console.log(`❌ Dépôt #${id} rejeté`);

      return successResponse(res, null, "Dépôt rejeté avec succès");
    } catch (error) {
      next(error);
    }
  }

  /**
   * ✅ LISTE DES RETRAITS
   */
  static async getWithdrawals(req, res, next) {
    try {
      const sql = `
        SELECT 
          w.*,
          u.nom, u.prenom, u.email, u.telephone,
          CONCAT(u.prenom, ' ', u.nom) as user_name
        FROM withdrawals w
        LEFT JOIN users u ON w.user_id = u.id
        ORDER BY w.created_at DESC
        LIMIT 100
      `;

      const withdrawals = await query(sql);
      return successResponse(res, withdrawals);
    } catch (error) {
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

      console.log(`✅ Retrait #${id} approuvé`);
      return successResponse(res, null, "Retrait approuvé avec succès");
    } catch (error) {
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

      console.log(`❌ Retrait #${id} rejeté`);
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
}

module.exports = AdminController;
