const { ERROR_CODES, ERROR_MESSAGES } = require("../utils/constants");
// Supposons que AppError est un helper

/**
 * Classe AppError pour les erreurs personnalisées
 */
class AppError extends Error {
  constructor(message, errorCode, statusCode = 400) {
    super(message);
    this.name = this.constructor.name;
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware de gestion centralisée des erreurs
 */
const errorHandler = (err, req, res, next) => {
  console.error("❌ Erreur capturée:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  });

  // Erreur de validation (issue d'express-validator)
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Erreur de validation",
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      errors: err.errors,
      data: null,
    });
  }

  // Erreur JWT (JsonWebTokenError)
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: ERROR_MESSAGES[ERROR_CODES.AUTH_TOKEN_INVALID],
      errorCode: ERROR_CODES.AUTH_TOKEN_INVALID,
      data: null,
    });
  }

  // Erreur JWT (TokenExpiredError)
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: ERROR_MESSAGES[ERROR_CODES.AUTH_TOKEN_EXPIRED],
      errorCode: ERROR_CODES.AUTH_TOKEN_EXPIRED,
      data: null,
    });
  }

  // Erreur MySQL
  if (err.code && err.code.startsWith("ER_")) {
    let message = "Erreur de base de données";

    // Violation de contrainte unique (ex: email, téléphone)
    if (err.code === "ER_DUP_ENTRY") {
      if (err.message.includes("email")) {
        message = ERROR_MESSAGES[ERROR_CODES.AUTH_EMAIL_EXISTS];
      } else if (err.message.includes("telephone")) {
        message = ERROR_MESSAGES[ERROR_CODES.AUTH_PHONE_EXISTS];
      } else {
        message = "Cette valeur existe déjà";
      }
    }

    // Autres erreurs MySQL courantes (ex: connexion perdue, champs manquants)
    if (err.code === "ER_NO_SUCH_TABLE" || err.code === "ER_BAD_FIELD_ERROR") {
      message = "Problème de structure de base de données.";
    }

    return res.status(400).json({
      success: false,
      message,
      errorCode: ERROR_CODES.DATABASE_ERROR,
      data: null,
    });
  }

  // Erreur personnalisée AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
      data: null,
    });
  }

  // Erreur générique
  return res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Erreur serveur interne",
    errorCode: ERROR_CODES.SERVER_ERROR,
    data: null,
  });
};

// ✅ NOUVEAU
module.exports = {
  errorHandler,
  AppError, // Ajoutez l'export si vous l'utilisez ailleurs
};
