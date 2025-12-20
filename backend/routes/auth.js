const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth"); // ✅ CORRIGÉ
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateUpdateProfile,
  validateChangePassword,
} = require("../middleware/validator");

/**
 * @route   POST /api/auth/register
 * @desc    Inscription d'un nouvel utilisateur
 * @access  Public
 */
router.post("/register", validateRegister, AuthController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Connexion utilisateur
 * @access  Public
 */
router.post("/login", validateLogin, AuthController.login);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Demande de réinitialisation de mot de passe
 * @access  Public
 */
router.post(
  "/forgot-password",
  validateForgotPassword,
  AuthController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Réinitialiser le mot de passe
 * @access  Public
 */
router.post("/reset-password", AuthController.resetPassword);

/**
 * @route   GET /api/auth/profile
 * @desc    Obtenir le profil de l'utilisateur connecté
 * @access  Private
 */
router.get("/profile", authenticate, AuthController.getProfile); // ✅ CORRIGÉ

/**
 * @route   PUT /api/auth/profile
 * @desc    Mettre à jour le profil
 * @access  Private
 */
router.put(
  "/profile",
  authenticate, // ✅ CORRIGÉ
  validateUpdateProfile,
  AuthController.updateProfile
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Changer le mot de passe
 * @access  Private
 */
router.post(
  "/change-password",
  authenticate, // ✅ CORRIGÉ
  validateChangePassword,
  AuthController.changePassword
);

/**
 * @route   POST /api/auth/logout
 * @desc    Déconnexion
 * @access  Private
 */
router.post("/logout", authenticate, AuthController.logout); // ✅ CORRIGÉ

module.exports = router;
