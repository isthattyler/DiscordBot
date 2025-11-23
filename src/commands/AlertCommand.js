const { SlashCommandBuilder } = require('discord.js');
const TradingAlertEmbed = require('../embeds/TradingAlertEmbed');
const ChannelManager = require('../utils/ChannelManager');
const AuthManager = require('../utils/AuthManager');

class AlertCommand {
  constructor() {
    this.data = new SlashCommandBuilder()
      .setName('alert')
      .setDescription('Send a trading alert')
      .addStringOption(option =>
        option.setName('ticker')
          .setDescription('The ticker symbol (e.g., MNQ, ES, NQ)')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('position')
          .setDescription('Position type (e.g., "long last long", "short")')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('entry')
          .setDescription('Entry price')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('stoploss')
          .setDescription('Stop loss price (optional)')
          .setRequired(false))
      .addStringOption(option =>
        option.setName('target')
          .setDescription('Target/Take profit price (optional)')
          .setRequired(false));
  }

  async execute(interaction) {
    // Check authorization
    if (!AuthManager.isAuthorized(interaction.guildId, interaction.user.id)) {
      return await interaction.reply({
        content: '❌ You are not authorized to use this bot. Contact the bot owner for access.',
        ephemeral: true
      });
    }

    const alertData = {
      ticker: interaction.options.getString('ticker'),
      position: interaction.options.getString('position'),
      entry: interaction.options.getString('entry'),
      stoploss: interaction.options.getString('stoploss'),
      target: interaction.options.getString('target'),
    };

    const embed = TradingAlertEmbed.create(alertData);
    const guildId = interaction.guildId;
    
    // Get configured channels
    const channelIds = ChannelManager.getChannels(guildId);
    const mentionRoleId = ChannelManager.getMentionRole(guildId);
    
    // Prepare mention text
    let mentionText = '';
    if (mentionRoleId) {
      mentionText = `<@&${mentionRoleId}> `;
    }
    
    // If no channels configured, use current channel
    if (channelIds.length === 0) {
      try {
        await interaction.channel.send({ 
          content: mentionText,
          embeds: [embed] 
        });
        
        await interaction.reply({
          content: '✅ Alert sent to this channel',
          ephemeral: true
        });
      } catch (error) {
        await interaction.reply({
          content: '❌ Failed to send alert.',
          ephemeral: true
        });
      }
      return;
    }
    
    // Send to all configured channels
    let successCount = 0;
    let failedChannels = [];
    
    for (const channelId of channelIds) {
      try {
        const channel = await interaction.client.channels.fetch(channelId);
        await channel.send({ 
          content: mentionText,
          embeds: [embed] 
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to send to channel ${channelId}:`, error);
        failedChannels.push(`<#${channelId}>`);
      }
    }
    
    // Send confirmation
    let confirmMessage = `✅ Alert sent to ${successCount} channel(s)`;
    if (failedChannels.length > 0) {
      confirmMessage += `\n⚠️ Failed to send to: ${failedChannels.join(', ')}`;
    }
    
    await interaction.reply({
      content: confirmMessage,
      ephemeral: true
    });
  }
}

module.exports = AlertCommand;