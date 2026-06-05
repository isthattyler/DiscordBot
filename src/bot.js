const { Client, GatewayIntentBits } = require('discord.js');
const cron = require('node-cron');
const config = require('./utils/ConfigLoader');
const CommandHandler = require('./handlers/CommandHandler');
const InteractionHandler = require('./handlers/InteractionHandler');
const ChannelManager = require('./utils/ChannelManager');
const AuthManager = require('./utils/AuthManager');
const AccessManager = require('./utils/AccessManager');
const EarningsCalendar = require('./utils/EarningsCalendar');
const EarningsCalendarEmbed = require('./embeds/EarningsCalendarEmbed');

class TradingBot {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
      ],
    });

    this.commandHandler = new CommandHandler();
    this.interactionHandler = new InteractionHandler();
    this.accessManager = AccessManager;
    this.channelManager = ChannelManager;
    this.authManager = AuthManager;
    this.earningsCalendar = EarningsCalendar;
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
    console.log(`📊 Available commands: /long, /short, /comment, /earnings, /setup, /auth, /access`);

    // Set bot owner from environment variable
    const ownerId = config.getOwnerId();
    if (ownerId) {
      this.authManager.setOwnerId(ownerId);
      console.log(`🔐 Bot owner configured`);
    } else {
      console.warn('⚠️ DISCORD_OWNER_ID not set in .env - authorization system will not work!');
    }

    // Initialize all managers
    await this.accessManager.init();
    await this.channelManager.init(ownerId);
    await this.authManager.init();
    await this.earningsCalendar.init();

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

    // Setup daily earnings calendar auto-post at 4:00 PM EST
    this.setupEarningsScheduler();
  }

  async setupEarningsScheduler() {
    // Schedule for 4:00 PM EST (21:00 UTC)
    cron.schedule('0 21 * * *', async () => {
      console.log('📅 Running daily earnings calendar auto-post...');
      await this.broadcastEarningsCalendar();
    });

    console.log('⏰ Earnings calendar scheduler set for 4:00 PM EST daily');
  }

  async broadcastEarningsCalendar() {
    try {
      // Get tomorrow's earnings
      const earnings = await EarningsCalendar.getTomorrowEarnings();
      
      // Skip if no earnings
      if (!earnings || (earnings.preMarket.length === 0 && earnings.postMarket.length === 0)) {
        console.log('📭 No major earnings tomorrow, skipping auto-post');
        return;
      }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const embed = EarningsCalendarEmbed.create(earnings, tomorrow, 'day');

      if (!embed) {
        console.log('📭 No embed generated, skipping auto-post');
        return;
      }

      const allConfigs = ChannelManager.getAllEarningsConfigs();
      let totalConfigs = 0;

      for (const config of allConfigs) {
        let mentionText = '';
        if (config.earningsMentionRole) {
          mentionText = `<@&${config.earningsMentionRole}> `;
        }

        try {
          const channel = await this.client.channels.fetch(config.earningsChannel);
          await channel.send({
            content: mentionText,
            embeds: [embed]
          });
          totalConfigs++;
        } catch (error) {
          console.error(`Failed to send earnings to channel ${config.earningsChannel}:`, error);
        }
      }

      if (totalConfigs > 0) {
        console.log(`✅ Earnings calendar posted to ${totalConfigs} server(s)`);
      } else {
        console.log('⚠️ No earnings channels configured in any server');
      }
    } catch (error) {
      console.error('❌ Error in earnings calendar auto-post:', error);
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