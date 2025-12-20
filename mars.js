import React, { useState, useEffect, useRef } from "react";
import {
  Rocket,
  Satellite,
  Moon,
  Zap,
  User,
  Lock,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  LogOut,
  X,
} from "lucide-react";

const MarsRunnerGame = () => {
  // États d'authentification
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuth, setShowAuth] = useState(true);
  const [authMode, setAuthMode] = useState("login"); // 'login', 'register', 'forgot'
  const [authData, setAuthData] = useState({
    nom: "",
    prenom: "",
    age: "",
    tel: "",
    email: "",
    password: "",
  });

  // États financiers
  const [balance, setBalance] = useState(0); // en Dollar martien
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  // États du jeu
  const [gameState, setGameState] = useState("menu"); // 'menu', 'playing', 'gameover'
  const [multiplier, setMultiplier] = useState(1.0);
  const [betAmount, setBetAmount] = useState(1);
  const [canWithdraw, setCanWithdraw] = useState(false);
  const [martianY, setMartianY] = useState(300);
  const [velocity, setVelocity] = useState(0);
  const [obstacles, setObstacles] = useState([]);
  const [backgroundObjects, setBackgroundObjects] = useState([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [potentialWin, setPotentialWin] = useState(0);
  const [legAnimation, setLegAnimation] = useState(0);
  const [difficulty, setDifficulty] = useState(1);

  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);

  // Constantes du jeu
  const GRAVITY = 0.5;
  const JUMP_FORCE = -11;
  const GROUND_Y = 320;
  const MARTIAN_SIZE = 50;

  // Gestion de l'authentification
  const handleAuth = () => {
    if (authMode === "register") {
      if (
        !authData.nom ||
        !authData.prenom ||
        !authData.age ||
        !authData.tel ||
        !authData.email ||
        !authData.password
      ) {
        alert("Veuillez remplir tous les champs");
        return;
      }
      // Simulation d'inscription
      setBalance(0);
      setIsAuthenticated(true);
      setShowAuth(false);
      alert("Inscription réussie! Bienvenue " + authData.prenom);
    } else if (authMode === "login") {
      if (!authData.email || !authData.password) {
        alert("Email et mot de passe requis");
        return;
      }
      // Simulation de connexion
      setBalance(50); // Crédit de départ
      setIsAuthenticated(true);
      setShowAuth(false);
      alert("Connexion réussie!");
    } else if (authMode === "forgot") {
      if (!authData.email && !authData.tel) {
        alert("Email ou numéro de téléphone requis");
        return;
      }
      alert("Un lien de réinitialisation a été envoyé");
      setAuthMode("login");
    }
  };

  // Gestion des dépôts
  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (amount < 100) {
      alert("Dépôt minimum: 100 FCFA (1 DM)");
      return;
    }
    if (amount > 50000) {
      alert("Dépôt maximum: 50000 FCFA (500 DM)");
      return;
    }
    const DM = amount / 100;
    setBalance((prev) => prev + DM);
    setShowDeposit(false);
    setDepositAmount("");
    alert(`Dépôt de ${DM} DM réussi!`);
  };

  // Gestion des retraits
  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    const fcfa = amount * 100;
    if (fcfa < 1000) {
      alert("Retrait minimum: 1000 FCFA (10 DM)");
      return;
    }
    if (fcfa > 100000) {
      alert("Retrait maximum: 100000 FCFA (1000 DM)");
      return;
    }
    if (amount > balance) {
      alert("Solde insuffisant");
      return;
    }
    setBalance((prev) => prev - amount);
    setShowWithdraw(false);
    setWithdrawAmount("");
    alert(`Retrait de ${amount} DM (${fcfa} FCFA) en cours...`);
  };

  // Démarrer le jeu
  const startGame = () => {
    if (betAmount > balance) {
      alert("Solde insuffisant!");
      return;
    }
    setBalance((prev) => prev - betAmount);
    setGameState("playing");
    setMultiplier(1.0);
    setCanWithdraw(false);
    setMartianY(GROUND_Y);
    setVelocity(0);
    setObstacles([]);
    setBackgroundObjects([]);
    setScore(0);
    setDifficulty(1);
    setLegAnimation(0);
  };

  // Retirer les gains
  const cashOut = () => {
    if (!canWithdraw) {
      alert("Vous devez atteindre x2.00 minimum pour retirer!");
      return;
    }
    const winAmount = betAmount * multiplier;
    setBalance((prev) => prev + winAmount);
    setPotentialWin(0);
    setGameState("menu");
    alert(`Félicitations! Vous avez gagné ${winAmount.toFixed(2)} DM!`);
  };

  // Saut du martien
  const jump = () => {
    if (gameState === "playing" && martianY >= GROUND_Y - 5) {
      setVelocity(JUMP_FORCE);
    }
  };

  // Gestion du clavier
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === "Space" && gameState === "playing") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [gameState, martianY]);

  // Boucle du jeu
  useEffect(() => {
    if (gameState !== "playing") return;

    gameLoopRef.current = setInterval(() => {
      // Mise à jour du multiplicateur
      setMultiplier((prev) => {
        const newMult = prev + 0.00015;
        if (newMult >= 2.0 && !canWithdraw) {
          setCanWithdraw(true);
        }
        setPotentialWin(betAmount * newMult);
        return newMult;
      });

      // Animation des jambes
      setLegAnimation((prev) => (prev + 0.3) % (Math.PI * 2));

      // Augmentation progressive de la difficulté
      setDifficulty((prev) => Math.min(prev + 0.0001, 3));

      // Mise à jour de la gravité
      setVelocity((prev) => prev + GRAVITY);
      setMartianY((prev) => {
        const newY = prev + velocity;
        return newY > GROUND_Y ? GROUND_Y : newY;
      });

      // Génération d'objets de fond pour le repère visuel
      setBackgroundObjects((prev) => {
        const newObjects = [...prev];

        if (Math.random() < 0.02) {
          const types = ["ovni", "meteorite", "etoile", "satellite"];
          const type = types[Math.floor(Math.random() * types.length)];

          newObjects.push({
            x: 800,
            y: Math.random() * 250,
            type: type,
            speed: 2 + Math.random() * 2,
            size: 20 + Math.random() * 30,
          });
        }

        return newObjects
          .map((obj) => ({ ...obj, x: obj.x - obj.speed }))
          .filter((obj) => obj.x > -100);
      });

      // Génération d'obstacles - plus facile au début
      setObstacles((prev) => {
        const newObstacles = [...prev];

        // Fréquence adaptée à la difficulté (plus facile au début)
        const spawnRate = 0.008 + difficulty * 0.004;

        if (Math.random() < spawnRate) {
          const types = ["satellite", "rock", "robot", "drone"];
          const type = types[Math.floor(Math.random() * types.length)];
          const isFlying = type === "satellite" || type === "drone";

          newObstacles.push({
            x: 800,
            y: isFlying ? 180 + Math.random() * 120 : GROUND_Y,
            type: type,
            width: 35,
            height: 35,
            speed: 3 + difficulty * 0.5,
          });
        }

        // Déplacement des obstacles
        return newObstacles
          .map((obs) => ({ ...obs, x: obs.x - obs.speed }))
          .filter((obs) => obs.x > -50);
      });

      // Détection de collision - hitbox plus tolérante
      obstacles.forEach((obs) => {
        const hitboxTolerance = 8;
        if (
          obs.x < 100 + MARTIAN_SIZE - hitboxTolerance &&
          obs.x + obs.width > 100 + hitboxTolerance &&
          martianY + MARTIAN_SIZE - hitboxTolerance > obs.y &&
          martianY + hitboxTolerance < obs.y + obs.height
        ) {
          setGameState("gameover");
          if (multiplier > highScore) {
            setHighScore(multiplier);
          }
        }
      });

      setScore((prev) => prev + 1);
    }, 1000 / 60);

    return () => clearInterval(gameLoopRef.current);
  }, [
    gameState,
    velocity,
    martianY,
    obstacles,
    multiplier,
    betAmount,
    canWithdraw,
    highScore,
    difficulty,
  ]);

  // Rendu du canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // Fond martien avec dégradé
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, "#0d0208");
    gradient.addColorStop(0.3, "#2b0f14");
    gradient.addColorStop(0.7, "#4a1a1f");
    gradient.addColorStop(1, "#8B3A3A");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 400);

    // Cratères sur le sol (statiques)
    ctx.fillStyle = "#6B2C2C";
    ctx.beginPath();
    ctx.ellipse(150, 360, 40, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(400, 365, 50, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(650, 358, 35, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sol martien rocheux
    ctx.fillStyle = "#A0522D";
    ctx.fillRect(0, GROUND_Y + MARTIAN_SIZE, 800, 50);

    // Détails du sol
    ctx.fillStyle = "#8B4513";
    for (let i = 0; i < 10; i++) {
      const x = (i * 100) % 800;
      ctx.fillRect(x, GROUND_Y + MARTIAN_SIZE + 10, 30, 5);
    }

    // Étoiles scintillantes
    ctx.fillStyle = "white";
    for (let i = 0; i < 60; i++) {
      const x = (i * 137) % 800;
      const y = (i * 97) % 280;
      const brightness = Math.sin(Date.now() / 500 + i) * 0.5 + 0.5;
      ctx.globalAlpha = brightness;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;

    // Objets de fond pour repère visuel
    backgroundObjects.forEach((obj) => {
      ctx.save();
      ctx.globalAlpha = 0.7;

      if (obj.type === "ovni") {
        // OVNI jaune fluo
        ctx.fillStyle = "#FFFF00";
        ctx.beginPath();
        ctx.ellipse(obj.x, obj.y, obj.size, obj.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.ellipse(
          obj.x,
          obj.y - obj.size * 0.2,
          obj.size * 0.6,
          obj.size * 0.3,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
      } else if (obj.type === "meteorite") {
        // Météorite orange
        ctx.fillStyle = "#FF6347";
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#FF8C00";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (obj.type === "etoile") {
        // Étoile brillante
        ctx.fillStyle = "#00FFFF";
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const x = obj.x + Math.cos(angle) * obj.size * 0.5;
          const y = obj.y + Math.sin(angle) * obj.size * 0.5;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      } else if (obj.type === "satellite") {
        // Satellite cyan
        ctx.fillStyle = "#00CED1";
        ctx.fillRect(
          obj.x - obj.size * 0.3,
          obj.y - obj.size * 0.2,
          obj.size * 0.6,
          obj.size * 0.4
        );
        ctx.fillRect(
          obj.x - obj.size * 0.5,
          obj.y - obj.size * 0.1,
          obj.size * 0.2,
          obj.size * 0.2
        );
        ctx.fillRect(
          obj.x + obj.size * 0.3,
          obj.y - obj.size * 0.1,
          obj.size * 0.2,
          obj.size * 0.2
        );
      }

      ctx.restore();
    });

    if (gameState === "playing") {
      // Martien en combinaison spatiale avec animation de course
      const martianX = 100;
      const martianCenterY = martianY + MARTIAN_SIZE / 2;

      // Corps (combinaison blanche/grise)
      ctx.fillStyle = "#E0E0E0";
      ctx.fillRect(martianX + 10, martianCenterY - 10, 30, 35);

      // Jambes avec animation de course
      const legOffset = Math.sin(legAnimation) * 8;
      const legOffset2 = Math.sin(legAnimation + Math.PI) * 8;

      ctx.fillStyle = "#C0C0C0";
      // Jambe gauche
      ctx.fillRect(martianX + 15, martianCenterY + 25, 8, 15 + legOffset);
      // Jambe droite
      ctx.fillRect(martianX + 27, martianCenterY + 25, 8, 15 + legOffset2);

      // Bottes
      ctx.fillStyle = "#404040";
      ctx.fillRect(martianX + 13, martianCenterY + 38 + legOffset, 12, 6);
      ctx.fillRect(martianX + 25, martianCenterY + 38 + legOffset2, 12, 6);

      // Bras
      ctx.fillStyle = "#D0D0D0";
      ctx.fillRect(martianX + 8, martianCenterY, 8, 20);
      ctx.fillRect(martianX + 34, martianCenterY, 8, 20);

      // Casque transparent
      ctx.fillStyle = "rgba(173, 216, 230, 0.3)";
      ctx.beginPath();
      ctx.arc(martianX + 25, martianCenterY - 20, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#A0A0A0";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Tête verte du martien visible dans le casque
      ctx.fillStyle = "#00FF00";
      ctx.beginPath();
      ctx.arc(martianX + 25, martianCenterY - 20, 15, 0, Math.PI * 2);
      ctx.fill();

      // Yeux noirs
      ctx.fillStyle = "black";
      ctx.beginPath();
      ctx.arc(martianX + 20, martianCenterY - 22, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(martianX + 30, martianCenterY - 22, 3, 0, Math.PI * 2);
      ctx.fill();

      // Antennes sur le casque
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

      // Boules d'antennes
      ctx.fillStyle = "#00FF00";
      ctx.beginPath();
      ctx.arc(martianX + 15, martianCenterY - 42, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(martianX + 35, martianCenterY - 42, 3, 0, Math.PI * 2);
      ctx.fill();

      // Visière réfléchissante
      ctx.fillStyle = "rgba(135, 206, 250, 0.4)";
      ctx.fillRect(martianX + 15, martianCenterY - 25, 20, 8);

      // Obstacles avec couleurs distinctes
      obstacles.forEach((obs) => {
        ctx.save();
        ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);

        if (obs.type === "satellite") {
          // Satellite argenté brillant
          ctx.fillStyle = "#C0C0C0";
          ctx.fillRect(-20, -10, 40, 20);
          ctx.fillStyle = "#FFD700";
          ctx.fillRect(-25, -5, 10, 10);
          ctx.fillRect(15, -5, 10, 10);
          ctx.fillStyle = "#FF4500";
          ctx.fillRect(-5, -3, 10, 6);
        } else if (obs.type === "rock") {
          // Rocher rouge-orange
          ctx.fillStyle = "#CD5C5C";
          ctx.beginPath();
          ctx.arc(0, 0, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#8B4513";
          ctx.beginPath();
          ctx.arc(-5, -5, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (obs.type === "robot") {
          // Robot rouge vif
          ctx.fillStyle = "#FF0000";
          ctx.fillRect(-15, -20, 30, 35);
          ctx.fillStyle = "#FFFF00";
          ctx.fillRect(-10, -15, 8, 8);
          ctx.fillRect(2, -15, 8, 8);
          ctx.fillStyle = "#00FF00";
          ctx.fillRect(-8, -5, 16, 3);
        } else if (obs.type === "drone") {
          // Drone bleu électrique
          ctx.fillStyle = "#0000FF";
          ctx.fillRect(-20, -5, 40, 10);
          ctx.fillStyle = "#00FFFF";
          ctx.fillRect(-25, -2, 8, 4);
          ctx.fillRect(17, -2, 8, 4);
          ctx.fillStyle = "#FF0000";
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });
    }
  }, [gameState, martianY, obstacles, backgroundObjects, legAnimation]);

  // Écran d'authentification
  if (!isAuthenticated || showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-red-900 to-orange-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-6 sm:p-8 max-w-md w-full border-2 border-orange-500">
          <div className="text-center mb-6">
            {/* Logo tête de martien */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 relative">
              <div className="absolute inset-0 bg-green-500 rounded-full"></div>
              <div className="absolute top-2 left-6 w-3 h-3 bg-black rounded-full"></div>
              <div className="absolute top-2 right-6 w-3 h-3 bg-black rounded-full"></div>
              <div className="absolute -top-2 left-4 w-1 h-6 bg-green-500"></div>
              <div className="absolute -top-2 right-4 w-1 h-6 bg-green-500"></div>
              <div className="absolute -top-3 left-3.5 w-2 h-2 bg-green-400 rounded-full"></div>
              <div className="absolute -top-3 right-3.5 w-2 h-2 bg-green-400 rounded-full"></div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-green-400 tracking-wider">
              MARTIAN
            </h1>
            <p className="text-sm sm:text-base text-gray-300">
              Jeu de Course Martien
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {authMode === "register" && (
              <>
                <input
                  type="text"
                  placeholder="Nom"
                  value={authData.nom}
                  onChange={(e) =>
                    setAuthData({ ...authData, nom: e.target.value })
                  }
                  className="w-full p-2 sm:p-3 bg-gray-700 text-white rounded border border-gray-600 text-sm sm:text-base"
                />
                <input
                  type="text"
                  placeholder="Prénom"
                  value={authData.prenom}
                  onChange={(e) =>
                    setAuthData({ ...authData, prenom: e.target.value })
                  }
                  className="w-full p-2 sm:p-3 bg-gray-700 text-white rounded border border-gray-600 text-sm sm:text-base"
                />
                <input
                  type="number"
                  placeholder="Âge"
                  value={authData.age}
                  onChange={(e) =>
                    setAuthData({ ...authData, age: e.target.value })
                  }
                  className="w-full p-2 sm:p-3 bg-gray-700 text-white rounded border border-gray-600 text-sm sm:text-base"
                />
                <input
                  type="tel"
                  placeholder="Numéro de téléphone"
                  value={authData.tel}
                  onChange={(e) =>
                    setAuthData({ ...authData, tel: e.target.value })
                  }
                  className="w-full p-2 sm:p-3 bg-gray-700 text-white rounded border border-gray-600 text-sm sm:text-base"
                />
              </>
            )}

            {authMode !== "forgot" && (
              <>
                <input
                  type="email"
                  placeholder="Email"
                  value={authData.email}
                  onChange={(e) =>
                    setAuthData({ ...authData, email: e.target.value })
                  }
                  className="w-full p-2 sm:p-3 bg-gray-700 text-white rounded border border-gray-600 text-sm sm:text-base"
                />
                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={authData.password}
                  onChange={(e) =>
                    setAuthData({ ...authData, password: e.target.value })
                  }
                  className="w-full p-2 sm:p-3 bg-gray-700 text-white rounded border border-gray-600 text-sm sm:text-base"
                />
              </>
            )}

            {authMode === "forgot" && (
              <input
                type="email"
                placeholder="Email ou Téléphone"
                value={authData.email}
                onChange={(e) =>
                  setAuthData({ ...authData, email: e.target.value })
                }
                className="w-full p-2 sm:p-3 bg-gray-700 text-white rounded border border-gray-600 text-sm sm:text-base"
              />
            )}

            <button
              onClick={handleAuth}
              className="w-full bg-green-600 active:bg-green-700 text-white font-bold py-2 sm:py-3 rounded text-sm sm:text-base"
            >
              {authMode === "register"
                ? "S'inscrire"
                : authMode === "login"
                ? "Se connecter"
                : "Réinitialiser"}
            </button>
          </div>

          <div className="mt-4 text-center space-y-2">
            {authMode === "login" && (
              <>
                <button
                  onClick={() => setAuthMode("register")}
                  className="text-orange-400 hover:underline block w-full text-sm sm:text-base"
                >
                  Créer un compte
                </button>
                <button
                  onClick={() => setAuthMode("forgot")}
                  className="text-orange-400 hover:underline block w-full text-sm sm:text-base"
                >
                  Mot de passe oublié?
                </button>
              </>
            )}
            {authMode !== "login" && (
              <button
                onClick={() => setAuthMode("login")}
                className="text-orange-400 hover:underline block w-full text-sm sm:text-base"
              >
                Retour à la connexion
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-red-900 to-orange-900 p-2 sm:p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-2 sm:mb-4">
        <div className="bg-gray-800 rounded-lg p-2 sm:p-4 border-2 border-orange-500">
          {/* Version Mobile */}
          <div className="flex md:hidden items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Logo mini tête martien */}
              <div className="w-8 h-8 relative flex-shrink-0">
                <div className="absolute inset-0 bg-green-500 rounded-full"></div>
                <div className="absolute top-1 left-2 w-1.5 h-1.5 bg-black rounded-full"></div>
                <div className="absolute top-1 right-2 w-1.5 h-1.5 bg-black rounded-full"></div>
                <div className="absolute -top-1 left-1.5 w-0.5 h-3 bg-green-500"></div>
                <div className="absolute -top-1 right-1.5 w-0.5 h-3 bg-green-500"></div>
                <div className="absolute -top-1.5 left-1 w-1 h-1 bg-green-400 rounded-full"></div>
                <div className="absolute -top-1.5 right-1 w-1 h-1 bg-green-400 rounded-full"></div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-green-400 tracking-wide">
                  MARTIAN
                </h1>
                <p className="text-xs text-gray-300">1 Nso = 100 FCFA</p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-gray-400">Solde</div>
              <div className="text-sm font-bold text-green-400">
                {balance.toFixed(2)} Nso
              </div>
            </div>
          </div>

          {/* Boutons Mobile */}
          <div className="flex md:hidden gap-2 mt-2">
            <button
              onClick={() => setShowDeposit(true)}
              className="flex-1 bg-blue-600 active:bg-blue-700 px-3 py-2 rounded text-white text-sm"
            >
              💳 Dépôt
            </button>

            <button
              onClick={() => setShowWithdraw(true)}
              className="flex-1 bg-purple-600 active:bg-purple-700 px-3 py-2 rounded text-white text-sm"
            >
              💸 Retrait
            </button>

            <button
              onClick={() => {
                setIsAuthenticated(false);
                setShowAuth(true);
              }}
              className="bg-red-600 active:bg-red-700 p-2 rounded text-white"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Version Desktop */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo tête martien desktop */}
              <div className="w-12 h-12 relative">
                <div className="absolute inset-0 bg-green-500 rounded-full"></div>
                <div className="absolute top-2 left-3 w-2 h-2 bg-black rounded-full"></div>
                <div className="absolute top-2 right-3 w-2 h-2 bg-black rounded-full"></div>
                <div className="absolute -top-1 left-2 w-1 h-5 bg-green-500"></div>
                <div className="absolute -top-1 right-2 w-1 h-5 bg-green-500"></div>
                <div className="absolute -top-2 left-1.5 w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                <div className="absolute -top-2 right-1.5 w-1.5 h-1.5 bg-green-400 rounded-full"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-green-400 tracking-wider">
                  MARTIAN
                </h1>
                <p className="text-sm text-gray-300">1 Nso = 100 FCFA</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-400">Solde</div>
                <div className="text-xl font-bold text-green-400">
                  {balance.toFixed(2)} Nso
                </div>
              </div>

              <button
                onClick={() => setShowDeposit(true)}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
              >
                Dépôt
              </button>

              <button
                onClick={() => setShowWithdraw(true)}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-white"
              >
                Retrait
              </button>

              <button
                onClick={() => {
                  setIsAuthenticated(false);
                  setShowAuth(true);
                }}
                className="bg-red-600 hover:bg-red-700 p-2 rounded text-white"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Zone de jeu */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-2 sm:p-4 border-2 border-orange-500">
          {/* Canvas */}
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={800}
              height={400}
              onClick={jump}
              onTouchStart={(e) => {
                e.preventDefault();
                jump();
              }}
              className="w-full border-2 border-gray-700 rounded cursor-pointer touch-none"
              style={{ maxHeight: "50vh" }}
            />
            {gameState === "playing" && (
              <div className="absolute top-2 left-2 bg-black bg-opacity-60 rounded px-3 py-1">
                <div className="text-yellow-400 font-bold text-sm sm:text-base">
                  x{multiplier.toFixed(5)}
                </div>
              </div>
            )}
          </div>

          {/* Contrôles */}
          <div className="mt-2 sm:mt-4 grid grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-gray-700 p-2 sm:p-4 rounded">
              <div className="text-xs sm:text-sm text-gray-400">
                Multiplicateur
              </div>
              <div className="text-lg sm:text-3xl font-bold text-yellow-400">
                x{multiplier.toFixed(3)}
              </div>
              {!canWithdraw && gameState === "playing" && (
                <div className="text-xs text-red-400 mt-1">Min: x2.00</div>
              )}
            </div>

            <div className="bg-gray-700 p-2 sm:p-4 rounded">
              <div className="text-xs sm:text-sm text-gray-400">Mise</div>
              {gameState === "menu" ? (
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) =>
                    setBetAmount(Math.max(1, parseFloat(e.target.value) || 1))
                  }
                  className="w-full bg-gray-600 text-white p-1 sm:p-2 rounded mt-1 text-sm sm:text-base"
                  step="0.5"
                  min="1"
                />
              ) : (
                <div className="text-lg sm:text-2xl font-bold text-white">
                  {betAmount} Nso
                </div>
              )}
            </div>

            <div className="bg-gray-700 p-2 sm:p-4 rounded">
              <div className="text-xs sm:text-sm text-gray-400">
                Gain potentiel
              </div>
              <div className="text-lg sm:text-2xl font-bold text-green-400">
                {potentialWin.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="mt-2 sm:mt-4 flex gap-2 sm:gap-4">
            {gameState === "menu" && (
              <button
                onClick={startGame}
                className="flex-1 bg-green-600 active:bg-green-700 text-white font-bold py-3 sm:py-4 rounded text-base sm:text-xl"
              >
                🚀 Jouer ({betAmount} Nso)
              </button>
            )}

            {gameState === "playing" && (
              <>
                <button
                  onClick={jump}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    jump();
                  }}
                  className="flex-1 bg-blue-600 active:bg-blue-700 text-white font-bold py-3 sm:py-4 rounded text-base sm:text-xl"
                >
                  ⬆️ Sauter
                </button>
                <button
                  onClick={cashOut}
                  disabled={!canWithdraw}
                  className={`flex-1 ${
                    canWithdraw
                      ? "bg-yellow-600 active:bg-yellow-700"
                      : "bg-gray-600"
                  } text-white font-bold py-3 sm:py-4 rounded text-base sm:text-xl disabled:opacity-50`}
                >
                  💰 Retirer
                </button>
              </>
            )}

            {gameState === "gameover" && (
              <button
                onClick={() => setGameState("menu")}
                className="flex-1 bg-orange-600 active:bg-orange-700 text-white font-bold py-3 sm:py-4 rounded text-base sm:text-xl"
              >
                🔄 Rejouer
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="mt-2 sm:mt-4 flex gap-2 sm:gap-4 text-center">
            <div className="flex-1 bg-gray-700 p-2 rounded">
              <div className="text-xs text-gray-400">Score</div>
              <div className="text-base sm:text-lg font-bold text-white">
                {score}
              </div>
            </div>
            <div className="flex-1 bg-gray-700 p-2 rounded">
              <div className="text-xs text-gray-400">Record</div>
              <div className="text-base sm:text-lg font-bold text-yellow-400">
                x{highScore.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Dépôt */}
      {showDeposit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6 max-w-md w-full border-2 border-blue-500 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-white">
                💳 Dépôt
              </h3>
              <button
                onClick={() => setShowDeposit(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-xs sm:text-sm text-gray-400">
                  Montant (FCFA)
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full p-2 sm:p-3 bg-gray-700 text-white rounded mt-1 text-sm sm:text-base"
                  placeholder="Min: 100, Max: 50000"
                />
                <div className="text-xs text-gray-400 mt-1">
                  = {(parseFloat(depositAmount) / 100 || 0).toFixed(2)} Nso
                </div>
              </div>
              <div className="bg-gray-700 p-3 sm:p-4 rounded">
                <p className="text-xs sm:text-sm text-gray-300 mb-2">
                  🔌 API Opérateur de paiement
                </p>
                <div className="text-xs text-gray-400">
                  Orange Money, MTN Mobile Money, Moov Money
                </div>
              </div>
              <button
                onClick={handleDeposit}
                className="w-full bg-blue-600 active:bg-blue-700 text-white font-bold py-2 sm:py-3 rounded text-sm sm:text-base"
              >
                Confirmer le dépôt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Retrait */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6 max-w-md w-full border-2 border-purple-500 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-white">
                💸 Retrait
              </h3>
              <button
                onClick={() => setShowWithdraw(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-xs sm:text-sm text-gray-400">
                  Montant (Nso)
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full p-2 sm:p-3 bg-gray-700 text-white rounded mt-1 text-sm sm:text-base"
                  placeholder="Min: 10, Max: 1000"
                />
                <div className="text-xs text-gray-400 mt-1">
                  = {(parseFloat(withdrawAmount) * 100 || 0).toFixed(0)} FCFA
                </div>
              </div>
              <div className="bg-gray-700 p-3 sm:p-4 rounded">
                <p className="text-xs sm:text-sm text-gray-300 mb-2">
                  💼 Solde disponible
                </p>
                <div className="text-lg sm:text-xl font-bold text-green-400">
                  {balance.toFixed(2)} Nso
                </div>
              </div>
              <button
                onClick={handleWithdraw}
                className="w-full bg-purple-600 active:bg-purple-700 text-white font-bold py-2 sm:py-3 rounded text-sm sm:text-base"
              >
                Confirmer le retrait
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="max-w-4xl mx-auto mt-2 sm:mt-4 bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
        <h3 className="text-base sm:text-lg font-bold text-green-400 mb-2">
          🎮 Comment jouer MARTIAN
        </h3>
        <ul className="text-xs sm:text-sm text-gray-300 space-y-1">
          <li>
            • Le jeu démarre facilement puis devient progressivement plus
            difficile
          </li>
          <li>
            • <strong>Mobile :</strong> Touchez l'écran pour sauter
          </li>
          <li>
            • <strong>Desktop :</strong> Cliquez ou appuyez sur ESPACE
          </li>
          <li>
            • Observez les objets de fond (OVNIs, météorites) pour voir votre
            vitesse
          </li>
          <li>
            • Évitez les obstacles colorés : Satellites (gris), Rochers (rouge),
            Robots (rouge vif), Drones (bleu)
          </li>
          <li>• Atteignez x2.00 minimum pour pouvoir retirer vos gains</li>
          <li>
            • Plus vous survivez longtemps, plus les obstacles sont rapides !
          </li>
        </ul>
      </div>
    </div>
  );
};

export default MarsRunnerGame;
