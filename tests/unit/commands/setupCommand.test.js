const SetupCommand = require('../../../src/commands/SetupCommand');
const ChannelManager = require('../../../src/utils/ChannelManager');
const AuthManager = require('../../../src/utils/AuthManager');
const { ChannelType, PermissionFlagsBits } = require('discord.js');

jest.mock('../../../src/utils/ChannelManager');
jest.mock('../../../src/utils/AuthManager');

describe('SetupCommand', () => {
  let command;
  let mockInteraction;
  let mockChannel;
  let mockRole;
  let mockGuild;
  let mockBotMember;

  beforeEach(() => {
    jest.resetAllMocks();
    command = new SetupCommand();

    mockChannel = {
      id: 'channel-123',
      type: ChannelType.GuildText,
      toString: () => '#test-channel',
      permissionsFor: jest.fn(),
      send: jest.fn().mockResolvedValue()
    };

    mockRole = {
      id: 'role-123',
      toString: () => '@TestRole'
    };

    mockBotMember = {
      id: 'bot-123'
    };

    mockGuild = {
      id: 'guild-123',
      members: {
        me: mockBotMember
      },
      channels: {
        fetch: jest.fn().mockResolvedValue(mockChannel)
      },
      roles: {
        fetch: jest.fn().mockResolvedValue(mockRole)
      }
    };

    mockInteraction = {
      options: {
        getSubcommandGroup: jest.fn(),
        getSubcommand: jest.fn(),
        getChannel: jest.fn(),
        getRole: jest.fn()
      },
      guildId: 'guild-123',
      guild: mockGuild,
      user: { id: 'user-123' },
      reply: jest.fn().mockResolvedValue()
    };

    AuthManager.isAuthorized.mockReturnValue(true);
    AuthManager.isOwner.mockReturnValue(true);

    ChannelManager.addChannel.mockResolvedValue(true);
    ChannelManager.removeChannel.mockResolvedValue(true);
    ChannelManager.setMentionRole.mockResolvedValue();
    ChannelManager.removeMentionRole.mockResolvedValue();
    ChannelManager.setEarningsChannel.mockResolvedValue();
    ChannelManager.removeEarningsChannel.mockResolvedValue(true);
    ChannelManager.setEarningsMentionRole.mockResolvedValue();
    ChannelManager.removeEarningsMentionRole.mockResolvedValue();
    ChannelManager.getConfiguration.mockReturnValue({
      channels: [],
      mentionRole: null,
      earningsChannel: null,
      earningsMentionRole: null
    });
  });

  describe('Command Structure', () => {
    test('should have correct command name', () => {
      expect(command.data.name).toBe('setup');
    });

    test('should have correct description', () => {
      expect(command.data.description).toContain('Configure');
    });

    test('should not have ManageChannels permission gate', () => {
      expect(command.data.default_member_permissions).toBeUndefined();
    });

    test('should have alert-channel subcommand group', () => {
      const group = command.data.options.find(o => o.name === 'alert-channel');
      expect(group).toBeDefined();
      expect(group.options).toBeDefined();
    });

    test('should have alert-mention subcommand group', () => {
      const group = command.data.options.find(o => o.name === 'alert-mention');
      expect(group).toBeDefined();
    });

    test('should have earnings-channel subcommand group', () => {
      const group = command.data.options.find(o => o.name === 'earnings-channel');
      expect(group).toBeDefined();
    });

    test('should have earnings-mention subcommand group', () => {
      const group = command.data.options.find(o => o.name === 'earnings-mention');
      expect(group).toBeDefined();
    });

    test('should have view subcommand', () => {
      const subcommand = command.data.options.find(o => o.name === 'view');
      expect(subcommand).toBeDefined();
    });
  });

  describe('Authorization', () => {
    test('should reject unauthorized users', async () => {
      AuthManager.isAuthorized.mockReturnValue(false);

      await command.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('not authorized'),
          ephemeral: true
        })
      );
    });

    test('should reject non-owner for earnings subcommands', async () => {
      AuthManager.isOwner.mockReturnValue(false);
      mockInteraction.options.getSubcommandGroup.mockReturnValue('earnings-channel');
      mockInteraction.options.getSubcommand.mockReturnValue('set');

      await command.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Only the bot owner'),
          ephemeral: true
        })
      );
    });
  });

  describe('Alert Channel - Add', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommandGroup.mockReturnValue('alert-channel');
      mockInteraction.options.getSubcommand.mockReturnValue('add');
      mockInteraction.options.getChannel.mockReturnValue(mockChannel);
      mockBotMember.permissions = new Set([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]);
      mockChannel.permissionsFor.mockReturnValue(mockBotMember.permissions);
    });

    test('should add channel successfully', async () => {
      await command.execute(mockInteraction);

      expect(ChannelManager.addChannel).toHaveBeenCalledWith('guild-123', 'user-123', 'channel-123');
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('added'),
          ephemeral: true
        })
      );
    });

    test('should reject if channel already configured', async () => {
      ChannelManager.addChannel.mockResolvedValue(false);

      await command.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('already configured'),
          ephemeral: true
        })
      );
    });

    test('should reject if bot lacks SendMessages permission', async () => {
      const noSendPerms = new Set([PermissionFlagsBits.EmbedLinks]);
      mockChannel.permissionsFor.mockReturnValue(noSendPerms);

      await command.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("don't have permission"),
          ephemeral: true
        })
      );
    });

    test('should reject if bot lacks EmbedLinks permission', async () => {
      const noEmbedPerms = new Set([PermissionFlagsBits.SendMessages]);
      mockChannel.permissionsFor.mockReturnValue(noEmbedPerms);

      await command.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("don't have permission"),
          ephemeral: true
        })
      );
    });
  });

  describe('Alert Channel - Remove', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommandGroup.mockReturnValue('alert-channel');
      mockInteraction.options.getSubcommand.mockReturnValue('remove');
      mockInteraction.options.getChannel.mockReturnValue(mockChannel);
    });

    test('should remove channel successfully', async () => {
      await command.execute(mockInteraction);

      expect(ChannelManager.removeChannel).toHaveBeenCalledWith('guild-123', 'user-123', 'channel-123');
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('removed'),
          ephemeral: true
        })
      );
    });

    test('should reject if channel not configured', async () => {
      ChannelManager.removeChannel.mockResolvedValue(false);

      await command.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('not in your configured'),
          ephemeral: true
        })
      );
    });
  });

  describe('Alert Mention - Set', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommandGroup.mockReturnValue('alert-mention');
      mockInteraction.options.getSubcommand.mockReturnValue('set');
      mockInteraction.options.getRole.mockReturnValue(mockRole);
    });

    test('should set mention role successfully', async () => {
      await command.execute(mockInteraction);

      expect(ChannelManager.setMentionRole).toHaveBeenCalledWith('guild-123', 'user-123', 'role-123');
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('will now mention'),
          ephemeral: true
        })
      );
    });
  });

  describe('Alert Mention - Remove', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommandGroup.mockReturnValue('alert-mention');
      mockInteraction.options.getSubcommand.mockReturnValue('remove');
    });

    test('should remove mention role successfully', async () => {
      await command.execute(mockInteraction);

      expect(ChannelManager.removeMentionRole).toHaveBeenCalledWith('guild-123', 'user-123');
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('removed'),
          ephemeral: true
        })
      );
    });
  });

  describe('Earnings Channel - Set', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommandGroup.mockReturnValue('earnings-channel');
      mockInteraction.options.getSubcommand.mockReturnValue('set');
      mockInteraction.options.getChannel.mockReturnValue(mockChannel);
      mockBotMember.permissions = new Set([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]);
      mockChannel.permissionsFor.mockReturnValue(mockBotMember.permissions);
    });

    test('should set earnings channel successfully', async () => {
      await command.execute(mockInteraction);

      expect(ChannelManager.setEarningsChannel).toHaveBeenCalledWith('guild-123', 'channel-123');
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('configured for daily earnings'),
          ephemeral: true
        })
      );
    });

    test('should reject if bot lacks permissions', async () => {
      const noPerms = new Set();
      mockChannel.permissionsFor.mockReturnValue(noPerms);

      await command.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("don't have permission"),
          ephemeral: true
        })
      );
    });
  });

  describe('Earnings Channel - Remove', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommandGroup.mockReturnValue('earnings-channel');
      mockInteraction.options.getSubcommand.mockReturnValue('remove');
    });

    test('should remove earnings channel successfully', async () => {
      await command.execute(mockInteraction);

      expect(ChannelManager.removeEarningsChannel).toHaveBeenCalledWith('guild-123');
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('removed'),
          ephemeral: true
        })
      );
    });

    test('should reject if no earnings channel configured', async () => {
      ChannelManager.removeEarningsChannel.mockResolvedValue(false);

      await command.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('No earnings channel'),
          ephemeral: true
        })
      );
    });
  });

  describe('Earnings Mention - Set', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommandGroup.mockReturnValue('earnings-mention');
      mockInteraction.options.getSubcommand.mockReturnValue('set');
      mockInteraction.options.getRole.mockReturnValue(mockRole);
    });

    test('should set earnings mention role successfully', async () => {
      await command.execute(mockInteraction);

      expect(ChannelManager.setEarningsMentionRole).toHaveBeenCalledWith('guild-123', 'role-123');
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('will now mention'),
          ephemeral: true
        })
      );
    });
  });

  describe('Earnings Mention - Remove', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommandGroup.mockReturnValue('earnings-mention');
      mockInteraction.options.getSubcommand.mockReturnValue('remove');
    });

    test('should remove earnings mention role successfully', async () => {
      await command.execute(mockInteraction);

      expect(ChannelManager.removeEarningsMentionRole).toHaveBeenCalledWith('guild-123');
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('removed'),
          ephemeral: true
        })
      );
    });
  });

  describe('View Configuration', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommandGroup.mockReturnValue(null);
      mockInteraction.options.getSubcommand.mockReturnValue('view');
    });

    test('should show message when no configuration exists', async () => {
      ChannelManager.getConfiguration.mockReturnValue({
        channels: [],
        mentionRole: null,
        earningsChannel: null,
        earningsMentionRole: null
      });

      await command.execute(mockInteraction);

      expect(ChannelManager.getConfiguration).toHaveBeenCalledWith('guild-123', 'user-123');
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('No configuration found'),
          ephemeral: true
        })
      );
    });

    test('should display configured alert channels', async () => {
      ChannelManager.getConfiguration.mockReturnValue({
        channels: ['channel-123'],
        mentionRole: null,
        earningsChannel: null,
        earningsMentionRole: null
      });

      await command.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Your Alert Channels'),
          ephemeral: true
        })
      );
    });

    test('should display configured mention role', async () => {
      ChannelManager.getConfiguration.mockReturnValue({
        channels: [],
        mentionRole: 'role-123',
        earningsChannel: null,
        earningsMentionRole: null
      });

      await command.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Your Alert Mention Role'),
          ephemeral: true
        })
      );
    });

    test('should display configured earnings channel', async () => {
      ChannelManager.getConfiguration.mockReturnValue({
        channels: [],
        mentionRole: null,
        earningsChannel: 'channel-123',
        earningsMentionRole: null
      });

      await command.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Earnings Channel'),
          ephemeral: true
        })
      );
    });

    test('should display configured earnings mention role', async () => {
      ChannelManager.getConfiguration.mockReturnValue({
        channels: [],
        mentionRole: null,
        earningsChannel: null,
        earningsMentionRole: 'role-123'
      });

      await command.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Earnings Mention Role'),
          ephemeral: true
        })
      );
    });

    test('should handle deleted channels gracefully', async () => {
      mockGuild.channels.fetch.mockRejectedValue(new Error('Unknown channel'));
      ChannelManager.getConfiguration.mockReturnValue({
        channels: ['deleted-channel'],
        mentionRole: null,
        earningsChannel: null,
        earningsMentionRole: null
      });

      await command.execute(mockInteraction);

      expect(ChannelManager.removeChannel).toHaveBeenCalledWith('guild-123', 'user-123', 'deleted-channel');
      expect(mockInteraction.reply).toHaveBeenCalled();
    });

    test('should handle deleted roles gracefully', async () => {
      mockGuild.roles.fetch.mockRejectedValue(new Error('Unknown role'));
      ChannelManager.getConfiguration.mockReturnValue({
        channels: [],
        mentionRole: 'deleted-role',
        earningsChannel: null,
        earningsMentionRole: null
      });

      await command.execute(mockInteraction);

      expect(ChannelManager.removeMentionRole).toHaveBeenCalledWith('guild-123', 'user-123');
      expect(mockInteraction.reply).toHaveBeenCalled();
    });
  });
});
