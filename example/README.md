# RiviumTrace Next.js SDK - Example App

This is a comprehensive example application demonstrating all features of the RiviumTrace SDK for Next.js.

## Features Demonstrated

- ✅ SDK initialization and configuration
- ✅ Automatic error capture (uncaught errors, promise rejections)
- ✅ Manual error capture with custom context
- ✅ Message logging with different severity levels
- ✅ Breadcrumb tracking (automatic and manual)
- ✅ Navigation tracking (App Router)
- ✅ A/B testing with variant assignment
- ✅ Crash detection (browser tab crashes)
- ✅ Error boundaries for React components
- ✅ React hooks for easy integration

## Getting Started

### 1. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 2. Configure Environment

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your RiviumTrace API key:

```
NEXT_PUBLIC_RIVIUM_TRACE_API_KEY=nl_live_your_api_key
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### 3. Run Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
example/
├── app/
│   ├── layout.tsx           # Root layout with SDK initialization
│   ├── providers.tsx        # Client-side providers
│   ├── page.tsx            # Home page
│   ├── error-tracking/     # Error tracking demo
│   ├── breadcrumbs/        # Breadcrumbs demo
│   ├── ab-testing/         # A/B testing demo
│   └── crash-detection/    # Crash detection demo
├── next.config.js          # Next.js config with source maps
└── package.json
```

## Pages

### Home (`/`)
Overview of all features with navigation links.

### Error Tracking (`/error-tracking`)
- Throw synchronous and async errors
- Capture errors manually with custom context
- Log messages with different severity levels
- See error context (stack traces, breadcrumbs, navigation)

### Breadcrumbs (`/breadcrumbs`)
- Add manual breadcrumbs (user actions, state changes)
- Track form interactions
- Simulate HTTP requests
- View all breadcrumbs in real-time

### A/B Testing (`/ab-testing`)
- Get variant assignment for experiments
- Use variant configuration values
- Track conversions and custom events
- See dynamic UI changes based on variant

### Crash Detection (`/crash-detection`)
- View crash status and heartbeat
- Simulate crashes (for testing)
- Test unresponsive tab detection
- View crash reports

## Key Files

### `app/providers.tsx`
SDK initialization and configuration:

```tsx
RiviumTrace.init({
  apiKey: process.env.NEXT_PUBLIC_RIVIUM_TRACE_API_KEY,
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION,
  debug: true,
  captureUncaughtErrors: true,
  enableCrashDetection: true,
});
```

### Navigation Tracking
Automatic navigation tracking with App Router:

```tsx
useRiviumTraceNavigation(); // In providers.tsx
```

### Error Boundary
Wrap app with error boundary:

```tsx
<ErrorBoundary fallback={<ErrorPage />}>
  {children}
</ErrorBoundary>
```

## Testing

### Test Error Tracking
1. Go to `/error-tracking`
2. Click "Throw Synchronous Error" - error will be caught by boundary
3. Click "Capture Manual Error" - error will be sent to RiviumTrace
4. Open browser console to see debug logs
5. Check RiviumTrace dashboard to see captured errors

### Test Breadcrumbs
1. Go to `/breadcrumbs`
2. Click buttons to add user action breadcrumbs
3. Fill out the form to see state change breadcrumbs
4. Click "Simulate API Calls" to add HTTP breadcrumbs
5. View all breadcrumbs in the list below

### Test A/B Testing
1. Go to `/ab-testing`
2. SDK will fetch experiment assignment from server
3. View assigned variant and configuration
4. Click the dynamic button to track conversions
5. Note: Requires active experiments in RiviumTrace dashboard

### Test Crash Detection
1. Go to `/crash-detection`
2. Click "Simulate Crash (Safe)" to create a crash marker
3. Refresh the page to see crash detection
4. Optionally test "Make Tab Unresponsive" (will freeze browser)

## Source Maps

This example is configured to generate source maps in production:

```javascript
// next.config.js
module.exports = {
  productionBrowserSourceMaps: true,
}
```

After building (`npm run build`), upload the `.map` files from `.next/static/chunks/` to your RiviumTrace dashboard for readable stack traces.

## Learn More

- [RiviumTrace SDK Documentation](../README.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [RiviumTrace Dashboard](https://rivium.co)

## Troubleshooting

### SDK Not Initialized
Make sure `NEXT_PUBLIC_RIVIUM_TRACE_API_KEY` is set in `.env.local`.

### No Errors Appearing in Dashboard
1. Check browser console for debug logs
2. Verify API key is correct
3. Check network tab for API calls to RiviumTrace
4. Ensure `enabled: true` in SDK config

### A/B Testing Not Working
1. Make sure you called `initializeABTesting()`
2. Set user ID with `setUserId()`
3. Create experiments in RiviumTrace dashboard
4. Verify experiments are active

### Crash Detection Not Working
1. Crash detection only works in browser (not SSR)
2. Make sure `enableCrashDetection: true`
3. Crashes are detected on next session start
4. Check localStorage for `rivium_trace_crash_marker`

## License

MIT
