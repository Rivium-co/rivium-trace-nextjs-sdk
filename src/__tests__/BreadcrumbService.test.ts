import { BreadcrumbService } from '../services/BreadcrumbService';
import { BreadcrumbType } from '../models/RiviumTraceConfig';

describe('BreadcrumbService', () => {
  beforeEach(() => {
    BreadcrumbService.clear();
    BreadcrumbService.setMaxBreadcrumbs(20);
  });

  // ─── Core add / getAll ───────────────────────────────────────

  describe('add()', () => {
    it('should add a breadcrumb with correct fields', () => {
      BreadcrumbService.add('test message', BreadcrumbType.Info);

      const crumbs = BreadcrumbService.getAll();
      expect(crumbs).toHaveLength(1);
      expect(crumbs[0].message).toBe('test message');
      expect(crumbs[0].type).toBe(BreadcrumbType.Info);
      expect(crumbs[0].level).toBe('info');
      expect(crumbs[0].timestamp).toBeDefined();
    });

    it('should add a breadcrumb with custom data', () => {
      BreadcrumbService.add('click', BreadcrumbType.User, { button: 'submit' });

      const crumbs = BreadcrumbService.getAll();
      expect(crumbs[0].data).toEqual({ button: 'submit' });
    });

    it('should add a breadcrumb with custom level', () => {
      BreadcrumbService.add('warn msg', BreadcrumbType.Info, undefined, 'warning');

      expect(BreadcrumbService.getAll()[0].level).toBe('warning');
    });

    it('should set the default level to info', () => {
      BreadcrumbService.add('msg', BreadcrumbType.Info);

      expect(BreadcrumbService.getAll()[0].level).toBe('info');
    });

    it('should generate an ISO timestamp', () => {
      BreadcrumbService.add('ts test', BreadcrumbType.Info);
      const ts = BreadcrumbService.getAll()[0].timestamp;
      expect(() => new Date(ts).toISOString()).not.toThrow();
    });
  });

  // ─── Convenience adders ─────────────────────────────────────

  describe('addNavigation()', () => {
    it('should create a navigation breadcrumb with from/to', () => {
      BreadcrumbService.addNavigation('/home', '/about');

      const crumbs = BreadcrumbService.getAll();
      expect(crumbs).toHaveLength(1);
      expect(crumbs[0].message).toContain('/home');
      expect(crumbs[0].message).toContain('/about');
      expect(crumbs[0].type).toBe('navigation');
      expect(crumbs[0].data?.from).toBe('/home');
      expect(crumbs[0].data?.to).toBe('/about');
    });

    it('should merge additional data into navigation breadcrumb', () => {
      BreadcrumbService.addNavigation('/a', '/b', { extra: 42 });

      expect(BreadcrumbService.getAll()[0].data?.extra).toBe(42);
    });
  });

  describe('addUser()', () => {
    it('should create a user action breadcrumb', () => {
      BreadcrumbService.addUser('clicked button');

      const bc = BreadcrumbService.getAll()[0];
      expect(bc.type).toBe('user');
      expect(bc.message).toBe('clicked button');
      expect(bc.level).toBe('info');
    });

    it('should include optional data', () => {
      BreadcrumbService.addUser('login', { provider: 'google' });

      expect(BreadcrumbService.getAll()[0].data?.provider).toBe('google');
    });
  });

  describe('addHttp()', () => {
    it('should create an HTTP breadcrumb without status code', () => {
      BreadcrumbService.addHttp('GET', '/api/data');

      const bc = BreadcrumbService.getAll()[0];
      expect(bc.type).toBe('http');
      expect(bc.message).toBe('GET /api/data');
      expect(bc.level).toBe('info');
    });

    it('should include status code in message when provided', () => {
      BreadcrumbService.addHttp('POST', '/api/items', 201);

      const bc = BreadcrumbService.getAll()[0];
      expect(bc.message).toContain('201');
      expect(bc.data?.statusCode).toBe(201);
    });

    it('should set level to error for status >= 400', () => {
      BreadcrumbService.addHttp('GET', '/api/fail', 500);

      expect(BreadcrumbService.getAll()[0].level).toBe('error');
    });

    it('should set level to info for status < 400', () => {
      BreadcrumbService.addHttp('GET', '/api/ok', 200);

      expect(BreadcrumbService.getAll()[0].level).toBe('info');
    });

    it('should set level to info when status is 399', () => {
      BreadcrumbService.addHttp('GET', '/api/redirect', 399);

      expect(BreadcrumbService.getAll()[0].level).toBe('info');
    });

    it('should set level to error when status is exactly 400', () => {
      BreadcrumbService.addHttp('GET', '/api/bad', 400);

      expect(BreadcrumbService.getAll()[0].level).toBe('error');
    });

    it('should merge additional data into HTTP breadcrumb', () => {
      BreadcrumbService.addHttp('GET', '/api', 200, { requestId: 'abc' });

      expect(BreadcrumbService.getAll()[0].data?.requestId).toBe('abc');
    });
  });

  describe('addState()', () => {
    it('should create a state breadcrumb', () => {
      BreadcrumbService.addState('cart updated');

      const bc = BreadcrumbService.getAll()[0];
      expect(bc.type).toBe('state');
      expect(bc.message).toBe('cart updated');
    });
  });

  describe('addError()', () => {
    it('should create an error breadcrumb with error level', () => {
      BreadcrumbService.addError('something broke');

      const bc = BreadcrumbService.getAll()[0];
      expect(bc.type).toBe('error');
      expect(bc.level).toBe('error');
    });
  });

  describe('addInfo()', () => {
    it('should create an info breadcrumb', () => {
      BreadcrumbService.addInfo('started process');

      const bc = BreadcrumbService.getAll()[0];
      expect(bc.type).toBe('info');
      expect(bc.level).toBe('info');
    });
  });

  describe('addConsole()', () => {
    it('should create a console breadcrumb for error level', () => {
      BreadcrumbService.addConsole('error', 'bad thing happened');

      const bc = BreadcrumbService.getAll()[0];
      expect(bc.type).toBe('console');
      expect(bc.message).toContain('Console.error');
      expect(bc.level).toBe('error');
    });

    it('should create a console breadcrumb for warn level', () => {
      BreadcrumbService.addConsole('warn', 'watch out');

      expect(BreadcrumbService.getAll()[0].level).toBe('warning');
    });

    it('should create a console breadcrumb for info level', () => {
      BreadcrumbService.addConsole('log', 'just info');

      expect(BreadcrumbService.getAll()[0].level).toBe('info');
    });
  });

  describe('addQuery()', () => {
    it('should create a query breadcrumb without duration', () => {
      BreadcrumbService.addQuery('SELECT * FROM users');

      const bc = BreadcrumbService.getAll()[0];
      expect(bc.type).toBe('query');
      expect(bc.message).toContain('SELECT * FROM users');
      expect(bc.data?.query).toBe('SELECT * FROM users');
    });

    it('should include duration in message when provided', () => {
      BreadcrumbService.addQuery('INSERT INTO logs', 45);

      const bc = BreadcrumbService.getAll()[0];
      expect(bc.message).toContain('45ms');
      expect(bc.data?.duration).toBe(45);
    });
  });

  // ─── Max breadcrumbs / trimming ─────────────────────────────

  describe('setMaxBreadcrumbs() and trimming', () => {
    it('should trim to max breadcrumbs when limit is reached', () => {
      BreadcrumbService.setMaxBreadcrumbs(3);

      for (let i = 0; i < 5; i++) {
        BreadcrumbService.add(`msg ${i}`, BreadcrumbType.Info);
      }

      const crumbs = BreadcrumbService.getAll();
      expect(crumbs).toHaveLength(3);
      // oldest should be trimmed, newest kept
      expect(crumbs[0].message).toBe('msg 2');
      expect(crumbs[2].message).toBe('msg 4');
    });

    it('should trim existing breadcrumbs when max is reduced', () => {
      for (let i = 0; i < 10; i++) {
        BreadcrumbService.add(`msg ${i}`, BreadcrumbType.Info);
      }

      BreadcrumbService.setMaxBreadcrumbs(5);
      expect(BreadcrumbService.count()).toBe(5);
    });

    it('should keep all breadcrumbs when max is increased', () => {
      BreadcrumbService.setMaxBreadcrumbs(3);
      BreadcrumbService.add('a', BreadcrumbType.Info);
      BreadcrumbService.add('b', BreadcrumbType.Info);
      BreadcrumbService.add('c', BreadcrumbType.Info);

      BreadcrumbService.setMaxBreadcrumbs(100);
      expect(BreadcrumbService.count()).toBe(3);
    });
  });

  // ─── clear() ───────────────────────────────────────────────

  describe('clear()', () => {
    it('should remove all breadcrumbs', () => {
      BreadcrumbService.add('a', BreadcrumbType.Info);
      BreadcrumbService.add('b', BreadcrumbType.Info);

      BreadcrumbService.clear();
      expect(BreadcrumbService.getAll()).toHaveLength(0);
      expect(BreadcrumbService.count()).toBe(0);
    });
  });

  // ─── toJSON() ──────────────────────────────────────────────

  describe('toJSON()', () => {
    it('should return the same data as getAll()', () => {
      BreadcrumbService.add('x', BreadcrumbType.User);

      expect(BreadcrumbService.toJSON()).toEqual(BreadcrumbService.getAll());
    });

    it('should return a copy, not the internal array', () => {
      BreadcrumbService.add('x', BreadcrumbType.Info);

      const json = BreadcrumbService.toJSON();
      json.push({ message: 'injected', type: BreadcrumbType.Info, timestamp: '' });

      expect(BreadcrumbService.count()).toBe(1);
    });
  });

  // ─── count() ───────────────────────────────────────────────

  describe('count()', () => {
    it('should return 0 when empty', () => {
      expect(BreadcrumbService.count()).toBe(0);
    });

    it('should return the correct count after adding breadcrumbs', () => {
      BreadcrumbService.add('a', BreadcrumbType.Info);
      BreadcrumbService.add('b', BreadcrumbType.Info);

      expect(BreadcrumbService.count()).toBe(2);
    });
  });

  // ─── getLast() ─────────────────────────────────────────────

  describe('getLast()', () => {
    it('should return the last N breadcrumbs', () => {
      BreadcrumbService.add('a', BreadcrumbType.Info);
      BreadcrumbService.add('b', BreadcrumbType.Info);
      BreadcrumbService.add('c', BreadcrumbType.Info);

      const last = BreadcrumbService.getLast(2);
      expect(last).toHaveLength(2);
      expect(last[0].message).toBe('b');
      expect(last[1].message).toBe('c');
    });

    it('should return all breadcrumbs when N > count', () => {
      BreadcrumbService.add('only', BreadcrumbType.Info);

      expect(BreadcrumbService.getLast(10)).toHaveLength(1);
    });
  });

  // ─── filterByType() ───────────────────────────────────────

  describe('filterByType()', () => {
    it('should return only breadcrumbs of the specified type', () => {
      BreadcrumbService.addUser('user action');
      BreadcrumbService.addHttp('GET', '/api');
      BreadcrumbService.addUser('another user action');

      const userCrumbs = BreadcrumbService.filterByType(BreadcrumbType.User);
      expect(userCrumbs).toHaveLength(2);
      expect(userCrumbs.every(b => b.type === 'user')).toBe(true);
    });

    it('should return empty array when no breadcrumbs match', () => {
      BreadcrumbService.addUser('action');

      expect(BreadcrumbService.filterByType(BreadcrumbType.Error)).toHaveLength(0);
    });
  });

  // ─── filterByLevel() ──────────────────────────────────────

  describe('filterByLevel()', () => {
    it('should return only breadcrumbs of the specified level', () => {
      BreadcrumbService.addError('fail 1');
      BreadcrumbService.addInfo('normal');
      BreadcrumbService.addError('fail 2');

      const errors = BreadcrumbService.filterByLevel('error');
      expect(errors).toHaveLength(2);
    });

    it('should return empty array when no breadcrumbs match the level', () => {
      BreadcrumbService.addInfo('info');

      expect(BreadcrumbService.filterByLevel('debug')).toHaveLength(0);
    });
  });

  // ─── getAll() returns a copy ──────────────────────────────

  describe('getAll()', () => {
    it('should return a shallow copy (mutations do not affect internal state)', () => {
      BreadcrumbService.add('original', BreadcrumbType.Info);

      const all = BreadcrumbService.getAll();
      all.length = 0;

      expect(BreadcrumbService.count()).toBe(1);
    });
  });
});
