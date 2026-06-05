const CommentEmbed = require('../../../src/embeds/CommentEmbed');

jest.mock('../../../src/utils/ConfigLoader', () => ({
  get: jest.fn((key) => {
    if (key === 'bot') {
      return { icon_url: 'https://example.com/icon.png', embed_color: 0x0099ff };
    }
    if (key === 'alerts') {
      return { footer_text: 'Trade Alert' };
    }
    return {};
  })
}));

describe('CommentEmbed', () => {
  describe('Create', () => {
    test('should create embed with correct structure', () => {
      const commentData = {
        message: 'Test comment',
        author: 'testuser'
      };

      const embed = CommentEmbed.create(commentData);

      expect(embed).toBeDefined();
    });

    test('should set title', () => {
      const commentData = {
        message: 'Test',
        author: 'user'
      };

      const embed = CommentEmbed.create(commentData);

      expect(embed.data.title).toBe('💬 Trade Comment');
    });

    test('should set description with message', () => {
      const commentData = {
        message: 'This is a test comment',
        author: 'user'
      };

      const embed = CommentEmbed.create(commentData);

      expect(embed.data.description).toBe('This is a test comment');
    });

    test('should set thumbnail', () => {
      const commentData = {
        message: 'Test',
        author: 'user'
      };

      const embed = CommentEmbed.create(commentData);

      expect(embed.data.thumbnail).toBeDefined();
      expect(embed.data.thumbnail.url).toBe('https://example.com/icon.png');
    });

    test('should set timestamp', () => {
      const commentData = {
        message: 'Test',
        author: 'user'
      };

      const embed = CommentEmbed.create(commentData);

      expect(embed.data.timestamp).toBeDefined();
    });

    test('should set footer with author', () => {
      const commentData = {
        message: 'Test',
        author: 'JohnDoe'
      };

      const embed = CommentEmbed.create(commentData);

      expect(embed.data.footer.text).toBe('Comment by JohnDoe');
    });

    test('should set default footer without author', () => {
      const commentData = {
        message: 'Test',
        author: null
      };

      const embed = CommentEmbed.create(commentData);

      expect(embed.data.footer.text).toBe('Trade Alert');
    });

    test('should handle multiline messages', () => {
      const commentData = {
        message: 'Line 1\nLine 2\nLine 3',
        author: 'user'
      };

      const embed = CommentEmbed.create(commentData);

      expect(embed.data.description).toBe('Line 1\nLine 2\nLine 3');
    });

    test('should add ticker field if provided', () => {
      const commentData = {
        message: 'Test',
        author: 'user',
        ticker: 'ES'
      };

      const embed = CommentEmbed.create(commentData);

      expect(embed.data.fields).toBeDefined();
      expect(embed.data.fields[0].name).toBe('📊 Ticker:');
      expect(embed.data.fields[0].value).toBe('ES');
    });

    test('should uppercase ticker', () => {
      const commentData = {
        message: 'Test',
        author: 'user',
        ticker: 'es'
      };

      const embed = CommentEmbed.create(commentData);

      expect(embed.data.fields[0].value).toBe('ES');
    });

    test('should not add ticker field if not provided', () => {
      const commentData = {
        message: 'Test',
        author: 'user'
      };

      const embed = CommentEmbed.create(commentData);

      expect(embed.data.fields).toBeUndefined();
    });
  });

  describe('setImage', () => {
    test('should set image URL', () => {
      const commentData = {
        message: 'Test',
        author: 'user'
      };

      const embed = CommentEmbed.create(commentData);
      embed.setImage('https://example.com/image.png');

      expect(embed.data.image.url).toBe('https://example.com/image.png');
    });
  });

  describe('setColor', () => {
    test('should change embed color', () => {
      const commentData = {
        message: 'Test',
        author: 'user'
      };

      const embed = CommentEmbed.create(commentData);
      embed.setColor(0xff0000);

      expect(embed.data.color).toBe(0xff0000);
    });
  });
});
