require("dotenv").config();
// Taux de change FIXE nso
const MZ_TO_FCFA = 100;

// Commission sur les transactions (3%)
const TRANSACTION_FEE_PERCENT = 3;

// Limites de transaction
const LIMITS = {
  DEPOSIT: {
    MIN_FCFA: 100,
    MAX_FCFA: 50000,
    MIN_MZ: 1, // 100 FCFA / 100
    MAX_MZ: 500, // 50000 FCFA / 100
  },
  WITHDRAW: {
    MIN_MZ: 10,
    MAX_MZ: 1000,
    MIN_FCFA: 1000, // 10 MZ * 100
    MAX_FCFA: 100000, // 1000 MZ * 100
  },
  BET: {
    MIN_MZ: 1,
    MAX_MZ: 1000,
  },
};

// Bonus système
const BONUS = {
  NEW_PLAYER: 5, // 5 MZ pour les nouveaux joueurs (crédité à l'inscription)
  SPONSOR: 2, // 2 MZ pour le parrain (débloqué à la première mise du filleul)
};

const GAME_CONSTANTS = {
  BASE_SPEED: 5.5,
  SPEED_INCREMENT: 0.0012,
  GRAVITY: 0.5,
  JUMP_FORCE: -11,
  MIN_MULTIPLIER_WITHDRAW: 2.0,
  MIN_CASHOUT_MULTIPLIER: 1.5, // ✅ AJOUTEZ CETTE LIGNE
  AIR_OBSTACLE_HEIGHT: 180,
  GROUND_OBSTACLE_HEIGHT: 40,
  MARTIAN_SIZE: 50,
};

// Statuts de partie
const GAME_STATUS = {
  PLAYING: "playing",
  CASHED_OUT: "cashed_out",
  CRASHED: "crashed",
};

// Types de transaction
const TRANSACTION_TYPES = {
  DEPOSIT: "deposit",
  WITHDRAW: "withdraw",
  BET: "bet",
  WIN: "win",
  NEW_PLAYER_BONUS: "new_player_bonus",
  REFERRAL_BONUS: "referral_bonus",
  // Autres...
};

// Statuts de transaction
const TRANSACTION_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

// Codes d'erreur personnalisés (pour la cohérence frontend/backend)
const ERROR_CODES = {
  // Auth
  AUTH_TOKEN_INVALID: "AUTH_001",
  AUTH_TOKEN_EXPIRED: "AUTH_002",
  AUTH_INVALID_CREDENTIALS: "AUTH_003",
  AUTH_USER_NOT_FOUND: "AUTH_004",
  AUTH_EMAIL_EXISTS: "AUTH_005",
  AUTH_PHONE_EXISTS: "AUTH_006",
  AUTH_ACCOUNT_DISABLED: "AUTH_007",

  // Wallet/Payment
  WALLET_INSUFFICIENT_FUNDS: "WALLET_001",
  WALLET_WITHDRAW_BLOCKED: "WALLET_002",
  PAYMENT_PROVIDER_ERROR: "PAYMENT_001",
  PAYMENT_SESSION_EXPIRED: "PAYMENT_002",

  // Game
  GAME_ALREADY_ACTIVE: "GAME_001",
  GAME_INVALID_ID: "GAME_002",
  GAME_CASHOUT_TOO_EARLY: "GAME_003",
  GAME_BET_TOO_LOW: "GAME_004",
  GAME_BET_TOO_HIGH: "GAME_005",

  // Referral
  REFERRAL_SELF_REFERRAL: "REF_001",
  REFERRAL_CODE_INVALID: "REF_002",
  REFERRAL_ALREADY_REFERRED: "REF_003",

  // General
  VALIDATION_ERROR: "GENERAL_001",
  DATABASE_ERROR: "GENERAL_002",
  SERVER_ERROR: "GENERAL_003",
  NOT_FOUND: "GENERAL_004",
};

// Messages d'erreur
const ERROR_MESSAGES = {
  [ERROR_CODES.AUTH_TOKEN_INVALID]: "Token invalide ou manquant",
  [ERROR_CODES.AUTH_TOKEN_EXPIRED]:
    "Session expirée, veuillez vous reconnecter",
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: "Email ou mot de passe incorrect",
  [ERROR_CODES.AUTH_USER_NOT_FOUND]: "Utilisateur non trouvé",
  [ERROR_CODES.AUTH_EMAIL_EXISTS]: "Cet email est déjà utilisé",
  [ERROR_CODES.AUTH_PHONE_EXISTS]: "Ce numéro de téléphone est déjà utilisé",

  [ERROR_CODES.WALLET_INSUFFICIENT_FUNDS]: "Solde insuffisant",
  [ERROR_CODES.WALLET_WITHDRAW_BLOCKED]:
    "Retrait bloqué pour solde bonus non débloqué",

  [ERROR_CODES.GAME_ALREADY_ACTIVE]: "Une partie est déjà en cours",
  [ERROR_CODES.GAME_INVALID_ID]: "ID de partie invalide",
  [ERROR_CODES.GAME_CASHOUT_TOO_EARLY]: `Multiplicateur minimum non atteint (x${GAME_CONSTANTS.MIN_MULTIPLIER_WITHDRAW})`,
  [ERROR_CODES.GAME_BET_TOO_LOW]: `Mise minimum: ${LIMITS.BET.MIN_MZ} MZ`,
  [ERROR_CODES.GAME_BET_TOO_HIGH]: `Mise maximum: ${LIMITS.BET.MAX_MZ} MZ`,

  [ERROR_CODES.REFERRAL_SELF_REFERRAL]:
    "Vous ne pouvez pas vous parrainer vous-même",
  [ERROR_CODES.REFERRAL_CODE_INVALID]: "Code de parrainage invalide",
  [ERROR_CODES.REFERRAL_ALREADY_REFERRED]: "Vous avez déjà été parrainé",

  [ERROR_CODES.VALIDATION_ERROR]: "Erreur de validation des données",
  [ERROR_CODES.DATABASE_ERROR]: "Erreur de base de données",
  [ERROR_CODES.SERVER_ERROR]: "Erreur serveur interne",
  [ERROR_CODES.NOT_FOUND]: "Ressource non trouvée",
};

// Regex pour validation
const REGEX = {
  EMAIL: /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/,
  PHONE_GABON: /^(\\+241|00241)?[0-9]{8,9}$/,
  REFERRAL_CODE: /^MARTIAN[0-9]{4,6}$/,
};

// Préfixes des opérateurs gabonais
const OPERATOR_PREFIXES = {
  orange_money: ["07", "06"], // Exemples
  mtn_money: ["04", "05"], // Exemples
  moov_money: ["02", "03"], // Exemples
};

// Constantes de session de paiement
const PAYMENT_SESSION_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELED: "canceled",
};

const PAYMENT_SESSION_EXPIRY = 15; // Minutes

// Méthodes de paiement (pour référence)
const PAYMENT_METHODS = {
  ORANGE_MONEY: "orange_money",
  MTN_MONEY: "mtn_money",
  MOOV_MONEY: "moov_money",
};

module.exports = {
  MZ_TO_FCFA,
  TRANSACTION_FEE_PERCENT,
  LIMITS,
  BONUS,
  GAME_CONSTANTS,
  GAME_STATUS,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  ERROR_CODES,
  ERROR_MESSAGES,
  REGEX,
  OPERATOR_PREFIXES,
  PAYMENT_SESSION_STATUS,
  PAYMENT_SESSION_EXPIRY,
  PAYMENT_METHODS,
  LIMITS, // ✅ Déjà présent mais vérifiez
};
