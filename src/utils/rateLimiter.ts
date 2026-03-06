/**
 * Rate limiter for error deduplication
 * Prevents sending the same error multiple times in a short period
 */
export class RateLimiter {
  private static errorCache = new Map<string, number>();
  private static maxCacheSize = 100;
  private static rateLimitWindow = 60000; // 1 minute in milliseconds

  /**
   * Check if an error should be sent based on rate limiting
   * @param errorKey Unique identifier for the error (e.g., error message + stack hash)
   * @returns true if error should be sent, false if rate limited
   */
  static shouldSendError(errorKey: string): boolean {
    const now = Date.now();
    const lastSent = this.errorCache.get(errorKey);

    if (lastSent && now - lastSent < this.rateLimitWindow) {
      // Error was sent recently, rate limit it
      return false;
    }

    // Update last sent time
    this.errorCache.set(errorKey, now);

    // Cleanup old entries if cache is too large
    this.cleanupCache();

    return true;
  }

  /**
   * Generate error key from error message and stack trace
   */
  static generateErrorKey(message: string, stackTrace?: string): string {
    // Create a simple hash from message and first line of stack trace
    const stackLine = stackTrace?.split('\n')[0] || '';
    return `${message}:${stackLine}`.substring(0, 200);
  }

  /**
   * Clear the error cache
   */
  static clearCache(): void {
    this.errorCache.clear();
  }

  /**
   * Remove old entries from cache
   */
  private static cleanupCache(): void {
    if (this.errorCache.size <= this.maxCacheSize) {
      return;
    }

    const now = Date.now();
    const entriesToDelete: string[] = [];

    // Find expired entries
    this.errorCache.forEach((timestamp, key) => {
      if (now - timestamp > this.rateLimitWindow) {
        entriesToDelete.push(key);
      }
    });

    // Delete expired entries
    entriesToDelete.forEach((key) => this.errorCache.delete(key));

    // If still too large, delete oldest entries
    if (this.errorCache.size > this.maxCacheSize) {
      const entries = Array.from(this.errorCache.entries())
        .sort((a, b) => a[1] - b[1]);

      const toDelete = entries.slice(0, entries.length - this.maxCacheSize);
      toDelete.forEach(([key]) => this.errorCache.delete(key));
    }
  }

  /**
   * Set rate limit window (in milliseconds)
   */
  static setRateLimitWindow(milliseconds: number): void {
    this.rateLimitWindow = milliseconds;
  }

  /**
   * Set max cache size
   */
  static setMaxCacheSize(size: number): void {
    this.maxCacheSize = size;
  }

  /**
   * Get current cache size
   */
  static getCacheSize(): number {
    return this.errorCache.size;
  }
}
