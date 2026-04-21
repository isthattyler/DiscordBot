const { EmbedBuilder } = require('discord.js');
const config = require('../utils/ConfigLoader');

class EarningsCalendarEmbed {
  constructor(earningsData, date, type = 'day') {
    this.earningsData = earningsData;
    this.date = date;
    this.type = type;
    this.botConfig = config.get('bot');
  }

  build() {
    const { preMarket, postMarket } = this.earningsData;
    
    // Skip if no earnings
    if (preMarket.length === 0 && postMarket.length === 0) {
      return null;
    }

    const embed = new EmbedBuilder()
      .setColor(this.botConfig.embed_color || '#5865F2')
      .setThumbnail(this.botConfig.icon_url)
      .setTimestamp();

    // Title based on type
    const dateStr = this.date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (this.type === 'day') {
      embed.setTitle(`📅 Earnings Calendar — ${dateStr}`);
    } else if (this.type === 'week') {
      embed.setTitle(`📅 Weekly Earnings Calendar`);
    }

    // Pre-Market section
    if (preMarket.length > 0) {
      embed.addFields({
        name: `🌅 Pre-Market (${preMarket.length})`,
        value: this.formatEarningsList(preMarket),
        inline: false
      });
    }

    // Post-Market section
    if (postMarket.length > 0) {
      embed.addFields({
        name: `🌙 Post-Market (${postMarket.length})`,
        value: this.formatEarningsList(postMarket),
        inline: false
      });
    }

    // Footer
    const footerOptions = {
      text: 'Earnings data from Alpha Vantage. Times are ET.'
    };

    if (this.botConfig.icon_url) {
      footerOptions.iconURL = this.botConfig.icon_url;
    }

    embed.setFooter(footerOptions);

    return embed;
  }

  formatEarningsList(earnings) {
    return earnings.map(e => {
      const estimate = e.estimate ? `$${e.estimate}` : 'N/A';
      return `• **${e.symbol}** — Est: ${estimate}`;
    }).join('\n');
  }

  static buildWeekEmbed(weekData, botConfig) {
    if (!weekData || Object.keys(weekData).length === 0) {
      return null;
    }

    const embed = new EmbedBuilder()
      .setColor(botConfig?.embed_color || '#5865F2')
      .setThumbnail(botConfig?.icon_url)
      .setTitle('📅 Weekly Earnings Calendar')
      .setTimestamp();

    const date = new Date();
    const weekStart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekEnd = new Date(date);
    weekEnd.setDate(weekEnd.getDate() + 4);
    const weekEndStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    embed.setDescription(`**${weekStart} - ${weekEndStr}**`);

    let totalCompanies = 0;

    for (const [reportDate, earnings] of Object.entries(weekData)) {
      const reportDateObj = new Date(reportDate);
      const dayName = reportDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      
      const { preMarket, postMarket } = this.splitByMarketTime(earnings);
      const dayTotal = preMarket.length + postMarket.length;
      
      if (dayTotal > 0) {
        totalCompanies += dayTotal;
        embed.addFields({
          name: `${dayName} (${dayTotal})`,
          value: this.formatDayEarnings(preMarket, postMarket),
          inline: false
        });
      }
    }

    if (totalCompanies === 0) {
      return null;
    }

    const footerOptions = {
      text: `${totalCompanies} S&P 500 / Nasdaq 100 companies reporting this week`
    };

    if (botConfig?.icon_url) {
      footerOptions.iconURL = botConfig.icon_url;
    }

    embed.setFooter(footerOptions);

    return embed;
  }

  static splitByMarketTime(earnings) {
    const preMarket = [];
    const postMarket = [];
    
    earnings.forEach(entry => {
      const time = entry.timeOfTheDay?.toLowerCase() || '';
      if (time.includes('pre')) {
        preMarket.push(entry);
      } else {
        postMarket.push(entry);
      }
    });
    
    return { preMarket, postMarket };
  }

  static formatDayEarnings(preMarket, postMarket) {
    const lines = [];
    
    if (preMarket.length > 0) {
      lines.push('🌅 **Pre-Market**');
      preMarket.forEach(e => {
        const estimate = e.estimate ? `$${e.estimate}` : 'N/A';
        lines.push(`• ${e.symbol} — Est: ${estimate}`);
      });
    }
    
    if (postMarket.length > 0) {
      if (preMarket.length > 0) lines.push('');
      lines.push('🌙 **Post-Market**');
      postMarket.forEach(e => {
        const estimate = e.estimate ? `$${e.estimate}` : 'N/A';
        lines.push(`• ${e.symbol} — Est: ${estimate}`);
      });
    }
    
    return lines.join('\n');
  }

  static create(earningsData, date, type = 'day') {
    return new EarningsCalendarEmbed(earningsData, date, type).build();
  }
}

module.exports = EarningsCalendarEmbed;
