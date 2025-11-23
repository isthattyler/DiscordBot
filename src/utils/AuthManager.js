const fs = require('fs').promises;
const path = require('path');

class AuthManager {
  constructor() {
    // Structure: { guildId: [userId1, userId2, ...] }
    this.authorizedUsers = new Map();
    this.authFile = path.join(__dirname, '../../config/authorized_users.json');
    this.ownerId = null;
    this.loadAuthorizedUsers();
  }

  setOwnerId(ownerId) {
    this.ownerId = ownerId;
    console.log(`✅ Bot owner set: ${ownerId}`);
  }

  async loadAuthorizedUsers() {
    try {
      const data = await fs.readFile(this.authFile, 'utf8');
      const parsed = JSON.parse(data);
      this.authorizedUsers = new Map(Object.entries(parsed));
      console.log('✅ Authorized users loaded from file');
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('📝 No existing authorized users file found, starting fresh');
        this.authorizedUsers = new Map();
      } else {
        console.error('❌ Error loading authorized users:', error);
      }
    }
  }

  async saveAuthorizedUsers() {
    try {
      const obj = Object.fromEntries(this.authorizedUsers);
      await fs.writeFile(this.authFile, JSON.stringify(obj, null, 2), 'utf8');
      console.log('💾 Authorized users saved to file');
    } catch (error) {
      console.error('❌ Error saving authorized users:', error);
    }
  }

  async addUser(guildId, userId) {
    if (!this.authorizedUsers.has(guildId)) {
      this.authorizedUsers.set(guildId, []);
    }
    
    const users = this.authorizedUsers.get(guildId);
    if (!users.includes(userId)) {
      users.push(userId);
      await this.saveAuthorizedUsers();
      console.log(`✅ User ${userId} authorized in guild ${guildId}`);
      return true;
    }
    return false; // User already authorized
  }

  async removeUser(guildId, userId) {
    if (!this.authorizedUsers.has(guildId)) {
      return false;
    }

    const users = this.authorizedUsers.get(guildId);
    const index = users.indexOf(userId);
    
    if (index > -1) {
      users.splice(index, 1);
      
      // If no users left, remove the entire guild entry
      if (users.length === 0) {
        this.authorizedUsers.delete(guildId);
      }
      
      await this.saveAuthorizedUsers();
      console.log(`🗑️ User ${userId} removed from guild ${guildId}`);
      return true;
    }
    return false;
  }

  isAuthorized(guildId, userId) {
    // Owner is always authorized
    if (this.ownerId && userId === this.ownerId) {
      return true;
    }

    // Check if user is in authorized list
    const users = this.authorizedUsers.get(guildId);
    return users && users.includes(userId);
  }

  isOwner(userId) {
    return this.ownerId && userId === this.ownerId;
  }

  getAuthorizedUsers(guildId) {
    return this.authorizedUsers.get(guildId) || [];
  }

  async exportToReadableFormat() {
    const output = [];
    for (const [guildId, users] of this.authorizedUsers) {
      const userList = users.join(', ');
      output.push(`${guildId}: ${userList}`);
    }
    return output.join('\n');
  }
}

module.exports = new AuthManager();