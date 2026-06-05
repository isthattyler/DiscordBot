const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require('discord.js');
const AuthManager = require('../utils/AuthManager');
const AccessManager = require('../utils/AccessManager');

class AccessCommand {
  constructor() {
    this.data = new SlashCommandBuilder()
      .setName('access')
      .setDescription('Create a TradingView access panel in this channel');
  }

  async execute(interaction) {
    // Check authorization - only authorized users can CREATE the panel
    if (!AuthManager.isAuthorized(interaction.guildId, interaction.user.id)) {
      return await interaction.reply({
        content: '❌ You are not authorized to use this bot. Contact the bot owner for access.',
        ephemeral: true
      });
    }

    // Get available scripts
    const scripts = AccessManager.getAvailableScripts();

    // Create embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📊 TradingView Scripts Access Management')
      .setDescription('Select a script below and enter your TradingView username to request access.')
      .addFields(
        { name: '📋 Available Scripts', value: scripts.map(s => `• ${s}`).join('\n') }
      )
      .setFooter({ text: 'Select a script from the dropdown below' })
      .setTimestamp();

    // Create select menu for scripts
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('access_script_select')
      .setPlaceholder('Select a TradingView script')
      .addOptions(
        scripts.map(script => ({
          label: script,
          value: script,
          description: `Grant access to ${script}`
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    // Send to the channel (not ephemeral - anyone can see and use it)
    await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });

    // Confirm to the user who created it
    await interaction.reply({
      content: '✅ Access panel created in this channel. Anyone can now use it to request access.',
      ephemeral: true
    });
  }
}

module.exports = AccessCommand;