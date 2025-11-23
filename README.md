# Discord Trading Alert Bot

A professional Discord bot for sending trading alerts with slash commands.

## 📁 Project Structure

```
discord-trading-bot/
├── src/
│   ├── bot.js                    # Main bot class
│   ├── commands/
│   │   ├── AlertCommand.js       # Alert command logic
│   │   ├── AuthCommand.js        # Authentication setup command
│   │   ├── SetupCommand.js       # Channel setup command
│   │   └── CommentCommand.js     # Trade comment command
│   ├── embeds/
│   │   ├── TradingAlertEmbed.js  # Alert embed builder
│   │   └── CommentEmbed.js       # Comment embed builder
│   ├── handlers/
│   │   └── CommandHandler.js     # Command registration & handling
│   └── utils/
│       ├── ConfigLoader.js       # Config & env management
│       ├── AuthManager.js        # Auth management
│       └── ChannelManager.js     # Channel configuration manager
├── config/
│   └── config.yaml               # Bot configuration
├── .env                          # Environment variables (tokens)
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore rules
├── index.js                      # Entry point
└── package.json
```

## 🚀 Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd discord-trading-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your Discord bot token and client ID

4. **Update configuration**
   Edit `config/config.yaml` to customize bot settings

5. **Run the bot**
   ```bash
   npm start
   ```

## 🔧 Commands

### `/setup add`
Add a channel for trading alerts (does not remove existing channels)
```
/setup add channel: #trading-alerts
```

### `/setup change`
Swap one channel for another (replaces specific channel only)
```
/setup change old-channel: #old-alerts new-channel: #new-alerts
```

### `/setup remove`
Remove a specific channel from the alert list
```
/setup remove channel: #trading-alerts
```

### `/setup remove-all`
Remove all configured channels at once
```
/setup remove-all
```

### `/setup mention`
Set the role to mention with every alert
```
/setup mention role: @everyone
/setup mention role: @Traders
```

### `/setup remove-mention`
Remove the mention role from alerts
```
/setup remove-mention
```

### `/setup view`
View the current bot configuration
```
/setup view
```

### `/alert`
Send a trading alert to all configured channels
```
/alert 
  ticker: MNQ
  position: long last long
  entry: 23950
  stoploss: 23920
  target: 24000 (optional)
```

### `/comment`
Post a comment or analysis about a trade to all configured channels
```
/comment 
  ticker: MNQ (optional)
  message: Price breaking above resistance, momentum increasing
```

## 📝 Adding New Commands

1. Create a new command class in `src/commands/`
2. Follow the pattern in `AlertCommand.js`
3. Register it in `src/handlers/CommandHandler.js`

## 🔒 Security

- Never commit your `.env` file
- Keep your bot token secure
- Review the `.gitignore` file to ensure sensitive data is excluded

## 📦 Dependencies

- discord.js - Discord API wrapper
- dotenv - Environment variable management
- js-yaml - YAML configuration parser

## ✨ Features

✅ Multiple slash commands (/alert, /setup, /comment)
✅ Multi-channel support (send alerts to multiple channels)
✅ Role mention system (@everyone, custom roles)
✅ Persistent file storage (config/channels.json)
✅ Channel configuration system
✅ Trading alerts with custom formatting
✅ Trade comments and analysis
✅ Permission checks
✅ Error handling
✅ Clean separation of concerns
✅ Auto-cleanup for deleted channels/roles

## 📝 Notes

- The bot stores channel configurations persistently in `config/channels.json`
- Supports multiple channels per server - alerts are sent to all configured channels
- Only users with "Manage Channels" permission can use `/setup` commands
- Role mentions (like @everyone) will be included with every alert/comment
- If no channels are configured, alerts are sent to the current channel
- Auto-cleanup: Deleted channels/roles are automatically removed from configuration

### Configuration File Format
The bot stores configurations in `config/channels.json`:
```json
{
  "server_id_1": {
    "channels": ["channel_id_1", "channel_id_2"],
    "mentionRole": "role_id"
  },
  "server_id_2": {
    "channels": ["channel_id_1"],
    "mentionRole": null
  }
}
```

## 📄 License

MIT License - feel free to use this project however you'd like!
*/

// ============================================
// Installation & Setup Instructions
// ============================================
/*
1. Install dependencies:
   npm install discord.js dotenv js-yaml

2. Create .env file from template:
   cp .env.example .env
   
   Then edit .env and add:
   DISCORD_TOKEN=your_bot_token_here
   DISCORD_CLIENT_ID=your_client_id_here
   NODE_ENV=development

3. Create config/config.yaml file with the configuration above

4. Run the bot:
   npm start

5. Initialize git (if needed):
   git init
   git add .
   git commit -m "Initial commit"

Project Benefits:
✅ Object-oriented design
✅ Separation of concerns
✅ Easy to extend with new commands
✅ Secure token management
✅ Clean code organization
✅ Easy to test and maintain
✅ Git-ready with proper .gitignore