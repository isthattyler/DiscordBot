/**
 * Smoke Tests - Verify bot can start and basic features work
 * These tests check that the bot initializes correctly without errors
 */

describe('Bot Smoke Tests', () => {
  
  describe('ConfigLoader', () => {
    let ConfigLoader;
    
    beforeAll(() => {
      // Clear module cache to get fresh instance
      jest.resetModules();
    });
    
    test('should load config.yml without errors', () => {
      expect(() => {
        ConfigLoader = require('../../src/utils/ConfigLoader');
      }).not.toThrow();
    });
    
    test('should have required config keys', () => {
      expect(ConfigLoader.get('bot')).toBeDefined();
      expect(ConfigLoader.get('alerts')).toBeDefined();
    });
    
    test('should return env variables', () => {
      // DISCORD_TOKEN should be undefined in test environment
      expect(ConfigLoader.getToken()).toBeUndefined();
    });
  });
  
  describe('CommandHandler', () => {
    let CommandHandler;
    
    beforeAll(() => {
      jest.resetModules();
    });
    
    test('should initialize without errors', () => {
      expect(() => {
        CommandHandler = new (require('../../src/handlers/CommandHandler'))();
      }).not.toThrow();
    });
    
    test('should register all expected commands', () => {
      CommandHandler = new (require('../../src/handlers/CommandHandler'))();
      
      expect(CommandHandler.commands.has('long')).toBe(true);
      expect(CommandHandler.commands.has('short')).toBe(true);
      expect(CommandHandler.commands.has('setup')).toBe(true);
      expect(CommandHandler.commands.has('comment')).toBe(true);
      expect(CommandHandler.commands.has('auth')).toBe(true);
      expect(CommandHandler.commands.has('access')).toBe(true);
      expect(CommandHandler.commands.has('earnings')).toBe(true);
    });
    
    test('should have command data for Discord API', () => {
      CommandHandler = new (require('../../src/handlers/CommandHandler'))();
      
      expect(CommandHandler.commandData).toHaveLength(7);
      expect(CommandHandler.commandData[0].name).toBe('long');
    });
  });
  
  describe('ChannelManager', () => {
    let ChannelManager;
    
    beforeAll(() => {
      jest.resetModules();
    });
    
    test('should initialize without errors', () => {
      expect(() => {
        ChannelManager = require('../../src/utils/ChannelManager');
      }).not.toThrow();
    });
    
    test('should have required methods', () => {
      ChannelManager = require('../../src/utils/ChannelManager');
      
      expect(typeof ChannelManager.addChannel).toBe('function');
      expect(typeof ChannelManager.removeChannel).toBe('function');
      expect(typeof ChannelManager.setEarningsChannel).toBe('function');
      expect(typeof ChannelManager.getEarningsChannel).toBe('function');
      expect(typeof ChannelManager.getAllConfigurations).toBe('function');
    });
  });
  
  describe('AuthManager', () => {
    let AuthManager;
    
    beforeAll(() => {
      jest.resetModules();
    });
    
    test('should initialize without errors', () => {
      expect(() => {
        AuthManager = require('../../src/utils/AuthManager');
      }).not.toThrow();
    });
    
    test('should have required methods', () => {
      AuthManager = require('../../src/utils/AuthManager');
      
      expect(typeof AuthManager.isAuthorized).toBe('function');
      expect(typeof AuthManager.addUser).toBe('function');
      expect(typeof AuthManager.removeUser).toBe('function');
      expect(typeof AuthManager.isOwner).toBe('function');
    });
  });
  
  describe('Embed Builders', () => {
    test('TradingAlertEmbed should initialize', () => {
      expect(() => {
        require('../../src/embeds/TradingAlertEmbed');
      }).not.toThrow();
    });
    
    test('EarningsCalendarEmbed should initialize', () => {
      expect(() => {
        require('../../src/embeds/EarningsCalendarEmbed');
      }).not.toThrow();
    });
    
    test('CommentEmbed should initialize', () => {
      expect(() => {
        require('../../src/embeds/CommentEmbed');
      }).not.toThrow();
    });
  });
});
