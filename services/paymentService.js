const axios = require("axios");
const { paymentConfig, getProviderConfig } = require("../config/payment");
const {
  PAYMENT_METHODS,
  PAYMENT_SESSION_STATUS,
  OPERATOR_PREFIXES,
} = require("../utils/constants");
const { sleep, formatPhone } = require("../utils/helpers");

class PaymentService {
  /**
   * Vérifier si un numéro correspond à un opérateur MD
   */
  static validatePhoneForOperator(phone, paymentMethod) {
    const formattedPhone = formatPhone(phone);
    const prefixes = OPERATOR_PREFIXES[paymentMethod] || [];

    return prefixes.some((prefix) => formattedPhone.startsWith(prefix));
  }

  /**
   * Obtenir le préfixe de l'opérateur depuis un numéro
   */
  static detectOperatorFromPhone(phone) {
    const formattedPhone = formatPhone(phone);

    for (const [operator, prefixes] of Object.entries(OPERATOR_PREFIXES)) {
      if (prefixes.some((prefix) => formattedPhone.startsWith(prefix))) {
        return operator;
      }
    }

    return null;
  }

  /**
   * SIMULATION - Initier un dépôt (avec flow USSD)
   */
  static async simulateDepositRequest(sessionId, phone, amount, paymentMethod) {
    console.log(
      `📱 [SIMULATION] Dépôt ${amount} FCFA via ${paymentMethod} pour ${phone}`
    );

    // Simuler un délai de traitement
    await sleep(1000);

    // Simuler un succès à 90%, échec à 10%
    const success = Math.random() > 0.1;

    if (success) {
      return {
        success: true,
        status: PAYMENT_SESSION_STATUS.PENDING,
        providerReference: `SIM-DEP-${Date.now()}-${Math.floor(
          Math.random() * 10000
        )}`,
        message: `Un code USSD a été envoyé au ${phone}. Veuillez composer le code pour confirmer le paiement.`,
        ussdCode: `*123*${Math.floor(Math.random() * 900000 + 100000)}#`,
        instructions: [
          `1. Composez le code USSD reçu par SMS`,
          `2. Entrez votre code PIN ${paymentMethod}`,
          `3. Confirmez le paiement de ${amount} FCFA`,
          `4. Votre compte sera crédité automatiquement`,
        ],
      };
    } else {
      return {
        success: false,
        status: PAYMENT_SESSION_STATUS.FAILED,
        message:
          "Échec de l'initiation du paiement. Numéro invalide ou service indisponible.",
        error: "PROVIDER_ERROR",
      };
    }
  }

  /**
   * SIMULATION - Initier un retrait (avec traitement automatique)
   */
  static async simulateWithdrawRequest(
    sessionId,
    phone,
    amount,
    paymentMethod
  ) {
    console.log(
      `💸 [SIMULATION] Retrait ${amount} FCFA vers ${paymentMethod} pour ${phone}`
    );

    await sleep(1500);

    const success = Math.random() > 0.1;

    if (success) {
      return {
        success: true,
        status: PAYMENT_SESSION_STATUS.PENDING,
        providerReference: `SIM-WDW-${Date.now()}-${Math.floor(
          Math.random() * 10000
        )}`,
        message: `Retrait en cours de traitement. Les fonds seront transférés vers ${phone} dans quelques instants.`,
        estimatedTime: "2-5 minutes",
        instructions: [
          `Votre retrait de ${amount} FCFA est en cours`,
          `Les fonds seront envoyés à ${phone}`,
          `Vous recevrez une confirmation par SMS`,
          `Durée estimée : 2-5 minutes`,
        ],
      };
    } else {
      return {
        success: false,
        status: PAYMENT_SESSION_STATUS.FAILED,
        message:
          "Échec du retrait. Vérifiez que le numéro peut recevoir de l'argent.",
        error: "PROVIDER_ERROR",
      };
    }
  }

  /**
   * PRODUCTION - Airtel Money - Initier un dépôt
   * Documentation: https://developers.airtel.africa/documentation
   */
  static async airtelDepositRequest(sessionId, phone, amount) {
    const config = getProviderConfig(PAYMENT_METHODS.AIRTEL_MONEY);

    try {
      // Étape 1: Obtenir le token d'accès
      const authResponse = await axios.post(
        `${config.apiEndpoint}/auth/oauth2/token`,
        {
          client_id: config.apiKey,
          client_secret: config.apiSecret,
          grant_type: "client_credentials",
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: config.timeout,
        }
      );

      const accessToken = authResponse.data.access_token;

      // Étape 2: Initier la collecte (Customer to Business)
      const response = await axios.post(
        `${config.apiEndpoint}/merchant/v1/payments/`,
        {
          reference: sessionId,
          subscriber: {
            country: "GA",
            currency: "XAF",
            msisdn: formatPhone(phone),
          },
          transaction: {
            amount: amount,
            country: "GA",
            currency: "XAF",
            id: sessionId,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Country": "GA",
            "X-Currency": "XAF",
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: config.timeout,
        }
      );

      return {
        success: true,
        status: PAYMENT_SESSION_STATUS.PENDING,
        providerReference: response.data.data?.transaction?.id || sessionId,
        message:
          "Demande envoyée. Le client recevra un prompt USSD pour confirmer.",
        ussdCode: response.data.data?.ussd_code || null,
        instructions: [
          "Un code USSD a été envoyé à votre téléphone",
          "Composez le code reçu par SMS",
          "Entrez votre code PIN Airtel Money",
          "Confirmez le paiement",
        ],
      };
    } catch (error) {
      console.error(
        "Erreur Airtel API:",
        error.response?.data || error.message
      );
      return {
        success: false,
        status: PAYMENT_SESSION_STATUS.FAILED,
        message: error.response?.data?.message || "Erreur Airtel Money",
        error: error.message,
      };
    }
  }

  /**
   * PRODUCTION - Airtel Money - Initier un retrait (Business to Customer)
   */
  static async airtelWithdrawRequest(sessionId, phone, amount) {
    const config = getProviderConfig(PAYMENT_METHODS.AIRTEL_MONEY);

    try {
      // Obtenir le token
      const authResponse = await axios.post(
        `${config.apiEndpoint}/auth/oauth2/token`,
        {
          client_id: config.apiKey,
          client_secret: config.apiSecret,
          grant_type: "client_credentials",
        }
      );

      const accessToken = authResponse.data.access_token;

      // Initier le disbursement
      const response = await axios.post(
        `${config.apiEndpoint}/standard/v1/disbursements/`,
        {
          payee: {
            msisdn: formatPhone(phone),
          },
          reference: sessionId,
          transaction: {
            amount: amount,
            id: sessionId,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Country": "GA",
            "X-Currency": "XAF",
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: config.timeout,
        }
      );

      return {
        success: true,
        status: PAYMENT_SESSION_STATUS.PENDING,
        providerReference: response.data.data?.transaction?.id || sessionId,
        message: "Retrait en cours de traitement",
        estimatedTime: "2-5 minutes",
        instructions: [
          "Votre retrait est en cours",
          "Les fonds seront envoyés dans quelques instants",
          "Vous recevrez un SMS de confirmation",
          "Durée estimée : 2-5 minutes",
        ],
      };
    } catch (error) {
      console.error("Erreur Airtel API:", error.message);
      return {
        success: false,
        status: PAYMENT_SESSION_STATUS.FAILED,
        message: error.response?.data?.message || "Erreur Airtel Money",
        error: error.message,
      };
    }
  }

  /**
   * PRODUCTION - Moov Money - Initier un dépôt
   */
  static async moovDepositRequest(sessionId, phone, amount) {
    const config = getProviderConfig(PAYMENT_METHODS.MOOV_MONEY);

    try {
      const response = await axios.post(
        `${config.apiEndpoint}/api/v1/collect`,
        {
          merchant_id: config.merchantId,
          transaction_id: sessionId,
          amount: amount,
          currency: "XAF",
          phone_number: formatPhone(phone),
          callback_url: config.callbackUrl,
          description: "Dépôt Mars Runner",
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
            "X-API-Secret": config.apiSecret,
          },
          timeout: config.timeout,
        }
      );

      return {
        success: true,
        status: PAYMENT_SESSION_STATUS.PENDING,
        providerReference: response.data.transaction_id || sessionId,
        message: "Code USSD envoyé. Veuillez composer le code pour confirmer.",
        ussdCode: response.data.ussd_code || null,
        instructions: [
          "Composez le code USSD reçu",
          "Entrez votre code PIN Moov Money",
          "Confirmez le paiement",
          "Votre compte sera crédité automatiquement",
        ],
      };
    } catch (error) {
      console.error("Erreur Moov API:", error.message);
      return {
        success: false,
        status: PAYMENT_SESSION_STATUS.FAILED,
        message: "Erreur Moov Money",
        error: error.message,
      };
    }
  }

  /**
   * PRODUCTION - Moov Money - Initier un retrait
   */
  static async moovWithdrawRequest(sessionId, phone, amount) {
    const config = getProviderConfig(PAYMENT_METHODS.MOOV_MONEY);

    try {
      const response = await axios.post(
        `${config.apiEndpoint}/api/v1/disburse`,
        {
          merchant_id: config.merchantId,
          transaction_id: sessionId,
          amount: amount,
          currency: "XAF",
          phone_number: formatPhone(phone),
          callback_url: config.callbackUrl,
          description: "Retrait Mars Runner",
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
            "X-API-Secret": config.apiSecret,
          },
          timeout: config.timeout,
        }
      );

      return {
        success: true,
        status: PAYMENT_SESSION_STATUS.PENDING,
        providerReference: response.data.transaction_id || sessionId,
        message: "Retrait en cours",
        estimatedTime: "2-5 minutes",
        instructions: [
          "Votre retrait est en cours de traitement",
          "Les fonds seront transférés sous peu",
          "Vous recevrez une confirmation par SMS",
        ],
      };
    } catch (error) {
      console.error("Erreur Moov API:", error.message);
      return {
        success: false,
        status: PAYMENT_SESSION_STATUS.FAILED,
        message: "Erreur Moov Money",
        error: error.message,
      };
    }
  }

  /**
   * PRODUCTION - Mobicash - Initier un dépôt
   */
  static async mobicashDepositRequest(sessionId, phone, amount) {
    const config = getProviderConfig(PAYMENT_METHODS.MOBICASH);

    try {
      const response = await axios.post(
        `${config.apiEndpoint}/api/v1/payment/collect`,
        {
          merchant_id: config.merchantId,
          reference: sessionId,
          amount: amount,
          currency: "XAF",
          customer_phone: formatPhone(phone),
          callback_url: config.callbackUrl,
          description: "Dépôt Mars Runner",
        },
        {
          headers: {
            "Content-Type": "application/json",
            "API-Key": config.apiKey,
            "API-Secret": config.apiSecret,
          },
          timeout: config.timeout,
        }
      );

      return {
        success: true,
        status: PAYMENT_SESSION_STATUS.PENDING,
        providerReference: response.data.reference || sessionId,
        message: "Code USSD envoyé pour confirmation",
        ussdCode: response.data.ussd_code || null,
        instructions: [
          "Composez le code USSD reçu",
          "Entrez votre code PIN Mobicash",
          "Validez le paiement",
        ],
      };
    } catch (error) {
      console.error("Erreur Mobicash API:", error.message);
      return {
        success: false,
        status: PAYMENT_SESSION_STATUS.FAILED,
        message: "Erreur Mobicash",
        error: error.message,
      };
    }
  }

  /**
   * PRODUCTION - Mobicash - Initier un retrait
   */
  static async mobicashWithdrawRequest(sessionId, phone, amount) {
    const config = getProviderConfig(PAYMENT_METHODS.MOBICASH);

    try {
      const response = await axios.post(
        `${config.apiEndpoint}/api/v1/payment/disburse`,
        {
          merchant_id: config.merchantId,
          reference: sessionId,
          amount: amount,
          currency: "XAF",
          customer_phone: formatPhone(phone),
          callback_url: config.callbackUrl,
          description: "Retrait Mars Runner",
        },
        {
          headers: {
            "Content-Type": "application/json",
            "API-Key": config.apiKey,
            "API-Secret": config.apiSecret,
          },
          timeout: config.timeout,
        }
      );

      return {
        success: true,
        status: PAYMENT_SESSION_STATUS.PENDING,
        providerReference: response.data.reference || sessionId,
        message: "Retrait en cours de traitement",
        estimatedTime: "2-5 minutes",
      };
    } catch (error) {
      console.error("Erreur Mobicash API:", error.message);
      return {
        success: false,
        status: PAYMENT_SESSION_STATUS.FAILED,
        message: "Erreur Mobicash",
        error: error.message,
      };
    }
  }

  /**
   * Point d'entrée principal - Initier un dépôt
   */
  static async initiateDeposit(sessionId, phone, amount, paymentMethod) {
    // Mode simulation
    if (paymentConfig.mode === "simulation") {
      return await this.simulateDepositRequest(
        sessionId,
        phone,
        amount,
        paymentMethod
      );
    }

    // Mode production
    switch (paymentMethod) {
      case PAYMENT_METHODS.AIRTEL_MONEY:
        return await this.airtelDepositRequest(sessionId, phone, amount);
      case PAYMENT_METHODS.MOOV_MONEY:
        return await this.moovDepositRequest(sessionId, phone, amount);
      case PAYMENT_METHODS.MOBICASH:
        return await this.mobicashDepositRequest(sessionId, phone, amount);
      default:
        return {
          success: false,
          status: PAYMENT_SESSION_STATUS.FAILED,
          message: "Méthode de paiement non supportée",
        };
    }
  }

  /**
   * Point d'entrée principal - Initier un retrait
   */
  static async initiateWithdraw(sessionId, phone, amount, paymentMethod) {
    // Mode simulation
    if (paymentConfig.mode === "simulation") {
      return await this.simulateWithdrawRequest(
        sessionId,
        phone,
        amount,
        paymentMethod
      );
    }

    // Mode production
    switch (paymentMethod) {
      case PAYMENT_METHODS.AIRTEL_MONEY:
        return await this.airtelWithdrawRequest(sessionId, phone, amount);
      case PAYMENT_METHODS.MOOV_MONEY:
        return await this.moovWithdrawRequest(sessionId, phone, amount);
      case PAYMENT_METHODS.MOBICASH:
        return await this.mobicashWithdrawRequest(sessionId, phone, amount);
      default:
        return {
          success: false,
          status: PAYMENT_SESSION_STATUS.FAILED,
          message: "Méthode de paiement non supportée",
        };
    }
  }

  /**
   * Vérifier le statut d'une transaction auprès du provider
   */
  static async checkTransactionStatus(providerReference, paymentMethod) {
    if (paymentConfig.mode === "simulation") {
      await sleep(500);
      // 80% de chance que ce soit complété
      const completed = Math.random() > 0.2;
      return {
        status: completed
          ? PAYMENT_SESSION_STATUS.COMPLETED
          : PAYMENT_SESSION_STATUS.PENDING,
        message: completed ? "Transaction complétée" : "En cours de traitement",
      };
    }

    // TODO: Implémenter selon chaque API
    // En attendant, retourner pending
    return {
      status: PAYMENT_SESSION_STATUS.PENDING,
      message: "Vérification du statut en cours",
    };
  }

  /**
   * Simuler la complétion automatique d'une transaction (pour les tests)
   */
  static async simulateAutoComplete(sessionId, delay = 10000) {
    if (paymentConfig.mode !== "simulation") return;

    console.log(
      `⏱️  [SIMULATION] Auto-complétion de ${sessionId} dans ${delay / 1000}s`
    );

    setTimeout(async () => {
      const { query } = require("../config/database");
      await query(
        "UPDATE payment_sessions SET status = ?, completed_at = NOW() WHERE session_id = ?",
        [PAYMENT_SESSION_STATUS.COMPLETED, sessionId]
      );
      console.log(`✅ [SIMULATION] Transaction ${sessionId} auto-complétée`);
    }, delay);
  }
}

module.exports = PaymentService;
