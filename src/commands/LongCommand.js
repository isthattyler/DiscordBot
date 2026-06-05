const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const TradingAlertEmbed = require('../embeds/TradingAlertEmbed');
const ChannelManager = require('../utils/ChannelManager');
const AuthManager = require('../utils/AuthManager');

class LongCommand {
  constructor() {
    this.data = new SlashCommandBuilder()
      .setName('long')
      .setDescription('Send a long trading alert to all configured servers')
      .addStringOption(option =>
        option.setName('ticker')
          .setDescription('The ticker symbol (e.g., MNQ, ES, NQ)')
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
    if (!AuthManager.isAuthorized(interaction.guildId, interaction.user.id)) {
      return await interaction.reply({
        content: '❌ You are not authorized to use this bot. Contact the bot owner for access.',
        ephemeral: true
      });
    }

    const alertData = {
      ticker: interaction.options.getString('ticker'),
      position: 'long',
      entry: interaction.options.getString('entry'),
      stoploss: interaction.options.getString('stoploss'),
      target: interaction.options.getString('target'),
    };

    const attachment = interaction.options.getAttachment('image');

    const embed = TradingAlertEmbed.create(alertData);

    if (attachment) {
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

    await this.broadcastAlert(interaction, embed);
  }

  async broadcastAlert(interaction, embed) {
    const isOwner = AuthManager.isOwner(interaction.user.id);
    let allConfigs;

    if (isOwner) {
      allConfigs = ChannelManager.getAllAlertConfigs(interaction.user.id);
    } else {
      const config = ChannelManager.getUserAlertConfig(interaction.guildId, interaction.user.id);
      allConfigs = (config && config.channels.length > 0) ? [config] : [];
    }

    if (allConfigs.length === 0) {
      return await interaction.reply({
        content: isOwner
          ? '❌ No servers are configured for alerts. Use `/setup alert-channel add` to configure channels.'
          : '❌ You have no alert channels configured. Use `/setup alert-channel add` to configure your channels.',
        ephemeral: true
      });
    }

    let totalConfigs = 0;
    let totalChannels = 0;
    let failedChannels = [];

    await interaction.deferReply({ ephemeral: true });

    for (const config of allConfigs) {
      if (!config.channels || config.channels.length === 0) continue;

      let mentionText = '';
      if (config.mentionRole) {
        mentionText = `<@&${config.mentionRole}> `;
      }

      let configSuccess = false;

      for (const channelId of config.channels) {
        try {
          const channel = await interaction.client.channels.fetch(channelId);
          await channel.send({
            content: mentionText,
            embeds: [embed]
          });
          totalChannels++;
          configSuccess = true;
        } catch (error) {
          console.error(`Failed to send to channel ${channelId} in guild ${config.guildId}:`, error);
          failedChannels.push(`<#${channelId}>`);
        }
      }

      if (configSuccess) {
        totalConfigs++;
      }
    }

    let confirmMessage = `✅ **Alert Broadcast Complete**\n\n`;
    confirmMessage += `📡 Sent to ${totalChannels} channel(s) across ${totalConfigs} configuration(s)`;

    if (isOwner) {
      confirmMessage += ` (all guilds)`;
    }

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

module.exports = LongCommand;
