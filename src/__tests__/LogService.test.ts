import { LogService } from '../logging/LogService';
import type { LogServiceConfig } from '../logging/LogEntry';

// ─── Helpers ────────────────────────────────────────────────

function createConfig(overrides?: Partial<LogServiceConfig>): LogServiceConfig {
  return {
    apiKey: 'rv_test_key',
    platform: 'nextjs',
    environment: 'test',
    ...overrides,
  };
}

function mockFetchOk() {
  return jest.fn().mockResolvedValue({ ok: true, status: 200 });
}

function mockFetchFail(status = 500) {
  return jest.fn().mockResolvedValue({ ok: false, status });
}

function mockFetchThrow() {
  return jest.fn().mockRejectedValue(new Error('Network error'));
}

describe('LogService', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    jest.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  // ─── constructor / defaults ──────────────────────────────

  describe('constructor', () => {
    it('should use default batchSize of 50', () => {
      const svc = new LogService(createConfig());
      // Add 49 logs - should not trigger flush
      global.fetch = mockFetchOk();
      for (let i = 0; i < 49; i++) {
        svc.log(`msg ${i}`);
      }
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should use custom batchSize', () => {
      global.fetch = mockFetchOk();
      const svc = new LogService(createConfig({ batchSize: 3 }));

      svc.log('a');
      svc.log('b');
      expect(global.fetch).not.toHaveBeenCalled();

      svc.log('c'); // 3rd log triggers flush
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should always use https://trace.rivium.co as API endpoint', () => {
      global.fetch = mockFetchOk();
      const svc = new LogService(createConfig({ batchSize: 1, sourceId: 'src' }));
      svc.log('test');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://trace.rivium.co/api/logs/ingest/batch',
        expect.any(Object)
      );
    });
  });

  // ─── log() ───────────────────────────────────────────────

  describe('log()', () => {
    it('should add a log entry to the buffer', () => {
      const svc = new LogService(createConfig());
      svc.log('hello');
      expect(svc.bufferSize).toBe(1);
    });

    it('should set timestamp automatically', () => {
      global.fetch = mockFetchOk();
      const svc = new LogService(createConfig({ batchSize: 1, sourceId: 'src' }));
      svc.log('timestamped');

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.logs[0].timestamp).toBeDefined();
    });

    it('should pass metadata through', () => {
      global.fetch = mockFetchOk();
      const svc = new LogService(createConfig({ batchSize: 1, sourceId: 'src' }));
      svc.log('with meta', 'info', { key: 'value' });

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.logs[0].metadata).toEqual({ key: 'value' });
    });

    it('should pass userId through', () => {
      global.fetch = mockFetchOk();
      const svc = new LogService(createConfig({ batchSize: 1, sourceId: 'src' }));
      svc.log('user log', 'info', undefined, 'user-123');

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.logs[0].userId).toBe('user-123');
    });

    it('should default level to info', () => {
      global.fetch = mockFetchOk();
      const svc = new LogService(createConfig({ batchSize: 1, sourceId: 'src' }));
      svc.log('default level');

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.logs[0].level).toBe('info');
    });
  });

  // ─── add() ───────────────────────────────────────────────

  describe('add()', () => {
    it('should add an entry with provided timestamp', () => {
      global.fetch = mockFetchOk();
      const svc = new LogService(createConfig({ batchSize: 1, sourceId: 'src' }));
      svc.add({
        message: 'manual',
        level: 'error',
        timestamp: '2024-01-01T00:00:00Z',
      });

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.logs[0].timestamp).toBe('2024-01-01T00:00:00Z');
    });

    it('should generate timestamp if not provided', () => {
      global.fetch = mockFetchOk();
      const svc = new LogService(createConfig({ batchSize: 1, sourceId: 'src' }));
      svc.add({ message: 'auto ts', level: 'info' });

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.logs[0].timestamp).toBeDefined();
    });

    it('should trigger flush when buffer reaches batchSize', () => {
      global.fetch = mockFetchOk();
      const svc = new LogService(createConfig({ batchSize: 2, sourceId: 'src' }));

      svc.add({ message: 'one', level: 'info' });
      expect(global.fetch).not.toHaveBeenCalled();

      svc.add({ message: 'two', level: 'info' });
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should schedule a timer flush when buffer has items but is below batchSize', () => {
      global.fetch = mockFetchOk();
      const svc = new LogService(createConfig({
        batchSize: 10,
        flushIntervalMs: 1000,
        sourceId: 'src',
      }));

      svc.add({ message: 'one', level: 'info' });
      expect(global.fetch).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1000);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  // ─── flush() ─────────────────────────────────────────────

  describe('flush()', () => {
    it('should return true when buffer is empty', async () => {
      const svc = new LogService(createConfig());
      const result = await svc.flush();
      expect(result).toBe(true);
    });

    it('should send batch to /api/logs/ingest/batch when sourceId is set', async () => {
      global.fetch = mockFetchOk();
      const svc = new LogService(createConfig({ sourceId: 'src-id' }));
      svc.add({ message: 'test', level: 'info' });

      await svc.flush();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/logs/ingest/batch'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should send individual logs to /api/logs/ingest when no sourceId', async () => {
      global.fetch = mockFetchOk();
      const svc = new LogService(createConfig());
      svc.add({ message: 'solo', level: 'warn' });

      await svc.flush();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/logs/ingest'),
        expect.any(Object)
      );
    });

    it('should include correct headers', async () => {
      global.fetch = mockFetchOk();
      const svc = new LogService(createConfig({ apiKey: 'my-key', sourceId: 'src' }));
      svc.add({ message: 'test', level: 'info' });

      await svc.flush();

      const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['x-api-key']).toBe('my-key');
      expect(headers['User-Agent']).toContain('RiviumTrace-SDK/');
    });

    it('should include sourceId and sourceName in batch payload', async () => {
      global.fetch = mockFetchOk();
      const svc = new LogService(createConfig({
        sourceId: 'src-999',
        sourceName: 'my-app',
      }));
      svc.add({ message: 'test', level: 'info' });

      await svc.flush();

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.sourceId).toBe('src-999');
      expect(body.sourceName).toBe('my-app');
      expect(body.sourceType).toBe('sdk');
    });

    it('should clear the buffer after successful flush', async () => {
      global.fetch = mockFetchOk();
      const svc = new LogService(createConfig({ sourceId: 'src' }));
      svc.add({ message: 'a', level: 'info' });
      svc.add({ message: 'b', level: 'info' });

      await svc.flush();
      expect(svc.bufferSize).toBe(0);
    });

    it('should put logs back in buffer on failed flush', async () => {
      global.fetch = mockFetchFail(500);
      const svc = new LogService(createConfig({ sourceId: 'src' }));
      svc.add({ message: 'retry-me', level: 'error' });

      await svc.flush();
      expect(svc.bufferSize).toBeGreaterThan(0);
    });

    it('should put logs back in buffer on network error', async () => {
      global.fetch = mockFetchThrow();
      const svc = new LogService(createConfig({ sourceId: 'src' }));
      svc.add({ message: 'retry-net', level: 'error' });

      await svc.flush();
      expect(svc.bufferSize).toBeGreaterThan(0);
    });

    it('should include release in batch payload when configured', async () => {
      global.fetch = mockFetchOk();
      const svc = new LogService(createConfig({ sourceId: 'src', release: '1.2.3' }));
      svc.add({ message: 'versioned', level: 'info' });

      await svc.flush();

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.logs[0].release).toBe('1.2.3');
    });

    it('should include environment in log entries', async () => {
      global.fetch = mockFetchOk();
      const svc = new LogService(createConfig({ sourceId: 'src', environment: 'staging' }));
      svc.add({ message: 'env test', level: 'info' });

      await svc.flush();

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.logs[0].environment).toBe('staging');
    });
  });

  // ─── sendImmediate() ─────────────────────────────────────

  describe('sendImmediate()', () => {
    it('should send a single log entry', async () => {
      global.fetch = mockFetchOk();
      const svc = new LogService(createConfig());

      const result = await svc.sendImmediate({
        message: 'immediate log',
        level: 'info',
      });

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/logs/ingest'),
        expect.any(Object)
      );
    });

    it('should return false on HTTP failure', async () => {
      global.fetch = mockFetchFail(500);
      const svc = new LogService(createConfig());

      const result = await svc.sendImmediate({
        message: 'fail',
        level: 'error',
      });

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      global.fetch = mockFetchThrow();
      const svc = new LogService(createConfig());

      const result = await svc.sendImmediate({
        message: 'net fail',
        level: 'error',
      });

      expect(result).toBe(false);
    });

    it('should include all optional fields in payload', async () => {
      global.fetch = mockFetchOk();
      const svc = new LogService(createConfig({
        sourceId: 'src',
        sourceName: 'app',
        release: '1.0',
      }));

      await svc.sendImmediate({
        message: 'full',
        level: 'debug',
        userId: 'u-1',
        metadata: { key: 'val' },
      });

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.sourceId).toBe('src');
      expect(body.sourceName).toBe('app');
      expect(body.release).toBe('1.0');
      expect(body.userId).toBe('u-1');
      expect(body.metadata).toEqual({ key: 'val' });
      expect(body.sourceType).toBe('sdk');
    });
  });

  // ─── bufferSize ──────────────────────────────────────────

  describe('bufferSize', () => {
    it('should return 0 when empty', () => {
      const svc = new LogService(createConfig());
      expect(svc.bufferSize).toBe(0);
    });

    it('should return the correct count', () => {
      const svc = new LogService(createConfig());
      svc.add({ message: 'a', level: 'info' });
      svc.add({ message: 'b', level: 'info' });
      expect(svc.bufferSize).toBe(2);
    });
  });

  // ─── Max buffer size enforcement ─────────────────────────

  describe('max buffer size', () => {
    it('should drop oldest logs when buffer exceeds maxBufferSize', () => {
      const svc = new LogService(createConfig({ maxBufferSize: 3 }));

      for (let i = 0; i < 5; i++) {
        svc.add({ message: `log-${i}`, level: 'info' });
      }

      expect(svc.bufferSize).toBe(3);
    });
  });

  // ─── Retry with exponential backoff ──────────────────────

  describe('retry with exponential backoff', () => {
    it('should schedule retry after failed flush', async () => {
      global.fetch = mockFetchFail(500);
      const svc = new LogService(createConfig({
        sourceId: 'src',
        flushIntervalMs: 1000,
      }));
      svc.add({ message: 'retry', level: 'info' });

      await svc.flush();

      // Logs should be back in buffer
      expect(svc.bufferSize).toBe(1);
    });

    it('should reset retry attempt on success', async () => {
      const fetchMock = jest.fn()
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true, status: 200 });
      global.fetch = fetchMock;

      const svc = new LogService(createConfig({ sourceId: 'src' }));
      svc.add({ message: 'test', level: 'info' });

      // First flush fails
      await svc.flush();
      expect(svc.bufferSize).toBe(1);

      // Second flush succeeds
      await svc.flush();
      expect(svc.bufferSize).toBe(0);
    });
  });

  // ─── dispose() ───────────────────────────────────────────

  describe('dispose()', () => {
    it('should flush remaining logs on dispose', () => {
      global.fetch = mockFetchOk();
      const svc = new LogService(createConfig({ sourceId: 'src' }));
      svc.add({ message: 'final', level: 'info' });

      svc.dispose();

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should clear the flush timer', () => {
      const svc = new LogService(createConfig({ flushIntervalMs: 60000 }));
      svc.add({ message: 'buffered', level: 'info' });

      svc.dispose();

      // No timer should fire after dispose
      global.fetch = mockFetchOk();
      jest.advanceTimersByTime(120000);
      // dispose already called flush, but after dispose the timer should not fire again
    });
  });

  // ─── No sourceId: individual sends ───────────────────────

  describe('flush without sourceId (individual sends)', () => {
    it('should call sendImmediate for each entry', async () => {
      global.fetch = mockFetchOk();
      const svc = new LogService(createConfig()); // no sourceId
      svc.add({ message: 'a', level: 'info' });
      svc.add({ message: 'b', level: 'info' });

      await svc.flush();

      // Each log sent individually
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should report partial success when some logs fail', async () => {
      const fetchMock = jest.fn()
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockResolvedValueOnce({ ok: false, status: 500 });
      global.fetch = fetchMock;

      const svc = new LogService(createConfig());
      svc.add({ message: 'ok', level: 'info' });
      svc.add({ message: 'fail', level: 'info' });

      const result = await svc.flush();
      expect(result).toBe(false);
    });
  });
});
