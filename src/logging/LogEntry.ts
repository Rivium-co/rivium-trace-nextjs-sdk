/**
 * Log level for RiviumTrace logging
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * A single log entry to be sent to RiviumTrace
 */
export interface LogEntry {
  message: string;
  level: LogLevel;
  timestamp?: string;
  metadata?: Record<string, any>;
  userId?: string;
}

/**
 * Configuration for the LogService
 */
export interface LogServiceConfig {
  apiKey: string;
  sourceId?: string;
  sourceName?: string;
  platform: string;
  environment: string;
  release?: string;
  batchSize?: number;
  flushIntervalMs?: number;
  maxBufferSize?: number;
  debug?: boolean;
  apiUrl?: string;
}
