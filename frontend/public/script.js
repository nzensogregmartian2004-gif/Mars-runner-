// =======================================================================
// FRONTEND SOCKET.IO - script.js (VERSION CORRIGÉE MOBILE)
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
// 🔥 NOUVELLES VARIABLES ANTI-SPAM
let isStartingGame = false;
let startGameCooldown = false;
let lastStartGameAttempt = 0;
let isGameEnding = false; // ⭐ NOUVEAU : Évite les actions pendant la fin
let gameEndTimeout = null; // ⭐ NOUVEAU : Timeout de sécurité

// 🎮 CALIBRATION GAMING
const BASE_SPEED = 4.2;
const SPEED_INCREMENT = 0.0015;
let gameSpeed = BASE_SPEED;
let obstacles = [];
let backgroundObjects = [];
let score = 0;
const MIN_CASHOUT_MULTIPLIER = 1.5;
let lastObstacleTime = 0;

// 🎯 ESPACEMENT DYNAMIQUE
const MIN_GAP = 250;
const MAX_GAP = 500;
const GAP_COEFFICIENT = 14;
const frameInterval = 1000 / 60;

// ⚡ FLUCTUATION VITESSE
const MAX_SPEED_FACTOR = 1.8;
const MIN_SPEED_FACTOR = 0.6;
const FLUCTUATION_DURATION = 100;
let speedFluctuationTimer = 0;
let targetGameSpeed = BASE_SPEED;
let speedEffectDuration = 0;

let myReferralCode = "";
let newPlayerBonus = 5;
let sponsorBonus = 1;
let isNewPlayerBonusLocked = false;
let affiliatedUsers = [];

// Détection mobile
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768;

// ✅ TAILLES ADAPTÉES
const GRAVITY = 0.5;
const JUMP_FORCE = isMobile ? -9.5 : -11;

// 🔥 VARIABLES CANVAS
let martianY = 320;
let martianX = 100; // ⬅️ POSITION HORIZONTALE DU MARTIEN
let MARTIAN_SIZE = isMobile ? 45 : 50; // Martien réduit à 35px sur mobile
let GROUND_Y = isMobile ? 260 : 320; // Sol un peu plus haut
// --- Ajouts en haut du fichier (près des autres variables globales) ---
let displayScale = 1.0; // échelle d'affichage/logique (1 = normal, <1 = dézoom)
const PORTRAIT_SCALE = 0.7; // valeur quand mobile en portrait (ajuste ici si besoin)

// 📱 OFFSET CAMÉRA POUR MODE PORTRAIT
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
// SECTION 2 : setupCanvas() (Ligne ~132-185)
// REMPLACER toute la fonction :
// ========================================

// --- Remplacer la fonction setupCanvas() existante par celle-ci ---
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
    showLogin(); // ⬅️ AFFICHER UNIQUEMENT LOGIN AU DÉMARRAGE
  }

  // ⬅️ FIX: Empêcher soumission par défaut
  document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    handleLogin(e);
  });

  document.getElementById("registerForm").addEventListener("submit", (e) => {
    e.preventDefault();
    handleRegister();
  });

  document.getElementById("forgotForm").addEventListener("submit", (e) => {
    e.preventDefault();
    handleForgot();
  });

  window.addEventListener("resize", () => {
    setupCanvas();
    drawGame();
  });

  window.addEventListener("orientationchange", () => {
    setTimeout(() => {
      setupCanvas();
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
      e.preventDefault();
      if (gameState === "playing") jump();
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

    // 🔥 RÉINITIALISER LES FLAGS ANTI-SPAM
    isStartingGame = false;
    startGameCooldown = false;

    if (gameState === "playing" || gameState === "waiting") {
      showGameOverScreen(false, 0, "Déconnexion serveur. Partie annulée.");
    }
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Erreur connexion Socket.IO:", error);
    showNotification("Erreur de connexion au serveur", "error");

    // 🔥 RÉINITIALISER EN CAS D'ERREUR
    isStartingGame = false;
    startGameCooldown = false;
  });
  // ========================================
  // 🔥 AMÉLIORATION 2 : Gestion événement game:started
  // REMPLACER l'événement socket.on("game:started") existant
  // ========================================

  socket.on("game:started", (data) => {
    console.log("🎮 Partie démarrée - Data:", data);

    if (!data) {
      console.error("❌ Données game:started manquantes");
      showNotification("Erreur démarrage partie", "error");
      isStartingGame = false;
      resetPlayButton();
      return;
    }

    // ⭐ Éviter les démarrages multiples
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
    isGameEnding = false; // ⭐ Réinitialiser le flag

    // ⭐ Débloquer APRÈS succès
    isStartingGame = false;

    updateBalance();
    showNotification("Partie démarrée! Bonne chance.", "success");

    document.getElementById("actionButtons").innerHTML = `
    <button class="btn-jump" onclick="jump()">⬆️ Sauter</button>
    <button class="btn-cashout" id="btnCashout" onclick="cashOut()" disabled>💰 Retirer</button>
  `;
    document.getElementById("multiplierOverlay").classList.remove("hidden");
    document.getElementById("minWarning").classList.remove("hidden");

    // ⭐ Petit délai avant de lancer la loop locale (évite race conditions)
    setTimeout(() => {
      if (gameState === "playing") {
        startLocalGameLoop();
      }
    }, 150);
  });

  // ========================================
  // SECTION 6 : Mettre à jour socket.on("game:progress")
  // REMPLACER les lignes d'affichage du multiplicateur (Ligne ~360-368)
  // ========================================

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

    // ✅ UTILISER LA NOUVELLE FONCTION
    updateMultiplierDisplay();
  });

  socket.on("game:cashedOut", (data) => {
    console.log("💰 Cash Out réussi:", data);
    if (!data) return;

    // ⭐ Protection contre traitement multiple
    if (isGameEnding) {
      console.warn("⚠️ Cash out déjà en cours de traitement");
      return;
    }
    isGameEnding = true;

    const winAmount = parseFloat(data.winAmount || 0);
    balance = parseFloat(data.balance || balance || 0);
    isNewPlayerBonusLocked = false;

    updateBalance();

    // ⭐ Délai avant d'afficher l'écran de fin
    setTimeout(() => {
      showGameOverScreen(true, winAmount);
      isGameEnding = false;
    }, 300);
  });

  socket.on("game:over", (data) => {
    console.log("📊 Game Over:", data);

    // ⭐ Protection contre traitement multiple
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

    // ⭐ Délai avant d'afficher l'écran de fin
    setTimeout(() => {
      showGameOverScreen(false, 0);
      isGameEnding = false;
    }, 300);
  });

  socket.on("game:error", (data) => {
    console.error("❌ Erreur de jeu:", data);
    const message = data?.message || "Erreur inconnue";
    showNotification(message, "error");

    // 🔥 DÉBLOQUER LE BOUTON EN CAS D'ERREUR
    isStartingGame = false;
    resetPlayButton();

    if (gameState === "playing" || gameState === "waiting") {
      showGameOverScreen(false, 0, message);
    }
  });

  socket.on("wallet:balance", (data) => {
    if (!data) return; // ⬅️ FIX

    const newBalance = parseFloat(
      data.balance || data.balance_mz || balance || 0
    );
    if (newBalance >= 0) {
      balance = newBalance;
      updateBalance();
    }
  });

  socket.on("referral:info", (data) => {
    console.log("🎯 Données de parrainage reçues:", data);
    if (!data) return;

    // Récupérer le code
    myReferralCode = data.referralCode || data.referral_code || "";
    console.log("✅ Code parrainage:", myReferralCode);

    // Récupérer les affiliés
    if (data.affiliatedUsers && Array.isArray(data.affiliatedUsers)) {
      affiliatedUsers = data.affiliatedUsers;
      console.log("✅ Affiliés reçus:", affiliatedUsers.length);
      affiliatedUsers.forEach((aff) => {
        console.log(
          `  → ${aff.name}:  ${aff.bonusEarned} MZ (${
            aff.bonusUnlocked ? "Débloqué" : "En attente"
          })`
        );
      });
    } else {
      affiliatedUsers = [];
      console.log("⚠️ Pas d'affiliés");
    }
  });

  socket.on("user:info", (data) => {
    console.log("👤 Infos utilisateur:", data);
    if (!data) return; // ⬅️ FIX

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
    if (!data) return; // ⬅️ FIX
    balance = parseFloat(data.balance || balance);
    updateBalance();
    showNotification(
      `✅ Dépôt confirmé! ${data.amount} MZ ajoutés.`,
      "success"
    );
  });

  socket.on("withdrawal:confirmed", (data) => {
    if (!data) return; // ⬅️ FIX
    showNotification(
      `✅ Retrait effectué! ${data.amount} MZ envoyés.`,
      "success"
    );
  });

  socket.on("withdrawal:rejected", (data) => {
    if (!data) return; // ⬅️ FIX
    balance = parseFloat(data.balance || balance);
    updateBalance();
    showNotification(`❌ Retrait refusé: ${data.reason}`, "error");
  });

  // ✅ RÉCEPTION DU CODE UNIQUEMENT
  socket.on("referral:code", (data) => {
    console.log("🎯 Code de parrainage reçu:", data);
    if (data && (data.referralCode || data.referral_code)) {
      myReferralCode = data.referralCode || data.referral_code;
    }
  });

  // ✅ RÉCEPTION DES STATS
  socket.on("referral:stats", (data) => {
    console.log("📊 Stats de parrainage:", data);
    // Vous pouvez afficher ces stats dans l'UI si nécessaire
  });

  // ✅ ERREURS DE PARRAINAGE
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
 * 🔥 FONCTION CRITIQUE : startGame() avec protection complète
 */
function startGame() {
  // 🛡️ PROTECTION 1 : Vérifier si une partie est déjà en cours
  if (gameState === "playing" || gameState === "waiting") {
    console.warn("⚠️ Une partie est déjà en cours");
    showNotification("Une partie est déjà en cours", "warning");
    return;
  }

  // 🛡️ PROTECTION 2 : Vérifier si une fin est en cours
  if (isGameEnding) {
    console.warn("⚠️ Partie précédente en cours de finalisation");
    showNotification("Finalisation en cours, veuillez patienter...", "warning");
    return;
  }

  // 🛡️ PROTECTION 3 : Empêcher les clics multiples
  if (isStartingGame) {
    console.warn("⚠️ Démarrage déjà en cours");
    return;
  }

  // 🛡️ PROTECTION 4 : Cooldown entre parties
  const now = Date.now();
  if (startGameCooldown && now - lastStartGameAttempt < 2000) {
    const remainingTime = Math.ceil(
      (2000 - (now - lastStartGameAttempt)) / 1000
    );
    console.warn(`⏳ Cooldown actif: ${remainingTime}s`);
    showNotification(`Attendez ${remainingTime}s avant de rejouer`, "warning");
    return;
  }

  // 🛡️ PROTECTION 5 : Validation du montant
  const betInputElement = document.getElementById("betInput");
  betAmount = Math.max(1, parseFloat(betInputElement?.value || 1));

  if (betAmount > balance) {
    showNotification("Solde insuffisant!", "error");
    return;
  }

  // 🛡️ PROTECTION 6 : Vérifier la connexion
  if (!isConnectedToSocket || !socket) {
    showNotification("Connexion au serveur requise.", "warning");
    connectSocket();
    return;
  }

  // ✅ ACTIVER LES PROTECTIONS
  isStartingGame = true;
  startGameCooldown = true;
  lastStartGameAttempt = now;

  console.log("🎮 Lancement de la partie - Mise:", betAmount, "MZ");

  // 🔄 DÉSACTIVER LE BOUTON
  disablePlayButton();

  // 📤 ÉMETTRE LA REQUÊTE
  socket.emit("game:start", { betAmount });

  // ⏰ TIMEOUT DE SÉCURITÉ : 8 secondes
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

  // 🎯 PRÉPARER L'ÉTAT LOCAL
  gameState = "waiting";
  multiplier = 1.0;
  potentialWin = 0;
  canWithdraw = false;
  collisionDetected = false;

  // ⚠️ NE PAS démarrer la loop ici, attendre game:started
}

/**
 * 🔧 Désactiver visuellement le bouton "Jouer"
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
 * 🔧 Réactiver le bouton "Jouer"
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

// --- Modifier les endroits de génération d'obstacles pour tenir compte de displayScale ---
// Remplace la fonction handleObstacleGeneration par la version suivante (garde le comportement,
// mais utilise des constantes multipliées par displayScale pour positions / tailles) :

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

  const obstacleWeights = {
    rock: 30,
    robot: 30,
    flyingAlien: 50,
    highDrone: 30,
    proximityMine: 30,
    fastMeteor: 30,
    doubleDanger: 10,
    rollingBall: 10,
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

// --- REMPLACER handleObstacleMovement() PAR CETTE VERSION ---
function handleObstacleMovement(deltaTime) {
  obstacles = obstacles
    .map((obs) => {
      // Mettre à jour la vitesse de l'obstacle pour la rendre cohérente avec gameSpeed
      obs.speed = gameSpeed;

      // Utiliser gameSpeed directement (évite divergence si obs.speed était ancien)
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
    // garder obstacles en se basant sur la position écran
    .filter((obs) => obs.x > -50 - cameraOffsetX);
}

// --- REMPLACER checkCollision() PAR CETTE VERSION (UTILISE COORDÉES ÉCRAN) ---
function checkCollision() {
  if (collisionDetected) return false;

  const martianRight = martianX + MARTIAN_SIZE;
  const martianBottom = martianY + MARTIAN_SIZE;

  // Tolérance adaptée à l'échelle d'affichage
  const hitboxTolerance = Math.max(4, Math.floor(6 * displayScale));
  const proximityRangeBase = 55;
  const proximityRange = Math.max(
    30,
    Math.floor(proximityRangeBase * displayScale)
  );

  for (let obs of obstacles) {
    // Convertir la position obstacle en coordonnée écran (consistante avec draw)
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
        speedEffectDuration = 95;
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
  // ⭐ Nettoyer le timeout de sécurité
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

  document.getElementById("actionButtons").innerHTML = `
    <button class="btn-replay" onclick="replayGame()">🔄 Rejouer</button>
  `;

  document.getElementById("multiplierOverlay").classList.add("hidden");
  document.getElementById("minWarning").classList.add("hidden");

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

  // ⭐ Délai avant de permettre une nouvelle partie
  setTimeout(() => {
    gameState = "menu";
    currentGameId = null;
    // ⭐ Débloquer complètement les protections
    isStartingGame = false;
    startGameCooldown = false;
    isGameEnding = false;
  }, 1500); // ⭐ 1.5 secondes de stabilisation

  drawGame();
}

function replayGame() {
  // ⭐ Vérifier qu'on peut vraiment rejouer
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

  // ⭐ Réinitialiser tous les flags
  startGameCooldown = false;
  isStartingGame = false;
  isGameEnding = false;

  document.getElementById("multiplierDisplay").textContent = "x1.000";
  document.getElementById("potentialWin").textContent = "0.00";
  document.getElementById("scoreDisplay").textContent = "0";

  document.getElementById("actionButtons").innerHTML = `
    <button class="btn-play" id="btnPlay" onclick="startGame()">🚀 Jouer (${betAmount} MZ)</button>
  `;

  if (backgroundMusic && backgroundMusic.paused) {
    backgroundMusic.currentTime = 0;
    backgroundMusic.play().catch((e) => console.log("Erreur musique:", e));
  }

  drawGame();
}

function jump() {
  // ⭐ Ne sauter que si vraiment en jeu
  if (gameState !== "playing") {
    return;
  }

  // ⭐ Éviter les sauts pendant la fin
  if (isGameEnding || collisionDetected) {
    return;
  }

  if (martianY >= GROUND_Y - 5) {
    velocity = JUMP_FORCE;
  }
}

// ⭐ Gestion du touch global améliorée
window.removeEventListener("touchstart", globalTouchHandler); // Enlever l'ancien
function globalTouchHandler(e) {
  // Ne réagir que si en jeu
  if (gameState !== "playing") {
    return;
  }

  // Ne pas sauter si fin de partie
  if (isGameEnding || collisionDetected) {
    return;
  }

  // Sécurité : éviter de sauter en touchant un bouton
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

// ========================================
// SECTION 5 : Affichage multiplicateur compact (NOUVEAU)
// AJOUTER cette fonction après showNotification()
// ========================================

function updateMultiplierDisplay() {
  // Adaptation pour mobile
  const multDisplay = document.getElementById("multiplierDisplay");
  const overlayMult = document.getElementById("overlayMultiplier");
  const potWin = document.getElementById("potentialWin");

  if (isMobile) {
    // Affichage ultra-compact sur mobile
    if (multDisplay) multDisplay.textContent = "x" + multiplier.toFixed(2); // 2 décimales au lieu de 3
    if (overlayMult) overlayMult.textContent = "x" + multiplier.toFixed(3); // 3 au lieu de 5
  } else {
    // Affichage normal sur desktop
    if (multDisplay) multDisplay.textContent = "x" + multiplier.toFixed(3);
    if (overlayMult) overlayMult.textContent = "x" + multiplier.toFixed(5);
  }

  if (potWin) potWin.textContent = potentialWin.toFixed(2);
}
drawGame();
// ========================================
// 📍 CORRECTION 4 : Nouvelle fonction pour debug (OPTIONNEL)
// Ajouter après updateMultiplierDisplay()
// ========================================

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
// CORRECTION 1: Frontend - script.js
// Ligne ~1027 - Fonction updateBalance()
// ============================================

// Ligne 1050 - CORRIGER updateBalance()

function updateBalance(data = null) {
  // ✅ FIX:  Gérer correctement tous les cas
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

  // ✅ S'assurer que balance est un nombre valide
  if (isNaN(balance) || balance === undefined || balance === null) {
    balance = 0;
  }

  // ✅ Vérifier que balance est bien un nombre avant d'appeler toFixed
  if (typeof balance !== "number") {
    balance = parseFloat(balance) || 0;
  }

  const balanceElement = document.getElementById("balance");
  if (balanceElement) {
    balanceElement.textContent = balance.toFixed(2);
  }

  console.log("💰 Balance affichée:", balance);
}

// ============================================
// MODIFIER updateUserInfo() (Ligne ~682)
// ============================================

function updateUserInfo(user) {
  console.log("👤 Mise à jour infos utilisateur:", user);
  if (!user) return;

  const userNameElement = document.getElementById("userName");
  if (userNameElement) {
    userNameElement.textContent =
      `${user.prenom || ""} ${user.nom || ""}`.trim() || user.email || "Joueur";
  }

  // ✅ RÉCUPÉRER LE CODE DE PARRAINAGE
  if (user.referral_code || user.referralCode) {
    myReferralCode = user.referral_code || user.referralCode;
    console.log("🎯 Code de parrainage récupéré:", myReferralCode);
  }

  // ✅ RÉCUPÉRER LES AFFILIÉS
  if (user.affiliated_users || user.affiliatedUsers) {
    affiliatedUsers = user.affiliated_users || user.affiliatedUsers;
    console.log("👥 Affiliés récupérés:", affiliatedUsers);
  }

  if (user.balance_mz !== undefined) {
    balance = parseFloat(user.balance_mz);
    updateBalance();
  } else if (user.balance !== undefined) {
    balance = parseFloat(user.balance);
    updateBalance();
  }

  console.log("💰 Balance mise à jour:", balance);
}

function showGameInterface() {
  document.getElementById("authScreen").style.display = "none";
  document.getElementById("gameScreen").style.display = "block";
}

// ========================================
// 7. AUTHENTIFICATION (SÉPARATION COMPLÈTE)
// ========================================

function showLogin() {
  // ⬅️ MASQUER TOUS LES FORMULAIRES
  document.getElementById("loginForm").classList.add("hidden");
  document.getElementById("registerForm").classList.add("hidden");
  document.getElementById("forgotForm").classList.add("hidden");

  // ⬅️ AFFICHER UNIQUEMENT LOGIN
  setTimeout(() => {
    document.getElementById("loginForm").classList.remove("hidden");
  }, 50);
}

function showRegister() {
  // ⬅️ MASQUER TOUS LES FORMULAIRES
  document.getElementById("loginForm").classList.add("hidden");
  document.getElementById("registerForm").classList.add("hidden");
  document.getElementById("forgotForm").classList.add("hidden");

  // ⬅️ AFFICHER UNIQUEMENT REGISTER
  setTimeout(() => {
    document.getElementById("registerForm").classList.remove("hidden");
  }, 50);
}

function showForgot() {
  // ⬅️ MASQUER TOUS LES FORMULAIRES
  document.getElementById("loginForm").classList.add("hidden");
  document.getElementById("registerForm").classList.add("hidden");
  document.getElementById("forgotForm").classList.add("hidden");

  // ⬅️ AFFICHER UNIQUEMENT FORGOT
  setTimeout(() => {
    document.getElementById("forgotForm").classList.remove("hidden");
  }, 50);
}

async function handleLogin(event) {
  event.preventDefault();

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

  document.getElementById("authScreen").style.display = "flex";
  document.getElementById("gameScreen").style.display = "none";

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

  // ⬅️ RETOUR AU LOGIN
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
        document.getElementById("authScreen").style.display = "flex";
        document.getElementById("gameScreen").style.display = "none";
        showLogin(); // ⬅️ RETOUR AU LOGIN
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
      } else {
        resolve({ success: true, data: {} });
      }
    }, 100);
  });
}

// ========================================
// 9. HELPERS
// ========================================

// --- Remplacer createObstacle() par cette version (applique displayScale aux sizes) ---
function createObstacle(type, x, y, width = 35, height = 35) {
  // Appliquer l'échelle d'affichage aux dimensions
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
  document.getElementById("depositModal").style.display = "flex";
}

function closeDepositModal() {
  document.getElementById("depositModal").style.display = "none";
}

// ========================================
// DÉPÔT - ÉTAPE 2 : AFFICHER FORMULAIRE
// ========================================
function showDepositForm(method) {
  selectedPaymentMethod = method;

  // Fermer la modale de choix
  closeDepositModal();

  // Mettre à jour le titre selon le moyen choisi
  const title = document.getElementById("depositFormTitle");
  if (title) {
    title.textContent =
      method === "airtel"
        ? "💰 Dépôt via Airtel Money"
        : "💰 Dépôt via Moov Money";
  }

  // Pré-remplir les champs si les données utilisateur existent
  const userEmail = localStorage.getItem("userEmail") || "";
  if (userEmail) {
    document.getElementById("depositEmail").value = userEmail;
  }

  // Afficher le formulaire
  document.getElementById("depositFormModal").style.display = "flex";
}

function closeDepositFormModal() {
  document.getElementById("depositFormModal").style.display = "none";
  selectedPaymentMethod = null;

  // Réinitialiser les champs
  document.getElementById("depositAmount").value = "";
  document.getElementById("depositNom").value = "";
  document.getElementById("depositPrenom").value = "";
  document.getElementById("depositEmail").value = "";
  document.getElementById("depositTelephone").value = "";
}

// ========================================
// DÉPÔT - ÉTAPE 3 : SOUMISSION
// ========================================
async function submitDeposit() {
  const amount = parseFloat(document.getElementById("depositAmount").value);
  const nom = document.getElementById("depositNom").value.trim();
  const prenom = document.getElementById("depositPrenom").value.trim();
  const email = document.getElementById("depositEmail").value.trim();
  const telephone = document.getElementById("depositTelephone").value.trim();

  // Validations
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
    // Enregistrer la demande dans la base de données
    const response = await apiCall("/manualpayment/deposit", "POST", {
      amountFcfa: amount,
      amountMz: mz,
      paymentMethod: selectedPaymentMethod, // 'airtel' ou 'moov'
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

    // Fermer le formulaire
    closeDepositFormModal();

    // Notification de confirmation
    showNotification(
      `✅ Demande de dépôt enregistrée!\n\n` +
        `Montant: ${amount} FCFA (${mz.toFixed(2)} MZ)\n` +
        `Moyen: ${
          selectedPaymentMethod === "airtel" ? "Airtel Money" : "Moov Money"
        }\n` +
        `ID: #${response.data.depositId}\n\n` +
        `📱 Confirmez sur votre téléphone`,
      "success"
    );

    // Réinitialiser
    selectedPaymentMethod = null;
  } catch (error) {
    console.error("❌ Erreur submitDeposit:", error);
    showNotification(
      "Erreur lors de la demande de dépôt: " + error.message,
      "error"
    );
  }
}

// ========================================
// RETRAIT - ÉTAPE 1 : OUVERTURE MODALE CHOIX
// ========================================
function showWithdrawModal() {
  const modal = document.getElementById("withdrawModal");
  modal.style.display = "flex";

  // Afficher le statut du bonus
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
          <small>💡 Minimum: 5 MZ (500 FCFA) | Maximum: ${balance.toFixed(
            2
          )} MZ</small>
        </div>
      `;
    }
  }
}

function closeWithdrawModal() {
  document.getElementById("withdrawModal").style.display = "none";
}

// ========================================
// RETRAIT - ÉTAPE 2 : AFFICHER FORMULAIRE
// ========================================
function showWithdrawForm(method) {
  // Vérifier d'abord si le bonus est débloqué
  if (isNewPlayerBonusLocked) {
    showNotification(
      "Retrait impossible. Le bonus d'inscription doit être joué par une mise pour débloquer le retrait.",
      "error"
    );
    return;
  }

  selectedPaymentMethod = method;

  // Fermer la modale de choix
  closeWithdrawModal();

  // Mettre à jour le titre selon le moyen choisi
  const title = document.getElementById("withdrawFormTitle");
  if (title) {
    title.textContent =
      method === "airtel"
        ? "💸 Retrait via Airtel Money"
        : "💸 Retrait via Moov Money";
  }

  // Pré-remplir les champs si les données utilisateur existent
  const userEmail = localStorage.getItem("userEmail") || "";
  if (userEmail) {
    document.getElementById("withdrawEmail").value = userEmail;
  }

  // Afficher le formulaire
  document.getElementById("withdrawFormModal").style.display = "flex";
}

function closeWithdrawFormModal() {
  document.getElementById("withdrawFormModal").style.display = "none";
  selectedPaymentMethod = null;

  // Réinitialiser les champs
  document.getElementById("withdrawAmount").value = "";
  document.getElementById("withdrawNom").value = "";
  document.getElementById("withdrawPrenom").value = "";
  document.getElementById("withdrawEmail").value = "";
  document.getElementById("withdrawTelephone").value = "";
}

// ========================================
// RETRAIT - ÉTAPE 3 : SOUMISSION
// ========================================
async function submitWithdraw() {
  const amount = parseFloat(document.getElementById("withdrawAmount").value);
  const nom = document.getElementById("withdrawNom").value.trim();
  const prenom = document.getElementById("withdrawPrenom").value.trim();
  const email = document.getElementById("withdrawEmail").value.trim();
  const telephone = document.getElementById("withdrawTelephone").value.trim();

  const fcfa = amount * 100;

  // Validations
  if (!amount || fcfa < 500) {
    showNotification("Retrait minimum: 500 FCFA (5 MZ)", "error");
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

    // Enregistrer la demande dans la base de données
    const response = await apiCall("/manualpayment/withdrawal", "POST", {
      amountMz: amount,
      paymentMethod: selectedPaymentMethod, // 'airtel' ou 'moov'
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

    // Mettre à jour la balance
    if (response.data && response.data.newBalance !== undefined) {
      balance = parseFloat(response.data.newBalance);
    } else {
      balance = balance - amount;
    }

    updateBalance();

    // Fermer le formulaire
    closeWithdrawFormModal();

    // Notification de confirmation
    showNotification(
      `✅ Demande de retrait enregistrée!\n\n` +
        `Montant: ${amount} MZ (${fcfa} FCFA)\n` +
        `Moyen: ${
          selectedPaymentMethod === "airtel" ? "Airtel Money" : "Moov Money"
        }\n` +
        `ID: #${response.data.withdrawalId}\n\n` +
        `📱 Vous recevrez un message de confirmation sous 24h`,
      "success"
    );

    // Réinitialiser
    selectedPaymentMethod = null;
  } catch (error) {
    console.error("❌ Erreur submitWithdraw:", error);
    showNotification(
      "Erreur lors de la demande de retrait: " + error.message,
      "error"
    );
  }
}

// ========================================
// CONVERSIONS AUTOMATIQUES
// ========================================

// Conversion FCFA -> MZ pour le dépôt
document
  .getElementById("depositAmount")
  ?.addEventListener("input", function () {
    const fcfa = parseFloat(this.value) || 0;
    const mz = fcfa / 100;

    const displayElement = document.getElementById("depositMZ");
    if (displayElement) {
      displayElement.textContent = mz.toFixed(2);
    }
  });

// Conversion MZ -> FCFA pour le retrait
document
  .getElementById("withdrawAmount")
  ?.addEventListener("input", function () {
    const mz = parseFloat(this.value) || 0;
    const fcfa = mz * 100;

    const fcfaElement = document.getElementById("withdrawFcfa");
    if (fcfaElement) {
      fcfaElement.textContent = fcfa.toFixed(0);
    }
  });

try {
  // ✅ ENREGISTRER LA DEMANDE DANS LA BASE DE DONNÉES
  const response = await apiCall("/manualpayment/withdrawal", "POST", {
    amountMz: amount,
    walletName: walletName,
    walletNumber: walletNumber,
  });

  if (!response.success) {
    showNotification(response.message || "Erreur lors de la demande", "error");
    return;
  }

  console.log("✅ Demande de retrait enregistrée:", response.data);

  // Mettre à jour le solde localement
  balance = response.data.newBalance;
  updateBalance();

  closeWithdrawModal();
  document.getElementById("withdrawAmount").value = "";
  if (document.getElementById("withdrawWalletName"))
    document.getElementById("withdrawWalletName").value = "";
  if (document.getElementById("withdrawWalletNumber"))
    document.getElementById("withdrawWalletNumber").value = "";

  showNotification(
    `✅ Demande de retrait enregistrée! ID: #${response.data.withdrawalId}\n\n` +
      `Montant: ${amount} MZ (${fcfa} FCFA)\n` +
      `Destinataire: ${walletNumber} (${walletName})\n\n` +
      `Votre argent sera envoyé sous 24h.`,
    "success"
  );

  // Notification rappel après 5 secondes
  setTimeout(() => {
    showNotification(
      "📞 Service client disponible si besoin après 24h",
      "info"
    );
  }, 5000);
} catch (error) {
  console.error("❌ Erreur handleWithdraw:", error);
  showNotification("Erreur lors de la demande de retrait", "error");
}
// ============================================
// MODIFIER showReferralModal() (Ligne ~1062)
// ============================================

function showReferralModal() {
  const modal = document.getElementById("referralModal");
  if (!modal) return;

  modal.style.display = "flex";

  // ✅ Demander les données actualisées au serveur
  if (socket && isConnectedToSocket) {
    socket.emit("referral:getInfo");
  }

  // ✅ Afficher le code (sera mis à jour par l'événement)
  const codeDisplay = document.getElementById("myReferralCodeDisplay");
  if (codeDisplay) {
    codeDisplay.value = myReferralCode || "Chargement...";
  }

  // ✅ Afficher les affiliés
  const listElement = document.getElementById("affiliatedList");
  if (!listElement) return;

  if (!affiliatedUsers || affiliatedUsers.length === 0) {
    listElement.innerHTML = `
      <li style="color: #888; font-style: italic;">
        Aucun affilié pour le moment. Partagez votre code !
      </li>
    `;
    return;
  }

  // ✅ Construire la liste depuis les vraies données
  let listHtml = "";
  affiliatedUsers.forEach((user) => {
    const name =
      user.name ||
      `${user.prenom || ""} ${user.nom || ""}`.trim() ||
      user.email ||
      "Utilisateur";
    const bonusEarned = parseFloat(user.bonusEarned || user.bonus_earned || 0);
    const isUnlocked = !!user.bonusUnlocked || user.bonus_unlocked === 1;

    const status = isUnlocked
      ? `✅ GAGNÉ (${bonusEarned.toFixed(2)} MZ)`
      : `🕐 EN ATTENTE`;

    listHtml += `
    <li style="margin-bottom: 0.5rem; padding:  0.5rem; background: rgba(0,0,0,0.3); border-radius: 5px;">
      <strong>${name}</strong> - ${status}
    </li>
  `;
  });

  listElement.innerHTML = listHtml;
}

function closeReferralModal() {
  document.getElementById("referralModal").style.display = "none";
}

function copyReferralCode() {
  const codeInput = document.getElementById("myReferralCodeDisplay");
  navigator.clipboard
    .writeText(codeInput.value)
    .then(() => {
      showNotification("Code de parrainage copié!", "info");
    })
    .catch((err) => {
      codeInput.select();
      document.execCommand("copy");
      showNotification("Code de parrainage copié! (Fallback)", "info");
    });
}

document
  .getElementById("depositAmount")
  ?.addEventListener("input", function () {
    const fcfa = parseFloat(this.value) || 0;
    const mz = fcfa / 100;
    const displayElement =
      document.getElementById("depositMZ") ||
      document.getElementById("depositDisplay");
    if (displayElement) {
      displayElement.textContent = mz.toFixed(2);
    }
  });

document
  .getElementById("withdrawAmount")
  ?.addEventListener("input", function () {
    const mz = parseFloat(this.value) || 0;
    const fcfa = mz * 100;
    const fcfaElement = document.getElementById("withdrawFcfa");
    if (fcfaElement) {
      fcfaElement.textContent = fcfa.toFixed(0);
    }
  });

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
      } else if (obs.type === "rock") {
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
 * GESTION DU SAUT TACTILE GLOBAL
 * Permet de sauter en touchant n'importe où sur l'écran
 */
window.addEventListener(
  "touchstart",
  function (e) {
    // 1. On ne réagit que si la partie est lancée
    if (gameState === "playing") {
      // 2. SÉCURITÉ : Si on touche un bouton (comme "Retirer"), on ne saute pas
      if (e.target.tagName === "BUTTON" || e.target.closest("button")) {
        return;
      }

      // 3. Faire sauter le martien
      jump();

      // 4. Empêche le comportement par défaut (évite le zoom accidentel)
      if (e.cancelable) e.preventDefault();
    }
  },
  { passive: false }
);
