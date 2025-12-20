const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  MZ_TO_FCFA,
  REGEX,
  TRANSACTION_FEE_PERCENT,
} = require("../utils/constants");

/**
 * Génère un code de parrainage unique
 */
const generateReferralCode = () => {
  const randomNum = Math.floor(Math.random() * 900000) + 100000;
  return `MARTIAN${randomNum}`;
};

/**
 * Hash un mot de passe
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

/**
 * Compare un mot de passe avec son hash
 */
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Génère un token JWT
 */
const generateToken = (payload, expiresIn = "7d") => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * Vérifie un token JWT
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    // Renvoie null si le token est invalide ou expiré
    return null;
  }
};

/**
 * Génère un token de réinitialisation de mot de passe simple
 */
const generateResetToken = () => {
  // Un simple string de 32 caractères hexadécimaux
  return require("crypto").randomBytes(16).toString("hex");
};

/**
 * Ajoute un nombre de minutes à une date
 */
const addMinutes = (date, minutes) => {
  return new Date(date.getTime() + minutes * 60000);
};

/**
 * Réponse standard de succès
 */
const successResponse = (
  res,
  data = null,
  message = "Opération réussie",
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Réponse standard d'erreur
 */
const errorResponse = (
  res,
  message,
  errorCode,
  statusCode = 400,
  data = null
) => {
  // L'erreur est logguée dans le middleware errorHandler
  return res.status(statusCode).json({
    success: false,
    message,
    errorCode,
    data,
  });
};

/**
 * Arrondit un nombre à deux décimales
 */
const roundToTwo = (num) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

/**
 * Convertit des MZ en FCFA
 */
const mzToFcfa = (mz) => {
  return roundToTwo(mz * MZ_TO_FCFA);
};

/**
 * Convertit des FCFA en MZ
 */
const fcfaToMz = (fcfa) => {
  return roundToTwo(fcfa / MZ_TO_FCFA);
};

/**
 * Formate un numéro de téléphone (GABON)
 */
const formatPhone = (phone) => {
  if (!phone) return null;
  // Nettoyer tous les non-chiffres
  let cleaned = phone.replace(/\D/g, "");

  // Si commence par +241 ou 00241, le retirer
  if (cleaned.startsWith("241")) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith("00241")) {
    cleaned = cleaned.substring(5);
  }

  // S'assurer qu'il fait 8 ou 9 chiffres (selon l'opérateur)
  if (cleaned.length < 8 || cleaned.length > 9) {
    // Si la validation de l'express-validator a échoué, on laisse la DB gérer l'erreur ou l'on renvoie la chaîne non formatée
    return phone;
  }

  // Ajouter le préfixe international pour la cohérence (ex: +2416xxxxxxx)
  // NOTE: On pourrait aussi le stocker sans le +241 si c'est la norme locale.
  // Pour l'instant, on stocke la version 8 ou 9 chiffres.
  return cleaned;
};

/**
 * Masque un email (ex: user***@domaine.com)
 */
const maskEmail = (email) => {
  if (!email) return "N/A";
  const [name, domain] = email.split("@");
  if (!name || !domain) return "N/A";
  if (name.length <= 3) return `*${name.substring(1)}@${domain}`;
  return `${name.substring(0, 3)}***@${domain}`;
};

/**
 * Masque un téléphone (ex: +241 ******99)
 */
const maskPhone = (phone) => {
  if (!phone) return "N/A";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 4) return phone;
  const lastTwo = cleaned.slice(-2);
  const stars = "*".repeat(cleaned.length - 2);

  // Utiliser le format local si c'est le cas, sinon inclure le préfixe
  return `${stars}${lastTwo}`;
};

/**
 * Génère un ID de session simple (pour paiement)
 */
const generateSessionId = () => {
  return (
    "PAY" +
    Date.now().toString() +
    Math.floor(Math.random() * 900000).toString()
  );
};

/**
 * Génère une référence de transaction simple
 */
const generateTransactionReference = () => {
  return (
    "REF" +
    Date.now().toString() +
    Math.floor(Math.random() * 900000).toString()
  );
};

/**
 * Obtenir l'adresse IP du client
 */
const getClientIp = (req) => {
  return (req.headers["x-forwarded-for"] || req.socket.remoteAddress)
    .split(",")[0]
    .trim();
};

/**
 * Obtenir l'User Agent du client
 */
const getUserAgent = (req) => {
  return req.headers["user-agent"] || "N/A";
};

/**
 * Pagine des résultats (pour DB)
 */
const paginate = (page = 1, limit = 10) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const offset = (pageNum - 1) * limitNum;

  return {
    limit: limitNum,
    offset,
    page: pageNum,
  };
};

/**
 * Crée un objet de métadonnées de pagination
 */
const paginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    totalPages: totalPages === 0 ? 1 : totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

/**
 * Calcule un pourcentage
 */
const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return roundToTwo((value / total) * 100);
};

/**
 * Pause l'exécution pendant X millisecondes
 */
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// ET AJOUTEZ-LA DANS L'EXPORT À LA FIN :
module.exports = {
  generateReferralCode,
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  generateResetToken,
  addMinutes,
  successResponse,
  errorResponse,
  roundToTwo,
  mzToFcfa,
  fcfaToMz,
  formatPhone,
  maskEmail,
  maskPhone,
  generateSessionId,
  generateTransactionReference,
  getClientIp,
  getUserAgent,
  paginate,
  paginationMeta,
  calculatePercentage,
  sleep, // ✅ AJOUTEZ CETTE LIGNE
};
