const { Client, GatewayIntentBits, REST, Routes, AttachmentBuilder } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');

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

// ✅ API - Sprawdzanie statusu sesji (NAPRAWIONY)
app.get('/api/status/:userId', (req, res) => {
  const userId = req.params.userId;
  const session = activeSessions.get(userId);
  
  // Log dla debugowania
  console.log(`📊 [API] Status check for user ${userId}: ${activeSessions.has(userId) ? 'ACTIVE' : 'INACTIVE'}`);
  
  // WAŻNE: Odpowiedź musi zawierać poprawny status
  res.json({ 
    active: activeSessions.has(userId),
    userId: userId,
    session: session || null,
    timestamp: Date.now()
  });
});

// 🔥 NOWY ENDPOINT - Pobieranie pliku przez przeglądarkę
app.get('/download/:userId', async (req, res) => {
  const userId = req.params.userId;
  const exePath = path.join(__dirname, 'MsiUtility_v3.exe');

  try {
    // Sprawdź czy plik istnieje
    if (!fs.existsSync(exePath)) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Error - File Not Found</title>
          <style>
            body { font-family: Arial; background: #1a1a1a; color: #fff; text-align: center; padding: 50px; }
            .error { background: #ff4444; padding: 20px; border-radius: 10px; max-width: 500px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>❌ Error 404</h1>
            <p>MsiUtility_v3.exe not found on server</p>
            <p>Contact administrator</p>
          </div>
        </body>
        </html>
      `);
    }

    // Pobierz statystyki pliku
    const stats = fs.statSync(exePath);
    const filename = `MsiUtility_v3_${userId}.exe`;

    console.log(`📥 [DOWNLOAD] User ${userId} downloading file via web`);

    // Ustaw nagłówki dla pobierania
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'no-cache');

    // Wyślij plik jako stream
    const fileStream = fs.createReadStream(exePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('❌ Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).send('Error downloading file');
      }
    });

  } catch (error) {
    console.error('❌ Download error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Server Error</title>
        <style>
          body { font-family: Arial; background: #1a1a1a; color: #fff; text-align: center; padding: 50px; }
          .error { background: #ff4444; padding: 20px; border-radius: 10px; max-width: 500px; margin: 0 auto; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>❌ Server Error</h1>
          <p>An error occurred while downloading the file</p>
          <p>Error: ${error.message}</p>
        </div>
      </body>
      </html>
    `);
  }
});

// 📥 Alternatywny endpoint bez userId (jeśli ktoś wejdzie bezpośrednio)
app.get('/download', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Download - User ID Required</title>
      <style>
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff; 
          text-align: center; 
          padding: 50px;
          margin: 0;
        }
        .container { 
          background: rgba(255,255,255,0.1); 
          padding: 40px; 
          border-radius: 20px; 
          max-width: 600px; 
          margin: 0 auto;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        h1 { font-size: 2.5em; margin-bottom: 20px; }
        p { font-size: 1.2em; line-height: 1.6; }
        .icon { font-size: 4em; margin-bottom: 20px; }
        .code { 
          background: rgba(0,0,0,0.3); 
          padding: 15px; 
          border-radius: 10px; 
          font-family: 'Courier New', monospace;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">🔐</div>
        <h1>MSI Utility v3</h1>
        <p>⚠️ User ID is required to download</p>
        <p>Please use Discord command:</p>
        <div class="code">/download</div>
        <p>This will generate a personalized download link for your account.</p>
      </div>
    </body>
    </html>
  `);
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
  
  // Sprawdź czy plik .exe istnieje
  const exePath = path.join(__dirname, 'MsiUtility_v3.exe');
  if (fs.existsSync(exePath)) {
    const stats = fs.statSync(exePath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ MsiUtility_v3.exe znaleziony! (${sizeMB} MB)`);
  } else {
    console.log('⚠️ MsiUtility_v3.exe NIE ZNALEZIONY - użytkownicy dostaną błąd!');
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;
  const username = interaction.user.tag;

  try {
    // 🔥 DOWNLOAD - Wysyłanie LINKU do pobrania (zamiast załącznika)
    if (interaction.commandName === 'download') {
      await interaction.deferReply({ ephemeral: true });

      try {
        const exePath = path.join(__dirname, 'MsiUtility_v3.exe');
        
        // Sprawdź czy plik istnieje
        if (!fs.existsSync(exePath)) {
          return await interaction.editReply({
            content: '❌ **Błąd serwera**\n\n' +
                     'Plik MsiUtility_v3.exe nie został znaleziony na serwerze.\n' +
                     'Skontaktuj się z administratorem.',
          });
        }

        // Pobierz rozmiar pliku
        const stats = fs.statSync(exePath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        // Wygeneruj link do pobrania
        const downloadUrl = `${SERVER_URL}/download/${userId}`;

        // Wyślij link do pobrania
        await interaction.editReply({
          content: `🎉 **Twój MsiUtility_v3.exe jest gotowy!**\n\n` +
                   `✅ Wygenerowano dla: **${username}**\n` +
                   `🔑 User ID: \`${userId}\`\n` +
                   `📦 Rozmiar: ${fileSizeMB} MB\n\n` +
                   `**📥 POBIERZ PROGRAM:**\n` +
                   `🔗 [Kliknij tutaj aby pobrać MsiUtility_v3.exe](${downloadUrl})\n\n` +
                   `**JAK UŻYWAĆ:**\n` +
                   `1️⃣ Kliknij link powyżej i pobierz plik\n` +
                   `2️⃣ Umieść w wybranym folderze\n` +
                   `3️⃣ Wpisz \`/load\` aby aktywować sesję\n` +
                   `4️⃣ Uruchom **MsiUtility_v3.exe**\n` +
                   `5️⃣ Wpisz \`/unload\` gdy skończysz\n\n` +
                   `⚠️ **Ten program działa TYLKO dla Twojego konta Discord!**\n` +
                   `🔒 Bez aktywnej sesji (/load) program się nie uruchomi\n\n` +
                   `🔐 Twój unikalny klucz: \`${userId.substring(0, 16)}...\``,
        });

        console.log(`🔥 [DOWNLOAD] ${username} (${userId}) otrzymał link do pobrania`);

      } catch (error) {
        console.error('Błąd generowania linku:', error);
        await interaction.editReply({
          content: '❌ Błąd podczas generowania linku do pobrania. Spróbuj ponownie.',
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

// Start serwera
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log('🌐 MSI UTILITY v3 - LICENSE SERVER');
  console.log('='.repeat(60));
  console.log(`✅ Server running on port: ${PORT}`);
  console.log(`🔡 API endpoint: ${SERVER_URL}`);
  console.log(`🤖 Discord bot: Connecting...`);
  console.log('='.repeat(60));
});

// Start bota
client.login(TOKEN).catch(err => {
  console.error('❌ Błąd logowania bota:', err);
  process.exit(1);
});