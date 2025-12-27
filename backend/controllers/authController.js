// ===========================================
// controllers/authController.js - CORRIGÉ ET DURCI
// ============================================

const User = require("../models/user");
const Referral = require("../models/referral");
const Transaction = require("../models/transaction");
const EmailService = require("../services/emailService");
const {
  generateToken,
  successResponse,
  errorResponse,
  getClientIp,
  getUserAgent,
} = require("../utils/helpers");

const constants = require("../utils/constants") || {};
const ERROR_CODES = constants.ERROR_CODES || {};
const ERROR_MESSAGES = constants.ERROR_MESSAGES || {};
const BONUS = constants.BONUS || { NEW_PLAYER: 5, SPONSOR: 1 };

const { query, transaction } = require("../config/database");

class AuthController {
  /**
   * Inscription - COMPLÈTE & CORRIGÉE
   */
  static async register(req, res, next) {
    try {
      const { nom, prenom, email, telephone, password, age, referralCode } =
        req.body;

      if (!email || !password) {
        return errorResponse(
          res,
          "Email et mot de passe requis",
          ERROR_CODES.AUTH_INVALID_PAYLOAD,
          400
        );
      }

      const normalizedEmail = String(email).toLowerCase();

      // 1. Vérifications d'existence AVANT la transaction
      const existingEmail = await User.findByEmail(normalizedEmail);
      if (existingEmail) {
        return errorResponse(
          res,
          ERROR_MESSAGES[ERROR_CODES.AUTH_EMAIL_EXISTS] || "Email déjà utilisé",
          ERROR_CODES.AUTH_EMAIL_EXISTS,
          409
        );
      }

      const existingPhone = telephone
        ? await User.findByPhone(telephone)
        : null;
      if (existingPhone) {
        return errorResponse(
          res,
          ERROR_MESSAGES[ERROR_CODES.AUTH_PHONE_EXISTS] ||
            "Téléphone déjà utilisé",
          ERROR_CODES.AUTH_PHONE_EXISTS,
          409
        );
      }

      // 2. Transaction DB atomique
      let newUser;
      await transaction(async (conn) => {
        // A. Créer l'utilisateur
        newUser = await User.create(
          {
            nom,
            prenom,
            email: normalizedEmail,
            telephone,
            password,
            age,
          },
          conn
        );

        if (!newUser || !newUser.id) {
          throw new Error("Impossible de créer l'utilisateur");
        }

        // B. Créer la transaction de bonus (log)
        await Transaction.createNewPlayerBonus(
          newUser.id,
          BONUS.NEW_PLAYER,
          conn
        );

        // C. Créditer le solde réel
        await conn.execute(
          `UPDATE users SET balance_mz = COALESCE(balance_mz, 0) + ? WHERE id = ?`,
          [BONUS.NEW_PLAYER, newUser.id]
        );

        // D. Gérer le parrainage si code fourni
        if (referralCode && referralCode.trim()) {
          const sponsor = await User.findByReferralCode(referralCode, conn);
          if (sponsor && sponsor.id !== newUser.id) {
            // Créer enregistrement parrainage
            const referralId = await Referral.create(
              sponsor.id,
              newUser.id,
              referralCode,
              conn
            );

            // Créer transaction bonus sponsor
            await Transaction.createReferralBonus(
              sponsor.id,
              BONUS.SPONSOR,
              newUser.id,
              conn
            );

            // Créditer sponsor
            await conn.execute(
              `UPDATE users SET balance_mz = COALESCE(balance_mz, 0) + ? WHERE id = ?`,
              [BONUS.SPONSOR, sponsor.id]
            );

            // Marquer bonus gagné dans referrals
            if (referralId) {
              await conn.execute(
                `UPDATE referrals SET bonus_earned_mz = ?, status = 'active' WHERE id = ?`,
                [BONUS.SPONSOR, referralId]
              );
            }
          }
        }
      }); // fin transaction

      // 3. Logs & Email (après transaction réussie)
      try {
        await query(
          `INSERT INTO activity_logs (user_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)`,
          [newUser.id, "register", getClientIp(req), getUserAgent(req)]
        );
      } catch (logErr) {
        console.warn("Impossible d'enregistrer activity_log:", logErr);
      }

      // send welcome async
      EmailService.sendWelcome(newUser).catch((err) =>
        console.error("Email Error:", err)
      );

      // 4. Récupérer user à jour avec balance
      const persistedUser = await User.findById(newUser.id);
      const token = generateToken({ userId: newUser.id });

      return successResponse(
        res,
        {
          token,
          user: User.sanitize(persistedUser),
          balance_mz: parseFloat(persistedUser.balance_mz || 0),
          referral_code: persistedUser.referral_code,
        },
        "Inscription réussie. Bonus crédité.",
        201
      );
    } catch (error) {
      console.error(
        "❌ Erreur register:",
        error && error.stack ? error.stack : error
      );
      // envoyer une réponse claire
      return errorResponse(
        res,
        error.message || "Erreur interne serveur lors de l'inscription",
        ERROR_CODES.GENERAL || "GENERAL_ERROR",
        500
      );
    }
  }

  /**
   * Connexion
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return errorResponse(
          res,
          "Email et mot de passe requis",
          ERROR_CODES.AUTH_INVALID_PAYLOAD,
          400
        );
      }

      const normalizedEmail = String(email).toLowerCase();

      const user = await User.findByEmail(normalizedEmail);
      if (!user) {
        return errorResponse(
          res,
          ERROR_MESSAGES[ERROR_CODES.AUTH_INVALID_CREDENTIALS] ||
            "Email ou mot de passe incorrect",
          ERROR_CODES.AUTH_INVALID_CREDENTIALS,
          401
        );
      }

      const isPasswordOk =
        typeof User.verifyPassword === "function"
          ? await User.verifyPassword(password, user.password)
          : false;

      if (!isPasswordOk) {
        return errorResponse(
          res,
          ERROR_MESSAGES[ERROR_CODES.AUTH_INVALID_CREDENTIALS] ||
            "Email ou mot de passe incorrect",
          ERROR_CODES.AUTH_INVALID_CREDENTIALS,
          401
        );
      }

      if (user.is_active === 0 || user.is_active === false) {
        return errorResponse(
          res,
          ERROR_MESSAGES[ERROR_CODES.AUTH_ACCOUNT_DISABLED] ||
            "Compte désactivé",
          ERROR_CODES.AUTH_ACCOUNT_DISABLED,
          403
        );
      }

      try {
        await query("UPDATE users SET last_login = NOW() WHERE id = ?", [
          user.id,
        ]);
        await query(
          `INSERT INTO activity_logs (user_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)`,
          [user.id, "login", getClientIp(req), getUserAgent(req)]
        );
      } catch (logErr) {
        console.warn("Impossible d'enregistrer activity_log login:", logErr);
      }

      const token = generateToken({ userId: user.id });

      return successResponse(
        res,
        {
          token,
          user: User.sanitize(user),
          balance_mz: parseFloat(user.balance_mz || 0),
          referral_code: user.referral_code,
        },
        "Connexion réussie"
      );
    } catch (error) {
      console.error(
        "❌ Erreur login:",
        error && error.stack ? error.stack : error
      );
      return errorResponse(
        res,
        error.message || "Erreur interne serveur lors de la connexion",
        ERROR_CODES.GENERAL || "GENERAL_ERROR",
        500
      );
    }
  }

  /**
   * Mettre à jour le profil
   */
  static async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const { nom, prenom, telephone, age } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return errorResponse(
          res,
          ERROR_MESSAGES[ERROR_CODES.AUTH_USER_NOT_FOUND] ||
            "Utilisateur non trouvé",
          ERROR_CODES.AUTH_USER_NOT_FOUND,
          404
        );
      }

      if (
        telephone &&
        telephone !== user.telephone &&
        (await User.findByPhone(telephone))
      ) {
        return errorResponse(
          res,
          ERROR_MESSAGES[ERROR_CODES.AUTH_PHONE_EXISTS] ||
            "Téléphone déjà utilisé",
          ERROR_CODES.AUTH_PHONE_EXISTS,
          409
        );
      }

      await User.update(userId, {
        nom: nom || user.nom,
        prenom: prenom || user.prenom,
        telephone: telephone || user.telephone,
        age: age || user.age,
      });

      const updatedUser = await User.findById(userId);

      await query(
        `INSERT INTO activity_logs (user_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)`,
        [userId, "profile_updated", getClientIp(req), getUserAgent(req)]
      );

      return successResponse(
        res,
        { user: User.sanitize(updatedUser) },
        "Profil mis à jour"
      );
    } catch (error) {
      console.error(
        "❌ Erreur updateProfile:",
        error && error.stack ? error.stack : error
      );
      return errorResponse(
        res,
        "Erreur serveur",
        ERROR_CODES.GENERAL || "GENERAL_ERROR",
        500
      );
    }
  }

  /**
   * Changer le mot de passe
   */
  static async changePassword(req, res, next) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(userId);
      const isPasswordValid = await User.verifyPassword(
        currentPassword,
        user.password
      );

      if (!isPasswordValid) {
        return errorResponse(
          res,
          "Mot de passe actuel incorrect",
          ERROR_CODES.AUTH_INVALID_CREDENTIALS,
          401
        );
      }

      await User.changePassword(userId, newPassword);

      await query(
        `INSERT INTO activity_logs (user_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)`,
        [userId, "password_changed", getClientIp(req), getUserAgent(req)]
      );

      return successResponse(res, null, "Mot de passe changé");
    } catch (error) {
      console.error(
        "❌ Erreur changePassword:",
        error && error.stack ? error.stack : error
      );
      return errorResponse(
        res,
        "Erreur serveur",
        ERROR_CODES.GENERAL || "GENERAL_ERROR",
        500
      );
    }
  }

  /**
   * Obtenir le profil
   */
  static async getProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await User.getFullProfile(userId);

      if (!user) {
        return errorResponse(
          res,
          ERROR_MESSAGES[ERROR_CODES.AUTH_USER_NOT_FOUND] ||
            "Utilisateur non trouvé",
          ERROR_CODES.AUTH_USER_NOT_FOUND,
          404
        );
      }

      return successResponse(res, { user });
    } catch (error) {
      console.error(
        "❌ Erreur getProfile:",
        error && error.stack ? error.stack : error
      );
      return errorResponse(
        res,
        "Erreur serveur",
        ERROR_CODES.GENERAL || "GENERAL_ERROR",
        500
      );
    }
  }

  /**
   * Déconnexion
   */
  static async logout(req, res, next) {
    try {
      const userId = req.user.id;

      await query(
        `INSERT INTO activity_logs (user_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)`,
        [userId, "logout", getClientIp(req), getUserAgent(req)]
      );

      return successResponse(res, null, "Déconnexion réussie");
    } catch (error) {
      console.error(
        "❌ Erreur logout:",
        error && error.stack ? error.stack : error
      );
      return errorResponse(
        res,
        "Erreur serveur",
        ERROR_CODES.GENERAL || "GENERAL_ERROR",
        500
      );
    }
  }

  /**
   * Demande de réinitialisation
   */
  static async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const normalizedEmail = String(email).toLowerCase();

      const user = await User.findByEmail(normalizedEmail);
      if (!user) {
        return successResponse(
          res,
          null,
          "Si l'email existe, un lien a été envoyé"
        );
      }

      const resetToken = require("../utils/helpers").generateResetToken();
      const expiryDate = new Date(Date.now() + 30 * 60 * 1000);

      await User.setResetToken(user.id, resetToken, expiryDate);

      const frontendUrl =
        process.env.FRONTEND_URL || "https://runnermars.netlify.app";
      const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

      EmailService.sendPasswordReset(user, resetLink).catch((err) =>
        console.error("Erreur email reset:", err)
      );

      return successResponse(
        res,
        null,
        "Si l'email existe, un lien a été envoyé"
      );
    } catch (error) {
      console.error(
        "❌ Erreur forgotPassword:",
        error && error.stack ? error.stack : error
      );
      return errorResponse(
        res,
        "Erreur serveur",
        ERROR_CODES.GENERAL || "GENERAL_ERROR",
        500
      );
    }
  }

  /**
   * Réinitialiser le mot de passe
   */
  static async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;

      const user = await User.findByResetToken(token);
      if (!user) {
        return errorResponse(
          res,
          "Token invalide ou expiré",
          ERROR_CODES.AUTH_TOKEN_INVALID,
          400
        );
      }

      await User.changePassword(user.id, newPassword);
      await User.clearResetToken(user.id);

      await query(
        `INSERT INTO activity_logs (user_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)`,
        [user.id, "password_reset", getClientIp(req), getUserAgent(req)]
      );

      EmailService.sendPasswordChangeConfirmation(user).catch((err) =>
        console.error("Erreur email confirmation:", err)
      );

      return successResponse(res, null, "Mot de passe réinitialisé");
    } catch (error) {
      console.error(
        "❌ Erreur resetPassword:",
        error && error.stack ? error.stack : error
      );
      return errorResponse(
        res,
        "Erreur serveur",
        ERROR_CODES.GENERAL || "GENERAL_ERROR",
        500
      );
    }
  }
}

module.exports = AuthController;
