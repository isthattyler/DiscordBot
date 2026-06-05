const AccessCommand = require('../../../src/commands/AccessCommand');
const AuthManager = require('../../../src/utils/AuthManager');
const AccessManager = require('../../../src/utils/AccessManager');

jest.mock('../../../src/utils/AuthManager');
jest.mock('../../../src/utils/AccessManager');

describe('AccessCommand', () => {
  let command;
  let mockInteraction;
  let mockChannel;

  beforeEach(() => {
    jest.resetAllMocks();
    command = new AccessCommand();

    mockChannel = {
      send: jest.fn().mockResolvedValue()
    };

    mockInteraction = {
      guildId: 'guild-123',
      user: { id: 'user-123' },
      channel: mockChannel,
      reply: jest.fn().mockResolvedValue()
    };

    AuthManager.isAuthorized.mockReturnValue(true);
    AccessManager.getAvailableScripts.mockReturnValue(['Script 1', 'Script 2']);
  });

  describe('Command Structure', () => {
    test('should have correct command name', () => {
      expect(command.data.name).toBe('access');
    });

    test('should have correct description', () => {
      expect(command.data.description).toContain('TradingView access panel');
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

      await command.execute(mockInteraction);

      expect(mockChannel.send).toHaveBeenCalled();
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          ephemeral: true
        })
      );
    });
  });

  describe('Panel Creation', () => {
    test('should get available scripts', async () => {
      await command.execute(mockInteraction);

      expect(AccessManager.getAvailableScripts).toHaveBeenCalled();
    });

    test('should send embed with correct title', async () => {
      await command.execute(mockInteraction);

      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringContaining('TradingView Scripts')
              })
            })
          ])
        })
      );
    });

    test('should include script list in embed', async () => {
      AccessManager.getAvailableScripts.mockReturnValue(['RSI Strategy', 'MACD Pro']);

      await command.execute(mockInteraction);

      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                fields: expect.arrayContaining([
                  expect.objectContaining({
                    value: expect.stringContaining('RSI Strategy')
                  })
                ])
              })
            })
          ])
        })
      );
    });

    test('should send with select menu component', async () => {
      await command.execute(mockInteraction);

      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.arrayContaining([
            expect.objectContaining({
              components: expect.arrayContaining([
                expect.objectContaining({
                  data: expect.objectContaining({
                    custom_id: 'access_script_select'
                  })
                })
              ])
            })
          ])
        })
      );
    });

    test('should send confirmation message', async () => {
      await command.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Access panel created'),
          ephemeral: true
        })
      );
    });

    test('should send panel to channel (not ephemeral)', async () => {
      await command.execute(mockInteraction);

      expect(mockChannel.send).toHaveBeenCalled();
      expect(mockChannel.send.mock.calls[0][0]).not.toHaveProperty('ephemeral');
    });
  });

  describe('Select Menu Options', () => {
    test('should create option for each script', async () => {
      AccessManager.getAvailableScripts.mockReturnValue(['Script A', 'Script B', 'Script C']);

      await command.execute(mockInteraction);

      expect(AccessManager.getAvailableScripts).toHaveBeenCalled();
      expect(mockChannel.send).toHaveBeenCalled();
    });

    test('should set correct placeholder text', async () => {
      await command.execute(mockInteraction);

      const callArgs = mockChannel.send.mock.calls[0][0];
      const selectMenu = callArgs.components[0].components[0];

      expect(selectMenu.data.placeholder).toBe('Select a TradingView script');
    });
  });

  describe('Empty Scripts List', () => {
    test('should handle empty scripts list', async () => {
      AccessManager.getAvailableScripts.mockReturnValue([]);

      await command.execute(mockInteraction);

      expect(mockChannel.send).toHaveBeenCalled();
      expect(mockInteraction.reply).toHaveBeenCalled();
    });
  });
});
