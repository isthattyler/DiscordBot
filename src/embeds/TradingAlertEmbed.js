const { EmbedBuilder } = require('discord.js');
const config = require('../utils/ConfigLoader');

class TradingAlertEmbed {
  constructor(alertData) {
    this.alertData = alertData;
    this.botConfig = config.get('bot');
    this.alertConfig = config.get('alerts');
  }

  build() {
    const embed = new EmbedBuilder()
      .setColor(this.botConfig.embed_color)
      .setThumbnail(this.botConfig.icon_url)
      .addFields(this._buildFields())
      .setTimestamp();

    // Set footer with icon
    const footerOptions = {
      text: this.alertConfig.footer_text,
    };

    if (this.botConfig.icon_url) {
      footerOptions.iconURL = this.botConfig.icon_url;
    }

    embed.setFooter(footerOptions);

    return embed;
  }

  _buildFields() {
    const fields = [
      {
        name: '📊 Ticker:',
        value: `${this.alertData.ticker} ${this.alertData.position}`,
        inline: false,
      },
      {
        name: '💵 Entry:',
        value: this.alertData.entry,
        inline: false,
      },
      {
        name: '🚨 Stoploss:',
        value: this.alertData.stoploss ? this.alertData.stoploss : "",
        inline: false,
      },
    ];

    if (this.alertData.target) {
      fields.push({
        name: '🎯 Target:',
        value: this.alertData.target,
        inline: false,
      });
    }

    return fields;
  }

  static create(alertData) {
    return new TradingAlertEmbed(alertData).build();
  }
}

module.exports = TradingAlertEmbed