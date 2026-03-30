import {
  MessageLevel,
  BreadcrumbType,
} from '../models/RiviumTraceConfig';
import type {
  RiviumTraceConfig,
  RiviumTraceError,
  RiviumTraceMessage,
  Breadcrumb,
  PlatformInfo,
  NormalizedConfig,
} from '../models/RiviumTraceConfig';

describe('RiviumTraceConfig types and enums', () => {
  // ─── MessageLevel enum ────────────────────────────────────

  describe('MessageLevel', () => {
    it('should have a Debug value of "debug"', () => {
      expect(MessageLevel.Debug).toBe('debug');
    });

    it('should have an Info value of "info"', () => {
      expect(MessageLevel.Info).toBe('info');
    });

    it('should have a Warning value of "warning"', () => {
      expect(MessageLevel.Warning).toBe('warning');
    });

    it('should have an Error value of "error"', () => {
      expect(MessageLevel.Error).toBe('error');
    });

    it('should have exactly 4 members', () => {
      const values = Object.values(MessageLevel);
      expect(values).toHaveLength(4);
    });
  });

  // ─── BreadcrumbType enum ──────────────────────────────────

  describe('BreadcrumbType', () => {
    it('should have Navigation = "navigation"', () => {
      expect(BreadcrumbType.Navigation).toBe('navigation');
    });

    it('should have User = "user"', () => {
      expect(BreadcrumbType.User).toBe('user');
    });

    it('should have Http = "http"', () => {
      expect(BreadcrumbType.Http).toBe('http');
    });

    it('should have State = "state"', () => {
      expect(BreadcrumbType.State).toBe('state');
    });

    it('should have Error = "error"', () => {
      expect(BreadcrumbType.Error).toBe('error');
    });

    it('should have Info = "info"', () => {
      expect(BreadcrumbType.Info).toBe('info');
    });

    it('should have Console = "console"', () => {
      expect(BreadcrumbType.Console).toBe('console');
    });

    it('should have Query = "query"', () => {
      expect(BreadcrumbType.Query).toBe('query');
    });

    it('should have exactly 8 members', () => {
      const values = Object.values(BreadcrumbType);
      expect(values).toHaveLength(8);
    });
  });

  // ─── RiviumTraceConfig interface (compile-time + shape) ───

  describe('RiviumTraceConfig interface', () => {
    it('should accept a minimal config with only apiKey', () => {
      const config: RiviumTraceConfig = { apiKey: 'rv_test_123' };
      expect(config.apiKey).toBe('rv_test_123');
    });

    it('should accept a full config with all optional fields', () => {
      const config: RiviumTraceConfig = {
        apiKey: 'rv_live_abc',
        environment: 'production',
        release: '1.0.0',
        captureUncaughtErrors: true,
        enabled: true,
        debug: false,
        timeout: 10,
        maxBreadcrumbs: 50,
        sampleRate: 0.5,
        tags: { team: 'frontend' },
        enableServerSide: true,
        enableClientSide: true,
        enableCrashDetection: false,
        beforeSend: (error) => error,
        ignoreErrors: ['ChunkLoadError', /ResizeObserver/],
        ignoreUrls: ['chrome-extension://', /localhost/],
      };

      expect(config.environment).toBe('production');
      expect(config.sampleRate).toBe(0.5);
      expect(config.ignoreErrors).toHaveLength(2);
      expect(config.ignoreUrls).toHaveLength(2);
    });

    it('should allow beforeSend to return null (filter out error)', () => {
      const config: RiviumTraceConfig = {
        apiKey: 'key',
        beforeSend: () => null,
      };

      const result = config.beforeSend!({
        message: 'test',
        platform: 'nextjs',
        timestamp: new Date().toISOString(),
      });
      expect(result).toBeNull();
    });

    it('should allow beforeSend to return false (filter out error)', () => {
      const config: RiviumTraceConfig = {
        apiKey: 'key',
        beforeSend: () => false,
      };

      const result = config.beforeSend!({
        message: 'test',
        platform: 'nextjs',
        timestamp: new Date().toISOString(),
      });
      expect(result).toBe(false);
    });

    it('should allow beforeSend to modify and return the error', () => {
      const config: RiviumTraceConfig = {
        apiKey: 'key',
        beforeSend: (error) => {
          error.tags = { ...error.tags, modified: 'true' };
          return error;
        },
      };

      const error: RiviumTraceError = {
        message: 'test',
        platform: 'nextjs',
        timestamp: new Date().toISOString(),
      };

      const result = config.beforeSend!(error);
      expect(result).not.toBe(false);
      expect(result).not.toBeNull();
      expect((result as RiviumTraceError).tags?.modified).toBe('true');
    });
  });

  // ─── RiviumTraceError interface ───────────────────────────

  describe('RiviumTraceError interface', () => {
    it('should accept a minimal error with required fields', () => {
      const error: RiviumTraceError = {
        message: 'Something went wrong',
        platform: 'nextjs',
        timestamp: new Date().toISOString(),
      };

      expect(error.message).toBeDefined();
      expect(error.platform).toBe('nextjs');
    });

    it('should accept a full error with all optional fields', () => {
      const error: RiviumTraceError = {
        message: 'Error',
        stack_trace: 'Error\n    at foo.ts:1:2',
        platform: 'nextjs_server',
        environment: 'staging',
        release_version: '2.0.0',
        timestamp: '2024-01-01T00:00:00.000Z',
        breadcrumbs: [],
        extra: { foo: 'bar' },
        tags: { component: 'auth' },
        user_id: 'user-123',
        level: 'fatal',
        url: 'https://example.com/page',
      };

      expect(error.level).toBe('fatal');
      expect(error.url).toBe('https://example.com/page');
    });

    it('should accept all valid error levels', () => {
      const levels: Array<RiviumTraceError['level']> = [
        'fatal', 'error', 'warning', 'info', 'debug',
      ];
      levels.forEach(level => {
        const error: RiviumTraceError = {
          message: 'test',
          platform: 'nextjs',
          timestamp: '',
          level,
        };
        expect(error.level).toBe(level);
      });
    });
  });

  // ─── RiviumTraceMessage interface ─────────────────────────

  describe('RiviumTraceMessage interface', () => {
    it('should accept a minimal message', () => {
      const msg: RiviumTraceMessage = {
        message: 'Hello',
        level: 'info',
        platform: 'nextjs',
        timestamp: new Date().toISOString(),
      };

      expect(msg.level).toBe('info');
    });

    it('should accept MessageLevel enum values', () => {
      const msg: RiviumTraceMessage = {
        message: 'Debug message',
        level: MessageLevel.Debug,
        platform: 'nextjs',
        timestamp: '',
      };

      expect(msg.level).toBe('debug');
    });
  });

  // ─── Breadcrumb interface ─────────────────────────────────

  describe('Breadcrumb interface', () => {
    it('should accept a minimal breadcrumb', () => {
      const bc: Breadcrumb = {
        message: 'clicked',
        type: BreadcrumbType.User,
        timestamp: new Date().toISOString(),
      };

      expect(bc.type).toBe('user');
    });

    it('should accept optional data and level', () => {
      const bc: Breadcrumb = {
        message: 'GET /api',
        type: BreadcrumbType.Http,
        timestamp: '',
        data: { statusCode: 200 },
        level: 'error',
      };

      expect(bc.data?.statusCode).toBe(200);
      expect(bc.level).toBe('error');
    });
  });

  // ─── PlatformInfo interface ───────────────────────────────

  describe('PlatformInfo interface', () => {
    it('should represent a server platform', () => {
      const info: PlatformInfo = {
        platform: 'nextjs_server',
        isServer: true,
        isBrowser: false,
      };

      expect(info.isServer).toBe(true);
      expect(info.isBrowser).toBe(false);
    });

    it('should represent a browser platform with optional fields', () => {
      const info: PlatformInfo = {
        platform: 'nextjs',
        isServer: false,
        isBrowser: true,
        userAgent: 'Mozilla/5.0',
        browser: 'chrome',
        os: 'macos',
        device: 'desktop',
      };

      expect(info.browser).toBe('chrome');
      expect(info.os).toBe('macos');
    });
  });

  // ─── NormalizedConfig interface ───────────────────────────

  describe('NormalizedConfig interface', () => {
    it('should require all fields that are optional in RiviumTraceConfig', () => {
      const normalized: NormalizedConfig = {
        apiKey: 'rv_test_key',
        environment: 'production',
        release: '1.0.0',
        captureUncaughtErrors: true,
        enabled: true,
        debug: false,
        timeout: 10,
        maxBreadcrumbs: 20,
        sampleRate: 1.0,
        tags: {},
        apiUrl: 'https://trace.rivium.co',
        enableServerSide: true,
        enableClientSide: true,
        enableCrashDetection: true,
        ignoreErrors: [],
        ignoreUrls: [],
      };

      expect(normalized.enabled).toBe(true);
      expect(normalized.sampleRate).toBe(1.0);
      expect(normalized.maxBreadcrumbs).toBe(20);
    });

    it('should allow an optional beforeSend in NormalizedConfig', () => {
      const normalized: NormalizedConfig = {
        apiKey: 'key',
        environment: 'dev',
        release: '',
        captureUncaughtErrors: true,
        enabled: true,
        debug: false,
        timeout: 10,
        maxBreadcrumbs: 20,
        sampleRate: 1.0,
        tags: {},
        apiUrl: 'https://trace.rivium.co',
        enableServerSide: true,
        enableClientSide: true,
        enableCrashDetection: true,
        ignoreErrors: [],
        ignoreUrls: [],
        beforeSend: (err) => err,
      };

      expect(normalized.beforeSend).toBeDefined();
    });
  });
});
