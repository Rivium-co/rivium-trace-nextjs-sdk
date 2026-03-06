// Main SDK
export { RiviumTrace, init, getInstance } from './RiviumTrace';

// Models
export * from './models';

// Services
export { BreadcrumbService, CrashDetector } from './services';

// Utilities
export { RouterIntegration, getPlatformInfo, isBrowser, isServer } from './utils';

// Performance / APM
export {
  WebVitalsTracker,
  PerformanceClient,
  createPerformanceFetch,
  createHttpSpan,
  generateTraceId,
  generateSpanId,
  PerformanceSpanFactory,
} from './performance';
export type { PerformanceSpan, WebVitalsData } from './performance';

// Logging
export { LogService } from './logging';
export type { LogEntry, LogLevel, LogServiceConfig } from './logging';

// Constants
export const SDK_VERSION = '1.0.3';
export const SDK_NAME = '@rivium-trace/nextjs-sdk';
