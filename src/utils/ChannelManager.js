const fs = require('fs').promises;
const path = require('path');

class ChannelManager {
  constructor() {
    // Structure: Map<guildId, { earningsChannel, earningsMentionRole, users: Map<userId, { channels, mentionRole }> }>
    this.configurations = new Map();
    this.configFile = path.join(__dirname, '../../config/channels.json');
    this.initialized = false;
  }

  async init(ownerId) {
    if (this.initialized) return;
    await this.loadConfigurations(ownerId);
    this.initialized = true;
  }

  async loadConfigurations(ownerId) {
    try {
      const data = await fs.readFile(this.configFile, 'utf8');
      let parsed = JSON.parse(data);

      // Detect and migrate old format (no 'users' key at guild level)
      let migrated = false;
      for (const [guildId, guildConfig] of Object.entries(parsed)) {
        if (!guildConfig.users && (guildConfig.channels || guildConfig.mentionRole)) {
          // Old format: guildId -> { channels, mentionRole, earningsChannel, earningsMentionRole }
          // Migrate to new format: guildId -> { earningsChannel, earningsMentionRole, users: { ownerId: { channels, mentionRole } } }
          parsed[guildId] = {
            earningsChannel: guildConfig.earningsChannel || null,
            earningsMentionRole: guildConfig.earningsMentionRole || null,
            users: {}
          };
          if (ownerId) {
            parsed[guildId].users[ownerId] = {
              channels: guildConfig.channels || [],
              mentionRole: guildConfig.mentionRole || null
            };
          }
          migrated = true;
        }
      }

      if (migrated) {
        await fs.writeFile(this.configFile, JSON.stringify(parsed, null, 2), 'utf8');
        console.log('🔄 Migrated channel config to per-user format');
      }

      // Parse into internal structure
      this.configurations = new Map();
      for (const [guildId, guildConfig] of Object.entries(parsed)) {
        const users = new Map();
        if (guildConfig.users) {
          for (const [userId, userConfig] of Object.entries(guildConfig.users)) {
            users.set(userId, {
              channels: userConfig.channels || [],
              mentionRole: userConfig.mentionRole || null
            });
          }
        }
        this.configurations.set(guildId, {
          earningsChannel: guildConfig.earningsChannel || null,
          earningsMentionRole: guildConfig.earningsMentionRole || null,
          users
        });
      }

      console.log('✅ Channel configurations loaded from file');
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('📝 No existing configuration file found, starting fresh');
        this.configurations = new Map();
      } else {
        console.error('❌ Error loading configurations:', error);
      }
    }
  }

  _getGuildConfig(guildId) {
    if (!this.configurations.has(guildId)) {
      this.configurations.set(guildId, {
        earningsChannel: null,
        earningsMentionRole: null,
        users: new Map()
      });
    }
    return this.configurations.get(guildId);
  }

  _getUserConfig(guildId, userId) {
    const guildConfig = this._getGuildConfig(guildId);
    if (!guildConfig.users.has(userId)) {
      guildConfig.users.set(userId, {
        channels: [],
        mentionRole: null
      });
    }
    return guildConfig.users.get(userId);
  }

  async _saveToFile() {
    try {
      const obj = {};
      for (const [guildId, guildConfig] of this.configurations) {
        const users = {};
        for (const [userId, userConfig] of guildConfig.users) {
          users[userId] = {
            channels: userConfig.channels,
            mentionRole: userConfig.mentionRole
          };
        }
        obj[guildId] = {
          earningsChannel: guildConfig.earningsChannel,
          earningsMentionRole: guildConfig.earningsMentionRole,
          users
        };
      }
      await fs.writeFile(this.configFile, JSON.stringify(obj, null, 2), 'utf8');
    } catch (error) {
      console.error('❌ Error saving configurations:', error);
    }
  }

  // ─── Alert Channel Methods (per-user) ───

  async addChannel(guildId, userId, channelId) {
    const userConfig = this._getUserConfig(guildId, userId);
    if (!userConfig.channels.includes(channelId)) {
      userConfig.channels.push(channelId);
      await this._saveToFile();
      console.log(`✅ Channel ${channelId} added for user ${userId} in guild ${guildId}`);
      return true;
    }
    return false;
  }

  async removeChannel(guildId, userId, channelId) {
    const guildConfig = this.configurations.get(guildId);
    if (!guildConfig || !guildConfig.users.has(userId)) {
      return false;
    }

    const userConfig = guildConfig.users.get(userId);
    const index = userConfig.channels.indexOf(channelId);
    if (index === -1) return false;

    userConfig.channels.splice(index, 1);
    // Clean up empty user config
    if (userConfig.channels.length === 0 && !userConfig.mentionRole) {
      guildConfig.users.delete(userId);
    }
    // Clean up empty guild config
    if (guildConfig.users.size === 0 && !guildConfig.earningsChannel && !guildConfig.earningsMentionRole) {
      this.configurations.delete(guildId);
    }

    await this._saveToFile();
    console.log(`🗑️ Channel ${channelId} removed for user ${userId} in guild ${guildId}`);
    return true;
  }

  async removeUserConfigs(guildId, userId) {
    const guildConfig = this.configurations.get(guildId);
    if (!guildConfig || !guildConfig.users.has(userId)) {
      return false;
    }

    guildConfig.users.delete(userId);

    if (guildConfig.users.size === 0 && !guildConfig.earningsChannel && !guildConfig.earningsMentionRole) {
      this.configurations.delete(guildId);
    }

    await this._saveToFile();
    console.log(`🗑️ All alert config removed for user ${userId} in guild ${guildId}`);
    return true;
  }

  async setMentionRole(guildId, userId, roleId) {
    const userConfig = this._getUserConfig(guildId, userId);
    userConfig.mentionRole = roleId;
    await this._saveToFile();
    console.log(`✅ Mention role set for user ${userId} in guild ${guildId}: ${roleId}`);
  }

  async removeMentionRole(guildId, userId) {
    const guildConfig = this.configurations.get(guildId);
    if (!guildConfig || !guildConfig.users.has(userId)) return;

    const userConfig = guildConfig.users.get(userId);
    userConfig.mentionRole = null;

    if (userConfig.channels.length === 0) {
      guildConfig.users.delete(userId);
    }
    if (guildConfig.users.size === 0 && !guildConfig.earningsChannel && !guildConfig.earningsMentionRole) {
      this.configurations.delete(guildId);
    }

    await this._saveToFile();
    console.log(`🗑️ Mention role removed for user ${userId} in guild ${guildId}`);
  }

  // ─── Alert Config Getters ───

  getAllAlertConfigs(filterUserId) {
    const allConfigs = [];
    for (const [guildId, guildConfig] of this.configurations) {
      for (const [userId, userConfig] of guildConfig.users) {
        if (filterUserId && userId !== filterUserId) continue;
        if (userConfig.channels.length > 0) {
          allConfigs.push({
            guildId,
            userId,
            channels: userConfig.channels,
            mentionRole: userConfig.mentionRole
          });
        }
      }
    }
    return allConfigs;
  }

  getUserAlertConfig(guildId, userId) {
    const guildConfig = this.configurations.get(guildId);
    if (!guildConfig || !guildConfig.users.has(userId)) {
      return { guildId, userId, channels: [], mentionRole: null };
    }
    const userConfig = guildConfig.users.get(userId);
    return {
      guildId,
      userId,
      channels: userConfig.channels,
      mentionRole: userConfig.mentionRole
    };
  }

  // ─── Earnings Methods (per-guild) ───

  async setEarningsChannel(guildId, channelId) {
    const guildConfig = this._getGuildConfig(guildId);
    guildConfig.earningsChannel = channelId;
    await this._saveToFile();
    console.log(`✅ Earnings channel configured for guild ${guildId}: ${channelId}`);
  }

  async removeEarningsChannel(guildId) {
    const guildConfig = this.configurations.get(guildId);
    if (!guildConfig || !guildConfig.earningsChannel) return false;

    guildConfig.earningsChannel = null;
    if (guildConfig.users.size === 0 && !guildConfig.earningsMentionRole) {
      this.configurations.delete(guildId);
    }
    await this._saveToFile();
    console.log(`🗑️ Earnings channel removed for guild ${guildId}`);
    return true;
  }

  async setEarningsMentionRole(guildId, roleId) {
    const guildConfig = this._getGuildConfig(guildId);
    guildConfig.earningsMentionRole = roleId;
    await this._saveToFile();
    console.log(`✅ Earnings mention role set for guild ${guildId}: ${roleId}`);
  }

  async removeEarningsMentionRole(guildId) {
    const guildConfig = this.configurations.get(guildId);
    if (!guildConfig) return;

    guildConfig.earningsMentionRole = null;
    if (guildConfig.users.size === 0 && !guildConfig.earningsChannel) {
      this.configurations.delete(guildId);
    }
    await this._saveToFile();
    console.log(`🗑️ Earnings mention role removed for guild ${guildId}`);
  }

  getEarningsChannel(guildId) {
    const guildConfig = this.configurations.get(guildId);
    return guildConfig ? guildConfig.earningsChannel : null;
  }

  getEarningsMentionRole(guildId) {
    const guildConfig = this.configurations.get(guildId);
    return guildConfig ? guildConfig.earningsMentionRole : null;
  }

  getAllEarningsConfigs() {
    const allConfigs = [];
    for (const [guildId, guildConfig] of this.configurations) {
      if (guildConfig.earningsChannel) {
        allConfigs.push({
          guildId,
          earningsChannel: guildConfig.earningsChannel,
          earningsMentionRole: guildConfig.earningsMentionRole
        });
      }
    }
    return allConfigs;
  }

  // ─── Combined Config (for /setup view) ───

  getConfiguration(guildId, userId) {
    const guildConfig = this.configurations.get(guildId);
    const userAlert = this.getUserAlertConfig(guildId, userId);
    return {
      channels: userAlert.channels,
      mentionRole: userAlert.mentionRole,
      earningsChannel: guildConfig ? guildConfig.earningsChannel : null,
      earningsMentionRole: guildConfig ? guildConfig.earningsMentionRole : null
    };
  }

  // ─── Export ───

  async exportToReadableFormat() {
    const output = [];
    for (const [guildId, guildConfig] of this.configurations) {
      const earningsInfo = guildConfig.earningsChannel
        ? `Earnings: ${guildConfig.earningsChannel}${guildConfig.earningsMentionRole ? ` (Mention: ${guildConfig.earningsMentionRole})` : ''}`
        : 'Earnings: None';
      output.push(`${guildId}:`);
      output.push(`  ${earningsInfo}`);
      for (const [userId, userConfig] of guildConfig.users) {
        const channelList = userConfig.channels.length > 0 ? userConfig.channels.join(', ') : 'None';
        const mentionInfo = userConfig.mentionRole ? ` | Mention: ${userConfig.mentionRole}` : '';
        output.push(`  User ${userId}: Channels: ${channelList}${mentionInfo}`);
      }
    }
    return output.join('\n');
  }

  reset() {
    this.configurations = new Map();
    this.initialized = false;
  }
}

const instance = new ChannelManager();
module.exports = instance;
module.exports.ChannelManager = ChannelManager;
