describe('ConfigLoader', () => {
  let config;
  let mockConfigData;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    mockConfigData = {
      bot: {
        name: 'Test Bot',
        icon_url: 'https://example.com/icon.png',
        embed_color: 0x0099ff
      },
      alerts: {
        footer_text: 'Trade Alert'
      }
    };

    jest.mock('fs', () => ({
      readFileSync: jest.fn().mockReturnValue('yaml content')
    }));

    jest.mock('js-yaml', () => ({
      load: jest.fn().mockReturnValue(mockConfigData)
    }));

    jest.mock('dotenv', () => ({
      config: jest.fn()
    }));

    process.env.DISCORD_TOKEN = 'test-token';
    process.env.DISCORD_CLIENT_ID = 'test-client-id';
    process.env.DISCORD_OWNER_ID = 'test-owner-id';

    config = require('../../../src/utils/ConfigLoader');
  });

  afterEach(() => {
    delete process.env.DISCORD_TOKEN;
    delete process.env.DISCORD_CLIENT_ID;
    delete process.env.DISCORD_OWNER_ID;
  });

  describe('GetToken', () => {
    test('should return Discord token', () => {
      const token = config.getToken();

      expect(token).toBe('test-token');
    });
  });

  describe('GetClientId', () => {
    test('should return client ID', () => {
      const clientId = config.getClientId();

      expect(clientId).toBe('test-client-id');
    });
  });

  describe('GetOwnerId', () => {
    test('should return owner ID', () => {
      const ownerId = config.getOwnerId();

      expect(ownerId).toBe('test-owner-id');
    });
  });

  describe('Get', () => {
    test('should return bot config', () => {
      const botConfig = config.get('bot');

      expect(botConfig).toEqual(mockConfigData.bot);
    });

    test('should return alerts config', () => {
      const alertsConfig = config.get('alerts');

      expect(alertsConfig).toEqual(mockConfigData.alerts);
    });
  });

  describe('GetEnv', () => {
    test('should return environment variable', () => {
      const token = config.getEnv('DISCORD_TOKEN');

      expect(token).toBe('test-token');
    });
  });
});
