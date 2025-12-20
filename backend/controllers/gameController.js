// ===========================================
// controllers/gameController.js - VERSION COMPLÈTE CORRIGÉE
// ============================================

const Game = require("../models/game");
const User = require("../models/user");
const Transaction = require("../models/transaction");
const Referral = require("../models/referral");
const SMSService = require("../services/smsService");
const {
  successResponse,
  errorResponse,
  roundToTwo,
  getClientIp,
  getUserAgent,
} = require("../utils/helpers");
const {
  ERROR_CODES,
  ERROR_MESSAGES,
  LIMITS,
  BONUS,
  GAME_STATUS,
  GAME_CONSTANTS,
} = require("../utils/constants");
const { query, transaction } = require("../config/database");

class GameController {
  /**
   * Démarrer une nouvelle partie (API REST - non utilisé si Socket.IO est ON)
   */
  static async startGame(req, res, next) {
    // NOTE: Cette route est redondante si Socket.IO est utilisé.
    // Laissez-la comme fallback ou pour une API purement REST.
    try {
      const userId = req.user.id;
      const { betAmount } = req.body;

      // 1. Validation du montant de la mise (déjà fait par le middleware validator)

      // 2. Vérifier si une partie est déjà active
      const activeGame = await Game.findActiveByUserId(userId);
      if (activeGame) {
        return errorResponse(
          res,
          "Une partie est déjà en cours. Encaissez ou terminez-la.",
          ERROR_CODES.GAME_ALREADY_ACTIVE
        );
      }

      let newGame;
      let newBalance;

      await transaction(async (conn) => {
        // 3. Vérifier le solde de l'utilisateur
        const user = await User.findById(userId, conn, true); // true pour verrouillage
        const currentBalance = parseFloat(user.balance_mz);

        if (currentBalance < betAmount) {
          throw new AppError(
            "Solde insuffisant pour la mise",
            ERROR_CODES.WALLET_INSUFFICIENT_FUNDS
          );
        }

        // 4. Déduire la mise et enregistrer la transaction
        newBalance = roundToTwo(currentBalance - betAmount);
        await User.updateBalance(userId, newBalance, conn);

        await Transaction.createBet(userId, betAmount, null, conn);

        // 5. Créer la partie
        newGame = await Game.create(userId, betAmount, conn);

        // 6. Log l'activité
        await conn.execute(
          `INSERT INTO activity_logs (user_id, action, ip_address, user_agent, game_id) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            userId,
            "game_start",
            getClientIp(req),
            getUserAgent(req),
            newGame.id,
          ]
        );
      });

      return successResponse(
        res,
        {
          gameId: newGame.id,
          betAmount: newGame.betAmount,
          multiplier: newGame.multiplier,
          balance: newBalance,
        },
        "Partie démarrée avec succès"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retirer ses gains (Cash Out) (API REST - non utilisé si Socket.IO est ON)
   */
  static async cashOut(req, res, next) {
    // NOTE: Cette route est redondante si Socket.IO est utilisé.
    try {
      const userId = req.user.id;
      const { gameId, multiplier } = req.body;
      const finalMultiplier = roundToTwo(parseFloat(multiplier));

      const game = await Game.findById(gameId);

      // 1. Validation de l'état de la partie
      if (
        !game ||
        game.user_id !== userId ||
        game.game_status !== GAME_STATUS.PLAYING
      ) {
        return errorResponse(
          res,
          "Partie invalide ou non active",
          ERROR_CODES.GAME_INVALID_ID
        );
      }

      if (finalMultiplier < GAME_CONSTANTS.MIN_MULTIPLIER_WITHDRAW) {
        return errorResponse(
          res,
          `Multiplicateur minimum non atteint (x${GAME_CONSTANTS.MIN_MULTIPLIER_WITHDRAW})`,
          ERROR_CODES.GAME_CASHOUT_TOO_EARLY
        );
      }

      // Calcul des gains
      const winAmount = roundToTwo(game.bet_amount * finalMultiplier);
      let newBalance;

      await transaction(async (conn) => {
        // 2. Mettre à jour le statut de la partie
        await conn.execute(
          `UPDATE games SET game_status = ?, multiplier_reached = ?, win_amount = ?, ended_at = NOW() WHERE id = ?`,
          [GAME_STATUS.CASHED_OUT, finalMultiplier, winAmount, gameId]
        );

        // 3. Créditer les gains
        await conn.execute(
          "UPDATE users SET balance_mz = balance_mz + ? WHERE id = ?",
          [winAmount, userId]
        );

        // 4. Enregistrer la transaction de gain
        await Transaction.createWin(userId, winAmount, gameId, conn);

        // 5. Récupérer le solde mis à jour
        const user = await User.findById(userId, conn);
        newBalance = parseFloat(user.balance_mz);

        // 6. Gérer le bonus de parrainage
        // ... (Logique identique à gameManager.js pour le parrainage)
        const referral = await Referral.findByReferredId(userId, conn);
        if (referral && !referral.bonus_unlocked) {
          const sponsorBonus = BONUS.SPONSOR;
          await Transaction.createReferralBonus(
            referral.sponsor_id,
            sponsorBonus,
            gameId,
            conn
          );
          await User.creditBalance(referral.sponsor_id, sponsorBonus, conn);
          await Referral.unlockBonus(referral.id, sponsorBonus, conn);
        }

        // 7. Log l'activité
        await conn.execute(
          `INSERT INTO activity_logs (user_id, action, ip_address, user_agent, game_id) 
           VALUES (?, ?, ?, ?, ?)`,
          [userId, "game_cashout", getClientIp(req), getUserAgent(req), gameId]
        );
      });

      return successResponse(
        res,
        {
          gameId,
          winAmount,
          multiplier: finalMultiplier,
          balance: newBalance,
        },
        "Gains encaissés avec succès"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Terminer la partie (défaite) (API REST - non utilisé si Socket.IO est ON)
   */
  static async gameOver(req, res, next) {
    // NOTE: Cette route est redondante si Socket.IO est utilisé.
    try {
      const userId = req.user.id;
      const { gameId, multiplier } = req.body;
      const finalMultiplier = roundToTwo(parseFloat(multiplier) || 1.0);

      const game = await Game.findById(gameId);

      // 1. Validation de l'état de la partie
      if (
        !game ||
        game.user_id !== userId ||
        game.game_status !== GAME_STATUS.PLAYING
      ) {
        return errorResponse(
          res,
          "Partie invalide ou non active",
          ERROR_CODES.GAME_INVALID_ID
        );
      }

      // 2. Mettre à jour le statut de la partie
      await query(
        `UPDATE games SET game_status = ?, multiplier_reached = ?, win_amount = 0, ended_at = NOW() WHERE id = ?`,
        [GAME_STATUS.CRASHED, finalMultiplier, gameId]
      );

      // 3. Récupérer le solde actuel pour la réponse
      const user = await User.findById(userId);
      const currentBalance = parseFloat(user.balance_mz);

      // 4. Log l'activité
      await query(
        `INSERT INTO activity_logs (user_id, action, ip_address, user_agent, game_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, "game_over", getClientIp(req), getUserAgent(req), gameId]
      );

      return successResponse(
        res,
        {
          gameId,
          multiplier: finalMultiplier,
          balance: currentBalance,
        },
        "Partie terminée (Défaite)"
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir la partie active en cours
   */
  static async getActiveGame(req, res, next) {
    try {
      const userId = req.user.id;

      const game = await Game.findActiveByUserId(userId);

      if (!game) {
        return errorResponse(
          res,
          "Aucune partie active",
          ERROR_CODES.NOT_FOUND,
          404
        );
      }

      // Calculer l'âge de la partie
      const ageInSeconds = Math.floor(
        (new Date() - new Date(game.started_at)) / 1000
      );

      return successResponse(res, {
        gameId: game.id,
        betAmount: parseFloat(game.bet_amount),
        multiplier: parseFloat(game.multiplier_reached),
        startedAt: game.started_at,
        ageInSeconds,
        status: game.game_status,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir l'historique des parties
   */
  static async getHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const { page, limit } = req.query;

      const { data, total } = await Game.getHistory(userId, page, limit);

      return successResponse(res, {
        games: data,
        ...paginationMeta(total, parseInt(page), parseInt(limit)),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir les statistiques de jeu de l'utilisateur
   */
  static async getStats(req, res, next) {
    try {
      const userId = req.user.id;

      const stats = await Game.getUserStats(userId);

      return successResponse(res, { stats });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir le classement des meilleurs joueurs
   */
  static async getLeaderboard(req, res, next) {
    try {
      const { limit } = req.query;

      const leaderboard = await Game.getLeaderboard(parseInt(limit) || 10);

      return successResponse(res, { leaderboard });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir les meilleures parties récentes
   */
  static async getTopGames(req, res, next) {
    try {
      const { limit } = req.query;

      const topGames = await Game.getTopGames(parseInt(limit) || 10);

      return successResponse(res, { topGames });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir les statistiques globales
   */
  static async getGlobalStats(req, res, next) {
    try {
      // Statistiques agrégées
      const [stats] = await query(
        `SELECT 
          COUNT(*) as total_games,
          COUNT(DISTINCT user_id) as total_players,
          SUM(CASE WHEN game_status = 'cashed_out' THEN win_amount ELSE 0 END) as total_wins,
          MAX(multiplier_reached) as highest_multiplier,
          AVG(multiplier_reached) as avg_multiplier
        FROM games
        WHERE game_status IN ('cashed_out', 'crashed')`
      );

      // Statistiques récentes
      const [recentActivity] = await query(
        `SELECT COUNT(*) as games_today
        FROM games
        WHERE DATE(started_at) = CURDATE()`
      );

      // Parties actives
      const activeGames = await Game.getActiveGames();

      return successResponse(res, {
        globalStats: {
          totalGames: parseInt(stats[0].total_games) || 0,
          totalPlayers: parseInt(stats[0].total_players) || 0,
          totalWins: parseFloat(stats[0].total_wins) || 0,
          highestMultiplier: parseFloat(stats[0].highest_multiplier) || 0,
          avgMultiplier: parseFloat(stats[0].avg_multiplier) || 0,
          gamesToday: parseInt(recentActivity[0].games_today) || 0,
          activeGames: activeGames.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = GameController;
