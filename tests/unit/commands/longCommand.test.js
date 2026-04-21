/**
 * Unit Tests for LongCommand
 */

jest.mock('discord.js', () => {
  const actualDiscord = jest.requireActual('discord.js');
  return {
    ...actualDiscord,
    SlashCommandBuilder: class {
      constructor() {
        this.name = '';
        this.description = '';
        this.options = [];
      }
      setName(name) {
        this.name = name;
        return this;
      }
      setDescription(desc) {
        this.description = desc;
        return this;
      }
      addStringOption(fn) {
        const option = { type: 'string' };
        fn(option);
        this.options.push(option);
        return this;
      }
      addAttachmentOption(fn) {
        const option = { type: 'attachment' };
        fn(option);
        this.options.push(option);
        return this;
      }
      toJSON() {
        return { name: this.name, description: this.description };
      }
    }
  };
});

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

describe('LongCommand', () => {
  let LongCommand;
  let mockInteraction;
  
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    LongCommand = require('../../../src/commands/LongCommand');
    
    mockInteraction = {
      guildId: 'test-guild',
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
  });
  
  describe('Command Structure', () => {
    test('should have correct command name', () => {
      const command = new LongCommand();
      expect(command.data.name).toBe('long');
    });
    
    test('should have required options', () => {
      const command = new LongCommand();
      
      expect(command.data.options.length).toBeGreaterThan(0);
      expect(command.data.options.some(opt => opt.name === 'ticker')).toBe(true);
      expect(command.data.options.some(opt => opt.name === 'entry')).toBe(true);
    });
    
    test('ticker and entry should be required', () => {
      const command = new LongCommand();
      
      const tickerOption = command.data.options.find(opt => opt.name === 'ticker');
      const entryOption = command.data.options.find(opt => opt.name === 'entry');
      
      expect(tickerOption.required).toBe(true);
      expect(entryOption.required).toBe(true);
    });
  });
  
  describe('Authorization', () => {
    test('should reject unauthorized users', async () => {
      AuthManager.isAuthorized.mockReturnValue(false);
      const command = new LongCommand();
      
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
      const command = new LongCommand();
      
      mockInteraction.options.getString.mockReturnValue('MNQ');
      mockInteraction.options.getAttachment.mockReturnValue(null);
      TradingAlertEmbed.create.mockReturnValue({});
      
      await command.execute(mockInteraction);
      
      expect(mockInteraction.deferReply).toHaveBeenCalled();
    });
  });
  
  describe('Embed Creation', () => {
    test('should create embed with correct data', async () => {
      const command = new LongCommand();
      
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
    
    test('should handle optional fields', async () => {
      const command = new LongCommand();
      
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
    test('should accept valid image attachments', async () => {
      const command = new LongCommand();
      
      mockInteraction.options.getString.mockReturnValue('MNQ');
      mockInteraction.options.getAttachment.mockReturnValue({
        contentType: 'image/png',
        url: 'https://example.com/image.png'
      });
      
      const mockEmbed = { setImage: jest.fn() };
      TradingAlertEmbed.create.mockReturnValue(mockEmbed);
      
      await command.execute(mockInteraction);
      
      expect(mockEmbed.setImage).toHaveBeenCalledWith('https://example.com/image.png');
    });
    
    test('should reject invalid file types', async () => {
      const command = new LongCommand();
      
      mockInteraction.options.getString.mockReturnValue('MNQ');
      mockInteraction.options.getAttachment.mockReturnValue({
        contentType: 'application/pdf',
        url: 'https://example.com/file.pdf'
      });
      
      await command.execute(mockInteraction);
      
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Invalid file type'),
          ephemeral: true
        })
      );
    });
  });
});
