require("dotenv").config();
const { PAYMENT_PROVIDERS, PAYMENT_METHODS } = require("../utils/constants");

/**
 * Configuration des APIs de paiement mobile
 */
const paymentConfig = {
  mode: process.env.PAYMENT_MODE || "simulation", // 'simulation' ou 'production'

  // Configuration Airtel Money
  airtel: {
    enabled: process.env.AIRTEL_ENABLED === "true",
    apiEndpoint: process.env.AIRTEL_API_ENDPOINT,
    apiKey: process.env.AIRTEL_API_KEY,
    apiSecret: process.env.AIRTEL_API_SECRET,
    merchantCode: process.env.AIRTEL_MERCHANT_CODE,
    callbackUrl: process.env.AIRTEL_CALLBACK_URL,
    timeout: 30000, // 30 secondes
    retryAttempts: 3,
  },

  // Configuration Moov Money
  moov: {
    enabled: process.env.MOOV_ENABLED === "true",
    apiEndpoint: process.env.MOOV_API_ENDPOINT,
    apiKey: process.env.MOOV_API_KEY,
    apiSecret: process.env.MOOV_API_SECRET,
    merchantId: process.env.MOOV_MERCHANT_ID,
    callbackUrl: process.env.MOOV_CALLBACK_URL,
    timeout: 30000,
    retryAttempts: 3,
  },

  // Configuration Mobicash
  mobicash: {
    enabled: process.env.MOBICASH_ENABLED === "true",
    apiEndpoint: process.env.MOBICASH_API_ENDPOINT,
    apiKey: process.env.MOBICASH_API_KEY,
    apiSecret: process.env.MOBICASH_API_SECRET,
    merchantId: process.env.MOBICASH_MERCHANT_ID,
    callbackUrl: process.env.MOBICASH_CALLBACK_URL,
    timeout: 30000,
    retryAttempts: 3,
  },
};

/**
 * Obtenir la configuration d'un opérateur
 */
const getProviderConfig = (paymentMethod) => {
  const configMap = {
    [PAYMENT_METHODS.AIRTEL_MONEY]: paymentConfig.airtel,
    [PAYMENT_METHODS.MOOV_MONEY]: paymentConfig.moov,
    [PAYMENT_METHODS.MOBICASH]: paymentConfig.mobicash,
  };

  return configMap[paymentMethod] || null;
};

/**
 * Vérifier si un opérateur est activé
 */
const isProviderEnabled = (paymentMethod) => {
  const config = getProviderConfig(paymentMethod);
  return config ? config.enabled : false;
};

/**
 * Obtenir tous les opérateurs activés
 */
const getEnabledProviders = () => {
  const enabled = [];

  if (paymentConfig.airtel.enabled) {
    enabled.push({
      method: PAYMENT_METHODS.AIRTEL_MONEY,
      name: PAYMENT_PROVIDERS.airtel_money.name,
      code: PAYMENT_PROVIDERS.airtel_money.code,
    });
  }

  if (paymentConfig.moov.enabled) {
    enabled.push({
      method: PAYMENT_METHODS.MOOV_MONEY,
      name: PAYMENT_PROVIDERS.moov_money.name,
      code: PAYMENT_PROVIDERS.moov_money.code,
    });
  }

  if (paymentConfig.mobicash.enabled) {
    enabled.push({
      method: PAYMENT_METHODS.MOBICASH,
      name: PAYMENT_PROVIDERS.mobicash.name,
      code: PAYMENT_PROVIDERS.mobicash.code,
    });
  }

  return enabled;
};

/**
 * Valider la configuration au démarrage
 */
const validatePaymentConfig = () => {
  const warnings = [];
  const errors = [];

  // Vérifier le mode
  if (!["simulation", "production"].includes(paymentConfig.mode)) {
    errors.push('PAYMENT_MODE doit être "simulation" ou "production"');
  }

  // Vérifier chaque opérateur activé
  Object.entries({
    airtel: paymentConfig.airtel,
    moov: paymentConfig.moov,
    mobicash: paymentConfig.mobicash,
  }).forEach(([name, config]) => {
    if (config.enabled) {
      if (paymentConfig.mode === "production") {
        // En production, vérifier que toutes les clés sont présentes
        if (!config.apiKey || !config.apiSecret) {
          errors.push(
            `${name.toUpperCase()}: API Key et Secret requis en mode production`
          );
        }
        if (!config.apiEndpoint) {
          errors.push(`${name.toUpperCase()}: API Endpoint requis`);
        }
        if (!config.callbackUrl) {
          warnings.push(`${name.toUpperCase()}: Callback URL non défini`);
        }
      } else {
        // En simulation, juste un warning
        warnings.push(`${name.toUpperCase()}: Mode simulation activé`);
      }
    }
  });

  // Afficher les warnings
  if (warnings.length > 0) {
    console.log("⚠️  Warnings configuration paiement:");
    warnings.forEach((w) => console.log(`   - ${w}`));
  }

  // Afficher et retourner les erreurs
  if (errors.length > 0) {
    console.error("❌ Erreurs configuration paiement:");
    errors.forEach((e) => console.error(`   - ${e}`));
    return false;
  }

  console.log(
    `✅ Configuration paiement validée (Mode: ${paymentConfig.mode})`
  );
  return true;
};

module.exports = {
  paymentConfig,
  getProviderConfig,
  isProviderEnabled,
  getEnabledProviders,
  validatePaymentConfig,
};
