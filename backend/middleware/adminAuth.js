// ============================================
// middleware/adminAuth.js - VERSION CORRIGÉE
// ============================================

const jwt = require("jsonwebtoken");

/**
 * ✅ Middleware pour authentifier un admin
 */
function authenticateAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Token manquant",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token invalide",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    // Vérifier que c'est un admin
    if (!decoded.isAdmin && decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Accès interdit - Admin requis",
      });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    console.error("❌ Erreur auth admin:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expiré",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Token invalide",
    });
  }
}

module.exports = {
  authenticateAdmin,
};
