const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const ChannelManager = require('../utils/ChannelManager');

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
          .setDescription('View the current bot configuration'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);
  }

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

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

  async handleAlertChannelRemove(interaction) {
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

  async handleAlertMentionSet(interaction) {
    const role = interaction.options.getRole('role');
    const guildId = interaction.guildId;

    await ChannelManager.setMentionRole(guildId, role.id);

    await interaction.reply({
      content: `✅ Alerts will now mention ${role}`,
      ephemeral: true
    });
  }

  async handleAlertMentionRemove(interaction) {
    const guildId = interaction.guildId;

    await ChannelManager.removeMentionRole(guildId);

    await interaction.reply({
      content: `✅ Alert mention role has been removed from alerts.`,
      ephemeral: true
    });
  }

  async handleEarningsChannelSet(interaction) {
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

    await ChannelManager.setEarningsChannel(guildId, channel.id);

    await interaction.reply({
      content: `✅ ${channel} has been configured for daily earnings calendar posts.`,
      ephemeral: true
    });

    // Send a test message
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
    const config = ChannelManager.getConfiguration(guildId);

    if (config.channels.length === 0 && !config.mentionRole && !config.earningsChannel && !config.earningsMentionRole) {
      return await interaction.reply({
        content: '📋 No configuration found.\n\nUse `/setup alert-channel add` to add alert channels and `/setup earnings-channel set` to configure earnings.',
        ephemeral: true
      });
    }

    let response = '📋 **Current Configuration:**\n\n';

    // Show alert channels
    response += '**📊 Alert Channels:**\n';
    if (config.channels.length > 0) {
      for (const channelId of config.channels) {
        const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
        if (channel) {
          response += `• ${channel}\n`;
        } else {
          response += `• <#${channelId}> (channel deleted)\n`;
          await ChannelManager.removeChannel(guildId, channelId);
        }
      }
    } else {
      response += '• None configured\n';
    }

    // Show alert mention role
    response += '\n**👥 Alert Mention Role:** ';
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

    // Show earnings channel
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

    // Show earnings mention role
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

    response += '\n\n*Use `/setup` subcommands to modify this configuration.*';

    await interaction.reply({
      content: response,
      ephemeral: true
    });
  }
}

module.exports = SetupCommand;
