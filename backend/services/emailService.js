// ========================================
// services/emailService.js - Service Email
// ========================================

class EmailService {
  /**
   * Envoyer un email de bienvenue
   */
  static async sendWelcome(user) {
    console.log(`📧 Email de bienvenue envoyé à ${user.email}`);
    console.log(`   Utilisateur: ${user.prenom} ${user.nom}`);
    console.log(`   Bonus: 5 MZ crédités`);

    // TODO: Implémenter l'envoi réel d'emails avec un service comme SendGrid, Mailgun, etc.
    // Exemple:
    // const nodemailer = require('nodemailer');
    // await transporter.sendMail({...});

    return true;
  }

  /**
   * Envoyer un email de réinitialisation de mot de passe
   */
  static async sendPasswordReset(user, resetLink) {
    console.log(`📧 Email de réinitialisation envoyé à ${user.email}`);
    console.log(`   Lien: ${resetLink}`);

    // TODO: Implémenter l'envoi réel

    return true;
  }

  /**
   * Envoyer une confirmation de changement de mot de passe
   */
  static async sendPasswordChangeConfirmation(user) {
    console.log(
      `📧 Confirmation de changement de mot de passe pour ${user.email}`
    );

    // TODO: Implémenter l'envoi réel

    return true;
  }

  /**
   * Envoyer une notification de dépôt confirmé
   */
  static async sendDepositConfirmation(user, amount) {
    console.log(`📧 Confirmation de dépôt pour ${user.email}: ${amount} MZ`);

    // TODO: Implémenter l'envoi réel

    return true;
  }

  /**
   * Envoyer une notification de retrait effectué
   */
  static async sendWithdrawalConfirmation(user, amount) {
    console.log(`📧 Confirmation de retrait pour ${user.email}: ${amount} MZ`);

    // TODO: Implémenter l'envoi réel

    return true;
  }
}

module.exports = EmailService;
