// ============================================
// socket/socketHandler.js - CORRECTION FINALE REFERRALS
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
      return next(new Error("Invalid token:  No user ID"));
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
    // ÉVÉNEMENT:  Récupérer le solde
    // =========================================
    socket.on("wallet: getBalance", async () => {
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

    // REMPLACE PAR :
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
          name: `${aff.prenom || "?"} ${(aff.nom || "? ").charAt(0)}. `,
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
    // ÉVÉNEMENT: Démarrer une partie
    // =========================================
    socket.on("game:start", async (data) => {
      const userId = socket.userId;

      if (activeSessions.has(userId)) {
        socket.emit("game:error", {
          message: "Une partie est déjà en cours.  Veuillez rejouer.",
        });
        return;
      }

      const users = await query("SELECT balance_mz FROM users WHERE id = ?", [
        userId,
      ]);

      if (users[0].balance_mz < parseFloat(data.betAmount)) {
        socket.emit("game:error", { message: "Solde insuffisant." });
        return;
      }

      if (socket.isStartingGame) return;
      socket.isStartingGame = true;

      try {
        const gameSession = new GameManager(userId, data.betAmount, socket, io);
        activeSessions.set(userId, gameSession);
        await gameSession.startGame();
      } catch (error) {
        console.error("❌ Erreur game:start:", error);
        socket.emit("game:error", {
          message: "Erreur au démarrage du jeu.",
        });
        if (activeSessions.has(userId)) {
          activeSessions.delete(userId);
        }
      } finally {
        socket.isStartingGame = false;
      }
    });

    // =========================================
    // ÉVÉNEMENT:  Cash Out
    // =========================================
    socket.on("game:cashout", async () => {
      const gameSession = activeSessions.get(socket.userId);
      if (!gameSession) {
        socket.emit("game:error", { message: "Aucune partie en cours." });
        return;
      }

      try {
        const result = await gameSession.cashOut();
        if (result && result.success) {
          activeSessions.delete(socket.userId);
        } else if (result && result.message) {
          socket.emit("game:error", { message: result.message });
        }
      } catch (error) {
        console.error("❌ Erreur cashOut:", error);
        socket.emit("game:error", {
          message: "Erreur lors de la tentative de retrait.",
        });
        activeSessions.delete(socket.userId);
      }
    });

    // =========================================
    // ÉVÉNEMENT: Collision
    // =========================================
    socket.on("game:collision", async (data) => {
      const gameSession = activeSessions.get(socket.userId);

      if (!gameSession) return;

      try {
        await gameSession.handleCollision(data.finalMultiplier);
        activeSessions.delete(socket.userId);
      } catch (error) {
        console.error("❌ Erreur game:collision:", error);
        activeSessions.delete(socket.userId);
      }
    });

    // =========================================
    // ÉVÉNEMENT: Déconnexion
    // =========================================
    socket.on("disconnect", async () => {
      console.log(`❌ Client déconnecté:  ${socket.userId}`);

      const gameSession = activeSessions.get(socket.userId);
      if (gameSession) {
        const shouldCleanUp = await gameSession.handleDisconnect();

        if (shouldCleanUp) {
          activeSessions.delete(socket.userId);
          console.log(`🧹 Session de jeu ${gameSession.gameId} nettoyée. `);
        }
      }
    });
  });
};
