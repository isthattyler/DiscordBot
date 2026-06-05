const { EmbedBuilder } = require('discord.js');
const config = require('../utils/ConfigLoader');

class TradingAlertEmbed {
  constructor(alertData) {
    this.alertData = alertData;
    this.botConfig = config.get('bot');
    this.alertConfig = config.get('alerts');
    this.direction = alertData.position || 'neutral';
  }

  build() {
    const { color, emoji } = this._getDirectionStyles();
    
    const embed = new EmbedBuilder()
      .setColor(color)
      .setThumbnail(this.botConfig.icon_url)
      .addFields(this._buildFields(emoji))
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

  _getDirectionStyles() {
    const position = this.direction.toLowerCase();
    
    if (position === 'long') {
      return { color: 0x00FF00, emoji: '📈' }; // Green
    } else if (position === 'short') {
      return { color: 0xFF0000, emoji: '📉' }; // Red
    } else {
      return { color: this.botConfig.embed_color || 0x5865F2, emoji: '📊' }; // Default blue
    }
  }

  _buildFields(directionEmoji) {
    const ticker = this.alertData.ticker || '';
    const directionWord = this.direction === 'long' ? 'Long' : this.direction === 'short' ? 'Short' : '';
    
    const fields = [
      {
        name: `${directionEmoji} Ticker:`,
        value: directionWord ? `${directionWord} ${ticker.toUpperCase()}` : ticker.toUpperCase(),
        inline: false,
      },
      {
        name: '💵 Entry:',
        value: this.alertData.entry,
        inline: false,
      },
    ];

    // Only add stoploss field if it's set
    if (this.alertData.stoploss) {
      fields.push({
        name: '🚨 Stoploss:',
        value: this.alertData.stoploss,
        inline: false,
      });
    }

    // Only add target field if it's set
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

module.exports = TradingAlertEmbed;