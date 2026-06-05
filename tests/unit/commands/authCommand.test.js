const AuthCommand = require('../../../src/commands/AuthCommand');
const AuthManager = require('../../../src/utils/AuthManager');

jest.mock('../../../src/utils/AuthManager');

describe('AuthCommand', () => {
  let command;
  let mockInteraction;
  let mockUser;

  beforeEach(() => {
    jest.resetAllMocks();
    command = new AuthCommand();

    mockUser = {
      id: 'user-123',
      toString: () => '@TestUser'
    };

    mockInteraction = {
      options: {
        getSubcommand: jest.fn(),
        getUser: jest.fn()
      },
      guildId: 'guild-123',
      user: { id: 'owner-123' },
      reply: jest.fn().mockResolvedValue()
    };

    AuthManager.isOwner.mockReturnValue(true);
    AuthManager.ownerId = 'owner-123';
  });

  describe('Command Structure', () => {
    test('should have correct command name', () => {
      expect(command.data.name).toBe('auth');
    });

    test('should have correct description', () => {
      expect(command.data.description).toContain('Manage authorized users');
    });

    test('should have add subcommand', () => {
      const addSubcommand = command.data.options.find(o => o.name === 'add');
      expect(addSubcommand).toBeDefined();
    });

    test('should have remove subcommand', () => {
      const removeSubcommand = command.data.options.find(o => o.name === 'remove');
      expect(removeSubcommand).toBeDefined();
    });

    test('should have list subcommand', () => {
      const listSubcommand = command.data.options.find(o => o.name === 'list');
      expect(listSubcommand).toBeDefined();
    });
  });

  describe('Authorization', () => {
    test('should reject non-owner users', async () => {
      AuthManager.isOwner.mockReturnValue(false);

      await command.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Only the bot owner'),
          ephemeral: true
        })
      );
    });
  });

  describe('Add Subcommand', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('add');
      mockInteraction.options.getUser.mockReturnValue(mockUser);
    });

    test('should add user successfully', async () => {
      AuthManager.addUser.mockResolvedValue(true);

      await command.execute(mockInteraction);

      expect(AuthManager.addUser).toHaveBeenCalledWith('guild-123', 'user-123');
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('has been authorized'),
          ephemeral: true
        })
      );
    });

    test('should reject if user already authorized', async () => {
      AuthManager.addUser.mockResolvedValue(false);

      await command.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('already authorized'),
          ephemeral: true
        })
      );
    });
  });

  describe('Remove Subcommand', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('remove');
      mockInteraction.options.getUser.mockReturnValue(mockUser);
    });

    test('should remove user successfully', async () => {
      AuthManager.removeUser.mockResolvedValue(true);

      await command.execute(mockInteraction);

      expect(AuthManager.removeUser).toHaveBeenCalledWith('guild-123', 'user-123');
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('removed from authorized'),
          ephemeral: true
        })
      );
    });

    test('should reject if user not authorized', async () => {
      AuthManager.removeUser.mockResolvedValue(false);

      await command.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('not in the authorized'),
          ephemeral: true
        })
      );
    });

    test('should prevent owner from removing themselves', async () => {
      mockUser.id = 'owner-123';

      await command.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('cannot remove your own'),
          ephemeral: true
        })
      );
    });
  });

  describe('List Subcommand', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('list');
    });

    test('should list authorized users', async () => {
      AuthManager.getAuthorizedUsers.mockReturnValue(['user-123', 'user-456']);

      await command.execute(mockInteraction);

      expect(AuthManager.getAuthorizedUsers).toHaveBeenCalledWith('guild-123');
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Authorized Users'),
          ephemeral: true
        })
      );
    });

    test('should show message when no authorized users', async () => {
      AuthManager.getAuthorizedUsers.mockReturnValue([]);

      await command.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('None'),
          ephemeral: true
        })
      );
    });

    test('should always show bot owner', async () => {
      AuthManager.getAuthorizedUsers.mockReturnValue([]);

      await command.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Bot Owner'),
          ephemeral: true
        })
      );
    });
  });
});
