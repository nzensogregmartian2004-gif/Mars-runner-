# 🚀 Martian Runner - Backend API

Backend Node.js/Express pour le jeu Martian Runner avec système de paiement mobile intégré (Airtel Money, Moov Money, Mobicash).

## 📋 Table des matières

- [Fonctionnalités](#fonctionnalités)
- [Technologies](#technologies)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Démarrage](#démarrage)
- [Structure du projet](#structure-du-projet)
- [API Endpoints](#api-endpoints)
- [Base de données](#base-de-données)
- [Paiements mobiles](#paiements-mobiles)
- [Sécurité](#sécurité)

## ✨ Fonctionnalités

- ✅ **Authentification JWT** complète (inscription, connexion, réinitialisation mot de passe)
- 🎮 **Gestion des parties** de jeu avec multiplicateurs et gains
- 💰 **Système de portefeuille** avec dépôts et retraits
- 📱 **Paiements mobiles** (Airtel Money, Moov Money, Mobicash)
- 👥 **Programme de parrainage** avec bonus
- 📊 **Statistiques** et classements
- 📧 **Notifications** par email et SMS
- 🔒 **Sécurité** renforcée avec rate limiting et validation

## 🛠 Technologies

- **Node.js** 18+
- **Express.js** 4.x
- **MySQL** 8.x
- **JWT** pour l'authentification
- **Bcrypt** pour le hashing de mots de passe
- **Nodemailer** pour les emails
- **Axios** pour les appels API de paiement

## 📦 Prérequis

- Node.js >= 18.0.0
- MySQL >= 8.0
- npm >= 9.0.0

## 🚀 Installation

1. **Cloner le projet**

```bash
git clone <url-du-repo>
cd martian-runner-backend
```

2. **Installer les dépendances**

```bash
npm install
```

3. **Créer la base de données**

```bash
mysql -u root -p < database/schema.sql
```

4. **Configurer les variables d'environnement**

```bash
cp .env.example .env
# Éditer le fichier .env avec vos configurations
```

## ⚙️ Configuration

Éditez le fichier `.env` avec vos configurations :

### Variables obligatoires

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
DB_NAME=martian_runner

JWT_SECRET=votre_cle_secrete_tres_longue
```

### Variables optionnelles

```env
# Email
EMAIL_USER=votre_email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_app

# SMS
SMS_API_KEY=votre_cle_api_sms

# Paiement (pour la production)
AIRTEL_API_KEY=...
MOOV_API_KEY=...
MOBICASH_API_KEY=...
```

## 🏁 Démarrage

### Mode développement

```bash
npm run dev
```

### Mode production

```bash
npm start
```

Le serveur démarre sur `http://localhost:5000`

## 📁 Structure du projet

```
martian-runner-backend/
├── config/
│   ├── database.js          # Configuration MySQL
│   └── payment.js           # Configuration paiement
├── controllers/
│   ├── authController.js    # Authentification
│   ├── gameController.js    # Gestion jeu
│   ├── walletController.js  # Portefeuille
│   ├── referralController.js # Parrainage
│   └── paymentController.js # Paiements
├── middleware/
│   ├── auth.js              # Middleware auth
│   ├── validator.js         # Validation
│   └── errorHandler.js      # Gestion erreurs
├── models/
│   ├── User.js              # Modèle utilisateur
│   ├── Game.js              # Modèle partie
│   ├── Transaction.js       # Modèle transaction
│   └── Referral.js          # Modèle parrainage
├── routes/
│   ├── auth.js              # Routes auth
│   ├── game.js              # Routes jeu
│   ├── wallet.js            # Routes portefeuille
│   ├── referral.js          # Routes parrainage
│   └── payment.js           # Routes paiement
├── services/
│   ├── emailService.js      # Service email
│   ├── smsService.js        # Service SMS
│   └── paymentService.js    # Service paiement
├── utils/
│   ├── helpers.js           # Fonctions utilitaires
│   └── constants.js         # Constantes
├── database/
│   └── schema.sql           # Schéma DB
├── .env.example             # Exemple config
└── server.js                # Point d'entrée
```

## 🔌 API Endpoints

### Authentification

```
POST   /api/auth/register          - Inscription
POST   /api/auth/login             - Connexion
POST   /api/auth/forgot-password   - Réinitialisation
GET    /api/auth/profile           - Profil utilisateur
PUT    /api/auth/profile           - Mise à jour profil
POST   /api/auth/change-password   - Changer mot de passe
POST   /api/auth/logout            - Déconnexion
```

### Jeu

```
POST   /api/game/start             - Démarrer partie
PUT    /api/game/progress          - MAJ progression
POST   /api/game/cashout           - Retirer gains
POST   /api/game/gameover          - Terminer partie
GET    /api/game/active            - Partie active
GET    /api/game/history           - Historique
GET    /api/game/stats             - Statistiques
GET    /api/game/leaderboard       - Classement
```

### Portefeuille

```
GET    /api/wallet/balance         - Solde
GET    /api/wallet/transactions    - Historique transactions
GET    /api/wallet/summary         - Résumé
GET    /api/wallet/stats           - Statistiques
GET    /api/wallet/can-withdraw    - Vérifier retrait
GET    /api/wallet/calculate-fees  - Calculer frais
GET    /api/wallet/limits          - Limites
```

### Parrainage

```
GET    /api/referral/my-code       - Mon code
GET    /api/referral/my-referrals  - Mes filleuls
GET    /api/referral/my-stats      - Mes stats
GET    /api/referral/my-sponsor    - Mon parrain
GET    /api/referral/verify/:code  - Vérifier code
GET    /api/referral/top-sponsors  - Top parrains
```

### Paiement

```
GET    /api/payment/methods        - Méthodes disponibles
POST   /api/payment/deposit        - Initier dépôt
POST   /api/payment/withdraw       - Initier retrait
GET    /api/payment/status/:id     - Statut paiement
POST   /api/payment/callback/:provider - Webhook
```

## 🗄️ Base de données

### Tables principales

- `users` - Utilisateurs
- `games` - Parties de jeu
- `transactions` - Transactions financières
- `referrals` - Parrainages
- `user_stats` - Statistiques utilisateur
- `payment_sessions` - Sessions de paiement
- `activity_logs` - Logs d'activité

### Schéma complet

Voir `database/schema.sql`

## 💳 Paiements mobiles

### Configuration

Le système supporte trois opérateurs :

- **Airtel Money**
- **Moov Money**
- **Mobicash**

### Mode simulation

Par défaut, le mode simulation est activé :

```env
PAYMENT_MODE=simulation
```

Dans ce mode, les paiements sont simulés sans appel aux API réelles.

### Mode production

Pour activer les API réelles :

```env
PAYMENT_MODE=production
AIRTEL_ENABLED=true
AIRTEL_API_KEY=...
# etc.
```

### Commission

Une commission de 5% est appliquée sur tous les dépôts et retraits.

### Limites

- **Dépôt** : 100 - 50,000 FCFA
- **Retrait** : 10 - 1,000 Nso (1,000 - 100,000 FCFA)

## 🔒 Sécurité

- ✅ Authentification JWT
- ✅ Hashing bcrypt des mots de passe
- ✅ Rate limiting (100 req/15min)
- ✅ Validation des entrées
- ✅ Protection CORS
- ✅ Helmet.js pour headers sécurisés
- ✅ Logs d'activité
- ✅ Protection contre les injections SQL

## 📧 Notifications

### Email

- Bienvenue
- Réinitialisation mot de passe
- Confirmation dépôt
- Confirmation retrait
- Bonus de parrainage

### SMS

- Code OTP
- Notifications de gains
- Confirmations de paiement

## 🧪 Tests

```bash
npm test
```

## 📝 Licence

MIT

## 👨‍💻 Auteur

Votre Nom

## 🤝 Support

Pour toute question ou assistance : support@martianrunner.com
