// ============================================
// models/user.js - VERSION CORRIGÉE COMPLÈTE
// ============================================

const { query } = require("../config/database");
const {
  hashPassword,
  comparePassword,
  generateReferralCode,
  formatPhone,
  maskEmail,
  maskPhone,
  roundToTwo,
} = require("../utils/helpers");
const { BONUS } = require("../utils/constants");

class User {
  /**
   * ✅ Créer un nouvel utilisateur - VERSION CORRIGÉE
   */
  static async create(userData, connection = null) {
    // ✅ Si pas de connection fournie, utiliser query global
    const db = connection || { query };

    const { nom, prenom, email, telephone, password, age, referralCode } =
      userData;

    const hashedPassword = await hashPassword(password);
    const formattedPhone = formatPhone(telephone);

    // Générer un code de parrainage unique
    let userReferralCode = generateReferralCode();
    let isUnique = false;

    while (!isUnique) {
      const existing = await this.findByReferralCode(userReferralCode, db);
      if (!existing) {
        isUnique = true;
      } else {
        userReferralCode = generateReferralCode();
      }
    }

    let referredByCode = null;
    if (referralCode) {
      const sponsor = await this.findByReferralCode(referralCode, db);
      if (sponsor) {
        referredByCode = referralCode;
      }
    }

    const initialBalance = 0;
    const newPlayerBonusLocked = true;
    const newPlayerBonusAmount = BONUS.NEW_PLAYER;

    const sql = `
      INSERT INTO users (
        nom,
        prenom,
        email,
        telephone,
        password,
        age,
        balance_mz,
        referral_code,
        referred_by_code,
        new_player_bonus_locked,
        new_player_bonus_amount,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const result = await db.query(sql, [
      nom,
      prenom,
      email,
      formattedPhone,
      hashedPassword,
      age,
      initialBalance,
      userReferralCode,
      referredByCode,
      newPlayerBonusLocked,
      newPlayerBonusAmount,
    ]);

    return {
      id: result.insertId,
      nom,
      prenom,
      email,
      telephone: formattedPhone,
      password: hashedPassword,
      age,
      balance_mz: initialBalance,
      referral_code: userReferralCode,
      referred_by_code: referredByCode,
      new_player_bonus_locked: newPlayerBonusLocked,
      new_player_bonus_amount: newPlayerBonusAmount,
      is_active: true,
      created_at: new Date(),
    };
  }

  /**
   * Mettre à jour les informations de l'utilisateur
   */
  static async update(userId, userData, connection = null) {
    const db = connection || { query };

    const fields = [];
    const values = [];

    for (const key in userData) {
      if (
        userData[key] !== undefined &&
        key !== "id" &&
        key !== "email" &&
        key !== "password"
      ) {
        fields.push(`${key} = ?`);
        if (key === "telephone") {
          values.push(formatPhone(userData[key]));
        } else {
          values.push(userData[key]);
        }
      }
    }

    if (fields.length === 0) {
      return true;
    }

    const sql = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;
    await db.query(sql, [...values, userId]);

    return true;
  }

  // ============================================
  // CORRECTION 6: Backend - models/user.js
  // Ajouter la méthode updateBalance
  // ============================================

  // ============================================
  // À AJOUTER dans models/User.js
  // ============================================

  /**
   * ✅ METTRE À JOUR LE SOLDE D'UN UTILISATEUR
   */
  static async updateBalance(userId, newBalance) {
    const sql = `
    UPDATE users 
    SET balance_mz = ? 
    WHERE id = ?
  `;

    await query(sql, [parseFloat(newBalance), userId]);

    console.log(`💰 Balance mise à jour - User ${userId}: ${newBalance} MZ`);

    return true;
  }

  /**
   * ✅ TROUVER UN UTILISATEUR PAR ID
   */
  static async findById(userId) {
    const sql = `SELECT * FROM users WHERE id = ? LIMIT 1`;
    const results = await query(sql, [userId]);
    return results[0] || null;
  }

  /**
   * ✅ FONCTION QUERY GÉNÉRIQUE (si elle n'existe pas déjà)
   */
  static async query(sql, params = []) {
    const { query } = require("../config/database");
    return await query(sql, params);
  }

  /**
   * Créditer le solde de l'utilisateur
   */
  static async creditBalance(userId, amount, connection = null) {
    const db = connection || { query };
    const sql = `UPDATE users SET balance_mz = balance_mz + ? WHERE id = ?`;
    await db.query(sql, [roundToTwo(amount), userId]);
  }

  /**
   * Débiter le solde de l'utilisateur
   */
  static async debitBalance(userId, amount, connection = null) {
    const db = connection || { query };
    const sql = `UPDATE users SET balance_mz = balance_mz - ? WHERE id = ?`;
    await db.query(sql, [roundToTwo(amount), userId]);
  }

  /**
   * Changer le mot de passe
   */
  static async changePassword(userId, newPassword, connection = null) {
    const db = connection || { query };
    const hashedPassword = await hashPassword(newPassword);
    const sql = `UPDATE users SET password = ? WHERE id = ?`;
    await db.query(sql, [hashedPassword, userId]);
  }

  /**
   * Définir le token de réinitialisation
   */
  static async setResetToken(userId, token, expiryDate, connection = null) {
    const db = connection || { query };
    const sql = `UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?`;
    await db.query(sql, [token, expiryDate, userId]);
  }

  /**
   * Effacer le token de réinitialisation
   */
  static async clearResetToken(userId, connection = null) {
    const db = connection || { query };
    const sql = `UPDATE users SET reset_token = NULL, reset_token_expiry = NULL WHERE id = ?`;
    await db.query(sql, [userId]);
  }

  /**
   * ✅ Trouver un utilisateur par ID - CORRIGÉ
   */
  static async findById(userId, connection = null, forUpdate = false) {
    const db = connection || { query };
    let sql = "SELECT * FROM users WHERE id = ?";
    if (forUpdate) {
      sql += " FOR UPDATE";
    }
    const users = await db.query(sql, [userId]);
    return users[0] || null;
  }

  /**
   * ✅ Trouver un utilisateur par email - CORRIGÉ
   */
  static async findByEmail(email, connection = null) {
    const db = connection || { query };
    const sql = "SELECT * FROM users WHERE email = ?";
    const users = await db.query(sql, [email.toLowerCase()]);
    return users[0] || null;
  }

  /**
   * ✅ Trouver un utilisateur par téléphone - CORRIGÉ
   */
  static async findByPhone(telephone, connection = null) {
    const db = connection || { query };
    const formattedPhone = formatPhone(telephone);
    const sql = "SELECT * FROM users WHERE telephone = ?";
    const users = await db.query(sql, [formattedPhone]);
    return users[0] || null;
  }

  /**
   * ✅ Trouver un utilisateur par code de parrainage - CORRIGÉ
   */
  static async findByReferralCode(code, connection = null) {
    const db = connection || { query };
    const sql = "SELECT * FROM users WHERE referral_code = ?";
    const users = await db.query(sql, [code]);
    return users[0] || null;
  }

  /**
   * ✅ Trouver un utilisateur par token de réinitialisation - CORRIGÉ
   */
  static async findByResetToken(token, connection = null) {
    const db = connection || { query };
    const sql = `SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()`;
    const users = await db.query(sql, [token]);
    return users[0] || null;
  }

  /**
   * Vérifier le mot de passe
   */
  static async verifyPassword(password, hash) {
    return comparePassword(password, hash);
  }

  /**
   * Nettoyer les données utilisateur avant de les envoyer au client
   */
  static sanitize(user) {
    return {
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      email: maskEmail(user.email),
      telephone: maskPhone(user.telephone),
      age: user.age,
      balance_mz: parseFloat(user.balance_mz),
      referral_code: user.referral_code,
      referred_by_code: user.referred_by_code,
      new_player_bonus_locked: user.new_player_bonus_locked,
      new_player_bonus_amount: parseFloat(user.new_player_bonus_amount),
      created_at: user.created_at,
    };
  }

  /**
   * Obtenir le profil complet (pour l'utilisateur connecté)
   */
  static async getFullProfile(userId) {
    const user = await this.findById(userId);

    if (!user) {
      return null;
    }

    // Récupérer les statistiques
    const statsSql = "SELECT * FROM user_stats WHERE user_id = ?";
    const stats = await query(statsSql, [userId]);

    // Récupérer le total des gains/mises
    const Transaction = require("./transaction");
    const { total_gains, total_mises, profit_loss } =
      await Transaction.getProfitLoss(userId);

    return {
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      telephone: user.telephone,
      age: user.age,
      balance_mz: parseFloat(user.balance_mz),
      referral_code: user.referral_code,
      referred_by_code: user.referred_by_code,
      new_player_bonus_locked: user.new_player_bonus_locked === 1,
      new_player_bonus_amount: parseFloat(user.new_player_bonus_amount),
      is_verified: user.is_verified === 1,
      is_active: user.is_active === 1,
      last_login: user.last_login,
      created_at: user.created_at,

      // Statistiques agrégées
      stats: {
        ...stats[0],
        total_gains: parseFloat(total_gains),
        total_mises: parseFloat(total_mises),
        profit_loss: parseFloat(profit_loss),
      },
    };
  }
}

module.exports = User;
