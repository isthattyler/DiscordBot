/**
 * Unit Tests for ChannelManager - Core Functionality
 * Note: Singleton pattern limits some test scenarios
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

describe('ChannelManager', () => {
  let CM;
  
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    delete require.cache[require.resolve('../../../src/utils/ChannelManager')];
    
    fs.readFile.mockRejectedValue({ code: 'ENOENT' });
    fs.writeFile.mockResolvedValue();
    
    CM = require('../../../src/utils/ChannelManager');
    await CM.init();
  });
  
  describe('Initialization', () => {
    test('should initialize', async () => {
      expect(CM.initialized).toBe(true);
    });
  });
  
  describe('Add Channel', () => {
    test('should add channel and return true', async () => {
      const result = await CM.addChannel('guild-123', 'channel-456');
      expect(result).toBe(true);
      expect(CM.getChannels('guild-123')).toContain('channel-456');
    });
    
    test('should not add duplicate', async () => {
      await CM.addChannel('guild-123', 'channel-456');
      const result = await CM.addChannel('guild-123', 'channel-456');
      expect(result).toBe(false);
    });
  });
  
  describe('Remove Channel', () => {
    test('should remove channel', async () => {
      await CM.addChannel('guild-123', 'channel-456');
      const result = await CM.removeChannel('guild-123', 'channel-456');
      expect(result).toBe(true);
    });
  });
  
  describe('Earnings Channel', () => {
    test('should set earnings channel', async () => {
      await CM.setEarningsChannel('guild-123', 'earnings-channel');
      expect(CM.getEarningsChannel('guild-123')).toBe('earnings-channel');
    });
    
    test('should remove earnings channel', async () => {
      await CM.setEarningsChannel('guild-123', 'earnings-channel');
      const result = await CM.removeEarningsChannel('guild-123');
      expect(result).toBe(true);
    });
  });
  
  describe('Mention Roles', () => {
    test('should set alert mention role', async () => {
      await CM.setMentionRole('guild-123', 'role-123');
      expect(CM.getMentionRole('guild-123')).toBe('role-123');
    });
    
    test('should set earnings mention role', async () => {
      await CM.setEarningsMentionRole('guild-123', 'role-456');
      expect(CM.getEarningsMentionRole('guild-123')).toBe('role-456');
    });
  });
  
  describe('Get All Configurations', () => {
    test('should return configurations', async () => {
      await CM.addChannel('guild-123', 'channel-1');
      const configs = CM.getAllConfigurations();
      expect(configs.length).toBeGreaterThan(0);
    });
  });
});
