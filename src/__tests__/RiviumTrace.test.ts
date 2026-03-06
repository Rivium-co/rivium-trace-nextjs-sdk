import { RiviumTrace } from '../RiviumTrace';
import { BreadcrumbService } from '../services/BreadcrumbService';
import { RateLimiter } from '../utils/rateLimiter';
import { RouterIntegration } from '../utils/routerIntegration';
import type { RiviumTraceConfig, RiviumTraceError } from '../models/RiviumTraceConfig';

// ─── Helpers ────────────────────────────────────────────────

function mockFetchOk() {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve(''),
  });
}

function mockFetchFail(status = 500) {
  return jest.fn().mockResolvedValue({
    ok: false,
    status,
    text: () => Promise.resolve('error'),
  });
}

function defaultConfig(overrides?: Partial<RiviumTraceConfig>): RiviumTraceConfig {
  return {
    apiKey: 'rv_test_key_12345678901234567890',
    environment: 'test',
    captureUncaughtErrors: false, // disable in tests
    enableCrashDetection: false, // disable in tests (needs browser)
    enableClientSide: false,
    enableServerSide: false,
    ...overrides,
  };
}

// Reset the singleton between tests
function resetSingleton() {
  // Access the private static instance field to clear it
  (RiviumTrace as any).instance = null;
}

describe('RiviumTrace', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = mockFetchOk();
    resetSingleton();
    BreadcrumbService.clear();
    RateLimiter.clearCache();
    RouterIntegration.reset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ─── init() ──────────────────────────────────────────────

  describe('init()', () => {
    it('should return a RiviumTrace instance', () => {
      const sdk = RiviumTrace.init(defaultConfig());
      expect(sdk).toBeInstanceOf(RiviumTrace);
    });

    it('should return the same instance on subsequent calls', () => {
      const sdk1 = RiviumTrace.init(defaultConfig());
      const sdk2 = RiviumTrace.init(defaultConfig({ environment: 'staging' }));
      expect(sdk1).toBe(sdk2);
    });

    it('should warn when init is called again', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      RiviumTrace.init(defaultConfig());
      RiviumTrace.init(defaultConfig());
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('already initialized')
      );
    });

    it('should log initialization when debug is true', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      RiviumTrace.init(defaultConfig({ debug: true }));
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Initializing SDK'),
        expect.any(Object)
      );
    });
  });

  // ─── getInstance() ──────────────────────────────────────

  describe('getInstance()', () => {
    it('should return null before initialization', () => {
      expect(RiviumTrace.getInstance()).toBeNull();
    });

    it('should return the instance after initialization', () => {
      RiviumTrace.init(defaultConfig());
      expect(RiviumTrace.getInstance()).not.toBeNull();
    });
  });

  // ─── setUserId() / getUserId() ──────────────────────────

  describe('setUserId() / getUserId()', () => {
    it('should return undefined before setting userId', () => {
      const sdk = RiviumTrace.init(defaultConfig());
      expect(sdk.getUserId()).toBeUndefined();
    });

    it('should set and return the userId', () => {
      const sdk = RiviumTrace.init(defaultConfig());
      sdk.setUserId('user-42');
      expect(sdk.getUserId()).toBe('user-42');
    });

    it('should update the userId when called again', () => {
      const sdk = RiviumTrace.init(defaultConfig());
      sdk.setUserId('first');
      sdk.setUserId('second');
      expect(sdk.getUserId()).toBe('second');
    });
  });

  // ─── captureException() ──────────────────────────────────

  describe('captureException()', () => {
    it('should send an error to the API', async () => {
      const sdk = RiviumTrace.init(defaultConfig());
      sdk.captureException(new Error('Test error'));

      // Allow async to settle
      await new Promise(r => setTimeout(r, 0));

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/errors'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should include stack trace from Error object', async () => {
      const sdk = RiviumTrace.init(defaultConfig());
      const error = new Error('Traced');
      sdk.captureException(error);

      await new Promise(r => setTimeout(r, 0));

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.stack_trace).toContain('Traced');
    });

    it('should use provided message over error message', async () => {
      const sdk = RiviumTrace.init(defaultConfig());
      sdk.captureException(new Error('original'), 'Custom message');

      await new Promise(r => setTimeout(r, 0));

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.message).toBe('Custom message');
    });

    it('should accept string errors', async () => {
      const sdk = RiviumTrace.init(defaultConfig());
      sdk.captureException('String error');

      await new Promise(r => setTimeout(r, 0));

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.message).toBe('String error');
    });

    it('should include extra data', async () => {
      const sdk = RiviumTrace.init(defaultConfig());
      sdk.captureException(new Error('e'), undefined, { context: 'checkout' });

      await new Promise(r => setTimeout(r, 0));

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.extra?.context).toBe('checkout');
    });

    it('should include the user_id when set', async () => {
      const sdk = RiviumTrace.init(defaultConfig());
      sdk.setUserId('u-99');
      sdk.captureException(new Error('e'));

      await new Promise(r => setTimeout(r, 0));

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.user_id).toBe('u-99');
    });

    it('should set the default level to error', async () => {
      const sdk = RiviumTrace.init(defaultConfig());
      sdk.captureException(new Error('e'));

      await new Promise(r => setTimeout(r, 0));

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.level).toBe('error');
    });

    it('should accept a custom level', async () => {
      const sdk = RiviumTrace.init(defaultConfig());
      sdk.captureException(new Error('e'), undefined, undefined, 'fatal');

      await new Promise(r => setTimeout(r, 0));

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.level).toBe('fatal');
    });

    it('should include breadcrumbs in the error payload', async () => {
      const sdk = RiviumTrace.init(defaultConfig());
      BreadcrumbService.addInfo('step 1');
      BreadcrumbService.addInfo('step 2');
      sdk.captureException(new Error('e'));

      await new Promise(r => setTimeout(r, 0));

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.breadcrumbs).toHaveLength(2);
    });

    it('should include tags from config', async () => {
      const sdk = RiviumTrace.init(defaultConfig({ tags: { team: 'core' } }));
      sdk.captureException(new Error('e'));

      await new Promise(r => setTimeout(r, 0));

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.tags?.team).toBe('core');
    });

    it('should include environment and release in payload', async () => {
      const sdk = RiviumTrace.init(defaultConfig({
        environment: 'staging',
        release: '2.0.0',
      }));
      sdk.captureException(new Error('e'));

      await new Promise(r => setTimeout(r, 0));

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.environment).toBe('staging');
      expect(body.release_version).toBe('2.0.0');
    });
  });

  // ─── captureMessage() ────────────────────────────────────

  describe('captureMessage()', () => {
    it('should send a message to the API', async () => {
      const sdk = RiviumTrace.init(defaultConfig());
      await sdk.captureMessage('Hello from test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/messages'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should include the message content', async () => {
      const sdk = RiviumTrace.init(defaultConfig());
      await sdk.captureMessage('Test message');

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.message).toBe('Test message');
    });

    it('should default level to info', async () => {
      const sdk = RiviumTrace.init(defaultConfig());
      await sdk.captureMessage('info msg');

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.level).toBe('info');
    });

    it('should accept a custom level', async () => {
      const sdk = RiviumTrace.init(defaultConfig());
      await sdk.captureMessage('warn msg', 'warning');

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.level).toBe('warning');
    });

    it('should not send when enabled is false', async () => {
      const sdk = RiviumTrace.init(defaultConfig({ enabled: false }));
      await sdk.captureMessage('should not send');

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should include extra data in message', async () => {
      const sdk = RiviumTrace.init(defaultConfig());
      await sdk.captureMessage('extra msg', 'info', { page: '/home' });

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.extra?.page).toBe('/home');
    });
  });

  // ─── Config normalization ────────────────────────────────

  describe('config normalization', () => {
    it('should default environment to "production"', async () => {
      const sdk = RiviumTrace.init({
        apiKey: 'rv_test_key_12345678901234567890',
        captureUncaughtErrors: false,
        enableCrashDetection: false,
      });
      await sdk.captureMessage('env test');

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.environment).toBe('production');
    });

    it('should always use https://trace.rivium.co as API endpoint', async () => {
      const sdk = RiviumTrace.init(defaultConfig());
      await sdk.captureMessage('endpoint test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://trace.rivium.co'),
        expect.any(Object)
      );
    });

    it('should default maxBreadcrumbs to 20', () => {
      RiviumTrace.init(defaultConfig());
      // setMaxBreadcrumbs was called with 20 by setup()
      // Add 25 breadcrumbs and verify max is 20
      for (let i = 0; i < 25; i++) {
        BreadcrumbService.addInfo(`bc-${i}`);
      }
      expect(BreadcrumbService.count()).toBe(20);
    });

    it('should use custom maxBreadcrumbs', () => {
      RiviumTrace.init(defaultConfig({ maxBreadcrumbs: 5 }));

      for (let i = 0; i < 10; i++) {
        BreadcrumbService.addInfo(`bc-${i}`);
      }
      expect(BreadcrumbService.count()).toBe(5);
    });

    it('should default sampleRate to 1.0 (all events)', async () => {
      const sdk = RiviumTrace.init(defaultConfig());
      // With sampleRate 1.0, all messages should be sent
      await sdk.captureMessage('sampled');
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should default enabled to true', async () => {
      const sdk = RiviumTrace.init(defaultConfig());
      await sdk.captureMessage('enabled test');
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  // ─── Rate limiting ──────────────────────────────────────

  describe('rate limiting', () => {
    it('should rate-limit duplicate errors', async () => {
      const sdk = RiviumTrace.init(defaultConfig());

      sdk.captureException(new Error('same error'));
      sdk.captureException(new Error('same error'));

      await new Promise(r => setTimeout(r, 0));

      // Only the first should be sent due to rate limiting
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should allow different errors', async () => {
      const sdk = RiviumTrace.init(defaultConfig());

      sdk.captureException(new Error('error A'));
      sdk.captureException(new Error('error B'));

      await new Promise(r => setTimeout(r, 0));

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  // ─── Error filtering (ignoreErrors) ─────────────────────

  describe('ignoreErrors', () => {
    it('should ignore errors matching string patterns', async () => {
      const sdk = RiviumTrace.init(defaultConfig({
        ignoreErrors: ['ChunkLoadError'],
      }));

      sdk.captureException(new Error('ChunkLoadError: loading failed'));

      await new Promise(r => setTimeout(r, 0));
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should ignore errors matching regex patterns', async () => {
      const sdk = RiviumTrace.init(defaultConfig({
        ignoreErrors: [/ResizeObserver/i],
      }));

      sdk.captureException(new Error('ResizeObserver loop limit exceeded'));

      await new Promise(r => setTimeout(r, 0));
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not ignore errors that do not match', async () => {
      const sdk = RiviumTrace.init(defaultConfig({
        ignoreErrors: ['SpecificError'],
      }));

      sdk.captureException(new Error('Different error'));

      await new Promise(r => setTimeout(r, 0));
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  // ─── ignoreUrls ──────────────────────────────────────────

  describe('ignoreUrls', () => {
    it('should ignore errors with matching stack trace URLs', async () => {
      const sdk = RiviumTrace.init(defaultConfig({
        ignoreUrls: ['chrome-extension://'],
      }));

      const error = new Error('ext error');
      error.stack = 'Error\n    at chrome-extension://abc/content.js:1:1';
      sdk.captureException(error);

      await new Promise(r => setTimeout(r, 0));
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should ignore errors matching regex URL patterns', async () => {
      const sdk = RiviumTrace.init(defaultConfig({
        ignoreUrls: [/localhost/],
      }));

      const error = new Error('local error');
      error.stack = 'Error\n    at http://localhost:3000/app.js:1:1';
      sdk.captureException(error);

      await new Promise(r => setTimeout(r, 0));
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  // ─── beforeSend hook ────────────────────────────────────

  describe('beforeSend', () => {
    it('should call beforeSend with the error data', async () => {
      const beforeSend = jest.fn((error: RiviumTraceError) => error);
      const sdk = RiviumTrace.init(defaultConfig({ beforeSend }));

      sdk.captureException(new Error('hooked'));

      await new Promise(r => setTimeout(r, 0));
      expect(beforeSend).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'hooked' })
      );
    });

    it('should prevent sending when beforeSend returns null', async () => {
      const sdk = RiviumTrace.init(defaultConfig({
        beforeSend: () => null,
      }));

      sdk.captureException(new Error('filtered'));

      await new Promise(r => setTimeout(r, 0));
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should prevent sending when beforeSend returns false', async () => {
      const sdk = RiviumTrace.init(defaultConfig({
        beforeSend: () => false,
      }));

      sdk.captureException(new Error('filtered'));

      await new Promise(r => setTimeout(r, 0));
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should send modified error from beforeSend', async () => {
      const sdk = RiviumTrace.init(defaultConfig({
        beforeSend: (error) => {
          error.tags = { ...error.tags, enriched: 'true' };
          return error;
        },
      }));

      sdk.captureException(new Error('modifiable'));

      await new Promise(r => setTimeout(r, 0));

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.tags?.enriched).toBe('true');
    });
  });

  // ─── Enabled flag ────────────────────────────────────────

  describe('enabled flag', () => {
    it('should not send errors when disabled', async () => {
      const sdk = RiviumTrace.init(defaultConfig({ enabled: false }));
      sdk.captureException(new Error('disabled'));

      await new Promise(r => setTimeout(r, 0));
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not send messages when disabled', async () => {
      const sdk = RiviumTrace.init(defaultConfig({ enabled: false }));
      await sdk.captureMessage('disabled msg');

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  // ─── HTTP headers ────────────────────────────────────────

  describe('HTTP headers', () => {
    it('should include X-API-Key header', async () => {
      const sdk = RiviumTrace.init(defaultConfig());
      sdk.captureException(new Error('e'));

      await new Promise(r => setTimeout(r, 0));

      const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
      expect(headers['X-API-Key']).toBe('rv_test_key_12345678901234567890');
    });

    it('should include Content-Type header', async () => {
      const sdk = RiviumTrace.init(defaultConfig());
      sdk.captureException(new Error('e'));

      await new Promise(r => setTimeout(r, 0));

      const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should include User-Agent header', async () => {
      const sdk = RiviumTrace.init(defaultConfig());
      sdk.captureException(new Error('e'));

      await new Promise(r => setTimeout(r, 0));

      const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
      expect(headers['User-Agent']).toContain('RiviumTrace-SDK/');
    });
  });

  // ─── Error sending failure handling ──────────────────────

  describe('error sending failure handling', () => {
    it('should not throw when fetch fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network'));
      const sdk = RiviumTrace.init(defaultConfig());

      expect(() => {
        sdk.captureException(new Error('net fail'));
      }).not.toThrow();
    });

    it('should log error when fetch fails and debug is on', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network'));
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      const sdk = RiviumTrace.init(defaultConfig({ debug: true }));
      sdk.captureException(new Error('net fail'));

      await new Promise(r => setTimeout(r, 50));
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  // ─── close() ─────────────────────────────────────────────

  describe('close()', () => {
    it('should log close when debug is on', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const sdk = RiviumTrace.init(defaultConfig({ debug: true }));
      sdk.close();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('SDK closed')
      );
    });

    it('should not throw when called', () => {
      const sdk = RiviumTrace.init(defaultConfig());
      expect(() => sdk.close()).not.toThrow();
    });
  });

  // ─── flushLogs() ────────────────────────────────────────

  describe('flushLogs()', () => {
    it('should return true when no log service is initialized', async () => {
      const sdk = RiviumTrace.init(defaultConfig());
      const result = await sdk.flushLogs();
      expect(result).toBe(true);
    });
  });

  // ─── pendingLogCount ────────────────────────────────────

  describe('pendingLogCount', () => {
    it('should return 0 when no log service is initialized', () => {
      const sdk = RiviumTrace.init(defaultConfig());
      expect(sdk.pendingLogCount).toBe(0);
    });
  });

  // ─── URL extraction from extra ──────────────────────────

  describe('URL extraction from extra', () => {
    it('should extract url from extra to the root level', async () => {
      const sdk = RiviumTrace.init(defaultConfig());
      sdk.captureException(new Error('url test'), undefined, {
        url: 'https://example.com/page',
        other: 'data',
      });

      await new Promise(r => setTimeout(r, 0));

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.url).toBe('https://example.com/page');
      // url should be removed from extra
      expect(body.extra?.url).toBeUndefined();
      expect(body.extra?.other).toBe('data');
    });
  });
});
