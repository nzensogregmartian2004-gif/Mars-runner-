// ============================================
// controllers/PaymentController.js - VERSION CORRIGÉE
// ============================================

const { query, transaction } = require("../config/database");
const { successResponse, errorResponse } = require("../utils/helpers");

const BONUS_LOCKED_AMOUNT = 5; // Bonus verrouillé pour les nouveaux joueurs

class PaymentController {
  /**
   * ✅ DEMANDE DE DÉPÔT
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

      // Validation des champs
      if (!amountFcfa || amountFcfa < 500 || amountFcfa > 50000) {
        return errorResponse(
          res,
          "Montant invalide (min: 500 FCFA, max: 50 000 FCFA).",
          "VALIDATION_ERROR",
          400
        );
      }

      if (!nom || !prenom) {
        return errorResponse(
          res,
          "Nom et prénom requis.",
          "VALIDATION_ERROR",
          400
        );
      }

      if (!telephone) {
        return errorResponse(
          res,
          "Numéro de téléphone requis.",
          "VALIDATION_ERROR",
          400
        );
      }

      // Construire le nom complet
      const fullName = `${prenom} ${nom}`.trim();

      // Insertion du dépôt
      const sql = `
        INSERT INTO deposits (
          user_id, 
          amount_fcfa, 
          amount_mz, 
          payment_method, 
          name, 
          phone,
          email,
          status, 
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
      `;

      const result = await query(sql, [
        userId,
        amountFcfa,
        amountMz || amountFcfa / 100,
        paymentMethod || "mobile_money",
        fullName,
        telephone,
        email || null,
      ]);

      const depositId = result.insertId;

      console.log(
        `✅ [DÉPÔT] ID: ${depositId} pour l'utilisateur ${userId} - ${amountFcfa} FCFA`
      );

      return successResponse(
        res,
        { depositId },
        "Demande de dépôt enregistrée. En attente de validation par l'administrateur."
      );
    } catch (error) {
      console.error("❌ Erreur lors de la création du dépôt:", error);
      next(error);
    }
  }

  /**
   * ✅ DEMANDE DE RETRAIT
   */
  static async createWithdrawal(req, res, next) {
    try {
      const userId = req.user.id;
      const { amountMz, paymentMethod, nom, prenom, email, telephone } =
        req.body;

      // Validation des champs
      if (!amountMz || amountMz < 5) {
        return errorResponse(
          res,
          "Montant minimum pour un retrait: 5 MZ.",
          "VALIDATION_ERROR",
          400
        );
      }

      if (!nom || !prenom) {
        return errorResponse(
          res,
          "Nom et prénom requis.",
          "VALIDATION_ERROR",
          400
        );
      }

      if (!telephone) {
        return errorResponse(
          res,
          "Numéro de téléphone requis.",
          "VALIDATION_ERROR",
          400
        );
      }

      // Vérifier le solde de l'utilisateur
      const userSql = `
        SELECT 
          balance_mz, 
          new_player_bonus_locked
        FROM users 
        WHERE id = ?
      `;
      const users = await query(userSql, [userId]);

      if (!users || users.length === 0) {
        return errorResponse(res, "Utilisateur introuvable.", "NOT_FOUND", 404);
      }

      const user = users[0];

      // Calculer le solde disponible
      const availableBalance =
        user.balance_mz -
        (user.new_player_bonus_locked ? BONUS_LOCKED_AMOUNT : 0);

      if (amountMz > availableBalance) {
        return errorResponse(
          res,
          `Solde insuffisant. Montant maximum retirable: ${availableBalance} MZ.`,
          "INSUFFICIENT_FUNDS",
          400
        );
      }

      // Construire le nom complet
      const fullName = `${prenom} ${nom}`.trim();

      // Insertion de la demande de retrait
      const sql = `
        INSERT INTO withdrawals (
          user_id, 
          amount_mz, 
          payment_method, 
          name, 
          phone,
          email,
          status, 
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
      `;

      const result = await query(sql, [
        userId,
        amountMz,
        paymentMethod || "mobile_money",
        fullName,
        telephone,
        email || null,
      ]);

      const withdrawalId = result.insertId;

      console.log(
        `✅ [RETRAIT] ID: ${withdrawalId} pour l'utilisateur ${userId} - ${amountMz} MZ`
      );

      return successResponse(
        res,
        { withdrawalId },
        "Demande de retrait enregistrée. Vous recevrez un message de confirmation."
      );
    } catch (error) {
      console.error("❌ Erreur lors de la création du retrait:", error);
      next(error);
    }
  }

  /**
   * ✅ HISTORIQUE DES DÉPÔTS
   */
  static async getDeposits(req, res, next) {
    try {
      const userId = req.user.id;

      const sql = `
        SELECT 
          id,
          amount_fcfa,
          amount_mz,
          payment_method,
          name,
          phone,
          email,
          status,
          created_at,
          processed_at,
          reject_reason
        FROM deposits
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `;

      const deposits = await query(sql, [userId]);

      return successResponse(res, deposits, "Liste des dépôts récupérée.");
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des dépôts:", error);
      next(error);
    }
  }

  /**
   * ✅ HISTORIQUE DES RETRAITS
   */
  static async getWithdrawals(req, res, next) {
    try {
      const userId = req.user.id;

      const sql = `
        SELECT 
          id,
          amount_mz,
          payment_method,
          name,
          phone,
          email,
          status,
          created_at,
          processed_at,
          reject_reason
        FROM withdrawals
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `;

      const withdrawals = await query(sql, [userId]);

      return successResponse(res, withdrawals, "Liste des retraits récupérée.");
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des retraits:", error);
      next(error);
    }
  }
}

module.exports = PaymentController;
