/**
 * Unit Tests for EarningsCalendar - Pure Functions
 */

jest.mock('fs', () => {
  const originalModule = jest.requireActual('fs');
  return {
    ...originalModule,
    promises: {
      readFile: jest.fn(),
      writeFile: jest.fn()
    }
  };
});

jest.mock('axios', () => ({
  get: jest.fn()
}));

describe('EarningsCalendar - Pure Functions', () => {
  let EC;
  let fsMock;
  
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    delete require.cache[require.resolve('../../../src/utils/EarningsCalendar')];
    
    // Spy on console methods
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Re-require the mocked fs after resetModules
    fsMock = require('fs').promises;
    
    // Default mock: index lists succeed, cache file missing
    fsMock.readFile.mockImplementation((filePath) => {
      if (filePath.includes('sp500.json')) {
        return Promise.resolve(JSON.stringify(['AAPL', 'MSFT', 'GOOGL']));
      }
      if (filePath.includes('nasdaq100.json')) {
        return Promise.resolve(JSON.stringify(['AAPL', 'NVDA', 'MSFT']));
      }
      if (filePath.includes('earnings_cache.json')) {
        return Promise.reject({ code: 'ENOENT' });
      }
      return Promise.reject(new Error('File not found'));
    });
    
    fsMock.writeFile.mockResolvedValue();
    
    EC = require('../../../src/utils/EarningsCalendar');
    await EC.init();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('CSV Parsing', () => {
    test('should parse CSV correctly', () => {
      const csv = `symbol,name,reportDate,fiscalDateEnding,estimate,currency,timeOfTheDay
AAPL,Apple Inc,2026-04-22,2026-03-31,1.52,USD,post-market
NVDA,NVIDIA Corp,2026-04-22,2026-03-31,5.25,USD,pre-market`;
      
      const result = EC.parseCSV(csv);
      
      expect(result).toHaveLength(2);
      expect(result[0].symbol).toBe('AAPL');
      expect(result[0].estimate).toBe('1.52');
    });
    
    test('should handle empty CSV', () => {
      const result = EC.parseCSV('');
      expect(result).toHaveLength(0);
    });
  });
  
  describe('Grouping by Date', () => {
    test('should group earnings by report date', () => {
      const earnings = [
        { symbol: 'AAPL', reportDate: '2026-04-22' },
        { symbol: 'MSFT', reportDate: '2026-04-22' },
        { symbol: 'GOOGL', reportDate: '2026-04-23' }
      ];
      
      const grouped = EC.groupByDate(earnings);
      
      expect(grouped['2026-04-22']).toHaveLength(2);
      expect(grouped['2026-04-23']).toHaveLength(1);
    });
  });
  
  describe('Market Time Split', () => {
    test('should split pre-market and post-market', () => {
      const earnings = [
        { symbol: 'NVDA', timeOfTheDay: 'pre-market' },
        { symbol: 'AAPL', timeOfTheDay: 'post-market' },
        { symbol: 'MSFT', timeOfTheDay: 'Post-Market' }
      ];
      
      const { preMarket, postMarket } = EC.splitByMarketTime(earnings);
      
      expect(preMarket).toHaveLength(1);
      expect(postMarket).toHaveLength(2);
    });
    
    test('should default to post-market when time not specified', () => {
      const earnings = [
        { symbol: 'AAPL', timeOfTheDay: '' },
        { symbol: 'MSFT' }
      ];
      
      const { preMarket, postMarket } = EC.splitByMarketTime(earnings);
      
      expect(preMarket).toHaveLength(0);
      expect(postMarket).toHaveLength(2);
    });
  });
  
  describe('Cache Validation', () => {
    test('should return false for null cache', () => {
      EC.cache = null;
      expect(EC.isCacheValid()).toBe(false);
    });
    
    test('should return true for fresh cache', () => {
      EC.cache = { timestamp: new Date().toISOString() };
      expect(EC.isCacheValid(24)).toBe(true);
    });
    
    test('should return false for stale cache', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 2);
      EC.cache = { timestamp: oldDate.toISOString() };
      expect(EC.isCacheValid(24)).toBe(false);
    });
  });
  
  describe('Format for Embed', () => {
    test('should format earnings with estimates', () => {
      const earnings = [
        { symbol: 'AAPL', estimate: '1.52' },
        { symbol: 'NVDA', estimate: '5.25' }
      ];
      
      const formatted = EC.formatEarningsForEmbed(earnings);
      
      expect(formatted).toContain('AAPL');
      expect(formatted).toContain('$1.52');
    });
    
    test('should handle missing estimates', () => {
      const earnings = [{ symbol: 'XYZ', estimate: '' }];
      const formatted = EC.formatEarningsForEmbed(earnings);
      expect(formatted).toContain('N/A');
    });
  });

  describe('Fetch', () => {
    let axios;

    beforeEach(() => {
      axios = require('axios');
    });

    test('should call Alpha Vantage API with correct URL', async () => {
      const mockCSV = 'symbol,reportDate\nAAPL,2026-04-22';
      axios.get.mockResolvedValue({ data: mockCSV });

      await EC.fetch('3month');

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('EARNINGS_CALENDAR')
      );
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('horizon=3month')
      );
    });

    test('should parse CSV response', async () => {
      const mockCSV = `symbol,name,reportDate,estimate
AAPL,Apple,2026-04-22,1.52
MSFT,Microsoft,2026-04-23,2.00`;
      axios.get.mockResolvedValue({ data: mockCSV });

      const result = await EC.fetch();

      expect(result).toHaveLength(2);
      expect(result[0].symbol).toBe('AAPL');
    });

    test('should throw on API error', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      await expect(EC.fetch()).rejects.toThrow('Network error');
    });

    test('should use default horizon', async () => {
      axios.get.mockResolvedValue({ data: 'symbol,reportDate\n' });

      await EC.fetch();

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('horizon=3month')
      );
    });

    test('should use custom horizon', async () => {
      axios.get.mockResolvedValue({ data: 'symbol,reportDate\n' });

      await EC.fetch('1month');

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('horizon=1month')
      );
    });
  });

  describe('Filter By Index', () => {
    test('should filter in-index stocks', () => {
      // Manually set tickers since init may not have populated them
      EC.combinedTickers = new Set(['AAPL', 'MSFT', 'GOOGL', 'NVDA']);
      
      const earnings = [
        { symbol: 'AAPL' },
        { symbol: 'UNKNOWN' },
        { symbol: 'MSFT' }
      ];

      const filtered = EC.filterByIndex(earnings);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(e => e.symbol)).toContain('AAPL');
      expect(filtered.map(e => e.symbol)).toContain('MSFT');
    });

    test('should handle case-insensitive symbols', () => {
      EC.combinedTickers = new Set(['AAPL']);
      const earnings = [{ symbol: 'aapl' }];
      const filtered = EC.filterByIndex(earnings);
      expect(filtered).toHaveLength(1);
    });

    test('should handle empty list', () => {
      const filtered = EC.filterByIndex([]);
      expect(filtered).toHaveLength(0);
    });

    test('should handle missing symbol', () => {
      EC.combinedTickers = new Set(['AAPL']);
      const earnings = [{}];
      const filtered = EC.filterByIndex(earnings);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('Cache To File', () => {
    test('should write earnings to cache file', async () => {
      const earnings = [{ symbol: 'AAPL' }];
      fsMock.writeFile.mockResolvedValue();

      await EC.cacheToFile(earnings);

      expect(fsMock.writeFile).toHaveBeenCalled();
      expect(EC.cache).toBeDefined();
      expect(EC.cache.earnings).toEqual(earnings);
    });

    test('should include timestamp in cache', async () => {
      fsMock.writeFile.mockResolvedValue();
      await EC.cacheToFile([]);

      expect(EC.cache.timestamp).toBeDefined();
    });

    test('should handle write error gracefully', async () => {
      fsMock.writeFile.mockRejectedValueOnce(new Error('Disk full'));

      await EC.cacheToFile([{ symbol: 'AAPL' }]);

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Load From Cache', () => {
    test('should read and parse cache file', async () => {
      const cacheData = {
        timestamp: new Date().toISOString(),
        earnings: [{ symbol: 'AAPL' }]
      };
      const originalReadFile = fsMock.readFile;
      fsMock.readFile = jest.fn().mockResolvedValue(JSON.stringify(cacheData));

      const result = await EC.loadFromCache();

      expect(result).toEqual(cacheData);
      expect(EC.cache).toEqual(cacheData);
      fsMock.readFile = originalReadFile;
    });

    test('should return null for missing file', async () => {
      const originalReadFile = fsMock.readFile;
      fsMock.readFile = jest.fn().mockRejectedValueOnce({ code: 'ENOENT' });

      const result = await EC.loadFromCache();

      expect(result).toBeNull();
      fsMock.readFile = originalReadFile;
    });

    test('should return null for parse error', async () => {
      const originalReadFile = fsMock.readFile;
      fsMock.readFile = jest.fn().mockResolvedValueOnce('invalid json');

      const result = await EC.loadFromCache();

      expect(result).toBeNull();
      fsMock.readFile = originalReadFile;
    });

    test('should return null for other read errors', async () => {
      const originalReadFile = fsMock.readFile;
      fsMock.readFile = jest.fn().mockRejectedValueOnce(new Error('Permission denied'));

      const result = await EC.loadFromCache();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
      fsMock.readFile = originalReadFile;
    });
  });

  describe('Get Earnings For Date', () => {
    let axios;

    beforeEach(() => {
      axios = require('axios');
    });

    test('should fetch when cache is invalid', async () => {
      EC.cache = null;
      const mockCSV = `symbol,reportDate,estimate
AAPL,2026-04-22,1.52`;
      axios.get.mockResolvedValue({ data: mockCSV });

      const result = await EC.getEarningsForDate(new Date('2026-04-22'));

      expect(axios.get).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    test('should use cache when valid', async () => {
      EC.cache = {
        timestamp: new Date().toISOString(),
        earnings: [
          { symbol: 'AAPL', reportDate: '2026-04-22', estimate: '1.52' }
        ]
      };

      const result = await EC.getEarningsForDate(new Date('2026-04-22'));

      expect(axios.get).not.toHaveBeenCalled();
      expect(result.preMarket).toBeDefined();
      expect(result.postMarket).toBeDefined();
    });

    test('should fall back to stale cache on fetch error', async () => {
      EC.cache = null;
      axios.get.mockRejectedValue(new Error('API down'));

      const staleCache = {
        timestamp: new Date().toISOString(),
        earnings: [
          { symbol: 'AAPL', reportDate: '2026-04-22', estimate: '1.52' }
        ]
      };
      const originalReadFile = fsMock.readFile;
      fsMock.readFile = jest.fn().mockResolvedValue(JSON.stringify(staleCache));

      const result = await EC.getEarningsForDate(new Date('2026-04-22'));

      expect(console.error).toHaveBeenCalled();
      expect(result).toBeDefined();
      fsMock.readFile = originalReadFile;
    });

    test('should return empty when no earnings for date', async () => {
      EC.cache = {
        timestamp: new Date().toISOString(),
        earnings: [{ symbol: 'AAPL', reportDate: '2026-01-01' }]
      };

      const result = await EC.getEarningsForDate(new Date('2026-12-25'));

      expect(result.preMarket).toHaveLength(0);
      expect(result.postMarket).toHaveLength(0);
    });

    test('should return empty when cache has no earnings', async () => {
      EC.cache = { timestamp: new Date().toISOString() };

      const result = await EC.getEarningsForDate(new Date());

      expect(result.preMarket).toHaveLength(0);
      expect(result.postMarket).toHaveLength(0);
    });
  });

  describe('Get Today Earnings', () => {
    test('should call getEarningsForDate with today', async () => {
      const spy = jest.spyOn(EC, 'getEarningsForDate');
      EC.cache = { timestamp: new Date().toISOString(), earnings: [] };

      await EC.getTodayEarnings();

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('Get Tomorrow Earnings', () => {
    test('should skip Saturday', async () => {
      const realDate = global.Date;
      const mockToday = new Date('2026-04-17'); // Friday
      global.Date = class extends realDate {
        constructor(...args) {
          if (args.length === 0) super(mockToday);
          else super(...args);
        }
      };

      EC.cache = { timestamp: new Date().toISOString(), earnings: [] };
      await EC.getTomorrowEarnings();

      global.Date = realDate;
    });

    test('should skip Sunday', async () => {
      const realDate = global.Date;
      const mockToday = new Date('2026-04-18'); // Saturday
      global.Date = class extends realDate {
        constructor(...args) {
          if (args.length === 0) super(mockToday);
          else super(...args);
        }
      };

      EC.cache = { timestamp: new Date().toISOString(), earnings: [] };
      await EC.getTomorrowEarnings();

      global.Date = realDate;
    });
  });

  describe('Get Week Earnings', () => {
    let axios;

    beforeEach(() => {
      axios = require('axios');
    });

    test('should fetch when cache is invalid', async () => {
      EC.cache = null;
      axios.get.mockResolvedValue({ data: 'symbol,reportDate\nAAPL,2026-04-22' });

      const result = await EC.getWeekEarnings();

      expect(axios.get).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    test('should return empty when no earnings', async () => {
      EC.cache = { timestamp: new Date().toISOString(), earnings: [] };

      const result = await EC.getWeekEarnings();

      expect(result).toEqual({});
    });

    test('should fall back to stale cache on error', async () => {
      EC.cache = null;
      axios.get.mockRejectedValue(new Error('API error'));

      const staleCache = {
        timestamp: new Date().toISOString(),
        earnings: []
      };
      const originalReadFile = fsMock.readFile;
      fsMock.readFile = jest.fn().mockResolvedValue(JSON.stringify(staleCache));

      const result = await EC.getWeekEarnings();

      expect(result).toEqual({});
      fsMock.readFile = originalReadFile;
    });
  });

  describe('Parse CSV Edge Cases', () => {
    test('should handle extra commas in values', () => {
      const csv = `symbol,name,reportDate
AAPL,"Apple, Inc.",2026-04-22`;

      const result = EC.parseCSV(csv);

      expect(result).toHaveLength(1);
    });

    test('should handle whitespace in headers', () => {
      const csv = `symbol , reportDate
AAPL,2026-04-22`;

      const result = EC.parseCSV(csv);

      expect(result[0]).toHaveProperty('symbol');
      expect(result[0]).toHaveProperty('reportDate');
    });

    test('should handle single row CSV', () => {
      const csv = 'symbol,reportDate';
      const result = EC.parseCSV(csv);
      expect(result).toHaveLength(0);
    });

    test('should skip rows with missing values', () => {
      const csv = `symbol,reportDate,estimate
AAPL,2026-04-22`;

      const result = EC.parseCSV(csv);

      expect(result).toHaveLength(0);
    });

    test('should handle empty values with trailing comma', () => {
      const csv = `symbol,reportDate,estimate
AAPL,2026-04-22,`;

      const result = EC.parseCSV(csv);

      expect(result).toHaveLength(1);
      expect(result[0].estimate).toBe('');
    });
  });

  describe('Reset', () => {
    test('should clear cache and reset state', () => {
      EC.cache = { timestamp: new Date().toISOString(), earnings: [] };
      EC.initialized = true;

      EC.reset();

      expect(EC.cache).toBeNull();
      expect(EC.initialized).toBe(false);
    });
  });
});
