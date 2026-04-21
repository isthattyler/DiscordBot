const fs = require('fs').promises;
const path = require('path');

class ChannelManager {
  constructor() {
    // Structure: { guildId: { channels: [channelIds], mentionRole: roleId, earningsChannel: channelId, earningsMentionRole: roleId } }
    this.configurations = new Map();
    this.configFile = path.join(__dirname, '../../config/channels.json');
    this.loadConfigurations();
  }

  async loadConfigurations() {
    try {
      const data = await fs.readFile(this.configFile, 'utf8');
      const parsed = JSON.parse(data);
      this.configurations = new Map(Object.entries(parsed));
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

  async saveConfigurations() {
    try {
      const obj = Object.fromEntries(this.configurations);
      await fs.writeFile(this.configFile, JSON.stringify(obj, null, 2), 'utf8');
      console.log('💾 Channel configurations saved to file');
    } catch (error) {
      console.error('❌ Error saving configurations:', error);
    }
  }

  async addChannel(guildId, channelId) {
    if (!this.configurations.has(guildId)) {
      this.configurations.set(guildId, { channels: [], mentionRole: null });
    }

    const config = this.configurations.get(guildId);
    if (!config.channels.includes(channelId)) {
      config.channels.push(channelId);
      await this.saveConfigurations();
      console.log(`✅ Channel ${channelId} added to guild ${guildId}`);
      return true;
    }
    return false; // Channel already exists
  }

  async changeChannel(guildId, oldChannelId, newChannelId) {
    if (!this.configurations.has(guildId)) {
      return false;
    }

    const config = this.configurations.get(guildId);
    const index = config.channels.indexOf(oldChannelId);

    if (index === -1) {
      return false; // Old channel not found
    }

    // Check if new channel already exists
    if (config.channels.includes(newChannelId)) {
      return 'duplicate'; // New channel already in list
    }

    // Replace old channel with new channel
    config.channels[index] = newChannelId;
    await this.saveConfigurations();
    console.log(`✅ Channel ${oldChannelId} changed to ${newChannelId} in guild ${guildId}`);
    return true;
  }

  async removeChannel(guildId, channelId) {
    if (!this.configurations.has(guildId)) {
      return false;
    }

    const config = this.configurations.get(guildId);
    const index = config.channels.indexOf(channelId);

    if (index > -1) {
      config.channels.splice(index, 1);

      // If no channels left, remove the entire guild config
      if (config.channels.length === 0 && !config.mentionRole) {
        this.configurations.delete(guildId);
      }

      await this.saveConfigurations();
      console.log(`🗑️ Channel ${channelId} removed from guild ${guildId}`);
      return true;
    }
    return false;
  }

  async removeAllChannels(guildId) {
    if (!this.configurations.has(guildId)) {
      return false;
    }

    const config = this.configurations.get(guildId);
    const channelCount = config.channels.length;

    if (channelCount === 0) {
      return false;
    }

    config.channels = [];

    // If no mention role either, remove the entire guild config
    if (!config.mentionRole) {
      this.configurations.delete(guildId);
    }

    await this.saveConfigurations();
    console.log(`🗑️ All ${channelCount} channels removed from guild ${guildId}`);
    return channelCount;
  }

  async setChannel(guildId, channelId) {
    // Change/replace all channels with just this one
    this.configurations.set(guildId, {
      channels: [channelId],
      mentionRole: this.getMentionRole(guildId) // Keep existing mention role
    });
    await this.saveConfigurations();
    console.log(`✅ Channel configured for guild ${guildId}: ${channelId}`);
  }

  async setMentionRole(guildId, roleId) {
    if (!this.configurations.has(guildId)) {
      this.configurations.set(guildId, { channels: [], mentionRole: roleId });
    } else {
      this.configurations.get(guildId).mentionRole = roleId;
    }
    await this.saveConfigurations();
    console.log(`✅ Mention role set for guild ${guildId}: ${roleId}`);
  }

  async removeMentionRole(guildId) {
    if (this.configurations.has(guildId)) {
      this.configurations.get(guildId).mentionRole = null;

      // If no channels either, remove the entire guild config
      const config = this.configurations.get(guildId);
      if (config.channels.length === 0 && !config.earningsChannel) {
        this.configurations.delete(guildId);
      }

      await this.saveConfigurations();
      console.log(`🗑️ Mention role removed for guild ${guildId}`);
    }
  }

  async setEarningsChannel(guildId, channelId) {
    if (!this.configurations.has(guildId)) {
      this.configurations.set(guildId, { channels: [], mentionRole: null, earningsChannel: channelId, earningsMentionRole: null });
    } else {
      this.configurations.get(guildId).earningsChannel = channelId;
    }
    await this.saveConfigurations();
    console.log(`✅ Earnings channel configured for guild ${guildId}: ${channelId}`);
  }

  async removeEarningsChannel(guildId) {
    if (!this.configurations.has(guildId)) {
      return false;
    }

    const config = this.configurations.get(guildId);
    config.earningsChannel = null;

    // If no other config, remove the entire guild config
    if (config.channels.length === 0 && !config.mentionRole && !config.earningsMentionRole) {
      this.configurations.delete(guildId);
    }

    await this.saveConfigurations();
    console.log(`🗑️ Earnings channel removed for guild ${guildId}`);
    return true;
  }

  async setEarningsMentionRole(guildId, roleId) {
    if (!this.configurations.has(guildId)) {
      this.configurations.set(guildId, { channels: [], mentionRole: null, earningsChannel: null, earningsMentionRole: roleId });
    } else {
      this.configurations.get(guildId).earningsMentionRole = roleId;
    }
    await this.saveConfigurations();
    console.log(`✅ Earnings mention role set for guild ${guildId}: ${roleId}`);
  }

  async removeEarningsMentionRole(guildId) {
    if (this.configurations.has(guildId)) {
      this.configurations.get(guildId).earningsMentionRole = null;

      // If no other config, remove the entire guild config
      const config = this.configurations.get(guildId);
      if (config.channels.length === 0 && !config.mentionRole && !config.earningsChannel) {
        this.configurations.delete(guildId);
      }

      await this.saveConfigurations();
      console.log(`🗑️ Earnings mention role removed for guild ${guildId}`);
    }
  }

  getEarningsChannel(guildId) {
    const config = this.configurations.get(guildId);
    return config ? config.earningsChannel : null;
  }

  getEarningsMentionRole(guildId) {
    const config = this.configurations.get(guildId);
    return config ? config.earningsMentionRole : null;
  }

  getChannels(guildId) {
    const config = this.configurations.get(guildId);
    return config ? config.channels : [];
  }

  getMentionRole(guildId) {
    const config = this.configurations.get(guildId);
    return config ? config.mentionRole : null;
  }

  hasChannels(guildId) {
    const config = this.configurations.get(guildId);
    return config && config.channels.length > 0;
  }

  getConfiguration(guildId) {
    return this.configurations.get(guildId) || { channels: [], mentionRole: null };
  }

  getAllConfigurations() {
    // Return all guild configurations for broadcasting
    return Array.from(this.configurations.entries()).map(([guildId, config]) => ({
      guildId,
      channels: config.channels,
      mentionRole: config.mentionRole,
      earningsChannel: config.earningsChannel,
      earningsMentionRole: config.earningsMentionRole
    }));
  }

  async exportToReadableFormat() {
    // Export in the format: Server name: channel 1, channel 2
    const output = [];
    for (const [guildId, config] of this.configurations) {
      const channelList = config.channels.length > 0 ? config.channels.join(', ') : 'None';
      const mentionInfo = config.mentionRole ? ` | Mention: ${config.mentionRole}` : '';
      const earningsChannel = config.earningsChannel || 'None';
      const earningsMentionInfo = config.earningsMentionRole ? ` | Mention: ${config.earningsMentionRole}` : '';
      output.push(`${guildId}:`);
      output.push(`  Alert Channels: ${channelList}${mentionInfo}`);
      output.push(`  Earnings Channel: ${earningsChannel}${earningsMentionInfo}`);
    }
    return output.join('\n');
  }
}

module.exports = new ChannelManager();