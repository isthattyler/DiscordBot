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
    if (interaction.customId === 'access_script_select') {
      const selectedScript = interaction.values[0];

      // Create modal for username input
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
  }

  async handleModalSubmit(interaction) {
    if (interaction.customId.startsWith('access_modal:')) {
      const scriptName = interaction.customId.split(':')[1];
      const username = interaction.fields.getTextInputValue('username');

      // Defer the reply since API call might take time
      await interaction.deferReply({ ephemeral: true });

      // Call the API
      const result = await this.accessManager.grantAccess(scriptName, username);

      // Build response message
      let responseMessage = `**Script:** ${scriptName}\n**Username:** ${username}\n\n${result.message}`;

      // Add details if available
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
  }
}

module.exports = InteractionHandler;
module.exports.instance = new InteractionHandler();