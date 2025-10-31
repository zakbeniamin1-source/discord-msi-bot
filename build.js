const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// ⚙️ KONFIGURACJA
const SERVER_URL = 'https://twoja-nazwa.onrender.com'; // ZMIEŃ!
const OUTPUT_DIR = './dist';

console.log('🔨 MSI Utility v3 - Builder');
console.log('='.repeat(60));
console.log('');

// Upewnij się że folder dist istnieje
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// Przeczytaj szablon checkera
const checkerTemplate = fs.readFileSync('./checker.js', 'utf8');

// Funkcja do budowania .exe dla konkretnego użytkownika
function buildForUser(userId, username) {
  console.log(`📦 Building for: ${username} (${userId})`);
  
  // Zastąp placeholdery
  let customChecker = checkerTemplate
    .replace('https://twoja-nazwa.onrender.com', SERVER_URL)
    .replace('1311858477232029819', userId);
  
  // Zapisz tymczasowy plik
  const tempFile = `./temp_checker_${userId}.js`;
  fs.writeFileSync(tempFile, customChecker);
  
  // Build .exe używając pkg
  const outputName = path.join(OUTPUT_DIR, `MsiUtility_v3_${username.replace(/[^a-zA-Z0-9]/g, '_')}.exe`);
  
  try {
    console.log('   ⏳ Compiling...');
    execSync(`npx pkg ${tempFile} -t node18-win-x64 -o "${outputName}" --compress GZip`, {
      stdio: 'inherit'
    });
    
    console.log(`   ✅ Created: ${outputName}`);
    console.log('');
    
    // Usuń tymczasowy plik
    fs.unlinkSync(tempFile);
    
    return outputName;
  } catch (error) {
    console.error(`   ❌ Build failed: ${error.message}`);
    fs.unlinkSync(tempFile);
    return null;
  }
}

// Przykład użycia
console.log('💡 Przykład użycia:');
console.log('');
console.log('   const builder = require("./build.js");');
console.log('   builder.buildForUser("USER_ID", "username");');
console.log('');
console.log('Lub dodaj to do bota, aby build był dynamiczny!');
console.log('');
console.log('='.repeat(60));

module.exports = { buildForUser };