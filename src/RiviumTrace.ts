import type {
  RiviumTraceConfig,
  RiviumTraceError,
  RiviumTraceMessage,
  MessageLevel,
  NormalizedConfig,
} from './models';
import { BreadcrumbService } from './services/BreadcrumbService';
import { CrashDetector } from './services/CrashDetector';
import { RateLimiter } from './utils/rateLimiter';
import { getPlatformString, getUserAgent, isBrowser, isServer } from './utils/platform';
import { RouterIntegration } from './utils/routerIntegration';
import { WebVitalsTracker } from './performance/WebVitalsTracker';
import { PerformanceClient, createPerformanceFetch } from './performance/PerformanceClient';
import type { PerformanceSpan } from './performance/PerformanceSpan';
import { RIVIUMTRACE_API_URL } from './constants';

/**
 * RiviumTrace SDK for Next.js
 * Comprehensive error tracking, crash detection, and breadcrumbs
 */
export class RiviumTrace {
  private static instance: RiviumTrace | null = null;
  private config: NormalizedConfig;
  private userId?: string;
  private sessionId: string;
  private extras: Record<string, any> = {};
  private tags: Record<string, string> = {};
  private isInitialized = false;
  private webVitalsTracker: WebVitalsTracker | null = null;
  private performanceClient: PerformanceClient | null = null;
  private logService: import('./logging').LogService | null = null;
  private logServiceInitPromise: Promise<void> | null = null;

  private constructor(config: RiviumTraceConfig) {
    this.config = this.normalizeConfig(config);
    this.sessionId = this.generateSessionId();
    this.tags = { ...(config.tags || {}) };
  }

  /**
   * Generate a random session ID (16 hex bytes, matching Flutter SDK)
   */
  private generateSessionId(): string {
    const bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 16; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Initialize RiviumTrace SDK
   */
  static init(config: RiviumTraceConfig): RiviumTrace {
    if (RiviumTrace.instance) {
      console.warn('[RiviumTrace] SDK already initialized');
      return RiviumTrace.instance;
    }

    RiviumTrace.instance = new RiviumTrace(config);
    RiviumTrace.instance.setup();

    return RiviumTrace.instance;
  }

  /**
   * Get SDK instance
   */
  static getInstance(): RiviumTrace | null {
    return RiviumTrace.instance;
  }

  /**
   * Setup SDK - configure error handlers and crash detection
   */
  private setup(): void {
    if (this.isInitialized) return;

    if (this.config.debug) {
      console.log('[RiviumTrace] Initializing SDK...', {
        apiKey: this.config.apiKey.substring(0, 15) + '...',
        environment: this.config.environment,
        platform: getPlatformString(),
      });
    }

    // Set max breadcrumbs
    BreadcrumbService.setMaxBreadcrumbs(this.config.maxBreadcrumbs);

    // Setup error handlers
    if (this.config.captureUncaughtErrors) {
      this.setupErrorHandlers();
    }

    // Setup crash detection
    if (this.config.enableCrashDetection && isBrowser()) {
      this.setupCrashDetection();
    }

    this.isInitialized = true;

    if (this.config.debug) {
      console.log('[RiviumTrace] SDK initialized successfully');
    }
  }

  /**
   * Setup error handlers for browser and server
   */
  private setupErrorHandlers(): void {
    if (isBrowser() && this.config.enableClientSide) {
      // Browser error handler
      window.addEventListener('error', (event) => {
        this.handleBrowserError(event);
      });

      // Unhandled promise rejection handler
      window.addEventListener('unhandledrejection', (event) => {
        this.handleUnhandledRejection(event);
      });

      // Console error capture (optional)
      this.interceptConsoleErrors();
    }

    if (isServer() && this.config.enableServerSide) {
      // Node.js uncaught exception handler
      process.on('uncaughtException', (error) => {
        this.captureException(error, 'Uncaught Exception');
      });

      // Node.js unhandled promise rejection
      process.on('unhandledRejection', (reason) => {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        this.captureException(error, 'Unhandled Promise Rejection');
      });
    }
  }

  /**
   * Setup crash detection
   */
  private async setupCrashDetection(): Promise<void> {
    CrashDetector.enable();

    // Check for previous crash
    if (CrashDetector.didCrashLastSession()) {
      const crashReport = CrashDetector.getCrashReport();
      if (crashReport) {
        await this.reportCrash(crashReport);
        CrashDetector.clearCrashMarker();
      }
    }

    // Mark app start
    CrashDetector.markAppStart();
  }

  /**
   * Handle browser errors
   */
  private handleBrowserError(event: ErrorEvent): void {
    const { message, filename, lineno, colno, error } = event;

    // Build stack trace
    let stackTrace = '';
    if (error && error.stack) {
      stackTrace = error.stack;
    } else if (filename) {
      stackTrace = `Error\n    at ${filename}:${lineno}:${colno}`;
    }

    const extra: Record<string, any> = {
      ...this.extras,
      filename,
      lineno,
      colno,
      error_type: 'javascript_error',
      url: window.location.href,
    };

    // Add navigation context
    const navContext = RouterIntegration.getNavigationContext();
    Object.assign(extra, navContext);

    this.captureError(message, stackTrace, extra, 'error');
  }

  /**
   * Handle unhandled promise rejections
   */
  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    const stackTrace = reason instanceof Error ? reason.stack : undefined;

    const extra: Record<string, any> = {
      ...this.extras,
      error_type: 'unhandled_rejection',
      url: isBrowser() ? window.location.href : undefined,
    };

    // Add navigation context
    if (isBrowser()) {
      const navContext = RouterIntegration.getNavigationContext();
      Object.assign(extra, navContext);
    }

    this.captureError(message, stackTrace, extra, 'error');
  }

  /**
   * Intercept console errors
   */
  private interceptConsoleErrors(): void {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      // Add console breadcrumb
      BreadcrumbService.addConsole('error', args.map(String).join(' '));

      // Call original
      originalError.apply(console, args);
    };

    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
      BreadcrumbService.addConsole('warn', args.map(String).join(' '));
      originalWarn.apply(console, args);
    };
  }

  /**
   * Capture exception manually
   */
  captureException(
    error: Error | string,
    message?: string,
    extra?: Record<string, any>,
    level: 'fatal' | 'error' | 'warning' = 'error',
    callback?: (success: boolean) => void
  ): void {
    const errorMessage = message || (error instanceof Error ? error.message : String(error));
    const stackTrace = error instanceof Error ? error.stack : undefined;

    const extraData = { ...this.extras, ...extra };

    // Add navigation context if in browser
    if (isBrowser()) {
      const navContext = RouterIntegration.getNavigationContext();
      Object.assign(extraData, navContext);
    }

    this.captureError(errorMessage, stackTrace, extraData, level, callback);
  }

  /**
   * Capture message/log
   */
  async captureMessage(
    message: string,
    level: MessageLevel | 'info' | 'warning' | 'error' | 'debug' = 'info',
    extra?: Record<string, any>,
    callback?: (success: boolean) => void
  ): Promise<void> {
    if (!this.config.enabled) {
      callback?.(false);
      return;
    }

    // Sample rate check
    if (Math.random() > this.config.sampleRate) {
      callback?.(false);
      return;
    }

    const messageData: RiviumTraceMessage = {
      message,
      level,
      platform: getPlatformString(),
      environment: this.config.environment,
      release: this.config.release,
      timestamp: new Date().toISOString(),
      user_id: this.userId,
      session_id: this.sessionId,
      extra: { ...this.extras, ...extra },
      tags: this.tags,
      breadcrumbs: BreadcrumbService.toJSON(),
    };

    await this.sendMessage(messageData, callback);
  }

  /**
   * Internal error capture
   */
  private captureError(
    message: string,
    stackTrace?: string,
    extra?: Record<string, any>,
    level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'error',
    callback?: (success: boolean) => void
  ): void {
    if (!this.config.enabled) {
      callback?.(false);
      return;
    }

    // Sample rate check
    if (Math.random() > this.config.sampleRate) {
      callback?.(false);
      return;
    }

    // Ignore errors check
    if (this.shouldIgnoreError(message, stackTrace)) {
      callback?.(false);
      return;
    }

    // Rate limiting
    const errorKey = RateLimiter.generateErrorKey(message, stackTrace);
    if (!RateLimiter.shouldSendError(errorKey)) {
      if (this.config.debug) {
        console.log('[RiviumTrace] Error rate limited:', message);
      }
      callback?.(false);
      return;
    }

    // Extract url from extra to root level (backend expects it at root)
    let url: string | undefined;
    let cleanExtra = extra ? { ...extra } : undefined;
    if (cleanExtra?.url) {
      url = cleanExtra.url;
      delete cleanExtra.url;
    }

    const errorData: RiviumTraceError = {
      message,
      stack_trace: stackTrace,
      platform: getPlatformString(),
      environment: this.config.environment,
      release_version: this.config.release,
      timestamp: new Date().toISOString(),
      user_id: this.userId,
      session_id: this.sessionId,
      extra: cleanExtra,
      tags: this.tags,
      level,
      url,
    };

    // Extract breadcrumbs to root level (matching Flutter SDK behavior)
    const breadcrumbs = BreadcrumbService.toJSON();
    errorData.breadcrumbs = breadcrumbs;

    // beforeSend hook
    if (this.config.beforeSend) {
      const result = this.config.beforeSend(errorData);
      if (result === false || result === null) {
        if (this.config.debug) {
          console.log('[RiviumTrace] Error filtered by beforeSend:', message);
        }
        callback?.(false);
        return;
      }
      // Use modified error data
      this.sendError(result, callback);
    } else {
      this.sendError(errorData, callback);
    }
  }

  /**
   * Check if error should be ignored
   */
  private shouldIgnoreError(message: string, stackTrace?: string): boolean {
    // Check ignore patterns
    for (const pattern of this.config.ignoreErrors) {
      if (pattern instanceof RegExp) {
        if (pattern.test(message)) return true;
      } else if (message.includes(pattern)) {
        return true;
      }
    }

    // Check ignore URLs
    if (stackTrace) {
      for (const pattern of this.config.ignoreUrls) {
        if (pattern instanceof RegExp) {
          if (pattern.test(stackTrace)) return true;
        } else if (stackTrace.includes(pattern)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Send error to API
   */
  private async sendError(error: RiviumTraceError, callback?: (success: boolean) => void): Promise<void> {
    try {
      const url = `${this.config.apiUrl}/api/errors`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
          'User-Agent': getUserAgent(),
        },
        body: JSON.stringify(error),
        signal: AbortSignal.timeout(this.config.timeout * 1000),
      });

      const success = response.ok || response.status === 409;

      if (this.config.debug) {
        if (response.ok) {
          console.log('[RiviumTrace] Error sent successfully:', error.message);
        } else if (response.status === 409) {
          console.log('[RiviumTrace] Duplicate error (expected):', error.message);
        } else {
          console.error('[RiviumTrace] Failed to send error:', response.status, await response.text());
        }
      }

      callback?.(success);
    } catch (err) {
      console.error('[RiviumTrace] Error sending error:', err);
      callback?.(false);
    }
  }

  /**
   * Send message to API
   */
  private async sendMessage(message: RiviumTraceMessage, callback?: (success: boolean) => void): Promise<void> {
    try {
      const url = `${this.config.apiUrl}/api/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
          'User-Agent': getUserAgent(),
        },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(this.config.timeout * 1000),
      });

      if (this.config.debug) {
        if (response.ok) {
          console.log('[RiviumTrace] Message sent successfully:', message.message);
        } else {
          console.error('[RiviumTrace] Failed to send message:', response.status);
        }
      }

      callback?.(response.ok);
    } catch (err) {
      console.error('[RiviumTrace] Error sending message:', err);
      callback?.(false);
    }
  }

  /**
   * Report crash
   */
  private async reportCrash(crashReport: any): Promise<void> {
    if (this.config.debug) {
      console.log('[RiviumTrace] Reporting crash from previous session:', crashReport);
    }

    const errorData: RiviumTraceError = {
      message: crashReport.message,
      platform: getPlatformString(),
      environment: this.config.environment,
      release_version: this.config.release,
      timestamp: crashReport.detectedTime,
      user_id: this.userId,
      session_id: this.sessionId,
      extra: { ...this.extras, ...crashReport },
      tags: this.tags,
      level: 'fatal',
    };

    await this.sendError(errorData);
  }

  /**
   * Set user ID
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Get user ID
   */
  getUserId(): string | undefined {
    return this.userId;
  }

  /**
   * Get session ID (auto-generated per SDK init, matching Flutter SDK)
   */
  getSessionId(): string {
    return this.sessionId;
  }

  // ==================== EXTRAS (Global Context) ====================

  /**
   * Set a single extra context value (persists across all captures)
   */
  setExtra(key: string, value: any): void {
    this.extras[key] = value;
  }

  /**
   * Set multiple extra context values
   */
  setExtras(extras: Record<string, any>): void {
    Object.assign(this.extras, extras);
  }

  /**
   * Get a single extra context value
   */
  getExtra(key: string): any {
    return this.extras[key];
  }

  /**
   * Get all extra context values
   */
  getExtras(): Record<string, any> {
    return { ...this.extras };
  }

  /**
   * Clear all extra context values
   */
  clearExtras(): void {
    this.extras = {};
  }

  // ==================== TAGS (Post-Init) ====================

  /**
   * Set a single tag (persists across all captures)
   */
  setTag(key: string, value: string): void {
    this.tags[key] = value;
  }

  /**
   * Set multiple tags
   */
  setTags(tags: Record<string, string>): void {
    Object.assign(this.tags, tags);
  }

  /**
   * Get a single tag value
   */
  getTag(key: string): string | undefined {
    return this.tags[key];
  }

  /**
   * Get all tags
   */
  getTags(): Record<string, string> {
    return { ...this.tags };
  }

  /**
   * Clear all tags
   */
  clearTags(): void {
    this.tags = {};
  }

  /**
   * Enable Web Vitals tracking (LCP, FID, CLS, INP, TTFB, FCP)
   * Uses Google's official web-vitals library
   */
  enableWebVitals(options?: { reportAllChanges?: boolean; batchInterval?: number }): void {
    if (!isBrowser()) {
      if (this.config.debug) {
        console.log('[RiviumTrace] Web Vitals skipped - not in browser');
      }
      return;
    }

    this.webVitalsTracker = WebVitalsTracker.init({
      apiKey: this.config.apiKey,
      apiUrl: this.config.apiUrl,
      environment: this.config.environment,
      releaseVersion: this.config.release,
      debug: this.config.debug,
      reportAllChanges: options?.reportAllChanges,
      batchInterval: options?.batchInterval,
    });

    if (this.config.debug) {
      console.log('[RiviumTrace] Web Vitals tracking enabled');
    }
  }

  /**
   * Enable automatic HTTP request performance tracking
   */
  enablePerformanceTracking(options?: { batchSize?: number; flushInterval?: number }): void {
    this.performanceClient = PerformanceClient.init({
      apiKey: this.config.apiKey,
      apiUrl: this.config.apiUrl,
      environment: this.config.environment,
      releaseVersion: this.config.release,
      debug: this.config.debug,
      batchSize: options?.batchSize,
      flushInterval: options?.flushInterval,
    });

    if (isBrowser()) {
      this.performanceClient.enableAutoTracking();
    }

    if (this.config.debug) {
      console.log('[RiviumTrace] Performance tracking enabled');
    }
  }

  /**
   * Report a performance span manually
   */
  reportPerformanceSpan(span: PerformanceSpan): void {
    if (!this.performanceClient) {
      this.performanceClient = PerformanceClient.init({
        apiKey: this.config.apiKey,
        apiUrl: this.config.apiUrl,
        environment: this.config.environment,
        releaseVersion: this.config.release,
        debug: this.config.debug,
      });
    }

    this.performanceClient.reportSpan(span);
  }

  /**
   * Report multiple performance spans in a batch
   */
  reportPerformanceSpanBatch(spans: PerformanceSpan[]): void {
    if (!this.performanceClient) {
      this.performanceClient = PerformanceClient.init({
        apiKey: this.config.apiKey,
        apiUrl: this.config.apiUrl,
        environment: this.config.environment,
        releaseVersion: this.config.release,
        debug: this.config.debug,
      });
    }

    for (const span of spans) {
      this.performanceClient.reportSpan(span);
    }
  }

  /**
   * Track a custom operation and report its duration
   */
  async trackOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    options?: { operationType?: 'http' | 'db' | 'custom'; tags?: Record<string, string> }
  ): Promise<T> {
    if (!this.performanceClient) {
      this.performanceClient = PerformanceClient.init({
        apiKey: this.config.apiKey,
        apiUrl: this.config.apiUrl,
        environment: this.config.environment,
        releaseVersion: this.config.release,
        debug: this.config.debug,
      });
    }

    return this.performanceClient.trackOperation(operation, fn, options);
  }

  /**
   * Create a fetch function with built-in performance tracking
   */
  createPerformanceFetch(): typeof fetch {
    return createPerformanceFetch({
      apiKey: this.config.apiKey,
      apiUrl: this.config.apiUrl,
      environment: this.config.environment,
      releaseVersion: this.config.release,
      debug: this.config.debug,
    });
  }

  /**
   * Flush any pending performance data
   */
  async flushPerformance(): Promise<void> {
    if (this.performanceClient) {
      await this.performanceClient.flush();
    }
    if (this.webVitalsTracker) {
      this.webVitalsTracker.reportNow();
    }
  }

  // ==================== LOGGING ====================

  /**
   * Enable logging with optional configuration
   */
  async enableLogging(options?: {
    sourceId?: string;
    sourceName?: string;
    batchSize?: number;
    flushIntervalMs?: number;
  }): Promise<void> {
    // If already initialized, skip
    if (this.logService) return;

    // If initialization is in progress, wait for it
    if (this.logServiceInitPromise) {
      await this.logServiceInitPromise;
      return;
    }

    this.logServiceInitPromise = (async () => {
      const { LogService } = await import('./logging');

      this.logService = new LogService({
        apiKey: this.config.apiKey,
        apiUrl: this.config.apiUrl,
        sourceId: options?.sourceId,
        sourceName: options?.sourceName,
        platform: getPlatformString(),
        environment: this.config.environment,
        release: this.config.release,
        batchSize: options?.batchSize,
        flushIntervalMs: options?.flushIntervalMs,
        debug: this.config.debug,
      });

      if (this.config.debug) {
        console.log(`[RiviumTrace] Logging enabled with sourceId: ${options?.sourceId}`);
      }
    })();

    await this.logServiceInitPromise;
  }

  /**
   * Log a message with the specified level
   */
  async log(
    message: string,
    level: import('./logging').LogLevel = 'info',
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.config.enabled) return;

    // Auto-enable logging if not already enabled, and wait for it
    if (!this.logService) {
      await this.enableLogging();
    }

    this.logService!.log(message, level, metadata, this.userId);
  }

  /**
   * Log a trace-level message
   */
  async trace(message: string, metadata?: Record<string, any>): Promise<void> {
    await this.log(message, 'trace', metadata);
  }

  /**
   * Log a debug-level message
   */
  async logDebug(message: string, metadata?: Record<string, any>): Promise<void> {
    await this.log(message, 'debug', metadata);
  }

  /**
   * Log an info-level message
   */
  async info(message: string, metadata?: Record<string, any>): Promise<void> {
    await this.log(message, 'info', metadata);
  }

  /**
   * Log a warning-level message
   */
  async warn(message: string, metadata?: Record<string, any>): Promise<void> {
    await this.log(message, 'warn', metadata);
  }

  /**
   * Log an error-level message (for non-exception errors)
   */
  async logError(message: string, metadata?: Record<string, any>): Promise<void> {
    await this.log(message, 'error', metadata);
  }

  /**
   * Log a fatal-level message
   */
  async fatal(message: string, metadata?: Record<string, any>): Promise<void> {
    await this.log(message, 'fatal', metadata);
  }

  /**
   * Flush all pending logs immediately
   */
  async flushLogs(): Promise<boolean> {
    if (!this.logService) return true;
    return this.logService.flush();
  }

  /**
   * Get the number of logs currently buffered
   */
  get pendingLogCount(): number {
    return this.logService?.bufferSize ?? 0;
  }

  /**
   * Close SDK and cleanup
   */
  close(): void {
    if (isBrowser() && this.config.enableCrashDetection) {
      CrashDetector.markAppClose();
    }

    // Flush logs before closing
    this.logService?.dispose();

    // Flush performance data before closing
    this.flushPerformance();

    if (this.config.debug) {
      console.log('[RiviumTrace] SDK closed');
    }
  }

  /**
   * Normalize configuration with defaults
   */
  private normalizeConfig(config: RiviumTraceConfig): NormalizedConfig {
    return {
      apiKey: config.apiKey,
      environment: config.environment || 'production',
      release: config.release || '',
      captureUncaughtErrors: config.captureUncaughtErrors ?? true,
      enabled: config.enabled ?? true,
      debug: config.debug ?? false,
      timeout: config.timeout || 10,
      maxBreadcrumbs: config.maxBreadcrumbs || 20,
      sampleRate: config.sampleRate ?? 1.0,
      tags: config.tags || {},
      enableServerSide: config.enableServerSide ?? true,
      enableClientSide: config.enableClientSide ?? true,
      enableCrashDetection: config.enableCrashDetection ?? true,
      beforeSend: config.beforeSend,
      ignoreErrors: config.ignoreErrors || [],
      ignoreUrls: config.ignoreUrls || [],
      apiUrl: config.apiUrl || RIVIUMTRACE_API_URL,
    };
  }
}

// Export convenience methods
export const init = RiviumTrace.init.bind(RiviumTrace);
export const getInstance = RiviumTrace.getInstance.bind(RiviumTrace);
