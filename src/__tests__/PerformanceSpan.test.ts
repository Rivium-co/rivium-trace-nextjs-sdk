import {
  createHttpSpan,
  generateTraceId,
  generateSpanId,
  PerformanceSpanFactory,
} from '../performance/PerformanceSpan';
import type { PerformanceSpan } from '../performance/PerformanceSpan';

// createHttpSpan uses `new URL(url, window.location.origin)` so we mock window
beforeAll(() => {
  (global as any).window = {
    location: { origin: 'http://localhost:3000', href: 'http://localhost:3000/' },
  };
});

afterAll(() => {
  delete (global as any).window;
});

describe('PerformanceSpan', () => {
  // ─── PerformanceSpan interface (compile-time) ─────────────

  describe('PerformanceSpan interface', () => {
    it('should accept a minimal span with required fields', () => {
      const span: PerformanceSpan = {
        operation: 'GET /api/users',
        operationType: 'http',
        durationMs: 120,
        startTime: new Date().toISOString(),
        platform: 'nextjs',
        status: 'ok',
      };
      expect(span.status).toBe('ok');
    });

    it('should accept a span with all optional fields', () => {
      const span: PerformanceSpan = {
        operation: 'POST /api/items',
        operationType: 'http',
        httpMethod: 'POST',
        httpUrl: '/api/items',
        httpStatusCode: 201,
        httpHost: 'localhost:3000',
        durationMs: 50,
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-01T00:00:00.050Z',
        traceId: 'abc123',
        spanId: 'def456',
        parentSpanId: 'parent1',
        platform: 'nextjs',
        environment: 'production',
        releaseVersion: '1.0.0',
        tags: { team: 'backend' },
        metadata: { extra: true },
        status: 'error',
        errorMessage: 'Timeout',
      };
      expect(span.errorMessage).toBe('Timeout');
    });
  });

  // ─── createHttpSpan() ─────────────────────────────────────

  describe('createHttpSpan()', () => {
    it('should create a span with correct operation', () => {
      const span = createHttpSpan({
        method: 'GET',
        url: '/api/users',
        statusCode: 200,
        durationMs: 100,
        startTime: new Date(),
      });

      expect(span.operation).toBe('GET /api/users');
      expect(span.operationType).toBe('http');
    });

    it('should set httpMethod and httpUrl', () => {
      const span = createHttpSpan({
        method: 'POST',
        url: 'http://example.com/api/data',
        durationMs: 50,
        startTime: new Date(),
      });

      expect(span.httpMethod).toBe('POST');
      expect(span.httpUrl).toBe('http://example.com/api/data');
    });

    it('should set httpHost from URL', () => {
      const span = createHttpSpan({
        method: 'GET',
        url: 'http://api.example.com/v1/users',
        durationMs: 75,
        startTime: new Date(),
      });

      expect(span.httpHost).toBe('api.example.com');
    });

    it('should set status to ok for successful responses', () => {
      const span = createHttpSpan({
        method: 'GET',
        url: '/api/ok',
        statusCode: 200,
        durationMs: 10,
        startTime: new Date(),
      });

      expect(span.status).toBe('ok');
    });

    it('should set status to error for 400+ status codes', () => {
      const span = createHttpSpan({
        method: 'GET',
        url: '/api/fail',
        statusCode: 500,
        durationMs: 10,
        startTime: new Date(),
      });

      expect(span.status).toBe('error');
    });

    it('should set status to error when error is provided', () => {
      const span = createHttpSpan({
        method: 'GET',
        url: '/api/timeout',
        durationMs: 5000,
        startTime: new Date(),
        error: new Error('Timeout'),
      });

      expect(span.status).toBe('error');
      expect(span.errorMessage).toBe('Timeout');
    });

    it('should set platform to "nextjs"', () => {
      const span = createHttpSpan({
        method: 'GET',
        url: '/api',
        durationMs: 1,
        startTime: new Date(),
      });
      expect(span.platform).toBe('nextjs');
    });

    it('should set startTime as ISO string', () => {
      const start = new Date('2024-06-15T12:00:00Z');
      const span = createHttpSpan({
        method: 'GET',
        url: '/api',
        durationMs: 1,
        startTime: start,
      });
      expect(span.startTime).toBe('2024-06-15T12:00:00.000Z');
    });

    it('should set endTime', () => {
      const span = createHttpSpan({
        method: 'GET',
        url: '/api',
        durationMs: 1,
        startTime: new Date(),
      });
      expect(span.endTime).toBeDefined();
    });

    it('should include environment and releaseVersion when provided', () => {
      const span = createHttpSpan({
        method: 'GET',
        url: '/api',
        durationMs: 1,
        startTime: new Date(),
        environment: 'staging',
        releaseVersion: '2.0.0',
      });
      expect(span.environment).toBe('staging');
      expect(span.releaseVersion).toBe('2.0.0');
    });
  });

  // ─── generateTraceId() ───────────────────────────────────

  describe('generateTraceId()', () => {
    it('should generate a 32-character hex string', () => {
      const id = generateTraceId();
      expect(id).toHaveLength(32);
      expect(id).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateTraceId()));
      expect(ids.size).toBe(100);
    });
  });

  // ─── generateSpanId() ────────────────────────────────────

  describe('generateSpanId()', () => {
    it('should generate a 16-character hex string', () => {
      const id = generateSpanId();
      expect(id).toHaveLength(16);
      expect(id).toMatch(/^[0-9a-f]{16}$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateSpanId()));
      expect(ids.size).toBe(100);
    });
  });

  // ─── PerformanceSpanFactory ───────────────────────────────

  describe('PerformanceSpanFactory', () => {
    describe('fromHttpRequest()', () => {
      it('should create a span with HTTP details', () => {
        const span = PerformanceSpanFactory.fromHttpRequest({
          method: 'POST',
          url: 'http://example.com/api/create',
          statusCode: 201,
          durationMs: 200,
          startTime: new Date('2024-01-01T00:00:00Z'),
        });

        expect(span.operation).toBe('POST /api/create');
        expect(span.operationType).toBe('http');
        expect(span.httpMethod).toBe('POST');
        expect(span.httpStatusCode).toBe(201);
        expect(span.httpHost).toBe('example.com');
        expect(span.durationMs).toBe(200);
        expect(span.status).toBe('ok');
        expect(span.traceId).toBeDefined();
        expect(span.spanId).toBeDefined();
      });

      it('should set status to error for 400+ status code', () => {
        const span = PerformanceSpanFactory.fromHttpRequest({
          method: 'GET',
          url: '/api/notfound',
          statusCode: 404,
          durationMs: 10,
          startTime: new Date(),
        });
        expect(span.status).toBe('error');
      });

      it('should set status to error when errorMessage is provided', () => {
        const span = PerformanceSpanFactory.fromHttpRequest({
          method: 'GET',
          url: '/api/fail',
          durationMs: 100,
          startTime: new Date(),
          errorMessage: 'Network error',
        });
        expect(span.status).toBe('error');
        expect(span.errorMessage).toBe('Network error');
      });

      it('should calculate endTime from startTime + durationMs', () => {
        const start = new Date('2024-06-01T12:00:00.000Z');
        const span = PerformanceSpanFactory.fromHttpRequest({
          method: 'GET',
          url: '/api',
          durationMs: 500,
          startTime: start,
        });
        expect(span.endTime).toBe('2024-06-01T12:00:00.500Z');
      });

      it('should handle malformed URLs gracefully', () => {
        const span = PerformanceSpanFactory.fromHttpRequest({
          method: 'GET',
          url: 'not-a-valid-url-@@',
          durationMs: 10,
          startTime: new Date(),
        });
        // Should fall back to truncated URL
        expect(span.operation).toContain('GET');
      });

      it('should include tags when provided', () => {
        const span = PerformanceSpanFactory.fromHttpRequest({
          method: 'GET',
          url: '/api',
          durationMs: 1,
          startTime: new Date(),
          tags: { region: 'us-east' },
        });
        expect(span.tags?.region).toBe('us-east');
      });
    });

    describe('forDbQuery()', () => {
      it('should create a DB span with correct operation', () => {
        const span = PerformanceSpanFactory.forDbQuery({
          queryType: 'SELECT',
          tableName: 'users',
          durationMs: 15,
          startTime: new Date(),
        });

        expect(span.operation).toBe('SELECT users');
        expect(span.operationType).toBe('db');
        expect(span.tags?.db_table).toBe('users');
        expect(span.tags?.query_type).toBe('SELECT');
        expect(span.status).toBe('ok');
      });

      it('should include rows_affected in tags when provided', () => {
        const span = PerformanceSpanFactory.forDbQuery({
          queryType: 'INSERT',
          tableName: 'logs',
          durationMs: 5,
          startTime: new Date(),
          rowsAffected: 42,
        });

        expect(span.tags?.rows_affected).toBe('42');
      });

      it('should set status to error when errorMessage is provided', () => {
        const span = PerformanceSpanFactory.forDbQuery({
          queryType: 'DELETE',
          tableName: 'sessions',
          durationMs: 100,
          startTime: new Date(),
          errorMessage: 'Constraint violation',
        });

        expect(span.status).toBe('error');
        expect(span.errorMessage).toBe('Constraint violation');
      });

      it('should merge provided tags with db_table and query_type', () => {
        const span = PerformanceSpanFactory.forDbQuery({
          queryType: 'UPDATE',
          tableName: 'items',
          durationMs: 20,
          startTime: new Date(),
          tags: { pool: 'primary' },
        });

        expect(span.tags?.pool).toBe('primary');
        expect(span.tags?.db_table).toBe('items');
      });
    });

    describe('custom()', () => {
      it('should create a custom span', () => {
        const span = PerformanceSpanFactory.custom({
          operation: 'process-image',
          durationMs: 3000,
          startTime: new Date(),
        });

        expect(span.operation).toBe('process-image');
        expect(span.operationType).toBe('custom');
        expect(span.status).toBe('ok');
      });

      it('should use provided operationType', () => {
        const span = PerformanceSpanFactory.custom({
          operation: 'cache-lookup',
          durationMs: 2,
          startTime: new Date(),
          operationType: 'db',
        });

        expect(span.operationType).toBe('db');
      });

      it('should use provided status', () => {
        const span = PerformanceSpanFactory.custom({
          operation: 'task',
          durationMs: 100,
          startTime: new Date(),
          status: 'error',
        });

        expect(span.status).toBe('error');
      });

      it('should infer error status from errorMessage', () => {
        const span = PerformanceSpanFactory.custom({
          operation: 'task',
          durationMs: 100,
          startTime: new Date(),
          errorMessage: 'Failed',
        });

        expect(span.status).toBe('error');
      });

      it('should include traceId and spanId', () => {
        const span = PerformanceSpanFactory.custom({
          operation: 'op',
          durationMs: 1,
          startTime: new Date(),
        });

        expect(span.traceId).toBeDefined();
        expect(span.spanId).toBeDefined();
      });
    });
  });
});
