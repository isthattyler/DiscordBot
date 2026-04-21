/**
 * Unit Tests for ShortCommand
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

describe('ShortCommand', () => {
  let ShortCommand;
  let mockInteraction;
  
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    ShortCommand = require('../../../src/commands/ShortCommand');
    
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
    
    AuthManager.isAuthorized.mockReturnValue(true);
  });
  
  describe('Command Structure', () => {
    test('should have correct command name', () => {
      const command = new ShortCommand();
      expect(command.data.name).toBe('short');
    });
    
    test('should create embed with short position', async () => {
      const command = new ShortCommand();
      
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
        position: 'short',
        entry: '12345',
        stoploss: null,
        target: null
      });
    });
  });
});
