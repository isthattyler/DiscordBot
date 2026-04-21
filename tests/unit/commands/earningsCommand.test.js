const EarningsCommand = require('../../../src/commands/EarningsCommand');
const EarningsCalendar = require('../../../src/utils/EarningsCalendar');
const EarningsCalendarEmbed = require('../../../src/embeds/EarningsCalendarEmbed');
const AuthManager = require('../../../src/utils/AuthManager');

jest.mock('../../../src/utils/EarningsCalendar');
jest.mock('../../../src/embeds/EarningsCalendarEmbed');
jest.mock('../../../src/utils/AuthManager');

describe('EarningsCommand', () => {
  let command;
  let mockInteraction;

  beforeEach(() => {
    jest.resetAllMocks();
    command = new EarningsCommand();
    
    mockInteraction = {
      options: {
        getSubcommand: jest.fn(),
      },
      guildId: 'guild-123',
      user: { id: 'user-123' },
      deferReply: jest.fn().mockResolvedValue(),
      editReply: jest.fn().mockResolvedValue(),
      reply: jest.fn().mockResolvedValue(),
      client: {
        botConfig: {
          name: 'Trading Bot',
          color: 0x00ff00
        }
      }
    };

    AuthManager.isAuthorized.mockReturnValue(true);
  });

  describe('Command Structure', () => {
    test('should have correct command name', () => {
      expect(command.data.name).toBe('earnings');
    });

    test('should have correct description', () => {
      expect(command.data.description).toContain('earnings');
    });

    test('should have today subcommand', () => {
      const todaySubcommand = command.data.options.find(o => o.name === 'today');
      expect(todaySubcommand).toBeDefined();
    });

    test('should have tomorrow subcommand', () => {
      const tomorrowSubcommand = command.data.options.find(o => o.name === 'tomorrow');
      expect(tomorrowSubcommand).toBeDefined();
    });

    test('should have week subcommand', () => {
      const weekSubcommand = command.data.options.find(o => o.name === 'week');
      expect(weekSubcommand).toBeDefined();
    });
  });

  describe('Authorization', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('today');
    });

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
      EarningsCalendar.getTodayEarnings.mockResolvedValue([]);
      EarningsCalendarEmbed.create.mockReturnValue(null);

      await command.execute(mockInteraction);

      expect(mockInteraction.deferReply).toHaveBeenCalled();
    });
  });

  describe('Today Subcommand', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('today');
    });

    test('should fetch and display today earnings', async () => {
      const mockEarnings = [
        { symbol: 'AAPL', time: 'amc', epsEstimate: '1.50' }
      ];
      const mockEmbed = { data: {} };

      EarningsCalendar.getTodayEarnings.mockResolvedValue(mockEarnings);
      EarningsCalendarEmbed.create.mockReturnValue(mockEmbed);

      await command.execute(mockInteraction);

      expect(EarningsCalendar.getTodayEarnings).toHaveBeenCalled();
      expect(EarningsCalendarEmbed.create).toHaveBeenCalledWith(mockEarnings, expect.any(Date), 'day');
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: null,
        embeds: [mockEmbed]
      });
    });

    test('should handle no earnings found', async () => {
      EarningsCalendar.getTodayEarnings.mockResolvedValue([]);
      EarningsCalendarEmbed.create.mockReturnValue(null);

      await command.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('No major company earnings'),
        embeds: []
      });
    });

    test('should handle API errors', async () => {
      EarningsCalendar.getTodayEarnings.mockRejectedValue(new Error('API error'));

      await command.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('error occurred'),
        embeds: []
      });
    });
  });

  describe('Tomorrow Subcommand', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('tomorrow');
    });

    test('should fetch and display tomorrow earnings', async () => {
      const mockEarnings = [
        { symbol: 'MSFT', time: 'bmo', epsEstimate: '2.00' }
      ];
      const mockEmbed = { data: {} };

      EarningsCalendar.getTomorrowEarnings.mockResolvedValue(mockEarnings);
      EarningsCalendarEmbed.create.mockReturnValue(mockEmbed);

      await command.execute(mockInteraction);

      expect(EarningsCalendar.getTomorrowEarnings).toHaveBeenCalled();
      expect(EarningsCalendarEmbed.create).toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: null,
        embeds: [mockEmbed]
      });
    });

    test('should handle no earnings found', async () => {
      EarningsCalendar.getTomorrowEarnings.mockResolvedValue([]);
      EarningsCalendarEmbed.create.mockReturnValue(null);

      await command.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('No major company earnings'),
        embeds: []
      });
    });
  });

  describe('Week Subcommand', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('week');
    });

    test('should fetch and display week earnings', async () => {
      const mockWeekData = {
        monday: [{ symbol: 'AAPL', time: 'amc' }],
        tuesday: [],
        wednesday: [{ symbol: 'GOOGL', time: 'bmo' }],
        thursday: [],
        friday: []
      };
      const mockEmbed = { data: {} };

      EarningsCalendar.getWeekEarnings.mockResolvedValue(mockWeekData);
      EarningsCalendarEmbed.buildWeekEmbed.mockReturnValue(mockEmbed);

      await command.execute(mockInteraction);

      expect(EarningsCalendar.getWeekEarnings).toHaveBeenCalled();
      expect(EarningsCalendarEmbed.buildWeekEmbed).toHaveBeenCalledWith(mockWeekData, mockInteraction.client.botConfig);
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: null,
        embeds: [mockEmbed]
      });
    });

    test('should handle no earnings found', async () => {
      EarningsCalendar.getWeekEarnings.mockResolvedValue({});
      EarningsCalendarEmbed.buildWeekEmbed.mockReturnValue(null);

      await command.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('No major company earnings'),
        embeds: []
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('today');
    });

    test('should handle defer reply errors', async () => {
      mockInteraction.deferReply.mockRejectedValue(new Error('Already replied'));

      await expect(command.execute(mockInteraction)).rejects.toThrow('Already replied');
    });

    test('should propagate edit reply errors', async () => {
      EarningsCalendar.getTodayEarnings.mockResolvedValue([]);
      EarningsCalendarEmbed.create.mockReturnValue(null);
      mockInteraction.editReply.mockRejectedValue(new Error('Unknown interaction'));

      await expect(command.execute(mockInteraction)).rejects.toThrow('Unknown interaction');
    });
  });
});
