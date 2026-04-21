# Discord Trading Bot

A feature-rich Discord bot for broadcasting trading alerts and earnings calendars to multiple servers.

## Features

- 📈 **Trading Alerts** - Send long/short trading alerts with entry, stoploss, and target prices
- 📅 **Earnings Calendar** - Daily auto-post of S&P 500 and Nasdaq 100 earnings
- 🎯 **Multi-Server Support** - Broadcast to multiple Discord servers simultaneously
- 🔐 **Authorization System** - Control who can use the bot
- 📊 **TradingView Integration** - Manage Pine Script access requests
- ⏰ **Automated Scheduling** - Daily earnings posts at 4:00 PM EST

## Quick Start

### Prerequisites

- Node.js 16.9.0 or higher
- Discord Bot Token
- Alpha Vantage API Key (free)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd discord-trading-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy `.env.example` to `.env` and fill in your values:
   ```env
   DISCORD_TOKEN=your_discord_bot_token
   DISCORD_CLIENT_ID=your_discord_client_id
   DISCORD_OWNER_ID=your_discord_user_id
   ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key
   ```

4. **Start the bot**
   ```bash
   npm start
   ```

### Development Mode

For auto-restart on file changes:
```bash
npm run dev
```

## Commands

### Trading Commands

#### `/long`
Send a long (bullish) trading alert.

**Options:**
- `ticker` (required): The ticker symbol (e.g., MNQ, ES, NQ)
- `entry` (required): Entry price
- `stoploss` (optional): Stop loss price
- `target` (optional): Target/take profit price
- `image` (optional): Chart or screenshot

**Example:**
```
/long ticker:MNQ entry:12345 stoploss:12300 target:12400
```

#### `/short`
Send a short (bearish) trading alert.

**Options:** Same as `/long`

**Example:**
```
/short ticker:ES entry:4500 stoploss:4510 target:4490
```

#### `/comment`
Post a trade comment or analysis to all configured servers.

**Options:**
- `message` (required): Your comment or analysis
- `image` (optional): Chart or screenshot

**Example:**
```
/comment message:Looking for a retest of support at 12300
```

### Earnings Commands

#### `/earnings today`
View today's earnings for S&P 500 and Nasdaq 100 companies.

#### `/earnings tomorrow`
View tomorrow's earnings.

#### `/earnings week`
View this week's earnings calendar.

### Setup Commands

#### `/setup alert-channel add <channel>`
Add a channel for trading alerts.

#### `/setup alert-channel remove <channel>`
Remove a channel from alert configuration.

#### `/setup alert-mention set <role>`
Set a role to mention with trading alerts (e.g., @Traders).

#### `/setup alert-mention remove`
Remove the alert mention role.

#### `/setup earnings-channel set <channel>`
Set a channel for daily earnings calendar posts.

#### `/setup earnings-channel remove`
Remove the earnings channel.

#### `/setup earnings-mention set <role>`
Set a role to mention with earnings posts (e.g., @Earnings Watchers).

#### `/setup earnings-mention remove`
Remove the earnings mention role.

#### `/setup view`
View the current bot configuration for your server.

### Management Commands

#### `/auth add <user>`
Authorize a user to use the bot (owner only).

#### `/auth remove <user>`
Remove authorization from a user (owner only).

#### `/auth list`
List all authorized users (owner only).

#### `/access`
Create a TradingView script access request panel in the current channel.

## Configuration

### config.yml

Customize bot appearance in `config/config.yml`:

```yaml
bot:
  name: "Quantum VWAP Trading Alerts"
  icon_url: "https://example.com/icon.png"
  embed_color: "#5865F2"

alerts:
  footer_text: "I am not a financial advisor. For educational purposes only."
```

### channels.json

Automatically managed by the bot via `/setup` commands. Stores:
- Alert channels per guild
- Alert mention roles
- Earnings channels per guild
- Earnings mention roles

## Daily Earnings Calendar

The bot automatically posts earnings calendars every day at **4:00 PM EST**.

**Features:**
- Filters for S&P 500 and Nasdaq 100 companies only
- Splits into Pre-Market and Post-Market sections
- Posts to configured `earnings-channel` in each server
- Optionally pings configured `earnings-mention-role`
- **Silent skip** on days with no major earnings (no message sent)

**Data Source:** Alpha Vantage Earnings Calendar API (free tier, 25 calls/day limit)

**Caching:** Fetched once daily and cached to `data/earnings_cache.json`

## Testing

Run the test suite:

```bash
npm test
```

Watch mode for development:

```bash
npm run test:watch
```

### Test Coverage

- **Smoke Tests:** Verify bot initialization and command registration
- **Unit Tests:** Test individual components (commands, embeds, utilities)
- **Mocked API:** Alpha Vantage API is mocked to preserve rate limits

## Troubleshooting

### Commands not appearing in Discord

1. Ensure the bot has the `applications.commands` scope when invited
2. Wait up to 1 hour for Discord to propagate global commands
3. Try kicking and re-inviting the bot

### Earnings commands failing

1. Check `ALPHA_VANTAGE_API_KEY` is set in `.env`
2. Verify API key is valid (test at [alphavantage.co](https://www.alphavantage.co))
3. Ensure `data/sp500.json` and `data/nasdaq100.json` exist

### Authorization errors

1. Verify `DISCORD_OWNER_ID` is set in `.env`
2. Use `/auth add @user` to authorize additional users
3. Only the bot owner can use `/auth` commands

### Daily auto-post not running

1. Ensure the bot is running at 4:00 PM EST
2. Verify `earnings-channel` is configured in the server
3. Check console logs for scheduler initialization message

## Project Structure

See [STRUCTURE.md](STRUCTURE.md) for a detailed breakdown of the project files.

## Agent Documentation

See [AGENTS.md](AGENTS.md) for operational procedures and gotchas.

## License

This project is for educational purposes only. Trading involves risk.

## Support

For issues or questions, please open an issue in the repository.
