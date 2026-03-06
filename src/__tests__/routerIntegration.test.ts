import { RouterIntegration } from '../utils/routerIntegration';
import { BreadcrumbService } from '../services/BreadcrumbService';

describe('RouterIntegration', () => {
  beforeEach(() => {
    RouterIntegration.reset();
    BreadcrumbService.clear();
  });

  // ─── getCurrentRoute() ─────────────────────────────────────

  describe('getCurrentRoute()', () => {
    it('should default to "/" before any navigation', () => {
      expect(RouterIntegration.getCurrentRoute()).toBe('/');
    });

    it('should return the route after navigation', () => {
      RouterIntegration.trackAppRouterNavigation('/dashboard');
      expect(RouterIntegration.getCurrentRoute()).toBe('/dashboard');
    });
  });

  // ─── getPreviousRoute() ───────────────────────────────────

  describe('getPreviousRoute()', () => {
    it('should be undefined before any navigation', () => {
      expect(RouterIntegration.getPreviousRoute()).toBeUndefined();
    });

    it('should return the previous route after navigation', () => {
      RouterIntegration.trackAppRouterNavigation('/about');
      expect(RouterIntegration.getPreviousRoute()).toBe('/');
    });

    it('should track multiple previous routes correctly', () => {
      RouterIntegration.trackAppRouterNavigation('/page-1');
      RouterIntegration.trackAppRouterNavigation('/page-2');
      expect(RouterIntegration.getPreviousRoute()).toBe('/page-1');
    });
  });

  // ─── trackAppRouterNavigation() ───────────────────────────

  describe('trackAppRouterNavigation()', () => {
    it('should update the current route', () => {
      RouterIntegration.trackAppRouterNavigation('/settings');
      expect(RouterIntegration.getCurrentRoute()).toBe('/settings');
    });

    it('should handle pathname with search params', () => {
      RouterIntegration.trackAppRouterNavigation('/search', 'q=test&page=1');
      expect(RouterIntegration.getCurrentRoute()).toBe('/search?q=test&page=1');
    });

    it('should handle pathname without search params', () => {
      RouterIntegration.trackAppRouterNavigation('/products');
      expect(RouterIntegration.getCurrentRoute()).toBe('/products');
    });

    it('should handle undefined search params', () => {
      RouterIntegration.trackAppRouterNavigation('/home', undefined);
      expect(RouterIntegration.getCurrentRoute()).toBe('/home');
    });

    it('should add a navigation breadcrumb', () => {
      RouterIntegration.trackAppRouterNavigation('/new-page');

      const crumbs = BreadcrumbService.getAll();
      expect(crumbs).toHaveLength(1);
      expect(crumbs[0].message).toContain('/');
      expect(crumbs[0].message).toContain('/new-page');
    });
  });

  // ─── setCurrentRoute() ───────────────────────────────────

  describe('setCurrentRoute()', () => {
    it('should manually set the current route', () => {
      RouterIntegration.setCurrentRoute('/custom');
      expect(RouterIntegration.getCurrentRoute()).toBe('/custom');
    });

    it('should set the previous route when changing', () => {
      RouterIntegration.setCurrentRoute('/first');
      RouterIntegration.setCurrentRoute('/second');

      expect(RouterIntegration.getCurrentRoute()).toBe('/second');
      expect(RouterIntegration.getPreviousRoute()).toBe('/first');
    });
  });

  // ─── getTimeOnCurrentRoute() ──────────────────────────────

  describe('getTimeOnCurrentRoute()', () => {
    it('should return a non-negative number', () => {
      expect(RouterIntegration.getTimeOnCurrentRoute()).toBeGreaterThanOrEqual(0);
    });

    it('should increase over time', (done) => {
      RouterIntegration.trackAppRouterNavigation('/test');
      const t1 = RouterIntegration.getTimeOnCurrentRoute();

      setTimeout(() => {
        const t2 = RouterIntegration.getTimeOnCurrentRoute();
        expect(t2).toBeGreaterThan(t1);
        done();
      }, 50);
    });

    it('should reset when navigating to a new route', (done) => {
      RouterIntegration.trackAppRouterNavigation('/page-a');

      setTimeout(() => {
        const timeBefore = RouterIntegration.getTimeOnCurrentRoute();
        RouterIntegration.trackAppRouterNavigation('/page-b');
        const timeAfter = RouterIntegration.getTimeOnCurrentRoute();

        expect(timeAfter).toBeLessThan(timeBefore);
        done();
      }, 50);
    });
  });

  // ─── getRouteHistory() ────────────────────────────────────

  describe('getRouteHistory()', () => {
    it('should start empty', () => {
      expect(RouterIntegration.getRouteHistory()).toEqual([]);
    });

    it('should track navigated routes', () => {
      RouterIntegration.trackAppRouterNavigation('/a');
      RouterIntegration.trackAppRouterNavigation('/b');
      RouterIntegration.trackAppRouterNavigation('/c');

      expect(RouterIntegration.getRouteHistory()).toEqual(['/a', '/b', '/c']);
    });

    it('should limit history to 10 entries', () => {
      for (let i = 0; i < 15; i++) {
        RouterIntegration.trackAppRouterNavigation(`/page-${i}`);
      }

      const history = RouterIntegration.getRouteHistory();
      expect(history).toHaveLength(10);
      expect(history[0]).toBe('/page-5');
      expect(history[9]).toBe('/page-14');
    });

    it('should return a copy of the internal array', () => {
      RouterIntegration.trackAppRouterNavigation('/x');
      const history = RouterIntegration.getRouteHistory();
      history.push('/injected');

      expect(RouterIntegration.getRouteHistory()).toHaveLength(1);
    });
  });

  // ─── getNavigationContext() ───────────────────────────────

  describe('getNavigationContext()', () => {
    it('should return the correct structure', () => {
      const ctx = RouterIntegration.getNavigationContext();

      expect(ctx).toHaveProperty('currentRoute');
      expect(ctx).toHaveProperty('previousRoute');
      expect(ctx).toHaveProperty('timeOnCurrentRoute');
      expect(ctx).toHaveProperty('routeHistory');
    });

    it('should reflect current state after navigation', () => {
      RouterIntegration.trackAppRouterNavigation('/home');
      RouterIntegration.trackAppRouterNavigation('/profile');

      const ctx = RouterIntegration.getNavigationContext();
      expect(ctx.currentRoute).toBe('/profile');
      expect(ctx.previousRoute).toBe('/home');
      expect(ctx.timeOnCurrentRoute).toBeGreaterThanOrEqual(0);
      expect(ctx.routeHistory).toEqual(['/home', '/profile']);
    });

    it('should have default values before any navigation', () => {
      const ctx = RouterIntegration.getNavigationContext();
      expect(ctx.currentRoute).toBe('/');
      expect(ctx.previousRoute).toBeUndefined();
      expect(ctx.routeHistory).toEqual([]);
    });
  });

  // ─── reset() ──────────────────────────────────────────────

  describe('reset()', () => {
    it('should reset all state to defaults', () => {
      RouterIntegration.trackAppRouterNavigation('/foo');
      RouterIntegration.trackAppRouterNavigation('/bar');

      RouterIntegration.reset();

      expect(RouterIntegration.getCurrentRoute()).toBe('/');
      expect(RouterIntegration.getPreviousRoute()).toBeUndefined();
      expect(RouterIntegration.getRouteHistory()).toEqual([]);
    });
  });

  // ─── initializePagesRouter() ──────────────────────────────

  describe('initializePagesRouter()', () => {
    it('should set current route from router.asPath', () => {
      const mockRouter = createMockRouter('/initial');
      RouterIntegration.initializePagesRouter(mockRouter);

      expect(RouterIntegration.getCurrentRoute()).toBe('/initial');
    });

    it('should listen to routeChangeComplete events', () => {
      const mockRouter = createMockRouter('/start');
      RouterIntegration.initializePagesRouter(mockRouter);

      expect(mockRouter.events.on).toHaveBeenCalledWith(
        'routeChangeComplete',
        expect.any(Function)
      );
    });

    it('should update route when routeChangeComplete fires', () => {
      const mockRouter = createMockRouter('/start');
      RouterIntegration.initializePagesRouter(mockRouter);

      // Simulate route change
      const callback = (mockRouter.events.on as jest.Mock).mock.calls[0][1];
      callback('/new-page');

      expect(RouterIntegration.getCurrentRoute()).toBe('/new-page');
    });

    it('should warn and return if already initialized', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const mockRouter1 = createMockRouter('/a');
      RouterIntegration.initializePagesRouter(mockRouter1);

      const mockRouter2 = createMockRouter('/b');
      RouterIntegration.initializePagesRouter(mockRouter2);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('already initialized')
      );
    });
  });

  // ─── Breadcrumb integration ───────────────────────────────

  describe('breadcrumb integration', () => {
    it('should add breadcrumbs on navigation with timeOnPreviousRoute', () => {
      RouterIntegration.trackAppRouterNavigation('/page-1');

      const crumbs = BreadcrumbService.getAll();
      expect(crumbs).toHaveLength(1);
      expect(crumbs[0].data?.timeOnPreviousRoute).toBeDefined();
      expect(typeof crumbs[0].data?.timeOnPreviousRoute).toBe('number');
    });

    it('should include from and to in navigation breadcrumb data', () => {
      RouterIntegration.trackAppRouterNavigation('/target');

      const crumbs = BreadcrumbService.getAll();
      expect(crumbs[0].data?.from).toBe('/');
      expect(crumbs[0].data?.to).toBe('/target');
    });
  });
});

// ─── Helpers ────────────────────────────────────────────────

function createMockRouter(asPath: string): any {
  return {
    asPath,
    events: {
      on: jest.fn(),
      off: jest.fn(),
    },
  };
}
