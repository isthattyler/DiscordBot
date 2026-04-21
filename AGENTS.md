## AGENTS.md: Operational Gotchas & Agent Mechanics Cheat Sheet

This document outlines the critical "how-to" procedures for controlling agent behavior, command deployment, and state management within the Discord Bot environment.

### 1. Initialization & Core Bootstrapping

*   **Execution Entry Point:** The bot *must* be started by executing `node index.js` (or using the specified dev script).
*   **Service Order Dependency:** Component loading is strictly sequential:
    1.  `index.js` initializes `TradingBot`.
    2.  `TradingBot` calls `CommandHandler.registerCommands()`.
    3.  `InteractionHandler` registers its listeners (handles interactions).
    4.  `onReady()` hook executes *after* initial command registration, running initial state exports and setting up the earnings calendar scheduler.
*   **Mandatory Variable Check:** The process *fails* or operates with degraded security if `DISCORD_OWNER_ID` (read via `config.getOwnerId()`) is not set in the environment/`.env` file.
*   **Earnings API Key:** The earnings calendar feature requires `ALPHA_VANTAGE_API_KEY` in `.env`. Without it, earnings commands will fail.

### 2. Command Deployment (The "API Gotcha")

*   **Deployment Mechanism:** Commands are *not* registered by simply updating documentation; they must be explicitly deployed to Discord's API endpoint.
*   **Required Action:** After any change to a command file (`src/commands/*.js`), the `CommandHandler.registerCommands()` method **must** be executed to call `rest.put(Routes.applicationCommands(...))`.
*   **Command Source:** The structure dictates that all command definitions must be manually instantiated and added to the `commandData` array within `CommandHandler.loadCommands()`. *Adding a new command requires edits in two places: the `require()` block and the `commandData.push()` block.*

### 3. Command Structure

| Command | Purpose | Authorization | Notes |
| :--- | :--- | :--- | :--- |
| `/long` | Send a long trading alert | Authorized users | Green embed with 📈. Replaces old `/alert position:long`. |
| `/short` | Send a short trading alert | Authorized users | Red embed with 📉. Replaces old `/alert position:short`. |
| `/comment` | Post trade comments | Authorized users | Broadcasts to all alert channels. |
| `/earnings` | View earnings calendar | Authorized users | Subcommands: `today`, `tomorrow`, `week`. |
| `/setup` | Configure channels & roles | Manage Channels | See setup subcommands below. |
| `/auth` | Manage bot access | Bot owner only | Add/remove authorized users. |
| `/access` | Create TV access panel | Authorized users | Creates TradingView script access UI. |

### 4. Setup Subcommands

**Alert Configuration:**
- `/setup alert-channel add <channel>` - Add a channel for trading alerts
- `/setup alert-channel remove <channel>` - Remove an alert channel
- `/setup alert-mention set <role>` - Set role to ping for alerts
- `/setup alert-mention remove` - Remove alert ping role

**Earnings Configuration:**
- `/setup earnings-channel set <channel>` - Set channel for daily earnings calendar
- `/setup earnings-channel remove` - Remove earnings channel
- `/setup earnings-mention set <role>` - Set role to ping for earnings
- `/setup earnings-mention remove` - Remove earnings ping role

**General:**
- `/setup view` - View all configuration (alerts + earnings)

### 5. Daily Earnings Calendar Scheduler

*   **Schedule:** Runs daily at **4:00 PM EST** (21:00 UTC) via `node-cron`.
*   **Mechanism:** `bot.js` → `setupEarningsScheduler()` → `broadcastEarningsCalendar()`
*   **Data Source:** Alpha Vantage `EARNINGS_CALENDAR` API (cached to `data/earnings_cache.json`).
*   **Filtering:** Only shows S&P 500 and Nasdaq 100 companies (defined in `data/sp500.json` and `data/nasdaq100.json`).
*   **Target:** Posts to configured `earningsChannel` in each server (set via `/setup earnings-channel set`).
*   **Ping:** Uses `earningsMentionRole` if configured (set via `/setup earnings-mention set`).
*   **Silent Skip:** If no major companies report the next day, **nothing is posted** (no message sent).
*   **Rate Limit:** Alpha Vantage free tier = 25 calls/day. Bot fetches once daily and caches, staying well under limit.

### 6. Advanced Multi-Step Workflow: Access Granting

This workflow is the most complex operational sequence and involves three distinct Discord interactions:

1.  **Trigger:** Must start via a pre-built `/select` menu interaction (e.g., `customId='access_script_select'`).
2.  **Step 1 (Initial View):** The `InteractionHandler.handleSelectMenu` intercepts the select change and presents a `ModalBuilder`.
3.  **Step 2 (Data Input):** The user submits the modal, which contains the `username` field.
4.  **Step 3 (Backend Execution):** The `InteractionHandler.handleModalSubmit` intercepts the submission and delegates the core logic to `AccessManager.grantAccess(scriptName, username)`.
    *   **Execution Detail:** The entire process *must* rely on `await interaction.deferReply({ ephemeral: true })` before calling `AccessManager` to prevent API timeouts.

### 7. State Management & State Retrieval

*   **Configuration Source:** The primary, customizable bot settings (Name, Color, etc.) are loaded from `config/config.yml`.
*   **Secret/Credential Source:** API tokens and Owner IDs rely on external environment variables read by `config.js` (i.e., accessing `.env` or `process.env`).
*   **Persistent Context:** The bot maintains two primary persistent states that must be known/read:
    *   **Guild Structure:** Channel list mapping is loaded from `config/channels.json`.
    *   **API Tokens:** The bot uses tokens from `config.js` for all Discord API interactions (`rest.put`, `client.login`).

### 8. Testing

**Framework:** Jest  
**Run Tests:** `npm test`  
**Watch Mode:** `npm run test:watch`  
**Coverage Report:** Generated in `coverage/` directory after running tests

#### Test Structure

```
tests/
├── mocks/
│   ├── discordjs.js          # Discord.js class mocks
│   ├── alphaVantageMock.js   # API response mocks
│   └── fs.js                 # File system mocks
├── smoke/
│   └── bot.smoke.test.js     # Module loading tests
└── unit/
    ├── commands/             # Command unit tests
    ├── embeds/               # Embed builder tests
    ├── utils/                # Utility class tests
    └── handlers/             # Handler tests
```

#### Testing Pattern: Singleton Initialization

Utilities use explicit `init()` for testability:

```javascript
// In production (bot.js)
await channelManager.init();
await authManager.init();
await earningsCalendar.init();

// In tests
beforeEach(async () => {
  jest.resetModules();
  delete require.cache[require.resolve('path/to/module')];
  const Module = require('path/to/module');
  await Module.init();
});
```

#### Coverage Targets

| Module Type | Target | Current Status |
|-------------|--------|----------------|
| Embeds | 90%+ | ✅ 85%+ |
| Utils | 80%+ | ⚠️ 35% |
| Commands | 75%+ | ❌ <20% |
| Handlers | 60%+ | ❌ 0% |
| **Overall** | **80%+** | **~35%** |

#### Mocking External Dependencies

**Alpha Vantage API:**
```javascript
jest.mock('axios', () => ({
  get: jest.fn()
}));

// In test
axios.get.mockResolvedValueOnce({ data: mockCSV });
```

**File System:**
```javascript
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn()
  }
}));

// In test
fs.readFile.mockResolvedValueOnce(JSON.stringify(data));
```

#### Running Specific Tests

```bash
# Run specific test file
npm test -- tradingAlertEmbed

# Run test suite by pattern
npm test -- channelManager

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm run test:watch
```

#### Test Limitations

1. **Singleton Pattern:** Some utilities (ChannelManager, AuthManager) are singletons, making complete isolation difficult. Tests use `jest.resetModules()` and `delete require.cache` to work around this.

2. **Discord.js Integration:** Full integration tests require a real Discord client. Current tests mock Discord.js classes.

3. **API Rate Limits:** Alpha Vantage API is always mocked in tests to preserve the 25 calls/day free tier limit.

#### Adding New Tests

1. **For Commands:** Test authorization checks, option parsing, embed creation, and error handling
2. **For Embeds:** Test field generation, color selection, conditional field display
3. **For Utils:** Test pure functions (parsing, filtering, formatting) over I/O operations
4. **For Handlers:** Test interaction routing and error recovery

### 9. Common Troubleshooting

**Earnings commands not working:**
- Check `ALPHA_VANTAGE_API_KEY` is set in `.env`
- Verify API key is valid (test at alphavantage.co)
- Check `data/sp500.json` and `data/nasdaq100.json` exist

**Daily auto-post not running:**
- Check bot was running at 4:00 PM EST
- Verify `earningsChannel` is configured in the server
- Check console logs for scheduler initialization message

**Commands not appearing in Discord:**
- Run bot to execute `CommandHandler.registerCommands()`
- Wait up to 1 hour for Discord to propagate global commands
- Try kicking and re-inviting the bot to force refresh

**Authorization errors:**
- Verify `DISCORD_OWNER_ID` is set in `.env`
- Use `/auth add @user` to authorize additional users
- Only bot owner can use `/auth` commands
