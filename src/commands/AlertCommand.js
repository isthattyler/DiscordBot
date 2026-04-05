const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const TradingAlertEmbed = require('../embeds/TradingAlertEmbed');
const ChannelManager = require('../utils/ChannelManager');
const AuthManager = require('../utils/AuthManager');

class AlertCommand {
  constructor() {
    this.data = new SlashCommandBuilder()
      .setName('alert')
      .setDescription('Send a trading alert to all configured servers')
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
          .setRequired(false))
      .addAttachmentOption(option =>
        option.setName('image')
          .setDescription('Chart or screenshot to attach (optional)')
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

    const attachment = interaction.options.getAttachment('image');

    const embed = TradingAlertEmbed.create(alertData);

    // Add image to embed if provided
    if (attachment) {
      // Validate that it's an image
      const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
      if (validImageTypes.includes(attachment.contentType)) {
        embed.setImage(attachment.url);
      } else {
        return await interaction.reply({
          content: '❌ Invalid file type. Please upload an image (PNG, JPEG, GIF, or WebP).',
          ephemeral: true
        });
      }
    }

    // Always broadcast to all servers
    await this.broadcastAlert(interaction, embed);
  }

  async broadcastAlert(interaction, embed) {
    const allConfigs = ChannelManager.getAllConfigurations();

    if (allConfigs.length === 0) {
      return await interaction.reply({
        content: '❌ No servers are configured for alerts. Use `/setup add` to configure channels.',
        ephemeral: true
      });
    }

    let totalServers = 0;
    let totalChannels = 0;
    let failedChannels = [];

    await interaction.deferReply({ ephemeral: true });

    for (const config of allConfigs) {
      if (config.channels.length === 0) continue;

      let mentionText = '';
      if (config.mentionRole) {
        mentionText = `<@&${config.mentionRole}> `;
      }

      let serverSuccess = false;

      for (const channelId of config.channels) {
        try {
          const channel = await interaction.client.channels.fetch(channelId);
          await channel.send({
            content: mentionText,
            embeds: [embed]
          });
          totalChannels++;
          serverSuccess = true;
        } catch (error) {
          console.error(`Failed to send to channel ${channelId} in server ${config.guildId}:`, error);
          failedChannels.push(`<#${channelId}>`);
        }
      }

      if (serverSuccess) {
        totalServers++;
      }
    }

    let confirmMessage = `✅ **Alert Broadcast Complete**\n\n`;
    confirmMessage += `📡 Sent to ${totalChannels} channel(s) across ${totalServers} server(s)`;

    if (failedChannels.length > 0) {
      confirmMessage += `\n\n⚠️ Failed channels: ${failedChannels.slice(0, 5).join(', ')}`;
      if (failedChannels.length > 5) {
        confirmMessage += ` and ${failedChannels.length - 5} more`;
      }
    }

    await interaction.editReply({
      content: confirmMessage
    });
  }
}

module.exports = AlertCommand;