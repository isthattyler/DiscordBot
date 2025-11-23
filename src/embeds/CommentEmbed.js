const { EmbedBuilder } = require('discord.js');
const config = require('../utils/ConfigLoader');

class CommentEmbed {
  constructor(commentData) {
    this.commentData = commentData;
    this.botConfig = config.get('bot');
    this.alertConfig = config.get('alerts');
  }

  build() {
    const embed = new EmbedBuilder()
      .setThumbnail(this.botConfig.icon_url)
      .setColor(this.botConfig.embed_color)
      .setTitle('💬 Trade Comment')
      .setDescription(this.commentData.message)
      .setTimestamp();

    const footerOptions = {
      text: this.alertConfig.footer_text,
    };
    
    if (this.botConfig.icon_url) {
      footerOptions.iconURL = this.botConfig.icon_url;
    }

    embed.setFooter(footerOptions);

    // Add ticker field if provided
    if (this.commentData.ticker) {
      embed.addFields({
        name: '📊 Ticker:',
        value: this.commentData.ticker.toUpperCase(),
        inline: true,
      });
    }

    // Add author field
    if (this.commentData.author) {
      embed.setFooter({
        text: `Comment by ${this.commentData.author}`,
      });
    }

    return embed;
  }

  static create(commentData) {
    return new CommentEmbed(commentData).build();
  }
}

module.exports = CommentEmbed;