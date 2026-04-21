const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class EarningsCalendar {
  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    this.baseUrl = 'https://www.alphavantage.co/query';
    this.cacheFile = path.join(__dirname, '../../data/earnings_cache.json');
    this.sp500Tickers = new Set();
    this.nasdaq100Tickers = new Set();
    this.combinedTickers = new Set();
    this.cache = null;
    
    this.loadIndexLists();
  }

  async loadIndexLists() {
    try {
      const sp500Path = path.join(__dirname, '../../data/sp500.json');
      const nasdaq100Path = path.join(__dirname, '../../data/nasdaq100.json');
      
      const [sp500Data, nasdaq100Data] = await Promise.all([
        fs.readFile(sp500Path, 'utf8'),
        fs.readFile(nasdaq100Path, 'utf8')
      ]);
      
      const sp500 = JSON.parse(sp500Data);
      const nasdaq100 = JSON.parse(nasdaq100Data);
      
      this.sp500Tickers = new Set(sp500);
      this.nasdaq100Tickers = new Set(nasdaq100);
      this.combinedTickers = new Set([...sp500, ...nasdaq100]);
      
      console.log(`✅ EarningsCalendar loaded: ${this.combinedTickers.size} unique tickers (S&P 500 + Nasdaq 100)`);
    } catch (error) {
      console.error('❌ Error loading index lists:', error);
    }
  }

  async fetch(horizon = '3month') {
    try {
      const url = `${this.baseUrl}?function=EARNINGS_CALENDAR&horizon=${horizon}&apikey=${this.apiKey}`;
      const response = await axios.get(url);
      
      // Alpha Vantage returns CSV format
      const csvData = response.data;
      const earnings = this.parseCSV(csvData);
      
      console.log(`✅ Fetched ${earnings.length} earnings from Alpha Vantage`);
      return earnings;
    } catch (error) {
      console.error('❌ Error fetching earnings calendar:', error.message);
      throw error;
    }
  }

  parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',');
    const earnings = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length >= headers.length) {
        const entry = {};
        headers.forEach((header, index) => {
          entry[header.trim()] = values[index]?.trim() || '';
        });
        earnings.push(entry);
      }
    }
    
    return earnings;
  }

  filterByIndex(earnings) {
    return earnings.filter(entry => {
      const symbol = entry.symbol?.trim().toUpperCase();
      return this.combinedTickers.has(symbol);
    });
  }

  groupByDate(earnings) {
    const grouped = {};
    
    earnings.forEach(entry => {
      const date = entry.reportDate;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(entry);
    });
    
    return grouped;
  }

  splitByMarketTime(earnings) {
    const preMarket = [];
    const postMarket = [];
    
    earnings.forEach(entry => {
      const time = entry.timeOfTheDay?.toLowerCase() || '';
      if (time.includes('pre')) {
        preMarket.push(entry);
      } else if (time.includes('post')) {
        postMarket.push(entry);
      } else {
        // Default to post-market if not specified
        postMarket.push(entry);
      }
    });
    
    return { preMarket, postMarket };
  }

  async cacheToFile(earnings) {
    try {
      const cacheData = {
        timestamp: new Date().toISOString(),
        earnings: earnings
      };
      
      await fs.writeFile(this.cacheFile, JSON.stringify(cacheData, null, 2), 'utf8');
      this.cache = cacheData;
      console.log('✅ Earnings data cached to file');
    } catch (error) {
      console.error('❌ Error caching earnings data:', error);
    }
  }

  async loadFromCache() {
    try {
      const data = await fs.readFile(this.cacheFile, 'utf8');
      this.cache = JSON.parse(data);
      console.log('✅ Earnings cache loaded from file');
      return this.cache;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('📝 No earnings cache found, will fetch from API');
      } else {
        console.error('❌ Error loading cache:', error);
      }
      return null;
    }
  }

  isCacheValid(maxAgeHours = 24) {
    if (!this.cache || !this.cache.timestamp) {
      return false;
    }
    
    const cacheTime = new Date(this.cache.timestamp);
    const now = new Date();
    const ageHours = (now - cacheTime) / (1000 * 60 * 60);
    
    return ageHours < maxAgeHours;
  }

  async getEarningsForDate(targetDate) {
    // Load or fetch earnings data
    if (!this.cache || !this.isCacheValid()) {
      try {
        const earnings = await this.fetch('3month');
        const filtered = this.filterByIndex(earnings);
        await this.cacheToFile(filtered);
      } catch (error) {
        console.error('Failed to fetch earnings, using stale cache if available');
        await this.loadFromCache();
      }
    } else {
      await this.loadFromCache();
    }
    
    if (!this.cache || !this.cache.earnings) {
      return { preMarket: [], postMarket: [] };
    }
    
    // Filter for target date
    const dateStr = targetDate.toISOString().split('T')[0];
    const dayEarnings = this.cache.earnings.filter(e => e.reportDate === dateStr);
    
    return this.splitByMarketTime(dayEarnings);
  }

  async getTodayEarnings() {
    return this.getEarningsForDate(new Date());
  }

  async getTomorrowEarnings() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Skip weekends
    if (tomorrow.getDay() === 6) { // Saturday
      tomorrow.setDate(tomorrow.getDate() + 2);
    } else if (tomorrow.getDay() === 0) { // Sunday
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    
    return this.getEarningsForDate(tomorrow);
  }

  async getWeekEarnings() {
    // Load or fetch earnings data
    if (!this.cache || !this.isCacheValid()) {
      try {
        const earnings = await this.fetch('3month');
        const filtered = this.filterByIndex(earnings);
        await this.cacheToFile(filtered);
      } catch (error) {
        console.error('Failed to fetch earnings, using stale cache if available');
        await this.loadFromCache();
      }
    } else {
      await this.loadFromCache();
    }
    
    if (!this.cache || !this.cache.earnings) {
      return [];
    }
    
    // Get next 5 trading days
    const today = new Date();
    const weekDates = [];
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      // Skip weekends
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        weekDates.push(date.toISOString().split('T')[0]);
      }
    }
    
    // Filter earnings for this week
    const weekEarnings = this.cache.earnings.filter(e => 
      weekDates.includes(e.reportDate)
    );
    
    return this.groupByDate(weekEarnings);
  }

  formatEarningsForEmbed(earnings) {
    return earnings.map(e => {
      const estimate = e.estimate ? `$${e.estimate}` : 'N/A';
      return `• ${e.symbol} — Est: ${estimate}`;
    }).join('\n');
  }
}

module.exports = new EarningsCalendar();
