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
const EarningsImageGenerator = require('./utils/EarningsImageGenerator');

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
    // Schedule for 4:00 PM EST (21:00 UTC) daily
    cron.schedule('0 21 * * *', async () => {
      console.log('📅 Running daily earnings calendar auto-post...');
      await this.broadcastEarningsCalendar();
    });

    // Schedule for 6:00 PM EST (23:00 UTC) on Sundays
    cron.schedule('0 23 * * 0', async () => {
      console.log('📅 Running weekly earnings calendar auto-post...');
      await this.broadcastWeeklyEarningsCalendar();
    });

    console.log('⏰ Daily earnings scheduler set for 4:00 PM EST');
    console.log('⏰ Weekly earnings scheduler set for 6:00 PM EST Sundays');
  }

  async broadcastEarningsCalendar() {
    try {
      await EarningsImageGenerator.init();

      // Get tomorrow's earnings
      const earnings = await EarningsCalendar.getTomorrowEarnings();
      
      // Skip if no earnings
      if (!earnings || (earnings.preMarket.length === 0 && earnings.postMarket.length === 0)) {
        console.log('📭 No major earnings tomorrow, skipping auto-post');
        return;
      }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Generate image
      const imageBuffer = await EarningsImageGenerator.generateDailyImage(earnings, tomorrow);
      const { embed, attachment } = EarningsCalendarEmbed.createDailyImageEmbed(imageBuffer, tomorrow);

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
            embeds: [embed],
            files: [attachment]
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

  async broadcastWeeklyEarningsCalendar() {
    try {
      await EarningsImageGenerator.init();

      const weekData = await EarningsCalendar.getWeekEarnings();

      // Check if any earnings exist
      const hasEarnings = Object.values(weekData).some(day => day.length > 0);
      if (!hasEarnings) {
        console.log('📭 No major earnings this week, skipping weekly auto-post');
        return;
      }

      // Generate image
      const imageBuffer = await EarningsImageGenerator.generateWeeklyImage(weekData);

      const today = new Date();
      const weekStart = new Date(today);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
      weekStart.setDate(diff);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 4);

      const { embed, attachment } = EarningsCalendarEmbed.createWeeklyImageEmbed(imageBuffer, weekStart, weekEnd);

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
            embeds: [embed],
            files: [attachment]
          });
          totalConfigs++;
        } catch (error) {
          console.error(`Failed to send weekly earnings to channel ${config.earningsChannel}:`, error);
        }
      }

      if (totalConfigs > 0) {
        console.log(`✅ Weekly earnings calendar posted to ${totalConfigs} server(s)`);
      } else {
        console.log('⚠️ No earnings channels configured in any server');
      }
    } catch (error) {
      console.error('❌ Error in weekly earnings calendar auto-post:', error);
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