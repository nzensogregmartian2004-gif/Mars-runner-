// ============================================
// controllers/manualPaymentController.js
// ============================================

const ManualPayment = require("../models/manualPayment");
const User = require("../models/user");
const { successResponse, errorResponse } = require("../utils/helpers");

class ManualPaymentController {
  /**
   * ✅ DEMANDE DE DÉPÔT
   */
  static async requestDeposit(req, res, next) {
    try {
      const userId = req.user.id;
      const { amountFcfa, amountMz } = req.body;

      if (!amountFcfa || !amountMz) {
        return errorResponse(res, "Montant requis", "VALIDATION_ERROR", 400);
      }

      const depositId = await ManualPayment.createDeposit(
        userId,
        amountFcfa,
        amountMz
      );
      const user = await User.findById(userId);

      console.log(
        `📥 Dépôt enregistré - ID: ${depositId}, User: ${user.email}`
      );

      return successResponse(res, {
        depositId,
        message: "Demande enregistrée.  Envoyez votre preuve sur WhatsApp.",
        whatsappNumber: "24177777777",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * ✅ DEMANDE DE RETRAIT
   */
  static async requestWithdrawal(req, res, next) {
    try {
      const userId = req.user.id;
      const { amountMz, walletName, walletNumber } = req.body;

      if (!amountMz || !walletName || !walletNumber) {
        return errorResponse(
          res,
          "Tous les champs sont requis",
          "VALIDATION_ERROR",
          400
        );
      }

      const user = await User.findById(userId);
      const bonusAmount = user.new_player_bonus_locked ? 5 : 0;
      const withdrawableBalance = user.balance_mz - bonusAmount;

      if (amountMz > withdrawableBalance) {
        return errorResponse(
          res,
          `Max retirable: ${withdrawableBalance.toFixed(2)} MZ.`,
          "BONUS_LOCKED",
          400
        );
      }

      const amountFcfa = amountMz * 100;
      const withdrawalId = await ManualPayment.createWithdrawal(
        userId,
        amountFcfa,
        amountMz,
        walletName,
        walletNumber
      );

      return successResponse(res, {
        withdrawalId,
        newBalance: user.balance_mz,
        message: "Demande de retrait enregistrée.  Traitement sous 24h.",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * ✅ HISTORIQUE DES DÉPÔTS
   */
  static async getUserDeposits(req, res, next) {
    try {
      const userId = req.user.id;
      const deposits = await ManualPayment.getAllDeposits();
      const userDeposits = deposits.filter((d) => d.user_id === userId);
      return successResponse(res, userDeposits);
    } catch (error) {
      next(error);
    }
  }

  /**
   * ✅ HISTORIQUE DES RETRAITS
   */
  static async getUserWithdrawals(req, res, next) {
    try {
      const userId = req.user.id;
      const withdrawals = await ManualPayment.getAllWithdrawals();
      const userWithdrawals = withdrawals.filter((w) => w.user_id === userId);
      return successResponse(res, userWithdrawals);
    } catch (error) {
      next(error);
    }
  }
}

// ✅ EXPORT CORRECT
module.exports = ManualPaymentController;
