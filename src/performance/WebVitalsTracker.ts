import { onCLS, onFCP, onFID, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';
import type { WebVitalsData } from './PerformanceSpan';
import { isBrowser, getUserAgent } from '../utils/platform';
import { RIVIUMTRACE_API_URL } from '../constants';

interface WebVitalsConfig {
  apiKey: string;
  environment?: string;
  releaseVersion?: string;
  debug?: boolean;
  reportAllChanges?: boolean;
  batchInterval?: number;
}

/**
 * Web Vitals Tracker using Google's official web-vitals library
 * Automatically captures LCP, FID, CLS, INP, TTFB, FCP metrics
 */
export class WebVitalsTracker {
  private static instance: WebVitalsTracker | null = null;
  private config: WebVitalsConfig;
  private sessionId: string;
  private pendingVitals: Partial<WebVitalsData> = {};
  private reportTimer: ReturnType<typeof setTimeout> | null = null;
  private isInitialized = false;

  private constructor(config: WebVitalsConfig) {
    this.config = config;
    this.sessionId = this.generateSessionId();
  }

  /**
   * Initialize Web Vitals tracking
   */
  static init(config: WebVitalsConfig): WebVitalsTracker {
    if (!isBrowser()) {
      if (config.debug) {
        console.log('[RiviumTrace] WebVitalsTracker skipped - not in browser');
      }
      return new WebVitalsTracker(config);
    }

    if (WebVitalsTracker.instance) {
      return WebVitalsTracker.instance;
    }

    WebVitalsTracker.instance = new WebVitalsTracker(config);
    WebVitalsTracker.instance.startTracking();

    return WebVitalsTracker.instance;
  }

  /**
   * Get the tracker instance
   */
  static getInstance(): WebVitalsTracker | null {
    return WebVitalsTracker.instance;
  }

  /**
   * Start tracking all Core Web Vitals
   */
  private startTracking(): void {
    if (this.isInitialized || !isBrowser()) return;

    const reportAllChanges = this.config.reportAllChanges ?? false;

    // Largest Contentful Paint (LCP)
    onLCP((metric) => this.handleMetric(metric), { reportAllChanges });

    // First Input Delay (FID)
    onFID((metric) => this.handleMetric(metric), { reportAllChanges });

    // Cumulative Layout Shift (CLS)
    onCLS((metric) => this.handleMetric(metric), { reportAllChanges });

    // Interaction to Next Paint (INP)
    onINP((metric) => this.handleMetric(metric), { reportAllChanges });

    // Time to First Byte (TTFB)
    onTTFB((metric) => this.handleMetric(metric), { reportAllChanges });

    // First Contentful Paint (FCP)
    onFCP((metric) => this.handleMetric(metric), { reportAllChanges });

    this.isInitialized = true;

    if (this.config.debug) {
      console.log('[RiviumTrace] WebVitalsTracker initialized');
    }
  }

  /**
   * Handle individual metric from web-vitals library
   */
  private handleMetric(metric: Metric): void {
    if (this.config.debug) {
      console.log(`[RiviumTrace] Web Vital: ${metric.name} = ${metric.value}`);
    }

    // Map web-vitals metric names to our data structure
    switch (metric.name) {
      case 'LCP':
        this.pendingVitals.lcpMs = metric.value;
        break;
      case 'FID':
        this.pendingVitals.fidMs = metric.value;
        break;
      case 'CLS':
        this.pendingVitals.cls = metric.value;
        break;
      case 'INP':
        this.pendingVitals.inpMs = metric.value;
        break;
      case 'TTFB':
        this.pendingVitals.ttfbMs = metric.value;
        break;
      case 'FCP':
        this.pendingVitals.fcpMs = metric.value;
        break;
    }

    // Schedule batch report
    this.scheduleBatchReport();
  }

  /**
   * Schedule a batch report of collected vitals
   */
  private scheduleBatchReport(): void {
    if (this.reportTimer) {
      clearTimeout(this.reportTimer);
    }

    const interval = this.config.batchInterval ?? 5000;

    this.reportTimer = setTimeout(() => {
      this.sendVitals();
    }, interval);
  }

  /**
   * Send collected web vitals to the API
   */
  private async sendVitals(): Promise<void> {
    if (!isBrowser()) return;

    // Check if we have any vitals to send
    const hasVitals = Object.keys(this.pendingVitals).some(
      (key) => this.pendingVitals[key as keyof WebVitalsData] !== undefined
    );

    if (!hasVitals) return;

    const vitalsData: WebVitalsData = {
      pageUrl: window.location.href,
      pageRoute: window.location.pathname,
      ...this.pendingVitals,
      deviceType: this.getDeviceType(),
      connectionType: this.getConnectionType(),
      sessionId: this.sessionId,
      platform: 'nextjs',
      environment: this.config.environment,
      releaseVersion: this.config.releaseVersion,
    };

    try {
      const url = `${RIVIUMTRACE_API_URL}/api/performance/web-vitals`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
          'User-Agent': getUserAgent(),
        },
        body: JSON.stringify(vitalsData),
        keepalive: true,
      });

      if (this.config.debug) {
        if (response.ok) {
          console.log('[RiviumTrace] Web vitals sent successfully');
        } else {
          console.error('[RiviumTrace] Failed to send web vitals:', response.status);
        }
      }

      // Clear pending vitals after successful send
      this.pendingVitals = {};
    } catch (error) {
      if (this.config.debug) {
        console.error('[RiviumTrace] Error sending web vitals:', error);
      }
    }
  }

  /**
   * Get device type based on screen size
   */
  private getDeviceType(): string {
    if (!isBrowser()) return 'unknown';

    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  /**
   * Get connection type from Navigator API
   */
  private getConnectionType(): string | undefined {
    if (!isBrowser()) return undefined;

    const nav = navigator as Navigator & {
      connection?: { effectiveType?: string };
    };

    return nav.connection?.effectiveType;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Manually report current vitals (useful for SPA navigation)
   */
  reportNow(): void {
    if (this.reportTimer) {
      clearTimeout(this.reportTimer);
      this.reportTimer = null;
    }
    this.sendVitals();
  }

  /**
   * Reset pending vitals (useful for SPA navigation)
   */
  reset(): void {
    this.pendingVitals = {};
    if (this.reportTimer) {
      clearTimeout(this.reportTimer);
      this.reportTimer = null;
    }
  }
}
