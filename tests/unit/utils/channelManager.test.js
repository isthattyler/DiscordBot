/**
 * Unit Tests for ChannelManager - Core Functionality
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
  let fsMock;
  
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    delete require.cache[require.resolve('../../../src/utils/ChannelManager')];
    
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    
    fsMock = require('fs').promises;
    fsMock.readFile.mockRejectedValue({ code: 'ENOENT' });
    fsMock.writeFile.mockResolvedValue();
    
    CM = require('../../../src/utils/ChannelManager');
    await CM.init();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('Initialization', () => {
    test('should initialize', async () => {
      expect(CM.initialized).toBe(true);
    });

    test('should handle load error', async () => {
      fsMock.readFile.mockRejectedValue(new Error('Read error'));
      jest.resetModules();
      delete require.cache[require.resolve('../../../src/utils/ChannelManager')];
      
      const newCM = require('../../../src/utils/ChannelManager');
      await newCM.init();

      expect(console.error).toHaveBeenCalled();
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

    test('should create guild config if not exists', async () => {
      await CM.addChannel('new-guild', 'channel-1');
      expect(CM.configurations.has('new-guild')).toBe(true);
    });
  });
  
  describe('Remove Channel', () => {
    test('should remove channel', async () => {
      await CM.addChannel('guild-123', 'channel-456');
      const result = await CM.removeChannel('guild-123', 'channel-456');
      expect(result).toBe(true);
    });

    test('should return false if guild not found', async () => {
      const result = await CM.removeChannel('unknown-guild', 'channel-1');
      expect(result).toBe(false);
    });

    test('should return false if channel not found', async () => {
      await CM.addChannel('guild-123', 'channel-456');
      const result = await CM.removeChannel('guild-123', 'unknown-channel');
      expect(result).toBe(false);
    });

    test('should delete guild config when last channel removed and no mention role', async () => {
      await CM.addChannel('guild-123', 'channel-456');
      await CM.removeChannel('guild-123', 'channel-456');
      expect(CM.configurations.has('guild-123')).toBe(false);
    });

    test('should keep guild config when mention role exists', async () => {
      await CM.addChannel('guild-123', 'channel-456');
      await CM.setMentionRole('guild-123', 'role-123');
      await CM.removeChannel('guild-123', 'channel-456');
      expect(CM.configurations.has('guild-123')).toBe(true);
    });
  });

  describe('Change Channel', () => {
    test('should replace old channel with new', async () => {
      await CM.addChannel('guild-123', 'old-channel');
      const result = await CM.changeChannel('guild-123', 'old-channel', 'new-channel');
      expect(result).toBe(true);
      expect(CM.getChannels('guild-123')).toContain('new-channel');
      expect(CM.getChannels('guild-123')).not.toContain('old-channel');
    });

    test('should return false if guild not found', async () => {
      const result = await CM.changeChannel('unknown-guild', 'old', 'new');
      expect(result).toBe(false);
    });

    test('should return false if old channel not found', async () => {
      await CM.addChannel('guild-123', 'existing-channel');
      const result = await CM.changeChannel('guild-123', 'missing-channel', 'new-channel');
      expect(result).toBe(false);
    });

    test('should return duplicate if new channel already exists', async () => {
      await CM.addChannel('guild-123', 'channel-1');
      await CM.addChannel('guild-123', 'channel-2');
      const result = await CM.changeChannel('guild-123', 'channel-1', 'channel-2');
      expect(result).toBe('duplicate');
    });
  });

  describe('Remove All Channels', () => {
    test('should remove all channels', async () => {
      await CM.addChannel('guild-123', 'channel-1');
      await CM.addChannel('guild-123', 'channel-2');
      const result = await CM.removeAllChannels('guild-123');
      expect(result).toBe(2);
      expect(CM.getChannels('guild-123')).toHaveLength(0);
    });

    test('should return false if guild not found', async () => {
      const result = await CM.removeAllChannels('unknown-guild');
      expect(result).toBe(false);
    });

    test('should return false if no channels', async () => {
      await CM.setMentionRole('guild-123', 'role-1');
      const result = await CM.removeAllChannels('guild-123');
      expect(result).toBe(false);
    });

    test('should delete guild config if no mention role', async () => {
      await CM.addChannel('guild-123', 'channel-1');
      await CM.removeAllChannels('guild-123');
      expect(CM.configurations.has('guild-123')).toBe(false);
    });

    test('should keep guild config if mention role exists', async () => {
      await CM.addChannel('guild-123', 'channel-1');
      await CM.setMentionRole('guild-123', 'role-1');
      await CM.removeAllChannels('guild-123');
      expect(CM.configurations.has('guild-123')).toBe(true);
    });
  });

  describe('Set Channel', () => {
    test('should replace all channels with single channel', async () => {
      await CM.addChannel('guild-123', 'channel-1');
      await CM.addChannel('guild-123', 'channel-2');
      await CM.setChannel('guild-123', 'new-channel');
      expect(CM.getChannels('guild-123')).toEqual(['new-channel']);
    });

    test('should keep existing mention role', async () => {
      await CM.setMentionRole('guild-123', 'role-1');
      await CM.setChannel('guild-123', 'channel-1');
      expect(CM.getMentionRole('guild-123')).toBe('role-1');
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

    test('should return false if no earnings channel configured', async () => {
      const result = await CM.removeEarningsChannel('unknown-guild');
      expect(result).toBe(false);
    });

    test('should delete guild config when earnings channel removed and no other config', async () => {
      await CM.setEarningsChannel('guild-123', 'earnings-channel');
      await CM.removeEarningsChannel('guild-123');
      expect(CM.configurations.has('guild-123')).toBe(false);
    });

    test('should return null for missing earnings channel', async () => {
      expect(CM.getEarningsChannel('unknown-guild')).toBeNull();
    });
  });

  describe('Earnings Mention Role', () => {
    test('should set earnings mention role', async () => {
      await CM.setEarningsMentionRole('guild-123', 'role-456');
      expect(CM.getEarningsMentionRole('guild-123')).toBe('role-456');
    });

    test('should remove earnings mention role', async () => {
      await CM.setEarningsMentionRole('guild-123', 'role-456');
      await CM.removeEarningsMentionRole('guild-123');
      expect(CM.getEarningsMentionRole('guild-123')).toBeNull();
    });

    test('should return null for missing earnings mention role', async () => {
      expect(CM.getEarningsMentionRole('unknown-guild')).toBeNull();
    });

    test('should delete guild config when earnings mention role removed and no other config', async () => {
      await CM.setEarningsMentionRole('guild-123', 'role-1');
      await CM.removeEarningsMentionRole('guild-123');
      expect(CM.configurations.has('guild-123')).toBe(false);
    });
  });
  
  describe('Mention Roles', () => {
    test('should set alert mention role', async () => {
      await CM.setMentionRole('guild-123', 'role-123');
      expect(CM.getMentionRole('guild-123')).toBe('role-123');
    });

    test('should remove mention role', async () => {
      await CM.setMentionRole('guild-123', 'role-123');
      await CM.removeMentionRole('guild-123');
      expect(CM.getMentionRole('guild-123')).toBeNull();
    });

    test('should delete guild config when mention role removed and no channels', async () => {
      await CM.setMentionRole('guild-123', 'role-123');
      await CM.removeMentionRole('guild-123');
      expect(CM.configurations.has('guild-123')).toBe(false);
    });

    test('should keep guild config when channels exist', async () => {
      await CM.addChannel('guild-123', 'channel-1');
      await CM.setMentionRole('guild-123', 'role-123');
      await CM.removeMentionRole('guild-123');
      expect(CM.configurations.has('guild-123')).toBe(true);
    });

    test('should keep guild config when earnings channel exists', async () => {
      await CM.setEarningsChannel('guild-123', 'earnings-channel');
      await CM.setMentionRole('guild-123', 'role-123');
      await CM.removeMentionRole('guild-123');
      expect(CM.configurations.has('guild-123')).toBe(true);
    });
  });

  describe('Getters', () => {
    test('should return empty array for missing channels', () => {
      expect(CM.getChannels('unknown-guild')).toEqual([]);
    });

    test('should return null for missing mention role', () => {
      expect(CM.getMentionRole('unknown-guild')).toBeNull();
    });

    test('should return falsy for hasChannels when no channels', () => {
      expect(CM.hasChannels('unknown-guild')).toBeFalsy();
    });

    test('should return true for hasChannels when channels exist', async () => {
      await CM.addChannel('guild-123', 'channel-1');
      expect(CM.hasChannels('guild-123')).toBe(true);
    });

    test('should return default config for missing guild', () => {
      const config = CM.getConfiguration('unknown-guild');
      expect(config.channels).toEqual([]);
      expect(config.mentionRole).toBeNull();
    });
  });
  
  describe('Get All Configurations', () => {
    test('should return configurations', async () => {
      await CM.addChannel('guild-123', 'channel-1');
      const configs = CM.getAllConfigurations();
      expect(configs.length).toBeGreaterThan(0);
    });

    test('should include earnings fields', async () => {
      await CM.setEarningsChannel('guild-123', 'earnings-ch');
      await CM.setEarningsMentionRole('guild-123', 'earnings-role');
      const configs = CM.getAllConfigurations();
      expect(configs[0].earningsChannel).toBe('earnings-ch');
      expect(configs[0].earningsMentionRole).toBe('earnings-role');
    });
  });

  describe('Export To Readable Format', () => {
    test('should export configurations', async () => {
      await CM.addChannel('guild-123', 'channel-1');
      const output = await CM.exportToReadableFormat();
      expect(output).toContain('guild-123');
      expect(output).toContain('Alert Channels');
    });

    test('should include earnings info', async () => {
      await CM.setEarningsChannel('guild-123', 'earnings-ch');
      const output = await CM.exportToReadableFormat();
      expect(output).toContain('Earnings Channel');
    });

    test('should show None for empty channels', async () => {
      await CM.setMentionRole('guild-123', 'role-1');
      const output = await CM.exportToReadableFormat();
      expect(output).toContain('None');
    });
  });

  describe('Persistence', () => {
    test('should save on add channel', async () => {
      await CM.addChannel('guild-123', 'channel-1');
      expect(fsMock.writeFile).toHaveBeenCalled();
    });

    test('should save on remove channel', async () => {
      await CM.addChannel('guild-123', 'channel-1');
      await CM.removeChannel('guild-123', 'channel-1');
      expect(fsMock.writeFile).toHaveBeenCalled();
    });

    test('should handle save error', async () => {
      fsMock.writeFile.mockRejectedValue(new Error('Disk full'));
      await CM.addChannel('guild-123', 'channel-1');
      expect(console.error).toHaveBeenCalled();
    });
  });
});
