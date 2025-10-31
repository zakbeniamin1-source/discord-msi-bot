const { Client, GatewayIntentBits, REST, Routes, AttachmentBuilder } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');

// Konfiguracja
const TOKEN = process.env.DISCORD_TOKEN; // Token bota
const CLIENT_ID = process.env.CLIENT_ID; // ID aplikacji
const PORT = process.env.PORT || 3000;

// Mapa aktywnych sesji: userId -> status
const activeSessions = new Map();

// Express server (potrzebny dla Railway)
const app = express();
app.use(express.json());

// Endpoint zdrowia dla Railway
app.get('/', (req, res) => {
  res.send('Bot działa! Aktywnych sesji: ' + activeSessions.size);
});

// Endpoint do sprawdzania statusu
app.get('/status/:userId', (req, res) => {
  const userId = req.params.userId;
  const isActive = activeSessions.has(userId);
  res.json({ active: isActive, userId });
});

// Endpoint do aktywacji (wywoływany przez launcher.exe)
app.post('/activate', (req, res) => {
  const { userId, hwid } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'Brak userId' });
  }
  
  activeSessions.set(userId, {
    activated: Date.now(),
    hwid: hwid || 'unknown',
    status: 'active'
  });
  
  console.log(`✅ Aktywowano sesję dla użytkownika: ${userId}`);
  res.json({ success: true, message: 'Sesja aktywowana' });
});

// Discord Bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Rejestracja komend slash
const commands = [
  {
    name: 'download',
    description: 'Pobierz plik MsiUtility_v3.exe',
  },
  {
    name: 'load',
    description: 'Aktywuj sesję - uruchom program',
  },
  {
    name: 'unload',
    description: 'Dezaktywuj sesję - wyłącz program',
  },
  {
    name: 'status',
    description: 'Sprawdź status swojej sesji',
  },
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('Rejestrowanie komend slash...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Komendy zarejestrowane!');
  } catch (error) {
    console.error('Błąd podczas rejestracji komend:', error);
  }
})();

client.on('ready', () => {
  console.log(`✅ Bot zalogowany jako ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;

  try {
    if (interaction.commandName === 'download') {
      // Sprawdź czy plik istnieje
      const filePath = path.join(__dirname, 'MsiUtility_v3.exe');
      
      if (!fs.existsSync(filePath)) {
        return interaction.reply({
          content: '❌ Błąd: Plik launcher.exe nie został znaleziony na serwerze.',
          ephemeral: true,
        });
      }

      const file = new AttachmentBuilder(filePath);
      
      await interaction.reply({
        content: `📦 **Pobieranie MsiUtility_v3.exe**\n\n` +
                 `⚠️ Po pobraniu:\n` +
                 `1. Uruchom plik\n` +
                 `2. Wpisz \`/load\` aby aktywować\n` +
                 `3. Poczekaj na komunikat "Session activated"\n` +
                 `4. Program będzie działał dopóki nie użyjesz \`/unload\``,
        files: [file],
        ephemeral: true,
      });
    }

    else if (interaction.commandName === 'load') {
      if (activeSessions.has(userId)) {
        return interaction.reply({
          content: '⚠️ Sesja już jest aktywna! Użyj `/unload` aby ją zakończyć.',
          ephemeral: true,
        });
      }

      await interaction.reply({
        content: '🔄 **STARTING SESSION...**\n\n' +
                 '⏳ Initializing components...\n' +
                 '⏳ Establishing connection...\n' +
                 '⏳ Loading modules...',
        ephemeral: true,
      });

      // Symulacja ładowania
      setTimeout(async () => {
        activeSessions.set(userId, {
          activated: Date.now(),
          status: 'active'
        });

        await interaction.editReply({
          content: '✅ **SESSION ACTIVATED**\n\n' +
                   '✓ All systems operational\n' +
                   '✓ Connection established\n' +
                   '✓ Ready to use\n\n' +
                   `🔹 User ID: ${userId}\n` +
                   `🔹 Time: ${new Date().toLocaleString('pl-PL')}\n\n` +
                   '📝 Użyj `/unload` aby zakończyć sesję.',
        });

        console.log(`✅ Sesja aktywowana dla ${interaction.user.tag}`);
      }, 3000);
    }

    else if (interaction.commandName === 'unload') {
      if (!activeSessions.has(userId)) {
        return interaction.reply({
          content: '❌ Brak aktywnej sesji. Użyj `/load` aby rozpocząć.',
          ephemeral: true,
        });
      }

      await interaction.reply({
        content: '🔄 **CLOSING SESSION...**\n\n' +
                 '⏳ Saving state...\n' +
                 '⏳ Disconnecting...\n' +
                 '⏳ Cleaning up...',
        ephemeral: true,
      });

      setTimeout(async () => {
        activeSessions.delete(userId);

        await interaction.editReply({
          content: '✅ **SESSION CLOSED**\n\n' +
                   '✓ State saved\n' +
                   '✓ Connection terminated\n' +
                   '✓ Cleanup complete\n\n' +
                   '👋 Sesja zakończona pomyślnie.',
        });

        console.log(`🔴 Sesja zakończona dla ${interaction.user.tag}`);
      }, 2000);
    }

    else if (interaction.commandName === 'status') {
      const session = activeSessions.get(userId);
      
      if (!session) {
        return interaction.reply({
          content: '📊 **STATUS SESJI**\n\n' +
                   '🔴 Status: NIEAKTYWNA\n\n' +
                   'Użyj `/load` aby rozpocząć sesję.',
          ephemeral: true,
        });
      }

      const uptime = Date.now() - session.activated;
      const minutes = Math.floor(uptime / 60000);
      const seconds = Math.floor((uptime % 60000) / 1000);

      await interaction.reply({
        content: '📊 **STATUS SESJI**\n\n' +
                 '🟢 Status: AKTYWNA\n' +
                 `⏱️ Czas działania: ${minutes}m ${seconds}s\n` +
                 `🔹 User ID: ${userId}\n` +
                 `📅 Aktywowano: ${new Date(session.activated).toLocaleString('pl-PL')}\n\n` +
                 'Użyj `/unload` aby zakończyć sesję.',
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error('Błąd podczas obsługi komendy:', error);
    await interaction.reply({
      content: '❌ Wystąpił błąd podczas wykonywania komendy.',
      ephemeral: true,
    });
  }
});

// Start serwera
app.listen(PORT, () => {
  console.log(`🌐 Serwer HTTP działa na porcie ${PORT}`);
});

// Start bota
client.login(TOKEN);