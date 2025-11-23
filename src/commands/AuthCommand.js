const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const AuthManager = require('../utils/AuthManager');

class AuthCommand {
  constructor() {
    this.data = new SlashCommandBuilder()
      .setName('auth')
      .setDescription('Manage authorized users for the bot')
      .addSubcommand(subcommand =>
        subcommand
          .setName('add')
          .setDescription('Authorize a user to use the bot')
          .addUserOption(option =>
            option.setName('user')
              .setDescription('The user to authorize')
              .setRequired(true)))
      .addSubcommand(subcommand =>
        subcommand
          .setName('remove')
          .setDescription('Remove authorization from a user')
          .addUserOption(option =>
            option.setName('user')
              .setDescription('The user to remove authorization from')
              .setRequired(true)))
      .addSubcommand(subcommand =>
        subcommand
          .setName('list')
          .setDescription('List all authorized users'))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
  }

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    // Only the bot owner can use this command
    if (!AuthManager.isOwner(interaction.user.id)) {
      return await interaction.reply({
        content: '❌ Only the bot owner can manage authorizations.',
        ephemeral: true
      });
    }

    switch (subcommand) {
      case 'add':
        await this.handleAdd(interaction);
        break;
      case 'remove':
        await this.handleRemove(interaction);
        break;
      case 'list':
        await this.handleList(interaction);
        break;
    }
  }

  async handleAdd(interaction) {
    const user = interaction.options.getUser('user');
    const guildId = interaction.guildId;

    const added = await AuthManager.addUser(guildId, user.id);

    if (!added) {
      return await interaction.reply({
        content: `⚠️ ${user} is already authorized to use the bot.`,
        ephemeral: true
      });
    }

    await interaction.reply({
      content: `✅ ${user} has been authorized to use the bot.`,
      ephemeral: true
    });
  }

  async handleRemove(interaction) {
    const user = interaction.options.getUser('user');
    const guildId = interaction.guildId;

    // Prevent owner from removing themselves
    if (user.id === interaction.user.id) {
      return await interaction.reply({
        content: '❌ You cannot remove your own authorization as the bot owner.',
        ephemeral: true
      });
    }

    const removed = await AuthManager.removeUser(guildId, user.id);

    if (!removed) {
      return await interaction.reply({
        content: `❌ ${user} is not in the authorized users list.`,
        ephemeral: true
      });
    }

    await interaction.reply({
      content: `✅ ${user} has been removed from authorized users.`,
      ephemeral: true
    });
  }

  async handleList(interaction) {
    const guildId = interaction.guildId;
    const authorizedUserIds = AuthManager.getAuthorizedUsers(guildId);

    let response = '📋 **Authorized Users:**\n\n';

    // Show owner
    response += `**Bot Owner:** <@${AuthManager.ownerId}> (always authorized)\n\n`;

    // Show authorized users
    if (authorizedUserIds.length > 0) {
      response += '**Authorized Users:**\n';
      for (const userId of authorizedUserIds) {
        response += `• <@${userId}>\n`;
      }
    } else {
      response += '**Authorized Users:** None (only owner can use the bot)\n';
    }

    response += '\n*Use `/auth add` or `/auth remove` to manage authorizations.*';

    await interaction.reply({
      content: response,
      ephemeral: true
    });
  }
}

module.exports = AuthCommand;