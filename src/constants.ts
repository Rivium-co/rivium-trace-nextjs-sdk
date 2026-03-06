/** RiviumTrace API endpoint - hardcoded, not user-configurable */
// Internal dev override via env var (not documented, not in public API)
export const RIVIUMTRACE_API_URL =
  (typeof process !== 'undefined' && process.env?.RIVIUMTRACE_DEV_API_URL) ||
  'https://trace.rivium.co';
