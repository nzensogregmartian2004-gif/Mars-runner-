// =======================================================================
// FRONTEND SOCKET.IO - script.js (VERSION CORRIGÉE - ORDRE VARIABLES)
// =======================================================================

// ========================================
// 1. CONFIGURATION GLOBALE
// ========================================

const API_BASE_URL = "https://mars-runner-backend.onrender.com/api";
const SOCKET_URL = "https://mars-runner-backend.onrender.com";
const USE_BACKEND = true;

// ========================================
// 2. VARIABLES GLOBALES
// ========================================
let selectedPaymentMethod = null;
let socket = null;
let isConnectedToSocket = false;
let authToken = null;

let canvas, ctx;
let gameLoop = null;
const notificationContainer = document.getElementById("notificationContainer");
let backgroundMusic, gameOverSound;

let currentGameId = null;
let balance = 5;
let gameState = "menu";
let multiplier = 1.0;
let betAmount = 1;
let canWithdraw = false;
let highScore = 0;
let potentialWin = 0;
let collisionDetected = false;
let velocity = 0;
let legAnimation = 0;
// NOUVELLES VARIABLES ANTI-SPAM
let isStartingGame = false;
let startGameCooldown = false;
let lastStartGameAttempt = 0;
let isGameEnding = false;
let gameEndTimeout = null;

// 🔥 CORRECTION : Déclarer isMobile EN PREMIER (avant toute utilisation)
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768;

// 🔥 CORRECTION : Déclarer myReferralCode AVANT updateUserInfo
let myReferralCode = "";
let newPlayerBonus = 5;
let sponsorBonus = 2;
let isNewPlayerBonusLocked = false;
let affiliatedUsers = [];

// ✅ MAINTENANT on peut utiliser isMobile dans les constantes
const GRAVITY = isMobile ? 0.48 : 0.5;
const JUMP_FORCE = isMobile ? -11.9 : -11;

// CALIBRATION GAMING (utilise isMobile)
const BASE_SPEED = isMobile ? 4 : 4.2;
const SPEED_INCREMENT = isMobile ? 0.0014 : 0.0015;
let gameSpeed = BASE_SPEED;
let obstacles = [];
let backgroundObjects = [];
let score = 0;
const MIN_CASHOUT_MULTIPLIER = 1.5;
let lastObstacleTime = 0;

// ESPACEMENT DYNAMIQUE (utilise isMobile)
const MIN_GAP = isMobile ? 250 : 230;
const MAX_GAP = isMobile ? 500 : 480;
const GAP_COEFFICIENT = isMobile ? 13 : 14;
const frameInterval = 1000 / 60;

// FLUCTUATION VITESSE
const MAX_SPEED_FACTOR = 1.9;
const MIN_SPEED_FACTOR = 0.9;
const FLUCTUATION_DURATION = 100;
let speedFluctuationTimer = 0;
let targetGameSpeed = BASE_SPEED;
let speedEffectDuration = 0;

// VARIABLES CANVAS
let martianY = 320;
let martianX = 100;
let MARTIAN_SIZE = isMobile ? 45 : 50;
let GROUND_Y = isMobile ? 260 : 320;
let displayScale = 1.0;
const PORTRAIT_SCALE = 0.7;
let cameraOffsetX = 0;
// ========================================
// 3. INITIALISATION
// ========================================

function initAudio() {
  try {
    backgroundMusic = new Audio("assets/background_music.mp3");
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.3;
    backgroundMusic.onerror = () =>
      console.warn("⚠️ Fichier background_music.mp3 introuvable");
  } catch (e) {
    console.warn("⚠️ Impossible de charger background_music.mp3");
  }

  try {
    gameOverSound = new Audio("assets/game_over_sound.mp3");
    gameOverSound.volume = 0.8;
    gameOverSound.onerror = () =>
      console.warn("⚠️ Fichier game_over_sound.mp3 introuvable");
  } catch (e) {
    console.warn("⚠️ Impossible de charger game_over_sound.mp3");
  }
}

// ========================================
// setupCanvas() - VERSION OPTIMISÉE PORTRAIT
// ========================================
function setupCanvas() {
  canvas = document.getElementById("gameCanvas");
  if (!canvas) {
    console.error("❌ Canvas non trouvé !");
    return;
  }

  ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("❌ Context 2D non disponible !");
    return;
  }

  // --- REMPLACER la fonction resizeCanvas() DANS setupCanvas() PAR CETTE VERSION ---
  function resizeCanvas() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const isLandscape = windowWidth > windowHeight;

    // Détection portrait mobile pour appliquer dézoom
    if (isMobile && !isLandscape) {
      displayScale = PORTRAIT_SCALE;
      // canvas plus large en portrait mais reste adapté
      canvas.width = Math.min(windowWidth * 0.96, 450);
      canvas.height = Math.min(windowHeight * 0.6, 700);
      martianX = canvas.width * 0.2;
      cameraOffsetX = canvas.width * 0.12;
    } else if (isMobile && isLandscape) {
      displayScale = 1.0; // on annule le dézoom en paysage
      canvas.width = Math.min(windowWidth * 0.95, 900);
      canvas.height = Math.min(windowHeight * 0.65, 350);
      martianX = 120;
      cameraOffsetX = 0;
    } else {
      displayScale = 1.0;
      canvas.width = 900;
      canvas.height = 450;
      martianX = 100;
      cameraOffsetX = 0;
    }

    // GROUND_Y et MARTIAN_SIZE tiennent compte de displayScale
    GROUND_Y = canvas.height - Math.floor(80 * displayScale);
    MARTIAN_SIZE = Math.max(35, Math.floor((canvas.width / 18) * displayScale));

    // Pour éviter incohérences après rotation/resize, on réinitialise obstacles visibles
    obstacles = [];
    backgroundObjects = [];
    lastObstacleTime = Date.now();
    score = 0;

    if (gameState === "menu" || gameState === "gameover") {
      martianY = GROUND_Y;
    }

    console.log(
      "📐 Canvas:",
      canvas.width,
      "x",
      canvas.height,
      "| martianX:",
      martianX,
      "| martianSize:",
      MARTIAN_SIZE,
      "| cameraOffsetX:",
      cameraOffsetX,
      "| displayScale:",
      displayScale
    );
  }
}

window.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Initialisation de l'application");

  initAudio();
  generateStars();
  setupCanvas();
  drawGame();

  if (typeof io === "undefined") {
    console.error("❌ Socket.IO n'est pas chargé !");
  } else {
    console.log("✅ Socket.IO chargé");
  }

  authToken = localStorage.getItem("authToken");
  if (authToken) {
    connectSocket();
    showGameInterface();
  } else {
    showLogin(); // AFFICHER LOGIN AU DÉMARRAGE
  }

  // Empêcher soumission par défaut
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleLogin(e);
    });
  }
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleRegister();
    });
  }
  const forgotForm = document.getElementById("forgotForm");
  if (forgotForm) {
    forgotForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleForgot();
    });
  }

  window.addEventListener("resize", () => {
    if (window.__resizeGameCanvas) window.__resizeGameCanvas();
    drawGame();
  });

  window.addEventListener("orientationchange", () => {
    setTimeout(() => {
      if (window.__resizeGameCanvas) window.__resizeGameCanvas();
      drawGame();
    }, 100);
  });
});

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && gameState === "playing") {
    e.preventDefault();
    jump();
  }
});

const gameCanvasElement = document.getElementById("gameCanvas");
if (gameCanvasElement) {
  gameCanvasElement.addEventListener("click", () => {
    if (gameState === "playing") jump();
  });

  gameCanvasElement.addEventListener(
    "touchstart",
    (e) => {
      if (gameState === "playing") {
        e.preventDefault();
        jump();
      }
    },
    { passive: false }
  );
}

// ========================================
// 4. SOCKET.IO (AVEC GESTION D'ERREURS)
// ========================================

function connectSocket() {
  authToken = localStorage.getItem("authToken");

  if (!authToken || typeof io === "undefined") {
    console.warn("⛔ Token ou Socket.IO indisponible");
    return;
  }

  console.log("🔌 Tentative de connexion Socket.IO...");

  if (socket) {
    if (socket.connected) return;
    socket.auth = { token: authToken };
    socket.connect();
    return;
  }

  socket = io(SOCKET_URL, {
    auth: { token: authToken },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    isConnectedToSocket = true;
    console.log("✅ Socket connecté:", socket.id);
    socket.emit("user:getProfile");
    socket.emit("wallet:getBalance");
    socket.emit("referral:getInfo");
  });

  socket.on("disconnect", (reason) => {
    isConnectedToSocket = false;
    console.log("❌ Socket déconnecté:", reason);

    // RÉINITIALISER LES FLAGS ANTI-SPAM
    isStartingGame = false;
    startGameCooldown = false;

    if (gameState === "playing" || gameState === "waiting") {
      showGameOverScreen(false, 0, "Déconnexion serveur. Partie annulée.");
    }
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Erreur connexion Socket.IO:", error);
    showNotification("Erreur de connexion au serveur", "error");

    // RÉINITIALISER EN CAS D'ERREUR
    isStartingGame = false;
    startGameCooldown = false;
  });

  // Gestion événement game:started
  socket.on("game:started", (data) => {
    console.log("🎮 Partie démarrée - Data:", data);

    if (!data) {
      console.error("❌ Données game:started manquantes");
      showNotification("Erreur démarrage partie", "error");
      isStartingGame = false;
      resetPlayButton();
      return;
    }

    // Éviter les démarrages multiples
    if (gameState === "playing") {
      console.warn("⚠️ Partie déjà en cours, ignoring duplicate start");
      return;
    }

    currentGameId = data.gameId;
    balance = parseFloat(data.balance || balance || 0);
    multiplier = 1.0;
    gameState = "playing";
    canWithdraw = false;
    collisionDetected = false;
    isGameEnding = false;

    // Débloquer APRÈS succès
    isStartingGame = false;

    updateBalance();
    showNotification("Partie démarrée! Bonne chance.", "success");

    const actionButtons = document.getElementById("actionButtons");
    if (actionButtons) {
      actionButtons.innerHTML = `
      <button class="btn-jump" onclick="jump()">⬆️ Sauter</button>
      <button class="btn-cashout" id="btnCashout" onclick="cashOut()" disabled>💰 Retirer</button>
    `;
    }

    const multOverlay = document.getElementById("multiplierOverlay");
    if (multOverlay) multOverlay.classList.remove("hidden");
    const minWarn = document.getElementById("minWarning");
    if (minWarn) minWarn.classList.remove("hidden");

    // Petit délai avant de lancer la loop locale (évite race conditions)
    setTimeout(() => {
      if (gameState === "playing") {
        startLocalGameLoop();
      }
    }, 150);
  });

  // game:progress
  socket.on("game:progress", (data) => {
    if (gameState !== "playing" && gameState !== "waiting") return;
    if (!data) return;

    multiplier = parseFloat(data.multiplier || 1.0);
    potentialWin = parseFloat(betAmount * multiplier);

    if (multiplier >= MIN_CASHOUT_MULTIPLIER && !canWithdraw) {
      canWithdraw = true;
      const cashoutBtn = document.getElementById("btnCashout");
      if (cashoutBtn) cashoutBtn.disabled = false;
      const minWarning = document.getElementById("minWarning");
      if (minWarning) minWarning.classList.add("hidden");
    }

    updateMultiplierDisplay();
  });

  socket.on("game:cashedOut", (data) => {
    console.log("💰 Cash Out réussi:", data);
    if (!data) return;

    if (isGameEnding) {
      console.warn("⚠️ Cash out déjà en cours de traitement");
      return;
    }
    isGameEnding = true;

    const winAmount = parseFloat(data.winAmount || 0);
    balance = parseFloat(data.balance || balance || 0);
    isNewPlayerBonusLocked = false;

    updateBalance();

    setTimeout(() => {
      showGameOverScreen(true, winAmount);
      isGameEnding = false;
    }, 300);
  });

  socket.on("game:over", (data) => {
    console.log("📊 Game Over:", data);

    if (isGameEnding) {
      console.warn("⚠️ Game over déjà en cours de traitement");
      return;
    }
    isGameEnding = true;

    let finalBalance = balance;
    if (data) {
      finalBalance = parseFloat(
        data.balance || data.balance_mz || balance || 0
      );
    }

    balance = finalBalance;
    isNewPlayerBonusLocked = false;
    updateBalance();

    setTimeout(() => {
      showGameOverScreen(false, 0);
      isGameEnding = false;
    }, 300);
  });

  socket.on("game:error", (data) => {
    console.error("❌ Erreur de jeu:", data);
    const message = data?.message || "Erreur inconnue";
    showNotification(message, "error");

    // DÉBLOQUER LE BOUTON EN CAS D'ERREUR
    isStartingGame = false;
    resetPlayButton();

    if (gameState === "playing" || gameState === "waiting") {
      showGameOverScreen(false, 0, message);
    }
  });

  // À ajouter dans socket.on("wallet:balance")
  socket.on("wallet:balance", (data) => {
    if (!data) return;

    const newBalance = parseFloat(
      data.balance || data.balance_mz || balance || 0
    );

    // 🔥 CORRECTION : Arrondir avant de comparer
    const roundedNewBalance = Math.round(newBalance * 100) / 100;

    if (roundedNewBalance >= 0) {
      balance = roundedNewBalance;
      updateBalance();

      // Afficher notification si balance = 0
      if (balance === 0) {
        showNotification(
          "⚠️ Votre balance est à 0. Effectuez un dépôt pour continuer.",
          "warning"
        );
      }
    }
  });

  socket.on("referral:info", (data) => {
    console.log("🎯 Données de parrainage reçues:", data);
    if (!data) return;

    // Extraire le code de parrainage
    myReferralCode = data.referralCode || data.referral_code || "";
    console.log("✅ Code parrainage:", myReferralCode);

    // Extraire les affiliés (supporter les deux formats)
    if (data.affiliatedUsers && Array.isArray(data.affiliatedUsers)) {
      affiliatedUsers = data.affiliatedUsers;
    } else if (data.affiliated_users && Array.isArray(data.affiliated_users)) {
      affiliatedUsers = data.affiliated_users;
    } else {
      affiliatedUsers = [];
    }

    console.log("✅ Affiliés reçus:", affiliatedUsers.length, affiliatedUsers);

    // 🔥 IMPORTANT : Rafraîchir l'affichage si le modal est ouvert
    const modal = document.getElementById("referralModal");
    if (modal && modal.style.display === "flex") {
      updateReferralModalContent();
    }
  });

  socket.on("user:info", (data) => {
    console.log("👤 Infos utilisateur:", data);
    if (!data) return;

    if (data.balance !== undefined && data.balance !== null) {
      balance = parseFloat(data.balance);
    }

    isNewPlayerBonusLocked =
      data.new_player_bonus_locked !== undefined
        ? data.new_player_bonus_locked
        : isNewPlayerBonusLocked;
    updateBalance();
    updateUserInfo(data);
  });

  socket.on("deposit:confirmed", (data) => {
    if (!data) return;
    balance = parseFloat(data.balance || balance);
    updateBalance();
    showNotification(
      `✅ Dépôt confirmé! ${data.amount} MZ ajoutés.`,
      "success"
    );
  });

  socket.on("withdrawal:confirmed", (data) => {
    if (!data) return;
    showNotification(
      `✅ Retrait effectué! ${data.amount} MZ envoyés.`,
      "success"
    );
  });

  socket.on("withdrawal:rejected", (data) => {
    if (!data) return;
    balance = parseFloat(data.balance || balance);
    updateBalance();
    showNotification(`❌ Retrait refusé: ${data.reason}`, "error");
  });

  socket.on("referral:code", (data) => {
    console.log("🎯 Code de parrainage reçu:", data);
    if (data && (data.referralCode || data.referral_code)) {
      myReferralCode = data.referralCode || data.referral_code;
    }
  });

  socket.on("referral:stats", (data) => {
    console.log("📊 Stats de parrainage:", data);
  });

  socket.on("referral:error", (data) => {
    console.error("❌ Erreur parrainage:", data);
    showNotification(data.message || "Erreur de parrainage", "error");
  });
}

function disconnectSocket() {
  if (socket && socket.connected) {
    socket.disconnect();
    isConnectedToSocket = false;
    socket = null;
    console.log("🔌 Socket déconnecté manuellement.");
  }
}

// ========================================
// 5. GESTION DU JEU
// ========================================

/**
 * startGame() avec protection complète
 */
function startGame() {
  if (gameState === "playing" || gameState === "waiting") {
    console.warn("⚠️ Une partie est déjà en cours");
    showNotification("Une partie est déjà en cours", "warning");
    return;
  }

  if (isGameEnding) {
    console.warn("⚠️ Partie précédente en cours de finalisation");
    showNotification("Finalisation en cours, veuillez patienter...", "warning");
    return;
  }

  if (isStartingGame) {
    console.warn("⚠️ Démarrage déjà en cours");
    return;
  }

  const now = Date.now();
  if (startGameCooldown && now - lastStartGameAttempt < 2000) {
    const remainingTime = Math.ceil(
      (2000 - (now - lastStartGameAttempt)) / 1000
    );
    console.warn(`⏳ Cooldown actif: ${remainingTime}s`);
    showNotification(`Attendez ${remainingTime}s avant de rejouer`, "warning");
    return;
  }

  const betInputElement = document.getElementById("betInput");
  betAmount = Math.max(1, parseFloat(betInputElement?.value || 1));

  if (betAmount > balance) {
    showNotification("Solde insuffisant!", "error");
    return;
  }

  if (!isConnectedToSocket || !socket) {
    showNotification("Connexion au serveur requise.", "warning");
    connectSocket();
    return;
  }

  isStartingGame = true;
  startGameCooldown = true;
  lastStartGameAttempt = now;

  console.log("🎮 Lancement de la partie - Mise:", betAmount, "MZ");

  disablePlayButton();
  // 🔥 ENVOYER la plateforme au backend
  socket.emit("game:start", {
    betAmount,
    platform: isMobile ? "mobile" : "desktop", // ✅ AJOUT
  });

  // TIMEOUT DE SÉCURITÉ : 8 secondes
  if (gameEndTimeout) {
    clearTimeout(gameEndTimeout);
    gameEndTimeout = null;
  }
  gameEndTimeout = setTimeout(() => {
    if (gameState === "waiting") {
      console.error("⏰ Timeout: Pas de réponse du serveur");
      showNotification("Le serveur ne répond pas. Réessayez.", "error");
      isStartingGame = false;
      isGameEnding = false;
      gameState = "menu";
      resetPlayButton();
    }
  }, 8000);

  gameState = "waiting";
  multiplier = 1.0;
  potentialWin = 0;
  canWithdraw = false;
  collisionDetected = false;
}

/**
 * Désactiver visuellement le bouton "Jouer"
 */
function disablePlayButton() {
  const btnPlay = document.getElementById("btnPlay");
  if (btnPlay) {
    btnPlay.disabled = true;
    btnPlay.textContent = "⏳ Démarrage...";
    btnPlay.style.opacity = "0.5";
    btnPlay.style.cursor = "not-allowed";
  }
}

/**
 * Réactiver le bouton "Jouer"
 */
function resetPlayButton() {
  const btnPlay = document.getElementById("btnPlay");
  if (btnPlay) {
    btnPlay.disabled = false;
    btnPlay.textContent = `🚀 Jouer (${betAmount} MZ)`;
    btnPlay.style.opacity = "1";
    btnPlay.style.cursor = "pointer";
  }
}

function startLocalGameLoop() {
  console.log(
    "🎮 Démarrage jeu - GROUND_Y:",
    GROUND_Y,
    "| martianY:",
    martianY,
    "| MARTIAN_SIZE:",
    MARTIAN_SIZE
  );
  martianY = GROUND_Y;
  velocity = 0;
  obstacles = [];
  backgroundObjects = [];
  score = 0;
  gameSpeed = BASE_SPEED;
  targetGameSpeed = BASE_SPEED;
  speedFluctuationTimer = 0;
  speedEffectDuration = 0;
  legAnimation = 0;
  lastObstacleTime = Date.now();

  let lastTime = Date.now();

  const gameLoopFunction = () => {
    if (gameState !== "playing" && gameState !== "waiting") {
      if (gameLoop) {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
      }
      return;
    }

    const currentTime = Date.now();
    const deltaTime = (currentTime - lastTime) / frameInterval;
    lastTime = currentTime;

    updateGameLogic(deltaTime, currentTime);

    if (checkCollision()) {
      if (!collisionDetected) {
        collisionDetected = true;

        if (gameLoop) {
          cancelAnimationFrame(gameLoop);
          gameLoop = null;
        }

        if (socket && isConnectedToSocket && currentGameId) {
          socket.emit("game:collision", {
            gameId: currentGameId,
            finalMultiplier: multiplier.toFixed(2),
          });
        }

        showGameOverScreen(false, 0);
      }
      return;
    }

    if (gameState === "playing" && !collisionDetected) {
      score++;
      const scoreDisplay = document.getElementById("scoreDisplay");
      if (scoreDisplay) scoreDisplay.textContent = score;
    }

    drawGame();
    gameLoop = requestAnimationFrame(gameLoopFunction);
  };

  gameLoop = requestAnimationFrame(gameLoopFunction);
}

function updateGameLogic(deltaTime, currentTime) {
  legAnimation += 0.3 * (gameSpeed / BASE_SPEED) * deltaTime;
  if (legAnimation >= Math.PI * 2) legAnimation = 0;

  velocity += GRAVITY * deltaTime;
  martianY += velocity * deltaTime;
  if (martianY > GROUND_Y) {
    martianY = GROUND_Y;
    velocity = 0;
  }

  generateBackgroundObjects(deltaTime);
  handleObstacleGeneration(deltaTime, currentTime);
  handleObstacleMovement(deltaTime);
}

function generateBackgroundObjects(deltaTime) {
  if (Math.random() < 0.005 * deltaTime) {
    const types = ["ovni", "meteorite", "etoile", "satellite"];
    const type = types[Math.floor(Math.random() * types.length)];
    backgroundObjects.push({
      x: canvas.width + cameraOffsetX,
      y: Math.random() * (GROUND_Y - 100),
      type: type,
      speed: 2 + Math.random() * 1.5,
      size: 20 + Math.random() * 20,
    });
  }

  backgroundObjects = backgroundObjects
    .map((obj) => ({ ...obj, x: obj.x - obj.speed * deltaTime }))
    .filter((obj) => obj.x > -100 - cameraOffsetX);
}

function handleObstacleGeneration(deltaTime, currentTime) {
  targetGameSpeed += SPEED_INCREMENT * deltaTime;

  if (speedFluctuationTimer <= 0) {
    const randomFactor =
      MIN_SPEED_FACTOR + Math.random() * (MAX_SPEED_FACTOR - MIN_SPEED_FACTOR);
    gameSpeed = targetGameSpeed * randomFactor;
    speedFluctuationTimer = Math.floor(
      FLUCTUATION_DURATION * (0.8 + Math.random() * 0.4)
    );
  } else {
    speedFluctuationTimer -= deltaTime;
  }

  if (speedEffectDuration > 0) {
    gameSpeed = Math.min(gameSpeed, BASE_SPEED * 0.65);
    speedEffectDuration -= deltaTime;
  }

  const MIN_GAP_CURRENT = Math.max(
    MIN_GAP,
    MAX_GAP - gameSpeed * GAP_COEFFICIENT
  );
  const timeSinceLastObstacle = currentTime - lastObstacleTime;
  const requiredTime = Math.max(
    1200,
    (MIN_GAP_CURRENT / gameSpeed) * frameInterval
  );

  const MAX_OBSTACLES = 5;

  if (obstacles.length >= MAX_OBSTACLES) return;

  if (obstacles.length > 0) {
    const lastObstacle = obstacles[obstacles.length - 1];
    const distanceFromEdge = canvas.width + cameraOffsetX - lastObstacle.x;
    const MIN_DISTANCE_TO_SPAWN = 150 * displayScale;

    if (distanceFromEdge < MIN_DISTANCE_TO_SPAWN) return;
  }

  if (timeSinceLastObstacle < requiredTime) return;

  const obstacleWeights = isMobile
    ? {
        // 🔥 Mobile : moins d'obstacles difficiles
        rock: 55, // +33%
        robot: 55, // +17%
        flyingAlien: 45, // -10%
        highDrone: 25, // -33%
        proximityMine: 35, // -17%
        fastMeteor: 35, // -33%
        doubleDanger: 5, // -50%
        rollingBall: 10, // -50%
      }
    : {
        // Desktop : équilibré
        rock: 45,
        robot: 45,
        flyingAlien: 50,
        highDrone: 35,
        proximityMine: 35,
        fastMeteor: 35,
        doubleDanger: 25,
        rollingBall: 25,
      };

  const totalWeight = Object.values(obstacleWeights).reduce((a, b) => a + b, 0);
  let randomWeight = Math.random() * totalWeight;
  let cumulativeWeight = 0;
  let type = "rock";

  for (const [obsType, weight] of Object.entries(obstacleWeights)) {
    cumulativeWeight += weight;
    if (randomWeight < cumulativeWeight) {
      type = obsType;
      break;
    }
  }

  let newObstacles = [];
  const obstacleX = canvas.width + cameraOffsetX;

  if (type === "doubleDanger") {
    const gap = Math.floor(45 * displayScale);
    const obs1 = createObstacle(
      "rock",
      obstacleX,
      GROUND_Y,
      Math.floor(32 * displayScale),
      Math.floor(32 * displayScale)
    );
    const obs2 = createObstacle(
      "robot",
      obstacleX + obs1.width + gap,
      GROUND_Y,
      Math.floor(32 * displayScale),
      Math.floor(32 * displayScale)
    );
    newObstacles.push(obs1, obs2);
  } else if (type === "rollingBall") {
    const initialSize = Math.floor(65 * displayScale);
    const ball = createObstacle(
      "rollingBall",
      obstacleX,
      GROUND_Y + MARTIAN_SIZE - initialSize,
      initialSize,
      initialSize
    );
    ball.minSize = Math.floor(45 * displayScale);
    ball.maxSize = Math.floor(95 * displayScale);
    ball.targetSize = ball.maxSize;
    ball.sizeChangeRate = 1.2;
    newObstacles.push(ball);
  } else if (type === "proximityMine") {
    newObstacles.push(
      createObstacle(
        "proximityMine",
        obstacleX,
        GROUND_Y + Math.floor(8 * displayScale),
        Math.floor(24 * displayScale),
        Math.floor(22 * displayScale)
      )
    );
  } else if (type === "fastMeteor") {
    newObstacles.push(
      createObstacle(
        "fastMeteor",
        obstacleX,
        Math.floor(10 * displayScale),
        Math.floor(36 * displayScale),
        Math.floor(36 * displayScale)
      )
    );
  } else if (type === "highDrone") {
    const highTrapY =
      GROUND_Y -
      Math.floor(165 * displayScale) -
      Math.random() * (15 * displayScale);
    newObstacles.push(
      createObstacle(
        "highDrone",
        obstacleX,
        Math.floor(highTrapY),
        Math.floor(42 * displayScale),
        Math.floor(16 * displayScale)
      )
    );
  } else if (type === "flyingAlien") {
    const flyingY =
      GROUND_Y -
      Math.floor(45 * displayScale) -
      Math.random() * (35 * displayScale);
    newObstacles.push(
      createObstacle(
        "flyingAlien",
        obstacleX,
        Math.floor(flyingY),
        Math.floor(32 * displayScale),
        Math.floor(32 * displayScale)
      )
    );
  } else {
    newObstacles.push(
      createObstacle(
        type,
        obstacleX,
        GROUND_Y,
        Math.floor(32 * displayScale),
        Math.floor(32 * displayScale)
      )
    );
  }

  obstacles.push(...newObstacles);
  lastObstacleTime = currentTime;
}

function handleObstacleMovement(deltaTime) {
  obstacles = obstacles
    .map((obs) => {
      obs.speed = gameSpeed;
      obs.x -= gameSpeed * deltaTime;

      if (obs.isFalling) {
        obs.fallVelocity += 0.45 * deltaTime;
        obs.y += obs.fallVelocity * deltaTime;
        if (obs.y + obs.height > GROUND_Y + MARTIAN_SIZE) {
          obs.y = GROUND_Y + MARTIAN_SIZE - obs.height;
          obs.isFalling = false;
        }
      }

      if (obs.type === "rollingBall") {
        const currentSize = obs.width;
        if (currentSize < obs.targetSize) {
          obs.width = Math.min(
            obs.targetSize,
            currentSize + obs.sizeChangeRate * deltaTime
          );
          obs.height = obs.width;
        } else if (currentSize > obs.targetSize) {
          obs.width = Math.max(
            obs.targetSize,
            currentSize - obs.sizeChangeRate * deltaTime
          );
          obs.height = obs.width;
        }

        if (Math.abs(obs.width - obs.targetSize) < 1) {
          obs.targetSize =
            obs.targetSize === obs.maxSize ? obs.minSize : obs.maxSize;
        }

        obs.y = GROUND_Y + MARTIAN_SIZE - obs.height;
      }

      return obs;
    })
    .filter((obs) => obs.x > -50 - cameraOffsetX);
}

function checkCollision() {
  if (collisionDetected) return false;

  const martianRight = martianX + MARTIAN_SIZE;
  const martianBottom = martianY + MARTIAN_SIZE;

  // 🔥 CORRECTION : Tolérance adaptée à la plateforme
  const hitboxTolerance = isMobile
    ? Math.max(8, Math.floor(10 * displayScale)) // Mobile : +40% tolérance
    : Math.max(4, Math.floor(6 * displayScale));

  const proximityRangeBase = isMobile ? 65 : 55; // Mobile : +18% détection mine
  const proximityRange = Math.max(
    30,
    Math.floor(proximityRangeBase * displayScale)
  );

  for (let obs of obstacles) {
    const obsScreenX = obs.x - cameraOffsetX;
    const obsRight = obsScreenX + obs.width;
    const obsBottom = obs.y + obs.height;

    const isContactCollision =
      martianRight - hitboxTolerance > obsScreenX &&
      martianX + hitboxTolerance < obsRight &&
      martianBottom - hitboxTolerance > obs.y &&
      martianY + hitboxTolerance < obsBottom;

    if (isContactCollision) {
      return true;
    }

    if (obs.type === "proximityMine" && !obs.hit) {
      const isNearProximity =
        martianRight > obsScreenX - proximityRange &&
        martianX < obsRight + proximityRange &&
        martianBottom > obs.y - proximityRange &&
        martianY < obsBottom + proximityRange;

      if (isNearProximity && martianRight > obsScreenX) {
        speedEffectDuration = isMobile ? 120 : 95; // Mobile : +26% temps ralenti
        obs.hit = true;
      }
    }
  }

  return false;
}

function stopGame() {
  if (gameLoop) {
    cancelAnimationFrame(gameLoop);
    gameLoop = null;
  }
}

function showGameOverScreen(isWin, winAmount, notificationMessage = null) {
  if (gameEndTimeout) {
    clearTimeout(gameEndTimeout);
    gameEndTimeout = null;
  }

  stopGame();
  gameState = "gameover";

  if (backgroundMusic) backgroundMusic.pause();

  if (!isWin && gameOverSound) {
    gameOverSound.currentTime = 0;
    gameOverSound.play().catch((e) => console.log("Erreur son:", e));
  }

  if (multiplier > highScore) {
    highScore = multiplier;
    const highScoreDisplay = document.getElementById("highScoreDisplay");
    if (highScoreDisplay)
      highScoreDisplay.textContent = "x" + highScore.toFixed(2);
  }

  const actionButtons = document.getElementById("actionButtons");
  if (actionButtons) {
    actionButtons.innerHTML = `
      <button class="btn-replay" onclick="replayGame()">🔄 Rejouer</button>
    `;
  }

  const multOverlay = document.getElementById("multiplierOverlay");
  if (multOverlay) multOverlay.classList.add("hidden");
  const minWarn = document.getElementById("minWarning");
  if (minWarn) minWarn.classList.add("hidden");

  if (notificationMessage) {
    showNotification(notificationMessage, "error");
  } else if (isWin) {
    showNotification(
      `🎉 VICTOIRE! Multiplicateur x${multiplier.toFixed(
        2
      )}, vous avez gagné ${winAmount.toFixed(2)} MZ!`,
      "success"
    );
  } else {
    showNotification(
      `💀 GAME OVER! Multiplicateur atteint: x${multiplier.toFixed(2)}`,
      "error"
    );
  }

  setTimeout(() => {
    gameState = "menu";
    currentGameId = null;
    isStartingGame = false;
    startGameCooldown = false;
    isGameEnding = false;
  }, 1500);

  drawGame();
}

function replayGame() {
  if (gameState === "playing" || gameState === "waiting" || isGameEnding) {
    console.warn("⚠️ Impossible de rejouer maintenant");
    showNotification("Veuillez patienter...", "warning");
    return;
  }

  gameState = "menu";
  multiplier = 1.0;
  potentialWin = 0;
  collisionDetected = false;
  canWithdraw = false;

  startGameCooldown = false;
  isStartingGame = false;
  isGameEnding = false;

  const multDisplay = document.getElementById("multiplierDisplay");
  if (multDisplay) multDisplay.textContent = "x1.000";
  const potDisplay = document.getElementById("potentialWin");
  if (potDisplay) potDisplay.textContent = "0.00";
  const scoreDisplay = document.getElementById("scoreDisplay");
  if (scoreDisplay) scoreDisplay.textContent = "0";

  const actionButtons = document.getElementById("actionButtons");
  if (actionButtons) {
    actionButtons.innerHTML = `
      <button class="btn-play" id="btnPlay" onclick="startGame()">🚀 Jouer (${betAmount} MZ)</button>
    `;
  }

  if (backgroundMusic && backgroundMusic.paused) {
    backgroundMusic.currentTime = 0;
    backgroundMusic.play().catch((e) => console.log("Erreur musique:", e));
  }

  drawGame();
}

function jump() {
  if (gameState !== "playing") {
    return;
  }

  if (isGameEnding || collisionDetected) {
    return;
  }

  if (martianY >= GROUND_Y - 5) {
    velocity = JUMP_FORCE;
  }
}

// Gestion du touch global améliorée
function globalTouchHandler(e) {
  if (gameState !== "playing") {
    return;
  }

  if (isGameEnding || collisionDetected) {
    return;
  }

  if (e.target.tagName === "BUTTON" || e.target.closest("button")) {
    return;
  }

  jump();

  if (e.cancelable) e.preventDefault();
}

window.addEventListener("touchstart", globalTouchHandler, { passive: false });

// ========================================
// 6. INTERFACE
// ========================================

function showNotification(message, type = "info") {
  if (!notificationContainer) return;

  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  notificationContainer.appendChild(notification);

  setTimeout(() => notification.classList.add("show"), 10);

  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 500);
  }, 4000);
}

// Affichage multiplicateur compact
function updateMultiplierDisplay() {
  const multDisplay = document.getElementById("multiplierDisplay");
  const overlayMult = document.getElementById("overlayMultiplier");
  const potWin = document.getElementById("potentialWin");

  if (isMobile) {
    if (multDisplay) multDisplay.textContent = "x" + multiplier.toFixed(2);
    if (overlayMult) overlayMult.textContent = "x" + multiplier.toFixed(3);
  } else {
    if (multDisplay) multDisplay.textContent = "x" + multiplier.toFixed(3);
    if (overlayMult) overlayMult.textContent = "x" + multiplier.toFixed(5);
  }

  if (potWin) potWin.textContent = potentialWin.toFixed(2);
}

function debugPortraitMode() {
  if (!isMobile) return;

  const isLandscape = window.innerWidth > window.innerHeight;
  console.log("🎮 MODE:", isLandscape ? "PAYSAGE" : "PORTRAIT");
  console.log("📱 Canvas:", canvas.width, "x", canvas.height);
  console.log("👽 Martien X:", martianX, "| Size:", MARTIAN_SIZE);
  console.log("📷 Camera Offset:", cameraOffsetX);
  console.log("🎯 Ground Y:", GROUND_Y);
  console.log("🚧 Obstacles:", obstacles.length);

  if (obstacles.length > 0) {
    const firstObs = obstacles[0];
    console.log(
      "  → Premier obstacle X:",
      firstObs.x,
      "| Type:",
      firstObs.type
    );
    console.log("  → Position écran:", firstObs.x - cameraOffsetX);
  }
}

// ============================================
// updateBalance()
// ============================================
function updateBalance(data = null) {
  if (data) {
    if (typeof data === "number") {
      balance = parseFloat(data);
    } else if (data.balance !== undefined && data.balance !== null) {
      balance = parseFloat(data.balance);
    } else if (data.balance_mz !== undefined && data.balance_mz !== null) {
      balance = parseFloat(data.balance_mz);
    } else if (data.newBalance !== undefined && data.newBalance !== null) {
      balance = parseFloat(data.newBalance);
    }
  }

  // 🔥 CORRECTION : Accepter 0 comme valeur valide
  if (balance === undefined || balance === null || isNaN(balance)) {
    balance = 0;
  }

  // Forcer conversion en number
  balance = parseFloat(balance) || 0;

  // 🔥 CORRECTION : Toujours mettre à jour l'affichage, même si balance = 0
  const balanceElement = document.getElementById("balance");
  if (balanceElement) {
    balanceElement.textContent = balance.toFixed(2);
  }

  console.log("💰 Balance affichée:", balance);
}

// ============================================
// updateUserInfo()
// ============================================

function updateBalance(data = null) {
  if (data) {
    if (typeof data === "number") {
      balance = parseFloat(data);
    } else if (data.balance !== undefined && data.balance !== null) {
      balance = parseFloat(data.balance);
    } else if (data.balance_mz !== undefined && data.balance_mz !== null) {
      balance = parseFloat(data.balance_mz);
    } else if (data.newBalance !== undefined && data.newBalance !== null) {
      balance = parseFloat(data.newBalance);
    }
  }

  // 🔥 CORRECTION : Gérer les valeurs invalides
  if (balance === undefined || balance === null || isNaN(balance)) {
    balance = 0;
  }

  // 🔥 CORRECTION : Arrondir à 2 décimales pour éviter les erreurs de virgule flottante
  balance = Math.round(parseFloat(balance) * 100) / 100;

  // 🔥 CORRECTION : Forcer à 0 si négatif (sécurité)
  if (balance < 0) {
    console.warn("⚠️ Balance négative détectée, correction à 0");
    balance = 0;
  }

  // Mettre à jour l'affichage
  const balanceElement = document.getElementById("balance");
  if (balanceElement) {
    balanceElement.textContent = balance.toFixed(2);
  }

  console.log("💰 Balance mise à jour:", balance);

  // 🔥 CORRECTION : Désactiver le bouton Jouer si balance insuffisante
  updatePlayButtonState();
}

function showGameInterface() {
  const auth = document.getElementById("authScreen");
  const game = document.getElementById("gameScreen");
  if (auth) auth.style.display = "none";
  if (game) game.style.display = "block";
}

// ========================================
// 7. AUTHENTIFICATION
// ========================================

function showLogin() {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const forgotForm = document.getElementById("forgotForm");
  if (loginForm) loginForm.classList.add("hidden");
  if (registerForm) registerForm.classList.add("hidden");
  if (forgotForm) forgotForm.classList.add("hidden");

  setTimeout(() => {
    if (loginForm) loginForm.classList.remove("hidden");
  }, 50);
}

function showRegister() {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const forgotForm = document.getElementById("forgotForm");
  if (loginForm) loginForm.classList.add("hidden");
  if (registerForm) registerForm.classList.add("hidden");
  if (forgotForm) forgotForm.classList.add("hidden");

  setTimeout(() => {
    if (registerForm) registerForm.classList.remove("hidden");
  }, 50);
}

function showForgot() {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const forgotForm = document.getElementById("forgotForm");
  if (loginForm) loginForm.classList.add("hidden");
  if (registerForm) registerForm.classList.add("hidden");
  if (forgotForm) forgotForm.classList.add("hidden");

  setTimeout(() => {
    if (forgotForm) forgotForm.classList.remove("hidden");
  }, 50);
}

async function handleLogin(event) {
  if (event && event.preventDefault) event.preventDefault();

  try {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    console.log("🔐 Tentative de login:", email);

    const result = await apiCall("/auth/login", "POST", { email, password });
    const data = result.data;

    if (result.success && data && data.token) {
      console.log("✅ Login réussi:", data);

      authToken = data.token;
      localStorage.setItem("authToken", data.token);

      if (data.user && data.user.email) {
        localStorage.setItem("userEmail", data.user.email);
      }

      const serverUser = data.user;
      balance = parseFloat(serverUser.balance_mz || serverUser.balance || 0);

      updateUserInfo(serverUser);
      updateBalance();

      connectSocket();
      showGameInterface();
      showNotification("Connexion réussie!", "success");
    } else {
      throw new Error(result.message || "Erreur de connexion");
    }
  } catch (error) {
    console.error("❌ Erreur login:", error);
    showNotification(error.message || "Erreur de connexion", "error");
  }
}

async function handleRegister() {
  const nom = document.getElementById("regNom")?.value;
  const prenom = document.getElementById("regPrenom")?.value;
  const age = document.getElementById("regAge")?.value;
  const telephone = document.getElementById("regTel")?.value;
  const email = document.getElementById("regEmail")?.value;
  const password = document.getElementById("regPassword")?.value;
  const referralCode = document.getElementById("regReferralCode")?.value;

  if (!nom || !prenom || !age || !telephone || !email || !password) {
    showNotification("Veuillez remplir tous les champs obligatoires", "error");
    return;
  }

  try {
    console.log("🔐 Tentative d'inscription:", { nom, prenom, email });

    const result = await apiCall("/auth/register", "POST", {
      nom,
      prenom,
      age: parseInt(age),
      telephone,
      email,
      password,
      referralCode: referralCode || undefined,
    });

    console.log("🔥 Réponse register:", result);

    if (result.success && result.data && result.data.token) {
      console.log("✅ Inscription réussie:", result.data);

      authToken = result.data.token;
      localStorage.setItem("authToken", result.data.token);

      const userData = result.data.user;
      balance = parseFloat(result.data.balance_mz || 0);
      myReferralCode =
        userData.referral_code || userData.referralCode || myReferralCode;
      isNewPlayerBonusLocked = userData.new_player_bonus_locked !== false;

      console.log("💰 Balance après inscription:", balance);

      updateBalance();
      updateUserInfo(userData);
      showGameInterface();
      connectSocket();

      showNotification(
        `Bienvenue ${prenom}! Vous avez reçu ${balance.toFixed(2)} MZ.`,
        "success"
      );
    } else {
      throw new Error(result.message || "Erreur d'inscription");
    }
  } catch (error) {
    console.error("❌ Erreur inscription:", error);
    showNotification(error.message || "Erreur d'inscription", "error");
  }
}

function handleForgot() {
  const contact = document.getElementById("forgotContact").value;
  if (!contact) {
    showNotification("Email ou numéro de téléphone requis", "error");
    return;
  }
  try {
    showNotification("Un lien de réinitialisation a été envoyé", "success");
    showLogin();
  } catch (error) {
    showNotification(error.message, "error");
  }
}

function logout() {
  localStorage.removeItem("authToken");
  authToken = null;

  disconnectSocket();

  const auth = document.getElementById("authScreen");
  const game = document.getElementById("gameScreen");
  if (auth) auth.style.display = "flex";
  if (game) game.style.display = "none";

  if (gameState === "playing") {
    stopGame();
  }

  balance = 0;
  isNewPlayerBonusLocked = false;
  showNotification("Déconnexion réussie.", "info");

  if (backgroundMusic) {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
  }

  showLogin();
}

// ========================================
// 8. API REST
// ========================================

async function apiCall(endpoint, method = "GET", data = null) {
  if (!USE_BACKEND) {
    return simulateApiCall(endpoint, method, data);
  }

  const token = localStorage.getItem("authToken");

  const options = {
    method: method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (token) {
    options.headers["Authorization"] = `Bearer ${token}`;
  }

  if (data && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(data);
  }

  try {
    console.log(`[API] 📤 ${method} ${endpoint}`);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const result = await response.json();

    console.log(`[API] 🔥 Réponse:`, result);

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("authToken");
        disconnectSocket();
        const auth = document.getElementById("authScreen");
        const game = document.getElementById("gameScreen");
        if (auth) auth.style.display = "flex";
        if (game) game.style.display = "none";
        showLogin();
        showNotification("Session expirée. Reconnectez-vous.", "warning");
      }
      throw new Error(result.message || "Erreur API");
    }

    return result;
  } catch (error) {
    console.error("❌ [API] Erreur:", error);
    throw error;
  }
}

function simulateApiCall(endpoint, method, data) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (endpoint === "/auth/login") {
        resolve({
          success: true,
          data: {
            token: "fake-token-" + Date.now(),
            user: {
              balance: 0,
              referralCode: myReferralCode,
              bonusLocked: false,
              name: "Simulateur",
            },
          },
        });
      } else if (endpoint === "/auth/register") {
        resolve({
          success: true,
          data: {
            token: "fake-token-" + Date.now(),
            user: {
              balance: newPlayerBonus,
              referralCode: myReferralCode,
              bonusLocked: true,
              name: "Nouveau Joueur Simulé",
            },
          },
        });
      } else if (endpoint === "/payment/deposit") {
        // 🔥 CORRIGÉ
        resolve({
          success: true,
          data: {
            depositId: "DEP" + Date.now(),
          },
        });
      } else if (endpoint === "/payment/withdrawal") {
        // 🔥 CORRIGÉ
        resolve({
          success: true,
          data: {
            withdrawalId: "WTH" + Date.now(),
          },
        });
      } else {
        resolve({ success: true, data: {} });
      }
    }, 200);
  });
}

// ========================================
// 9. HELPERS
// ========================================

function createObstacle(type, x, y, width = 35, height = 35) {
  const w = Math.max(8, Math.floor(width * displayScale));
  const h = Math.max(8, Math.floor(height * displayScale));

  return {
    x: x,
    y: y,
    type: type,
    width: w,
    height: h,
    speed: gameSpeed,
    isFalling: type === "fastMeteor",
    fallVelocity: 0,
    hit: false,
    initialY: y,
  };
}

function refreshBalance() {
  if (socket && isConnectedToSocket) {
    socket.emit("wallet:getBalance");
  }
}

// Modals (Deposit, Withdraw, Referral)
function showDepositModal() {
  const modal = document.getElementById("depositModal");
  if (modal) modal.style.display = "flex";
}

function closeDepositModal() {
  const modal = document.getElementById("depositModal");
  if (modal) modal.style.display = "none";
}

function showDepositForm(method) {
  selectedPaymentMethod = method;

  closeDepositModal();

  const title = document.getElementById("depositFormTitle");
  if (title) {
    title.textContent =
      method === "airtel"
        ? "💰 Dépôt via Airtel Money"
        : "💰 Dépôt via Moov Money";
  }

  const userEmail = localStorage.getItem("userEmail") || "";
  if (userEmail) {
    const depositEmailEl = document.getElementById("depositEmail");
    if (depositEmailEl) depositEmailEl.value = userEmail;
  }

  const modal = document.getElementById("depositFormModal");
  if (modal) modal.style.display = "flex";
}

function closeDepositFormModal() {
  const modal = document.getElementById("depositFormModal");
  if (modal) modal.style.display = "none";
  selectedPaymentMethod = null;

  const elems = [
    "depositAmount",
    "depositNom",
    "depositPrenom",
    "depositEmail",
    "depositTelephone",
  ];
  elems.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const displayElement = document.getElementById("depositMZ");
  if (displayElement) displayElement.textContent = "0.00";
}

async function submitDeposit() {
  const amount = parseFloat(document.getElementById("depositAmount").value);
  const nom = document.getElementById("depositNom").value.trim();
  const prenom = document.getElementById("depositPrenom").value.trim();
  const email = document.getElementById("depositEmail").value.trim();
  const telephone = document.getElementById("depositTelephone").value.trim();

  if (!amount || amount < 500) {
    showNotification("Dépôt minimum: 500 FCFA", "error");
    return;
  }

  if (amount > 50000) {
    showNotification("Dépôt maximum: 50000 FCFA", "error");
    return;
  }

  if (!nom || nom.length < 2) {
    showNotification("Veuillez entrer votre nom", "error");
    return;
  }

  if (!prenom || prenom.length < 2) {
    showNotification("Veuillez entrer votre prénom", "error");
    return;
  }

  if (!email || !email.includes("@")) {
    showNotification("Veuillez entrer un email valide", "error");
    return;
  }

  if (!telephone || telephone.length < 8) {
    showNotification("Veuillez entrer un numéro de téléphone valide", "error");
    return;
  }

  if (!selectedPaymentMethod) {
    showNotification("Erreur: moyen de paiement non sélectionné", "error");
    return;
  }

  const mz = amount / 100;

  try {
    // 🔥 CORRECTION: Utiliser /payment/deposit au lieu de /manualpayment/deposit
    const response = await apiCall("/payment/deposit", "POST", {
      amountFcfa: amount,
      amountMz: mz,
      paymentMethod: selectedPaymentMethod,
      nom: nom,
      prenom: prenom,
      email: email,
      telephone: telephone,
    });

    if (!response.success) {
      showNotification(
        response.message || "Erreur lors de la demande",
        "error"
      );
      return;
    }

    console.log("✅ Demande de dépôt enregistrée:", response.data);

    closeDepositFormModal();

    showNotification(
      `✅ Demande de dépôt enregistrée!\n\n` +
        `Montant: ${amount} FCFA (${mz.toFixed(2)} MZ)\n` +
        `Moyen: ${
          selectedPaymentMethod === "airtel" ? "Airtel Money" : "Moov Money"
        }\n` +
        `ID: #${response.data.depositId || "N/A"}\n\n` +
        `📱 Votre demande sera validée par l'administrateur sous 24h`,
      "success"
    );

    selectedPaymentMethod = null;
  } catch (error) {
    console.error("❌ Erreur submitDeposit:", error);
    showNotification(
      "Erreur lors de la demande de dépôt: " + (error.message || error),
      "error"
    );
  }
}
// RETRAIT
function showWithdrawModal() {
  const modal = document.getElementById("withdrawModal");
  if (!modal) return;
  modal.style.display = "flex";

  const withdrawStatusElement = document.getElementById("withdrawStatus");
  if (withdrawStatusElement) {
    if (isNewPlayerBonusLocked) {
      withdrawStatusElement.innerHTML = `
        <div class="info-box bonus-locked">
          ⚠️ Le bonus d'inscription de ${newPlayerBonus} MZ n'est pas encore débloqué.<br>
          Faites une mise pour le valider avant de retirer.
        </div>
      `;
    } else {
      withdrawStatusElement.innerHTML = `
        <div class="info-box bonus-unlocked">
          ✅ Tous les fonds sont retirables.<br>
          <small>💡 Minimum: 10 MZ (1000 FCFA) | Balance: ${balance.toFixed(
            2
          )} MZ</small>
        </div>
      `;
    }
  }
}

function closeWithdrawModal() {
  const modal = document.getElementById("withdrawModal");
  if (modal) modal.style.display = "none";
}

function showWithdrawForm(method) {
  if (isNewPlayerBonusLocked) {
    showNotification(
      "Retrait impossible. Le bonus d'inscription doit être joué par une mise pour débloquer le retrait.",
      "error"
    );
    return;
  }

  selectedPaymentMethod = method;

  closeWithdrawModal();

  const title = document.getElementById("withdrawFormTitle");
  if (title) {
    title.textContent =
      method === "airtel"
        ? "💸 Retrait via Airtel Money"
        : "💸 Retrait via Moov Money";
  }

  const userEmail = localStorage.getItem("userEmail") || "";
  if (userEmail) {
    const withdrawEmail = document.getElementById("withdrawEmail");
    if (withdrawEmail) withdrawEmail.value = userEmail;
  }

  const modal = document.getElementById("withdrawFormModal");
  if (modal) modal.style.display = "flex";
}

function closeWithdrawFormModal() {
  const modal = document.getElementById("withdrawFormModal");
  if (modal) modal.style.display = "none";
  selectedPaymentMethod = null;

  const elems = [
    "withdrawAmount",
    "withdrawNom",
    "withdrawPrenom",
    "withdrawEmail",
    "withdrawTelephone",
  ];
  elems.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const fcfaElement = document.getElementById("withdrawFcfa");
  if (fcfaElement) fcfaElement.textContent = "0";
}

async function submitWithdraw() {
  const amount = parseFloat(document.getElementById("withdrawAmount").value);
  const nom = document.getElementById("withdrawNom").value.trim();
  const prenom = document.getElementById("withdrawPrenom").value.trim();
  const email = document.getElementById("withdrawEmail").value.trim();
  const telephone = document.getElementById("withdrawTelephone").value.trim();

  const fcfa = amount * 100;

  if (!amount || fcfa < 1000) {
    showNotification("Retrait minimum: 1000 FCFA (10 MZ)", "error");
    return;
  }

  if (amount > balance) {
    showNotification("Solde insuffisant", "error");
    return;
  }

  if (!nom || nom.length < 2) {
    showNotification("Veuillez entrer votre nom", "error");
    return;
  }

  if (!prenom || prenom.length < 2) {
    showNotification("Veuillez entrer votre prénom", "error");
    return;
  }

  if (!email || !email.includes("@")) {
    showNotification("Veuillez entrer un email valide", "error");
    return;
  }

  if (!telephone || telephone.length < 8) {
    showNotification("Veuillez entrer un numéro de téléphone valide", "error");
    return;
  }

  if (!selectedPaymentMethod) {
    showNotification("Erreur: moyen de paiement non sélectionné", "error");
    return;
  }

  if (isNewPlayerBonusLocked) {
    showNotification(
      "Retrait impossible. Le bonus d'inscription doit être joué.",
      "error"
    );
    return;
  }

  try {
    console.log("📤 Envoi demande de retrait:", {
      amount,
      paymentMethod: selectedPaymentMethod,
      nom,
      prenom,
      email,
      telephone,
    });

    // 🔥 CORRECTION: Utiliser /payment/withdrawal au lieu de /manualpayment/withdrawal
    const response = await apiCall("/payment/withdrawal", "POST", {
      amountMz: amount,
      paymentMethod: selectedPaymentMethod,
      nom: nom,
      prenom: prenom,
      email: email,
      telephone: telephone,
    });

    console.log("✅ Réponse API retrait:", response);

    if (!response.success) {
      showNotification(
        response.message || "Erreur lors de la demande",
        "error"
      );
      return;
    }

    // ⚠️ NE PAS déduire le montant immédiatement - attendre validation admin
    // balance reste inchangé jusqu'à validation

    closeWithdrawFormModal();

    showNotification(
      `✅ Demande de retrait enregistrée!\n\n` +
        `Montant: ${amount} MZ (${fcfa} FCFA)\n` +
        `Moyen: ${
          selectedPaymentMethod === "airtel" ? "Airtel Money" : "Moov Money"
        }\n` +
        `ID: #${response.data.withdrawalId || "N/A"}\n\n` +
        `📱 Votre demande sera traitée sous 24h`,
      "success"
    );

    selectedPaymentMethod = null;
  } catch (error) {
    console.error("❌ Erreur submitWithdraw:", error);
    showNotification(
      "Erreur lors de la demande de retrait: " + (error.message || error),
      "error"
    );
  }
}
// ========================================
// MODAL DE PARRAINAGE
// ========================================

/**
 * Afficher le modal de parrainage
 */
/**
 * Afficher le modal de parrainage
 */
function showReferralModal() {
  const modal = document.getElementById("referralModal");
  if (!modal) {
    console.error("❌ Modal de parrainage introuvable");
    return;
  }

  // Afficher le modal
  modal.style.display = "flex";

  // Demander les données au serveur
  if (socket && isConnectedToSocket) {
    console.log("📡 Demande des infos de parrainage au serveur");
    socket.emit("referral:getInfo");
  }

  // Afficher les données actuelles en attendant
  updateReferralModalContent();

  console.log("✅ Modal de parrainage ouvert");
}

/**
 * Fermer le modal de parrainage
 */
function closeReferralModal() {
  const modal = document.getElementById("referralModal");
  if (modal) {
    modal.style.display = "none";
  }
}

/**
 * Mettre à jour le contenu du modal de parrainage
 */
function updateReferralModalContent() {
  console.log("🔄 Mise à jour du modal de parrainage");

  // Mettre à jour le code
  const codeElement = document.getElementById("referralCode");
  if (codeElement) {
    codeElement.textContent = myReferralCode || "Chargement...";
  }

  // Mettre à jour le lien
  const linkElement = document.getElementById("referralLink");
  if (linkElement && myReferralCode) {
    const baseUrl = window.location.origin;
    linkElement.value = `${baseUrl}?ref=${myReferralCode}`;
  }

  // Mettre à jour les statistiques
  const statsElement = document.getElementById("referralStats");
  if (statsElement) {
    const totalAffiliates = affiliatedUsers.length || 0;
    const totalEarnings = totalAffiliates * sponsorBonus;

    statsElement.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">👥 Filleuls:</span>
        <span class="stat-value">${totalAffiliates}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">💰 Gains totaux:</span>
        <span class="stat-value">${totalEarnings.toFixed(2)} MZ</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">🎁 Bonus par filleul:</span>
        <span class="stat-value">${sponsorBonus} MZ</span>
      </div>
    `;
  }

  // Mettre à jour la liste des affiliés
  displayAffiliatedUsers();
}

/**
 * Copier le code de parrainage
 */
function copyReferralCode() {
  if (!myReferralCode) {
    showNotification("Code de parrainage non disponible", "error");
    return;
  }

  const codeElement = document.getElementById("referralCode");
  if (!codeElement) return;

  // Créer un élément temporaire pour copier
  const tempInput = document.createElement("input");
  tempInput.value = myReferralCode;
  document.body.appendChild(tempInput);
  tempInput.select();

  try {
    document.execCommand("copy");
    showNotification("✅ Code copié: " + myReferralCode, "success");
  } catch (err) {
    console.error("❌ Erreur copie:", err);
    showNotification("Erreur lors de la copie", "error");
  }

  document.body.removeChild(tempInput);
}

/**
 * Copier le lien de parrainage
 */
function copyReferralLink() {
  const linkElement = document.getElementById("referralLink");
  if (!linkElement || !linkElement.value) {
    showNotification("Lien de parrainage non disponible", "error");
    return;
  }

  linkElement.select();

  try {
    document.execCommand("copy");
    showNotification("✅ Lien copié!", "success");
  } catch (err) {
    console.error("❌ Erreur copie:", err);
    showNotification("Erreur lors de la copie", "error");
  }
}

/**
 * Afficher la liste des filleuls
 */
/**
 * Afficher la liste des filleuls
 */
function displayAffiliatedUsers() {
  const container = document.getElementById("affiliatedUsersList");
  if (!container) {
    console.warn("⚠️ Container affiliatedUsersList introuvable");
    return;
  }

  console.log("📋 Affichage de", affiliatedUsers.length, "affiliés");

  if (!affiliatedUsers || affiliatedUsers.length === 0) {
    container.innerHTML = `
      <div class="no-affiliates">
        <p>🎯 Aucun filleul pour le moment</p>
        <p class="help-text">Partagez votre code pour gagner des bonus!</p>
      </div>
    `;
    return;
  }

  let html = '<div class="affiliates-list">';

  affiliatedUsers.forEach((user, index) => {
    // Supporter différents formats de nom
    let userName = "Utilisateur inconnu";

    if (user.name) {
      userName = user.name;
    } else if (user.prenom) {
      userName = `${user.prenom} ${user.nom || ""}`.trim();
    } else if (user.email) {
      userName = user.email.split("@")[0];
    } else {
      userName = `Utilisateur #${index + 1}`;
    }

    // Formater la date
    let joinDate = "Date inconnue";
    if (user.joinedAt || user.created_at) {
      const dateStr = user.joinedAt || user.created_at;
      try {
        joinDate = new Date(dateStr).toLocaleDateString("fr-FR");
      } catch (e) {
        console.warn("Erreur parsing date:", e);
      }
    }

    // Récupérer le bonus (supporter différents formats)
    const bonus = user.bonusEarned || user.bonus_earned || sponsorBonus;

    html += `
      <div class="affiliate-item">
        <div class="affiliate-icon">👤</div>
        <div class="affiliate-info">
          <div class="affiliate-name">${userName}</div>
          <div class="affiliate-date">Inscrit le ${joinDate}</div>
        </div>
        <div class="affiliate-bonus">+${bonus} MZ</div>
      </div>
    `;
  });

  html += "</div>";
  container.innerHTML = html;

  console.log("✅ Liste des affiliés affichée");
}
/**
 * Partager le code de parrainage (Web Share API)
 */
function shareReferralCode() {
  if (!myReferralCode) {
    showNotification("Code de parrainage non disponible", "error");
    return;
  }

  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}?ref=${myReferralCode}`;
  const shareText = `🚀 Rejoins-moi sur Mars Runner et gagne ${newPlayerBonus} MZ à l'inscription! Utilise mon code: ${myReferralCode}`;

  // Vérifier si Web Share API est disponible
  if (navigator.share) {
    navigator
      .share({
        title: "Mars Runner - Code de parrainage",
        text: shareText,
        url: shareUrl,
      })
      .then(() => console.log("✅ Partage réussi"))
      .catch((err) => console.log("❌ Erreur partage:", err));
  } else {
    // Fallback: copier le texte
    copyReferralCode();
  }
}
// CONVERSIONS AUTOMATIQUES (listeners uniques)
const depositAmountEl = document.getElementById("depositAmount");
if (depositAmountEl) {
  depositAmountEl.addEventListener("input", function () {
    const fcfa = parseFloat(this.value) || 0;
    const mz = fcfa / 100;

    const displayElement = document.getElementById("depositMZ");
    if (displayElement) {
      displayElement.textContent = mz.toFixed(2);
    }
  });
}

const withdrawAmountEl = document.getElementById("withdrawAmount");
if (withdrawAmountEl) {
  withdrawAmountEl.addEventListener("input", function () {
    const mz = parseFloat(this.value) || 0;
    const fcfa = mz * 100;

    const fcfaElement = document.getElementById("withdrawFcfa");
    if (fcfaElement) {
      fcfaElement.textContent = fcfa.toFixed(0);
    }
  });
}

document.getElementById("betInput")?.addEventListener("input", function () {
  betAmount = Math.max(1, parseFloat(this.value) || 1);
  const btnPlay = document.getElementById("btnPlay");
  if (btnPlay) {
    btnPlay.textContent = `🚀 Jouer (${betAmount} MZ)`;
  }
});

function generateStars() {
  const container = document.getElementById("starsBackground");
  if (!container) return;
  const numStars = isMobile ? 50 : 100;
  for (let i = 0; i < numStars; i++) {
    const star = document.createElement("div");
    star.className = "star";
    star.style.left = Math.random() * 100 + "%";
    star.style.top = Math.random() * 100 + "%";
    star.style.width = Math.random() * 2 + 1 + "px";
    star.style.height = star.style.width;
    star.style.animationDelay = Math.random() * 3 + "s";
    container.appendChild(star);
  }
}

function drawGame() {
  if (!canvas || !ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#0d0208");
  gradient.addColorStop(0.3, "#2b0f14");
  gradient.addColorStop(0.7, "#4a1a1f");
  gradient.addColorStop(1, "#8B3A3A");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#6B2C2C";
  ctx.beginPath();
  ctx.ellipse(canvas.width * 0.18, GROUND_Y + 40, 40, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(canvas.width * 0.5, GROUND_Y + 45, 50, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(canvas.width * 0.82, GROUND_Y + 38, 35, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#A0522D";
  ctx.fillRect(
    0,
    GROUND_Y + MARTIAN_SIZE,
    canvas.width,
    canvas.height - (GROUND_Y + MARTIAN_SIZE)
  );

  ctx.fillStyle = "#8B4513";
  for (let i = 0; i < 10; i++) {
    const x = (i * canvas.width * 0.1) % canvas.width;
    ctx.fillRect(x, GROUND_Y + MARTIAN_SIZE + 10, 30, 5);
  }

  ctx.fillStyle = "white";
  for (let i = 0; i < 60; i++) {
    const x = (i * 137) % canvas.width;
    const y = (i * 97) % GROUND_Y;
    const brightness = Math.sin(Date.now() / 500 + i) * 0.5 + 0.5;
    ctx.globalAlpha = brightness;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;

  backgroundObjects.forEach((obj) => {
    ctx.save();
    ctx.globalAlpha = 0.7;
    const objX = obj.x - cameraOffsetX;

    if (obj.type === "ovni") {
      ctx.fillStyle = "#FFFF00";
      ctx.beginPath();
      ctx.ellipse(objX, obj.y, obj.size, obj.size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.ellipse(
        objX,
        obj.y - obj.size * 0.2,
        obj.size * 0.6,
        obj.size * 0.3,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    } else if (obj.type === "meteorite") {
      ctx.fillStyle = "#FF6347";
      ctx.beginPath();
      ctx.arc(objX, obj.y, obj.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#FF8C00";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (obj.type === "etoile") {
      ctx.fillStyle = "#00FFFF";
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const x = objX + Math.cos(angle) * obj.size * 0.5;
        const y = obj.y + Math.sin(angle) * obj.size * 0.5;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    } else if (obj.type === "satellite") {
      ctx.fillStyle = "#00CED1";
      ctx.fillRect(
        objX - obj.size * 0.3,
        obj.y - obj.size * 0.2,
        obj.size * 0.6,
        obj.size * 0.4
      );
      ctx.fillRect(
        objX - obj.size * 0.5,
        obj.y - obj.size * 0.1,
        obj.size * 0.2,
        obj.size * 0.2
      );
      ctx.fillRect(
        objX + obj.size * 0.3,
        obj.y - obj.size * 0.1,
        obj.size * 0.2,
        obj.size * 0.2
      );
    }

    ctx.restore();
  });

  if (
    gameState === "playing" ||
    gameState === "gameover" ||
    gameState === "waiting"
  ) {
    const martianCenterY = martianY + MARTIAN_SIZE / 2;

    ctx.fillStyle = "#E0E0E0";
    ctx.fillRect(martianX + 10, martianCenterY - 10, 30, 35);
    const legOffset = Math.sin(legAnimation) * 8;
    const legOffset2 = Math.sin(legAnimation + Math.PI) * 8;
    ctx.fillStyle = "#C0C0C0";
    ctx.fillRect(martianX + 15, martianCenterY + 25, 8, 15 + legOffset);
    ctx.fillRect(martianX + 27, martianCenterY + 25, 8, 15 + legOffset2);
    ctx.fillStyle = "#404040";
    ctx.fillRect(martianX + 13, martianCenterY + 38 + legOffset, 12, 6);
    ctx.fillRect(martianX + 25, martianCenterY + 38 + legOffset2, 12, 6);
    ctx.fillStyle = "#D0D0D0";
    ctx.fillRect(martianX + 8, martianCenterY, 8, 20);
    ctx.fillRect(martianX + 34, martianCenterY, 8, 20);
    ctx.fillStyle = "rgba(173, 216, 230, 0.3)";
    ctx.beginPath();
    ctx.arc(martianX + 25, martianCenterY - 20, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#A0A0A0";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#00FF00";
    ctx.beginPath();
    ctx.arc(martianX + 25, martianCenterY - 20, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(martianX + 20, martianCenterY - 22, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(martianX + 30, martianCenterY - 22, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(martianX + 18, martianCenterY - 35);
    ctx.lineTo(martianX + 15, martianCenterY - 42);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(martianX + 32, martianCenterY - 35);
    ctx.lineTo(martianX + 35, martianCenterY - 42);
    ctx.stroke();
    ctx.fillStyle = "#00FF00";
    ctx.beginPath();
    ctx.arc(martianX + 15, martianCenterY - 42, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(martianX + 35, martianCenterY - 42, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(135, 206, 250, 0.4)";
    ctx.fillRect(martianX + 15, martianCenterY - 25, 20, 8);

    obstacles.forEach((obs) => {
      ctx.save();
      const obsX = obs.x - cameraOffsetX;
      ctx.translate(obsX + obs.width / 2, obs.y + obs.height / 2);

      if (obs.type === "rock") {
        ctx.fillStyle = "#CD5C5C";
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#8B4513";
        ctx.beginPath();
        ctx.arc(-5, -5, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (obs.type === "robot") {
        ctx.fillStyle = "#FF0000";
        ctx.fillRect(-15, -20, 30, 35);
        ctx.fillStyle = "#FFFF00";
        ctx.fillRect(-10, -15, 8, 8);
        ctx.fillRect(2, -15, 8, 8);
        ctx.fillStyle = "#00FF00";
        ctx.fillRect(-8, -5, 16, 3);
      } else if (obs.type === "flyingAlien") {
        ctx.fillStyle = "#9932CC";
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#00FF00";
        ctx.beginPath();
        ctx.arc(-5, -5, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5, -5, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3CB371";
        ctx.fillRect(-20, 8, 5, 10);
        ctx.fillRect(15, 8, 5, 10);
        ctx.fillRect(-5, 12, 5, 10);
      } else if (obs.type === "highDrone") {
        ctx.fillStyle = "#4682B4";
        ctx.fillRect(-20, -10, 40, 20);
        ctx.fillStyle = "#B0C4DE";
        ctx.fillRect(-30, -15, 10, 5);
        ctx.fillRect(20, -15, 10, 5);
        ctx.fillRect(-30, 10, 10, 5);
        ctx.fillRect(20, 10, 10, 5);
        ctx.fillStyle = "#FF0000";
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (obs.type === "proximityMine") {
        if (!obs.hit) {
          ctx.fillStyle = "rgba(255, 69, 0, 0.5)";
          ctx.beginPath();
          ctx.arc(0, 5, 20, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (obs.type === "fastMeteor") {
        ctx.fillStyle = obs.isFalling ? "#FFA500" : "#8B4513";
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();

        if (obs.isFalling) {
          ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
          ctx.beginPath();
          ctx.moveTo(0, 20);
          ctx.lineTo(-10, 50);
          ctx.lineTo(10, 50);
          ctx.closePath();
          ctx.fill();
        }
      } else if (obs.type === "rollingBall") {
        const radius = obs.width / 2;
        const rotationAngle = (-obs.x / (Math.PI * radius)) % (Math.PI * 2);
        ctx.rotate(rotationAngle);

        ctx.fillStyle = "#FF4500";
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(radius * 0.4, -radius * 0.3, radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-radius * 0.4, -radius * 0.3, radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-2, radius * 0.2, 4, radius * 0.5);
      }

      ctx.restore();
    });
  }
}

/**
 * TOUCH GLOBAL: Permet de sauter en touchant n'importe où (déjà créé plus haut)
 */
window.addEventListener(
  "touchstart",
  function (e) {
    if (gameState === "playing") {
      if (e.target.tagName === "BUTTON" || e.target.closest("button")) {
        return;
      }
      jump();
      if (e.cancelable) e.preventDefault();
    }
  },
  { passive: false }
);
