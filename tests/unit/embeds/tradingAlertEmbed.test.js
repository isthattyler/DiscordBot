/**
 * Unit Tests for TradingAlertEmbed
 */

jest.mock('../../../src/utils/ConfigLoader', () => ({
  get: jest.fn((key) => {
    if (key === 'bot') return { embed_color: '#5865F2', icon_url: 'https://example.com/icon.png' };
    if (key === 'alerts') return { footer_text: 'Test footer' };
    return null;
  })
}));

const { EmbedBuilder } = require('discord.js');
const TradingAlertEmbed = require('../../../src/embeds/TradingAlertEmbed');

describe('TradingAlertEmbed', () => {
  
  describe('Long Position', () => {
    test('should create green embed for long position', () => {
      const alertData = {
        ticker: 'MNQ',
        position: 'long',
        entry: '12345',
        stoploss: '12300',
        target: '12400'
      };
      
      const embed = TradingAlertEmbed.create(alertData);
      
      expect(embed).toBeDefined();
      expect(embed.data.color).toBe(0x00FF00); // Green
    });
    
    test('should include 📈 emoji for long', () => {
      const alertData = {
        ticker: 'MNQ',
        position: 'long',
        entry: '12345'
      };
      
      const embed = TradingAlertEmbed.create(alertData);
      
      const tickerField = embed.data.fields.find(f => f.name.includes('Ticker'));
      expect(tickerField.name).toContain('📈');
    });
    
    test('should prepend "Long" to ticker', () => {
      const alertData = {
        ticker: 'MNQ',
        position: 'long',
        entry: '12345'
      };
      
      const embed = TradingAlertEmbed.create(alertData);
      
      const tickerField = embed.data.fields.find(f => f.name.includes('Ticker'));
      expect(tickerField.value).toBe('Long MNQ');
    });
  });
  
  describe('Short Position', () => {
    test('should create red embed for short position', () => {
      const alertData = {
        ticker: 'MNQ',
        position: 'short',
        entry: '12345',
        stoploss: '12400',
        target: '12300'
      };
      
      const embed = TradingAlertEmbed.create(alertData);
      
      expect(embed).toBeDefined();
      expect(embed.data.color).toBe(0xFF0000); // Red
    });
    
    test('should include 📉 emoji for short', () => {
      const alertData = {
        ticker: 'MNQ',
        position: 'short',
        entry: '12345'
      };
      
      const embed = TradingAlertEmbed.create(alertData);
      
      const tickerField = embed.data.fields.find(f => f.name.includes('Ticker'));
      expect(tickerField.name).toContain('📉');
    });
    
    test('should prepend "Short" to ticker', () => {
      const alertData = {
        ticker: 'ES',
        position: 'short',
        entry: '4500'
      };
      
      const embed = TradingAlertEmbed.create(alertData);
      
      const tickerField = embed.data.fields.find(f => f.name.includes('Ticker'));
      expect(tickerField.value).toBe('Short ES');
    });
  });
  
  describe('Embed Fields', () => {
    test('should include all fields when provided', () => {
      const alertData = {
        ticker: 'MNQ',
        position: 'long',
        entry: '12345',
        stoploss: '12300',
        target: '12400'
      };
      
      const embed = TradingAlertEmbed.create(alertData);
      
      const fieldNames = embed.data.fields.map(f => f.name);
      
      expect(fieldNames).toContain('📈 Ticker:');
      expect(fieldNames).toContain('💵 Entry:');
      expect(fieldNames).toContain('🚨 Stoploss:');
      expect(fieldNames).toContain('🎯 Target:');
      expect(embed.data.fields).toHaveLength(4);
    });
    
    test('should omit stoploss field when not provided', () => {
      const alertData = {
        ticker: 'MNQ',
        position: 'long',
        entry: '12345',
        stoploss: null,
        target: '12400'
      };
      
      const embed = TradingAlertEmbed.create(alertData);
      
      const fieldNames = embed.data.fields.map(f => f.name);
      expect(fieldNames).not.toContain('🚨 Stoploss:');
      expect(embed.data.fields).toHaveLength(3); // Ticker, Entry, Target
    });
    
    test('should omit target field when not provided', () => {
      const alertData = {
        ticker: 'MNQ',
        position: 'long',
        entry: '12345',
        stoploss: '12300',
        target: null
      };
      
      const embed = TradingAlertEmbed.create(alertData);
      
      const fieldNames = embed.data.fields.map(f => f.name);
      expect(fieldNames).not.toContain('🎯 Target:');
      expect(embed.data.fields).toHaveLength(3); // Ticker, Entry, Stoploss
    });
    
    test('should omit both stoploss and target when not provided', () => {
      const alertData = {
        ticker: 'MNQ',
        position: 'long',
        entry: '12345',
        stoploss: null,
        target: null
      };
      
      const embed = TradingAlertEmbed.create(alertData);
      
      const fieldNames = embed.data.fields.map(f => f.name);
      expect(fieldNames).not.toContain('🚨 Stoploss:');
      expect(fieldNames).not.toContain('🎯 Target:');
      expect(embed.data.fields).toHaveLength(2); // Ticker, Entry only
    });
    
    test('should include stoploss field when provided', () => {
      const alertData = {
        ticker: 'MNQ',
        position: 'long',
        entry: '12345',
        stoploss: '12300'
      };
      
      const embed = TradingAlertEmbed.create(alertData);
      
      const stoplossField = embed.data.fields.find(f => f.name.includes('Stoploss'));
      expect(stoplossField).toBeDefined();
      expect(stoplossField.value).toBe('12300');
    });
    
    test('should include target field when provided', () => {
      const alertData = {
        ticker: 'MNQ',
        position: 'long',
        entry: '12345',
        target: '12400'
      };
      
      const embed = TradingAlertEmbed.create(alertData);
      
      const targetField = embed.data.fields.find(f => f.name.includes('Target'));
      expect(targetField).toBeDefined();
      expect(targetField.value).toBe('12400');
    });
  });
  
  describe('Ticker Display', () => {
    test('should uppercase ticker symbol with direction prefix', () => {
      const alertData = {
        ticker: 'mnq',
        position: 'long',
        entry: '12345'
      };
      
      const embed = TradingAlertEmbed.create(alertData);
      
      const tickerField = embed.data.fields.find(f => f.name.includes('Ticker'));
      expect(tickerField.value).toBe('Long MNQ');
    });
    
    test('should handle short position with lowercase ticker', () => {
      const alertData = {
        ticker: 'es',
        position: 'short',
        entry: '4500'
      };
      
      const embed = TradingAlertEmbed.create(alertData);
      
      const tickerField = embed.data.fields.find(f => f.name.includes('Ticker'));
      expect(tickerField.value).toBe('Short ES');
    });
  });
  
  describe('Footer', () => {
    test('should include footer with timestamp', () => {
      const alertData = {
        ticker: 'MNQ',
        position: 'long',
        entry: '12345'
      };
      
      const embed = TradingAlertEmbed.create(alertData);
      
      expect(embed.data.footer).toBeDefined();
      expect(embed.data.timestamp).toBeDefined();
    });
  });
});
