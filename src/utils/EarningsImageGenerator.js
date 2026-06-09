const { createCanvas, Image } = require('canvas');
const LogoManager = require('./LogoManager');

class EarningsImageGenerator {
  constructor() {
    this.logoSize = 48;
    this.logoGap = 12;
    this.logosPerRow = 3;
    this.maxLogos = 10;
    this.dailyWidth = 800;
    this.weeklyDayWidth = 200;
    this.weeklyWidth = 20 + (5 * this.weeklyDayWidth) + (4 * 20) + 20; // 5 days + gaps + padding
  }

  async init() {
    await LogoManager.init();
  }

  // ─── Logo Pre-loading ───

  async preloadLogos(tickers) {
    const logos = {};
    for (const ticker of tickers) {
      const result = await LogoManager.getLogo(ticker);
      if (result && result.buffer) {
        try {
          const img = new Image();
          img.src = result.buffer;
          logos[ticker] = img;
        } catch (error) {
          console.log(`⚠️ Failed to load logo image for ${ticker}:`, error.message);
        }
      }
    }
    return logos;
  }

  // ─── Daily Image ───

  async generateDailyImage(earningsData, date) {
    const { preMarket, postMarket } = earningsData;

    // Pre-load all logos
    const allTickers = [
      ...preMarket.map(e => e.symbol),
      ...postMarket.map(e => e.symbol)
    ];
    const logos = await this.preloadLogos(allTickers);

    const preRows = Math.ceil(Math.min(preMarket.length, this.maxLogos) / this.logosPerRow);
    const postRows = Math.ceil(Math.min(postMarket.length, this.maxLogos) / this.logosPerRow);

    const headerHeight = 60;
    const sectionHeaderHeight = 40;
    const sectionPadding = 20;
    const logoAreaHeight = this.logoSize + 24; // logo + text
    const rowHeight = logoAreaHeight + this.logoGap;
    const footerHeight = 30;

    const preHeight = preMarket.length > 0
      ? sectionHeaderHeight + sectionPadding + (preRows * rowHeight) + sectionPadding + (preMarket.length > this.maxLogos ? 20 : 0)
      : sectionHeaderHeight + sectionPadding + 40 + sectionPadding;

    const postHeight = postMarket.length > 0
      ? sectionHeaderHeight + sectionPadding + (postRows * rowHeight) + sectionPadding + (postMarket.length > this.maxLogos ? 20 : 0)
      : sectionHeaderHeight + sectionPadding + 40 + sectionPadding;

    const canvasHeight = headerHeight + preHeight + 20 + postHeight + footerHeight;

    const canvas = createCanvas(this.dailyWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(0, 0, this.dailyWidth, canvasHeight);

    // Header
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    this.drawHeader(ctx, dateStr, headerHeight);

    // Pre-Market section
    let y = headerHeight;
    y = this.drawSection(ctx, 20, y, this.dailyWidth - 40, preHeight, '☀ Before Open', preMarket, logos, '#E5C29F', '#F5E6D3');

    // Post-Market section
    y += 20;
    this.drawSection(ctx, 20, y, this.dailyWidth - 40, postHeight, '🌙 After Close', postMarket, logos, '#8FA8B8', '#E3EBF0');

    // Footer
    ctx.fillStyle = '#888888';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Earnings data from Alpha Vantage | Major indices only', this.dailyWidth / 2, canvasHeight - 12);

    return canvas.toBuffer('image/png');
  }

  // ─── Weekly Image ───

  async generateWeeklyImage(weekData) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const today = new Date();
    const dayDates = [];

    // Find Monday of this week (or next week if today is weekend)
    const monday = new Date(today);
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);

    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dayDates.push({
        name: days[i],
        date: d,
        dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        key: d.toISOString().split('T')[0]
      });
    }

    // Pre-load all logos across all days
    const allTickers = [];
    for (const dayInfo of dayDates) {
      const earnings = weekData[dayInfo.key] || [];
      for (const e of earnings) {
        allTickers.push(e.symbol);
      }
    }
    const logos = await this.preloadLogos(allTickers);

    // Calculate max height needed
    let maxDayHeight = 0;
    for (const dayInfo of dayDates) {
      const earnings = weekData[dayInfo.key] || [];
      const pre = earnings.filter(e => (e.timeOfTheDay?.toLowerCase() || '').includes('pre'));
      const post = earnings.filter(e => !(e.timeOfTheDay?.toLowerCase() || '').includes('pre'));
      const h = this.calculateDayHeight(pre, post);
      maxDayHeight = Math.max(maxDayHeight, h);
    }

    const headerHeight = 60;
    const footerHeight = 30;
    const canvasHeight = headerHeight + maxDayHeight + footerHeight + 40;

    const canvas = createCanvas(this.weeklyWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(0, 0, this.weeklyWidth, canvasHeight);

    // Header
    const weekStart = dayDates[0].dateStr;
    const weekEnd = dayDates[4].dateStr;
    this.drawWeeklyHeader(ctx, `Weekly Earnings — ${weekStart} to ${weekEnd}`, headerHeight);

    // Draw columns
    let x = 20;
    const dayWidth = this.weeklyDayWidth;
    const dayHeight = maxDayHeight;

    for (let i = 0; i < dayDates.length; i++) {
      const dayInfo = dayDates[i];
      const earnings = weekData[dayInfo.key] || [];
      const pre = earnings.filter(e => (e.timeOfTheDay?.toLowerCase() || '').includes('pre'));
      const post = earnings.filter(e => !(e.timeOfTheDay?.toLowerCase() || '').includes('pre'));

      this.drawDayColumn(ctx, x, headerHeight + 20, dayWidth, dayHeight, dayInfo, pre, post, logos);

      // Vertical separator
      if (i < dayDates.length - 1) {
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + dayWidth + 10, headerHeight + 20);
        ctx.lineTo(x + dayWidth + 10, headerHeight + 20 + dayHeight);
        ctx.stroke();
      }

      x += dayWidth + 20;
    }

    // Footer
    ctx.fillStyle = '#888888';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Earnings data from Alpha Vantage | Major indices only', this.weeklyWidth / 2, canvasHeight - 12);

    return canvas.toBuffer('image/png');
  }

  // ─── Drawing Helpers ───

  drawHeader(ctx, title, height) {
    ctx.fillStyle = '#1DB954';
    ctx.beginPath();
    ctx.roundRect(20, 10, this.dailyWidth - 40, height - 20, 20);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, this.dailyWidth / 2, height / 2);
  }

  drawWeeklyHeader(ctx, title, height) {
    ctx.fillStyle = '#1DB954';
    ctx.beginPath();
    ctx.roundRect(20, 10, this.weeklyWidth - 40, height - 20, 20);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, this.weeklyWidth / 2, height / 2);
  }

  drawSection(ctx, x, y, width, height, title, earnings, logos, headerColor, bgColor) {
    // Section background
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 12);
    ctx.fill();

    // Section header
    ctx.fillStyle = headerColor;
    ctx.beginPath();
    ctx.roundRect(x, y, width, 36, 12);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, x + 12, y + 18);

    const contentY = y + 50;

    if (earnings.length === 0) {
      // No earnings card
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(x + 12, contentY, width - 24, 40, 8);
      ctx.fill();

      ctx.fillStyle = '#666666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📅 No Earnings', x + width / 2, contentY + 22);
      return y + height;
    }

    // Draw logos
    const capped = earnings.slice(0, this.maxLogos);
    const remaining = earnings.length - this.maxLogos;

    let logoX = x + 20;
    let logoY = contentY;
    const rowWidth = width - 40;
    const itemWidth = this.logoSize + this.logoGap;
    const itemsPerRow = Math.floor(rowWidth / itemWidth);

    for (let i = 0; i < capped.length; i++) {
      if (i > 0 && i % itemsPerRow === 0) {
        logoX = x + 20;
        logoY += this.logoSize + 30;
      }

      const ticker = capped[i].symbol;
      this.drawLogoOrFallback(ctx, logoX, logoY, ticker, logos);

      ctx.fillStyle = '#333333';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ticker, logoX + this.logoSize / 2, logoY + this.logoSize + 14);

      logoX += itemWidth;
    }

    if (remaining > 0) {
      ctx.fillStyle = '#666666';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`and ${remaining} more...`, x + width / 2, logoY + this.logoSize + 30);
    }

    return y + height;
  }

  drawDayColumn(ctx, x, y, width, height, dayInfo, pre, post, logos) {
    // Day header
    const isToday = new Date().toDateString() === dayInfo.date.toDateString();
    ctx.fillStyle = isToday ? '#1DB954' : '#333333';
    ctx.beginPath();
    ctx.roundRect(x, y, width, 32, 12);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${dayInfo.name} ${dayInfo.date.getDate()}`, x + width / 2, y + 16);

    let currentY = y + 40;

    // Before Open
    const preHeight = this.calculateSectionHeight(pre);
    this.drawMiniSection(ctx, x, currentY, width, preHeight, '☀ Before Open', pre, logos, '#E5C29F', '#F5E6D3');
    currentY += preHeight + 8;

    // After Close
    const postHeight = this.calculateSectionHeight(post);
    this.drawMiniSection(ctx, x, currentY, width, postHeight, '🌙 After Close', post, logos, '#8FA8B8', '#E3EBF0');
  }

  drawMiniSection(ctx, x, y, width, height, title, earnings, logos, headerColor, bgColor) {
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fill();

    ctx.fillStyle = headerColor;
    ctx.beginPath();
    ctx.roundRect(x, y, width, 26, 8);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, x + 8, y + 13);

    const contentY = y + 32;

    if (earnings.length === 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(x + 4, contentY, width - 8, 28, 6);
      ctx.fill();

      ctx.fillStyle = '#666666';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No Earnings', x + width / 2, contentY + 15);
      return;
    }

    const capped = earnings.slice(0, this.maxLogos);
    const remaining = earnings.length - this.maxLogos;
    const miniLogoSize = 32;
    const miniGap = 8;
    const itemWidth = miniLogoSize + miniGap;
    const itemsPerRow = Math.floor((width - 16) / itemWidth);

    let logoX = x + 8;
    let logoY = contentY;

    for (let i = 0; i < capped.length; i++) {
      if (i > 0 && i % itemsPerRow === 0) {
        logoX = x + 8;
        logoY += miniLogoSize + 22;
      }

      const ticker = capped[i].symbol;
      this.drawLogoOrFallback(ctx, logoX, logoY, ticker, logos, miniLogoSize);

      ctx.fillStyle = '#333333';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ticker, logoX + miniLogoSize / 2, logoY + miniLogoSize + 10);

      logoX += itemWidth;
    }

    if (remaining > 0) {
      ctx.fillStyle = '#666666';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`+${remaining} more`, x + width / 2, logoY + miniLogoSize + 14);
    }
  }

  drawLogoOrFallback(ctx, x, y, ticker, logos, size = this.logoSize) {
    if (logos && logos[ticker]) {
      // Draw actual logo image
      ctx.drawImage(logos[ticker], x, y, size, size);
    } else {
      // Draw colored fallback square
      const color = LogoManager.getTickerColor(ticker);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, 6);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.max(10, size / 3)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ticker, x + size / 2, y + size / 2);
    }
  }

  // ─── Height Calculations ───

  calculateDayHeight(pre, post) {
    const preH = this.calculateSectionHeight(pre);
    const postH = this.calculateSectionHeight(post);
    return 40 + preH + 8 + postH;
  }

  calculateSectionHeight(earnings) {
    if (earnings.length === 0) return 60;

    const miniLogoSize = 32;
    const miniGap = 8;
    const itemWidth = miniLogoSize + miniGap;
    const itemsPerRow = Math.floor((this.weeklyDayWidth - 16) / itemWidth);
    const rows = Math.ceil(Math.min(earnings.length, this.maxLogos) / itemsPerRow);
    const extra = earnings.length > this.maxLogos ? 14 : 0;

    return 32 + (rows * (miniLogoSize + 22)) + extra + 8;
  }

  reset() {
    // Nothing to reset
  }
}

const instance = new EarningsImageGenerator();
module.exports = instance;
module.exports.EarningsImageGenerator = EarningsImageGenerator;
