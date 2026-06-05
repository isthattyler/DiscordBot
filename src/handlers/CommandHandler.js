const { REST, Routes } = require('discord.js');
const config = require('../utils/ConfigLoader');
const LongCommand = require('../commands/LongCommand');
const ShortCommand = require('../commands/ShortCommand');
const SetupCommand = require('../commands/SetupCommand');
const CommentCommand = require('../commands/CommentCommand');
const AuthCommand = require('../commands/AuthCommand');
const AccessCommand = require('../commands/AccessCommand');
const EarningsCommand = require('../commands/EarningsCommand');

class CommandHandler {
  constructor() {
    this.commands = new Map();
    this.commandData = [];
    this.loadCommands();
  }

  loadCommands() {
    // Register all commands here
    const longCommand = new LongCommand();
    const shortCommand = new ShortCommand();
    const setupCommand = new SetupCommand();
    const commentCommand = new CommentCommand();
    const authCommand = new AuthCommand();
    const accessCommand = new AccessCommand();
    const earningsCommand = new EarningsCommand();

    this.commands.set('long', longCommand);
    this.commands.set('short', shortCommand);
    this.commands.set('setup', setupCommand);
    this.commands.set('comment', commentCommand);
    this.commands.set('auth', authCommand);
    this.commands.set('access', accessCommand);
    this.commands.set('earnings', earningsCommand);

    this.commandData.push(longCommand.data.toJSON());
    this.commandData.push(shortCommand.data.toJSON());
    this.commandData.push(setupCommand.data.toJSON());
    this.commandData.push(commentCommand.data.toJSON());
    this.commandData.push(authCommand.data.toJSON());
    this.commandData.push(accessCommand.data.toJSON());
    this.commandData.push(earningsCommand.data.toJSON());

    console.log('✅ Commands loaded: long, short, setup, comment, auth, access, earnings');
  }

  async registerCommands() {
    try {
      const rest = new REST({ version: '10' }).setToken(config.getToken());

      console.log('🔄 Started refreshing application (/) commands.');

      await rest.put(
        Routes.applicationCommands(config.getClientId()),
        { body: this.commandData },
      );

      console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
      console.error('❌ Error registering commands:', error);
    }
  }

  async handleInteraction(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = this.commands.get(interaction.commandName);

    if (!command) {
      console.error(`Command ${interaction.commandName} not found`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error('Error executing command:', error);

      const errorMessage = {
        content: 'There was an error executing this command!',
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  }
}


module.exports = CommandHandler;