// =============================================
// socket/gameManager.js - VERSION FINALE CORRIGÉE
// =============================================

const { query, transaction } = require("../config/database");
const crypto = require("crypto");
const { GAME_CONSTANTS, GAME_STATUS, BONUS } = require("../utils/constants");
const { roundToTwo } = require("../utils/helpers");

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
    this.baseIncrement = 0.02; // Optimal (x2 en 5.5s)
    this.tickRate = 45;

    this.seed = crypto.randomBytes(32).toString("hex");
    this.currentSpeed = GAME_CONSTANTS.BASE_SPEED;
    this.totalDistance = 0;
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
  // Démarrer la partie
  // ==========================================
  async startGame() {
    let gameId;

    await transaction(async (conn) => {
      // Débiter la mise
      await conn.query(
        "UPDATE users SET balance_mz = balance_mz - ? WHERE id = ?",
        [this.betAmount, this.userId]
      );

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
    this.socket.emit("game:started", {
      gameId: this.gameId,
      balance: balance,
    });

    this.updateInterval = setInterval(
      this.updateGameProgress.bind(this),
      this.tickRate
    );
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
  // ✅ Terminer la partie - CORRIGÉ
  // ==========================================
  async gameOver(cashedOut = false, winAmount = 0) {
    if (this.crashed) {
      return;
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.crashed = true;

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

        // ✅ CORRECTION: Utiliser conn.query() au lieu de conn.execute()
        const users = await conn.query(
          "SELECT balance_mz FROM users WHERE id = ?",
          [this.userId]
        );

        const currentBalance = parseFloat(users[0]?.balance_mz || 0);

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
          }, Mult: x${this.currentMultiplier.toFixed(2)}`
        );
      });
    } catch (error) {
      console.error("❌ Erreur gameOver():", error);
      throw error;
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
    if (this.crashed) {
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
    if (this.crashed) {
      return true;
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.crashed = true;

    try {
      await query(
        `UPDATE games SET game_status = ?, multiplier_reached = ?, win_amount = 0, ended_at = NOW()
         WHERE id = ?`,
        [GAME_STATUS.CRASHED, this.currentMultiplier, this.gameId]
      );

      const finalBalance = await this.getUserBalance();

      this.socket.emit("game:over", {
        gameId: this.gameId,
        message: "Partie annulée suite à la déconnexion.",
        balance: finalBalance,
      });

      return true;
    } catch (error) {
      console.error("❌ Erreur handleDisconnect():", error);
      return true;
    }
  }
}

module.exports = GameManager;
