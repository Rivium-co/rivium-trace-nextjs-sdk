/**
 * Performance Span model for tracking HTTP requests, custom operations, and web vitals
 */
export interface PerformanceSpan {
  operation: string;
  operationType: 'http' | 'db' | 'custom';
  httpMethod?: string;
  httpUrl?: string;
  httpStatusCode?: number;
  httpHost?: string;
  durationMs: number;
  startTime: string;
  endTime?: string;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  platform: string;
  environment?: string;
  releaseVersion?: string;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
  status: 'ok' | 'error';
  errorMessage?: string;
}

/**
 * Web Vitals data for reporting
 */
export interface WebVitalsData {
  pageUrl: string;
  pageRoute?: string;
  lcpMs?: number;
  fidMs?: number;
  cls?: number;
  inpMs?: number;
  ttfbMs?: number;
  fcpMs?: number;
  deviceType?: string;
  connectionType?: string;
  sessionId?: string;
  platform: string;
  environment?: string;
  releaseVersion?: string;
}

/**
 * Helper to create a PerformanceSpan from an HTTP request
 */
export function createHttpSpan(options: {
  method: string;
  url: string;
  statusCode?: number;
  durationMs: number;
  startTime: Date;
  error?: Error;
  environment?: string;
  releaseVersion?: string;
}): PerformanceSpan {
  const urlObj = new URL(options.url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');

  return {
    operation: `${options.method} ${urlObj.pathname}`,
    operationType: 'http',
    httpMethod: options.method,
    httpUrl: options.url,
    httpStatusCode: options.statusCode,
    httpHost: urlObj.host,
    durationMs: options.durationMs,
    startTime: options.startTime.toISOString(),
    endTime: new Date().toISOString(),
    platform: 'nextjs',
    environment: options.environment,
    releaseVersion: options.releaseVersion,
    status: options.error || (options.statusCode && options.statusCode >= 400) ? 'error' : 'ok',
    errorMessage: options.error?.message,
  };
}

/**
 * Generate a unique trace ID
 */
export function generateTraceId(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Generate a unique span ID
 */
export function generateSpanId(): string {
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Factory functions for creating PerformanceSpan objects.
 * Matches the API surface of Android/Flutter/iOS SDKs.
 */
export const PerformanceSpanFactory = {
  /**
   * Create a span from an HTTP request
   */
  fromHttpRequest(options: {
    method: string;
    url: string;
    statusCode?: number;
    durationMs: number;
    startTime: Date;
    environment?: string;
    releaseVersion?: string;
    errorMessage?: string;
    tags?: Record<string, string>;
  }): PerformanceSpan {
    let host: string | undefined;
    let pathname: string;
    try {
      const urlObj = new URL(options.url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      host = urlObj.host;
      pathname = urlObj.pathname;
    } catch {
      pathname = options.url.substring(0, 50);
    }

    const status: 'ok' | 'error' =
      options.errorMessage || (options.statusCode && options.statusCode >= 400) ? 'error' : 'ok';

    return {
      operation: `${options.method} ${pathname}`,
      operationType: 'http',
      httpMethod: options.method,
      httpUrl: options.url,
      httpStatusCode: options.statusCode,
      httpHost: host,
      durationMs: options.durationMs,
      startTime: options.startTime.toISOString(),
      endTime: new Date(options.startTime.getTime() + options.durationMs).toISOString(),
      traceId: generateTraceId(),
      spanId: generateSpanId(),
      platform: 'nextjs',
      environment: options.environment,
      releaseVersion: options.releaseVersion,
      status,
      errorMessage: options.errorMessage,
      tags: options.tags,
    };
  },

  /**
   * Create a span for a database query
   */
  forDbQuery(options: {
    queryType: string;
    tableName: string;
    durationMs: number;
    startTime: Date;
    rowsAffected?: number;
    environment?: string;
    releaseVersion?: string;
    errorMessage?: string;
    tags?: Record<string, string>;
  }): PerformanceSpan {
    const mergedTags: Record<string, string> = {
      ...options.tags,
      db_table: options.tableName,
      query_type: options.queryType,
    };
    if (options.rowsAffected !== undefined) {
      mergedTags.rows_affected = String(options.rowsAffected);
    }

    return {
      operation: `${options.queryType} ${options.tableName}`,
      operationType: 'db',
      durationMs: options.durationMs,
      startTime: options.startTime.toISOString(),
      endTime: new Date(options.startTime.getTime() + options.durationMs).toISOString(),
      traceId: generateTraceId(),
      spanId: generateSpanId(),
      platform: 'nextjs',
      environment: options.environment,
      releaseVersion: options.releaseVersion,
      status: options.errorMessage ? 'error' : 'ok',
      errorMessage: options.errorMessage,
      tags: mergedTags,
    };
  },

  /**
   * Create a custom performance span
   */
  custom(options: {
    operation: string;
    durationMs: number;
    startTime: Date;
    operationType?: 'http' | 'db' | 'custom';
    status?: 'ok' | 'error';
    environment?: string;
    releaseVersion?: string;
    errorMessage?: string;
    tags?: Record<string, string>;
  }): PerformanceSpan {
    return {
      operation: options.operation,
      operationType: options.operationType || 'custom',
      durationMs: options.durationMs,
      startTime: options.startTime.toISOString(),
      endTime: new Date(options.startTime.getTime() + options.durationMs).toISOString(),
      traceId: generateTraceId(),
      spanId: generateSpanId(),
      platform: 'nextjs',
      environment: options.environment,
      releaseVersion: options.releaseVersion,
      status: options.status || (options.errorMessage ? 'error' : 'ok'),
      errorMessage: options.errorMessage,
      tags: options.tags,
    };
  },
};
