import type { LogEntry, LogLevel, LogServiceConfig } from './LogEntry';
import { getUserAgent } from '../utils/platform';
import { RIVIUMTRACE_API_URL } from '../constants';

/**
 * Service for batching and sending logs to RiviumTrace
 *
 * Features (matching Better Stack/Logtail):
 * - Lazy timer: only runs when buffer has logs
 * - Exponential backoff: retries with increasing delays (1s, 2s, 4s, 8s...)
 * - Max buffer size: drops oldest logs when buffer exceeds limit
 */
export class LogService {
  private readonly apiKey: string;
  private readonly sourceId?: string;
  private readonly sourceName?: string;
  private readonly platform: string;
  private readonly environment: string;
  private readonly release?: string;
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private readonly maxBufferSize: number;
  private readonly debug: boolean;
  private readonly apiUrl: string;

  private buffer: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private isFlushing = false;
  private retryAttempt = 0;

  // Exponential backoff constants
  private readonly baseRetryDelayMs = 1000;
  private readonly maxRetryDelayMs = 60000;
  private readonly maxRetryAttempts = 10;

  constructor(config: LogServiceConfig) {
    this.apiKey = config.apiKey;
    this.sourceId = config.sourceId;
    this.sourceName = config.sourceName;
    this.platform = config.platform;
    this.environment = config.environment;
    this.release = config.release;
    this.batchSize = config.batchSize ?? 50;
    this.flushIntervalMs = config.flushIntervalMs ?? 30000;
    this.maxBufferSize = config.maxBufferSize ?? 1000;
    this.debug = config.debug ?? false;
    this.apiUrl = config.apiUrl ?? RIVIUMTRACE_API_URL;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private getRetryDelay(): number {
    const delay = this.baseRetryDelayMs * Math.pow(2, this.retryAttempt);
    return Math.min(delay, this.maxRetryDelayMs);
  }

  /**
   * Enforce max buffer size by dropping oldest logs
   */
  private enforceMaxBufferSize(): void {
    if (this.buffer.length > this.maxBufferSize) {
      const dropCount = this.buffer.length - this.maxBufferSize;
      this.buffer.splice(0, dropCount);
      if (this.debug) {
        console.warn(`[RiviumTrace] Buffer overflow: dropped ${dropCount} oldest logs`);
      }
    }
  }

  /**
   * Schedule a one-shot flush timer (only if buffer has logs)
   */
  private scheduleFlush(): void {
    // Cancel existing timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Only schedule if there are logs to send
    if (this.buffer.length > 0) {
      // Use exponential backoff delay if retrying, otherwise normal interval
      const delay = this.retryAttempt > 0 ? this.getRetryDelay() : this.flushIntervalMs;

      this.flushTimer = setTimeout(() => this.flush(), delay);
    }
  }

  /**
   * Add a log entry to the buffer
   */
  add(entry: LogEntry): void {
    this.buffer.push({
      ...entry,
      timestamp: entry.timestamp ?? new Date().toISOString(),
    });

    // Enforce max buffer size (drop oldest if exceeds limit)
    this.enforceMaxBufferSize();

    if (this.buffer.length >= this.batchSize) {
      this.flush();
    } else if (!this.flushTimer) {
      // Schedule flush only if timer isn't already running
      this.scheduleFlush();
    }
  }

  /**
   * Add a log with convenience parameters
   */
  log(
    message: string,
    level: LogLevel = 'info',
    metadata?: Record<string, any>,
    userId?: string
  ): void {
    this.add({
      message,
      level,
      timestamp: new Date().toISOString(),
      metadata,
      userId,
    });
  }

  /**
   * Send a single log immediately (bypasses batching)
   */
  async sendImmediate(entry: LogEntry): Promise<boolean> {
    try {
      const payload: Record<string, any> = {
        message: entry.message,
        level: entry.level,
        timestamp: entry.timestamp ?? new Date().toISOString(),
        platform: this.platform,
        environment: this.environment,
        sourceType: 'sdk',
      };

      if (this.release) payload.release = this.release;
      if (this.sourceId) payload.sourceId = this.sourceId;
      if (this.sourceName) payload.sourceName = this.sourceName;
      if (entry.userId) payload.userId = entry.userId;
      if (entry.metadata) payload.metadata = entry.metadata;

      const response = await fetch(`${this.apiUrl}/api/logs/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'User-Agent': getUserAgent(),
        },
        body: JSON.stringify(payload),
      });

      const success = response.ok;
      if (this.debug) {
        if (success) {
          console.log('[RiviumTrace] Log sent successfully');
        } else {
          console.warn(`[RiviumTrace] Failed to send log: ${response.status}`);
        }
      }
      return success;
    } catch (error) {
      if (this.debug) {
        console.error('[RiviumTrace] Error sending log:', error);
      }
      return false;
    }
  }

  /**
   * Flush all buffered logs to the server
   */
  async flush(): Promise<boolean> {
    // Cancel timer since we're flushing now
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.buffer.length === 0 || this.isFlushing) {
      return true;
    }

    this.isFlushing = true;
    const logsToSend = [...this.buffer];
    this.buffer = [];

    try {
      // If no sourceId, send individual logs
      if (!this.sourceId) {
        let allSucceeded = true;
        for (const entry of logsToSend) {
          if (!(await this.sendImmediate(entry))) {
            allSucceeded = false;
          }
        }
        this.isFlushing = false;
        return allSucceeded;
      }

      // Batch send
      const logs = logsToSend.map((entry) => ({
        message: entry.message,
        level: entry.level,
        timestamp: entry.timestamp ?? new Date().toISOString(),
        platform: this.platform,
        environment: this.environment,
        ...(this.release && { release: this.release }),
        ...(entry.userId && { userId: entry.userId }),
        ...(entry.metadata && { metadata: entry.metadata }),
      }));

      const payload: Record<string, any> = {
        sourceId: this.sourceId,
        sourceType: 'sdk',
        logs,
      };

      if (this.sourceName) {
        payload.sourceName = this.sourceName;
      }

      const response = await fetch(`${this.apiUrl}/api/logs/ingest/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'User-Agent': getUserAgent(),
        },
        body: JSON.stringify(payload),
      });

      const success = response.ok;

      if (success) {
        this.retryAttempt = 0; // Reset on success
        if (this.debug) {
          console.log(`[RiviumTrace] Batch logs sent: ${logsToSend.length}`);
        }
      } else {
        // Put logs back in buffer for retry
        this.buffer = [...logsToSend, ...this.buffer];
        this.enforceMaxBufferSize(); // Don't exceed max when re-adding
        // Increment retry attempt and schedule with backoff
        if (this.retryAttempt < this.maxRetryAttempts) {
          this.retryAttempt++;
          this.scheduleFlush();
        } else {
          if (this.debug) {
            console.error('[RiviumTrace] Max retry attempts reached, logs will be dropped');
          }
          this.retryAttempt = 0;
        }
        if (this.debug) {
          console.warn(`[RiviumTrace] Failed to send batch logs: ${response.status}`);
        }
      }

      this.isFlushing = false;
      return success;
    } catch (error) {
      // Put logs back in buffer for retry
      this.buffer = [...logsToSend, ...this.buffer];
      this.enforceMaxBufferSize(); // Don't exceed max when re-adding
      // Increment retry attempt and schedule with backoff
      if (this.retryAttempt < this.maxRetryAttempts) {
        this.retryAttempt++;
        this.scheduleFlush();
      } else {
        if (this.debug) {
          console.error('[RiviumTrace] Max retry attempts reached, logs will be dropped');
        }
        this.retryAttempt = 0;
      }
      if (this.debug) {
        console.error('[RiviumTrace] Error flushing logs:', error);
      }
      this.isFlushing = false;
      return false;
    }
  }

  /**
   * Get the number of buffered logs
   */
  get bufferSize(): number {
    return this.buffer.length;
  }

  /**
   * Dispose the service
   */
  dispose(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }
}
