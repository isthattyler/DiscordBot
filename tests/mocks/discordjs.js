/**
 * Mock for discord.js module
 * Provides test-friendly implementations of Discord.js classes
 */

class EmbedBuilder {
  constructor() {
    this.data = {
      title: null,
      description: null,
      color: null,
      fields: [],
      footer: null,
      thumbnail: null,
      image: null,
      timestamp: null
    };
  }

  setTitle(title) {
    this.data.title = title;
    return this;
  }

  setDescription(description) {
    this.data.description = description;
    return this;
  }

  setColor(color) {
    this.data.color = typeof color === 'string' ? parseInt(color.replace('#', '0x')) : color;
    return this;
  }

  addFields(...fields) {
    this.data.fields.push(...fields.flat());
    return this;
  }

  setFooter(footer) {
    this.data.footer = footer;
    return this;
  }

  setThumbnail(url) {
    this.data.thumbnail = { url };
    return this;
  }

  setImage(url) {
    this.data.image = { url };
    return this;
  }

  setTimestamp() {
    this.data.timestamp = new Date().toISOString();
    return this;
  }

  toJSON() {
    return this.data;
  }
}

class SlashCommandBuilder {
  constructor() {
    this.name = '';
    this.description = '';
    this.options = [];
    this.defaultPermission = true;
  }

  setName(name) {
    this.name = name;
    return this;
  }

  setDescription(desc) {
    this.description = desc;
    return this;
  }

  addStringOption(fn) {
    const option = {
      type: 3, // STRING
      name: '',
      description: '',
      required: false,
      setName: function(name) { this.name = name; return this; },
      setDescription: function(desc) { this.description = desc; return this; },
      setRequired: function(req) { this.required = req; return this; },
      addChoices: function() { return this; }
    };
    fn(option);
    this.options.push(option);
    return this;
  }

  addAttachmentOption(fn) {
    const option = {
      type: 11, // ATTACHMENT
      name: '',
      description: '',
      required: false,
      setName: function(name) { this.name = name; return this; },
      setDescription: function(desc) { this.description = desc; return this; },
      setRequired: function(req) { this.required = req; return this; }
    };
    fn(option);
    this.options.push(option);
    return this;
  }

  addUserOption(fn) {
    const option = {
      type: 6, // USER
      name: '',
      description: '',
      required: false,
      setName: function(name) { this.name = name; return this; },
      setDescription: function(desc) { this.description = desc; return this; },
      setRequired: function(req) { this.required = req; return this; }
    };
    fn(option);
    this.options.push(option);
    return this;
  }

  addRoleOption(fn) {
    const option = {
      type: 8, // ROLE
      name: '',
      description: '',
      required: false,
      setName: function(name) { this.name = name; return this; },
      setDescription: function(desc) { this.description = desc; return this; },
      setRequired: function(req) { this.required = req; return this; }
    };
    fn(option);
    this.options.push(option);
    return this;
  }

  addChannelOption(fn) {
    const option = {
      type: 7, // CHANNEL
      name: '',
      description: '',
      required: false,
      channelTypes: [],
      setName: function(name) { this.name = name; return this; },
      setDescription: function(desc) { this.description = desc; return this; },
      setRequired: function(req) { this.required = req; return this; },
      addChannelTypes: function(types) { this.channelTypes = types; return this; }
    };
    fn(option);
    this.options.push(option);
    return this;
  }

  addSubcommandGroup(fn) {
    const group = {
      type: 2, // SUB_COMMAND_GROUP
      name: '',
      description: '',
      options: [],
      setName: function(name) { this.name = name; return this; },
      setDescription: function(desc) { this.description = desc; return this; },
      addSubcommand: function(subFn) {
        const subcommand = {
          type: 1, // SUB_COMMAND
          name: '',
          description: '',
          options: [],
          setName: function(name) { this.name = name; return this; },
          setDescription: function(desc) { this.description = desc; return this; }
        };
        subFn(subcommand);
        this.options.push(subcommand);
        return this;
      }
    };
    fn(group);
    this.options.push(group);
    return this;
  }

  addSubcommand(fn) {
    const subcommand = {
      type: 1, // SUB_COMMAND
      name: '',
      description: '',
      options: [],
      setName: function(name) { this.name = name; return this; },
      setDescription: function(desc) { this.description = desc; return this; }
    };
    fn(subcommand);
    this.options.push(subcommand);
    return this;
  }

  setDefaultMemberPermissions() {
    return this;
  }

  toJSON() {
    return {
      name: this.name,
      description: this.description,
      options: this.options,
      default_member_permissions: this.defaultPermission ? null : '0'
    };
  }
}

class ActionRowBuilder {
  constructor() {
    this.components = [];
  }

  addComponents(...components) {
    this.components.push(...components.flat());
    return this;
  }
}

class StringSelectMenuBuilder {
  constructor() {
    this.data = {
      custom_id: '',
      placeholder: '',
      options: []
    };
  }

  setCustomId(id) {
    this.data.custom_id = id;
    return this;
  }

  setPlaceholder(placeholder) {
    this.data.placeholder = placeholder;
    return this;
  }

  addOptions(...options) {
    this.data.options.push(...options.flat());
    return this;
  }
}

class PermissionFlagsBits {
  static Administrator = 0x8n;
  static ManageChannels = 0x10n;
  static SendMessages = 0x800n;
  static EmbedLinks = 0x4000n;
}

class ChannelType {
  static GuildText = 0;
  static GuildVoice = 2;
  static GuildCategory = 4;
}

module.exports = {
  EmbedBuilder,
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  ChannelType,
  GatewayIntentBits: {
    Guilds: 1 << 0,
    GuildMessages: 1 << 9
  }
};
