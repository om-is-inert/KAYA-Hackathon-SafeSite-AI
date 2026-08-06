/**
 * Preloader — full-page loading screen that waits for ALL
 * hero videos (canplaythrough) and critical images (onload) across
 * the entire site before revealing the app. Once loaded, users can
 * navigate instantly between pages without seeing a loading screen.
 *
 * Usage: wrap <App /> routes inside <Preloader>.
 *   <Preloader><Routes>...</Routes></Preloader>
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import './Preloader.css';

/* ── Global Asset Manifest ───────────────────────────────────────── */
/* We import the same asset references the pages import so Vite
   resolves identical hashed URLs — no double-download. */
import heroVideo from '../../Assets/606982_Cities_City_3840x2160.mp4';
import ceHeroVideo from '../../Assets/8471078-hd_1920_1080_25fps.mp4';
import veHeroVideo from '../../Assets/13177813_1920_1080_60fps.mp4';
import feHeroVideo from '../../Assets/14378494_1920_1080_24fps.mp4';

import featureImage1 from '../../Assets/pointing-sketch.jpg';
import featureImage2 from '../../Assets/farbsynthese-village-7133842.jpg';
import featureImage3 from '../../Assets/11066063-construction-site-4020496.jpg';
import closingPhotoVE from '../../Assets/pexels-danielellis-11701517.jpg';
import closingPhotoCE from '../../Assets/pexels-thirdman-8482551.jpg';
import closingPhotoFE from '../../Assets/pexels-nacho-monge-425000126-31329571.jpg';

const GLOBAL_ASSETS = {
  videos: [heroVideo, ceHeroVideo, veHeroVideo, feHeroVideo],
  images: [
    featureImage1, 
    featureImage2, 
    featureImage3,
    closingPhotoVE,
    closingPhotoCE,
    closingPhotoFE
  ],
};

/* Minimum time the loader is visible (ms) so it doesn't just flash */
const MIN_DISPLAY_MS = 1200;

export default function Preloader({ children }) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const overlayRef = useRef(null);
  const startTime = useRef(Date.now());

  /* Preload ALL assets globally on initial mount */
  useEffect(() => {
    if (!loading) return;

    const assets = GLOBAL_ASSETS;
    const totalCount = assets.videos.length + assets.images.length;

    /* Nothing to preload — skip */
    if (totalCount === 0) {
      const elapsed = Date.now() - startTime.current;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
      setProgress(100);
      setTimeout(() => revealPage(), remaining);
      return;
    }

    let loaded = 0;

    const tick = () => {
      loaded += 1;
      setProgress(Math.round((loaded / totalCount) * 100));
      if (loaded >= totalCount) {
        const elapsed = Date.now() - startTime.current;
        const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
        setTimeout(() => revealPage(), remaining);
      }
    };

    /* Videos — wait for `canplaythrough` (enough buffered to play without stalling) */
    assets.videos.forEach((src) => {
      const v = document.createElement('video');
      v.preload = 'auto';
      v.muted = true;
      v.playsInline = true;
      v.src = src;
      v.addEventListener('canplaythrough', tick, { once: true });
      /* Fallback: if the event never fires (e.g. codec issue), don't block forever */
      setTimeout(() => {
        if (loaded < totalCount) tick();
      }, 15000);
    });

    /* Images */
    assets.images.forEach((src) => {
      const img = new Image();
      img.src = src;
      if (img.complete) {
        tick();
      } else {
        img.onload = tick;
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
      clipPath: 'inset(0 0 100% 0)',
      duration: 0.8,
      ease: 'power3.inOut',
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
