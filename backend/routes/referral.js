const express = require("express");
const router = express.Router();
const ReferralController = require("../controllers/referralController");
const { authenticate, optionalAuth } = require("../middleware/auth");

/**
 * @route   GET /api/referral/my-code
 * @desc    Obtenir son code de parrainage
 * @access  Private
 */
router.get("/my-code", authenticate, ReferralController.getMyReferralCode);

/**
 * @route   GET /api/referral/my-referrals
 * @desc    Obtenir la liste de ses filleuls
 * @access  Private
 */
router.get("/my-referrals", authenticate, ReferralController.getMyReferrals);

/**
 * @route   GET /api/referral/my-stats
 * @desc    Obtenir ses statistiques de parrainage
 * @access  Private
 */
router.get("/my-stats", authenticate, ReferralController.getMyReferralStats);

/**
 * @route   GET /api/referral/my-sponsor
 * @desc    Obtenir l'information sur son parrain
 * @access  Private
 */
router.get("/my-sponsor", authenticate, ReferralController.getMySponsor);

/**
 * @route   GET /api/referral/recent
 * @desc    Obtenir les filleuls récents
 * @access  Private
 */
router.get("/recent", authenticate, ReferralController.getRecentReferrals);

/**
 * @route   GET /api/referral/shareable-link
 * @desc    Obtenir un lien de parrainage partageable
 * @access  Private
 */
router.get(
  "/shareable-link",
  authenticate,
  ReferralController.getShareableLink
);

/**
 * @route   GET /api/referral/verify/:code
 * @desc    Vérifier la validité d'un code de parrainage
 * @access  Public
 */
router.get("/verify/:code", ReferralController.verifyReferralCode);

/**
 * @route   GET /api/referral/top-sponsors
 * @desc    Obtenir le classement des meilleurs parrains
 * @access  Public (optionnel)
 */
router.get("/top-sponsors", optionalAuth, ReferralController.getTopSponsors);

module.exports = router;
