/**
 * Unit Tests for EarningsCalendar - Pure Functions
 */

const fs = require('fs').promises;

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
  
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    delete require.cache[require.resolve('../../../src/utils/EarningsCalendar')];
    
    // Mock index lists
    fs.readFile.mockImplementation((filePath) => {
      if (filePath.includes('sp500.json')) {
        return Promise.resolve(JSON.stringify(['AAPL', 'MSFT', 'GOOGL']));
      }
      if (filePath.includes('nasdaq100.json')) {
        return Promise.resolve(JSON.stringify(['AAPL', 'NVDA', 'MSFT']));
      }
      return Promise.reject(new Error('File not found'));
    });
    
    fs.writeFile.mockResolvedValue();
    
    EC = require('../../../src/utils/EarningsCalendar');
    await EC.init();
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
});
