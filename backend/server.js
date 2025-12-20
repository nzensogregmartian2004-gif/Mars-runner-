// =============================================
// server.js - VERSION CORRIGÉE & FINALE
// =============================================

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
require("dotenv").config();

// ✅ IMPORTS - ORGANISATION CLAIRE
const authRoutes = require("./routes/auth");
const gameRoutes = require("./routes/game");
const walletRoutes = require("./routes/wallet");
const referralRoutes = require("./routes/referral");
const paymentRoutes = require("./routes/manualpayment");
const adminRoutes = require("./routes/admin");

// Initialisation serveur
const app = express();
const server = http.createServer(app);

// ============================================
// SOCKET.IO CONFIGURATION
// ============================================
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ============================================
// MIDDLEWARE GLOBAL
// ============================================

// CORS - Une seule déclaration
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
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

// Fichiers statiques
// Utilise '..' pour remonter d'un niveau (sortir de backend)
app.use(express.static(path.join(__dirname, "..", "frontend", "public")));

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
  res.json({ status: "OK", timestamp: new Date() });
});

// Page d'accueil
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "public", "index.html"));
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

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔════════════════════════════════════════╗
║  🚀 SERVEUR MARS RUNNER EN LIGNE  🚀  ║
╚════════════════════════════════════════╝

📍 Local:       http://localhost:${PORT}
📱 Mobile:     http://TON_IP_LOCALE:${PORT}
🔌 Socket.IO:  ✅ Actif
🛡️  Sécurité:    ✅ Helmet activé
🌐 CORS:       ✅ Activé

  `);
});
