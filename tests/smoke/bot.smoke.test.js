/**
 * Smoke Tests - Verify bot modules can load without errors
 */

describe('Bot Module Loading', () => {
  
  describe('ConfigLoader', () => {
    test('should load config.yml without errors', () => {
      expect(() => {
        require('../../src/utils/ConfigLoader');
      }).not.toThrow();
    });
  });
  
  describe('Embed Builders', () => {
    test('TradingAlertEmbed should load', () => {
      expect(() => {
        require('../../src/embeds/TradingAlertEmbed');
      }).not.toThrow();
    });
    
    test('EarningsCalendarEmbed should load', () => {
      expect(() => {
        require('../../src/embeds/EarningsCalendarEmbed');
      }).not.toThrow();
    });
    
    test('CommentEmbed should load', () => {
      expect(() => {
        require('../../src/embeds/CommentEmbed');
      }).not.toThrow();
    });
  });
  
  describe('Command Classes', () => {
    test('LongCommand should load', () => {
      expect(() => {
        require('../../src/commands/LongCommand');
      }).not.toThrow();
    });
    
    test('ShortCommand should load', () => {
      expect(() => {
        require('../../src/commands/ShortCommand');
      }).not.toThrow();
    });
    
    test('EarningsCommand should load', () => {
      expect(() => {
        require('../../src/commands/EarningsCommand');
      }).not.toThrow();
    });
  });
});
