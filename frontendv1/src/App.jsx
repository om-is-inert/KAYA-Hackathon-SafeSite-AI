import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useLayoutEffect, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Home from './pages/Home';
import ComplianceEngine from './pages/ComplianceEngine';
import VisionEngine from './pages/VisionEngine';
import ForesightEngine from './pages/ForesightEngine';
import TopNav from './components/TopNav';

function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    // Jump to top before paint so GSAP measures the new page from a clean scroll position
    window.scrollTo(0, 0);
    // Let the new page's DOM/refs settle, then recompute all ScrollTrigger start/end points
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });
  }, [pathname]);

  return null;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      
      <TopNav />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/compliance-engine" element={<ComplianceEngine />} />
        <Route path="/vision-engine" element={<VisionEngine />} />
        <Route path="/foresight-engine" element={<ForesightEngine />} />
      </Routes>
    </Router>
  );
}

export default App;
