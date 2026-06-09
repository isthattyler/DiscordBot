const fs = require('fs').promises;
const path = require('path');
const https = require('https');

class LogoManager {
  constructor() {
    this.cacheDir = path.join(__dirname, '../../data/logos');
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    await this.ensureCacheDir();
    this.initialized = true;
  }

  async ensureCacheDir() {
    try {
      await fs.access(this.cacheDir);
    } catch {
      await fs.mkdir(this.cacheDir, { recursive: true });
    }
  }

  getLogoPath(ticker) {
    return path.join(this.cacheDir, `${ticker.toUpperCase()}.png`);
  }

  async getLogo(ticker) {
    const upperTicker = ticker.toUpperCase();
    const logoPath = this.getLogoPath(upperTicker);

    // Check if cached
    try {
      await fs.access(logoPath);
      const buffer = await fs.readFile(logoPath);
      return { buffer, source: 'cache' };
    } catch {
      // Not cached, fetch from web
    }

    // Try to fetch from parqet
    try {
      const buffer = await this.fetchLogo(upperTicker);
      if (buffer && buffer.length > 100) {
        await fs.writeFile(logoPath, buffer);
        return { buffer, source: 'fetched' };
      }
    } catch (error) {
      console.log(`⚠️ Logo fetch failed for ${upperTicker}:`, error.message);
    }

    return null;
  }

  fetchLogo(ticker) {
    return new Promise((resolve, reject) => {
      const url = `https://assets.parqet.com/logos/symbol/${ticker}.png`;
      https.get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          // Follow redirect
          const redirectUrl = res.headers.location;
          if (redirectUrl) {
            const client = redirectUrl.startsWith('https') ? https : require('http');
            client.get(redirectUrl, (redirectRes) => {
              if (redirectRes.statusCode !== 200) {
                reject(new Error(`HTTP ${redirectRes.statusCode}`));
                return;
              }
              const chunks = [];
              redirectRes.on('data', chunk => chunks.push(chunk));
              redirectRes.on('end', () => resolve(Buffer.concat(chunks)));
            }).on('error', reject);
          } else {
            reject(new Error('Redirect without location'));
          }
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    });
  }

  // Generate a deterministic color for a ticker based on its characters
  getTickerColor(ticker) {
    const colors = [
      '#1DB954', '#E81123', '#0078D4', '#FF8C00', '#8E44AD',
      '#00B894', '#E74C3C', '#3498DB', '#F39C12', '#9B59B6',
      '#2ECC71', '#E67E22', '#2980B9', '#C0392B', '#16A085',
      '#D35400', '#27AE60', '#8E44AD', '#2C3E50', '#F1C40F'
    ];

    let hash = 0;
    for (let i = 0; i < ticker.length; i++) {
      hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }

  reset() {
    this.initialized = false;
  }
}

const instance = new LogoManager();
module.exports = instance;
module.exports.LogoManager = LogoManager;
