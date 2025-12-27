// =============================================
// backend/socket/gameManager.js - VERSION AVEC DÉLAI DE STABILISATION
// =============================================

const { query, transaction } = require("../config/database");
const crypto = require("crypto");
const { roundToTwo } = require("../utils/helpers");

// 🔥 CONSTANTES LOCALES
const GAME_STATUS = {
  PLAYING: "playing",
  CRASHED: "crashed",
  CASHED_OUT: "cashed_out",
};

const GAME_CONSTANTS = {
  BASE_SPEED: 4.2,
  MIN_CASHOUT_MULTIPLIER: 1.5,
  GAME_END_STABILIZATION_DELAY: 1500, // ⭐ NOUVEAU : Délai avant autorisation nouvelle partie
};

const BONUS = {
  NEW_PLAYER: 5,
  SPONSOR: 2,
};

// 🔥 CACHE GLOBAL POUR RATE LIMITING
const userGameRequests = new Map();
const RATE_LIMIT_DELAY = 2000; // 2 secondes entre chaque partie

// ⭐ NOUVEAU : Cache pour suivre l'état de fin de partie
const userGameEndTimestamps = new Map();

class GameManager {
  constructor(userId, betAmount, socket, io) {
    this.userId = userId;
    this.betAmount = parseFloat(betAmount);
    this.socket = socket;
    this.io = io;

    this.gameId = null;
    this.startTime = null;
    this.currentMultiplier = 1.0;
    this.updateInterval = null;
    this.crashed = false;

    // 🚀 VITESSE DU MULTIPLICATEUR
    this.baseIncrement = 0.0179;
    this.tickRate = 45;

    this.seed = crypto.randomBytes(32).toString("hex");
    this.currentSpeed = GAME_CONSTANTS.BASE_SPEED;
    this.totalDistance = 0;

    // ⭐ NOUVEAU : Flag pour éviter double traitement
    this.isProcessingEnd = false;
  }

  async getUserBalance() {
    const result = await query("SELECT balance_mz FROM users WHERE id = ?", [
      this.userId,
    ]);
    return parseFloat(result[0]?.balance_mz || 0);
  }

  async updateUserStats(conn, cashedOut) {
    if (cashedOut) {
      await conn.query(
        "UPDATE users SET total_games = total_games + 1, total_wins = total_wins + 1 WHERE id = ?",
        [this.userId]
      );
    } else {
      await conn.query(
        "UPDATE users SET total_games = total_games + 1 WHERE id = ?",
        [this.userId]
      );
    }
  }

  calculateNextMultiplier() {
    const elapsedTime = Date.now() - this.startTime;
    const baseMultiplier = 1.0 + (elapsedTime / 1000) * this.baseIncrement;
    return parseFloat(baseMultiplier.toFixed(5));
  }

  // ==========================================
  // 🔥 MÉTHODE STATIQUE : Vérifications de sécurité
  // ==========================================
  static async validateGameStart(userId, betAmount, socket) {
    const errors = [];

    // ⭐ PROTECTION 0 : Vérifier le délai de stabilisation après fin de partie
    const lastGameEnd = userGameEndTimestamps.get(userId);
    const now = Date.now();

    if (
      lastGameEnd &&
      now - lastGameEnd < GAME_CONSTANTS.GAME_END_STABILIZATION_DELAY
    ) {
      const remainingTime = Math.ceil(
        (GAME_CONSTANTS.GAME_END_STABILIZATION_DELAY - (now - lastGameEnd)) /
          1000
      );
      errors.push({
        code: "GAME_STABILIZATION",
        message: `Partie précédente en cours de finalisation. Veuillez patienter ${remainingTime}s.`,
      });
    }

    // ✅ PROTECTION 1 : Vérifier si l'utilisateur a déjà une partie en cours
    const existingGames = await query(
      `SELECT id, game_status, created_at 
       FROM games 
       WHERE user_id = ? AND game_status = ? 
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, GAME_STATUS.PLAYING]
    );

    if (existingGames.length > 0) {
      const game = existingGames[0];
      const gameAge = Date.now() - new Date(game.created_at).getTime();

      // Si la partie a plus de 5 minutes, on la considère comme abandonnée
      if (gameAge > 300000) {
        console.log(
          `⚠️ Partie abandonnée détectée (ID: ${game.id}), nettoyage...`
        );
        await query(
          `UPDATE games SET game_status = ?, ended_at = NOW() WHERE id = ?`,
          [GAME_STATUS.CRASHED, game.id]
        );

        // ⭐ Enregistrer le timestamp de nettoyage
        userGameEndTimestamps.set(userId, Date.now());

        // ⭐ Retourner une erreur pour forcer le délai
        errors.push({
          code: "GAME_CLEANUP",
          message: "Partie précédente nettoyée. Veuillez patienter 2 secondes.",
        });
      } else {
        errors.push({
          code: "GAME_IN_PROGRESS",
          message:
            "Vous avez déjà une partie en cours. Terminez-la avant d'en démarrer une nouvelle.",
        });
      }
    }

    // ✅ PROTECTION 2 : Rate Limiting (1 partie toutes les 2 secondes)
    const lastRequest = userGameRequests.get(userId);

    if (lastRequest && now - lastRequest < RATE_LIMIT_DELAY) {
      const remainingTime = Math.ceil(
        (RATE_LIMIT_DELAY - (now - lastRequest)) / 1000
      );
      errors.push({
        code: "RATE_LIMIT",
        message: `Veuillez attendre ${remainingTime}s avant de démarrer une nouvelle partie.`,
      });
    }

    // ✅ PROTECTION 3 : Validation du montant de mise
    if (!betAmount || betAmount < 1) {
      errors.push({
        code: "INVALID_BET",
        message: "Le montant de mise minimum est de 1 MZ.",
      });
    }

    if (betAmount > 1000) {
      errors.push({
        code: "BET_TOO_HIGH",
        message: "Le montant de mise maximum est de 1000 MZ.",
      });
    }

    // ✅ PROTECTION 4 : Vérifier le solde
    const userBalance = await query(
      "SELECT balance_mz FROM users WHERE id = ?",
      [userId]
    );

    if (!userBalance || userBalance.length === 0) {
      errors.push({
        code: "USER_NOT_FOUND",
        message: "Utilisateur introuvable.",
      });
    } else {
      const balance = parseFloat(userBalance[0].balance_mz);
      if (balance < betAmount) {
        errors.push({
          code: "INSUFFICIENT_BALANCE",
          message: `Solde insuffisant. Solde actuel: ${balance.toFixed(2)} MZ.`,
        });
      }
    }

    // ✅ PROTECTION 5 : Vérifier les requêtes suspectes
    const recentAttempts = await query(
      `SELECT COUNT(*) as count 
       FROM games 
       WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)`,
      [userId]
    );

    if (recentAttempts[0].count >= 5) {
      errors.push({
        code: "SUSPICIOUS_ACTIVITY",
        message:
          "Trop de tentatives détectées. Veuillez patienter 10 secondes.",
      });

      console.warn(
        `⚠️ ALERTE: Activité suspecte détectée pour l'utilisateur ${userId}`
      );
    }

    // Si des erreurs sont détectées, les renvoyer
    if (errors.length > 0) {
      const errorMessage = errors.map((e) => e.message).join(" ");
      socket.emit("game:error", {
        code: errors[0].code,
        message: errorMessage,
      });
      return { valid: false, errors };
    }

    // ✅ Mettre à jour le timestamp de la dernière requête
    userGameRequests.set(userId, now);

    // Nettoyer les anciens timestamps
    if (userGameRequests.size > 1000) {
      const cutoff = now - 60000;
      for (const [uid, timestamp] of userGameRequests.entries()) {
        if (timestamp < cutoff) {
          userGameRequests.delete(uid);
        }
      }
    }

    // ⭐ Nettoyer les anciens timestamps de fin de partie
    if (userGameEndTimestamps.size > 1000) {
      const cutoff = now - 10000; // Garder 10 secondes d'historique
      for (const [uid, timestamp] of userGameEndTimestamps.entries()) {
        if (timestamp < cutoff) {
          userGameEndTimestamps.delete(uid);
        }
      }
    }

    return { valid: true };
  }

  // ==========================================
  // Démarrer la partie - VERSION SÉCURISÉE
  // ==========================================
  async startGame() {
    let gameId;

    try {
      await transaction(async (conn) => {
        // 🔥 DOUBLE VÉRIFICATION : S'assurer qu'aucune partie n'est en cours
        const doubleCheck = await conn.query(
          `SELECT id FROM games WHERE user_id = ? AND game_status = ? FOR UPDATE`,
          [this.userId, GAME_STATUS.PLAYING]
        );

        if (doubleCheck.length > 0) {
          throw new Error(
            "Une partie est déjà en cours (vérification interne)."
          );
        }

        // Débiter la mise avec vérification du solde
        const updateResult = await conn.query(
          "UPDATE users SET balance_mz = balance_mz - ? WHERE id = ? AND balance_mz >= ?",
          [this.betAmount, this.userId, this.betAmount]
        );

        if (updateResult.affectedRows === 0) {
          throw new Error("Solde insuffisant ou utilisateur introuvable.");
        }

        // Créer l'entrée de jeu
        const result = await conn.query(
          `INSERT INTO games (user_id, bet_amount, game_status, initial_seed) 
           VALUES (?, ?, ?, ?)`,
          [this.userId, this.betAmount, GAME_STATUS.PLAYING, this.seed]
        );

        gameId = result.insertId;

        // Créer la transaction de mise
        await conn.query(
          `INSERT INTO transactions (user_id, type, amount_mz, amount_fcfa, status, game_id, description) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            this.userId,
            "bet",
            this.betAmount,
            this.betAmount * 100,
            "completed",
            gameId,
            `Mise de départ pour la partie #${gameId}`,
          ]
        );
      });

      this.gameId = gameId;
      this.startTime = Date.now();

      const balance = await this.getUserBalance();

      // ⭐ DÉLAI COURT avant d'émettre game:started (évite la réception avant que le client soit prêt)
      await new Promise((resolve) => setTimeout(resolve, 100));

      this.socket.emit("game:started", {
        gameId: this.gameId,
        balance: balance,
      });

      console.log(
        `✅ Partie démarrée: User ${this.userId}, Game #${gameId}, Bet: ${this.betAmount} MZ`
      );

      this.updateInterval = setInterval(
        this.updateGameProgress.bind(this),
        this.tickRate
      );
    } catch (error) {
      console.error("❌ Erreur startGame():", error);

      // Nettoyer le rate limiting en cas d'erreur
      userGameRequests.delete(this.userId);

      this.socket.emit("game:error", {
        code: "START_FAILED",
        message: error.message || "Impossible de démarrer la partie.",
      });
      throw error;
    }
  }

  // ==========================================
  // Boucle de mise à jour
  // ==========================================
  updateGameProgress() {
    if (this.crashed) {
      clearInterval(this.updateInterval);
      return;
    }

    const newMultiplier = this.calculateNextMultiplier();

    if (newMultiplier > this.currentMultiplier) {
      this.currentMultiplier = newMultiplier;
    }

    this.socket.emit("game:progress", {
      gameId: this.gameId,
      multiplier: this.currentMultiplier.toFixed(5),
    });
  }

  // ==========================================
  // ✅ Terminer la partie - VERSION AMÉLIORÉE
  // ==========================================
  async gameOver(cashedOut = false, winAmount = 0) {
    // ⭐ Protection contre les appels multiples
    if (this.crashed || this.isProcessingEnd) {
      console.warn(`⚠️ gameOver() déjà en cours pour game #${this.gameId}`);
      return;
    }

    this.isProcessingEnd = true;
    this.crashed = true;

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    try {
      await transaction(async (conn) => {
        // Mettre à jour la partie
        await conn.query(
          `UPDATE games 
           SET game_status = ?, multiplier_reached = ?, win_amount = ?, ended_at = NOW()
           WHERE id = ?`,
          [
            cashedOut ? GAME_STATUS.CASHED_OUT : GAME_STATUS.CRASHED,
            this.currentMultiplier,
            winAmount,
            this.gameId,
          ]
        );

        // Mettre à jour les stats
        await this.updateUserStats(conn, cashedOut);

        // Si Cash Out, créditer le gain
        if (cashedOut) {
          await conn.query(
            "UPDATE users SET balance_mz = balance_mz + ? WHERE id = ?",
            [winAmount, this.userId]
          );

          await conn.query(
            `INSERT INTO transactions (user_id, type, amount_mz, amount_fcfa, status, game_id, description) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              this.userId,
              "win",
              winAmount,
              winAmount * 100,
              "completed",
              this.gameId,
              `Gain de la partie #${
                this.gameId
              } à x${this.currentMultiplier.toFixed(2)}`,
            ]
          );
        }

        // Récupérer la balance finale
        const users = await conn.query(
          "SELECT balance_mz FROM users WHERE id = ?",
          [this.userId]
        );

        const currentBalance = parseFloat(users[0]?.balance_mz || 0);

        // ⭐ ENREGISTRER le timestamp de fin de partie
        userGameEndTimestamps.set(this.userId, Date.now());

        // ⭐ DÉLAI avant notification (laisse le temps au client de se stabiliser)
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Notifier le client
        if (cashedOut) {
          this.socket.emit("game:cashedOut", {
            gameId: this.gameId,
            multiplier: this.currentMultiplier,
            winAmount: winAmount,
            balance: currentBalance,
          });
        } else {
          this.socket.emit("game:over", {
            gameId: this.gameId,
            multiplier: this.currentMultiplier,
            winAmount: 0,
            balance: currentBalance,
          });
        }

        console.log(
          `${cashedOut ? "💰 Cash Out" : "☠️ Game Over"}: User ${
            this.userId
          }, Mult: x${this.currentMultiplier.toFixed(
            2
          )}, Balance: ${currentBalance.toFixed(2)} MZ`
        );
      });
    } catch (error) {
      console.error("❌ Erreur gameOver():", error);
      throw error;
    } finally {
      this.isProcessingEnd = false;
    }
  }

  // ==========================================
  // Gérer le Cash Out
  // ==========================================
  async cashOut() {
    if (this.currentMultiplier < GAME_CONSTANTS.MIN_CASHOUT_MULTIPLIER) {
      return {
        success: false,
        message: `Le retrait minimum est à x${GAME_CONSTANTS.MIN_CASHOUT_MULTIPLIER.toFixed(
          2
        )}`,
      };
    }

    const winAmount = roundToTwo(this.betAmount * this.currentMultiplier);
    await this.gameOver(true, winAmount);
    return { success: true };
  }

  // ==========================================
  // Gérer la collision
  // ==========================================
  async handleCollision(finalMultiplier) {
    if (this.crashed || this.isProcessingEnd) {
      return;
    }

    this.currentMultiplier = parseFloat(finalMultiplier);

    try {
      await this.gameOver(false, 0);
    } catch (error) {
      console.error("Erreur handleCollision:", error);
    }
  }

  // ==========================================
  // Gérer la déconnexion
  // ==========================================
  async handleDisconnect() {
    if (this.crashed || this.isProcessingEnd) {
      return true;
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.crashed = true;
    this.isProcessingEnd = true;

    try {
      await query(
        `UPDATE games SET game_status = ?, multiplier_reached = ?, win_amount = 0, ended_at = NOW()
         WHERE id = ?`,
        [GAME_STATUS.CRASHED, this.currentMultiplier, this.gameId]
      );

      const finalBalance = await this.getUserBalance();

      // ⭐ Enregistrer le timestamp de fin
      userGameEndTimestamps.set(this.userId, Date.now());

      this.socket.emit("game:over", {
        gameId: this.gameId,
        message: "Partie annulée suite à la déconnexion.",
        balance: finalBalance,
      });

      // Nettoyer le rate limiting
      userGameRequests.delete(this.userId);

      return true;
    } catch (error) {
      console.error("❌ Erreur handleDisconnect():", error);
      return true;
    } finally {
      this.isProcessingEnd = false;
    }
  }

  // ==========================================
  // 🔥 MÉTHODE : Nettoyer les parties abandonnées
  // ==========================================
  static async cleanupAbandonedGames() {
    try {
      const result = await query(
        `UPDATE games 
         SET game_status = ?, ended_at = NOW()
         WHERE game_status = ? 
         AND created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
        [GAME_STATUS.CRASHED, GAME_STATUS.PLAYING]
      );

      if (result.affectedRows > 0) {
        console.log(`🧹 ${result.affectedRows} parties abandonnées nettoyées`);
      }
    } catch (error) {
      console.error("❌ Erreur cleanupAbandonedGames():", error);
    }
  }
}

// 🔥 LANCER LE NETTOYAGE AUTOMATIQUE TOUTES LES 5 MINUTES
setInterval(() => {
  GameManager.cleanupAbandonedGames();
}, 300000);

module.exports = GameManager;
