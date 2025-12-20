// ============================================
// SCRIPT DE TEST API - test-api.js
// ============================================
// Placez ce fichier à la racine de votre projet
// Exécutez avec: node test-api.js

const axios = require("axios");

const API_URL = "http://localhost:5000/api";

// Couleurs pour les logs
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

async function testRegister() {
  console.log(
    `\n${colors.blue}═══════════════════════════════════${colors.reset}`
  );
  console.log(`${colors.blue}TEST 1: INSCRIPTION${colors.reset}`);
  console.log(
    `${colors.blue}═══════════════════════════════════${colors.reset}`
  );

  const userData = {
    nom: "Test",
    prenom: "User",
    email: `test${Date.now()}@test.com`, // Email unique
    telephone: `06${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: "Test1234!",
    age: 25,
    referralCode: "",
  };

  try {
    console.log("📤 Envoi des données:", userData);

    const response = await axios.post(`${API_URL}/auth/register`, userData);

    console.log(`${colors.green}✅ SUCCÈS${colors.reset}`);
    console.log("📥 Réponse:", JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error) {
    console.log(`${colors.red}❌ ERREUR${colors.reset}`);
    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Données:", error.response.data);
    } else {
      console.log("Erreur:", error.message);
    }
    return null;
  }
}

async function testLogin(email, password) {
  console.log(
    `\n${colors.blue}═══════════════════════════════════${colors.reset}`
  );
  console.log(`${colors.blue}TEST 2: CONNEXION${colors.reset}`);
  console.log(
    `${colors.blue}═══════════════════════════════════${colors.reset}`
  );

  try {
    console.log("📤 Tentative de connexion:", { email, password: "***" });

    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    });

    console.log(`${colors.green}✅ SUCCÈS${colors.reset}`);
    console.log("📥 Réponse:", JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error) {
    console.log(`${colors.red}❌ ERREUR${colors.reset}`);
    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Données:", error.response.data);
    } else {
      console.log("Erreur:", error.message);
    }
    return null;
  }
}

async function testWithExistingUser() {
  console.log(
    `\n${colors.blue}═══════════════════════════════════${colors.reset}`
  );
  console.log(
    `${colors.blue}TEST 3: CONNEXION AVEC UTILISATEUR EXISTANT${colors.reset}`
  );
  console.log(
    `${colors.blue}═══════════════════════════════════${colors.reset}`
  );

  // Remplacez par un email qui existe dans votre DB
  const email = "azerty@gmail.com";
  const password = "votre_mot_de_passe"; // Remplacez

  await testLogin(email, password);
}

async function testServerHealth() {
  console.log(
    `\n${colors.blue}═══════════════════════════════════${colors.reset}`
  );
  console.log(`${colors.blue}TEST 0: SANTÉ DU SERVEUR${colors.reset}`);
  console.log(
    `${colors.blue}═══════════════════════════════════${colors.reset}`
  );

  try {
    const response = await axios.get(`${API_URL}/health`);
    console.log(`${colors.green}✅ Serveur accessible${colors.reset}`);
    console.log("📥 Réponse:", response.data);
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Serveur inaccessible${colors.reset}`);
    console.log("Erreur:", error.message);
    return false;
  }
}

async function runAllTests() {
  console.log(
    `\n${colors.yellow}╔═══════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${colors.yellow}║   TESTS API MARS RUNNER           ║${colors.reset}`
  );
  console.log(
    `${colors.yellow}╚═══════════════════════════════════╝${colors.reset}`
  );

  // Test 0: Santé du serveur
  const serverOk = await testServerHealth();
  if (!serverOk) {
    console.log(
      `\n${colors.red}⚠️  Le serveur n'est pas accessible. Vérifiez qu'il tourne sur le port 5000.${colors.reset}`
    );
    return;
  }

  // Test 1: Inscription
  const registerResult = await testRegister();

  if (registerResult) {
    // Extraire email et password
    const email =
      registerResult.data?.user?.email || registerResult.user?.email;
    const password = "Test1234!";

    if (email) {
      // Test 2: Connexion avec le compte nouvellement créé
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Attendre 1 sec
      await testLogin(email, password);
    }
  }

  // Test 3: Connexion avec utilisateur existant (optionnel)
  // await testWithExistingUser();

  console.log(
    `\n${colors.yellow}═══════════════════════════════════${colors.reset}`
  );
  console.log(`${colors.yellow}FIN DES TESTS${colors.reset}`);
  console.log(
    `${colors.yellow}═══════════════════════════════════${colors.reset}\n`
  );
}

// Exécuter les tests
runAllTests().catch((err) => {
  console.error(`${colors.red}Erreur critique:${colors.reset}`, err);
});
