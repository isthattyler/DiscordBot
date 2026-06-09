/**
 * Unit Tests for LogoManager
 */

const fs = require('fs').promises;
const path = require('path');

jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn()
  }
}));

jest.mock('https', () => ({
  get: jest.fn()
}));

const LogoManager = require('../../../src/utils/LogoManager');

describe('LogoManager', () => {
  beforeEach(async () => {
    jest.resetAllMocks();
    LogoManager.reset();
    await LogoManager.init();
  });

  describe('init()', () => {
    test('should create cache directory if it does not exist', async () => {
      fs.access.mockRejectedValue(new Error('ENOENT'));
      fs.mkdir.mockResolvedValue();

      LogoManager.reset();
      await LogoManager.init();

      expect(fs.mkdir).toHaveBeenCalled();
    });

    test('should not create directory if it already exists', async () => {
      fs.access.mockResolvedValue();
      fs.mkdir.mockResolvedValue();

      LogoManager.reset();
      await LogoManager.init();

      expect(fs.mkdir).not.toHaveBeenCalled();
    });
  });

  describe('getLogo()', () => {
    test('should return cached logo if available', async () => {
      const mockBuffer = Buffer.from('fake-logo');
      fs.access.mockResolvedValue();
      fs.readFile.mockResolvedValue(mockBuffer);

      const result = await LogoManager.getLogo('AAPL');

      expect(result).toEqual({ buffer: mockBuffer, source: 'cache' });
    });

    test('should fetch logo if not cached', async () => {
      fs.access.mockRejectedValue(new Error('ENOENT'));
      const largeBuffer = Buffer.from('a'.repeat(150));
      const mockRes = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'data') callback(largeBuffer);
          if (event === 'end') callback();
        })
      };
      const https = require('https');
      https.get.mockImplementation((url, cb) => {
        cb(mockRes);
        return { on: jest.fn() };
      });
      fs.writeFile.mockResolvedValue();

      const result = await LogoManager.getLogo('TSLA');

      expect(result.source).toBe('fetched');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    test('should return null on fetch failure', async () => {
      fs.access.mockRejectedValue(new Error('ENOENT'));
      const https = require('https');
      https.get.mockImplementation((url, cb) => {
        const mockRes = {
          statusCode: 404,
          on: jest.fn()
        };
        cb(mockRes);
        return { on: jest.fn() };
      });

      const result = await LogoManager.getLogo('UNKNOWN');

      expect(result).toBeNull();
    });
  });

  describe('getTickerColor()', () => {
    test('should return a hex color string', () => {
      const color = LogoManager.getTickerColor('AAPL');
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    test('should return consistent colors for same ticker', () => {
      const color1 = LogoManager.getTickerColor('NVDA');
      const color2 = LogoManager.getTickerColor('NVDA');
      expect(color1).toBe(color2);
    });

    test('should return different colors for different tickers', () => {
      const color1 = LogoManager.getTickerColor('AAPL');
      const color2 = LogoManager.getTickerColor('MSFT');
      expect(color1).not.toBe(color2);
    });
  });

  describe('reset()', () => {
    test('should reset initialized state', () => {
      LogoManager.reset();
      expect(LogoManager.initialized).toBe(false);
    });
  });
});
