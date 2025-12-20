// ============================================
// routes/manualpayment. js
// ============================================

const express = require("express");
const router = express.Router();
const ManualPaymentController = require("../controllers/manualPaymentController");
const { authenticate } = require("../middleware/auth");

// ✅ Toutes les routes protégées
router.use(authenticate);

/**
 * @route   POST /api/manualpayment/deposit
 * @desc    Demande de dépôt
 */
router.post("/deposit", ManualPaymentController.requestDeposit);

/**
 * @route   POST /api/manualpayment/withdrawal
 * @desc    Demande de retrait
 */
router.post("/withdrawal", ManualPaymentController.requestWithdrawal);

/**
 * @route   GET /api/manualpayment/deposits
 * @desc    Historique des dépôts
 */
router.get("/deposits", ManualPaymentController.getUserDeposits);

/**
 * @route   GET /api/manualpayment/withdrawals
 * @desc    Historique des retraits
 */
router.get("/withdrawals", ManualPaymentController.getUserWithdrawals);

module.exports = router;
