// ===============================================
// MSI UTILITY v3 - LICENSE CHECKER (BEZ CMD)
// ===============================================

const axios = require('axios');
const { execFile } = require('child_process');
const path = require('path');

// ⚙️ KONFIGURACJA
const SERVER_URL = 'https://discord-msi-bot.onrender.com'; // ZMIEŃ NA SWOJĄ DOMENĘ RENDER
const USER_ID = '1311858477232029819'; // To zostanie wbudowane podczas buildu

// 🎨 Kolory konsoli (dla lepszego UI)
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// 📋 Funkcja do wyświetlania nagłówka
function showHeader() {
  console.clear();
  console.log('='.repeat(60));
  console.log('🔐 MSI UTILITY v3 - LICENSE CHECKER');
  console.log('='.repeat(60));
  console.log('');
}

// 🔍 Funkcja sprawdzająca licencję
async function checkLicense() {
  showHeader();
  
  console.log(`👤 User ID: ${USER_ID}`);
  console.log(`🌐 Server: ${SERVER_URL}`);
  console.log('');
  console.log('🔍 Sprawdzanie licencji...');
  
  try {
    // Wysłij request do API
    const response = await axios.get(`${SERVER_URL}/api/status/${USER_ID}`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'MsiUtility/3.0'
      }
    });

    const data = response.data;

    console.log('');
    
    // Sprawdź czy sesja aktywna
    if (data.active && data.session && data.session.status === 'active') {
      console.log(`${colors.green}✅ SESSION ACTIVATED${colors.reset}`);
      console.log('');
      console.log(`${colors.green}🟢${colors.reset} Program access: ${colors.green}UNLOCKED${colors.reset}`);
      console.log(`${colors.green}🟢${colors.reset} Connection: ${colors.green}ESTABLISHED${colors.reset}`);
      console.log(`${colors.green}🟢${colors.reset} Status: ${colors.green}READY${colors.reset}`);
      console.log('');
      console.log(`👤 User: ${colors.cyan}${data.session.username}${colors.reset}`);
      console.log(`🔑 ID: ${colors.cyan}${data.userId}${colors.reset}`);
      console.log('');
      console.log(`${colors.green}🚀 Możesz teraz uruchomić MsiUtility_v3.exe!${colors.reset}`);
      console.log(`${colors.yellow}📝 Wpisz /unload gdy skończysz używać programu.${colors.reset}`);
      console.log('');
      console.log('='.repeat(60));
      console.log('');
      console.log('Naciśnij ENTER...');
      
      // Poczekaj na Enter i uruchom program
      await waitForEnter();
      
      // TUTAJ URUCHOM WŁAŚCIWY PROGRAM (bez CMD)
      return launchMainProgram();
      
    } else {
      // Sesja nieaktywna
      console.log(`${colors.red}❌ BRAK AKTYWNEJ SESJI${colors.reset}`);
      console.log('='.repeat(60));
      console.log('');
      console.log(`${colors.red}📋${colors.reset} Aby uruchomić program:`);
      console.log(`   ${colors.cyan}1.${colors.reset} Wpisz ${colors.green}/load${colors.reset} na Discord`);
      console.log(`   ${colors.cyan}2.${colors.reset} Poczekaj na ${colors.green}'SESSION ACTIVATED'${colors.reset}`);
      console.log(`   ${colors.cyan}3.${colors.reset} Uruchom program ponownie`);
      console.log('');
      console.log(`${colors.yellow}💡${colors.reset} Po zakończeniu wpisz ${colors.red}/unload${colors.reset}`);
      console.log('');
      console.log('='.repeat(60));
      console.log('');
      console.log('Naciśnij ENTER...');
      
      await waitForEnter();
      process.exit(0);
    }

  } catch (error) {
    console.log('');
    console.log(`${colors.red}❌ BŁĄD POŁĄCZENIA${colors.reset}`);
    console.log('='.repeat(60));
    console.log('');
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.log(`${colors.red}🌐${colors.reset} Nie można połączyć z serwerem licencji`);
      console.log(`${colors.yellow}⚠️${colors.reset}  Sprawdź połączenie internetowe`);
    } else if (error.code === 'ETIMEDOUT') {
      console.log(`${colors.red}⏱️${colors.reset}  Przekroczono limit czasu połączenia`);
    } else {
      console.log(`${colors.red}⚠️${colors.reset}  ${error.message}`);
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('');
    console.log('Naciśnij ENTER...');
    
    await waitForEnter();
    process.exit(1);
  }
}

// ⏸️ Funkcja czekająca na Enter
function waitForEnter() {
  return new Promise((resolve) => {
    process.stdin.once('data', () => {
      resolve();
    });
  });
}

// 🚀 Funkcja uruchamiająca główny program (BEZ POKAZYWANIA CMD)
function launchMainProgram() {
  console.log('🚀 Uruchamianie głównego programu...');
  console.log('');
  
  // Ścieżka do właściwego programu (w tym samym folderze)
  const mainProgramPath = path.join(__dirname, 'MsiUtility_v3_real.exe');
  
  // Sprawdź czy plik istnieje
  const fs = require('fs');
  if (!fs.existsSync(mainProgramPath)) {
    console.log(`${colors.red}❌ Błąd: Nie znaleziono głównego programu!${colors.reset}`);
    console.log(`${colors.yellow}Oczekiwana ścieżka: ${mainProgramPath}${colors.reset}`);
    console.log('');
    console.log('Naciśnij ENTER...');
    waitForEnter().then(() => process.exit(1));
    return;
  }
  
  // Uruchom program BEZ POKAZYWANIA CMD
  const child = execFile(mainProgramPath, [], {
    detached: true,
    stdio: 'ignore', // ⚠️ TO UKRYWA CMD!
    windowsHide: true // ⚠️ TO UKRYWA OKNO NA WINDOWSIE!
  });
  
  // Odłącz proces od rodzica
  child.unref();
  
  console.log(`${colors.green}✅ Program uruchomiony pomyślnie!${colors.reset}`);
  console.log('');
  
  // Zamknij checker po 2 sekundach
  setTimeout(() => {
    process.exit(0);
  }, 2000);
}

// 🏁 START
console.log('Inicjalizacja...');
process.stdin.setRawMode(true);
process.stdin.resume();

checkLicense();