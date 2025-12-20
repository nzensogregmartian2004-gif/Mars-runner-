// ===========================================
// controllers/walletController.js - VERSION COMPLÈTE CORRIGÉE
// ============================================

const User = require("../models/user");
const Transaction = require("../models/transaction");
const {
  successResponse,
  errorResponse,
  paginate,
  paginationMeta,
  mzToFcfa,
  fcfaToMz,
  roundToTwo,
} = require("../utils/helpers");
const {
  ERROR_CODES,
  ERROR_MESSAGES,
  LIMITS,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  TRANSACTION_FEE_PERCENT,
  GAME_CONSTANTS,
} = require("../utils/constants");
const { query } = require("../config/database");

class WalletController {
  /**
   * Obtenir le solde actuel
   */
  static async getBalance(req, res, next) {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId);

      if (!user) {
        return errorResponse(
          res,
          ERROR_MESSAGES[ERROR_CODES.AUTH_USER_NOT_FOUND],
          ERROR_CODES.AUTH_USER_NOT_FOUND,
          404
        );
      }

      return successResponse(res, {
        balance: parseFloat(user.balance_mz),
        bonusLocked: user.new_player_bonus_locked,
        bonusAmount: parseFloat(user.new_player_bonus_amount),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir l'historique des transactions
   */
  static async getTransactionHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const { page, limit } = req.query;

      const { data, total } = await Transaction.getHistory(userId, page, limit);

      // Sanitize/Format data for client
      const transactions = data.map((t) => ({
        id: t.id,
        type: t.transaction_type,
        amount: parseFloat(t.amount_mz),
        status: t.status,
        description: t.description,
        date: t.created_at,
        // Conversion FCFA pour les transactions de paiement
        amountFcfa:
          t.amount_fcfa !== null
            ? parseFloat(t.amount_fcfa)
            : mzToFcfa(t.amount_mz),
      }));

      return successResponse(res, {
        transactions,
        ...paginationMeta(total, parseInt(page), parseInt(limit)),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir une transaction spécifique
   */
  static async getTransaction(req, res, next) {
    try {
      const userId = req.user.id;
      const { transactionId } = req.params;

      const transaction = await Transaction.findById(transactionId);

      if (!transaction || transaction.user_id !== userId) {
        return errorResponse(
          res,
          ERROR_MESSAGES[ERROR_CODES.NOT_FOUND],
          ERROR_CODES.NOT_FOUND,
          404
        );
      }

      return successResponse(res, {
        transaction: {
          id: transaction.id,
          type: transaction.transaction_type,
          amount: parseFloat(transaction.amount_mz),
          amountFcfa:
            transaction.amount_fcfa !== null
              ? parseFloat(transaction.amount_fcfa)
              : mzToFcfa(transaction.amount_mz),
          status: transaction.status,
          description: transaction.description,
          date: transaction.created_at,
          reference: transaction.provider_reference,
          gameId: transaction.game_id,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir le résumé du portefeuille
   */
  static async getWalletSummary(req, res, next) {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId);

      if (!user) {
        return errorResponse(
          res,
          ERROR_MESSAGES[ERROR_CODES.AUTH_USER_NOT_FOUND],
          ERROR_CODES.AUTH_USER_NOT_FOUND,
          404
        );
      }

      const { total_gains, total_mises, profit_loss } =
        await Transaction.getProfitLoss(userId);
      const totalDeposits = await Transaction.getTotalByType(userId, "deposit");
      const totalWithdrawals = await Transaction.getTotalByType(
        userId,
        "withdraw"
      );

      return successResponse(res, {
        summary: {
          currentBalance: parseFloat(user.balance_mz),
          totalGains: parseFloat(total_gains),
          totalMises: parseFloat(total_mises),
          profitLoss: parseFloat(profit_loss),
          totalDeposits: parseFloat(totalDeposits),
          totalWithdrawals: parseFloat(totalWithdrawals),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir les statistiques du portefeuille
   */
  static async getWalletStats(req, res, next) {
    try {
      const userId = req.user.id;

      const stats = await Transaction.getStats(userId);

      return successResponse(res, { stats });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Vérifier si un retrait est possible
   */
  static async canWithdraw(req, res, next) {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId);

      if (!user) {
        return errorResponse(
          res,
          ERROR_MESSAGES[ERROR_CODES.AUTH_USER_NOT_FOUND],
          ERROR_CODES.AUTH_USER_NOT_FOUND,
          404
        );
      }

      // La condition est simple: avoir plus que le minimum de retrait
      const isBalanceSufficient =
        parseFloat(user.balance_mz) >= LIMITS.WITHDRAW.MIN_MZ;

      // On peut ajouter d'autres conditions ici (ex: KYC, pas de bonus en cours, etc.)
      let canWithdraw = isBalanceSufficient && !user.new_player_bonus_locked;

      let message = "Retrait possible.";
      if (!isBalanceSufficient) {
        message = `Solde insuffisant. Minimum requis : ${LIMITS.WITHDRAW.MIN_MZ} MZ.`;
      } else if (user.new_player_bonus_locked) {
        message =
          "Votre bonus de bienvenue est en attente de déblocage (première mise réussie).";
      }

      return successResponse(res, {
        canWithdraw,
        isBalanceSufficient,
        isBonusLocked: user.new_player_bonus_locked,
        minWithdraw: LIMITS.WITHDRAW.MIN_MZ,
        message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculer les frais d'une transaction
   */
  static async calculateFees(req, res, next) {
    try {
      const { amount, type } = req.query; // amount = montant en FCFA pour dépôt, en MZ pour retrait

      if (!amount || !type || !["deposit", "withdraw"].includes(type)) {
        return errorResponse(
          res,
          "Montant et type requis",
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const amountNum = parseFloat(amount);

      if (isNaN(amountNum) || amountNum <= 0) {
        return errorResponse(
          res,
          "Montant invalide",
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Les fonctions de calcul se basent sur l'implémentation de Transaction
      const fee = Transaction.calculateFee(amountNum, type);
      const netAmount = Transaction.calculateNetAmount(amountNum, type);

      let details = {};

      if (type === "deposit") {
        // Pour un dépôt en FCFA
        const netAmountMz = fcfaToMz(netAmount);
        details = {
          grossAmountFcfa: amountNum,
          feeFcfa: roundToTwo(fee),
          netAmountFcfa: roundToTwo(netAmount),
          netAmountMz: roundToTwo(netAmountMz),
        };
      } else if (type === "withdraw") {
        // Pour un retrait en MZ
        const netAmountFcfa = mzToFcfa(netAmount);
        details = {
          grossAmountMz: amountNum,
          feeMz: roundToTwo(fee),
          netAmountMz: roundToTwo(netAmount),
          netAmountFcfa: roundToTwo(netAmountFcfa),
        };
      }

      return successResponse(res, {
        type,
        feePercent: TRANSACTION_FEE_PERCENT,
        details,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir les limites de transaction
   */
  static async getLimits(req, res, next) {
    try {
      return successResponse(res, {
        limits: {
          bet: {
            min: LIMITS.BET.MIN_MZ,
            max: LIMITS.BET.MAX_MZ,
            minFcfa: mzToFcfa(LIMITS.BET.MIN_MZ),
            maxFcfa: mzToFcfa(LIMITS.BET.MAX_MZ),
          },
          deposit: {
            min: LIMITS.DEPOSIT.MIN_FCFA,
            max: LIMITS.DEPOSIT.MAX_FCFA,
            minMz: fcfaToMz(LIMITS.DEPOSIT.MIN_FCFA),
            maxMz: fcfaToMz(LIMITS.DEPOSIT.MAX_FCFA),
          },
          withdraw: {
            min: LIMITS.WITHDRAW.MIN_MZ,
            max: LIMITS.WITHDRAW.MAX_MZ,
            minFcfa: mzToFcfa(LIMITS.WITHDRAW.MIN_MZ),
            maxFcfa: mzToFcfa(LIMITS.WITHDRAW.MAX_MZ),
          },
          game: {
            minMultiplierWithdraw: GAME_CONSTANTS.MIN_MULTIPLIER_WITHDRAW,
            maxMultiplier: GAME_CONSTANTS.MAX_MULTIPLIER || 100,
          },
        },
        feePercent: TRANSACTION_FEE_PERCENT,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = WalletController;
