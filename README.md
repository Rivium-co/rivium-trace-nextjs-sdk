# RiviumTrace SDK for Next.js

[![npm version](https://img.shields.io/npm/v/@rivium-trace/nextjs-sdk.svg)](https://www.npmjs.com/package/@rivium-trace/nextjs-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Comprehensive error tracking, crash detection, breadcrumbs, logging, and performance monitoring SDK for Next.js applications.

## Features

- 🚨 **Error Tracking** - Automatic capture of uncaught errors, promise rejections, and React errors
- 💥 **Crash Detection** - Browser tab crash and unresponsiveness detection
- 🍞 **Breadcrumbs** - Track user actions and events for error context
- 🗺️ **Source Maps** - Automatic source map support for readable stack traces
- 🎯 **Next.js Optimized** - Built specifically for Next.js App Router and Pages Router
- ⚛️ **React Integration** - Error boundaries, hooks, and components
- 🌐 **Universal** - Works in browser and Node.js (API routes, server components)
- 📊 **Rich Context** - Navigation tracking, user sessions, custom metadata
- 🎛️ **Configurable** - Flexible configuration with sampling, filtering, and hooks

## Installation

```bash
npm install @rivium-trace/nextjs-sdk
# or
yarn add @rivium-trace/nextjs-sdk
# or
pnpm add @rivium-trace/nextjs-sdk
```

## Quick Start

### 1. Initialize the SDK

#### App Router (Next.js 13+)

Create `app/providers.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { RiviumTrace } from '@rivium-trace/nextjs-sdk';
import { useRiviumTraceNavigation } from '@rivium-trace/nextjs-sdk/react';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    RiviumTrace.init({
      apiKey: 'rv_live_your_api_key',
      environment: process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_APP_VERSION,
      debug: process.env.NODE_ENV === 'development',
    });
  }, []);

  // Track navigation
  useRiviumTraceNavigation();

  return <>{children}</>;
}
```

Update `app/layout.tsx`:

```tsx
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

#### Pages Router (Next.js 12 and earlier)

Update `pages/_app.tsx`:

```tsx
import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { RiviumTrace } from '@rivium-trace/nextjs-sdk';
import { useRiviumTracePagesRouter } from '@rivium-trace/nextjs-sdk/react';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    RiviumTrace.init({
      apiKey: 'rv_live_your_api_key',
      environment: process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_APP_VERSION,
    });
  }, []);

  // Track navigation
  useRiviumTracePagesRouter();

  return <Component {...pageProps} />;
}

export default MyApp;
```

### 2. Add Error Boundary

Wrap your components with the error boundary:

```tsx
import { ErrorBoundary } from '@rivium-trace/nextjs-sdk/react';

export default function Page() {
  return (
    <ErrorBoundary fallback={<div>Something went wrong!</div>}>
      <YourComponent />
    </ErrorBoundary>
  );
}
```

### 3. Manual Error Capture

```tsx
import { useRiviumTrace } from '@rivium-trace/nextjs-sdk/react';

function MyComponent() {
  const { captureException, captureMessage } = useRiviumTrace();

  const handleClick = async () => {
    try {
      await riskyOperation();
    } catch (error) {
      captureException(error, 'Failed to complete operation', {
        userId: user.id,
        action: 'button_click',
      });
    }
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

## Configuration

### Full Configuration Options

```typescript
RiviumTrace.init({
  // Required - Get from Rivium Console (format: rv_live_xxx or rv_test_xxx)
  apiKey: 'rv_live_your_api_key',

  // Optional
  environment: 'production',
  release: '1.0.0',

  // Error capture settings
  captureUncaughtErrors: true,
  enabled: true,
  debug: false,

  // Network settings
  timeout: 10,

  // Client/Server settings
  enableServerSide: true,
  enableClientSide: true,
  enableCrashDetection: true,

  // Breadcrumbs
  maxBreadcrumbs: 20,

  // Sampling
  sampleRate: 1.0, // 0.0 to 1.0 (100%)

  // Tags
  tags: {
    team: 'frontend',
    region: 'us-east',
  },

  // Filtering
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    /^Non-Error promise rejection/,
  ],
  ignoreUrls: [
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
  ],

  // Hooks
  beforeSend: (error) => {
    // Modify or filter errors before sending
    if (error.message.includes('ignore')) {
      return null; // Don't send
    }
    return error;
  },
});
```

## Error Tracking

### Automatic Error Capture

The SDK automatically captures:

- Uncaught JavaScript errors
- Unhandled promise rejections
- React component errors (with ErrorBoundary)
- Server-side errors (API routes, server components)

### Manual Error Capture

```typescript
import { RiviumTrace } from '@rivium-trace/nextjs-sdk';

// Capture exception
try {
  throw new Error('Something broke');
} catch (error) {
  RiviumTrace.getInstance()?.captureException(error, 'Custom context', {
    userId: '123',
    customData: 'value',
  });
}

// Capture message/log
RiviumTrace.getInstance()?.captureMessage(
  'User completed checkout',
  'info',
  { orderId: '456' }
);
```

### Using Hooks

```tsx
import { useRiviumTrace } from '@rivium-trace/nextjs-sdk/react';

function Component() {
  const { captureException, captureMessage, setUserId } = useRiviumTrace();

  useEffect(() => {
    setUserId(user.id);
  }, [user.id]);

  const handleError = (error: Error) => {
    captureException(error, 'Payment failed', {
      amount: 99.99,
      currency: 'USD',
    });
  };

  return <PaymentForm onError={handleError} />;
}
```

## Breadcrumbs

Breadcrumbs track user actions and provide context for errors.

### Automatic Breadcrumbs

- Navigation changes (route transitions)
- Console errors and warnings

### Manual Breadcrumbs

```typescript
import { BreadcrumbService } from '@rivium-trace/nextjs-sdk';

// Generic breadcrumb
BreadcrumbService.add('User action', 'user', { button: 'submit' });

// Specific types
BreadcrumbService.addUser('Clicked checkout button');
BreadcrumbService.addHttp('POST', '/api/orders', 200);
BreadcrumbService.addState('Cart updated', { items: 3 });
BreadcrumbService.addNavigation('/cart', '/checkout');
```

### Using Hooks

```tsx
import { useBreadcrumbs } from '@rivium-trace/nextjs-sdk/react';

function Component() {
  const { addBreadcrumb, addHttp, addState } = useBreadcrumbs();

  const handleSubmit = async (data) => {
    addBreadcrumb('Form submitted', { formName: 'contact' });

    const response = await fetch('/api/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    addHttp('POST', '/api/contact', response.status);
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

## Crash Detection

The SDK detects browser tab crashes and unresponsiveness using a localStorage-based heartbeat system.

### How It Works

1. App starts → Crash marker created
2. Heartbeat runs every 5 seconds
3. App closes normally → Marker removed
4. App crashes → Marker remains
5. Next session → Crash detected and reported

### Features

- Detects tab crashes
- Detects unresponsive tabs
- Detects force-close scenarios
- Post-mortem reporting on next launch

### Configuration

```typescript
RiviumTrace.init({
  enableCrashDetection: true, // Enable crash detection
});
```

## Navigation Tracking

### App Router (Next.js 13+)

```tsx
'use client';

import { useRiviumTraceNavigation } from '@rivium-trace/nextjs-sdk/react';

export function NavigationTracker() {
  useRiviumTraceNavigation();
  return null;
}
```

### Pages Router

```tsx
import { useRiviumTracePagesRouter } from '@rivium-trace/nextjs-sdk/react';

function MyApp({ Component, pageProps }) {
  useRiviumTracePagesRouter();
  return <Component {...pageProps} />;
}
```

### Manual Tracking

```typescript
import { RouterIntegration } from '@rivium-trace/nextjs-sdk';

RouterIntegration.setCurrentRoute('/custom-route');
```

## Error Boundary

### Basic Usage

```tsx
import { ErrorBoundary } from '@rivium-trace/nextjs-sdk/react';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### Custom Fallback

```tsx
<ErrorBoundary
  fallback={<div>Oops! Something went wrong.</div>}
>
  <YourComponent />
</ErrorBoundary>
```

### Fallback Function

```tsx
<ErrorBoundary
  fallback={(error, errorInfo, resetError) => (
    <div>
      <h1>Error: {error.message}</h1>
      <button onClick={resetError}>Try again</button>
    </div>
  )}
>
  <YourComponent />
</ErrorBoundary>
```

### With Error Handler

```tsx
<ErrorBoundary
  onError={(error, errorInfo) => {
    console.log('Error occurred:', error);
    // Custom error handling
  }}
>
  <YourComponent />
</ErrorBoundary>
```

## API Routes & Server Components

### API Routes

```typescript
// pages/api/example.ts
import { RiviumTrace } from '@rivium-trace/nextjs-sdk';

export default async function handler(req, res) {
  try {
    // Your API logic
  } catch (error) {
    RiviumTrace.getInstance()?.captureException(error, 'API Error', {
      endpoint: '/api/example',
      method: req.method,
    });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
```

### Server Components (App Router)

```tsx
// app/page.tsx
import { RiviumTrace } from '@rivium-trace/nextjs-sdk';

export default async function Page() {
  try {
    const data = await fetchData();
    return <div>{data}</div>;
  } catch (error) {
    RiviumTrace.getInstance()?.captureException(error, 'Server Component Error');
    return <div>Error loading data</div>;
  }
}
```

## User Identification

```typescript
import { RiviumTrace } from '@rivium-trace/nextjs-sdk';

// Set user ID
RiviumTrace.getInstance()?.setUserId('user-123');

// Get user ID
const userId = RiviumTrace.getInstance()?.getUserId();
```

## Source Maps

For Next.js applications, source maps are automatically generated in production builds. Upload your source maps to RiviumTrace to get readable stack traces:

### Next.js Configuration

```javascript
// next.config.js
module.exports = {
  productionBrowserSourceMaps: true,
};
```

### Upload Source Maps

After building your app, upload the `.map` files from `.next/static/chunks/` to your RiviumTrace dashboard.

## Best Practices

### 1. Initialize Early

Initialize RiviumTrace as early as possible in your app lifecycle to catch all errors.

### 2. Set User ID

Set user ID after authentication to associate errors with users:

```typescript
useEffect(() => {
  if (user) {
    RiviumTrace.getInstance()?.setUserId(user.id);
  }
}, [user]);
```

### 3. Use Error Boundaries

Wrap major sections of your app with error boundaries:

```tsx
<ErrorBoundary fallback={<ErrorPage />}>
  <Layout>
    <Page />
  </Layout>
</ErrorBoundary>
```

### 4. Add Context to Errors

Include relevant context when capturing errors:

```typescript
captureException(error, 'Payment processing failed', {
  userId: user.id,
  amount: 99.99,
  paymentMethod: 'credit_card',
  attemptCount: 3,
});
```

### 5. Use Breadcrumbs

Add breadcrumbs for important user actions to provide context:

```typescript
BreadcrumbService.addUser('Clicked purchase button');
BreadcrumbService.addUser('Entered payment info');
BreadcrumbService.addUser('Submitted order');
```

### 6. Environment-Specific Config

Use different configs for different environments:

```typescript
RiviumTrace.init({
  apiKey: process.env.NEXT_PUBLIC_RIVIUM_TRACE_API_KEY!,
  environment: process.env.NODE_ENV,
  debug: process.env.NODE_ENV === 'development',
  sampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0.1,
});
```

### 7. Cleanup on Unmount

For Single Page Applications, clean up when needed:

```typescript
useEffect(() => {
  return () => {
    RiviumTrace.getInstance()?.close();
  };
}, []);
```

## TypeScript

The SDK is written in TypeScript and includes full type definitions.

```typescript
import type {
  RiviumTraceConfig,
  RiviumTraceError,
  Breadcrumb,
} from '@rivium-trace/nextjs-sdk';
```

## API Reference

### RiviumTrace

- `init(config)` - Initialize SDK
- `getInstance()` - Get SDK instance
- `captureException(error, message?, extra?, level?)` - Capture error
- `captureMessage(message, level?, extra?)` - Capture log message
- `setUserId(userId)` - Set user ID
- `getUserId()` - Get user ID
- `close()` - Cleanup SDK

### BreadcrumbService

- `add(message, type, data?, level?)` - Add breadcrumb
- `addNavigation(from, to, data?)` - Add navigation
- `addUser(action, data?)` - Add user action
- `addHttp(method, url, status?, data?)` - Add HTTP request
- `addState(message, data?)` - Add state change
- `getAll()` - Get all breadcrumbs
- `clear()` - Clear breadcrumbs

### RouterIntegration

- `trackAppRouterNavigation(pathname, searchParams?)` - Track App Router nav
- `initializePagesRouter(router)` - Initialize Pages Router
- `setCurrentRoute(route)` - Set route manually
- `getCurrentRoute()` - Get current route
- `getNavigationContext()` - Get navigation context

### CrashDetector

- `enable()` - Enable crash detection
- `disable()` - Disable crash detection
- `didCrashLastSession()` - Check for crash
- `getCrashReport()` - Get crash details

## Examples

See the [example app](./example) for a complete working implementation.

## License

MIT

## Support

- Documentation: https://docs.rivium.co
- Issues: https://github.com/Rivium-co/rivium-trace-nextjs-sdk/issues
- Email: support@rivium.co
