/**
 * Unit Tests for EarningsCalendarEmbed
 */

jest.mock('../../../src/utils/ConfigLoader', () => ({
  get: jest.fn((key) => {
    if (key === 'bot') return { embed_color: '#5865F2', icon_url: 'https://example.com/icon.png' };
    if (key === 'alerts') return { footer_text: 'Test footer' };
    return null;
  })
}));

const EarningsCalendarEmbed = require('../../../src/embeds/EarningsCalendarEmbed');

describe('EarningsCalendarEmbed', () => {
  
  describe('Day Embed Creation', () => {
    test('should create embed with pre-market and post-market earnings', () => {
      const earningsData = {
        preMarket: [
          { symbol: 'NVDA', estimate: '5.25' },
          { symbol: 'NFLX', estimate: '4.25' }
        ],
        postMarket: [
          { symbol: 'AAPL', estimate: '1.52' },
          { symbol: 'MSFT', estimate: '2.85' }
        ]
      };
      
      const date = new Date('2026-04-22');
      const embed = EarningsCalendarEmbed.create(earningsData, date, 'day');
      
      expect(embed).toBeDefined();
      expect(embed.data.title).toContain('Earnings Calendar');
      expect(embed.data.fields).toHaveLength(2);
      expect(embed.data.fields[0].name).toContain('Pre-Market');
      expect(embed.data.fields[1].name).toContain('Post-Market');
    });
    
    test('should create embed with only pre-market earnings', () => {
      const earningsData = {
        preMarket: [
          { symbol: 'NVDA', estimate: '5.25' }
        ],
        postMarket: []
      };
      
      const date = new Date('2026-04-22');
      const embed = EarningsCalendarEmbed.create(earningsData, date, 'day');
      
      expect(embed).toBeDefined();
      expect(embed.data.fields).toHaveLength(1);
      expect(embed.data.fields[0].name).toContain('Pre-Market');
    });
    
    test('should create embed with only post-market earnings', () => {
      const earningsData = {
        preMarket: [],
        postMarket: [
          { symbol: 'AAPL', estimate: '1.52' }
        ]
      };
      
      const date = new Date('2026-04-22');
      const embed = EarningsCalendarEmbed.create(earningsData, date, 'day');
      
      expect(embed).toBeDefined();
      expect(embed.data.fields).toHaveLength(1);
      expect(embed.data.fields[0].name).toContain('Post-Market');
    });
    
    test('should return null when no earnings', () => {
      const earningsData = {
        preMarket: [],
        postMarket: []
      };
      
      const date = new Date('2026-04-22');
      const embed = EarningsCalendarEmbed.create(earningsData, date, 'day');
      
      expect(embed).toBeNull();
    });
    
    test('should format earnings with estimates', () => {
      const earningsData = {
        preMarket: [
          { symbol: 'NVDA', estimate: '5.25' },
          { symbol: 'NFLX', estimate: '4.25' }
        ],
        postMarket: []
      };
      
      const date = new Date('2026-04-22');
      const embed = EarningsCalendarEmbed.create(earningsData, date, 'day');
      
      const preMarketValue = embed.data.fields[0].value;
      expect(preMarketValue).toContain('NVDA');
      expect(preMarketValue).toContain('$5.25');
      expect(preMarketValue).toContain('NFLX');
      expect(preMarketValue).toContain('$4.25');
    });
    
    test('should handle missing estimates', () => {
      const earningsData = {
        preMarket: [
          { symbol: 'XYZ', estimate: '' }
        ],
        postMarket: []
      };
      
      const date = new Date('2026-04-22');
      const embed = EarningsCalendarEmbed.create(earningsData, date, 'day');
      
      const preMarketValue = embed.data.fields[0].value;
      expect(preMarketValue).toContain('N/A');
    });
  });
  
  describe('Week Embed Creation', () => {
    test('should create week embed with multiple days', () => {
      const weekData = {
        '2026-04-22': [
          { symbol: 'AAPL', estimate: '1.52', timeOfTheDay: 'post-market' }
        ],
        '2026-04-23': [
          { symbol: 'MSFT', estimate: '2.85', timeOfTheDay: 'post-market' }
        ],
        '2026-04-24': [
          { symbol: 'GOOGL', estimate: '1.35', timeOfTheDay: 'post-market' }
        ]
      };
      
      const botConfig = { embed_color: '#5865F2', icon_url: 'https://example.com/icon.png' };
      const embed = EarningsCalendarEmbed.buildWeekEmbed(weekData, botConfig);
      
      expect(embed).toBeDefined();
      expect(embed.data.title).toContain('Weekly Earnings Calendar');
      expect(embed.data.fields.length).toBeGreaterThan(0);
    });
    
    test('should return null for empty week data', () => {
      const weekData = {};
      const botConfig = { embed_color: '#5865F2' };
      
      const embed = EarningsCalendarEmbed.buildWeekEmbed(weekData, botConfig);
      
      expect(embed).toBeNull();
    });
    
    test('should split pre-market and post-market in week view', () => {
      const weekData = {
        '2026-04-22': [
          { symbol: 'NVDA', estimate: '5.25', timeOfTheDay: 'pre-market' },
          { symbol: 'AAPL', estimate: '1.52', timeOfTheDay: 'post-market' }
        ]
      };
      
      const botConfig = { embed_color: '#5865F2' };
      const embed = EarningsCalendarEmbed.buildWeekEmbed(weekData, botConfig);
      
      expect(embed).toBeDefined();
      const fieldValue = embed.data.fields[0].value;
      expect(fieldValue).toContain('Pre-Market');
      expect(fieldValue).toContain('Post-Market');
    });
    
    test('should include total company count in footer', () => {
      const weekData = {
        '2026-04-22': [
          { symbol: 'AAPL', estimate: '1.52', timeOfTheDay: 'post-market' },
          { symbol: 'MSFT', estimate: '2.85', timeOfTheDay: 'post-market' }
        ]
      };
      
      const botConfig = { embed_color: '#5865F2' };
      const embed = EarningsCalendarEmbed.buildWeekEmbed(weekData, botConfig);
      
      expect(embed.data.footer.text).toContain('2');
    });
  });
  
  describe('Embed Formatting', () => {
    test('should include timestamp', () => {
      const earningsData = {
        preMarket: [{ symbol: 'AAPL', estimate: '1.52' }],
        postMarket: []
      };
      
      const date = new Date('2026-04-22');
      const embed = EarningsCalendarEmbed.create(earningsData, date, 'day');
      
      expect(embed.data.timestamp).toBeDefined();
    });
    
    test('should include footer', () => {
      const earningsData = {
        preMarket: [{ symbol: 'AAPL', estimate: '1.52' }],
        postMarket: []
      };
      
      const date = new Date('2026-04-22');
      const embed = EarningsCalendarEmbed.create(earningsData, date, 'day');
      
      expect(embed.data.footer).toBeDefined();
      expect(embed.data.footer.text).toBeDefined();
    });
    
    test('should use configured embed color', () => {
      const earningsData = {
        preMarket: [{ symbol: 'AAPL', estimate: '1.52' }],
        postMarket: []
      };
      
      const date = new Date('2026-04-22');
      const embed = EarningsCalendarEmbed.create(earningsData, date, 'day');
      
      expect(embed.data.color).toBe(0x5865F2);
    });
  });
  
  describe('Market Time Split', () => {
    test('should correctly split pre-market and post-market', () => {
      const earnings = [
        { symbol: 'NVDA', timeOfTheDay: 'pre-market' },
        { symbol: 'AAPL', timeOfTheDay: 'post-market' },
        { symbol: 'MSFT', timeOfTheDay: 'Post-Market' },
        { symbol: 'NFLX', timeOfTheDay: 'Pre-Market' }
      ];
      
      const { preMarket, postMarket } = EarningsCalendarEmbed.splitByMarketTime(earnings);
      
      expect(preMarket).toHaveLength(2);
      expect(postMarket).toHaveLength(2);
      expect(preMarket.some(e => e.symbol === 'NVDA')).toBe(true);
      expect(preMarket.some(e => e.symbol === 'NFLX')).toBe(true);
      expect(postMarket.some(e => e.symbol === 'AAPL')).toBe(true);
      expect(postMarket.some(e => e.symbol === 'MSFT')).toBe(true);
    });
    
    test('should default to post-market when time not specified', () => {
      const earnings = [
        { symbol: 'AAPL', timeOfTheDay: '' },
        { symbol: 'MSFT' }
      ];
      
      const { preMarket, postMarket } = EarningsCalendarEmbed.splitByMarketTime(earnings);
      
      expect(preMarket).toHaveLength(0);
      expect(postMarket).toHaveLength(2);
    });
  });

  describe('Image Embed Creation', () => {
    test('should create daily image embed with attachment', () => {
      const imageBuffer = Buffer.from('fake-image');
      const date = new Date('2026-04-22');
      
      const { embed, attachment } = EarningsCalendarEmbed.createDailyImageEmbed(imageBuffer, date);
      
      expect(embed).toBeDefined();
      expect(embed.data.title).toContain('Earnings Calendar');
      expect(embed.data.image).toBeDefined();
      expect(embed.data.image.url).toBe('attachment://earnings.png');
      expect(attachment).toBeDefined();
      expect(attachment.name).toBe('earnings.png');
    });
    
    test('should create weekly image embed with attachment', () => {
      const imageBuffer = Buffer.from('fake-image');
      const weekStart = new Date('2026-04-20');
      const weekEnd = new Date('2026-04-24');
      
      const { embed, attachment } = EarningsCalendarEmbed.createWeeklyImageEmbed(imageBuffer, weekStart, weekEnd);
      
      expect(embed).toBeDefined();
      expect(embed.data.title).toContain('Weekly Earnings Calendar');
      expect(embed.data.image).toBeDefined();
      expect(embed.data.image.url).toBe('attachment://earnings_weekly.png');
      expect(attachment).toBeDefined();
      expect(attachment.name).toBe('earnings_weekly.png');
    });
  });
});
