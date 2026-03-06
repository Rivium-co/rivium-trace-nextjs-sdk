import type { NextRouter } from 'next/router';
import { BreadcrumbService } from '../services/BreadcrumbService';

/**
 * Navigation context for error reporting
 */
export interface NavigationContext {
  currentRoute: string;
  previousRoute?: string;
  timeOnCurrentRoute: number;
  routeHistory: string[];
}

/**
 * Router integration for automatic navigation tracking
 */
export class RouterIntegration {
  private static currentRoute = '/';
  private static previousRoute?: string;
  private static routeStartTime = Date.now();
  private static routeHistory: string[] = [];
  private static maxHistorySize = 10;
  private static isInitialized = false;

  /**
   * Initialize router tracking for Next.js App Router (Next.js 13+)
   * Use this with usePathname() and useSearchParams() hooks
   */
  static trackAppRouterNavigation(pathname: string, searchParams?: string): void {
    const fullPath = searchParams ? `${pathname}?${searchParams}` : pathname;
    this.handleRouteChange(fullPath);
  }

  /**
   * Initialize router tracking for Next.js Pages Router (Next.js 12 and earlier)
   * Call this in _app.tsx with the router instance
   */
  static initializePagesRouter(router: NextRouter): void {
    if (this.isInitialized) {
      console.warn('[RiviumTrace] Router already initialized');
      return;
    }

    // Initial route
    this.handleRouteChange(router.asPath);

    // Listen to route changes
    router.events.on('routeChangeComplete', (url: string) => {
      this.handleRouteChange(url);
    });

    this.isInitialized = true;
  }

  /**
   * Handle route change
   */
  private static handleRouteChange(newRoute: string): void {
    // Calculate time on previous route
    const timeOnRoute = Date.now() - this.routeStartTime;

    // Update previous route
    this.previousRoute = this.currentRoute;

    // Update current route
    this.currentRoute = newRoute;
    this.routeStartTime = Date.now();

    // Add to history
    this.routeHistory.push(newRoute);
    if (this.routeHistory.length > this.maxHistorySize) {
      this.routeHistory.shift();
    }

    // Add navigation breadcrumb
    if (this.previousRoute) {
      BreadcrumbService.addNavigation(this.previousRoute, newRoute, {
        timeOnPreviousRoute: timeOnRoute,
      });
    }
  }

  /**
   * Manually set current route (for custom routing solutions)
   */
  static setCurrentRoute(route: string): void {
    this.handleRouteChange(route);
  }

  /**
   * Get current route
   */
  static getCurrentRoute(): string {
    return this.currentRoute;
  }

  /**
   * Get previous route
   */
  static getPreviousRoute(): string | undefined {
    return this.previousRoute;
  }

  /**
   * Get time spent on current route (in milliseconds)
   */
  static getTimeOnCurrentRoute(): number {
    return Date.now() - this.routeStartTime;
  }

  /**
   * Get route history
   */
  static getRouteHistory(): string[] {
    return [...this.routeHistory];
  }

  /**
   * Get navigation context for error reporting
   */
  static getNavigationContext(): NavigationContext {
    return {
      currentRoute: this.currentRoute,
      previousRoute: this.previousRoute,
      timeOnCurrentRoute: this.getTimeOnCurrentRoute(),
      routeHistory: this.getRouteHistory(),
    };
  }

  /**
   * Reset navigation state (for testing)
   */
  static reset(): void {
    this.currentRoute = '/';
    this.previousRoute = undefined;
    this.routeStartTime = Date.now();
    this.routeHistory = [];
    this.isInitialized = false;
  }
}
