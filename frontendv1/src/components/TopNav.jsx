import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './TopNav.css';

export default function TopNav() {
  const [isHidden, setIsHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY === 0) {
        setIsHidden(false);
      } else if (currentScrollY > lastScrollY && currentScrollY > 70) {
        // Scrolling down and not near the top
        setIsHidden(true);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up
        setIsHidden(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <nav className={`top-nav ${isHidden ? 'is-hidden' : ''}`}>
      <div className="top-nav-logo">
        <Link to="/">SafeSite AI</Link>
      </div>
      
      <div className="top-nav-links">
        <Link to="/compliance-engine" className={location.pathname.startsWith('/compliance-engine') ? 'active' : ''}>Compliance Engine</Link>
        <Link to="/vision-engine" className={location.pathname.startsWith('/vision-engine') ? 'active' : ''}>Vision Engine</Link>
        <Link to="/foresight-engine" className={location.pathname.startsWith('/foresight-engine') ? 'active' : ''}>Foresight Engine</Link>
        <Link to="#">Team</Link>
      </div>

      <div className="top-nav-cta">
        <a href="#" className="contact-btn">Get in Touch</a>
      </div>
    </nav>
  );
}
