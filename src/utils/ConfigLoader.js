const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
require('dotenv').config();

class ConfigLoader {
  constructor() {
    this.config = null;
    this.loadConfig();
  }

  loadConfig() {
    try {
      const configPath = path.join(__dirname, '../../config/config.yml');
      const fileContents = fs.readFileSync(configPath, 'utf8');
      this.config = yaml.load(fileContents);
      console.log('✅ Configuration loaded successfully');
    } catch (error) {
      console.error('❌ Error loading config:', error);
      process.exit(1);
    }
  }

  get(key) {
    return this.config[key];
  }

  getEnv(key) {
    return process.env[key];
  }

  getToken() {
    return this.getEnv('DISCORD_TOKEN');
  }

  getClientId() {
    return this.getEnv('DISCORD_CLIENT_ID');
  }

  getOwnerId() {
    return this.getEnv('DISCORD_OWNER_ID');
  }
}

module.exports = new ConfigLoader();