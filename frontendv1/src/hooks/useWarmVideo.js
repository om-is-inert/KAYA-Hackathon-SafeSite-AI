/**
 * useWarmVideo — React hook that "claims" a pre-warmed video element from the
 * global video pool and mounts it inside a given container div.
 *
 * Because we reuse the EXACT same DOM element (not a copy), the browser keeps
 * the media buffer and decode state intact — the video starts playing instantly.
 *
 * Usage in a page component:
 *
 *   const videoRef       = useRef();          // GSAP can animate this
 *   const videoWrapRef   = useRef();          // wrapper <div> in JSX
 *   useWarmVideo(heroVideoSrc, videoRef, videoWrapRef, 'hero-video');
 *
 *   // In JSX — replace <video> with a plain wrapper div:
 *   <div ref={videoWrapRef} className="hero-video-wrap" />
 *
 * On unmount the element is returned to the warm container so its buffer
 * stays hot for the next navigation to this page.
 */

import { useLayoutEffect } from 'react';
import { getWarmVideo, getWarmContainer } from '../utils/videoPool';

/**
 * @param {string}                      src          - Vite-resolved video URL (same one the Preloader used)
 * @param {React.MutableRefObject}      videoRef     - ref that pages/GSAP use to target the video element
 * @param {React.MutableRefObject}      containerRef - ref to the wrapper <div> where the video will be placed
 * @param {string}                      [className]  - CSS class(es) to apply to the video element
 */
export function useWarmVideo(src, videoRef, containerRef, className) {
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    /* Try to get the pre-warmed element from the pool */
    let video = getWarmVideo(src);

    if (video) {
      /* ── Re-use pre-warmed element (instant playback) ── */
      if (className) video.className = className;
      container.appendChild(video);
      videoRef.current = video;

      /* Restart from beginning and ensure it's playing */
      video.currentTime = 0;
      video.play().catch(() => { /* autoplay policy — already muted, should be fine */ });
    } else {
      /* ── Fallback: create a fresh element (first-load or pool miss) ── */
      const v = document.createElement('video');
      v.src         = src;
      v.autoplay    = true;
      v.loop        = true;
      v.muted       = true;
      v.playsInline = true;
      v.preload     = 'auto';
      if (className) v.className = className;
      container.appendChild(v);
      videoRef.current = v;
    }

    return () => {
      /* On unmount — return video to warm container to keep buffer alive */
      const v = videoRef.current;
      if (!v) return;

      const wc = getWarmContainer();
      if (wc && v.parentNode !== wc) {
        /* Pause while parked (saves CPU); it'll resume on next mount */
        v.pause();
        wc.appendChild(v);
      }
    };
    // src is a stable Vite-hashed URL; deps array intentionally minimal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
