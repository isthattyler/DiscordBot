const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');
const AccessManager = require('../utils/AccessManager');

class InteractionHandler {
  constructor() {
    this.accessManager = AccessManager;
  }

  async handleSelectMenu(interaction) {
    try {
      if (interaction.customId === 'access_script_select') {
        const selectedScript = interaction.values[0];

        const modal = new ModalBuilder()
          .setCustomId(`access_modal:${selectedScript}`)
          .setTitle(`Grant Access - ${selectedScript}`);

        const usernameInput = new TextInputBuilder()
          .setCustomId('username')
          .setLabel('TradingView Username')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Enter the TradingView username')
          .setRequired(true)
          .setMaxLength(50);

        const row = new ActionRowBuilder().addComponents(usernameInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
      }
    } catch (error) {
      console.error('Error in handleSelectMenu:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An error occurred while processing your selection.',
          ephemeral: true
        });
      }
    }
  }

  async handleModalSubmit(interaction) {
    try {
      if (interaction.customId.startsWith('access_modal:')) {
        const scriptName = interaction.customId.split(':')[1];
        const username = interaction.fields.getTextInputValue('username');

        await interaction.deferReply({ ephemeral: true });

        const result = await this.accessManager.grantAccess(scriptName, username);

        let responseMessage = `**Script:** ${scriptName}\n**Username:** ${username}\n\n${result.message}`;

        if (result.details) {
          responseMessage += '\n\n**Details:**\n';
          result.details.forEach((item, index) => {
            responseMessage += `${index + 1}.Script: \`${scriptName}\` - Status: ${item.status}\n`;
          });
        }

        await interaction.editReply({
          content: responseMessage,
          ephemeral: true
        });
      }
    } catch (error) {
      console.error('Error in handleModalSubmit:', error);
      try {
        if (interaction.deferred) {
          await interaction.editReply({
            content: 'An error occurred while processing your request.',
            ephemeral: true
          });
        } else if (!interaction.replied) {
          await interaction.reply({
            content: 'An error occurred while processing your request.',
            ephemeral: true
          });
        }
      } catch (replyError) {
        console.error('Error sending error reply:', replyError);
      }
    }
  }
}

module.exports = InteractionHandler;
module.exports.instance = new InteractionHandler();