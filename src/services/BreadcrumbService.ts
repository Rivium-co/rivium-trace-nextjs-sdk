import type { Breadcrumb, BreadcrumbType } from '../models';

/**
 * In-memory breadcrumb tracking service
 * Stores user actions and events for error context
 */
export class BreadcrumbService {
  private static breadcrumbs: Breadcrumb[] = [];
  private static maxBreadcrumbs = 20;

  /**
   * Set maximum number of breadcrumbs to keep
   */
  static setMaxBreadcrumbs(max: number): void {
    this.maxBreadcrumbs = max;
    this.trimBreadcrumbs();
  }

  /**
   * Add a breadcrumb
   */
  static add(
    message: string,
    type: BreadcrumbType,
    data?: Record<string, any>,
    level: 'debug' | 'info' | 'warning' | 'error' = 'info'
  ): void {
    const breadcrumb: Breadcrumb = {
      message,
      type,
      timestamp: new Date().toISOString(),
      data,
      level,
    };

    this.breadcrumbs.push(breadcrumb);
    this.trimBreadcrumbs();
  }

  /**
   * Add navigation breadcrumb
   */
  static addNavigation(from: string, to: string, data?: Record<string, any>): void {
    this.add(
      `Navigation: ${from} → ${to}`,
      'navigation' as BreadcrumbType,
      { from, to, ...data },
      'info'
    );
  }

  /**
   * Add user action breadcrumb
   */
  static addUser(action: string, data?: Record<string, any>): void {
    this.add(action, 'user' as BreadcrumbType, data, 'info');
  }

  /**
   * Add HTTP request breadcrumb
   */
  static addHttp(
    method: string,
    url: string,
    statusCode?: number,
    data?: Record<string, any>
  ): void {
    this.add(
      `${method} ${url}${statusCode ? ` → ${statusCode}` : ''}`,
      'http' as BreadcrumbType,
      { method, url, statusCode, ...data },
      statusCode && statusCode >= 400 ? 'error' : 'info'
    );
  }

  /**
   * Add state change breadcrumb
   */
  static addState(message: string, data?: Record<string, any>): void {
    this.add(message, 'state' as BreadcrumbType, data, 'info');
  }

  /**
   * Add error breadcrumb
   */
  static addError(message: string, data?: Record<string, any>): void {
    this.add(message, 'error' as BreadcrumbType, data, 'error');
  }

  /**
   * Add info breadcrumb
   */
  static addInfo(message: string, data?: Record<string, any>): void {
    this.add(message, 'info' as BreadcrumbType, data, 'info');
  }

  /**
   * Add console breadcrumb
   */
  static addConsole(level: string, message: string, data?: Record<string, any>): void {
    this.add(
      `Console.${level}: ${message}`,
      'console' as BreadcrumbType,
      { level, ...data },
      level === 'error' ? 'error' : level === 'warn' ? 'warning' : 'info'
    );
  }

  /**
   * Add database query breadcrumb
   */
  static addQuery(query: string, duration?: number, data?: Record<string, any>): void {
    this.add(
      `Query${duration ? ` (${duration}ms)` : ''}: ${query}`,
      'query' as BreadcrumbType,
      { query, duration, ...data },
      'info'
    );
  }

  /**
   * Get all breadcrumbs
   */
  static getAll(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  /**
   * Get breadcrumbs as JSON array
   */
  static toJSON(): Breadcrumb[] {
    return this.getAll();
  }

  /**
   * Clear all breadcrumbs
   */
  static clear(): void {
    this.breadcrumbs = [];
  }

  /**
   * Trim breadcrumbs to max limit
   */
  private static trimBreadcrumbs(): void {
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  /**
   * Get breadcrumb count
   */
  static count(): number {
    return this.breadcrumbs.length;
  }

  /**
   * Get last N breadcrumbs
   */
  static getLast(n: number): Breadcrumb[] {
    return this.breadcrumbs.slice(-n);
  }

  /**
   * Filter breadcrumbs by type
   */
  static filterByType(type: BreadcrumbType): Breadcrumb[] {
    return this.breadcrumbs.filter((b) => b.type === type);
  }

  /**
   * Filter breadcrumbs by level
   */
  static filterByLevel(level: 'debug' | 'info' | 'warning' | 'error'): Breadcrumb[] {
    return this.breadcrumbs.filter((b) => b.level === level);
  }
}
