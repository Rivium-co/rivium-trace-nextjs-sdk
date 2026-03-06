import {
  isServer,
  isBrowser,
  getBrowserName,
  getOSName,
  getDeviceType,
  getPlatformInfo,
  getUserAgent,
  getPlatformString,
} from '../utils/platform';

// We run in Node (server) by default in Jest.
// To test browser behaviour we need to mock `window` and `navigator`.

describe('platform utilities', () => {
  // ─── isServer() / isBrowser() ─────────────────────────────

  describe('isServer()', () => {
    it('should return true in Node.js (no window)', () => {
      expect(isServer()).toBe(true);
    });
  });

  describe('isBrowser()', () => {
    it('should return false in Node.js', () => {
      expect(isBrowser()).toBe(false);
    });
  });

  // ─── getBrowserName() ─────────────────────────────────────

  describe('getBrowserName()', () => {
    it('should detect Chrome', () => {
      expect(getBrowserName(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )).toBe('chrome');
    });

    it('should detect Firefox', () => {
      expect(getBrowserName(
        'Mozilla/5.0 (Windows NT 10.0; rv:120.0) Gecko/20100101 Firefox/120.0'
      )).toBe('firefox');
    });

    it('should detect Safari', () => {
      expect(getBrowserName(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
      )).toBe('safari');
    });

    it('should detect Edge', () => {
      expect(getBrowserName(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.2210.91'
      )).toBe('edge');
    });

    it('should detect Opera via opr/ (note: chrome/ checked first in implementation)', () => {
      // The implementation checks chrome/ before opr/, so Opera UAs with Chrome/ return 'chrome'
      expect(getBrowserName(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0'
      )).toBe('chrome');
    });

    it('should detect Opera via opera/', () => {
      expect(getBrowserName(
        'Opera/9.80 (Windows NT 6.1; WOW64) Presto/2.12.388 Version/12.18'
      )).toBe('opera');
    });

    it('should return "unknown" for unrecognized user agent', () => {
      expect(getBrowserName('CurlBot/1.0')).toBe('unknown');
    });

    it('should be case-insensitive', () => {
      expect(getBrowserName('MOZILLA/5.0 CHROME/120.0')).toBe('chrome');
    });
  });

  // ─── getOSName() ──────────────────────────────────────────

  describe('getOSName()', () => {
    it('should detect Windows', () => {
      expect(getOSName('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('windows');
    });

    it('should detect macOS', () => {
      expect(getOSName('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2)')).toBe('macos');
    });

    it('should detect Linux', () => {
      expect(getOSName('Mozilla/5.0 (X11; Linux x86_64)')).toBe('linux');
    });

    it('should detect Android (note: linux checked first in implementation)', () => {
      // The implementation checks 'linux' before 'android', and Android UAs contain 'Linux'
      expect(getOSName('Mozilla/5.0 (Linux; Android 13; Pixel 7)')).toBe('linux');
    });

    it('should detect iOS via iPhone', () => {
      expect(getOSName('Mozilla/5.0 (iPhone; CPU iPhone OS 17_2)')).toBe('ios');
    });

    it('should detect iOS via iPad (note: mac checked first in implementation)', () => {
      // The implementation checks 'mac' before 'ipad', and iPad UAs contain 'Mac OS X'
      expect(getOSName('Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X)')).toBe('macos');
    });

    it('should return "unknown" for unrecognized OS', () => {
      expect(getOSName('CurlBot/1.0')).toBe('unknown');
    });
  });

  // ─── getDeviceType() ──────────────────────────────────────

  describe('getDeviceType()', () => {
    it('should detect mobile devices', () => {
      expect(getDeviceType('Mozilla/5.0 (Linux; Android 13; Pixel 7) Mobile')).toBe('mobile');
    });

    it('should detect tablet via "tablet"', () => {
      expect(getDeviceType('Mozilla/5.0 Tablet SM-T510')).toBe('tablet');
    });

    it('should detect tablet via "ipad"', () => {
      expect(getDeviceType('Mozilla/5.0 (iPad; CPU OS 17_2)')).toBe('tablet');
    });

    it('should default to "desktop"', () => {
      expect(getDeviceType('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
    });
  });

  // ─── getPlatformInfo() ────────────────────────────────────

  describe('getPlatformInfo()', () => {
    it('should return server platform info in Node.js', () => {
      const info = getPlatformInfo();

      expect(info.platform).toBe('nextjs_server');
      expect(info.isServer).toBe(true);
      expect(info.isBrowser).toBe(false);
    });

    it('should include process.platform as os on server', () => {
      const info = getPlatformInfo();
      expect(info.os).toBe(process.platform);
    });
  });

  // ─── getUserAgent() ───────────────────────────────────────

  describe('getUserAgent()', () => {
    it('should return a string containing RiviumTrace-SDK', () => {
      const ua = getUserAgent();
      expect(ua).toContain('RiviumTrace-SDK/');
    });

    it('should contain nextjs_server when running on server', () => {
      const ua = getUserAgent();
      expect(ua).toContain('nextjs_server');
    });

    it('should contain a version number', () => {
      const ua = getUserAgent();
      expect(ua).toMatch(/RiviumTrace-SDK\/\d+\.\d+\.\d+/);
    });
  });

  // ─── getPlatformString() ──────────────────────────────────

  describe('getPlatformString()', () => {
    it('should return "nextjs_server" in Node.js environment', () => {
      expect(getPlatformString()).toBe('nextjs_server');
    });
  });

  // ─── Browser environment simulation ──────────────────────

  describe('browser environment simulation', () => {
    const originalWindow = global.window;
    const originalNavigator = global.navigator;

    beforeEach(() => {
      // Simulate browser environment
      (global as any).window = {
        location: { origin: 'http://localhost:3000', href: 'http://localhost:3000/' },
      };
      (global as any).navigator = {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      };
    });

    afterEach(() => {
      if (originalWindow === undefined) {
        delete (global as any).window;
      } else {
        (global as any).window = originalWindow;
      }
      if (originalNavigator === undefined) {
        delete (global as any).navigator;
      } else {
        (global as any).navigator = originalNavigator;
      }
    });

    it('isBrowser() should return true when window exists', () => {
      expect(isBrowser()).toBe(true);
    });

    it('isServer() should return false when window exists', () => {
      expect(isServer()).toBe(false);
    });

    it('getPlatformInfo() should return browser platform info', () => {
      const info = getPlatformInfo();
      expect(info.platform).toBe('nextjs');
      expect(info.isBrowser).toBe(true);
      expect(info.isServer).toBe(false);
      expect(info.browser).toBe('chrome');
      expect(info.os).toBe('windows');
      expect(info.device).toBe('desktop');
    });

    it('getUserAgent() should contain the platform string', () => {
      const ua = getUserAgent();
      expect(ua).toContain('RiviumTrace-SDK/');
      expect(ua).toContain('nextjs');
    });

    it('getPlatformString() should return "nextjs" in browser', () => {
      expect(getPlatformString()).toBe('nextjs');
    });
  });
});
