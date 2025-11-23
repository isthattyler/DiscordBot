const { SlashCommandBuilder } = require('discord.js');
const CommentEmbed = require('../embeds/CommentEmbed');
const ChannelManager = require('../utils/ChannelManager');
const AuthManager = require('../utils/AuthManager');

class CommentCommand {
  constructor() {
    this.data = new SlashCommandBuilder()
      .setName('comment')
      .setDescription('Post a comment about a trade')
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
          content: '✅ Comment posted to this channel',
          ephemeral: true
        });
      } catch (error) {
        await interaction.reply({
          content: '❌ Failed to post comment.',
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
    let confirmMessage = `✅ Comment posted to ${successCount} channel(s)`;
    if (failedChannels.length > 0) {
      confirmMessage += `\n⚠️ Failed to send to: ${failedChannels.join(', ')}`;
    }
    
    await interaction.reply({
      content: confirmMessage,
      ephemeral: true
    });
  }
}

module.exports = CommentCommand;