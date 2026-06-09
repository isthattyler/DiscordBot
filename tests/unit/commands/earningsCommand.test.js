const EarningsCommand = require('../../../src/commands/EarningsCommand');
const EarningsCalendar = require('../../../src/utils/EarningsCalendar');
const EarningsCalendarEmbed = require('../../../src/embeds/EarningsCalendarEmbed');
const EarningsImageGenerator = require('../../../src/utils/EarningsImageGenerator');

jest.mock('../../../src/utils/EarningsCalendar');
jest.mock('../../../src/embeds/EarningsCalendarEmbed');
jest.mock('../../../src/utils/EarningsImageGenerator');

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

  describe('Today Subcommand', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('today');
      EarningsImageGenerator.init.mockResolvedValue();
      EarningsImageGenerator.generateDailyImage.mockResolvedValue(Buffer.from('fake-image'));
    });

    test('should fetch and display today earnings', async () => {
      const mockEarnings = {
        preMarket: [{ symbol: 'AAPL', estimate: '1.50' }],
        postMarket: []
      };
      const mockEmbed = { data: {} };
      const mockAttachment = { name: 'earnings.png' };

      EarningsCalendar.getTodayEarnings.mockResolvedValue(mockEarnings);
      EarningsCalendarEmbed.createDailyImageEmbed.mockReturnValue({ embed: mockEmbed, attachment: mockAttachment });

      await command.execute(mockInteraction);

      expect(EarningsCalendar.getTodayEarnings).toHaveBeenCalled();
      expect(EarningsImageGenerator.generateDailyImage).toHaveBeenCalledWith(mockEarnings, expect.any(Date));
      expect(EarningsCalendarEmbed.createDailyImageEmbed).toHaveBeenCalledWith(expect.any(Buffer), expect.any(Date));
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: null,
        embeds: [mockEmbed],
        files: [mockAttachment]
      });
    });

    test('should handle no earnings found', async () => {
      EarningsCalendar.getTodayEarnings.mockResolvedValue({ preMarket: [], postMarket: [] });

      await command.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('No major company earnings'),
        embeds: [],
        files: []
      });
    });

    test('should handle API errors', async () => {
      EarningsCalendar.getTodayEarnings.mockRejectedValue(new Error('API error'));

      await command.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('error occurred'),
        embeds: [],
        files: []
      });
    });
  });

  describe('Tomorrow Subcommand', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('tomorrow');
      EarningsImageGenerator.init.mockResolvedValue();
      EarningsImageGenerator.generateDailyImage.mockResolvedValue(Buffer.from('fake-image'));
    });

    test('should fetch and display tomorrow earnings', async () => {
      const mockEarnings = {
        preMarket: [],
        postMarket: [{ symbol: 'MSFT', estimate: '2.00' }]
      };
      const mockEmbed = { data: {} };
      const mockAttachment = { name: 'earnings.png' };

      EarningsCalendar.getTomorrowEarnings.mockResolvedValue(mockEarnings);
      EarningsCalendarEmbed.createDailyImageEmbed.mockReturnValue({ embed: mockEmbed, attachment: mockAttachment });

      await command.execute(mockInteraction);

      expect(EarningsCalendar.getTomorrowEarnings).toHaveBeenCalled();
      expect(EarningsImageGenerator.generateDailyImage).toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: null,
        embeds: [mockEmbed],
        files: [mockAttachment]
      });
    });

    test('should handle no earnings found', async () => {
      EarningsCalendar.getTomorrowEarnings.mockResolvedValue({ preMarket: [], postMarket: [] });

      await command.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('No major company earnings'),
        embeds: [],
        files: []
      });
    });
  });

  describe('Week Subcommand', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('week');
      EarningsImageGenerator.init.mockResolvedValue();
      EarningsImageGenerator.generateWeeklyImage.mockResolvedValue(Buffer.from('fake-image'));
    });

    test('should fetch and display week earnings', async () => {
      const mockWeekData = {
        '2026-04-20': [{ symbol: 'AAPL', time: 'amc' }],
        '2026-04-21': [],
        '2026-04-22': [{ symbol: 'GOOGL', time: 'bmo' }],
        '2026-04-23': [],
        '2026-04-24': []
      };
      const mockEmbed = { data: {} };
      const mockAttachment = { name: 'earnings_weekly.png' };

      EarningsCalendar.getWeekEarnings.mockResolvedValue(mockWeekData);
      EarningsCalendarEmbed.createWeeklyImageEmbed.mockReturnValue({ embed: mockEmbed, attachment: mockAttachment });

      await command.execute(mockInteraction);

      expect(EarningsCalendar.getWeekEarnings).toHaveBeenCalled();
      expect(EarningsImageGenerator.generateWeeklyImage).toHaveBeenCalledWith(mockWeekData);
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: null,
        embeds: [mockEmbed],
        files: [mockAttachment]
      });
    });

    test('should handle no earnings found', async () => {
      EarningsCalendar.getWeekEarnings.mockResolvedValue({});

      await command.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('No major company earnings'),
        embeds: [],
        files: []
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('today');
      EarningsImageGenerator.init.mockResolvedValue();
      EarningsImageGenerator.generateDailyImage.mockResolvedValue(Buffer.from('fake-image'));
    });

    test('should handle defer reply errors', async () => {
      mockInteraction.deferReply.mockRejectedValue(new Error('Already replied'));

      await expect(command.execute(mockInteraction)).rejects.toThrow('Already replied');
    });

    test('should propagate edit reply errors', async () => {
      EarningsCalendar.getTodayEarnings.mockResolvedValue({ preMarket: [], postMarket: [] });
      mockInteraction.editReply.mockRejectedValue(new Error('Unknown interaction'));

      await expect(command.execute(mockInteraction)).rejects.toThrow('Unknown interaction');
    });
  });
});
