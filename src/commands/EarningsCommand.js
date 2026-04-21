const { SlashCommandBuilder } = require('discord.js');
const EarningsCalendar = require('../utils/EarningsCalendar');
const EarningsCalendarEmbed = require('../embeds/EarningsCalendarEmbed');
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
      let embed;

      if (subcommand === 'today') {
        const earnings = await EarningsCalendar.getTodayEarnings();
        embed = EarningsCalendarEmbed.create(earnings, new Date(), 'day');
      } else if (subcommand === 'tomorrow') {
        const earnings = await EarningsCalendar.getTomorrowEarnings();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        embed = EarningsCalendarEmbed.create(earnings, tomorrow, 'day');
      } else if (subcommand === 'week') {
        const weekData = await EarningsCalendar.getWeekEarnings();
        const botConfig = interaction.client.botConfig;
        embed = EarningsCalendarEmbed.buildWeekEmbed(weekData, botConfig);
      }

      if (!embed) {
        return await interaction.editReply({
          content: '📭 No major company earnings found for this period.',
          embeds: []
        });
      }

      await interaction.editReply({
        content: null,
        embeds: [embed]
      });
    } catch (error) {
      console.error('Error executing earnings command:', error);
      await interaction.editReply({
        content: '❌ An error occurred while fetching earnings data. Please try again later.',
        embeds: []
      });
    }
  }
}

module.exports = EarningsCommand;
