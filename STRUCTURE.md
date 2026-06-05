# Project Structure

This document provides a comprehensive overview of the Discord Trading Bot project structure.

## Directory Tree

```
discord-trading-bot/
├── config/
│   ├── config.yml              # Bot name, colors, alert settings
│   ├── channels.json           # Guild channel & role configurations
│   └── pine_scripts.json       # Available TradingView scripts
├── data/
│   ├── sp500.json              # S&P 500 ticker list
│   ├── nasdaq100.json          # Nasdaq 100 ticker list
│   └── earnings_cache.json     # Cached Alpha Vantage data (auto-generated)
├── src/
│   ├── bot.js                  # TradingBot class, event listeners, scheduler
│   ├── commands/
│   │   ├── LongCommand.js      # /long — green trading alert
│   │   ├── ShortCommand.js     # /short — red trading alert
│   │   ├── CommentCommand.js   # /comment — trade comments
│   │   ├── EarningsCommand.js  # /earnings today/tomorrow/week
│   │   ├── SetupCommand.js     # /setup — channel & role configuration
│   │   ├── AuthCommand.js      # /auth — user authorization
│   │   └── AccessCommand.js    # /access — TradingView access panel
│   ├── embeds/
│   │   ├── TradingAlertEmbed.js    # Long/Short embed builder
│   │   ├── CommentEmbed.js         # Comment embed builder
│   │   └── EarningsCalendarEmbed.js # Earnings embed builder
│   ├── handlers/
│   │   ├── CommandHandler.js   # Slash command registration & routing
│   │   └── InteractionHandler.js # Select menus & modal submissions
│   └── utils/
│       ├── ConfigLoader.js     # Loads config.yml & .env
│       ├── ChannelManager.js   # Guild channel/role persistence
│       ├── AuthManager.js      # Authorized user management
│       ├── AccessManager.js    # TradingView access logic
│       └── EarningsCalendar.js # Alpha Vantage API, filter, cache
├── tests/
│   ├── mocks/
│   │   └── alphaVantageMock.js # Mocked API responses
│   ├── smoke/
│   │   └── bot.smoke.test.js   # Bot initialization tests
│   └── unit/
│       ├── earningsCalendar.test.js
│       ├── commands/
│       │   ├── longCommand.test.js
│       │   ├── shortCommand.test.js
│       │   ├── earningsCommand.test.js
│       │   └── setupCommand.test.js
│       ├── embeds/
│       │   └── tradingAlertEmbed.test.js
│       └── utils/
│           └── channelManager.test.js
├── index.js                    # Entry point
├── package.json                # Dependencies & scripts
├── jest.config.js              # Jest test configuration
├── .env.example                # Environment variable template
├── AGENTS.md                   # Agent-specific operational guide
├── STRUCTURE.md                # This file
└── README.md                   # User-facing documentation
```

## File Descriptions

### Configuration Files

| File | Purpose |
|------|---------|
| `config/config.yml` | Bot name, embed colors, footer text, alert settings |
| `config/channels.json` | Persistent storage for guild channel and role configurations |
| `config/pine_scripts.json` | List of available TradingView Pine Scripts for access management |
| `.env.example` | Template for required environment variables |

### Data Files

| File | Purpose |
|------|---------|
| `data/sp500.json` | Array of S&P 500 ticker symbols for earnings filtering |
| `data/nasdaq100.json` | Array of Nasdaq 100 ticker symbols for earnings filtering |
| `data/earnings_cache.json` | Auto-generated cache of Alpha Vantage earnings data |

### Core Application

| File | Purpose |
|------|---------|
| `index.js` | Application entry point, initializes TradingBot |
| `src/bot.js` | Main TradingBot class, Discord client setup, event listeners, earnings scheduler |

### Commands

| File | Purpose |
|------|---------|
| `src/commands/LongCommand.js` | `/long` - Send long trading alerts (green embed) |
| `src/commands/ShortCommand.js` | `/short` - Send short trading alerts (red embed) |
| `src/commands/CommentCommand.js` | `/comment` - Post trade comments to all servers |
| `src/commands/EarningsCommand.js` | `/earnings` - View upcoming earnings (today/tomorrow/week) |
| `src/commands/SetupCommand.js` | `/setup` - Configure channels and mention roles |
| `src/commands/AuthCommand.js` | `/auth` - Manage authorized users (owner only) |
| `src/commands/AccessCommand.js` | `/access` - Create TradingView access request panel |

### Embeds

| File | Purpose |
|------|---------|
| `src/embeds/TradingAlertEmbed.js` | Builds trading alert embeds with direction-based colors |
| `src/embeds/CommentEmbed.js` | Builds comment/trade analysis embeds |
| `src/embeds/EarningsCalendarEmbed.js` | Builds earnings calendar embeds (pre/post market) |

### Handlers

| File | Purpose |
|------|---------|
| `src/handlers/CommandHandler.js` | Registers slash commands with Discord API, routes interactions |
| `src/handlers/InteractionHandler.js` | Handles select menu and modal submit interactions |

### Utilities

| File | Purpose |
|------|---------|
| `src/utils/ConfigLoader.js` | Loads configuration from YAML and environment variables |
| `src/utils/ChannelManager.js` | Manages guild channel and role configurations (persistent) |
| `src/utils/AuthManager.js` | Manages user authorization and bot ownership |
| `src/utils/AccessManager.js` | Manages TradingView script access granting |
| `src/utils/EarningsCalendar.js` | Fetches, filters, and caches earnings data from Alpha Vantage |

### Tests

| File | Purpose |
|------|---------|
| `tests/mocks/alphaVantageMock.js` | Mocked Alpha Vantage API responses for testing |
| `tests/smoke/bot.smoke.test.js` | Smoke tests for bot initialization |
| `tests/unit/earningsCalendar.test.js` | Unit tests for earnings fetching and filtering |
| `tests/unit/commands/*.test.js` | Unit tests for individual commands |
| `tests/unit/embeds/*.test.js` | Unit tests for embed builders |
| `tests/unit/utils/*.test.js` | Unit tests for utility classes |

## Key Dependencies

| Dependency | Purpose |
|------------|---------|
| `discord.js` | Discord API wrapper |
| `axios` | HTTP client for Alpha Vantage API |
| `node-cron` | Scheduler for daily earnings auto-post |
| `js-yaml` | YAML parser for config.yml |
| `dotenv` | Environment variable loader |
| `jest` | Testing framework |

## npm Scripts

```json
{
  "start": "node index.js",
  "dev": "nodemon index.js",
  "test": "jest --coverage --verbose",
  "test:watch": "jest --watch"
}
```

## Environment Variables

Required variables in `.env`:

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_OWNER_ID=your_discord_user_id
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key
```

## Data Flow

### Trading Alert Flow
```
User runs /long or /short
    → Command validates authorization
    → TradingAlertEmbed creates embed (green/red based on direction)
    → ChannelManager retrieves all configured alert channels
    → Bot broadcasts to all channels with optional mention role
```

### Earnings Calendar Flow
```
Daily at 4:00 PM EST (node-cron)
    → EarningsCalendar.fetch() calls Alpha Vantage API
    → Filters by S&P 500 + Nasdaq 100 tickers
    → Caches to data/earnings_cache.json
    → Bot broadcasts to configured earnings channels
    → Silent skip if no major companies reporting
```

### Command Registration Flow
```
Bot starts
    → CommandHandler.loadCommands() instantiates all commands
    → CommandHandler.registerCommands() pushes to Discord API
    → Commands available in Discord servers (~1 hour propagation)
```
