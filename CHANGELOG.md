# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2024-11-15

### Added
- Initial release of RiviumTrace SDK for Next.js
- Automatic error tracking (uncaught errors, promise rejections, React errors)
- Browser tab crash detection with localStorage-based heartbeat
- In-memory breadcrumb tracking (max 20 breadcrumbs)
- A/B testing with server-side variant assignment
- Navigation tracking for Next.js App Router and Pages Router
- React hooks: `useABTest`, `useVariantConfig`, `useRiviumTrace`, `useBreadcrumbs`
- React components: `ErrorBoundary`, navigation trackers
- Platform detection (browser, server, OS, device)
- Rate limiting for error deduplication
- Configurable error filtering and sampling
- TypeScript support with full type definitions
- Source map support for readable stack traces
- Comprehensive example app with demos
- Full documentation and API reference

### Features
- Multi-platform support (browser and Node.js/server)
- Server-side rendering (SSR) compatible
- Next.js App Router (13+) and Pages Router support
- Zero dependencies (peer dependencies: next, react)
- Lightweight and performant
- Extensive configuration options
- Debug mode for development
- User identification
- Custom tags and metadata
- beforeSend hook for error filtering
- Graceful error handling and fallbacks

### Documentation
- Comprehensive README with examples
- Example Next.js application
- TypeScript type definitions
- API reference
- Best practices guide
