import type { LogEntry, LogLevel, LogServiceConfig } from '../logging/LogEntry';

describe('LogEntry types', () => {
  // ─── LogLevel type ────────────────────────────────────────

  describe('LogLevel', () => {
    it('should accept all valid log levels', () => {
      const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
      expect(levels).toHaveLength(6);
    });
  });

  // ─── LogEntry interface ───────────────────────────────────

  describe('LogEntry interface', () => {
    it('should accept a minimal log entry with only required fields', () => {
      const entry: LogEntry = {
        message: 'hello world',
        level: 'info',
      };
      expect(entry.message).toBe('hello world');
      expect(entry.level).toBe('info');
    });

    it('should accept an entry with all optional fields', () => {
      const entry: LogEntry = {
        message: 'detailed log',
        level: 'error',
        timestamp: '2024-01-01T00:00:00.000Z',
        metadata: { requestId: 'req-123', latency: 42 },
        userId: 'user-456',
      };

      expect(entry.timestamp).toBe('2024-01-01T00:00:00.000Z');
      expect(entry.metadata?.requestId).toBe('req-123');
      expect(entry.userId).toBe('user-456');
    });

    it('should accept trace level', () => {
      const entry: LogEntry = { message: 'trace msg', level: 'trace' };
      expect(entry.level).toBe('trace');
    });

    it('should accept debug level', () => {
      const entry: LogEntry = { message: 'debug msg', level: 'debug' };
      expect(entry.level).toBe('debug');
    });

    it('should accept warn level', () => {
      const entry: LogEntry = { message: 'warn msg', level: 'warn' };
      expect(entry.level).toBe('warn');
    });

    it('should accept fatal level', () => {
      const entry: LogEntry = { message: 'fatal msg', level: 'fatal' };
      expect(entry.level).toBe('fatal');
    });
  });

  // ─── LogServiceConfig interface ───────────────────────────

  describe('LogServiceConfig interface', () => {
    it('should accept a minimal config with only required fields', () => {
      const config: LogServiceConfig = {
        apiKey: 'rv_test_key',
        platform: 'nextjs',
        environment: 'development',
      };

      expect(config.apiKey).toBe('rv_test_key');
      expect(config.platform).toBe('nextjs');
      expect(config.environment).toBe('development');
    });

    it('should accept a full config with all optional fields', () => {
      const config: LogServiceConfig = {
        apiKey: 'rv_live_key',
        sourceId: 'src-123',
        sourceName: 'my-nextjs-app',
        platform: 'nextjs_server',
        environment: 'production',
        release: '3.0.0',
        batchSize: 100,
        flushIntervalMs: 5000,
        maxBufferSize: 2000,
        debug: true,
      };

      expect(config.sourceId).toBe('src-123');
      expect(config.batchSize).toBe(100);
      expect(config.maxBufferSize).toBe(2000);
    });

    it('should allow undefined for optional fields', () => {
      const config: LogServiceConfig = {
        apiKey: 'key',
        platform: 'nextjs',
        environment: 'test',
      };

      expect(config.sourceId).toBeUndefined();
      expect(config.sourceName).toBeUndefined();
      expect(config.release).toBeUndefined();
      expect(config.batchSize).toBeUndefined();
      expect(config.flushIntervalMs).toBeUndefined();
      expect(config.maxBufferSize).toBeUndefined();
      expect(config.debug).toBeUndefined();
    });
  });
});
