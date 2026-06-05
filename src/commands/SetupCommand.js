const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const ChannelManager = require('../utils/ChannelManager');
const AuthManager = require('../utils/AuthManager');

class SetupCommand {
  constructor() {
    this.data = new SlashCommandBuilder()
      .setName('setup')
      .setDescription('Configure the bot for trading alerts and earnings')
      // Alert Channel Commands
      .addSubcommandGroup(group =>
        group
          .setName('alert-channel')
          .setDescription('Manage alert channels')
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
              .setName('remove')
              .setDescription('Remove a channel from alert configuration')
              .addChannelOption(option =>
                option.setName('channel')
                  .setDescription('The channel to remove')
                  .addChannelTypes(ChannelType.GuildText)
                  .setRequired(true))))
      // Alert Mention Commands
      .addSubcommandGroup(group =>
        group
          .setName('alert-mention')
          .setDescription('Manage alert mention role')
          .addSubcommand(subcommand =>
            subcommand
              .setName('set')
              .setDescription('Set the role to mention with alerts')
              .addRoleOption(option =>
                option.setName('role')
                  .setDescription('Role to mention (e.g., @everyone, @Traders)')
                  .setRequired(true)))
          .addSubcommand(subcommand =>
            subcommand
              .setName('remove')
              .setDescription('Remove the mention role from alerts')))
      // Earnings Channel Commands
      .addSubcommandGroup(group =>
        group
          .setName('earnings-channel')
          .setDescription('Manage earnings calendar channel')
          .addSubcommand(subcommand =>
            subcommand
              .setName('set')
              .setDescription('Set the channel for daily earnings calendar')
              .addChannelOption(option =>
                option.setName('channel')
                  .setDescription('The channel where earnings will be posted')
                  .addChannelTypes(ChannelType.GuildText)
                  .setRequired(true)))
          .addSubcommand(subcommand =>
            subcommand
              .setName('remove')
              .setDescription('Remove the earnings channel')))
      // Earnings Mention Commands
      .addSubcommandGroup(group =>
        group
          .setName('earnings-mention')
          .setDescription('Manage earnings mention role')
          .addSubcommand(subcommand =>
            subcommand
              .setName('set')
              .setDescription('Set the role to mention with earnings')
              .addRoleOption(option =>
                option.setName('role')
                  .setDescription('Role to mention (e.g., @everyone, @Earnings Watchers)')
                  .setRequired(true)))
          .addSubcommand(subcommand =>
            subcommand
              .setName('remove')
              .setDescription('Remove the earnings mention role')))
      // View Command
      .addSubcommand(subcommand =>
        subcommand
          .setName('view')
          .setDescription('View the current bot configuration'));
  }

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    if (!AuthManager.isAuthorized(guildId, userId)) {
      return await interaction.reply({
        content: '❌ You are not authorized to use this bot. Contact the bot owner for access.',
        ephemeral: true
      });
    }

    const group = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    // Earnings subcommands are owner-only
    if (group === 'earnings-channel' || group === 'earnings-mention') {
      if (!AuthManager.isOwner(userId)) {
        return await interaction.reply({
          content: '❌ Only the bot owner can configure earnings settings.',
          ephemeral: true
        });
      }
    }

    switch (group) {
      case 'alert-channel':
        if (subcommand === 'add') await this.handleAlertChannelAdd(interaction);
        if (subcommand === 'remove') await this.handleAlertChannelRemove(interaction);
        break;
      case 'alert-mention':
        if (subcommand === 'set') await this.handleAlertMentionSet(interaction);
        if (subcommand === 'remove') await this.handleAlertMentionRemove(interaction);
        break;
      case 'earnings-channel':
        if (subcommand === 'set') await this.handleEarningsChannelSet(interaction);
        if (subcommand === 'remove') await this.handleEarningsChannelRemove(interaction);
        break;
      case 'earnings-mention':
        if (subcommand === 'set') await this.handleEarningsMentionSet(interaction);
        if (subcommand === 'remove') await this.handleEarningsMentionRemove(interaction);
        break;
      case null:
        if (subcommand === 'view') await this.handleView(interaction);
        break;
    }
  }

  async handleAlertChannelAdd(interaction) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    const botMember = interaction.guild.members.me;
    const permissions = channel.permissionsFor(botMember);

    if (!permissions.has(PermissionFlagsBits.SendMessages) ||
      !permissions.has(PermissionFlagsBits.EmbedLinks)) {
      return await interaction.reply({
        content: `❌ I don't have permission to send messages or embed links in ${channel}. Please grant me the necessary permissions first.`,
        ephemeral: true
      });
    }

    const added = await ChannelManager.addChannel(guildId, userId, channel.id);

    if (!added) {
      return await interaction.reply({
        content: `⚠️ ${channel} is already configured for your alerts.`,
        ephemeral: true
      });
    }

    await interaction.reply({
      content: `✅ ${channel} has been added to your alert channels list.`,
      ephemeral: true
    });

    try {
      await channel.send({
        content: '📊 This channel has been added for trading alerts!'
      });
    } catch (error) {
      console.error('Error sending test message:', error);
    }
  }

  async handleAlertChannelRemove(interaction) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    const removed = await ChannelManager.removeChannel(guildId, userId, channel.id);

    if (!removed) {
      return await interaction.reply({
        content: `❌ ${channel} is not in your configured alert channels list.`,
        ephemeral: true
      });
    }

    await interaction.reply({
      content: `✅ ${channel} has been removed from your alert channels list.`,
      ephemeral: true
    });
  }

  async handleAlertMentionSet(interaction) {
    const role = interaction.options.getRole('role');
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    await ChannelManager.setMentionRole(guildId, userId, role.id);

    await interaction.reply({
      content: `✅ Your alerts will now mention ${role}`,
      ephemeral: true
    });
  }

  async handleAlertMentionRemove(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    await ChannelManager.removeMentionRole(guildId, userId);

    await interaction.reply({
      content: `✅ Alert mention role has been removed from your alerts.`,
      ephemeral: true
    });
  }

  async handleEarningsChannelSet(interaction) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guildId;

    const botMember = interaction.guild.members.me;
    const permissions = channel.permissionsFor(botMember);

    if (!permissions.has(PermissionFlagsBits.SendMessages) ||
      !permissions.has(PermissionFlagsBits.EmbedLinks)) {
      return await interaction.reply({
        content: `❌ I don't have permission to send messages or embed links in ${channel}. Please grant me the necessary permissions first.`,
        ephemeral: true
      });
    }

    await ChannelManager.setEarningsChannel(guildId, channel.id);

    await interaction.reply({
      content: `✅ ${channel} has been configured for daily earnings calendar posts.`,
      ephemeral: true
    });

    try {
      await channel.send({
        content: '📅 This channel is now configured for daily earnings calendar!'
      });
    } catch (error) {
      console.error('Error sending test message:', error);
    }
  }

  async handleEarningsChannelRemove(interaction) {
    const guildId = interaction.guildId;

    const removed = await ChannelManager.removeEarningsChannel(guildId);

    if (!removed) {
      return await interaction.reply({
        content: `❌ No earnings channel is currently configured.`,
        ephemeral: true
      });
    }

    await interaction.reply({
      content: `✅ Earnings channel has been removed.`,
      ephemeral: true
    });
  }

  async handleEarningsMentionSet(interaction) {
    const role = interaction.options.getRole('role');
    const guildId = interaction.guildId;

    await ChannelManager.setEarningsMentionRole(guildId, role.id);

    await interaction.reply({
      content: `✅ Earnings posts will now mention ${role}`,
      ephemeral: true
    });
  }

  async handleEarningsMentionRemove(interaction) {
    const guildId = interaction.guildId;

    await ChannelManager.removeEarningsMentionRole(guildId);

    await interaction.reply({
      content: `✅ Earnings mention role has been removed.`,
      ephemeral: true
    });
  }

  async handleView(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const config = ChannelManager.getConfiguration(guildId, userId);

    if (config.channels.length === 0 && !config.mentionRole && !config.earningsChannel && !config.earningsMentionRole) {
      return await interaction.reply({
        content: '📋 No configuration found.\n\nUse `/setup alert-channel add` to add your alert channels and `/setup earnings-channel set` to configure earnings.',
        ephemeral: true
      });
    }

    let response = '📋 **Current Configuration:**\n\n';

    // Show user's alert channels
    response += '**📊 Your Alert Channels:**\n';
    if (config.channels.length > 0) {
      for (const channelId of config.channels) {
        const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
        if (channel) {
          response += `• ${channel}\n`;
        } else {
          response += `• <#${channelId}> (channel deleted)\n`;
          await ChannelManager.removeChannel(guildId, userId, channelId);
        }
      }
    } else {
      response += '• None configured\n';
    }

    // Show user's alert mention role
    response += '\n**👥 Your Alert Mention Role:** ';
    if (config.mentionRole) {
      const role = await interaction.guild.roles.fetch(config.mentionRole).catch(() => null);
      if (role) {
        response += `${role}`;
      } else {
        response += 'Role deleted';
        await ChannelManager.removeMentionRole(guildId, userId);
      }
    } else {
      response += 'None';
    }

    // Show earnings channel (guild-level)
    response += '\n\n**📅 Earnings Channel:** ';
    if (config.earningsChannel) {
      const channel = await interaction.guild.channels.fetch(config.earningsChannel).catch(() => null);
      if (channel) {
        response += `${channel}`;
      } else {
        response += 'Channel deleted';
        await ChannelManager.removeEarningsChannel(guildId);
      }
    } else {
      response += 'None';
    }

    // Show earnings mention role (guild-level)
    response += '\n**👥 Earnings Mention Role:** ';
    if (config.earningsMentionRole) {
      const role = await interaction.guild.roles.fetch(config.earningsMentionRole).catch(() => null);
      if (role) {
        response += `${role}`;
      } else {
        response += 'Role deleted';
        await ChannelManager.removeEarningsMentionRole(guildId);
      }
    } else {
      response += 'None';
    }

    response += '\n\n*Use `/setup` subcommands to modify your configuration.*';

    await interaction.reply({
      content: response,
      ephemeral: true
    });
  }
}

module.exports = SetupCommand;
