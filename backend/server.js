// =============================================
// server.js - VERSION PRODUCTION POUR RENDER
// =============================================

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

// ✅ IMPORTS
const authRoutes = require("./routes/auth");
const gameRoutes = require("./routes/game");
const walletRoutes = require("./routes/wallet");
const referralRoutes = require("./routes/referral");
const paymentRoutes = require("./routes/manualpayment");
const adminRoutes = require("./routes/admin");

// Initialisation serveur
const app = express();
const server = http.createServer(app);

const { testConnection } = require("./config/database");

(async () => {
  const ok = await testConnection();
  if (!ok) {
    console.error("🛑 Impossible de démarrer sans MySQL");
    process.exit(1);
  }
})();

// ============================================
// SOCKET.IO CONFIGURATION
// ============================================
const io = new Server(server, {
  cors: {
    origin: ["https://marsrunner.netlify.app", "http://localhost:5000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

console.log("✅ Socket.IO initialisé avec CORS pour Netlify");

// ============================================
// MIDDLEWARE GLOBAL
// ============================================

// CORS
app.use(
  cors({
    origin: [
      "https://marsrunner.netlify.app",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Body parsing
app.use(express.json());
app.use(morgan("dev"));

// Sécurité
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// ============================================
// ROUTES API
// ============================================
app.use("/api/auth", authRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/referral", referralRoutes);
app.use("/api/manualpayment", paymentRoutes);
app.use("/api/admin", adminRoutes);

// ============================================
// ROUTES STANDARD
// ============================================

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "production",
  });
});

// Route racine (API info)
app.get("/", (req, res) => {
  res.json({
    name: "Mars Runner API",
    version: "1.0.0",
    status: "active",
    socketIO: "enabled",
    endpoints: {
      auth: "/api/auth",
      game: "/api/game",
      wallet: "/api/wallet",
      referral: "/api/referral",
      payment: "/api/manualpayment",
      admin: "/api/admin",
    },
    documentation: "Contact admin for API docs",
  });
});

// ============================================
// SOCKET.IO HANDLER
// ============================================
const socketHandler = require("./socket/socketHandler");
socketHandler(io);

// Rendre io disponible aux routes (si nécessaire)
app.set("io", io);

// ============================================
// ERROR HANDLING
// ============================================
const { errorHandler } = require("./middleware/errorHandler");
app.use(errorHandler);

// 404 Handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      "/",
      "/health",
      "/api/auth",
      "/api/game",
      "/api/wallet",
      "/api/referral",
      "/api/manualpayment",
      "/api/admin",
    ],
  });
});

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔═══════════════════════════════════════════╗
║  🚀 SERVEUR MARS RUNNER EN LIGNE 🚀      ║
╚═══════════════════════════════════════════╝

🌐 URL:        https://mars-runner-backend.onrender.com
📍 Port:       ${PORT}
🔌 Socket.IO:  ✅ Actif
🛡️  Sécurité:   ✅ Helmet + CORS
📊 Logs:       ✅ Morgan activé
🌍 CORS:       ✅ Netlify autorisé

Environment:   ${process.env.NODE_ENV || "development"}
Database:      ${process.env.DB_HOST ? "✅ Connecté" : "⚠️  Non configuré"}

  `);
});

// Gestion propre de l'arrêt
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM reçu, fermeture du serveur...");
  server.close(() => {
    console.log("✅ Serveur fermé proprement");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("🛑 SIGINT reçu, fermeture du serveur...");
  server.close(() => {
    console.log("✅ Serveur fermé proprement");
    process.exit(0);
  });
});
