import { isBrowser } from '../utils/platform';

/**
 * Browser crash detection service
 * Detects tab crashes, unresponsiveness, and abnormal terminations
 * Uses localStorage to track session state
 */
export class CrashDetector {
  private static readonly CRASH_MARKER_KEY = 'rivium_trace_crash_marker';
  private static readonly HEARTBEAT_KEY = 'rivium_trace_heartbeat';
  private static readonly HEARTBEAT_INTERVAL = 5000; // 5 seconds
  private static heartbeatTimer?: NodeJS.Timeout;
  private static isEnabled = false;

  /**
   * Mark app start - create crash marker
   */
  static markAppStart(): void {
    if (!isBrowser() || !this.isEnabled) return;

    try {
      const marker = {
        timestamp: new Date().toISOString(),
        startTime: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      localStorage.setItem(this.CRASH_MARKER_KEY, JSON.stringify(marker));
      this.startHeartbeat();
    } catch (error) {
      console.error('[RiviumTrace] Failed to mark app start:', error);
    }
  }

  /**
   * Mark app close - remove crash marker
   */
  static markAppClose(): void {
    if (!isBrowser()) return;

    try {
      localStorage.removeItem(this.CRASH_MARKER_KEY);
      localStorage.removeItem(this.HEARTBEAT_KEY);
      this.stopHeartbeat();
    } catch (error) {
      console.error('[RiviumTrace] Failed to mark app close:', error);
    }
  }

  /**
   * Check if app crashed in last session
   */
  static didCrashLastSession(): boolean {
    if (!isBrowser()) return false;

    try {
      const marker = localStorage.getItem(this.CRASH_MARKER_KEY);
      return marker !== null;
    } catch (error) {
      console.error('[RiviumTrace] Failed to check crash marker:', error);
      return false;
    }
  }

  /**
   * Get crash timestamp
   */
  static getLastCrashTime(): Date | null {
    if (!isBrowser()) return null;

    try {
      const marker = localStorage.getItem(this.CRASH_MARKER_KEY);
      if (!marker) return null;

      const data = JSON.parse(marker);
      return new Date(data.timestamp);
    } catch (error) {
      console.error('[RiviumTrace] Failed to get crash time:', error);
      return null;
    }
  }

  /**
   * Get last heartbeat timestamp
   */
  static getLastHeartbeat(): Date | null {
    if (!isBrowser()) return null;

    try {
      const heartbeat = localStorage.getItem(this.HEARTBEAT_KEY);
      if (!heartbeat) return null;

      return new Date(parseInt(heartbeat, 10));
    } catch (error) {
      return null;
    }
  }

  /**
   * Get crash report data
   */
  static getCrashReport(): any {
    if (!isBrowser()) return null;

    try {
      const marker = localStorage.getItem(this.CRASH_MARKER_KEY);
      if (!marker) return null;

      const data = JSON.parse(marker);
      const crashTime = new Date(data.timestamp);
      const timeSinceCrash = Date.now() - crashTime.getTime();

      // Check if tab was unresponsive (no heartbeat)
      const lastHeartbeat = this.getLastHeartbeat();
      const wasUnresponsive = lastHeartbeat &&
        (Date.now() - lastHeartbeat.getTime()) > this.HEARTBEAT_INTERVAL * 3;

      return {
        message: wasUnresponsive
          ? 'Browser tab became unresponsive and crashed'
          : 'Browser tab crashed or was force-closed',
        crashTime: data.timestamp,
        detectedTime: new Date().toISOString(),
        timeSinceCrashMs: timeSinceCrash,
        timeSinceCrashSeconds: Math.floor(timeSinceCrash / 1000),
        crashedUrl: data.url,
        userAgent: data.userAgent,
        wasUnresponsive,
        lastHeartbeat: lastHeartbeat?.toISOString(),
        crashType: wasUnresponsive ? 'unresponsive' : 'abnormal_termination',
        note: 'This crash was detected on next session start. Stack trace is not available for browser crashes.',
      };
    } catch (error) {
      console.error('[RiviumTrace] Failed to get crash report:', error);
      return null;
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private static startHeartbeat(): void {
    if (!isBrowser()) return;

    this.stopHeartbeat(); // Clear any existing heartbeat

    this.heartbeatTimer = setInterval(() => {
      try {
        localStorage.setItem(this.HEARTBEAT_KEY, Date.now().toString());
      } catch (error) {
        // Ignore localStorage errors
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Stop heartbeat monitoring
   */
  private static stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /**
   * Enable crash detection
   */
  static enable(): void {
    this.isEnabled = true;

    if (isBrowser()) {
      // Setup beforeunload listener to clean marker on normal close
      window.addEventListener('beforeunload', () => {
        this.markAppClose();
      });

      // Setup pagehide listener for mobile browsers
      window.addEventListener('pagehide', () => {
        this.markAppClose();
      });

      // Cleanup on page visibility change (tab close)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          // Don't remove marker here, wait for beforeunload/pagehide
          // This helps detect force-close scenarios
        }
      });
    }
  }

  /**
   * Disable crash detection
   */
  static disable(): void {
    this.isEnabled = false;
    this.stopHeartbeat();
  }

  /**
   * Clear crash marker (after reporting)
   */
  static clearCrashMarker(): void {
    if (!isBrowser()) return;

    try {
      localStorage.removeItem(this.CRASH_MARKER_KEY);
      localStorage.removeItem(this.HEARTBEAT_KEY);
    } catch (error) {
      console.error('[RiviumTrace] Failed to clear crash marker:', error);
    }
  }

  /**
   * Force a crash marker for testing
   */
  static forceCrashMarker(): void {
    if (!isBrowser()) return;

    const marker = {
      timestamp: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
      startTime: Date.now() - 60000,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    localStorage.setItem(this.CRASH_MARKER_KEY, JSON.stringify(marker));
  }
}
