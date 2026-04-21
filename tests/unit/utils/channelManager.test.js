/**
 * Unit Tests for ChannelManager
 */

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
const ChannelManager = require('../../../src/utils/ChannelManager');

describe('ChannelManager', () => {
  
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    // Reset singleton instance
    jest.resetModules();
  });
  
  describe('Alert Channel Management', () => {
    test('should add alert channel', async () => {
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });
      fs.writeFile.mockResolvedValue();
      
      const CM = require('../../../src/utils/ChannelManager');
      
      const result = await CM.addChannel('guild-123', 'channel-456');
      
      expect(result).toBe(true);
      expect(fs.writeFile).toHaveBeenCalled();
    });
    
    test('should not add duplicate alert channel', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify({
        'guild-123': { channels: ['channel-456'], mentionRole: null }
      }));
      fs.writeFile.mockResolvedValue();
      
      const CM = require('../../../src/utils/ChannelManager');
      
      const result = await CM.addChannel('guild-123', 'channel-456');
      
      expect(result).toBe(false);
    });
    
    test('should remove alert channel', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify({
        'guild-123': { channels: ['channel-456'], mentionRole: null }
      }));
      fs.writeFile.mockResolvedValue();
      
      const CM = require('../../../src/utils/ChannelManager');
      
      const result = await CM.removeChannel('guild-123', 'channel-456');
      
      expect(result).toBe(true);
    });
  });
  
  describe('Earnings Channel Management', () => {
    test('should set earnings channel', async () => {
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });
      fs.writeFile.mockResolvedValue();
      
      const CM = require('../../../src/utils/ChannelManager');
      
      await CM.setEarningsChannel('guild-123', 'earnings-channel-789');
      
      expect(fs.writeFile).toHaveBeenCalled();
      expect(CM.getEarningsChannel('guild-123')).toBe('earnings-channel-789');
    });
    
    test('should remove earnings channel', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify({
        'guild-123': { 
          channels: [], 
          mentionRole: null,
          earningsChannel: 'earnings-channel-789',
          earningsMentionRole: null
        }
      }));
      fs.writeFile.mockResolvedValue();
      
      const CM = require('../../../src/utils/ChannelManager');
      
      const result = await CM.removeEarningsChannel('guild-123');
      
      expect(result).toBe(true);
    });
    
    test('should get earnings channel', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify({
        'guild-123': { 
          channels: [], 
          mentionRole: null,
          earningsChannel: 'earnings-channel-789',
          earningsMentionRole: null
        }
      }));
      
      const CM = require('../../../src/utils/ChannelManager');
      
      const channel = CM.getEarningsChannel('guild-123');
      
      expect(channel).toBe('earnings-channel-789');
    });
  });
  
  describe('Earnings Mention Role Management', () => {
    test('should set earnings mention role', async () => {
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });
      fs.writeFile.mockResolvedValue();
      
      const CM = require('../../../src/utils/ChannelManager');
      
      await CM.setEarningsMentionRole('guild-123', 'role-999');
      
      expect(fs.writeFile).toHaveBeenCalled();
      expect(CM.getEarningsMentionRole('guild-123')).toBe('role-999');
    });
    
    test('should remove earnings mention role', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify({
        'guild-123': { 
          channels: [], 
          mentionRole: null,
          earningsChannel: null,
          earningsMentionRole: 'role-999'
        }
      }));
      fs.writeFile.mockResolvedValue();
      
      const CM = require('../../../src/utils/ChannelManager');
      
      await CM.removeEarningsMentionRole('guild-123');
      
      expect(CM.getEarningsMentionRole('guild-123')).toBeNull();
    });
  });
  
  describe('Get All Configurations', () => {
    test('should return all configurations with earnings data', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify({
        'guild-123': { 
          channels: ['channel-456'], 
          mentionRole: 'role-111',
          earningsChannel: 'earnings-channel-789',
          earningsMentionRole: 'role-222'
        }
      }));
      
      const CM = require('../../../src/utils/ChannelManager');
      
      const configs = CM.getAllConfigurations();
      
      expect(configs).toHaveLength(1);
      expect(configs[0]).toHaveProperty('guildId', 'guild-123');
      expect(configs[0]).toHaveProperty('channels');
      expect(configs[0]).toHaveProperty('mentionRole');
      expect(configs[0]).toHaveProperty('earningsChannel');
      expect(configs[0]).toHaveProperty('earningsMentionRole');
    });
  });
  
  describe('Export to Readable Format', () => {
    test('should export configuration in readable format', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify({
        'guild-123': { 
          channels: ['channel-456'], 
          mentionRole: 'role-111',
          earningsChannel: 'earnings-channel-789',
          earningsMentionRole: 'role-222'
        }
      }));
      
      const CM = require('../../../src/utils/ChannelManager');
      
      const output = await CM.exportToReadableFormat();
      
      expect(output).toContain('guild-123');
      expect(output).toContain('Alert Channels');
      expect(output).toContain('Earnings Channel');
    });
  });
});
