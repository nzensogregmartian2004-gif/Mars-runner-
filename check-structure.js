// =============================================
// 3. VÉRIFICATION DES FICHIERS - SCRIPT À EXÉCUTER
// =============================================

// Créez un fichier check-structure.js à la racine et exécutez-le

const fs = require("fs");
const path = require("path");

const requiredFiles = [
  "public",
  "public/index.html",
  "public/script.js",
  "public/style.css",
  "public/assets",
  "public/assets/background_music.mp3",
  "public/assets/game_over_sound.mp3",
];

console.log("🔍 Vérification de la structure...\n");

requiredFiles.forEach((file) => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  const icon = exists ? "✅" : "❌";
  console.log(`${icon} ${file}`);

  if (!exists) {
    if (file.endsWith(".mp3")) {
      console.log(
        `   → Créez un fichier audio ou utilisez un fichier temporaire`
      );
    } else if (!file.includes(".")) {
      console.log(`   → Créez le dossier: mkdir ${file}`);
    }
  }
});
