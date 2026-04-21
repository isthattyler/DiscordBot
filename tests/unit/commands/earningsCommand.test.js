/**
 * Unit Tests for EarningsCommand
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
      addSubcommand(fn) {
        const subcommand = { name: '', description: '' };
        fn(subcommand);
        this.options.push(subcommand);
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

jest.mock('../../../src/utils/EarningsCalendar', () => ({
  getTodayEarnings: jest.fn(),
  getTomorrowEarnings: jest.fn(),
  getWeekEarnings: jest.fn()
}));

jest.mock('../../../src/embeds/EarningsCalendarEmbed', () => ({
  create: jest.fn(),
  buildWeekEmbed: jest.fn()
}));

const AuthManager = require('../../../src/utils/AuthManager');
const EarningsCalendar = require('../../../src/utils/EarningsCalendar');
const EarningsCalendarEmbed = require('../../../src/embeds/EarningsCalendarEmbed');

describe('EarningsCommand', () => {
  let EarningsCommand;
  let mockInteraction;
  
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    EarningsCommand = require('../../../src/commands/EarningsCommand');
    
    mockInteraction = {
      guildId: 'test-guild',
      options: {
        getSubcommand: jest.fn()
      },
      reply: jest.fn(),
      deferReply: jest.fn(),
      editReply: jest.fn(),
      client: {
        botConfig: {}
      }
    };
    
    AuthManager.isAuthorized.mockReturnValue(true);
  });
  
  describe('Command Structure', () => {
    test('should have correct command name', () => {
      const command = new EarningsCommand();
      expect(command.data.name).toBe('earnings');
    });
    
    test('should have today, tomorrow, and week subcommands', () => {
      const command = new EarningsCommand();
      
      const subcommandNames = command.data.options.map(opt => opt.name);
      
      expect(subcommandNames).toContain('today');
      expect(subcommandNames).toContain('tomorrow');
      expect(subcommandNames).toContain('week');
    });
  });
  
  describe('Authorization', () => {
    test('should reject unauthorized users', async () => {
      AuthManager.isAuthorized.mockReturnValue(false);
      const command = new EarningsCommand();
      mockInteraction.options.getSubcommand.mockReturnValue('today');
      
      await command.execute(mockInteraction);
      
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('not authorized'),
          ephemeral: true
        })
      );
    });
  });
  
  describe('Today Subcommand', () => {
    test('should fetch and display today earnings', async () => {
      const command = new EarningsCommand();
      mockInteraction.options.getSubcommand.mockReturnValue('today');
      
      EarningsCalendar.getTodayEarnings.mockResolvedValue({
        preMarket: [{ symbol: 'NVDA', estimate: '5.25' }],
        postMarket: [{ symbol: 'AAPL', estimate: '1.52' }]
      });
      
      const mockEmbed = {};
      EarningsCalendarEmbed.create.mockReturnValue(mockEmbed);
      
      await command.execute(mockInteraction);
      
      expect(EarningsCalendar.getTodayEarnings).toHaveBeenCalled();
      expect(EarningsCalendarEmbed.create).toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [mockEmbed]
        })
      );
    });
    
    test('should handle no earnings found', async () => {
      const command = new EarningsCommand();
      mockInteraction.options.getSubcommand.mockReturnValue('today');
      
      EarningsCalendar.getTodayEarnings.mockResolvedValue({
        preMarket: [],
        postMarket: []
      });
      
      EarningsCalendarEmbed.create.mockReturnValue(null);
      
      await command.execute(mockInteraction);
      
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('No major company earnings')
        })
      );
    });
  });
  
  describe('Tomorrow Subcommand', () => {
    test('should fetch and display tomorrow earnings', async () => {
      const command = new EarningsCommand();
      mockInteraction.options.getSubcommand.mockReturnValue('tomorrow');
      
      EarningsCalendar.getTomorrowEarnings.mockResolvedValue({
        preMarket: [],
        postMarket: [{ symbol: 'MSFT', estimate: '2.85' }]
      });
      
      const mockEmbed = {};
      EarningsCalendarEmbed.create.mockReturnValue(mockEmbed);
      
      await command.execute(mockInteraction);
      
      expect(EarningsCalendar.getTomorrowEarnings).toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [mockEmbed]
        })
      );
    });
  });
  
  describe('Week Subcommand', () => {
    test('should fetch and display week earnings', async () => {
      const command = new EarningsCommand();
      mockInteraction.options.getSubcommand.mockReturnValue('week');
      
      EarningsCalendar.getWeekEarnings.mockResolvedValue({
        '2026-04-22': [{ symbol: 'AAPL', estimate: '1.52' }]
      });
      
      const mockEmbed = {};
      EarningsCalendarEmbed.buildWeekEmbed.mockReturnValue(mockEmbed);
      
      await command.execute(mockInteraction);
      
      expect(EarningsCalendar.getWeekEarnings).toHaveBeenCalled();
      expect(EarningsCalendarEmbed.buildWeekEmbed).toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [mockEmbed]
        })
      );
    });
  });
  
  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      const command = new EarningsCommand();
      mockInteraction.options.getSubcommand.mockReturnValue('today');
      
      EarningsCalendar.getTodayEarnings.mockRejectedValue(new Error('API Error'));
      
      await command.execute(mockInteraction);
      
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('error occurred')
        })
      );
    });
  });
});
