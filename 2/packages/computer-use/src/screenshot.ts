import type { ScreenshotResult } from './types.js';

const DATA_URL_PREFIX = /^data:image\/\w+;base64,/;

/**
 * Strip the `data:image/...;base64,` prefix from a data URL.
 * If already raw base64, returns as-is.
 */
export function stripDataUrlPrefix(dataUrl: string): string {
  return dataUrl.replace(DATA_URL_PREFIX, '');
}

/**
 * Build a ScreenshotResult from a raw data URL string.
 *
 * The caller (Chrome extension) is responsible for actually calling
 * `chrome.tabs.captureVisibleTab` — this module only handles the
 * base64 processing so we don't depend on `chrome.*` APIs directly.
 *
 * @param dataUrl  The data-URL returned by captureVisibleTab
 * @param width    Viewport width in real pixels
 * @param height   Viewport height in real pixels
 */
export function buildScreenshot(
  dataUrl: string,
  width: number,
  height: number,
): ScreenshotResult {
  return {
    base64: stripDataUrlPrefix(dataUrl),
    width,
    height,
  };
}

/**
 * Recommended capture options for `chrome.tabs.captureVisibleTab`.
 * The extension should pass these when calling the Chrome API.
 */
export const CAPTURE_OPTIONS = {
  format: 'png' as const,
} satisfies { format: 'png' };

/** Minimum interval (ms) between captureVisibleTab calls to avoid rate-limit. */
export const MIN_CAPTURE_INTERVAL_MS = 200;
