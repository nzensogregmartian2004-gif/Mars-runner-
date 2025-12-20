// ===========================================
// middleware/validator.js - VERSION COMPLÈTE CORRIGÉE
// ============================================

const { body, validationResult } = require("express-validator");
const { errorResponse } = require("../utils/helpers");
const {
  ERROR_CODES,
  REGEX,
  LIMITS,
  GAME_CONSTANTS,
} = require("../utils/constants");

/**
 * Middleware pour gérer les erreurs de validation
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Extraire seulement le premier message d'erreur pour une réponse plus simple
    const firstError = errors.array()[0].msg;
    return errorResponse(res, firstError, ERROR_CODES.VALIDATION_ERROR, 400);
  }

  next();
};

/**
 * Validations pour l'inscription
 */
const validateRegister = [
  body("nom")
    .trim()
    .notEmpty()
    .withMessage("Le nom est requis")
    .isLength({ min: 2, max: 100 })
    .withMessage("Le nom doit faire entre 2 et 100 caractères"),

  body("prenom")
    .trim()
    .notEmpty()
    .withMessage("Le prénom est requis")
    .isLength({ min: 2, max: 100 })
    .withMessage("Le prénom doit faire entre 2 et 100 caractères"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("L'email est requis")
    .isEmail()
    .withMessage("L'email doit être valide"),

  body("telephone")
    .trim()
    .notEmpty()
    .withMessage("Le numéro de téléphone est requis")
    .matches(REGEX.PHONE_GABON)
    .withMessage("Numéro de téléphone invalide (Format Gabon)"),

  body("password")
    .notEmpty()
    .withMessage("Le mot de passe est requis")
    .isLength({ min: 6 })
    .withMessage("Le mot de passe doit contenir au moins 6 caractères"),

  body("age")
    .notEmpty()
    .withMessage("L'âge est requis")
    .isInt({ min: 18 })
    .withMessage("Vous devez avoir au moins 18 ans"),

  body("referralCode")
    .optional({ nullable: true, checkFalsy: true }) // Rendre le code optionnel
    .matches(REGEX.REFERRAL_CODE)
    .withMessage("Le code de parrainage est invalide"),

  handleValidationErrors,
];

/**
 * Validations pour la connexion
 */
const validateLogin = [
  body("email")
    .notEmpty()
    .withMessage("L'email est requis")
    .isEmail()
    .withMessage("Email invalide"),
  body("password").notEmpty().withMessage("Le mot de passe est requis"),
  handleValidationErrors,
];

/**
 * Validations pour la mise à jour de profil
 */
const validateUpdateProfile = [
  body("nom")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Le nom doit faire entre 2 et 100 caractères"),

  body("prenom")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Le prénom doit faire entre 2 et 100 caractères"),

  body("telephone")
    .optional()
    .trim()
    .matches(REGEX.PHONE_GABON)
    .withMessage("Numéro de téléphone invalide (Format Gabon)"),

  body("age")
    .optional()
    .isInt({ min: 18 })
    .withMessage("Vous devez avoir au moins 18 ans"),

  handleValidationErrors,
];

/**
 * Validations pour le changement de mot de passe
 */
const validateChangePassword = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Le mot de passe actuel est requis"),

  body("newPassword")
    .notEmpty()
    .withMessage("Le nouveau mot de passe est requis")
    .isLength({ min: 6 })
    .withMessage("Le nouveau mot de passe doit contenir au moins 6 caractères"),

  handleValidationErrors,
];

/**
 * Validations pour la demande de mot de passe oublié
 */
const validateForgotPassword = [
  body("email")
    .notEmpty()
    .withMessage("L'email est requis")
    .isEmail()
    .withMessage("Email invalide"),
  handleValidationErrors,
];

/**
 * Validations pour le démarrage de partie
 */
const validateStartGame = [
  body("betAmount")
    .notEmpty()
    .withMessage("Le montant de la mise est requis")
    .isFloat({ min: LIMITS.BET.MIN_MZ, max: LIMITS.BET.MAX_MZ })
    .withMessage(
      `La mise doit être entre ${LIMITS.BET.MIN_MZ} et ${LIMITS.BET.MAX_MZ} MZ`
    ),
  handleValidationErrors,
];

/**
 * Validations pour le cash out (API REST)
 */
const validateCashOut = [
  body("gameId")
    .notEmpty()
    .withMessage("L'ID de la partie est requis")
    .isInt()
    .withMessage("ID de partie invalide"),
  body("multiplier")
    .notEmpty()
    .withMessage("Le multiplicateur est requis")
    .isFloat({ min: GAME_CONSTANTS.MIN_MULTIPLIER_WITHDRAW })
    .withMessage(
      `Multiplicateur minimum requis: x${GAME_CONSTANTS.MIN_MULTIPLIER_WITHDRAW}`
    ),
  handleValidationErrors,
];

/**
 * Validations pour le dépôt
 */
const validateDeposit = [
  body("amount") // En FCFA pour l'API
    .notEmpty()
    .withMessage("Le montant est requis")
    .isFloat({ min: LIMITS.DEPOSIT.MIN_FCFA, max: LIMITS.DEPOSIT.MAX_FCFA })
    .withMessage(
      `Le montant doit être entre ${LIMITS.DEPOSIT.MIN_FCFA} et ${LIMITS.DEPOSIT.MAX_FCFA} FCFA`
    ),

  body("paymentMethod")
    .notEmpty()
    .withMessage("La méthode de paiement est requise")
    .isIn(["orange_money", "mtn_money", "moov_money"]) // Ajuster selon les méthodes
    .withMessage("Méthode de paiement invalide"),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Le numéro de téléphone est requis")
    .matches(REGEX.PHONE_GABON)
    .withMessage("Numéro de téléphone invalide"),

  handleValidationErrors,
];

/**
 * Validations pour le retrait
 */
const validateWithdraw = [
  body("amount") // En MZ pour l'API
    .notEmpty()
    .withMessage("Le montant est requis")
    .isFloat({ min: LIMITS.WITHDRAW.MIN_MZ, max: LIMITS.WITHDRAW.MAX_MZ })
    .withMessage(
      `Le montant doit être entre ${LIMITS.WITHDRAW.MIN_MZ} et ${LIMITS.WITHDRAW.MAX_MZ} MZ`
    ),

  body("paymentMethod")
    .notEmpty()
    .withMessage("La méthode de paiement est requise")
    .isIn(["orange_money", "mtn_money", "moov_money"])
    .withMessage("Méthode de paiement invalide"),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Le numéro de téléphone est requis")
    .matches(REGEX.PHONE_GABON)
    .withMessage("Numéro de téléphone invalide"),

  handleValidationErrors,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
  validateForgotPassword,
  validateStartGame,
  validateCashOut,
  validateDeposit,
  validateWithdraw,
};
