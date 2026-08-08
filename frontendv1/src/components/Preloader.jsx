/**
 * Preloader — single global loading screen that preloads ALL hero videos and
 * critical images before revealing the app. Videos are kept alive in a hidden
 * off-screen DOM container after the overlay dismisses, so the browser holds
 * their media buffers in memory for the full session. When a page's own
 * <video> tag uses the same hashed src, the browser serves it from cache and
 * it starts playing instantly — no per-page buffering delay.
 *
 * Usage: wrap <App /> routes inside <Preloader>.
 *   <Preloader><Routes>...</Routes></Preloader>
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import './Preloader.css';
import { getWarmContainer, registerWarmVideo } from '../utils/videoPool';

/* ── Global Asset Manifest ───────────────────────────────────────── */
/* We import the same asset references the pages import so Vite
   resolves identical hashed URLs — no double-download. */
import heroVideo    from '../../Assets/606982_Cities_City_3840x2160.mp4';
import ceHeroVideo  from '../../Assets/8471078-hd_1920_1080_25fps.mp4';
import veHeroVideo  from '../../Assets/13177813_1920_1080_60fps.mp4';
import feHeroVideo  from '../../Assets/14378494_1920_1080_24fps.mp4';

import featureImage1   from '../../Assets/pointing-sketch.jpg';
import featureImage2   from '../../Assets/farbsynthese-village-7133842.jpg';
import featureImage3   from '../../Assets/11066063-construction-site-4020496.jpg';
import closingPhotoVE  from '../../Assets/pexels-danielellis-11701517.jpg';
import closingPhotoCE  from '../../Assets/pexels-thirdman-8482551.jpg';
import closingPhotoFE  from '../../Assets/pexels-nacho-monge-425000126-31329571.jpg';

const VIDEO_SRCS = [heroVideo, ceHeroVideo, veHeroVideo, feHeroVideo];
const IMAGE_SRCS = [
  featureImage1,
  featureImage2,
  featureImage3,
  closingPhotoVE,
  closingPhotoCE,
  closingPhotoFE,
];

/* Minimum time the loader is visible (ms) so it doesn't just flash */
const MIN_DISPLAY_MS = 1200;

/* Per-video hard timeout (ms) — never block the user longer than this
   even if a codec is unsupported or the connection is very slow */
const VIDEO_TIMEOUT_MS = 20000;

/* ── getWarmContainer and video registry are in src/utils/videoPool.js ── */

export default function Preloader({ children }) {
  const [loading, setLoading]   = useState(true);
  const [progress, setProgress] = useState(0);
  const overlayRef = useRef(null);
  const startTime  = useRef(Date.now());

  /* Preload ALL assets globally on initial mount */
  useEffect(() => {
    const totalCount = VIDEO_SRCS.length + IMAGE_SRCS.length;

    /* Nothing to preload — skip */
    if (totalCount === 0) {
      setProgress(100);
      const remaining = Math.max(0, MIN_DISPLAY_MS - (Date.now() - startTime.current));
      setTimeout(() => revealPage(), remaining);
      return;
    }

    let loaded = 0;

    const tick = () => {
      loaded += 1;
      setProgress(Math.round((loaded / totalCount) * 100));
      if (loaded >= totalCount) {
        const remaining = Math.max(0, MIN_DISPLAY_MS - (Date.now() - startTime.current));
        setTimeout(() => revealPage(), remaining);
      }
    };

    const warmContainer = getWarmContainer();

    /* ── Videos ──────────────────────────────────────────────────── */
    /* Each video is attached to the persistent warm container so:
       1. The browser fully buffers them during the loading screen.
       2. They remain in memory/cache so when a page renders its own
          <video src="same-hashed-url">, playback begins instantly. */
    VIDEO_SRCS.forEach((src) => {
      const v = document.createElement('video');
      v.preload     = 'auto';
      v.muted       = true;
      v.playsInline = true;
      v.loop        = true;
      v.src         = src;

      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        tick();
      };

      v.addEventListener('canplaythrough', settle, { once: true });
      v.addEventListener('error',          settle, { once: true });

      /* Hard deadline — don't block indefinitely */
      setTimeout(settle, VIDEO_TIMEOUT_MS);

      /* Register in the pool so pages can claim this exact element later */
      registerWarmVideo(src, v);

      /* Attach to persistent container → buffer stays warm after overlay closes */
      warmContainer.appendChild(v);

      /* Explicitly kick off network fetch */
      v.load();
    });

    /* ── Images ──────────────────────────────────────────────────── */
    IMAGE_SRCS.forEach((src) => {
      const img = new Image();
      img.src = src;
      if (img.complete) {
        tick();
      } else {
        img.onload  = tick;
        img.onerror = tick; // don't block on broken images
      }
    });

    // We only want this to run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revealPage = useCallback(() => {
    if (!overlayRef.current) {
      setLoading(false);
      return;
    }

    /* Animate the overlay away */
    gsap.to(overlayRef.current, {
      clipPath : 'inset(0 0 100% 0)',
      duration : 0.8,
      ease     : 'power3.inOut',
      onComplete: () => setLoading(false),
    });
  }, []);

  return (
    <>
      {/* The actual page content renders behind the overlay immediately
          so the browser can start fetching assets in parallel */}
      {children}

      {loading && (
        <div
          ref={overlayRef}
          className="preloader-overlay"
          style={{ clipPath: 'inset(0 0 0 0)' }}
        >
          <div className="preloader-content">
            {/* Wordmark */}
            <div className="preloader-wordmark">SafeSite AI</div>

            {/* Animated subtitle */}
            <p className="preloader-subtitle">Loading experience…</p>

            {/* Progress track */}
            <div className="preloader-track">
              <div
                className="preloader-bar"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Numeric percentage */}
            <span className="preloader-pct">{progress}%</span>
          </div>
        </div>
      )}
    </>
  );
}
