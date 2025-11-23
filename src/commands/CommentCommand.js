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
      .addStringOption(option =>
        option.setName('ticker')
          .setDescription('The ticker symbol (optional)')
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

    const commentData = {
      message: interaction.options.getString('message'),
      ticker: interaction.options.getString('ticker'),
      author: interaction.user.username,
    };

    const embed = CommentEmbed.create(commentData);

    // Always broadcast to all servers
    await this.broadcastComment(interaction, embed);
  }

  async broadcastComment(interaction, embed) {
    const allConfigs = ChannelManager.getAllConfigurations();
    
    if (allConfigs.length === 0) {
      return await interaction.reply({
        content: '❌ No servers are configured for comments. Use `/setup add` to configure channels.',
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

    let confirmMessage = `✅ **Comment Broadcast Complete**\n\n`;
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

module.exports = CommentCommand;