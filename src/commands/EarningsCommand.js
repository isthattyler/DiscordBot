const { SlashCommandBuilder } = require('discord.js');
const EarningsCalendar = require('../utils/EarningsCalendar');
const EarningsCalendarEmbed = require('../embeds/EarningsCalendarEmbed');
const EarningsImageGenerator = require('../utils/EarningsImageGenerator');
const AuthManager = require('../utils/AuthManager');

class EarningsCommand {
  constructor() {
    this.data = new SlashCommandBuilder()
      .setName('earnings')
      .setDescription('View upcoming earnings for S&P 500 and Nasdaq 100 companies')
      .addSubcommand(subcommand =>
        subcommand
          .setName('today')
          .setDescription('Show today\'s earnings'))
      .addSubcommand(subcommand =>
        subcommand
          .setName('tomorrow')
          .setDescription('Show tomorrow\'s earnings'))
      .addSubcommand(subcommand =>
        subcommand
          .setName('week')
          .setDescription('Show this week\'s earnings'));
  }

  async execute(interaction) {
    // Check authorization
    if (!AuthManager.isAuthorized(interaction.guildId, interaction.user.id)) {
      return await interaction.reply({
        content: '❌ You are not authorized to use this bot. Contact the bot owner for access.',
        ephemeral: true
      });
    }

    const subcommand = interaction.options.getSubcommand();

    await interaction.deferReply({ ephemeral: true });

    try {
      await EarningsImageGenerator.init();

      let payload = {
        content: null,
        embeds: [],
        files: []
      };

      if (subcommand === 'today') {
        const earnings = await EarningsCalendar.getTodayEarnings();
        if (earnings.preMarket.length === 0 && earnings.postMarket.length === 0) {
          return await interaction.editReply({
            content: '📭 No major company earnings found for today.',
            embeds: [],
            files: []
          });
        }
        const imageBuffer = await EarningsImageGenerator.generateDailyImage(earnings, new Date());
        const { embed, attachment } = EarningsCalendarEmbed.createDailyImageEmbed(imageBuffer, new Date());
        payload.embeds = [embed];
        payload.files = [attachment];
      } else if (subcommand === 'tomorrow') {
        const earnings = await EarningsCalendar.getTomorrowEarnings();
        if (earnings.preMarket.length === 0 && earnings.postMarket.length === 0) {
          return await interaction.editReply({
            content: '📭 No major company earnings found for tomorrow.',
            embeds: [],
            files: []
          });
        }
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const imageBuffer = await EarningsImageGenerator.generateDailyImage(earnings, tomorrow);
        const { embed, attachment } = EarningsCalendarEmbed.createDailyImageEmbed(imageBuffer, tomorrow);
        payload.embeds = [embed];
        payload.files = [attachment];
      } else if (subcommand === 'week') {
        const weekData = await EarningsCalendar.getWeekEarnings();
        const hasEarnings = Object.values(weekData).some(day => day.length > 0);
        if (!hasEarnings) {
          return await interaction.editReply({
            content: '📭 No major company earnings found for this week.',
            embeds: [],
            files: []
          });
        }
        const imageBuffer = await EarningsImageGenerator.generateWeeklyImage(weekData);
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(today);
        weekStart.setDate(diff);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 4);
        const { embed, attachment } = EarningsCalendarEmbed.createWeeklyImageEmbed(imageBuffer, weekStart, weekEnd);
        payload.embeds = [embed];
        payload.files = [attachment];
      }

      await interaction.editReply(payload);
    } catch (error) {
      console.error('Error executing earnings command:', error);
      await interaction.editReply({
        content: '❌ An error occurred while fetching earnings data. Please try again later.',
        embeds: [],
        files: []
      });
    }
  }
}

module.exports = EarningsCommand;
