import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import gsap from 'gsap';
import Lenis from 'lenis';
import Home from './pages/Home';
import ComplianceEngine from './pages/ComplianceEngine';
import VisionEngine from './pages/VisionEngine';
import ForesightEngine from './pages/ForesightEngine';
import HowItWorks from './pages/HowItWorks';
import Team from './pages/Team';
import TopNav from './components/TopNav';
import Preloader from './components/Preloader';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Reset Lenis scroll to top instantly on route change
    if (window.lenis) {
      window.lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
    
    // Refresh GSAP after the new page DOM settles
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });
    
  }, [pathname]);

  return null;
}

function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      direction: 'vertical',
    });
    
    window.lenis = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      window.lenis = null;
      gsap.ticker.remove((time) => {
        lenis.raf(time * 1000);
      });
    };
  }, []);

  return null;
}

function App() {
  return (
    <Router>
      <SmoothScroll />
      <ScrollToTop />
      <TopNav />
      <Preloader>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/compliance-engine" element={<ComplianceEngine />} />
          <Route path="/vision-engine" element={<VisionEngine />} />
          <Route path="/foresight-engine" element={<ForesightEngine />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/team" element={<Team />} />
        </Routes>
      </Preloader>
    </Router>
  );
}

export default App;
