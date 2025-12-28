// ============================================
// controllers/PaymentController.js - VERSION FINALE
// ============================================

const { query } = require("../config/database");
const { successResponse, errorResponse } = require("../utils/helpers");

const BONUS_LOCKED_AMOUNT = 5;

class PaymentController {
  /**
   * âœ… DEMANDE DE DÃ‰PÃ”T
   */
  static async createDeposit(req, res, next) {
    try {
      const userId = req.user.id;
      const {
        amountFcfa,
        amountMz,
        paymentMethod,
        nom,
        prenom,
        email,
        telephone,
      } = req.body;

      console.log("ðŸ”¥ DonnÃ©es reÃ§ues pour dÃ©pÃ´t:", req.body);

      // Validation
      if (!amountFcfa || amountFcfa < 500 || amountFcfa > 50000) {
        return errorResponse(
          res,
          "Montant invalide (min: 500 FCFA, max: 50 000 FCFA).",
          "VALIDATION_ERROR",
          400
        );
      }

      if (!telephone) {
        return errorResponse(
          res,
          "NumÃ©ro de tÃ©lÃ©phone requis.",
          "VALIDATION_ERROR",
          400
        );
      }

      // ðŸ”¥ CONSTRUIRE LE NOM COMPLET
      const fullName =
        prenom && nom
          ? `${prenom} ${nom}`.trim()
          : nom || prenom || "Utilisateur";

      // ðŸ”¥ INSERTION AVEC amount_fcfa, amount_mz, name, phone
      const sql = `
        INSERT INTO deposits (
          user_id, 
          amount_fcfa, 
          amount_mz, 
          payment_method, 
          name,
          phone,
          status, 
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
      `;

      const result = await query(sql, [
        userId,
        parseFloat(amountFcfa),
        parseFloat(amountMz || amountFcfa / 100),
        paymentMethod || "mobile_money",
        fullName,
        telephone,
      ]);

      const depositId = result.insertId;

      console.log(
        `âœ… [DÃ‰PÃ”T] ID: ${depositId}, User: ${userId}, Montant: ${amountFcfa} FCFA (${amountMz} MZ)`
      );

      return successResponse(
        res,
        { depositId },
        "Demande de dÃ©pÃ´t enregistrÃ©e. En attente de validation."
      );
    } catch (error) {
      console.error("âŒ Erreur crÃ©ation dÃ©pÃ´t:", error);
      console.error("SQL Error Code:", error.code);
      console.error("SQL Message:", error.sqlMessage);

      if (error.code === "ER_NO_SUCH_TABLE") {
        return errorResponse(
          res,
          "Table 'deposits' introuvable.",
          "DATABASE_ERROR",
          500
        );
      }

      if (error.code === "ER_BAD_FIELD_ERROR") {
        return errorResponse(
          res,
          `Colonne introuvable: ${error.sqlMessage}`,
          "DATABASE_ERROR",
          500
        );
      }

      return errorResponse(
        res,
        "Erreur lors de l'enregistrement du dÃ©pÃ´t.",
        "SERVER_ERROR",
        500
      );
    }
  }

  /**
   * âœ… DEMANDE DE RETRAIT
   */
  static async createWithdrawal(req, res, next) {
    try {
      const userId = req.user.id;
      const { amountMz, paymentMethod, nom, prenom, email, telephone } =
        req.body;

      console.log("ðŸ“¤ DonnÃ©es reÃ§ues pour retrait:", req.body);

      // Validation
      if (!amountMz || amountMz < 20) {
        return errorResponse(
          res,
          "Montant minimum pour un retrait: 20 MZ.",
          "VALIDATION_ERROR",
          400
        );
      }

      if (!telephone) {
        return errorResponse(
          res,
          "NumÃ©ro de tÃ©lÃ©phone requis.",
          "VALIDATION_ERROR",
          400
        );
      }

      // VÃ©rifier le solde
      const userSql = `
        SELECT balance_mz, new_player_bonus_locked
        FROM users 
        WHERE id = ?
      `;
      const users = await query(userSql, [userId]);

      if (!users || users.length === 0) {
        return errorResponse(res, "Utilisateur introuvable.", "NOT_FOUND", 404);
      }

      const user = users[0];
      const availableBalance =
        user.balance_mz -
        (user.new_player_bonus_locked ? BONUS_LOCKED_AMOUNT : 0);

      if (amountMz > availableBalance) {
        return errorResponse(
          res,
          `Solde insuffisant. Montant maximum retirable: ${availableBalance.toFixed(
            2
          )} MZ.`,
          "INSUFFICIENT_FUNDS",
          400
        );
      }

      // ðŸ”¥ CONSTRUIRE LE NOM COMPLET
      const fullName =
        prenom && nom
          ? `${prenom} ${nom}`.trim()
          : nom || prenom || "Utilisateur";

      const amountFcfa = parseFloat(amountMz) * 100;

      // ðŸ”¥ INSERTION AVEC amount_fcfa, amount_mz, name, phone
      const sql = `
        INSERT INTO withdrawals (
          user_id, 
          amount_fcfa,
          amount_mz, 
          payment_method, 
          name,
          phone,
          status, 
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
      `;

      const result = await query(sql, [
        userId,
        parseFloat(amountFcfa),
        parseFloat(amountMz),
        paymentMethod || "mobile_money",
        fullName,
        telephone,
      ]);

      const withdrawalId = result.insertId;

      console.log(
        `âœ… [RETRAIT] ID: ${withdrawalId}, User: ${userId}, Montant: ${amountMz} MZ (${amountFcfa} FCFA)`
      );

      return successResponse(
        res,
        { withdrawalId },
        "Demande de retrait enregistrÃ©e. Vous recevrez une confirmation."
      );
    } catch (error) {
      console.error("âŒ Erreur crÃ©ation retrait:", error);
      console.error("SQL Error Code:", error.code);
      console.error("SQL Message:", error.sqlMessage);

      return errorResponse(
        res,
        "Erreur lors de l'enregistrement du retrait.",
        "SERVER_ERROR",
        500
      );
    }
  }

  /**
   * âœ… HISTORIQUE DES DÃ‰PÃ”TS
   */
  static async getDeposits(req, res, next) {
    try {
      const userId = req.user.id;

      const sql = `
        SELECT 
          id, amount_fcfa, amount_mz, payment_method,
          name, phone,
          status, created_at, processed_at, reject_reason
        FROM deposits
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `;

      const deposits = await query(sql, [userId]);
      return successResponse(res, deposits, "Liste des dÃ©pÃ´ts rÃ©cupÃ©rÃ©e.");
    } catch (error) {
      console.error("âŒ Erreur rÃ©cupÃ©ration dÃ©pÃ´ts:", error);
      next(error);
    }
  }

  /**
   * âœ… HISTORIQUE DES RETRAITS
   */
  static async getWithdrawals(req, res, next) {
    try {
      const userId = req.user.id;

      const sql = `
        SELECT 
          id, amount_fcfa, amount_mz, payment_method,
          name, phone,
          status, created_at, processed_at, reject_reason
        FROM withdrawals
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `;

      const withdrawals = await query(sql, [userId]);
      return successResponse(
        res,
        withdrawals,
        "Liste des retraits rÃ©cupÃ©rÃ©e."
      );
    } catch (error) {
      console.error("âŒ Erreur rÃ©cupÃ©ration retraits:", error);
      next(error);
    }
  }
}

module.exports = PaymentController;
