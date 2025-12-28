// ============================================
// routes/admin.js - ROUTES ADMINISTRATION (VERSION FINALE)
// ============================================

const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/adminController");
const { authenticateAdmin } = require("../middleware/adminAuth");

/**
 * @route   POST /api/admin/login
 * @desc    Connexion administrateur
 * @access  Public
 */
router.post("/login", AdminController.login);

/**
 * @route   GET /api/admin/stats
 * @desc    Statistiques globales
 * @access  Private (Admin)
 */
router.get("/stats", authenticateAdmin, AdminController.getStats);

/**
 * @route   GET /api/admin/deposits
 * @desc    Liste des dépôts
 * @access  Private (Admin)
 */
router.get("/deposits", authenticateAdmin, AdminController.getDeposits);

/**
 * @route   POST /api/admin/deposits/:id/approve
 * @desc    Approuver un dépôt
 * @access  Private (Admin)
 */
router.post(
  "/deposits/:id/approve",
  authenticateAdmin,
  AdminController.approveDeposit
);

/**
 * @route   POST /api/admin/deposits/:id/reject
 * @desc    Rejeter un dépôt
 * @access  Private (Admin)
 */
router.post(
  "/deposits/:id/reject",
  authenticateAdmin,
  AdminController.rejectDeposit
);

/**
 * @route   GET /api/admin/withdrawals
 * @desc    Liste des retraits
 * @access  Private (Admin)
 */
router.get("/withdrawals", authenticateAdmin, AdminController.getWithdrawals);

/**
 * @route   POST /api/admin/withdrawals/:id/approve
 * @desc    Approuver un retrait
 * @access  Private (Admin)
 */
router.post(
  "/withdrawals/:id/approve",
  authenticateAdmin,
  AdminController.approveWithdrawal
);

/**
 * @route   POST /api/admin/withdrawals/:id/reject
 * @desc    Rejeter un retrait
 * @access  Private (Admin)
 */
router.post(
  "/withdrawals/:id/reject",
  authenticateAdmin,
  AdminController.rejectWithdrawal
);

/**
 * @route   GET /api/admin/users
 * @desc    Liste des utilisateurs
 * @access  Private (Admin)
 */
router.get("/users", authenticateAdmin, AdminController.getUsers);

/**
 * @route   GET /api/admin/games
 * @desc    Historique des parties
 * @access  Private (Admin)
 */
router.get("/games", authenticateAdmin, AdminController.getGames);

router.get("/deposits", authenticateAdmin, AdminController.getDeposits);
router.post(
  "/deposits/:id/approve",
  authenticateAdmin,
  AdminController.approveDeposit
);
router.post(
  "/deposits/:id/reject",
  authenticateAdmin,
  AdminController.rejectDeposit
);

router.get("/withdrawals", authenticateAdmin, AdminController.getWithdrawals);
router.post(
  "/withdrawals/:id/approve",
  authenticateAdmin,
  AdminController.approveWithdrawal
);
router.post(
  "/withdrawals/:id/reject",
  authenticateAdmin,
  AdminController.rejectWithdrawal
);

module.exports = router;
