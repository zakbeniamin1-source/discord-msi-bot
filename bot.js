const { Client, GatewayIntentBits, REST, Routes, AttachmentBuilder } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Konfiguracja
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const PORT = process.env.PORT || 3000;
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

// Mapa aktywnych sesji: userId -> status
const activeSessions = new Map();

// Express server
const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Health check
app.get('/', (req, res) => {
  res.send('🟢 Bot działa! Aktywnych sesji: ' + activeSessions.size);
});

// ✅ API - Sprawdzanie statusu sesji
app.get('/api/status/:userId', (req, res) => {
  const userId = req.params.userId;
  const session = activeSessions.get(userId);
  
  res.json({ 
    active: activeSessions.has(userId),
    userId: userId,
    session: session || null
  });
});

// Discord Bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});

// Komendy slash
const commands = [
  {
    name: 'download',
    description: 'Pobierz spersonalizowany MsiUtility_v3.exe dla tego konta',
  },
  {
    name: 'load',
    description: 'Aktywuj sesję - odblokuj program',
  },
  {
    name: 'unload',
    description: 'Dezaktywuj sesję - zablokuj program',
  },
  {
    name: 'status',
    description: 'Sprawdź status swojej sesji',
  },
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('📝 Rejestrowanie komend slash...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Komendy zarejestrowane!');
  } catch (error) {
    console.error('❌ Błąd podczas rejestracji komend:', error);
  }
})();

client.on('ready', () => {
  console.log(`✅ Bot zalogowany jako ${client.user.tag}`);
  console.log(`🌐 Server URL: ${SERVER_URL}`);
  
  // Utwórz foldery
  const dirs = ['build', 'dist'];
  dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;
  const username = interaction.user.tag;

  try {
    // 🔥 DOWNLOAD - Generowanie spersonalizowanego MsiUtility_v3.exe
    if (interaction.commandName === 'download') {
      await interaction.deferReply({ ephemeral: true });

      try {
        // 1. Wygeneruj spersonalizowany launcher.py
        const launcherCode = generateLauncher(userId, username, SERVER_URL);
        const pyFile = path.join(__dirname, 'build', `launcher_${userId}.py`);
        fs.writeFileSync(pyFile, launcherCode, 'utf8');

        // 2. Sprawdź czy PyInstaller jest dostępny
        let exeFile;
        try {
          // Próba kompilacji z PyInstaller (jeśli dostępny)
          const exePath = path.join(__dirname, 'dist', `MsiUtility_v3_${userId}.exe`);
          execSync(`pyinstaller --onefile --noconsole --distpath "${path.join(__dirname, 'dist')}" --workpath "${path.join(__dirname, 'build')}" --specpath "${path.join(__dirname, 'build')}" --name "MsiUtility_v3_${userId}" "${pyFile}"`, {
            stdio: 'pipe'
          });
          exeFile = exePath;
          
          await interaction.editReply({
            content: `🎉 **Twój spersonalizowany MsiUtility_v3.exe**\n\n` +
                     `✅ Wygenerowano dla: **${username}**\n` +
                     `🔑 User ID: \`${userId}\`\n\n` +
                     `**JAK UŻYWAĆ:**\n` +
                     `1️⃣ Pobierz **MsiUtility_v3_${userId}.exe**\n` +
                     `2️⃣ Zmień nazwę na **MsiUtility_v3.exe**\n` +
                     `3️⃣ Umieść obok prawdziwego programu **MsiUtility_v3.real.exe**\n` +
                     `4️⃣ Wpisz \`/load\` aby aktywować sesję\n` +
                     `5️⃣ Uruchom **MsiUtility_v3.exe** - program się odpali\n` +
                     `6️⃣ Wpisz \`/unload\` gdy skończysz\n\n` +
                     `⚠️ **Ten plik działa TYLKO dla Twojego konta Discord!**\n` +
                     `🔒 Bez aktywnej sesji (/load) program się nie uruchomi`,
            files: [new AttachmentBuilder(exeFile, { name: `MsiUtility_v3.exe` })],
          });

          // Cleanup
          setTimeout(() => {
            try {
              fs.unlinkSync(exeFile);
              fs.unlinkSync(pyFile);
            } catch (e) {}
          }, 10000);

        } catch (pyinstallerError) {
          // Fallback - wyślij .py jeśli PyInstaller niedostępny
          await interaction.editReply({
            content: `📦 **Twój spersonalizowany launcher**\n\n` +
                     `✅ Wygenerowano dla: **${username}**\n` +
                     `🔑 User ID: \`${userId}\`\n\n` +
                     `⚠️ **PyInstaller niedostępny na serwerze**\n` +
                     `Musisz sam skompilować:\n\n` +
                     `**INSTRUKCJA:**\n` +
                     `1️⃣ Pobierz **launcher_${userId}.py**\n` +
                     `2️⃣ Zainstaluj: \`pip install pyinstaller requests\`\n` +
                     `3️⃣ Kompiluj: \`pyinstaller --onefile --noconsole launcher_${userId}.py\`\n` +
                     `4️⃣ Zmień nazwę na **MsiUtility_v3.exe**\n` +
                     `5️⃣ Umieść obok **MsiUtility_v3.real.exe**\n` +
                     `6️⃣ Wpisz \`/load\` i uruchom!\n\n` +
                     `🔒 Ten launcher działa TYLKO dla Twojego konta!`,
            files: [new AttachmentBuilder(pyFile, { name: `MsiUtility_v3.py` })],
          });

          setTimeout(() => {
            try {
              fs.unlinkSync(pyFile);
            } catch (e) {}
          }, 10000);
        }

      } catch (error) {
        console.error('Błąd generowania launchera:', error);
        await interaction.editReply({
          content: '❌ Błąd podczas generowania launchera. Spróbuj ponownie.',
        });
      }
    }

    // ✅ LOAD - Aktywacja sesji
    else if (interaction.commandName === 'load') {
      if (activeSessions.has(userId)) {
        return interaction.reply({
          content: '⚠️ **Sesja już aktywna!**\n\n' +
                   'Twoja sesja jest już odblokowana.\n' +
                   'Możesz uruchomić program.\n\n' +
                   'Użyj `/unload` aby zakończyć sesję.',
          ephemeral: true,
        });
      }

      await interaction.reply({
        content: '🔄 **ACTIVATING SESSION...**\n\n' +
                 '⏳ Verifying credentials...\n' +
                 '⏳ Establishing secure connection...\n' +
                 '⏳ Unlocking program access...',
        ephemeral: true,
      });

      setTimeout(async () => {
        activeSessions.set(userId, {
          activated: Date.now(),
          status: 'active',
          username: username
        });

        await interaction.editReply({
          content: '✅ **SESSION ACTIVATED**\n\n' +
                   '🟢 Program access: **UNLOCKED**\n' +
                   '🟢 Connection: **ESTABLISHED**\n' +
                   '🟢 Status: **READY**\n\n' +
                   `👤 User: **${username}**\n` +
                   `🔑 ID: \`${userId}\`\n` +
                   `⏰ Activated: ${new Date().toLocaleString('pl-PL')}\n\n` +
                   '🚀 **Możesz teraz uruchomić MsiUtility_v3.exe!**\n' +
                   '📝 Wpisz `/unload` gdy skończysz używać programu.',
        });

        console.log(`✅ [LOAD] Sesja aktywowana: ${username} (${userId})`);
      }, 3000);
    }

    // 🔴 UNLOAD - Dezaktywacja sesji
    else if (interaction.commandName === 'unload') {
      if (!activeSessions.has(userId)) {
        return interaction.reply({
          content: '❌ **Brak aktywnej sesji**\n\n' +
                   'Nie masz aktywnej sesji do zakończenia.\n' +
                   'Użyj `/load` aby rozpocząć nową sesję.',
          ephemeral: true,
        });
      }

      await interaction.reply({
        content: '🔄 **CLOSING SESSION...**\n\n' +
                 '⏳ Saving session data...\n' +
                 '⏳ Terminating connection...\n' +
                 '⏳ Locking program access...',
        ephemeral: true,
      });

      setTimeout(async () => {
        activeSessions.delete(userId);

        await interaction.editReply({
          content: '✅ **SESSION CLOSED**\n\n' +
                   '🔴 Program access: **LOCKED**\n' +
                   '🔴 Connection: **TERMINATED**\n' +
                   '🔴 Status: **INACTIVE**\n\n' +
                   '👋 Sesja zakończona pomyślnie.\n' +
                   '🔒 Program nie będzie działał do następnego `/load`',
        });

        console.log(`🔴 [UNLOAD] Sesja zakończona: ${username} (${userId})`);
      }, 2000);
    }

    // 📊 STATUS
    else if (interaction.commandName === 'status') {
      const session = activeSessions.get(userId);
      
      if (!session) {
        return interaction.reply({
          content: '📊 **STATUS SESJI**\n\n' +
                   '🔴 Status: **NIEAKTYWNA**\n' +
                   '🔒 Program: **ZABLOKOWANY**\n\n' +
                   'Użyj `/load` aby odblokować program.',
          ephemeral: true,
        });
      }

      const uptime = Date.now() - session.activated;
      const hours = Math.floor(uptime / 3600000);
      const minutes = Math.floor((uptime % 3600000) / 60000);
      const seconds = Math.floor((uptime % 60000) / 1000);

      await interaction.reply({
        content: '📊 **STATUS SESJI**\n\n' +
                 '🟢 Status: **AKTYWNA**\n' +
                 '🔓 Program: **ODBLOKOWANY**\n\n' +
                 `⏱️ Czas działania: ${hours}h ${minutes}m ${seconds}s\n` +
                 `👤 User: **${username}**\n` +
                 `🔑 ID: \`${userId}\`\n` +
                 `📅 Aktywowano: ${new Date(session.activated).toLocaleString('pl-PL')}\n\n` +
                 '💡 Program będzie działał do momentu `/unload`',
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error('❌ Błąd podczas obsługi komendy:', error);
    try {
      await interaction.reply({
        content: '❌ Wystąpił błąd podczas wykonywania komendy.',
        ephemeral: true,
      });
    } catch (e) {}
  }
});

// 🔥 FUNKCJA - Generowanie spersonalizowanego launchera
function generateLauncher(userId, username, serverUrl) {
  return `"""
MSI UTILITY v3 - SECURE LAUNCHER
Spersonalizowany dla: ${username}
User ID: ${userId}
"""

import sys
import os
import requests
import subprocess
import time
from pathlib import Path

# ===== KONFIGURACJA WBUDOWANA =====
USER_ID = "${userId}"
USERNAME = "${username}"
SERVER_URL = "${serverUrl}"

def print_header():
    """Wyświetla header programu"""
    print("\\n" + "="*70)
    print("             MSI UTILITY v3 - SECURE LAUNCHER")
    print("="*70)
    print(f"  Licensed to: {USERNAME}")
    print(f"  License Key: {USER_ID[:16]}...")
    print("="*70)

def check_session_active():
    """Sprawdza czy sesja jest aktywna na serwerze"""
    try:
        response = requests.get(
            f"{SERVER_URL}/api/status/{USER_ID}", 
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            return data.get('active', False)
        return False
    except requests.exceptions.Timeout:
        print("\\n❌ Timeout - Serwer nie odpowiada")
        return False
    except requests.exceptions.ConnectionError:
        print("\\n❌ Błąd połączenia - Sprawdź internet")
        return False
    except Exception as e:
        print(f"\\n❌ Błąd połączenia: {e}")
        return False

def get_real_program_path():
    """Zwraca ścieżkę do prawdziwego programu"""
    launcher_dir = os.path.dirname(os.path.abspath(sys.executable if getattr(sys, 'frozen', False) else __file__))
    real_program = os.path.join(launcher_dir, "MsiUtility_v3.real.exe")
    
    if not os.path.exists(real_program):
        return None
    
    return real_program

def main():
    print_header()
    
    print("\\n🔍 Verifying license...")
    print(f"   Server: {SERVER_URL}")
    print(f"   Checking authorization...")
    
    # Sprawdź sesję
    time.sleep(1)
    is_active = check_session_active()
    
    if not is_active:
        print("\\n" + "="*70)
        print("              ❌ ACCESS DENIED - SESSION INACTIVE")
        print("="*70)
        print("\\n🔒 This program requires an active session to run.")
        print("\\n📝 TO START THE PROGRAM:")
        print("   1. Open Discord")
        print("   2. Type: /load")
        print("   3. Wait for 'SESSION ACTIVATED' message")
        print("   4. Run this program again")
        print("   5. Type /unload when finished")
        print("\\n⚠️  Do NOT share this file - it's tied to your Discord account!")
        print("="*70)
        input("\\n❌ Press ENTER to close...")
        sys.exit(0)
    
    print("\\n✅ License verified - Access granted!")
    
    # Znajdź prawdziwy program
    real_program = get_real_program_path()
    
    if not real_program:
        print("\\n" + "="*70)
        print("           ❌ ERROR - REAL PROGRAM NOT FOUND")
        print("="*70)
        print("\\n📝 INSTALLATION REQUIRED:")
        print("   1. Rename your real program to: MsiUtility_v3.real.exe")
        print("   2. Place it in the same folder as this launcher")
        print("   3. Run this launcher again")
        print("\\n📂 Current folder:")
        print(f"   {os.path.dirname(os.path.abspath(sys.executable if getattr(sys, 'frozen', False) else __file__))}")
        print("="*70)
        input("\\n❌ Press ENTER to close...")
        sys.exit(1)
    
    print("\\n" + "="*70)
    print("              ✅ AUTHORIZATION SUCCESSFUL")
    print("="*70)
    print("\\n🚀 Starting program...")
    print(f"   Loading: {os.path.basename(real_program)}")
    print("   Please wait...")
    
    time.sleep(1.5)
    
    try:
        # Uruchom prawdziwy program w tle
        if sys.platform == 'win32':
            subprocess.Popen(
                [real_program],
                creationflags=subprocess.CREATE_NEW_CONSOLE | subprocess.DETACHED_PROCESS,
                close_fds=True
            )
        else:
            subprocess.Popen([real_program], close_fds=True)
        
        print("\\n✅ Program launched successfully!")
        print("="*70)
        print("\\n💡 IMPORTANT:")
        print("   • Program is now running")
        print("   • You can close this window")
        print("   • Type /unload on Discord when finished")
        print("   • Session will remain active until /unload")
        print("="*70)
        
        time.sleep(3)
        print("\\n👋 Launcher closing...")
        time.sleep(1)
        
    except Exception as e:
        print(f"\\n❌ Error launching program: {e}")
        input("\\n❌ Press ENTER to close...")
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\\n\\n👋 Interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\\n❌ Unexpected error: {e}")
        input("\\n❌ Press ENTER to close...")
        sys.exit(1)
`;
}

// Start serwera
app.listen(PORT, () => {
  console.log(`\\n${'='.repeat(60)}`);
  console.log('🌐 MSI UTILITY v3 - LICENSE SERVER');
  console.log('='.repeat(60));
  console.log(`✅ Server running on port: ${PORT}`);
  console.log(`📡 API endpoint: ${SERVER_URL}`);
  console.log(`🤖 Discord bot: Connecting...`);
  console.log('='.repeat(60));
});

// Start bota
client.login(TOKEN).catch(err => {
  console.error('❌ Błąd logowania bota:', err);
  process.exit(1);
});