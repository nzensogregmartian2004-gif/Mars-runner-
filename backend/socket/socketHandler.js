// ============================================
// backend/socket/socketHandler.js - VERSION FINALE SÉCURISÉE
// ============================================

const jwt = require("jsonwebtoken");
const GameManager = require("./gameManager");
const { query, transaction } = require("../config/database");
const User = require("../models/user");
const Referral = require("../models/referral");

const activeSessions = new Map();

// ✅ Middleware d'authentification
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Token manquant"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.userId || decoded.id || decoded.user_id;

    if (!userId) {
      console.error("❌ Token décodé sans userId:", decoded);
      return next(new Error("Invalid token: No user ID"));
    }

    const users = await query(
      "SELECT id, balance_mz, new_player_bonus_locked, new_player_bonus_amount FROM users WHERE id = ?",
      [userId]
    );

    if (!users || users.length === 0) {
      return next(new Error("Utilisateur non trouvé"));
    }

    socket.userId = userId;
    socket.user = users[0];

    console.log("✅ Socket authentifié - User ID:", userId);
    next();
  } catch (error) {
    console.error("❌ Erreur auth socket:", error.message);
    next(new Error("Authentification échouée"));
  }
};

module.exports = (io) => {
  io.use(socketAuth);

  io.on("connection", (socket) => {
    console.log(`🔌 Client connecté: ${socket.userId}`);

    // ✅ REJOINDRE UNE ROOM UTILISATEUR
    socket.join(`user_${socket.userId}`);
    console.log(
      `✅ User ${socket.userId} a rejoint la room user_${socket.userId}`
    );

    // =========================================
    // ÉVÉNEMENT: Récupérer le solde
    // =========================================
    socket.on("wallet:getBalance", async () => {
      try {
        const users = await query("SELECT balance_mz FROM users WHERE id = ?", [
          socket.userId,
        ]);

        if (users.length > 0) {
          socket.emit("wallet:balance", {
            balance: parseFloat(users[0].balance_mz),
            balance_mz: parseFloat(users[0].balance_mz),
          });
        }
      } catch (error) {
        console.error("❌ Erreur getBalance:", error);
      }
    });

    // =========================================
    // ÉVÉNEMENT: Récupérer le profil utilisateur
    // =========================================
    socket.on("user:getProfile", async () => {
      try {
        const users = await query(
          "SELECT id, nom, prenom, email, balance_mz, new_player_bonus_locked, referral_code FROM users WHERE id = ?",
          [socket.userId]
        );

        if (users.length > 0) {
          socket.emit("user:info", {
            id: users[0].id,
            nom: users[0].nom,
            prenom: users[0].prenom,
            email: users[0].email,
            balance: parseFloat(users[0].balance_mz),
            balance_mz: parseFloat(users[0].balance_mz),
            new_player_bonus_locked: users[0].new_player_bonus_locked,
            referral_code: users[0].referral_code,
          });
        }
      } catch (error) {
        console.error("❌ Erreur user:getProfile:", error);
        socket.emit("user:error", {
          message: "Erreur lors de la récupération du profil",
        });
      }
    });

    // =========================================
    // ÉVÉNEMENT: Récupérer les infos de parrainage
    // =========================================
    socket.on("referral:getInfo", async () => {
      try {
        const userId = socket.userId;

        // Récupérer le code de parrainage
        const user = await User.findById(userId);

        // Récupérer les affiliés
        const { data: affiliates } = await Referral.getSponsorReferrals(
          userId,
          1,
          100
        );

        const sanitizedAffiliates = affiliates.map((aff) => ({
          id: aff.id,
          name: `${aff.prenom || "?"} ${(aff.nom || "?").charAt(0)}.`,
          email: aff.email,
          bonusEarned: parseFloat(aff.bonus_earned_mz || 0),
          bonusUnlocked:
            aff.bonus_unlocked === 1 || aff.bonus_unlocked === true,
          joinedAt: aff.created_at,
        }));

        socket.emit("referral:info", {
          referralCode: user?.referral_code,
          affiliatedUsers: sanitizedAffiliates,
          totalAffiliates: sanitizedAffiliates.length,
        });

        console.log(
          `✅ Envoyé ${sanitizedAffiliates.length} affiliés au client ${userId}`
        );
      } catch (error) {
        console.error("❌ Erreur referral:getInfo:", error);
        socket.emit("referral:error", {
          message: "Erreur lors de la récupération des affiliés",
        });
      }
    });

    // =========================================
    // 🔥 ÉVÉNEMENT: Démarrer une partie - VERSION SÉCURISÉE
    // =========================================
    socket.on("game:start", async (data) => {
      const userId = socket.userId;

      console.log(
        `🎮 Demande de démarrage: User ${userId}, Bet: ${data.betAmount} MZ`
      );

      // ✅ PROTECTION 1 : Vérifier s'il y a déjà une session active
      if (activeSessions.has(userId)) {
        console.warn(
          `⚠️ Tentative de double-partie (activeSessions): User ${userId}`
        );
        return socket.emit("game:error", {
          code: "GAME_ALREADY_ACTIVE",
          message: "Vous avez déjà une partie en cours sur cette connexion.",
        });
      }

      // ✅ PROTECTION 2 : Flag anti-spam (empêche clics multiples)
      if (socket.isStartingGame) {
        console.warn(`⚠️ Démarrage déjà en cours: User ${userId}`);
        return socket.emit("game:error", {
          code: "START_IN_PROGRESS",
          message: "Démarrage en cours, veuillez patienter...",
        });
      }

      socket.isStartingGame = true;

      try {
        // ✅ PROTECTION 3 : Validation complète (rate limiting, solde, etc.)
        const validation = await GameManager.validateGameStart(
          userId,
          parseFloat(data.betAmount),
          socket
        );

        if (!validation.valid) {
          console.warn(
            `❌ Validation échouée: User ${userId}`,
            validation.errors
          );
          socket.isStartingGame = false;
          return; // L'erreur a déjà été envoyée par validateGameStart()
        }

        // ✅ PROTECTION 4 : Créer et stocker la session
        const gameSession = new GameManager(userId, data.betAmount, socket, io);
        activeSessions.set(userId, gameSession);

        // ✅ PROTECTION 5 : Démarrer la partie
        await gameSession.startGame();

        console.log(
          `✅ Partie démarrée avec succès: User ${userId}, Game #${gameSession.gameId}`
        );
      } catch (error) {
        console.error(`❌ Erreur game:start pour User ${userId}:`, error);

        socket.emit("game:error", {
          code: "START_FAILED",
          message: "Erreur au démarrage du jeu. Réessayez.",
        });

        // Nettoyer en cas d'erreur
        if (activeSessions.has(userId)) {
          activeSessions.delete(userId);
        }
      } finally {
        socket.isStartingGame = false;
      }
    });

    // =========================================
    // ÉVÉNEMENT: Cash Out
    // =========================================
    socket.on("game:cashout", async () => {
      const userId = socket.userId;
      const gameSession = activeSessions.get(userId);

      if (!gameSession) {
        return socket.emit("game:error", {
          code: "NO_ACTIVE_GAME",
          message: "Aucune partie en cours.",
        });
      }

      try {
        console.log(
          `💰 Demande de Cash Out: User ${userId}, Mult: x${gameSession.currentMultiplier.toFixed(
            2
          )}`
        );

        const result = await gameSession.cashOut();

        if (result && result.success) {
          activeSessions.delete(userId);
          console.log(`✅ Cash Out réussi: User ${userId}`);
        } else if (result && result.message) {
          socket.emit("game:error", {
            code: "CASHOUT_FAILED",
            message: result.message,
          });
        }
      } catch (error) {
        console.error(`❌ Erreur cashOut pour User ${userId}:`, error);
        socket.emit("game:error", {
          code: "CASHOUT_ERROR",
          message: "Erreur lors de la tentative de retrait.",
        });
        activeSessions.delete(userId);
      }
    });

    // =========================================
    // ÉVÉNEMENT: Collision
    // =========================================
    socket.on("game:collision", async (data) => {
      const userId = socket.userId;
      const gameSession = activeSessions.get(userId);

      if (!gameSession) {
        console.warn(`⚠️ Collision reçue sans partie active: User ${userId}`);
        return;
      }

      try {
        console.log(
          `💥 Collision détectée: User ${userId}, Mult: x${data.finalMultiplier}`
        );

        await gameSession.handleCollision(data.finalMultiplier);
        activeSessions.delete(userId);

        console.log(`✅ Game Over traité: User ${userId}`);
      } catch (error) {
        console.error(`❌ Erreur game:collision pour User ${userId}:`, error);
        activeSessions.delete(userId);
      }
    });

    // =========================================
    // ÉVÉNEMENT: Déconnexion
    // =========================================
    socket.on("disconnect", async (reason) => {
      const userId = socket.userId;
      console.log(
        `🔌 Déconnexion: ${socket.id} (User ${userId}), Raison: ${reason}`
      );

      const gameSession = activeSessions.get(userId);
      if (gameSession) {
        try {
          console.log(
            `⚠️ Déconnexion pendant une partie: User ${userId}, Game #${gameSession.gameId}`
          );
          const shouldCleanUp = await gameSession.handleDisconnect();

          if (shouldCleanUp) {
            activeSessions.delete(userId);
            console.log(`🧹 Session de jeu ${gameSession.gameId} nettoyée.`);
          }
        } catch (error) {
          console.error(
            `❌ Erreur handleDisconnect pour User ${userId}:`,
            error
          );
          activeSessions.delete(userId);
        }
      }
    });
  });

  // =========================================
  // 🔥 NETTOYAGE PÉRIODIQUE DES PARTIES ZOMBIES
  // =========================================
  setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [userId, gameSession] of activeSessions.entries()) {
      // Si la partie a plus de 10 minutes, on la supprime
      if (gameSession.startTime && now - gameSession.startTime > 600000) {
        console.warn(
          `⚠️ Partie zombie détectée: User ${userId}, Game #${gameSession.gameId}`
        );
        activeSessions.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 ${cleanedCount} parties zombies nettoyées`);
    }
  }, 60000); // Toutes les minutes

  console.log("✅ Socket Handler initialisé avec protections anti-spam");
};
