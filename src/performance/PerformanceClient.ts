import type { PerformanceSpan } from './PerformanceSpan';
import { createHttpSpan, generateSpanId, generateTraceId } from './PerformanceSpan';
import { isBrowser, getUserAgent } from '../utils/platform';
import { RIVIUMTRACE_API_URL } from '../constants';

interface PerformanceClientConfig {
  apiKey: string;
  environment?: string;
  releaseVersion?: string;
  debug?: boolean;
  batchSize?: number;
  flushInterval?: number;
}

/**
 * Performance Client for tracking HTTP request latency
 * Supports automatic fetch interception and manual span reporting
 */
export class PerformanceClient {
  private static instance: PerformanceClient | null = null;
  private config: PerformanceClientConfig;
  private spanBuffer: PerformanceSpan[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private originalFetch: typeof fetch | null = null;

  private constructor(config: PerformanceClientConfig) {
    this.config = {
      batchSize: 10,
      flushInterval: 5000,
      ...config,
    };
  }

  /**
   * Initialize Performance Client
   */
  static init(config: PerformanceClientConfig): PerformanceClient {
    if (PerformanceClient.instance) {
      return PerformanceClient.instance;
    }

    PerformanceClient.instance = new PerformanceClient(config);
    return PerformanceClient.instance;
  }

  /**
   * Get client instance
   */
  static getInstance(): PerformanceClient | null {
    return PerformanceClient.instance;
  }

  /**
   * Enable automatic fetch interception
   */
  enableAutoTracking(): void {
    if (!isBrowser()) return;

    if (this.originalFetch) {
      if (this.config.debug) {
        console.log('[RiviumTrace] Auto tracking already enabled');
      }
      return;
    }

    this.originalFetch = window.fetch;
    const self = this;

    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const startTime = new Date();
      const traceId = generateTraceId();
      const spanId = generateSpanId();

      // Determine URL and method
      let url: string;
      let method: string;

      if (typeof input === 'string') {
        url = input;
        method = init?.method || 'GET';
      } else if (input instanceof URL) {
        url = input.toString();
        method = init?.method || 'GET';
      } else {
        url = input.url;
        method = input.method || init?.method || 'GET';
      }

      // Skip tracking for RiviumTrace API calls
      if (url.includes(RIVIUMTRACE_API_URL)) {
        return self.originalFetch!.call(window, input, init);
      }

      try {
        const response = await self.originalFetch!.call(window, input, init);
        const durationMs = Date.now() - startTime.getTime();

        const span = createHttpSpan({
          method,
          url,
          statusCode: response.status,
          durationMs,
          startTime,
          environment: self.config.environment,
          releaseVersion: self.config.releaseVersion,
        });

        span.traceId = traceId;
        span.spanId = spanId;

        self.reportSpan(span);

        return response;
      } catch (error) {
        const durationMs = Date.now() - startTime.getTime();

        const span = createHttpSpan({
          method,
          url,
          durationMs,
          startTime,
          error: error instanceof Error ? error : new Error(String(error)),
          environment: self.config.environment,
          releaseVersion: self.config.releaseVersion,
        });

        span.traceId = traceId;
        span.spanId = spanId;

        self.reportSpan(span);

        throw error;
      }
    };

    if (this.config.debug) {
      console.log('[RiviumTrace] Fetch auto-tracking enabled');
    }
  }

  /**
   * Disable automatic fetch interception
   */
  disableAutoTracking(): void {
    if (this.originalFetch && isBrowser()) {
      window.fetch = this.originalFetch;
      this.originalFetch = null;

      if (this.config.debug) {
        console.log('[RiviumTrace] Fetch auto-tracking disabled');
      }
    }
  }

  /**
   * Report a performance span
   */
  reportSpan(span: PerformanceSpan): void {
    this.spanBuffer.push(span);

    if (this.spanBuffer.length >= (this.config.batchSize || 10)) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  /**
   * Track a custom operation
   */
  async trackOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    options?: { operationType?: 'http' | 'db' | 'custom'; tags?: Record<string, string> }
  ): Promise<T> {
    const startTime = new Date();
    const traceId = generateTraceId();
    const spanId = generateSpanId();

    try {
      const result = await fn();
      const durationMs = Date.now() - startTime.getTime();

      this.reportSpan({
        operation,
        operationType: options?.operationType || 'custom',
        durationMs,
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
        traceId,
        spanId,
        platform: 'nextjs',
        environment: this.config.environment,
        releaseVersion: this.config.releaseVersion,
        tags: options?.tags,
        status: 'ok',
      });

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime.getTime();

      this.reportSpan({
        operation,
        operationType: options?.operationType || 'custom',
        durationMs,
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
        traceId,
        spanId,
        platform: 'nextjs',
        environment: this.config.environment,
        releaseVersion: this.config.releaseVersion,
        tags: options?.tags,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Schedule a flush
   */
  private scheduleFlush(): void {
    if (this.flushTimer) return;

    this.flushTimer = setTimeout(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Send a single performance span immediately (matching Flutter SDK's single span endpoint)
   */
  async sendSingleSpan(span: PerformanceSpan): Promise<void> {
    try {
      const url = `${RIVIUMTRACE_API_URL}/api/performance/spans`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
          'User-Agent': getUserAgent(),
        },
        body: JSON.stringify(span),
        keepalive: true,
      });

      if (this.config.debug) {
        if (response.ok) {
          console.log(`[RiviumTrace] Sent single performance span: ${span.operation}`);
        } else {
          console.error('[RiviumTrace] Failed to send span:', response.status);
        }
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('[RiviumTrace] Error sending span:', error);
      }
    }
  }

  /**
   * Flush buffered spans to the API
   */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.spanBuffer.length === 0) return;

    const spans = [...this.spanBuffer];
    this.spanBuffer = [];

    try {
      const url = `${RIVIUMTRACE_API_URL}/api/performance/spans/batch`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
          'User-Agent': getUserAgent(),
        },
        body: JSON.stringify({ spans }),
        keepalive: true,
      });

      if (this.config.debug) {
        if (response.ok) {
          console.log(`[RiviumTrace] Sent ${spans.length} performance spans`);
        } else {
          console.error('[RiviumTrace] Failed to send spans:', response.status);
        }
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('[RiviumTrace] Error sending spans:', error);
      }

      // Re-add failed spans to buffer (up to limit)
      const maxBuffer = (this.config.batchSize || 10) * 5;
      this.spanBuffer = [...spans, ...this.spanBuffer].slice(0, maxBuffer);
    }
  }
}

/**
 * Create a wrapped fetch function with performance tracking
 */
export function createPerformanceFetch(config: PerformanceClientConfig): typeof fetch {
  return async function performanceFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const startTime = new Date();

    let url: string;
    let method: string;

    if (typeof input === 'string') {
      url = input;
      method = init?.method || 'GET';
    } else if (input instanceof URL) {
      url = input.toString();
      method = init?.method || 'GET';
    } else {
      url = input.url;
      method = input.method || init?.method || 'GET';
    }

    try {
      const response = await fetch(input, init);
      const durationMs = Date.now() - startTime.getTime();

      const span = createHttpSpan({
        method,
        url,
        statusCode: response.status,
        durationMs,
        startTime,
        environment: config.environment,
        releaseVersion: config.releaseVersion,
      });

      // Send span
      const client = PerformanceClient.getInstance();
      if (client) {
        client.reportSpan(span);
      }

      return response;
    } catch (error) {
      const durationMs = Date.now() - startTime.getTime();

      const span = createHttpSpan({
        method,
        url,
        durationMs,
        startTime,
        error: error instanceof Error ? error : new Error(String(error)),
        environment: config.environment,
        releaseVersion: config.releaseVersion,
      });

      const client = PerformanceClient.getInstance();
      if (client) {
        client.reportSpan(span);
      }

      throw error;
    }
  };
}
