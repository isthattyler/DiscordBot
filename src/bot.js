const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./utils/ConfigLoader');
const CommandHandler = require('./handlers/CommandHandler');
const InteractionHandler = require('./handlers/InteractionHandler');
const ChannelManager = require('./utils/ChannelManager');
const AuthManager = require('./utils/AuthManager');

class TradingBot {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
      ],
    });

    this.commandHandler = new CommandHandler();
    this.interactionHandler = InteractionHandler;
    this.channelManager = ChannelManager;
    this.authManager = AuthManager;
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.client.once('ready', () => this.onReady());
    this.client.on('interactionCreate', async (interaction) => {
      if (interaction.isChatInputCommand()) {
        await this.commandHandler.handleInteraction(interaction);
      } else if (interaction.isStringSelectMenu()) {
        await this.interactionHandler.handleSelectMenu(interaction);
      } else if (interaction.isModalSubmit()) {
        await this.interactionHandler.handleModalSubmit(interaction);
      }
    });
  }

  async onReady() {
    console.log(`✅ Logged in as ${this.client.user.tag}!`);
    console.log(`🚀 Bot is ready to send trading alerts!`);
    console.log(`📊 Available commands: /alert, /setup, /comment, /auth, /access`);

    // Set bot owner from environment variable
    const ownerId = config.getOwnerId();
    if (ownerId) {
      this.authManager.setOwnerId(ownerId);
      console.log(`🔐 Bot owner configured`);
    } else {
      console.warn('⚠️ DISCORD_OWNER_ID not set in .env - authorization system will not work!');
    }

    // Wait for managers to finish loading
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Export configuration summary
    const channelSummary = await this.channelManager.exportToReadableFormat();
    if (channelSummary) {
      console.log('\n📋 Channel Configuration:');
      console.log(channelSummary);
    }

    const authSummary = await this.authManager.exportToReadableFormat();
    if (authSummary) {
      console.log('\n🔐 Authorized Users:');
      console.log(authSummary);
    }
  }

  async start() {
    try {
      await this.commandHandler.registerCommands();
      await this.client.login(config.getToken());
    } catch (error) {
      console.error('❌ Error starting bot:', error);
      process.exit(1);
    }
  }
}

module.exports = TradingBot;