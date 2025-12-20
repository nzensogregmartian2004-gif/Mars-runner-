// ============================================
// socket/handlers/referralHandler.js
// ============================================

const User = require("../../models/user");
const Referral = require("../../models/referral");
const { BONUS } = require("../../utils/constants");

/**
 * ✅ Gérer les événements de parrainage via Socket.IO
 */
function setupReferralHandlers(socket) {
  const userId = socket.userId;

  // ✅ VALIDATION : Vérifier que userId existe
  if (!userId) {
    console.error("❌ [ReferralHandler] userId est undefined");
    socket.emit("referral:error", { message: "Utilisateur non authentifié" });
    return;
  }

  console.log(`🎯 [ReferralHandler] Configuration pour user ${userId}`);

  /**
   * 📡 Récupérer les infos de parrainage complètes
   */
  socket.on("referral:getInfo", async () => {
    try {
      console.log(`📡 [referral:getInfo] User ${userId} demande ses infos`);

      // Récupérer l'utilisateur
      const user = await User.findById(userId);
      if (!user) {
        socket.emit("referral:error", { message: "Utilisateur introuvable" });
        return;
      }

      // Récupérer les affiliés
      const { data: referrals } = await Referral.getSponsorReferrals(
        userId,
        1,
        100
      );

      // Formater les affiliés pour le frontend
      const affiliatedUsers = referrals.map((ref) => ({
        id: ref.id,
        name:
          `${ref.prenom || ""} ${ref.nom || ""}`.trim() ||
          ref.email ||
          "Utilisateur",
        prenom: ref.prenom,
        nom: ref.nom,
        email: ref.email,
        bonusEarned: parseFloat(ref.bonus_earned_mz || 0),
        bonus_earned: parseFloat(ref.bonus_earned_mz || 0),
        unlocked: ref.status === "active",
        bonus_unlocked: ref.status === "active",
        joinedAt: ref.created_at,
        created_at: ref.created_at,
      }));

      // Récupérer les stats
      const stats = await Referral.getReferralStats(userId);

      console.log(
        `✅ [referral:getInfo] Code: ${user.referral_code}, Affiliés: ${affiliatedUsers.length}`
      );

      // Envoyer les données au client
      socket.emit("referral:info", {
        referralCode: user.referral_code,
        referral_code: user.referral_code,
        affiliatedUsers: affiliatedUsers,
        affiliated_users: affiliatedUsers,
        stats: {
          totalReferrals: parseInt(stats.total_referrals || 0),
          activeReferrals: parseInt(stats.active_referrals || 0),
          pendingReferrals: parseInt(stats.pending_referrals || 0),
          totalBonusEarned: parseFloat(stats.total_bonus_earned || 0),
        },
      });
    } catch (error) {
      console.error("❌ [referral:getInfo] Erreur:", error);
      socket.emit("referral:error", {
        message: "Erreur lors de la récupération des données de parrainage",
      });
    }
  });

  /**
   * 📡 Récupérer uniquement le code de parrainage
   */
  socket.on("referral:getCode", async () => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        socket.emit("referral:error", { message: "Utilisateur introuvable" });
        return;
      }

      socket.emit("referral:code", {
        referralCode: user.referral_code,
        bonusPerReferral: BONUS.SPONSOR || 2,
        newPlayerBonus: BONUS.NEW_PLAYER || 5,
      });
    } catch (error) {
      console.error("❌ [referral:getCode] Erreur:", error);
      socket.emit("referral:error", {
        message: "Erreur lors de la récupération du code",
      });
    }
  });

  /**
   * 📡 Récupérer les stats uniquement
   */
  socket.on("referral:getStats", async () => {
    try {
      const stats = await Referral.getReferralStats(userId);

      socket.emit("referral:stats", {
        totalReferrals: parseInt(stats.total_referrals || 0),
        activeReferrals: parseInt(stats.active_referrals || 0),
        pendingReferrals: parseInt(stats.pending_referrals || 0),
        totalBonusEarned: parseFloat(stats.total_bonus_earned || 0),
      });
    } catch (error) {
      console.error("❌ [referral:getStats] Erreur:", error);
      socket.emit("referral:error", {
        message: "Erreur lors de la récupération des stats",
      });
    }
  });

  /**
   * 📡 Vérifier un code de parrainage
   */
  socket.on("referral:verifyCode", async (data) => {
    try {
      const { code } = data;

      const sponsor = await User.findByReferralCode(code);

      if (!sponsor) {
        socket.emit("referral:codeInvalid", {
          code,
          message: "Code de parrainage invalide",
        });
        return;
      }

      socket.emit("referral:codeValid", {
        code,
        sponsor: {
          name: `${sponsor.prenom} ${sponsor.nom.charAt(0)}.`,
          bonusNewPlayer: BONUS.NEW_PLAYER || 5,
        },
      });
    } catch (error) {
      console.error("❌ [referral:verifyCode] Erreur:", error);
      socket.emit("referral:error", {
        message: "Erreur lors de la vérification du code",
      });
    }
  });

  console.log(`🎯 [ReferralHandler] Handlers configurés pour user ${userId}`);
}

module.exports = { setupReferralHandlers };
