// ============================================
// controllers/paymentController.js (nouvelle version complète)
// ============================================

const Payment = require("../models/payment");
const User = require("../models/user");
const {
  successResponse,
  errorResponse,
  getClientIp,
  getUserAgent,
} = require("../utils/helpers");

const BONUS_LOCKED_AMOUNT = 5; // Bonus verrouillé pour les nouveaux joueurs

class PaymentController {
  /**
   * DEMANDE DE DÉPÔT
   */
  static async createDeposit(req, res, next) {
    try {
      const userId = req.user.id;
      const { amountFcfa, amountMz, paymentMethod, name, phone } = req.body;

      // Validation des champs
      if (!amountFcfa || amountFcfa < 500 || amountFcfa > 50000) {
        return errorResponse(
          res,
          "Montant invalide (min: 500 FCFA, max: 50 000 FCFA).",
          "VALIDATION_ERROR",
          400
        );
      }

      if (!name || !phone) {
        return errorResponse(
          res,
          "Nom et numéro de téléphone requis.",
          "VALIDATION_ERROR",
          400
        );
      }

      const depositId = await Payment.createDeposit(userId, {
        amountFcfa,
        amountMz,
        paymentMethod,
        name,
        phone,
      });

      console.log(`✔️ [DEPÔT] ID: ${depositId} pour l'utilisateur ${userId}`);

      return successResponse(
        res,
        { depositId },
        "Demande de dépôt enregistrée. Confirmez le paiement sur votre téléphone."
      );
    } catch (error) {
      console.error("❌ Erreur lors de la création du dépôt:", error);
      next(error);
    }
  }

  /**
   * DEMANDE DE RETRAIT
   */
  static async createWithdrawal(req, res, next) {
    try {
      const userId = req.user.id;
      const { amountMz, paymentMethod, name, phone } = req.body;

      // Validation des champs
      if (!amountMz || amountMz < 5) {
        return errorResponse(
          res,
          "Montant minimum pour un retrait: 5 MZ.",
          "VALIDATION_ERROR",
          400
        );
      }

      if (!name || !phone) {
        return errorResponse(
          res,
          "Nom et numéro de téléphone requis.",
          "VALIDATION_ERROR",
          400
        );
      }

      // Vérifier le solde requis
      const user = await User.findById(userId);
      if (!user) {
        return errorResponse(res, "Utilisateur introuvable.", "NOT_FOUND", 404);
      }

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

      // Enregistrer la demande de retrait
      const withdrawalId = await Payment.createWithdrawal(userId, {
        amountMz,
        paymentMethod,
        name,
        phone,
      });

      console.log(
        `✔️ [RETRAIT] ID: ${withdrawalId} pour l'utilisateur ${userId}`
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
   * HISTORIQUE DES DÉPÔTS
   */
  static async getDeposits(req, res, next) {
    try {
      const userId = req.user.id;
      const deposits = await Payment.getDepositsByUser(userId);

      return successResponse(res, deposits, "Liste des dépôts récupérée.");
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des dépôts:", error);
      next(error);
    }
  }

  /**
   * HISTORIQUE DES RETRAITS
   */
  static async getWithdrawals(req, res, next) {
    try {
      const userId = req.user.id;
      const withdrawals = await Payment.getWithdrawalsByUser(userId);

      return successResponse(res, withdrawals, "Liste des retraits récupérée.");
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des retraits:", error);
      next(error);
    }
  }
}

module.exports = PaymentController;
