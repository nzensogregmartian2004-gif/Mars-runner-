// ============================================
// routes/payment.js - VERSION CORRIGÉE
// ============================================

const express = require("express");
const router = express.Router();
const PaymentController = require("../controllers/PaymentController");
const { authenticate } = require("../middleware/auth");

// ✅ Toutes les routes protégées
router.use(authenticate);

/**
 * @route   POST /api/payment/deposit
 * @desc    Demande de dépôt
 * @access  Authenticated
 */
router.post("/deposit", PaymentController.createDeposit);

/**
 * @route   POST /api/payment/withdrawal
 * @desc    Demande de retrait
 * @access  Authenticated
 */
router.post("/withdrawal", PaymentController.createWithdrawal);

/**
 * @route   GET /api/payment/deposits
 * @desc    Historique des dépôts
 * @access  Authenticated
 */
router.get("/deposits", PaymentController.getDeposits);

/**
 * @route   GET /api/payment/withdrawals
 * @desc    Historique des retraits
 * @access  Authenticated
 */
router.get("/withdrawals", PaymentController.getWithdrawals);

module.exports = router;
