/**
 * Unit Tests for LongCommand
 * Tests authorization, embed creation, broadcast logic, and error handling
 */

jest.mock('../../../src/utils/AuthManager', () => ({
  isAuthorized: jest.fn()
}));

jest.mock('../../../src/utils/ChannelManager', () => ({
  getAllConfigurations: jest.fn()
}));

jest.mock('../../../src/embeds/TradingAlertEmbed', () => ({
  create: jest.fn()
}));

const AuthManager = require('../../../src/utils/AuthManager');
const ChannelManager = require('../../../src/utils/ChannelManager');
const TradingAlertEmbed = require('../../../src/embeds/TradingAlertEmbed');
const LongCommand = require('../../../src/commands/LongCommand');

describe('LongCommand', () => {
  let command;
  let mockInteraction;
  
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    command = new LongCommand();
    
    mockInteraction = {
      guildId: 'test-guild-123',
      user: { id: 'user-456' },
      options: {
        getString: jest.fn(),
        getAttachment: jest.fn()
      },
      reply: jest.fn(),
      deferReply: jest.fn(),
      editReply: jest.fn(),
      client: {
        channels: {
          fetch: jest.fn()
        }
      }
    };
    
    // Default: user is authorized
    AuthManager.isAuthorized.mockReturnValue(true);
    ChannelManager.getAllConfigurations.mockReturnValue([]);
    TradingAlertEmbed.create.mockReturnValue({ setImage: jest.fn() });
  });
  
  describe('Command Structure', () => {
    test('should have correct command name', () => {
      expect(command.data.name).toBe('long');
    });
    
    test('should have correct description', () => {
      expect(command.data.description).toContain('long trading alert');
    });
    
    test('should have required ticker option', () => {
      const tickerOption = command.data.options.find(opt => opt.name === 'ticker');
      expect(tickerOption).toBeDefined();
      expect(tickerOption.required).toBe(true);
    });
    
    test('should have required entry option', () => {
      const entryOption = command.data.options.find(opt => opt.name === 'entry');
      expect(entryOption).toBeDefined();
      expect(entryOption.required).toBe(true);
    });
    
    test('should have optional stoploss option', () => {
      const stoplossOption = command.data.options.find(opt => opt.name === 'stoploss');
      expect(stoplossOption).toBeDefined();
      expect(stoplossOption.required).toBe(false);
    });
    
    test('should have optional target option', () => {
      const targetOption = command.data.options.find(opt => opt.name === 'target');
      expect(targetOption).toBeDefined();
      expect(targetOption.required).toBe(false);
    });
    
    test('should have optional image option', () => {
      const imageOption = command.data.options.find(opt => opt.name === 'image');
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
      ChannelManager.getAllConfigurations.mockReturnValue([
        { guildId: 'guild-1', channels: ['channel-1'], mentionRole: null }
      ]);
      mockInteraction.options.getString.mockReturnValue('MNQ');
      
      await command.execute(mockInteraction);
      
      expect(mockInteraction.deferReply).toHaveBeenCalled();
    });
  });
  
  describe('Embed Creation', () => {
    test('should create embed with correct data', async () => {
      mockInteraction.options.getString.mockImplementation((name) => {
        if (name === 'ticker') return 'MNQ';
        if (name === 'entry') return '12345';
        if (name === 'stoploss') return '12300';
        if (name === 'target') return '12400';
        return null;
      });
      
      const mockEmbed = { setImage: jest.fn() };
      TradingAlertEmbed.create.mockReturnValue(mockEmbed);
      
      await command.execute(mockInteraction);
      
      expect(TradingAlertEmbed.create).toHaveBeenCalledWith({
        ticker: 'MNQ',
        position: 'long',
        entry: '12345',
        stoploss: '12300',
        target: '12400'
      });
    });
    
    test('should handle missing optional fields', async () => {
      mockInteraction.options.getString.mockImplementation((name) => {
        if (name === 'ticker') return 'MNQ';
        if (name === 'entry') return '12345';
        return null;
      });
      
      const mockEmbed = { setImage: jest.fn() };
      TradingAlertEmbed.create.mockReturnValue(mockEmbed);
      
      await command.execute(mockInteraction);
      
      expect(TradingAlertEmbed.create).toHaveBeenCalledWith({
        ticker: 'MNQ',
        position: 'long',
        entry: '12345',
        stoploss: null,
        target: null
      });
    });
  });
  
  describe('Image Handling', () => {
    test('should accept valid PNG image', async () => {
      mockInteraction.options.getString.mockReturnValue('MNQ');
      mockInteraction.options.getAttachment.mockReturnValue({
        contentType: 'image/png',
        url: 'https://example.com/chart.png'
      });
      
      const mockEmbed = { setImage: jest.fn() };
      TradingAlertEmbed.create.mockReturnValue(mockEmbed);
      
      await command.execute(mockInteraction);
      
      expect(mockEmbed.setImage).toHaveBeenCalledWith('https://example.com/chart.png');
    });
    
    test('should accept valid JPEG image', async () => {
      mockInteraction.options.getString.mockReturnValue('MNQ');
      mockInteraction.options.getAttachment.mockReturnValue({
        contentType: 'image/jpeg',
        url: 'https://example.com/chart.jpg'
      });
      
      const mockEmbed = { setImage: jest.fn() };
      TradingAlertEmbed.create.mockReturnValue(mockEmbed);
      
      await command.execute(mockInteraction);
      
      expect(mockEmbed.setImage).toHaveBeenCalledWith('https://example.com/chart.jpg');
    });
    
    test('should accept valid GIF image', async () => {
      mockInteraction.options.getString.mockReturnValue('MNQ');
      mockInteraction.options.getAttachment.mockReturnValue({
        contentType: 'image/gif',
        url: 'https://example.com/chart.gif'
      });
      
      const mockEmbed = { setImage: jest.fn() };
      TradingAlertEmbed.create.mockReturnValue(mockEmbed);
      
      await command.execute(mockInteraction);
      
      expect(mockEmbed.setImage).toHaveBeenCalledWith('https://example.com/chart.gif');
    });
    
    test('should reject invalid file type (PDF)', async () => {
      mockInteraction.options.getString.mockReturnValue('MNQ');
      mockInteraction.options.getAttachment.mockReturnValue({
        contentType: 'application/pdf',
        url: 'https://example.com/document.pdf'
      });
      
      await command.execute(mockInteraction);
      
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Invalid file type'),
          ephemeral: true
        })
      );
    });
    
    test('should reject invalid file type (text)', async () => {
      mockInteraction.options.getString.mockReturnValue('MNQ');
      mockInteraction.options.getAttachment.mockReturnValue({
        contentType: 'text/plain',
        url: 'https://example.com/notes.txt'
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
      mockInteraction.options.getString.mockReturnValue('MNQ');
      mockInteraction.options.getAttachment.mockReturnValue(null);
      
      const mockEmbed = { setImage: jest.fn() };
      TradingAlertEmbed.create.mockReturnValue(mockEmbed);
      
      await command.execute(mockInteraction);
      
      expect(mockEmbed.setImage).not.toHaveBeenCalled();
    });
  });
  
  describe('Broadcast Logic', () => {
    test('should show error when no channels configured', async () => {
      mockInteraction.options.getString.mockReturnValue('MNQ');
      ChannelManager.getAllConfigurations.mockReturnValue([]);
      
      const mockEmbed = { setImage: jest.fn() };
      TradingAlertEmbed.create.mockReturnValue(mockEmbed);
      
      await command.execute(mockInteraction);
      
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('No servers are configured'),
          ephemeral: true
        })
      );
    });
    
    test('should broadcast to all configured channels', async () => {
      mockInteraction.options.getString.mockReturnValue('MNQ');
      
      ChannelManager.getAllConfigurations.mockReturnValue([
        {
          guildId: 'guild-1',
          channels: ['channel-1', 'channel-2'],
          mentionRole: null
        }
      ]);
      
      mockInteraction.client.channels.fetch.mockResolvedValue({
        send: jest.fn()
      });
      
      const mockEmbed = { setImage: jest.fn() };
      TradingAlertEmbed.create.mockReturnValue(mockEmbed);
      
      await command.execute(mockInteraction);
      
      expect(mockInteraction.deferReply).toHaveBeenCalled();
      expect(mockInteraction.client.channels.fetch).toHaveBeenCalledTimes(2);
    });
    
    test('should include mention role if configured', async () => {
      mockInteraction.options.getString.mockReturnValue('MNQ');
      
      ChannelManager.getAllConfigurations.mockReturnValue([
        {
          guildId: 'guild-1',
          channels: ['channel-1'],
          mentionRole: 'role-123'
        }
      ]);
      
      const mockChannel = {
        send: jest.fn()
      };
      mockInteraction.client.channels.fetch.mockResolvedValue(mockChannel);
      
      const mockEmbed = { setImage: jest.fn() };
      TradingAlertEmbed.create.mockReturnValue(mockEmbed);
      
      await command.execute(mockInteraction);
      
      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('<@&role-123>')
        })
      );
    });
    
    test('should handle channel fetch errors', async () => {
      mockInteraction.options.getString.mockReturnValue('MNQ');
      
      ChannelManager.getAllConfigurations.mockReturnValue([
        {
          guildId: 'guild-1',
          channels: ['invalid-channel'],
          mentionRole: null
        }
      ]);
      
      mockInteraction.client.channels.fetch.mockRejectedValue(new Error('Channel not found'));
      
      const mockEmbed = { setImage: jest.fn() };
      TradingAlertEmbed.create.mockReturnValue(mockEmbed);
      
      await command.execute(mockInteraction);
      
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Failed channels')
        })
      );
    });
    
    test('should report success with channel count', async () => {
      mockInteraction.options.getString.mockReturnValue('MNQ');
      
      ChannelManager.getAllConfigurations.mockReturnValue([
        {
          guildId: 'guild-1',
          channels: ['channel-1', 'channel-2'],
          mentionRole: null
        }
      ]);
      
      mockInteraction.client.channels.fetch.mockResolvedValue({
        send: jest.fn()
      });
      
      const mockEmbed = { setImage: jest.fn() };
      TradingAlertEmbed.create.mockReturnValue(mockEmbed);
      
      await command.execute(mockInteraction);
      
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('2 channel(s)')
        })
      );
    });
  });
  
  describe('Error Handling', () => {
    test('should propagate defer reply errors', async () => {
      AuthManager.isAuthorized.mockReturnValue(true);
      ChannelManager.getAllConfigurations.mockReturnValue([
        { guildId: 'guild-1', channels: ['channel-1'], mentionRole: null }
      ]);
      mockInteraction.options.getString.mockReturnValue('MNQ');
      mockInteraction.deferReply.mockRejectedValue(new Error('Already replied'));
      
      const mockEmbed = { setImage: jest.fn() };
      TradingAlertEmbed.create.mockReturnValue(mockEmbed);
      
      await expect(command.execute(mockInteraction)).rejects.toThrow('Already replied');
    });
    
    test('should propagate edit reply errors', async () => {
      mockInteraction.options.getString.mockReturnValue('MNQ');
      
      ChannelManager.getAllConfigurations.mockReturnValue([
        {
          guildId: 'guild-1',
          channels: ['channel-1'],
          mentionRole: null
        }
      ]);
      
      mockInteraction.client.channels.fetch.mockResolvedValue({
        send: jest.fn()
      });
      
      mockInteraction.editReply.mockRejectedValue(new Error('Unknown interaction'));
      
      const mockEmbed = { setImage: jest.fn() };
      TradingAlertEmbed.create.mockReturnValue(mockEmbed);
      
      await expect(command.execute(mockInteraction)).rejects.toThrow('Unknown interaction');
    });
  });
});
