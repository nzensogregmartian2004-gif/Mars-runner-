const axios = require("axios");
const { formatPhone } = require("../utils/helpers");
require("dotenv").config();

class SMSService {
  /**
   * Envoyer un SMS générique
   */
  static async sendSMS(phone, message) {
    const formattedPhone = formatPhone(phone);

    try {
      // En mode développement, juste logger le SMS
      if (process.env.NODE_ENV === "development" || !process.env.SMS_API_KEY) {
        console.log(`📱 [SMS SIMULATION] vers ${formattedPhone}:`);
        console.log(`   Message: ${message}`);
        return { success: true, simulation: true };
      }

      // En production, envoyer via l'API SMS
      const response = await axios.post(
        process.env.SMS_API_URL,
        {
          sender: process.env.SMS_SENDER_ID || "MARS",
          recipient: formattedPhone,
          message: message,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SMS_API_KEY}`,
          },
          timeout: 10000,
        }
      );

      console.log(`📱 SMS envoyé à ${formattedPhone}`);
      return {
        success: true,
        simulation: false,
        messageId: response.data.messageId,
      };
    } catch (error) {
      console.error("❌ Erreur envoi SMS:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envoyer un SMS de bienvenue
   */
  static async sendWelcomeSMS(phone, prenom, referralCode) {
    const message = `Bienvenue sur Mars Runner ${prenom}! Votre bonus de 3 DM vous attend. Code parrainage: ${referralCode}. Jouez maintenant!`;
    return await this.sendSMS(phone, message);
  }

  /**
   * Envoyer un code OTP
   */
  static async sendOTP(phone, otpCode) {
    const message = `Votre code de verification Mars Runner: ${otpCode}. Ne le partagez avec personne. Valide 10 minutes.`;
    return await this.sendSMS(phone, message);
  }

  /**
   * Envoyer une notification de dépôt
   */
  static async sendDepositNotification(phone, amount) {
    const message = `Depot confirme! ${amount} DM credites sur votre compte Mars Runner. Bonne chance!`;
    return await this.sendSMS(phone, message);
  }

  /**
   * Envoyer une notification de retrait
   */
  static async sendWithdrawNotification(phone, amount) {
    const message = `Retrait de ${amount} FCFA en cours de traitement. Les fonds seront disponibles sous peu.`;
    return await this.sendSMS(phone, message);
  }

  /**
   * Envoyer une notification de gain important
   */
  static async sendBigWinNotification(phone, amount, multiplier) {
    const message = `Felicitations! Vous avez gagne ${amount} DM avec un multiplicateur de x${multiplier}! 🎉`;
    return await this.sendSMS(phone, message);
  }

  /**
   * Envoyer une notification de bonus de parrainage
   */
  static async sendReferralBonusNotification(phone, bonusAmount, referredName) {
    const message = `Nouveau bonus! ${referredName} a utilise votre code. Vous recevez ${bonusAmount} DM! Continuez a parrainer.`;
    return await this.sendSMS(phone, message);
  }

  /**
   * Envoyer une alerte de sécurité
   */
  static async sendSecurityAlert(phone, action) {
    const message = `Alerte securite Martian Runner: ${action}. Si ce n'est pas vous, contactez-nous immediatement.`;
    return await this.sendSMS(phone, message);
  }

  /**
   * Envoyer un rappel de bonus non utilisé
   */
  static async sendBonusReminderSMS(phone, bonusAmount) {
    const message = `Rappel: Vous avez ${bonusAmount} DM de bonus en attente! Faites une mise pour le debloquer.`;
    return await this.sendSMS(phone, message);
  }
}

module.exports = SMSService;
