const express = require("express");
const router = express.Router();
const GameController = require("../controllers/gameController");
const { authenticate, optionalAuth } = require("../middleware/auth");
const {
  validateStartGame,
  validateCashOut,
} = require("../middleware/validator");
const { query } = require("../config/database");

// ========== ROUTES DE JEU (API REST) ==========

/**
 * @route   POST /api/game/start
 * @desc    Démarrer une nouvelle partie (REST)
 * @access  Private
 */
router.post(
  "/start",
  authenticate,
  validateStartGame,
  GameController.startGame
);

/**
 * @route   POST /api/game/cashout
 * @desc    Retirer ses gains (Cash Out) (REST)
 * @access  Private
 */
router.post("/cashout", authenticate, validateCashOut, GameController.cashOut);

/**
 * @route   POST /api/game/gameover
 * @desc    Terminer la partie (défaite) (REST)
 * @access  Private
 */
router.post("/gameover", authenticate, GameController.gameOver);

/**
 * @route   PUT /api/game/progress
 * @desc    Mettre à jour la progression de la partie (Placeholder - Préférer Socket.IO)
 * @access  Private
 */
router.put("/progress", authenticate, (req, res) => {
  // Cette route est ici pour la complétude, mais la logique est gérée par Socket.IO
  return res.status(200).json({
    success: true,
    message: "Utilisez Socket.IO pour la progression du jeu.",
  });
});

/**
 * @route   GET /api/game/active
 * @desc    Obtenir la partie active en cours
 * @access  Private
 */
router.get("/active", authenticate, GameController.getActiveGame);

/**
 * @route   GET /api/game/history
 * @desc    Obtenir l'historique des parties
 * @access  Private
 */
router.get("/history", authenticate, GameController.getHistory);

/**
 * @route   GET /api/game/stats
 * @desc    Obtenir les statistiques de jeu de l'utilisateur
 * @access  Private
 */
router.get("/stats", authenticate, GameController.getStats);

/**
 * @route   GET /api/game/leaderboard
 * @desc    Obtenir le classement des meilleurs joueurs
 * @access  Public (optionnel)
 */
router.get("/leaderboard", optionalAuth, GameController.getLeaderboard);

/**
 * @route   GET /api/game/top-games
 * @desc    Obtenir les meilleures parties récentes
 * @access  Public (optionnel)
 */
router.get("/top-games", optionalAuth, GameController.getTopGames);

/**
 * @route   GET /api/game/global-stats
 * @desc    Obtenir les statistiques globales de jeu
 * @access  Public
 */
router.get("/global-stats", GameController.getGlobalStats);

module.exports = router;
