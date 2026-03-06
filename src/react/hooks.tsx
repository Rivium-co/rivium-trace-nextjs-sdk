import { useEffect, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter as useNextRouter } from 'next/router';
import { RiviumTrace } from '../RiviumTrace';
import { RouterIntegration } from '../utils/routerIntegration';
import { BreadcrumbService } from '../services/BreadcrumbService';

/**
 * Hook to track App Router navigation (Next.js 13+)
 * Use this in your root layout or components
 */
export function useRiviumTraceNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const search = searchParams?.toString();
    RouterIntegration.trackAppRouterNavigation(pathname, search);
  }, [pathname, searchParams]);
}

/**
 * Hook to initialize RiviumTrace with Pages Router (Next.js 12 and earlier)
 * Use this in _app.tsx
 */
export function useRiviumTracePagesRouter() {
  const router = useNextRouter();

  useEffect(() => {
    RouterIntegration.initializePagesRouter(router);
  }, [router]);
}

/**
 * Hook to add breadcrumbs easily in components
 */
export function useBreadcrumbs() {
  const addBreadcrumb = useCallback((message: string, data?: Record<string, any>) => {
    BreadcrumbService.addUser(message, data);
  }, []);

  const addNavigation = useCallback((from: string, to: string, data?: Record<string, any>) => {
    BreadcrumbService.addNavigation(from, to, data);
  }, []);

  const addHttp = useCallback(
    (method: string, url: string, statusCode?: number, data?: Record<string, any>) => {
      BreadcrumbService.addHttp(method, url, statusCode, data);
    },
    []
  );

  const addState = useCallback((message: string, data?: Record<string, any>) => {
    BreadcrumbService.addState(message, data);
  }, []);

  return {
    addBreadcrumb,
    addNavigation,
    addHttp,
    addState,
  };
}

/**
 * Hook to capture errors and manage context
 */
export function useRiviumTrace() {
  const captureException = useCallback(
    (
      error: Error | string,
      message?: string,
      extra?: Record<string, any>,
      level?: 'fatal' | 'error' | 'warning',
      callback?: (success: boolean) => void
    ) => {
      const sdk = RiviumTrace.getInstance();
      if (sdk) {
        sdk.captureException(error, message, extra, level, callback);
      }
    },
    []
  );

  const captureMessage = useCallback(
    (
      message: string,
      level?: 'debug' | 'info' | 'warning' | 'error',
      extra?: Record<string, any>,
      callback?: (success: boolean) => void
    ) => {
      const sdk = RiviumTrace.getInstance();
      if (sdk) {
        sdk.captureMessage(message, level as any, extra, callback);
      }
    },
    []
  );

  const setUserId = useCallback((userId: string) => {
    const sdk = RiviumTrace.getInstance();
    if (sdk) {
      sdk.setUserId(userId);
    }
  }, []);

  const setExtra = useCallback((key: string, value: any) => {
    const sdk = RiviumTrace.getInstance();
    if (sdk) {
      sdk.setExtra(key, value);
    }
  }, []);

  const setExtras = useCallback((extras: Record<string, any>) => {
    const sdk = RiviumTrace.getInstance();
    if (sdk) {
      sdk.setExtras(extras);
    }
  }, []);

  const setTag = useCallback((key: string, value: string) => {
    const sdk = RiviumTrace.getInstance();
    if (sdk) {
      sdk.setTag(key, value);
    }
  }, []);

  const setTags = useCallback((tags: Record<string, string>) => {
    const sdk = RiviumTrace.getInstance();
    if (sdk) {
      sdk.setTags(tags);
    }
  }, []);

  return {
    captureException,
    captureMessage,
    setUserId,
    setExtra,
    setExtras,
    setTag,
    setTags,
  };
}
