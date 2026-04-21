/**
 * Unit Tests for EarningsCalendar utility
 */

const { mockCSVResponse, mockEarningsData } = require('../mocks/alphaVantageMock');

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn()
}));

// Mock fs
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

const fs = require('fs').promises;
const axios = require('axios');

describe('EarningsCalendar', () => {
  let EarningsCalendar;
  
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    // Mock file reads for index lists
    fs.readFile.mockImplementation((filePath) => {
      if (filePath.includes('sp500.json')) {
        return Promise.resolve(JSON.stringify(['AAPL', 'MSFT', 'GOOGL', 'JPM', 'JNJ']));
      }
      if (filePath.includes('nasdaq100.json')) {
        return Promise.resolve(JSON.stringify(['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA']));
      }
      return Promise.reject(new Error('File not found'));
    });
  });
  
  describe('Initialization', () => {
    test('should load index lists on construction', async () => {
      EarningsCalendar = require('../../src/utils/EarningsCalendar');
      
      // Wait for async loading
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(EarningsCalendar.sp500Tickers).toBeDefined();
      expect(EarningsCalendar.nasdaq100Tickers).toBeDefined();
      expect(EarningsCalendar.combinedTickers).toBeDefined();
    });
  });
  
  describe('CSV Parsing', () => {
    test('should parse CSV response correctly', async () => {
      EarningsCalendar = require('../../src/utils/EarningsCalendar');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = EarningsCalendar.parseCSV(mockCSVResponse);
      
      expect(result).toHaveLength(23);
      expect(result[0]).toHaveProperty('symbol', 'AAPL');
      expect(result[0]).toHaveProperty('reportDate', '2026-04-22');
      expect(result[0]).toHaveProperty('estimate', '1.52');
    });
    
    test('should handle empty CSV', () => {
      EarningsCalendar = require('../../src/utils/EarningsCalendar');
      
      const result = EarningsCalendar.parseCSV('');
      
      expect(result).toHaveLength(0);
    });
  });
  
  describe('Filtering by Index', () => {
    test('should filter to only S&P 500 and Nasdaq 100 tickers', async () => {
      EarningsCalendar = require('../../src/utils/EarningsCalendar');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const filtered = EarningsCalendar.filterByIndex(mockEarningsData);
      
      // Should exclude XYZ, ABC, DEF (non-index tickers)
      expect(filtered.length).toBeLessThan(mockEarningsData.length);
      expect(filtered.some(e => e.symbol === 'XYZ')).toBe(false);
      expect(filtered.some(e => e.symbol === 'ABC')).toBe(false);
      expect(filtered.some(e => e.symbol === 'DEF')).toBe(false);
      
      // Should include major tickers
      expect(filtered.some(e => e.symbol === 'AAPL')).toBe(true);
      expect(filtered.some(e => e.symbol === 'MSFT')).toBe(true);
    });
    
    test('should handle case-insensitive ticker matching', async () => {
      EarningsCalendar = require('../../src/utils/EarningsCalendar');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const testData = [
        { symbol: 'aapl', reportDate: '2026-04-22' },
        { symbol: 'Msft', reportDate: '2026-04-23' }
      ];
      
      const filtered = EarningsCalendar.filterByIndex(testData);
      
      expect(filtered).toHaveLength(2);
    });
  });
  
  describe('Grouping by Date', () => {
    test('should group earnings by report date', async () => {
      EarningsCalendar = require('../../src/utils/EarningsCalendar');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const grouped = EarningsCalendar.groupByDate(mockEarningsData);
      
      expect(grouped['2026-04-22']).toBeDefined();
      expect(grouped['2026-04-23']).toBeDefined();
      expect(grouped['2026-04-24']).toBeDefined();
      expect(grouped['2026-04-22'].length).toBeGreaterThan(0);
    });
  });
  
  describe('Split by Market Time', () => {
    test('should split earnings into pre-market and post-market', async () => {
      EarningsCalendar = require('../../src/utils/EarningsCalendar');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { preMarket, postMarket } = EarningsCalendar.splitByMarketTime(mockEarningsData);
      
      // NVDA, NFLX, JPM, etc. are pre-market
      expect(preMarket.some(e => e.symbol === 'NVDA')).toBe(true);
      expect(preMarket.some(e => e.symbol === 'JPM')).toBe(true);
      
      // AAPL, MSFT, etc. are post-market
      expect(postMarket.some(e => e.symbol === 'AAPL')).toBe(true);
      expect(postMarket.some(e => e.symbol === 'MSFT')).toBe(true);
    });
    
    test('should default to post-market when time not specified', async () => {
      EarningsCalendar = require('../../src/utils/EarningsCalendar');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const testData = [
        { symbol: 'AAPL', timeOfTheDay: 'post-market' },
        { symbol: 'MSFT', timeOfTheDay: '' }
      ];
      
      const { preMarket, postMarket } = EarningsCalendar.splitByMarketTime(testData);
      
      expect(preMarket).toHaveLength(0);
      expect(postMarket).toHaveLength(2);
    });
  });
  
  describe('Cache Management', () => {
    test('should cache earnings to file', async () => {
      EarningsCalendar = require('../../src/utils/EarningsCalendar');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      fs.writeFile.mockResolvedValue();
      
      await EarningsCalendar.cacheToFile(mockEarningsData);
      
      expect(fs.writeFile).toHaveBeenCalled();
      expect(EarningsCalendar.cache).toBeDefined();
      expect(EarningsCalendar.cache.earnings).toEqual(mockEarningsData);
    });
    
    test('should load earnings from cache', async () => {
      EarningsCalendar = require('../../src/utils/EarningsCalendar');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const cacheData = {
        timestamp: new Date().toISOString(),
        earnings: mockEarningsData
      };
      
      fs.readFile.mockResolvedValueOnce(JSON.stringify(cacheData));
      
      const result = await EarningsCalendar.loadFromCache();
      
      expect(result).toEqual(cacheData);
    });
    
    test('should handle missing cache file', async () => {
      EarningsCalendar = require('../../src/utils/EarningsCalendar');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      fs.readFile.mockRejectedValueOnce({ code: 'ENOENT' });
      
      const result = await EarningsCalendar.loadFromCache();
      
      expect(result).toBeNull();
    });
  });
  
  describe('Cache Validation', () => {
    test('should return false for invalid cache', async () => {
      EarningsCalendar = require('../../src/utils/EarningsCalendar');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      EarningsCalendar.cache = null;
      
      expect(EarningsCalendar.isCacheValid()).toBe(false);
    });
    
    test('should return true for fresh cache', async () => {
      EarningsCalendar = require('../../src/utils/EarningsCalendar');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      EarningsCalendar.cache = {
        timestamp: new Date().toISOString()
      };
      
      expect(EarningsCalendar.isCacheValid(24)).toBe(true);
    });
    
    test('should return false for stale cache', async () => {
      EarningsCalendar = require('../../src/utils/EarningsCalendar');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 2);
      
      EarningsCalendar.cache = {
        timestamp: oldDate.toISOString()
      };
      
      expect(EarningsCalendar.isCacheValid(24)).toBe(false);
    });
  });
  
  describe('API Fetch', () => {
    test('should fetch from Alpha Vantage API', async () => {
      EarningsCalendar = require('../../src/utils/EarningsCalendar');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      axios.get.mockResolvedValueOnce({ data: mockCSVResponse });
      
      const result = await EarningsCalendar.fetch('3month');
      
      expect(axios.get).toHaveBeenCalled();
      expect(result).toHaveLength(23);
    });
    
    test('should handle API errors', async () => {
      EarningsCalendar = require('../../src/utils/EarningsCalendar');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      axios.get.mockRejectedValueOnce(new Error('API Error'));
      
      await expect(EarningsCalendar.fetch('3month')).rejects.toThrow('API Error');
    });
  });
});
