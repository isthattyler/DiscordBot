const CommentCommand = require('../../../src/commands/CommentCommand');
const CommentEmbed = require('../../../src/embeds/CommentEmbed');
const ChannelManager = require('../../../src/utils/ChannelManager');
const AuthManager = require('../../../src/utils/AuthManager');

jest.mock('../../../src/embeds/CommentEmbed');
jest.mock('../../../src/utils/ChannelManager');
jest.mock('../../../src/utils/AuthManager');

describe('CommentCommand', () => {
  let command;
  let mockInteraction;
  let mockAttachment;

  beforeEach(() => {
    jest.resetAllMocks();
    command = new CommentCommand();

    mockAttachment = {
      url: 'https://example.com/image.png',
      contentType: 'image/png'
    };

    mockInteraction = {
      options: {
        getString: jest.fn(),
        getAttachment: jest.fn()
      },
      guildId: 'guild-123',
      user: { id: 'user-123', username: 'testuser' },
      deferReply: jest.fn().mockResolvedValue(),
      editReply: jest.fn().mockResolvedValue(),
      reply: jest.fn().mockResolvedValue(),
      client: {
        channels: {
          fetch: jest.fn()
        }
      }
    };

    AuthManager.isAuthorized.mockReturnValue(true);
    ChannelManager.getAllConfigurations.mockReturnValue([
      { guildId: 'guild-123', channels: ['channel-1'], mentionRole: null }
    ]);
  });

  describe('Command Structure', () => {
    test('should have correct command name', () => {
      expect(command.data.name).toBe('comment');
    });

    test('should have correct description', () => {
      expect(command.data.description).toContain('Post a comment');
    });

    test('should have required message option', () => {
      const messageOption = command.data.options.find(o => o.name === 'message');
      expect(messageOption).toBeDefined();
      expect(messageOption.required).toBe(true);
    });

    test('should have optional image option', () => {
      const imageOption = command.data.options.find(o => o.name === 'image');
      expect(imageOption).toBeDefined();
      expect(imageOption.required).toBe(false);
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

    test('should accept authorized users', async () => {
      AuthManager.isAuthorized.mockReturnValue(true);
      mockInteraction.options.getString.mockReturnValue('Test comment');
      CommentEmbed.create.mockReturnValue({ setImage: jest.fn() });

      await command.execute(mockInteraction);

      expect(mockInteraction.deferReply).toHaveBeenCalled();
    });
  });

  describe('Message Processing', () => {
    beforeEach(() => {
      mockInteraction.options.getString.mockReturnValue('Test comment');
      CommentEmbed.create.mockReturnValue({ setImage: jest.fn() });
    });

    test('should process message with newlines', async () => {
      mockInteraction.options.getString.mockReturnValue('Line 1\\nLine 2');

      await command.execute(mockInteraction);

      expect(CommentEmbed.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Line 1\nLine 2'
        })
      );
    });

    test('should include author in embed data', async () => {
      mockInteraction.user.username = 'TestUser';

      await command.execute(mockInteraction);

      expect(CommentEmbed.create).toHaveBeenCalledWith(
        expect.objectContaining({
          author: 'TestUser'
        })
      );
    });
  });

  describe('Image Handling', () => {
    beforeEach(() => {
      mockInteraction.options.getString.mockReturnValue('Test comment');
    });

    test('should accept valid PNG image', async () => {
      mockInteraction.options.getAttachment.mockReturnValue({
        url: 'https://example.com/image.png',
        contentType: 'image/png'
      });
      const mockEmbed = { setImage: jest.fn() };
      CommentEmbed.create.mockReturnValue(mockEmbed);

      await command.execute(mockInteraction);

      expect(mockEmbed.setImage).toHaveBeenCalledWith('https://example.com/image.png');
    });

    test('should accept valid JPEG image', async () => {
      mockInteraction.options.getAttachment.mockReturnValue({
        url: 'https://example.com/image.jpg',
        contentType: 'image/jpeg'
      });
      const mockEmbed = { setImage: jest.fn() };
      CommentEmbed.create.mockReturnValue(mockEmbed);

      await command.execute(mockInteraction);

      expect(mockEmbed.setImage).toHaveBeenCalled();
    });

    test('should accept valid GIF image', async () => {
      mockInteraction.options.getAttachment.mockReturnValue({
        url: 'https://example.com/image.gif',
        contentType: 'image/gif'
      });
      const mockEmbed = { setImage: jest.fn() };
      CommentEmbed.create.mockReturnValue(mockEmbed);

      await command.execute(mockInteraction);

      expect(mockEmbed.setImage).toHaveBeenCalled();
    });

    test('should reject invalid file type', async () => {
      mockInteraction.options.getAttachment.mockReturnValue({
        url: 'https://example.com/file.pdf',
        contentType: 'application/pdf'
      });

      await command.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Invalid file type'),
          ephemeral: true
        })
      );
    });

    test('should handle missing image', async () => {
      mockInteraction.options.getAttachment.mockReturnValue(null);
      CommentEmbed.create.mockReturnValue({ setImage: jest.fn() });

      await command.execute(mockInteraction);

      expect(mockInteraction.deferReply).toHaveBeenCalled();
    });
  });

  describe('Broadcast Logic', () => {
    beforeEach(() => {
      mockInteraction.options.getString.mockReturnValue('Test comment');
      CommentEmbed.create.mockReturnValue({ setImage: jest.fn() });
    });

    test('should show error when no channels configured', async () => {
      ChannelManager.getAllConfigurations.mockReturnValue([]);

      await command.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('No servers are configured'),
          ephemeral: true
        })
      );
    });

    test('should broadcast to all configured channels', async () => {
      ChannelManager.getAllConfigurations.mockReturnValue([
        { guildId: 'guild-1', channels: ['channel-1', 'channel-2'], mentionRole: null }
      ]);

      mockInteraction.client.channels.fetch.mockResolvedValue({
        send: jest.fn()
      });

      await command.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('2 channel(s)')
        })
      );
    });

    test('should include mention role if configured', async () => {
      ChannelManager.getAllConfigurations.mockReturnValue([
        { guildId: 'guild-1', channels: ['channel-1'], mentionRole: 'role-123' }
      ]);

      mockInteraction.client.channels.fetch.mockResolvedValue({
        send: jest.fn()
      });

      await command.execute(mockInteraction);

      expect(mockInteraction.client.channels.fetch).toHaveBeenCalled();
    });

    test('should handle channel fetch errors', async () => {
      ChannelManager.getAllConfigurations.mockReturnValue([
        { guildId: 'guild-1', channels: ['invalid-channel'], mentionRole: null }
      ]);

      mockInteraction.client.channels.fetch.mockRejectedValue(new Error('Channel not found'));

      await command.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Failed channels')
        })
      );
    });

    test('should report success with channel count', async () => {
      ChannelManager.getAllConfigurations.mockReturnValue([
        { guildId: 'guild-1', channels: ['channel-1'], mentionRole: null }
      ]);

      mockInteraction.client.channels.fetch.mockResolvedValue({
        send: jest.fn()
      });

      await command.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('1 channel(s)')
        })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockInteraction.options.getString.mockReturnValue('Test comment');
      CommentEmbed.create.mockReturnValue({ setImage: jest.fn() });
    });

    test('should propagate defer reply errors', async () => {
      mockInteraction.deferReply.mockRejectedValue(new Error('Already replied'));

      await expect(command.execute(mockInteraction)).rejects.toThrow('Already replied');
    });

    test('should propagate edit reply errors', async () => {
      ChannelManager.getAllConfigurations.mockReturnValue([
        { guildId: 'guild-1', channels: ['channel-1'], mentionRole: null }
      ]);

      mockInteraction.client.channels.fetch.mockResolvedValue({
        send: jest.fn()
      });

      mockInteraction.editReply.mockRejectedValue(new Error('Unknown interaction'));

      await expect(command.execute(mockInteraction)).rejects.toThrow('Unknown interaction');
    });
  });
});
