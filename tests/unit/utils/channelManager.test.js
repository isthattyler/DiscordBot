/**
 * Unit Tests for ChannelManager - Per-User Alert Configuration
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
  const TEST_USER = 'user-123';

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

  describe('Alert Channel - Add', () => {
    test('should add channel and return true', async () => {
      const result = await CM.addChannel('guild-123', TEST_USER, 'channel-456');
      expect(result).toBe(true);
      const config = CM.getUserAlertConfig('guild-123', TEST_USER);
      expect(config.channels).toContain('channel-456');
    });

    test('should not add duplicate', async () => {
      await CM.addChannel('guild-123', TEST_USER, 'channel-456');
      const result = await CM.addChannel('guild-123', TEST_USER, 'channel-456');
      expect(result).toBe(false);
    });

    test('should create guild and user config if not exists', async () => {
      await CM.addChannel('new-guild', TEST_USER, 'channel-1');
      expect(CM.configurations.has('new-guild')).toBe(true);
      const guildConfig = CM.configurations.get('new-guild');
      expect(guildConfig.users.has(TEST_USER)).toBe(true);
    });
  });

  describe('Alert Channel - Remove', () => {
    test('should remove channel', async () => {
      await CM.addChannel('guild-123', TEST_USER, 'channel-456');
      const result = await CM.removeChannel('guild-123', TEST_USER, 'channel-456');
      expect(result).toBe(true);
    });

    test('should return false if guild not found', async () => {
      const result = await CM.removeChannel('unknown-guild', TEST_USER, 'channel-1');
      expect(result).toBe(false);
    });

    test('should return false if user not found', async () => {
      await CM.addChannel('guild-123', TEST_USER, 'channel-456');
      const result = await CM.removeChannel('guild-123', 'other-user', 'channel-456');
      expect(result).toBe(false);
    });

    test('should return false if channel not found', async () => {
      await CM.addChannel('guild-123', TEST_USER, 'channel-456');
      const result = await CM.removeChannel('guild-123', TEST_USER, 'unknown-channel');
      expect(result).toBe(false);
    });

    test('should remove user config when last channel removed and no mention role', async () => {
      await CM.addChannel('guild-123', TEST_USER, 'channel-456');
      await CM.removeChannel('guild-123', TEST_USER, 'channel-456');
      // Guild config is deleted entirely when no users and no earnings remain
      expect(CM.configurations.has('guild-123')).toBe(false);
    });

    test('should keep user config when mention role exists', async () => {
      await CM.addChannel('guild-123', TEST_USER, 'channel-456');
      await CM.setMentionRole('guild-123', TEST_USER, 'role-123');
      await CM.removeChannel('guild-123', TEST_USER, 'channel-456');
      const guildConfig = CM.configurations.get('guild-123');
      expect(guildConfig.users.has(TEST_USER)).toBe(true);
    });
  });

  describe('Remove User Configs', () => {
    test('should remove all user alert config', async () => {
      await CM.addChannel('guild-123', TEST_USER, 'channel-1');
      await CM.setMentionRole('guild-123', TEST_USER, 'role-1');
      const result = await CM.removeUserConfigs('guild-123', TEST_USER);
      expect(result).toBe(true);
      const config = CM.getUserAlertConfig('guild-123', TEST_USER);
      expect(config.channels).toEqual([]);
      expect(config.mentionRole).toBeNull();
    });

    test('should delete guild config when no users and no earnings remain', async () => {
      await CM.addChannel('guild-123', TEST_USER, 'channel-1');
      await CM.removeUserConfigs('guild-123', TEST_USER);
      expect(CM.configurations.has('guild-123')).toBe(false);
    });

    test('should keep guild config when earnings channel exists', async () => {
      await CM.addChannel('guild-123', TEST_USER, 'channel-1');
      await CM.setEarningsChannel('guild-123', 'earnings-ch');
      await CM.removeUserConfigs('guild-123', TEST_USER);
      expect(CM.configurations.has('guild-123')).toBe(true);
    });

    test('should keep other users configs intact', async () => {
      await CM.addChannel('guild-123', TEST_USER, 'channel-1');
      await CM.addChannel('guild-123', 'other-user', 'channel-2');
      await CM.removeUserConfigs('guild-123', TEST_USER);
      const config = CM.getUserAlertConfig('guild-123', 'other-user');
      expect(config.channels).toEqual(['channel-2']);
    });

    test('should return false if guild not found', async () => {
      const result = await CM.removeUserConfigs('unknown-guild', TEST_USER);
      expect(result).toBe(false);
    });

    test('should return false if user not found', async () => {
      const result = await CM.removeUserConfigs('guild-123', 'unknown-user');
      expect(result).toBe(false);
    });
  });

  describe('Alert Mention Roles', () => {
    test('should set alert mention role', async () => {
      await CM.setMentionRole('guild-123', TEST_USER, 'role-123');
      const config = CM.getUserAlertConfig('guild-123', TEST_USER);
      expect(config.mentionRole).toBe('role-123');
    });

    test('should remove mention role', async () => {
      await CM.setMentionRole('guild-123', TEST_USER, 'role-123');
      await CM.removeMentionRole('guild-123', TEST_USER);
      const config = CM.getUserAlertConfig('guild-123', TEST_USER);
      expect(config.mentionRole).toBeNull();
    });

    test('should remove user config when mention role removed and no channels', async () => {
      await CM.setMentionRole('guild-123', TEST_USER, 'role-123');
      await CM.removeMentionRole('guild-123', TEST_USER);
      // Guild config is deleted entirely when no users and no earnings remain
      expect(CM.configurations.has('guild-123')).toBe(false);
    });

    test('should keep user config when channels exist', async () => {
      await CM.addChannel('guild-123', TEST_USER, 'channel-1');
      await CM.setMentionRole('guild-123', TEST_USER, 'role-123');
      await CM.removeMentionRole('guild-123', TEST_USER);
      const guildConfig = CM.configurations.get('guild-123');
      expect(guildConfig.users.has(TEST_USER)).toBe(true);
    });

    test('should delete guild config when everything removed', async () => {
      await CM.setMentionRole('guild-123', TEST_USER, 'role-123');
      await CM.removeMentionRole('guild-123', TEST_USER);
      expect(CM.configurations.has('guild-123')).toBe(false);
    });

    test('should keep guild config when earnings channel exists', async () => {
      await CM.setEarningsChannel('guild-123', 'earnings-channel');
      await CM.setMentionRole('guild-123', TEST_USER, 'role-123');
      await CM.removeMentionRole('guild-123', TEST_USER);
      expect(CM.configurations.has('guild-123')).toBe(true);
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

  describe('Getters', () => {
    test('should return empty channels for unknown user', () => {
      const config = CM.getUserAlertConfig('unknown-guild', 'unknown-user');
      expect(config.channels).toEqual([]);
    });

    test('should return null mention role for unknown user', () => {
      const config = CM.getUserAlertConfig('unknown-guild', 'unknown-user');
      expect(config.mentionRole).toBeNull();
    });

    test('should return default config for missing guild', () => {
      const config = CM.getConfiguration('unknown-guild', TEST_USER);
      expect(config.channels).toEqual([]);
      expect(config.mentionRole).toBeNull();
    });

    test('should return user config when channels exist', async () => {
      await CM.addChannel('guild-123', TEST_USER, 'channel-1');
      const config = CM.getUserAlertConfig('guild-123', TEST_USER);
      expect(config.channels).toEqual(['channel-1']);
    });
  });

  describe('getAllAlertConfigs', () => {
    test('should return all user alert configs', async () => {
      await CM.addChannel('guild-123', TEST_USER, 'channel-1');
      const configs = CM.getAllAlertConfigs();
      expect(configs.length).toBeGreaterThan(0);
      expect(configs[0].guildId).toBe('guild-123');
      expect(configs[0].userId).toBe(TEST_USER);
      expect(configs[0].channels).toContain('channel-1');
    });

    test('should skip users with no channels', async () => {
      await CM.setMentionRole('guild-123', TEST_USER, 'role-1');
      const configs = CM.getAllAlertConfigs();
      expect(configs.length).toBe(0);
    });

    test('should filter by userId when filterUserId provided', async () => {
      await CM.addChannel('guild-123', TEST_USER, 'channel-1');
      await CM.addChannel('guild-123', 'other-user', 'channel-2');
      const configs = CM.getAllAlertConfigs(TEST_USER);
      expect(configs.length).toBe(1);
      expect(configs[0].userId).toBe(TEST_USER);
      expect(configs[0].channels).toEqual(['channel-1']);
    });
  });

  describe('getAllEarningsConfigs', () => {
    test('should return earnings configs', async () => {
      await CM.setEarningsChannel('guild-123', 'earnings-ch');
      await CM.setEarningsMentionRole('guild-123', 'earnings-role');
      const configs = CM.getAllEarningsConfigs();
      expect(configs.length).toBe(1);
      expect(configs[0].earningsChannel).toBe('earnings-ch');
      expect(configs[0].earningsMentionRole).toBe('earnings-role');
    });

    test('should skip guilds with no earnings channel', async () => {
      await CM.addChannel('guild-123', TEST_USER, 'channel-1');
      const configs = CM.getAllEarningsConfigs();
      expect(configs.length).toBe(0);
    });
  });

  describe('getConfiguration (combined)', () => {
    test('should return user alert + guild earnings config', async () => {
      await CM.addChannel('guild-123', TEST_USER, 'channel-1');
      await CM.setMentionRole('guild-123', TEST_USER, 'role-1');
      await CM.setEarningsChannel('guild-123', 'earnings-ch');
      await CM.setEarningsMentionRole('guild-123', 'earnings-role');

      const config = CM.getConfiguration('guild-123', TEST_USER);
      expect(config.channels).toEqual(['channel-1']);
      expect(config.mentionRole).toBe('role-1');
      expect(config.earningsChannel).toBe('earnings-ch');
      expect(config.earningsMentionRole).toBe('earnings-role');
    });
  });

  describe('Export To Readable Format', () => {
    test('should export configurations', async () => {
      await CM.addChannel('guild-123', TEST_USER, 'channel-1');
      const output = await CM.exportToReadableFormat();
      expect(output).toContain('guild-123');
      expect(output).toContain('User ' + TEST_USER);
    });

    test('should include earnings info', async () => {
      await CM.setEarningsChannel('guild-123', 'earnings-ch');
      const output = await CM.exportToReadableFormat();
      expect(output).toContain('Earnings: earnings-ch');
    });

    test('should show None for empty channels', async () => {
      await CM.setMentionRole('guild-123', TEST_USER, 'role-1');
      const output = await CM.exportToReadableFormat();
      expect(output).toContain('None');
    });
  });

  describe('Persistence', () => {
    test('should save on add channel', async () => {
      await CM.addChannel('guild-123', TEST_USER, 'channel-1');
      expect(fsMock.writeFile).toHaveBeenCalled();
    });

    test('should save on remove channel', async () => {
      await CM.addChannel('guild-123', TEST_USER, 'channel-1');
      await CM.removeChannel('guild-123', TEST_USER, 'channel-1');
      expect(fsMock.writeFile).toHaveBeenCalled();
    });

    test('should handle save error', async () => {
      fsMock.writeFile.mockRejectedValue(new Error('Disk full'));
      await CM.addChannel('guild-123', TEST_USER, 'channel-1');
      expect(console.error).toHaveBeenCalled();
    });
  });
});
