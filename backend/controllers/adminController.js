// ============================================
// controllers/adminController.js (VERSION FINALE)
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

      const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
      const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

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
        "SELECT COUNT(*) as total FROM manual_deposits WHERE status = 'pending'"
      );
      const pendingDeposits = depositsResult[0].total;

      const withdrawalsResult = await query(
        "SELECT COUNT(*) as total FROM manual_withdrawals WHERE status = 'pending'"
      );
      const pendingWithdrawals = withdrawalsResult[0].total;

      const revenueResult = await query(
        "SELECT COALESCE(SUM(amount_fcfa), 0) as total FROM manual_deposits WHERE status = 'approved'"
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
          md.*,
          u.nom, u.prenom, u.email, u.telephone,
          CONCAT(u.prenom, ' ', u.nom) as user_name
        FROM manual_deposits md
        LEFT JOIN users u ON md.user_id = u.id
        ORDER BY md.created_at DESC
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

  // ============================================
  // CORRIGER approveDeposit() - Même logique
  // ============================================

  static async approveDeposit(req, res, next) {
    try {
      const { id } = req.params;

      const depositResult = await query(
        "SELECT * FROM manual_deposits WHERE id = ?",
        [id]
      );

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

      try {
        // 1. Mettre à jour le statut
        await query(
          "UPDATE manual_deposits SET status = 'approved', processed_at = NOW() WHERE id = ?",
          [id]
        );

        // 2. Créditer le compte
        await query(
          "UPDATE users SET balance_mz = balance_mz + ? WHERE id = ?",
          [parseFloat(deposit.amount_mz), deposit.user_id]
        );

        // 3. Récupérer la nouvelle balance
        const userResult = await query(
          "SELECT balance_mz FROM users WHERE id = ? ",
          [deposit.user_id]
        );
        const newBalance = parseFloat(userResult[0].balance_mz);

        console.log(
          `✅ Dépôt #${id} approuvé - ${deposit.amount_mz} MZ crédités - Nouvelle balance: ${newBalance} MZ`
        );

        // 4. Notifier via Socket.IO
        const io = req.app.get("io");
        if (io) {
          io.to(`user_${deposit.user_id}`).emit("deposit:confirmed", {
            amount: deposit.amount_mz,
            balance: newBalance,
            balance_mz: newBalance,
          });

          io.to(`user_${deposit.user_id}`).emit("wallet:balance", {
            balance: newBalance,
            balance_mz: newBalance,
          });
        }

        return successResponse(
          res,
          { newBalance },
          "Dépôt approuvé avec succès"
        );
      } catch (error) {
        console.error("❌ Erreur lors du traitement:", error);
        throw error;
      }
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

      const depositResult = await query(
        "SELECT * FROM manual_deposits WHERE id = ?",
        [id]
      );

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
        "UPDATE manual_deposits SET status = 'rejected', processed_at = NOW(), reject_reason = ? WHERE id = ?",
        [reason || null, id]
      );

      console.log(`❌ Dépôt #${id} rejeté`);

      return successResponse(res, null, "Dépôt rejeté");
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
          mw.*,
          u.nom, u.prenom, u.email, u.telephone,
          CONCAT(u.prenom, ' ', u.nom) as user_name
        FROM manual_withdrawals mw
        LEFT JOIN users u ON mw.user_id = u.id
        ORDER BY mw.created_at DESC
        LIMIT 100
      `;

      const withdrawals = await query(sql);
      return successResponse(res, withdrawals);
    } catch (error) {
      next(error);
    }
  }

  /**
   * ✅ APPROUVER UN RETRAIT (FIX CRITIQUE)
   */
  /**
   * ✅ APPROUVER UN RETRAIT (CORRIGÉ)
   */
  // ============================================
  // CORRIGER approveWithdrawal()
  // ============================================

  static async approveWithdrawal(req, res, next) {
    try {
      const { id } = req.params;

      const withdrawalResult = await query(
        "SELECT * FROM manual_withdrawals WHERE id = ?",
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

      const userResult = await query(
        "SELECT balance_mz FROM users WHERE id = ?",
        [withdrawal.user_id]
      );

      if (!userResult || userResult.length === 0) {
        return errorResponse(res, "Utilisateur introuvable", "NOT_FOUND", 404);
      }

      const currentBalance = parseFloat(userResult[0].balance_mz);

      if (currentBalance < parseFloat(withdrawal.amount_mz)) {
        return errorResponse(
          res,
          "Solde insuffisant",
          "INSUFFICIENT_BALANCE",
          400
        );
      }

      const newBalance = currentBalance - parseFloat(withdrawal.amount_mz);

      // ✅ SANS START TRANSACTION (mysql2 problème)
      // Faire les deux opérations sans transaction explicite
      try {
        // 1. Mettre à jour le statut
        await query(
          "UPDATE manual_withdrawals SET status = 'approved', processed_at = NOW() WHERE id = ?",
          [id]
        );

        // 2. Déduire la balance
        await query("UPDATE users SET balance_mz = ?  WHERE id = ?", [
          newBalance,
          withdrawal.user_id,
        ]);

        console.log(
          `✅ Retrait #${id} approuvé - ${withdrawal.amount_mz} MZ déduits - Nouvelle balance: ${newBalance} MZ`
        );

        // 3. Notifier via Socket.IO
        const io = req.app.get("io");
        if (io) {
          io.to(`user_${withdrawal.user_id}`).emit("withdrawal: confirmed", {
            amount: withdrawal.amount_mz,
            walletNumber: withdrawal.wallet_number,
            balance: newBalance,
            balance_mz: newBalance,
          });

          io.to(`user_${withdrawal.user_id}`).emit("wallet:balance", {
            balance: newBalance,
            balance_mz: newBalance,
          });
        }

        return successResponse(
          res,
          { newBalance },
          "Retrait approuvé avec succès"
        );
      } catch (error) {
        console.error("❌ Erreur lors du traitement:", error);
        throw error;
      }
    } catch (error) {
      console.error("❌ Erreur approveWithdrawal:", error);
      next(error);
    }
  }

  /**
   * ✅ REJETER UN RETRAIT
   */
  /**
   * ✅ REJETER UN RETRAIT (CORRIGÉ)
   */
  static async rejectWithdrawal(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const withdrawalResult = await query(
        "SELECT * FROM manual_withdrawals WHERE id = ?",
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

      // ✅ PAS DE REMBOURSEMENT car on n'a jamais déduit !
      // Simplement mettre à jour le statut
      await query(
        "UPDATE manual_withdrawals SET status = 'rejected', processed_at = NOW(), reject_reason = ? WHERE id = ?",
        [reason || null, id]
      );

      console.log(`❌ Retrait #${id} rejeté`);

      // Récupérer la balance actuelle (inchangée)
      const userResult = await query(
        "SELECT balance_mz FROM users WHERE id = ?",
        [withdrawal.user_id]
      );
      const currentBalance = parseFloat(userResult[0].balance_mz);

      // Notifier via Socket.IO
      const io = req.app.get("io");
      if (io) {
        io.to(`user_${withdrawal.user_id}`).emit("withdrawal:rejected", {
          amount: withdrawal.amount_mz,
          reason: reason || "Votre demande de retrait a été refusée",
          balance: currentBalance,
          balance_mz: currentBalance,
        });
      }

      return successResponse(res, null, "Retrait rejeté");
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
          id, nom, prenom, email, telephone, 
          balance_mz, created_at
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
          u.nom, u.prenom, u.email,
          CONCAT(u.prenom, ' ', u.nom) as user_name
        FROM games g
        LEFT JOIN users u ON g.user_id = u.id
        WHERE g.game_status = 'completed'
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
