const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const ChannelManager = require('../utils/ChannelManager');

class SetupCommand {
  constructor() {
    this.data = new SlashCommandBuilder()
      .setName('setup')
      .setDescription('Configure the bot for trading alerts')
      .addSubcommand(subcommand =>
        subcommand
          .setName('add')
          .setDescription('Add a channel for trading alerts')
          .addChannelOption(option =>
            option.setName('channel')
              .setDescription('The channel where alerts will be sent')
              .addChannelTypes(ChannelType.GuildText)
              .setRequired(true)))
      .addSubcommand(subcommand =>
        subcommand
          .setName('change')
          .setDescription('Replace one channel with another')
          .addChannelOption(option =>
            option.setName('old-channel')
              .setDescription('The channel to replace')
              .addChannelTypes(ChannelType.GuildText)
              .setRequired(true))
          .addChannelOption(option =>
            option.setName('new-channel')
              .setDescription('The new channel to use')
              .addChannelTypes(ChannelType.GuildText)
              .setRequired(true)))
      .addSubcommand(subcommand =>
        subcommand
          .setName('remove')
          .setDescription('Remove a channel from alert configuration')
          .addChannelOption(option =>
            option.setName('channel')
              .setDescription('The channel to remove')
              .addChannelTypes(ChannelType.GuildText)
              .setRequired(true)))
      .addSubcommand(subcommand =>
        subcommand
          .setName('remove-all')
          .setDescription('Remove all configured channels at once'))
      .addSubcommand(subcommand =>
        subcommand
          .setName('mention')
          .setDescription('Set the role to mention with alerts')
          .addRoleOption(option =>
            option.setName('role')
              .setDescription('Role to mention (e.g., @everyone, @Traders)')
              .setRequired(true)))
      .addSubcommand(subcommand =>
        subcommand
          .setName('remove-mention')
          .setDescription('Remove the mention role from alerts'))
      .addSubcommand(subcommand =>
        subcommand
          .setName('view')
          .setDescription('View the current bot configuration'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);
  }

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'add':
        await this.handleAdd(interaction);
        break;
      case 'change':
        await this.handleChange(interaction);
        break;
      case 'remove':
        await this.handleRemove(interaction);
        break;
      case 'remove-all':
        await this.handleRemoveAll(interaction);
        break;
      case 'mention':
        await this.handleMention(interaction);
        break;
      case 'remove-mention':
        await this.handleRemoveMention(interaction);
        break;
      case 'view':
        await this.handleView(interaction);
        break;
    }
  }

  async handleAdd(interaction) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guildId;

    // Check if bot has permissions in the target channel
    const botMember = interaction.guild.members.me;
    const permissions = channel.permissionsFor(botMember);

    if (!permissions.has(PermissionFlagsBits.SendMessages) ||
      !permissions.has(PermissionFlagsBits.EmbedLinks)) {
      return await interaction.reply({
        content: `❌ I don't have permission to send messages or embed links in ${channel}. Please grant me the necessary permissions first.`,
        ephemeral: true
      });
    }

    // Add the channel
    const added = await ChannelManager.addChannel(guildId, channel.id);

    if (!added) {
      return await interaction.reply({
        content: `⚠️ ${channel} is already configured for alerts.`,
        ephemeral: true
      });
    }

    await interaction.reply({
      content: `✅ ${channel} has been added to the alert channels list.`,
      ephemeral: true
    });

    // Send a test message to the configured channel
    try {
      await channel.send({
        content: '📊 This channel has been added for trading alerts!'
      });
    } catch (error) {
      console.error('Error sending test message:', error);
    }
  }

  async handleChange(interaction) {
    const oldChannel = interaction.options.getChannel('old-channel');
    const newChannel = interaction.options.getChannel('new-channel');
    const guildId = interaction.guildId;

    // Check if bot has permissions in the new channel
    const botMember = interaction.guild.members.me;
    const permissions = newChannel.permissionsFor(botMember);

    if (!permissions.has(PermissionFlagsBits.SendMessages) ||
      !permissions.has(PermissionFlagsBits.EmbedLinks)) {
      return await interaction.reply({
        content: `❌ I don't have permission to send messages or embed links in ${newChannel}. Please grant me the necessary permissions first.`,
        ephemeral: true
      });
    }

    // Change the channel
    const result = await ChannelManager.changeChannel(guildId, oldChannel.id, newChannel.id);

    if (result === false) {
      return await interaction.reply({
        content: `❌ ${oldChannel} is not in the configured alert channels list.`,
        ephemeral: true
      });
    }

    if (result === 'duplicate') {
      return await interaction.reply({
        content: `⚠️ ${newChannel} is already in the configured alert channels list.`,
        ephemeral: true
      });
    }

    await interaction.reply({
      content: `✅ Channel changed from ${oldChannel} to ${newChannel}`,
      ephemeral: true
    });

    // Send a test message
    try {
      await newChannel.send({
        content: '📊 This channel is now configured for trading alerts!'
      });
    } catch (error) {
      console.error('Error sending test message:', error);
    }
  }

  async handleRemove(interaction) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guildId;

    const removed = await ChannelManager.removeChannel(guildId, channel.id);

    if (!removed) {
      return await interaction.reply({
        content: `❌ ${channel} is not in the configured alert channels list.`,
        ephemeral: true
      });
    }

    await interaction.reply({
      content: `✅ ${channel} has been removed from the alert channels list.`,
      ephemeral: true
    });
  }

  async handleRemoveAll(interaction) {
    const guildId = interaction.guildId;

    const count = await ChannelManager.removeAllChannels(guildId);

    if (count === false || count === 0) {
      return await interaction.reply({
        content: `❌ No channels are currently configured.`,
        ephemeral: true
      });
    }

    await interaction.reply({
      content: `✅ All ${count} configured channel(s) have been removed.`,
      ephemeral: true
    });
  }

  async handleMention(interaction) {
    const role = interaction.options.getRole('role');
    const guildId = interaction.guildId;

    await ChannelManager.setMentionRole(guildId, role.id);

    await interaction.reply({
      content: `✅ Alerts will now mention ${role}`,
      ephemeral: true
    });
  }

  async handleRemoveMention(interaction) {
    const guildId = interaction.guildId;

    await ChannelManager.removeMentionRole(guildId);

    await interaction.reply({
      content: `✅ Mention role has been removed from alerts.`,
      ephemeral: true
    });
  }

  async handleView(interaction) {
    const guildId = interaction.guildId;
    const config = ChannelManager.getConfiguration(guildId);

    if (config.channels.length === 0 && !config.mentionRole) {
      return await interaction.reply({
        content: '📋 No configuration found.\n\nUse `/setup add` to add alert channels and `/setup mention` to set a mention role.',
        ephemeral: true
      });
    }

    let response = '📋 **Current Configuration:**\n\n';

    // Show channels
    if (config.channels.length > 0) {
      response += '**Alert Channels:**\n';
      for (const channelId of config.channels) {
        const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
        if (channel) {
          response += `• ${channel}\n`;
        } else {
          response += `• <#${channelId}> (channel deleted)\n`;
          // Clean up deleted channel
          await ChannelManager.removeChannel(guildId, channelId);
        }
      }
    } else {
      response += '**Alert Channels:** None configured\n';
    }

    // Show mention role
    response += '\n**Mention Role:** ';
    if (config.mentionRole) {
      const role = await interaction.guild.roles.fetch(config.mentionRole).catch(() => null);
      if (role) {
        response += `${role}`;
      } else {
        response += 'Role deleted';
        await ChannelManager.removeMentionRole(guildId);
      }
    } else {
      response += 'None';
    }

    response += '\n\n*Use `/setup add`, `/setup change`, `/setup remove`, `/setup remove-all`, or `/setup mention` to modify.*';

    await interaction.reply({
      content: response,
      ephemeral: true
    });
  }
}

module.exports = SetupCommand;