// ============================================
// middleware/auth.js - VERSION COMPLÈTE
// ============================================

const jwt = require("jsonwebtoken");
const { query } = require("../config/database");

/**
 * ✅ Middleware pour authentifier un utilisateur
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token d'authentification requis",
      });
    }

    jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
      async (err, decoded) => {
        if (err) {
          return res.status(403).json({
            success: false,
            message: "Token invalide ou expiré",
          });
        }

        const userId = decoded.userId || decoded.id || decoded.user_id;

        const users = await query(
          "SELECT id, email, prenom, nom, balance_mz, new_player_bonus_locked FROM users WHERE id = ?",
          [userId]
        );

        if (users.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Utilisateur non trouvé",
          });
        }

        req.user = users[0];
        next();
      }
    );
  } catch (error) {
    console.error("❌ Erreur auth:", error);
    res.status(500).json({
      success: false,
      message: "Erreur d'authentification",
    });
  }
}

/**
 * ✅ Middleware pour authentification OPTIONNELLE (NOUVEAU)
 * Permet l'accès même sans token, mais attache req.user si le token existe
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    // Si pas de token, continuer sans utilisateur
    if (!token) {
      req.user = null;
      return next();
    }

    // Si token présent, essayer de l'authentifier
    jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
      async (err, decoded) => {
        if (err) {
          // Token invalide, continuer sans utilisateur
          req.user = null;
          return next();
        }

        const userId = decoded.userId || decoded.id || decoded.user_id;

        const users = await query(
          "SELECT id, email, prenom, nom, balance_mz, new_player_bonus_locked FROM users WHERE id = ?",
          [userId]
        );

        if (users.length > 0) {
          req.user = users[0];
        } else {
          req.user = null;
        }

        next();
      }
    );
  } catch (error) {
    console.error("❌ Erreur optionalAuth:", error);
    req.user = null;
    next();
  }
}

/**
 * ✅ Middleware pour vérifier si l'utilisateur est admin
 */
function isAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Non authentifié",
    });
  }

  if (req.user.role !== "admin" && !req.user.is_admin) {
    return res.status(403).json({
      success: false,
      message: "Accès admin requis",
    });
  }

  next();
}

module.exports = {
  authenticate,
  optionalAuth, // ✅ EXPORTER LA NOUVELLE FONCTION
  isAdmin,
};
