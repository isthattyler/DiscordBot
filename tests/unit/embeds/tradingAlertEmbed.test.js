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
  });
  
  describe('Embed Fields', () => {
    test('should include all required fields', () => {
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
    });
    
    test('should handle missing stoploss', () => {
      const alertData = {
        ticker: 'MNQ',
        position: 'long',
        entry: '12345',
        stoploss: null,
        target: '12400'
      };
      
      const embed = TradingAlertEmbed.create(alertData);
      
      const stoplossField = embed.data.fields.find(f => f.name.includes('Stoploss'));
      expect(stoplossField.value).toBe('Not set');
    });
    
    test('should omit target field if not provided', () => {
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
    });
  });
  
  describe('Ticker Display', () => {
    test('should uppercase ticker symbol', () => {
      const alertData = {
        ticker: 'mnq',
        position: 'long',
        entry: '12345'
      };
      
      const embed = TradingAlertEmbed.create(alertData);
      
      const tickerField = embed.data.fields.find(f => f.name.includes('Ticker'));
      expect(tickerField.value).toBe('MNQ');
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
