/**
 * Unit Tests for AuthManager - Using exported class for isolated testing
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

describe('AuthManager', () => {
  let AuthManager;
  let authManager;
  let fsMock;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    fsMock = require('fs').promises;
    fsMock.readFile.mockResolvedValue(JSON.stringify({
      'guild-123': ['user-1', 'user-2'],
      'guild-456': ['user-3']
    }));
    fsMock.writeFile.mockResolvedValue();

    const module = require('../../../src/utils/AuthManager');
    AuthManager = module.AuthManager;
    authManager = new AuthManager();
    await authManager.init();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with empty map', () => {
      const fresh = new AuthManager();
      expect(fresh.authorizedUsers).toBeInstanceOf(Map);
      expect(fresh.initialized).toBe(false);
    });

    test('should load authorized users on init', async () => {
      expect(authManager.initialized).toBe(true);
      expect(authManager.authorizedUsers.size).toBe(2);
    });

    test('should not reload if already initialized', async () => {
      await authManager.init();
      await authManager.init();
      expect(fsMock.readFile).toHaveBeenCalledTimes(1);
    });

    test('should handle missing file', async () => {
      fsMock.readFile.mockRejectedValue({ code: 'ENOENT' });
      const fresh = new AuthManager();
      await fresh.init();
      expect(fresh.authorizedUsers.size).toBe(0);
    });

    test('should handle read error', async () => {
      fsMock.readFile.mockRejectedValue(new Error('Read error'));
      const fresh = new AuthManager();
      await fresh.init();
      expect(console.error).toHaveBeenCalled();
    });

    test('should handle parse error', async () => {
      fsMock.readFile.mockResolvedValue('invalid json');
      const fresh = new AuthManager();
      await fresh.init();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Set Owner ID', () => {
    test('should set owner ID', () => {
      authManager.setOwnerId('owner-123');
      expect(authManager.ownerId).toBe('owner-123');
    });

    test('should log owner set message', () => {
      authManager.setOwnerId('owner-123');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Bot owner set')
      );
    });
  });

  describe('Add User', () => {
    test('should add new user', async () => {
      const result = await authManager.addUser('guild-789', 'user-new');
      expect(result).toBe(true);
      expect(fsMock.writeFile).toHaveBeenCalled();
    });

    test('should create guild entry if not exists', async () => {
      await authManager.addUser('new-guild', 'user-1');
      expect(authManager.authorizedUsers.has('new-guild')).toBe(true);
    });

    test('should reject duplicate user', async () => {
      const result = await authManager.addUser('guild-123', 'user-1');
      expect(result).toBe(false);
    });

    test('should save to file after adding', async () => {
      await authManager.addUser('guild-789', 'user-new');
      expect(fsMock.writeFile).toHaveBeenCalled();
    });
  });

  describe('Remove User', () => {
    test('should remove existing user', async () => {
      const result = await authManager.removeUser('guild-123', 'user-1');
      expect(result).toBe(true);
    });

    test('should return false for non-existent user', async () => {
      const result = await authManager.removeUser('guild-123', 'unknown-user');
      expect(result).toBe(false);
    });

    test('should return false for non-existent guild', async () => {
      const result = await authManager.removeUser('unknown-guild', 'user-1');
      expect(result).toBe(false);
    });

    test('should remove guild entry if no users left', async () => {
      await authManager.removeUser('guild-456', 'user-3');
      expect(authManager.authorizedUsers.has('guild-456')).toBe(false);
    });

    test('should keep guild entry if other users remain', async () => {
      await authManager.removeUser('guild-123', 'user-1');
      expect(authManager.authorizedUsers.has('guild-123')).toBe(true);
    });
  });

  describe('Is Authorized', () => {
    test('should return true for owner', () => {
      authManager.setOwnerId('owner-123');
      expect(authManager.isAuthorized('any-guild', 'owner-123')).toBe(true);
    });

    test('should return true for authorized user', () => {
      expect(authManager.isAuthorized('guild-123', 'user-1')).toBe(true);
    });

    test('should return false for unauthorized user', () => {
      expect(authManager.isAuthorized('guild-123', 'unknown-user')).toBe(false);
    });

    test('should return falsy for non-existent guild', () => {
      expect(authManager.isAuthorized('unknown-guild', 'user-1')).toBeFalsy();
    });

    test('should return false when owner not set', () => {
      authManager.ownerId = null;
      expect(authManager.isAuthorized('guild-123', 'user-1')).toBe(true);
      expect(authManager.isAuthorized('guild-123', 'unknown')).toBe(false);
    });
  });

  describe('Is Owner', () => {
    test('should return true for owner', () => {
      authManager.setOwnerId('owner-123');
      expect(authManager.isOwner('owner-123')).toBe(true);
    });

    test('should return false for non-owner', () => {
      authManager.setOwnerId('owner-123');
      expect(authManager.isOwner('user-123')).toBe(false);
    });

    test('should return false if owner not set', () => {
      authManager.ownerId = null;
      expect(authManager.isOwner('user-123')).toBeFalsy();
    });
  });

  describe('Get Authorized Users', () => {
    test('should return users for guild', () => {
      const users = authManager.getAuthorizedUsers('guild-123');
      expect(users).toEqual(['user-1', 'user-2']);
    });

    test('should return empty array for unknown guild', () => {
      const users = authManager.getAuthorizedUsers('unknown-guild');
      expect(users).toEqual([]);
    });
  });

  describe('Export To Readable Format', () => {
    test('should export users in readable format', async () => {
      const output = await authManager.exportToReadableFormat();
      expect(output).toContain('guild-123');
      expect(output).toContain('user-1');
    });

    test('should handle empty map', async () => {
      authManager.authorizedUsers = new Map();
      const output = await authManager.exportToReadableFormat();
      expect(output).toBe('');
    });
  });

  describe('Save Authorized Users', () => {
    test('should save to file', async () => {
      await authManager.saveAuthorizedUsers();
      expect(fsMock.writeFile).toHaveBeenCalled();
    });

    test('should handle write error', async () => {
      fsMock.writeFile.mockRejectedValue(new Error('Write error'));
      await authManager.saveAuthorizedUsers();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Reset', () => {
    test('should reset to initial state', () => {
      authManager.reset();
      expect(authManager.authorizedUsers.size).toBe(0);
      expect(authManager.ownerId).toBeNull();
      expect(authManager.initialized).toBe(false);
    });
  });
});
