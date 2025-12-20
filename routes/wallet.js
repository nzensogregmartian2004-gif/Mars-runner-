const express = require("express");
const router = express.Router();
const WalletController = require("../controllers/walletController");
const { authenticate } = require("../middleware/auth");

/**
 * @route   GET /api/wallet/balance
 * @desc    Obtenir le solde actuel
 * @access  Private
 */
router.get("/balance", authenticate, WalletController.getBalance);

/**
 * @route   GET /api/wallet/transactions
 * @desc    Obtenir l'historique des transactions
 * @access  Private
 */
router.get(
  "/transactions",
  authenticate,
  WalletController.getTransactionHistory
);

/**
 * @route   GET /api/wallet/transactions/:transactionId
 * @desc    Obtenir une transaction spécifique
 * @access  Private
 */
router.get(
  "/transactions/:transactionId",
  authenticate,
  WalletController.getTransaction
);

/**
 * @route   GET /api/wallet/summary
 * @desc    Obtenir le résumé du portefeuille
 * @access  Private
 */
router.get("/summary", authenticate, WalletController.getWalletSummary);

/**
 * @route   GET /api/wallet/stats
 * @desc    Obtenir les statistiques du portefeuille
 * @access  Private
 */
router.get("/stats", authenticate, WalletController.getWalletStats);

/**
 * @route   GET /api/wallet/can-withdraw
 * @desc    Vérifier si un retrait est possible
 * @access  Private
 */
router.get("/can-withdraw", authenticate, WalletController.canWithdraw);

/**
 * @route   GET /api/wallet/calculate-fees
 * @desc    Calculer les frais d'une transaction
 * @access  Private
 */
router.get("/calculate-fees", authenticate, WalletController.calculateFees);

/**
 * @route   GET /api/wallet/limits
 * @desc    Obtenir les limites de transaction
 * @access  Private
 */
router.get("/limits", authenticate, WalletController.getLimits);

module.exports = router;
