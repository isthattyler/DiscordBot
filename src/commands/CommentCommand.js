const { SlashCommandBuilder } = require('discord.js');
const CommentEmbed = require('../embeds/CommentEmbed');
const ChannelManager = require('../utils/ChannelManager');
const AuthManager = require('../utils/AuthManager');

class CommentCommand {
  constructor() {
    this.data = new SlashCommandBuilder()
      .setName('comment')
      .setDescription('Post a comment about a trade to all configured servers')
      .addStringOption(option =>
        option.setName('message')
          .setDescription('Your comment or analysis')
          .setRequired(true))
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

    let message = interaction.options.getString('message');
    message = message.replace(/\\n/g, '\n');

    const commentData = {
      message: message,
      author: interaction.user.username,
    };

    const attachment = interaction.options.getAttachment('image');

    const embed = CommentEmbed.create(commentData);

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

    await this.broadcastComment(interaction, embed);
  }

  async broadcastComment(interaction, embed) {
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
          ? '❌ No servers are configured for comments. Use `/setup alert-channel add` to configure channels.'
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

    let confirmMessage = `✅ **Comment Broadcast Complete**\n\n`;
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

module.exports = CommentCommand;
