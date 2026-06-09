/**
 * Unit Tests for EarningsImageGenerator
 */

jest.mock('../../../src/utils/LogoManager', () => ({
  init: jest.fn(),
  getLogo: jest.fn(),
  getTickerColor: jest.fn((ticker) => {
    const colors = ['#1DB954', '#E81123', '#0078D4', '#FF8C00', '#8E44AD'];
    let hash = 0;
    for (let i = 0; i < ticker.length; i++) {
      hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  })
}));



const EarningsImageGenerator = require('../../../src/utils/EarningsImageGenerator');

describe('EarningsImageGenerator', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await EarningsImageGenerator.init();
  });

  describe('generateDailyImage()', () => {
    test('should generate buffer for daily earnings with pre and post market', async () => {
      const earningsData = {
        preMarket: [
          { symbol: 'NVDA', estimate: '5.25' },
          { symbol: 'NFLX', estimate: '4.25' },
          { symbol: 'AAPL', estimate: '1.52' }
        ],
        postMarket: [
          { symbol: 'MSFT', estimate: '2.85' },
          { symbol: 'GOOGL', estimate: '1.35' }
        ]
      };
      const date = new Date('2026-04-22');

      const buffer = await EarningsImageGenerator.generateDailyImage(earningsData, date);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString()).toBe('fake-image');
    });

    test('should generate buffer for empty earnings', async () => {
      const earningsData = {
        preMarket: [],
        postMarket: []
      };
      const date = new Date('2026-04-22');

      const buffer = await EarningsImageGenerator.generateDailyImage(earningsData, date);

      expect(buffer).toBeInstanceOf(Buffer);
    });

    test('should handle more than maxLogos with overflow text', async () => {
      const earningsData = {
        preMarket: Array(15).fill(null).map((_, i) => ({ symbol: `TICK${i}`, estimate: '1.00' })),
        postMarket: []
      };
      const date = new Date('2026-04-22');

      const buffer = await EarningsImageGenerator.generateDailyImage(earningsData, date);

      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('generateWeeklyImage()', () => {
    test('should generate buffer for weekly earnings', async () => {
      const weekData = {
        '2026-04-20': [
          { symbol: 'AAPL', estimate: '1.52', timeOfTheDay: 'post-market' }
        ],
        '2026-04-21': [
          { symbol: 'MSFT', estimate: '2.85', timeOfTheDay: 'post-market' },
          { symbol: 'NVDA', estimate: '5.25', timeOfTheDay: 'pre-market' }
        ],
        '2026-04-22': [],
        '2026-04-23': [
          { symbol: 'GOOGL', estimate: '1.35', timeOfTheDay: 'post-market' }
        ],
        '2026-04-24': [
          { symbol: 'AMZN', estimate: '1.10', timeOfTheDay: 'pre-market' }
        ]
      };

      const buffer = await EarningsImageGenerator.generateWeeklyImage(weekData);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString()).toBe('fake-image');
    });

    test('should handle empty week data', async () => {
      const weekData = {
        '2026-04-20': [],
        '2026-04-21': [],
        '2026-04-22': [],
        '2026-04-23': [],
        '2026-04-24': []
      };

      const buffer = await EarningsImageGenerator.generateWeeklyImage(weekData);

      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('calculateSectionHeight()', () => {
    test('should return base height for empty earnings', () => {
      const height = EarningsImageGenerator.calculateSectionHeight([]);
      expect(height).toBe(60);
    });

    test('should increase height for multiple rows', () => {
      const earnings = Array(12).fill({ symbol: 'XYZ' });
      const height = EarningsImageGenerator.calculateSectionHeight(earnings);
      expect(height).toBeGreaterThan(60);
    });
  });

  describe('reset()', () => {
    test('should not throw', () => {
      expect(() => EarningsImageGenerator.reset()).not.toThrow();
    });
  });
});
