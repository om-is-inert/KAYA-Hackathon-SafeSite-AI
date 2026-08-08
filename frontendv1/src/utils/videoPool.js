/**
 * videoPool.js — module-level singleton registry for pre-warmed video elements.
 *
 * How it works:
 *  1. Preloader creates <video> elements and registers them here via registerWarmVideo().
 *  2. Pages call getWarmVideo(src) to get the SAME element (not a copy).
 *  3. Moving a <video> in the DOM preserves its buffer and decode state —
 *     so the video plays instantly without re-downloading or re-buffering.
 *
 * The off-screen container (_warmContainer) holds videos between page visits
 * so the browser never garbage-collects their buffers.
 */

/** @type {HTMLDivElement|null} */
let _warmContainer = null;

/** @type {Map<string, HTMLVideoElement>} */
const _videoMap = new Map();

/**
 * Returns (creating if needed) the persistent off-screen container.
 * @returns {HTMLDivElement}
 */
export function getWarmContainer() {
  if (_warmContainer) return _warmContainer;

  _warmContainer = document.createElement('div');
  _warmContainer.setAttribute('aria-hidden', 'true');
  Object.assign(_warmContainer.style, {
    position     : 'fixed',
    top          : '-9999px',
    left         : '-9999px',
    width        : '1px',
    height       : '1px',
    overflow     : 'hidden',
    pointerEvents: 'none',
    opacity      : '0',
    zIndex       : '-1',
  });
  document.body.appendChild(_warmContainer);
  return _warmContainer;
}

/**
 * Store a pre-warmed video element keyed by its src URL.
 * Called by the Preloader when it creates warm video elements.
 *
 * @param {string} src - Vite-resolved asset URL
 * @param {HTMLVideoElement} videoEl
 */
export function registerWarmVideo(src, videoEl) {
  _videoMap.set(src, videoEl);
}

/**
 * Retrieve a pre-warmed video element by its src URL.
 * Returns undefined if the preloader hasn't registered it yet.
 *
 * @param {string} src - Vite-resolved asset URL
 * @returns {HTMLVideoElement|undefined}
 */
export function getWarmVideo(src) {
  return _videoMap.get(src);
}
