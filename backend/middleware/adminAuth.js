// ============================================
// middleware/adminAuth.js - VERSION AMÉLIORÉE
// ============================================

const jwt = require("jsonwebtoken");

/**
 * ✅ Middleware pour authentifier un admin
 * Ajoute des vérifications supplémentaires et journalisation.
 */
function authenticateAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // Vérification de la présence du header Authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("🔒 Tentative d'accès sans token valide");
      return res.status(401).json({
        success: false,
        message: "Token manquant ou mal formaté",
      });
    }

    // Récupération du token dans le header
    const token = authHeader.split(" ")[1];

    if (!token) {
      console.warn("❌ Aucun token extrait du header Authorization");
      return res.status(401).json({
        success: false,
        message: "Token invalide",
      });
    }

    // Vérification et décryptage du token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    // Vérifiez si l'utilisateur/deux critères d'authentification admin sont présents
    if (!decoded.isAdmin && decoded.role !== "admin") {
      console.warn(
        `⛔ Tentative d'accès non autorisé - ID: ${decoded.id || "inconnu"}`
      );
      return res.status(403).json({
        success: false,
        message: "Accès interdit - Privilèges d'administrateur requis",
      });
    }

    // Stocker les informations dans req pour une utilisation ultérieure
    req.admin = decoded;

    // Passer au middleware suivant si les vérifications passent
    next();
  } catch (error) {
    console.error("❌ Erreur durant l'authentification admin:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Le token a expiré, veuillez vous reconnecter",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Token invalide ou signature incorrecte",
    });
  }
}

module.exports = {
  authenticateAdmin,
};
