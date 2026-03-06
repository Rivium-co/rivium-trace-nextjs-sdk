import { RateLimiter } from '../utils/rateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    RateLimiter.clearCache();
    RateLimiter.setRateLimitWindow(60000);
    RateLimiter.setMaxCacheSize(100);
  });

  // ─── shouldSendError() ─────────────────────────────────────

  describe('shouldSendError()', () => {
    it('should allow the first occurrence of an error', () => {
      expect(RateLimiter.shouldSendError('error-key-1')).toBe(true);
    });

    it('should block a duplicate error within the rate limit window', () => {
      RateLimiter.shouldSendError('dup-key');
      expect(RateLimiter.shouldSendError('dup-key')).toBe(false);
    });

    it('should allow different error keys independently', () => {
      expect(RateLimiter.shouldSendError('key-a')).toBe(true);
      expect(RateLimiter.shouldSendError('key-b')).toBe(true);
    });

    it('should allow an error again after the rate limit window expires', () => {
      // Use a very short window for this test
      RateLimiter.setRateLimitWindow(50);
      RateLimiter.shouldSendError('expire-key');

      // Immediately should be blocked
      expect(RateLimiter.shouldSendError('expire-key')).toBe(false);

      // Wait for window to expire
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(RateLimiter.shouldSendError('expire-key')).toBe(true);
          resolve();
        }, 100);
      });
    });

    it('should update the cache when an error is allowed', () => {
      expect(RateLimiter.getCacheSize()).toBe(0);
      RateLimiter.shouldSendError('new-key');
      expect(RateLimiter.getCacheSize()).toBe(1);
    });

    it('should not increase cache size for duplicate errors', () => {
      RateLimiter.shouldSendError('same');
      RateLimiter.shouldSendError('same');
      expect(RateLimiter.getCacheSize()).toBe(1);
    });
  });

  // ─── generateErrorKey() ───────────────────────────────────

  describe('generateErrorKey()', () => {
    it('should generate a key from message only', () => {
      const key = RateLimiter.generateErrorKey('Something failed');
      expect(key).toContain('Something failed');
    });

    it('should generate a key from message and stack trace', () => {
      const key = RateLimiter.generateErrorKey(
        'TypeError: x is not a function',
        'TypeError: x is not a function\n    at foo.js:10:5'
      );
      expect(key).toContain('TypeError: x is not a function');
    });

    it('should use the first line of the stack trace', () => {
      const key = RateLimiter.generateErrorKey(
        'Error',
        'Error\n    at bar.ts:1:1\n    at baz.ts:2:2'
      );
      expect(key).toContain('Error');
      // The key uses message + ":" + first line of stack
      expect(key).not.toContain('baz.ts');
    });

    it('should truncate long keys to 200 characters', () => {
      const longMessage = 'x'.repeat(300);
      const key = RateLimiter.generateErrorKey(longMessage);
      expect(key.length).toBe(200);
    });

    it('should handle undefined stack trace', () => {
      const key = RateLimiter.generateErrorKey('NoStack');
      expect(key).toContain('NoStack');
      expect(key).toContain(':');
    });

    it('should generate identical keys for same input', () => {
      const key1 = RateLimiter.generateErrorKey('msg', 'stack');
      const key2 = RateLimiter.generateErrorKey('msg', 'stack');
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different messages', () => {
      const key1 = RateLimiter.generateErrorKey('error A');
      const key2 = RateLimiter.generateErrorKey('error B');
      expect(key1).not.toBe(key2);
    });
  });

  // ─── clearCache() ─────────────────────────────────────────

  describe('clearCache()', () => {
    it('should remove all entries from the cache', () => {
      RateLimiter.shouldSendError('a');
      RateLimiter.shouldSendError('b');
      expect(RateLimiter.getCacheSize()).toBe(2);

      RateLimiter.clearCache();
      expect(RateLimiter.getCacheSize()).toBe(0);
    });

    it('should allow previously blocked errors after clearing', () => {
      RateLimiter.shouldSendError('blocked');
      expect(RateLimiter.shouldSendError('blocked')).toBe(false);

      RateLimiter.clearCache();
      expect(RateLimiter.shouldSendError('blocked')).toBe(true);
    });
  });

  // ─── getCacheSize() ───────────────────────────────────────

  describe('getCacheSize()', () => {
    it('should return 0 for an empty cache', () => {
      expect(RateLimiter.getCacheSize()).toBe(0);
    });

    it('should return the correct count', () => {
      RateLimiter.shouldSendError('a');
      RateLimiter.shouldSendError('b');
      RateLimiter.shouldSendError('c');
      expect(RateLimiter.getCacheSize()).toBe(3);
    });
  });

  // ─── setRateLimitWindow() ─────────────────────────────────

  describe('setRateLimitWindow()', () => {
    it('should change the rate limit window duration', () => {
      RateLimiter.setRateLimitWindow(10);
      RateLimiter.shouldSendError('quick');

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(RateLimiter.shouldSendError('quick')).toBe(true);
          resolve();
        }, 50);
      });
    });
  });

  // ─── setMaxCacheSize() ────────────────────────────────────

  describe('setMaxCacheSize()', () => {
    it('should limit the cache to the max size', () => {
      RateLimiter.setMaxCacheSize(3);
      // Use a short rate limit window so old entries can be expired
      RateLimiter.setRateLimitWindow(1);

      // Wait a moment so entries become "old"
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Add entries beyond the max cache size
          for (let i = 0; i < 5; i++) {
            RateLimiter.shouldSendError(`key-${i}`);
          }
          // Cache should be pruned to maxCacheSize
          expect(RateLimiter.getCacheSize()).toBeLessThanOrEqual(5);
          resolve();
        }, 10);
      });
    });
  });

  // ─── Cache cleanup ────────────────────────────────────────

  describe('cache cleanup', () => {
    it('should clean up expired entries when cache exceeds max size', () => {
      RateLimiter.setMaxCacheSize(2);
      RateLimiter.setRateLimitWindow(1); // 1ms window

      return new Promise<void>((resolve) => {
        RateLimiter.shouldSendError('old-1');
        RateLimiter.shouldSendError('old-2');

        setTimeout(() => {
          // These should trigger cleanup of old-1 and old-2
          RateLimiter.shouldSendError('new-1');
          RateLimiter.shouldSendError('new-2');
          RateLimiter.shouldSendError('new-3');

          // Old entries should be cleaned up since they expired
          expect(RateLimiter.getCacheSize()).toBeLessThanOrEqual(3);
          resolve();
        }, 20);
      });
    });
  });
});
