/**
 * Configuration options for RiviumTrace SDK
 */
export interface RiviumTraceConfig {
  /**
   * API Key from Rivium Console
   * Format: rv_live_xxx or rv_test_xxx
   */
  apiKey: string;

  /**
   * Environment name (e.g., 'production', 'staging', 'development')
   * @default 'production'
   */
  environment?: string;

  /**
   * Release version of your application
   * @default undefined
   */
  release?: string;

  /**
   * Whether to automatically capture uncaught errors
   * @default true
   */
  captureUncaughtErrors?: boolean;

  /**
   * Enable or disable the SDK
   * @default true
   */
  enabled?: boolean;

  /**
   * Enable debug logging to console
   * @default false
   */
  debug?: boolean;

  /**
   * HTTP timeout in seconds
   * @default 10
   */
  timeout?: number;

  /**
   * Maximum number of breadcrumbs to keep in memory
   * @default 20
   */
  maxBreadcrumbs?: number;

  /**
   * Sample rate for error reporting (0.0 to 1.0)
   * 1.0 = 100% of errors reported
   * @default 1.0
   */
  sampleRate?: number;

  /**
   * Custom tags to attach to all events
   */
  tags?: Record<string, string>;

  /**
   * Enable server-side error tracking (Next.js API routes, server components)
   * @default true
   */
  enableServerSide?: boolean;

  /**
   * Enable client-side error tracking (browser errors)
   * @default true
   */
  enableClientSide?: boolean;

  /**
   * Enable crash detection (tab crashes, page unresponsiveness)
   * @default true
   */
  enableCrashDetection?: boolean;

  /**
   * Callback function called before sending an error
   * Return false to prevent sending
   */
  beforeSend?: (error: RiviumTraceError) => RiviumTraceError | null | false;

  /**
   * List of error messages to ignore (regex patterns)
   */
  ignoreErrors?: (string | RegExp)[];

  /**
   * List of URLs to ignore errors from
   */
  ignoreUrls?: (string | RegExp)[];
}

/**
 * Error data structure sent to RiviumTrace API
 */
export interface RiviumTraceError {
  message: string;
  stack_trace?: string;
  platform: string;
  environment?: string;
  release_version?: string;
  timestamp: string;
  breadcrumbs?: Breadcrumb[];
  extra?: Record<string, any>;
  tags?: Record<string, string>;
  user_id?: string;
  session_id?: string;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  url?: string;
}

/**
 * Message/log data structure
 */
export interface RiviumTraceMessage {
  message: string;
  level: MessageLevel | 'info' | 'warning' | 'error' | 'debug';
  platform: string;
  environment?: string;
  release?: string;
  timestamp: string;
  user_id?: string;
  session_id?: string;
  extra?: Record<string, any>;
  tags?: Record<string, string>;
  breadcrumbs?: Breadcrumb[];
}

/**
 * Log/message severity levels
 */
export enum MessageLevel {
  Debug = 'debug',
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
}

/**
 * Breadcrumb - user action tracking
 */
export interface Breadcrumb {
  message: string;
  type: BreadcrumbType;
  timestamp: string;
  data?: Record<string, any>;
  level?: 'debug' | 'info' | 'warning' | 'error';
}

/**
 * Breadcrumb types
 */
export enum BreadcrumbType {
  Navigation = 'navigation',
  User = 'user',
  Http = 'http',
  State = 'state',
  Error = 'error',
  Info = 'info',
  Console = 'console',
  Query = 'query',
}

/**
 * Platform detection result
 */
export interface PlatformInfo {
  platform: string;
  userAgent?: string;
  isServer: boolean;
  isBrowser: boolean;
  browser?: string;
  os?: string;
  device?: string;
}

/**
 * Internal SDK options with defaults applied
 */
export interface NormalizedConfig extends Required<Omit<RiviumTraceConfig, 'beforeSend' | 'ignoreErrors' | 'ignoreUrls' | 'tags'>> {
  beforeSend?: RiviumTraceConfig['beforeSend'];
  ignoreErrors: (string | RegExp)[];
  ignoreUrls: (string | RegExp)[];
  tags: Record<string, string>;
}
