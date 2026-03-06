import type { PlatformInfo } from '../models';

/**
 * Detect if code is running on server or client
 */
export function isServer(): boolean {
  return typeof window === 'undefined';
}

/**
 * Detect if code is running in browser
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Get browser name from user agent
 */
export function getBrowserName(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  if (ua.includes('edg/') || ua.includes('edge/')) {
    return 'edge';
  }
  if (ua.includes('chrome/') && !ua.includes('edg/')) {
    return 'chrome';
  }
  if (ua.includes('firefox/')) {
    return 'firefox';
  }
  if (ua.includes('safari/') && !ua.includes('chrome/') && !ua.includes('edg/')) {
    return 'safari';
  }
  if (ua.includes('opera/') || ua.includes('opr/')) {
    return 'opera';
  }

  return 'unknown';
}

/**
 * Get OS name from user agent
 */
export function getOSName(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac')) return 'macos';
  if (ua.includes('linux')) return 'linux';
  if (ua.includes('android')) return 'android';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';

  return 'unknown';
}

/**
 * Get device type from user agent
 */
export function getDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  if (ua.includes('mobile')) return 'mobile';
  if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';

  return 'desktop';
}

/**
 * Get comprehensive platform information
 */
export function getPlatformInfo(): PlatformInfo {
  const isServerEnv = isServer();

  if (isServerEnv) {
    // Server-side (Node.js)
    return {
      platform: 'nextjs_server',
      isServer: true,
      isBrowser: false,
      userAgent: process.env.USER_AGENT || 'Node.js',
      os: process.platform,
    };
  }

  // Client-side (Browser)
  const userAgent = navigator.userAgent;
  const browser = getBrowserName(userAgent);
  const os = getOSName(userAgent);
  const device = getDeviceType(userAgent);

  return {
    platform: 'nextjs',
    userAgent,
    isServer: false,
    isBrowser: true,
    browser,
    os,
    device,
  };
}

/** SDK version for User-Agent header */
const SDK_VERSION = '1.0.2';

/**
 * Get user agent string formatted for backend SDK detection
 */
export function getUserAgent(): string {
  if (isServer()) {
    return `RiviumTrace-SDK/${SDK_VERSION} (nextjs_server)`;
  }

  return `RiviumTrace-SDK/${SDK_VERSION} (${getPlatformString()})`;
}

/**
 * Get platform identifier string for API calls
 */
export function getPlatformString(): string {
  return getPlatformInfo().platform;
}
