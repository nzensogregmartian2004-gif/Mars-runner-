// ===========================================
// controllers/referralController. js - COMPLET & CORRIGÉ
// ============================================

const User = require("../models/user");
const Referral = require("../models/referral");
const {
  successResponse,
  errorResponse,
  maskEmail,
  paginationMeta,
} = require("../utils/helpers");
const { ERROR_CODES, ERROR_MESSAGES, BONUS } = require("../utils/constants");
const { query } = require("../config/database");

class ReferralController {
  /**
   * Obtenir son code de parrainage
   */
  static async getMyReferralCode(req, res, next) {
    try {
      const userId = req.user.id;
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

      return successResponse(res, {
        referralCode: user.referral_code,
        bonusPerReferral: BONUS.SPONSOR,
        newPlayerBonus: BONUS.NEW_PLAYER,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir la liste de ses filleuls
   */
  static async getMyReferrals(req, res, next) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const { data: referrals, total } = await Referral.getSponsorReferrals(
        userId,
        page,
        limit
      );

      const sanitizedReferrals = referrals.map((ref) => ({
        id: ref.id,
        name: `${ref.prenom || "?"} ${(ref.nom || "?").charAt(0)}.`,
        email: maskEmail(ref.email || "? "),
        joinedAt: ref.created_at,
        bonusEarned: parseFloat(ref.bonus_earned_mz || 0),
        bonusUnlocked: ref.bonus_unlocked === 1 || ref.bonus_unlocked === true,
      }));

      return successResponse(res, {
        referrals: sanitizedReferrals,
        pagination: paginationMeta(total, page, limit),
      });
    } catch (error) {
      console.error("❌ Erreur getMyReferrals:", error);
      next(error);
    }
  }

  /**
   * Obtenir statistiques
   */
  static async getMyReferralStats(req, res, next) {
    try {
      const userId = req.user.id;
      const stats = await Referral.getReferralStats(userId);

      return successResponse(res, { stats });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir info sur son parrain
   */
  static async getMySponsor(req, res, next) {
    try {
      const userId = req.user.id;
      const referral = await Referral.findByReferredId(userId);

      if (!referral) {
        return successResponse(
          res,
          { sponsor: null },
          "Vous n'avez pas de parrain"
        );
      }

      const sponsor = await User.findById(referral.sponsor_id);

      return successResponse(res, {
        sponsor: {
          name: `${sponsor?.prenom || "?"} ${(sponsor?.nom || "?").charAt(0)}.`,
          email: maskEmail(sponsor?.email || "?"),
          referralCode: referral.referral_code,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Filleuls récents
   */
  static async getRecentReferrals(req, res, next) {
    try {
      const userId = req.user.id;
      const hours = parseInt(req.query.hours) || 24;
      const recentReferrals = await Referral.getRecentReferrals(userId, hours);

      const sanitizedReferrals = recentReferrals.map((ref) => ({
        name: `${ref.prenom || "?"} ${(ref.nom || "?").charAt(0)}.`,
        joinedAt: ref.created_at,
      }));

      return successResponse(res, {
        recentReferrals: sanitizedReferrals,
        count: recentReferrals.length,
        period: `${hours} dernières heures`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lien partageable
   */
  static async getShareableLink(req, res, next) {
    try {
      const userId = req.user.id;
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

      const frontendUrl =
        process.env.FRONTEND_URL || "https://marsrunner.netlify.app";
      const shareableLink = `${frontendUrl}/register? ref=${user.referral_code}`;

      const shareMessage = `Rejoins-moi sur MARS RUNNER avec mon code ${user.referral_code} et reçois ${BONUS.NEW_PLAYER} MZ gratuits !  🚀`;

      return successResponse(res, {
        referralCode: user.referral_code,
        shareableLink,
        shareMessage,
        bonusNewPlayer: BONUS.NEW_PLAYER,
        bonusSponsor: BONUS.SPONSOR,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Vérifier code de parrainage
   */
  static async verifyReferralCode(req, res, next) {
    try {
      const { code } = req.params;
      const sponsor = await User.findByReferralCode(code);

      if (!sponsor) {
        return errorResponse(
          res,
          ERROR_MESSAGES[ERROR_CODES.REFERRAL_CODE_INVALID] || "Code invalide",
          ERROR_CODES.REFERRAL_CODE_INVALID,
          404
        );
      }

      return successResponse(res, {
        isValid: true,
        sponsor: {
          name: `${sponsor.prenom || "?"} ${(sponsor.nom || "? ").charAt(0)}.`,
          email: maskEmail(sponsor.email || "?"),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Meilleurs parrains
   */
  static async getTopSponsors(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const topSponsors = await Referral.getTopSponsors(limit);

      const sanitizedSponsors = topSponsors.map((sponsor) => ({
        name: `${sponsor.prenom || "?"} ${(sponsor.nom || "?").charAt(0)}.`,
        referralCode: sponsor.referral_code,
        totalReferrals: parseInt(sponsor.total_referrals),
        totalBonus: parseFloat(sponsor.total_bonus_earned || 0),
      }));

      return successResponse(res, { topSponsors: sanitizedSponsors });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ReferralController;
