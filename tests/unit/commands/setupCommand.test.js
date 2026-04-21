/**
 * Unit Tests for SetupCommand
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
      addSubcommandGroup(fn) {
        const group = { name: '', description: '', subcommands: [] };
        fn(group);
        this.options.push(group);
        return this;
      }
      addSubcommand(fn) {
        const subcommand = { name: '', description: '' };
        fn(subcommand);
        this.options.push(subcommand);
        return this;
      }
      setDefaultMemberPermissions() {
        return this;
      }
      toJSON() {
        return { name: this.name, description: this.description };
      }
    }
  };
});

jest.mock('../../../src/utils/ChannelManager', () => ({
  addChannel: jest.fn(),
  removeChannel: jest.fn(),
  setMentionRole: jest.fn(),
  removeMentionRole: jest.fn(),
  setEarningsChannel: jest.fn(),
  removeEarningsChannel: jest.fn(),
  setEarningsMentionRole: jest.fn(),
  removeEarningsMentionRole: jest.fn(),
  getConfiguration: jest.fn(),
  exportToReadableFormat: jest.fn()
}));

const ChannelManager = require('../../../src/utils/ChannelManager');

describe('SetupCommand', () => {
  let SetupCommand;
  let mockInteraction;
  
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    SetupCommand = require('../../../src/commands/SetupCommand');
    
    mockInteraction = {
      guildId: 'test-guild',
      options: {
        getSubcommandGroup: jest.fn(),
        getSubcommand: jest.fn(),
        getChannel: jest.fn(),
        getRole: jest.fn()
      },
      reply: jest.fn(),
      guild: {
        members: {
          me: {
            permissions: {
              has: jest.fn(() => true)
            }
          }
        },
        channels: {
          fetch: jest.fn()
        },
        roles: {
          fetch: jest.fn()
        }
      }
    };
  });
  
  describe('Command Structure', () => {
    test('should have correct command name', () => {
      const command = new SetupCommand();
      expect(command.data.name).toBe('setup');
    });
    
    test('should have alert-channel group', () => {
      const command = new SetupCommand();
      
      const alertChannelGroup = command.data.options.find(opt => opt.name === 'alert-channel');
      expect(alertChannelGroup).toBeDefined();
    });
    
    test('should have earnings-channel group', () => {
      const command = new SetupCommand();
      
      const earningsChannelGroup = command.data.options.find(opt => opt.name === 'earnings-channel');
      expect(earningsChannelGroup).toBeDefined();
    });
    
    test('should have view subcommand', () => {
      const command = new SetupCommand();
      
      const viewSubcommand = command.data.options.find(opt => opt.name === 'view');
      expect(viewSubcommand).toBeDefined();
    });
  });
  
  describe('Alert Channel Commands', () => {
    test('should handle alert-channel add', async () => {
      const command = new SetupCommand();
      mockInteraction.options.getSubcommandGroup.mockReturnValue('alert-channel');
      mockInteraction.options.getSubcommand.mockReturnValue('add');
      mockInteraction.options.getChannel.mockReturnValue({ id: 'channel-123' });
      
      ChannelManager.addChannel.mockResolvedValue(true);
      
      await command.execute(mockInteraction);
      
      expect(ChannelManager.addChannel).toHaveBeenCalledWith('test-guild', 'channel-123');
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('added')
        })
      );
    });
    
    test('should handle alert-channel remove', async () => {
      const command = new SetupCommand();
      mockInteraction.options.getSubcommandGroup.mockReturnValue('alert-channel');
      mockInteraction.options.getSubcommand.mockReturnValue('remove');
      mockInteraction.options.getChannel.mockReturnValue({ id: 'channel-123' });
      
      ChannelManager.removeChannel.mockResolvedValue(true);
      
      await command.execute(mockInteraction);
      
      expect(ChannelManager.removeChannel).toHaveBeenCalledWith('test-guild', 'channel-123');
    });
  });
  
  describe('Earnings Channel Commands', () => {
    test('should handle earnings-channel set', async () => {
      const command = new SetupCommand();
      mockInteraction.options.getSubcommandGroup.mockReturnValue('earnings-channel');
      mockInteraction.options.getSubcommand.mockReturnValue('set');
      mockInteraction.options.getChannel.mockReturnValue({ id: 'earnings-channel-456' });
      
      ChannelManager.setEarningsChannel.mockResolvedValue();
      
      await command.execute(mockInteraction);
      
      expect(ChannelManager.setEarningsChannel).toHaveBeenCalledWith('test-guild', 'earnings-channel-456');
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('earnings')
        })
      );
    });
    
    test('should handle earnings-channel remove', async () => {
      const command = new SetupCommand();
      mockInteraction.options.getSubcommandGroup.mockReturnValue('earnings-channel');
      mockInteraction.options.getSubcommand.mockReturnValue('remove');
      
      ChannelManager.removeEarningsChannel.mockResolvedValue(true);
      
      await command.execute(mockInteraction);
      
      expect(ChannelManager.removeEarningsChannel).toHaveBeenCalledWith('test-guild');
    });
  });
  
  describe('View Command', () => {
    test('should display configuration', async () => {
      const command = new SetupCommand();
      mockInteraction.options.getSubcommandGroup.mockReturnValue(null);
      mockInteraction.options.getSubcommand.mockReturnValue('view');
      
      ChannelManager.getConfiguration.mockReturnValue({
        channels: ['channel-123'],
        mentionRole: 'role-456',
        earningsChannel: 'earnings-channel-789',
        earningsMentionRole: 'role-999'
      });
      
      mockInteraction.guild.channels.fetch.mockResolvedValue({ toString: () => '#test-channel' });
      mockInteraction.guild.roles.fetch.mockResolvedValue({ toString: () => '@TestRole' });
      
      await command.execute(mockInteraction);
      
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Current Configuration')
        })
      );
    });
    
    test('should handle no configuration', async () => {
      const command = new SetupCommand();
      mockInteraction.options.getSubcommandGroup.mockReturnValue(null);
      mockInteraction.options.getSubcommand.mockReturnValue('view');
      
      ChannelManager.getConfiguration.mockReturnValue({
        channels: [],
        mentionRole: null,
        earningsChannel: null,
        earningsMentionRole: null
      });
      
      await command.execute(mockInteraction);
      
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('No configuration found')
        })
      );
    });
  });
});
