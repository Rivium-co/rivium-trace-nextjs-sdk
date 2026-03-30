'use client';

import { useEffect, ReactNode, Suspense } from 'react';
import { RiviumTrace } from '@rivium-trace/nextjs-sdk';
import { useRiviumTraceNavigation, ErrorBoundary } from '@rivium-trace/nextjs-sdk/react';

function NavigationTracker() {
  useRiviumTraceNavigation();
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Initialize RiviumTrace SDK
    RiviumTrace.init({
      apiKey: process.env.NEXT_PUBLIC_RIVIUM_TRACE_API_KEY || 'rv_live_demo',
      apiUrl: 'http://localhost:3001',
      environment: process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
      debug: true, // Enable debug logging for demo
      captureUncaughtErrors: true,
      enableCrashDetection: true,
      maxBreadcrumbs: 30,
      sampleRate: 1.0,
      tags: {
        app: 'example',
      },
    });

    // Set user ID (in real app, do this after authentication)
    RiviumTrace.getInstance()?.setUserId('demo-user-123');

    // Enable logging
    RiviumTrace.getInstance()?.enableLogging({
      sourceId: 'nextjs-demo-app',
      sourceName: 'Next.js Demo App',
    });

    // Enable performance tracking
    RiviumTrace.getInstance()?.enablePerformanceTracking();

    // Enable Web Vitals tracking
    RiviumTrace.getInstance()?.enableWebVitals();

    console.log('RiviumTrace SDK initialized');
  }, []);

  return (
    <ErrorBoundary
      fallback={(error, errorInfo, resetError) => (
        <div style={{ padding: '20px' }}>
          <h1>Application Error</h1>
          <p>Something went wrong. Our team has been notified.</p>
          <button onClick={resetError}>Try again</button>
        </div>
      )}
    >
      <Suspense fallback={null}>
        <NavigationTracker />
      </Suspense>
      {children}
    </ErrorBoundary>
  );
}
