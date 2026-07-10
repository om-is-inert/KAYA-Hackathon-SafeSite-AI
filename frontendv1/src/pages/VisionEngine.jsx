import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import SideMenu from '../components/SideMenu';
import TextPressure from '../components/TextPressure';
import veHeroVideo from '../../Assets/13177813_1920_1080_60fps.mp4';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './ComplianceEngine.css'; // Reusing exact same styles

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function VisionEngine() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openStat, setOpenStat] = useState(null);
  const containerRef = useRef();
  const heroRef = useRef();
  const videoRef = useRef();

  const toggleStat = (i) => setOpenStat(prev => (prev === i ? null : i));

  const statDetails = [
    "Aggregates results across all three verification layers \u2014 design compliance, on-site inspection, and predictive risk modeling \u2014 into a single pass/fail signal for the project.",
    "Cross-checks the uploaded blueprint against your selected building codes, catching code violations before construction begins.",
    "Computer vision compares live site imagery against the approved plan as work progresses, flagging structural deviations as they happen.",
    "Runs 10,000 Monte Carlo simulations against historical build data to estimate the likelihood of hitting your project deadline."
  ];

  useGSAP(() => {
    // Hero pinning and video scale
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: heroRef.current,
        start: "top top",
        end: "+=100%", // pin for 100vh extra scrolling
        pin: true,
        scrub: 1,
      }
    });

    tl.to(videoRef.current, { scale: 1.15, ease: "power2.in" }, 0);
    tl.to('.ce-hero-content', { opacity: 0, ease: "power2.in" }, 0);

    // Animate workspace sections individually so they trigger when they enter view
    const workspaceSections = ['.ce-workspace-left', '.ce-workspace-right', '.ce-workspace-middle'];
    workspaceSections.forEach((selector) => {
      gsap.fromTo(selector,
        { opacity: 0, y: 40 },
        { 
          opacity: 1, 
          y: 0,
          ease: "power2.out",
          scrollTrigger: {
            trigger: selector,
            start: "top 85%",
            end: "top 60%",
            scrub: 1.5
          }
        }
      );
    });

    // Animate stats intro
    gsap.fromTo('.ce-stats-left',
      { opacity: 0, x: -40 },
      {
        opacity: 1,
        x: 0,
        ease: "power2.out",
        scrollTrigger: {
          trigger: '.ce-stats-container',
          start: "top 85%",
          end: "top 60%",
          scrub: 1.5
        }
      }
    );

    // Group the stats rows into a single ScrollTrigger to prevent lag when height changes
    gsap.fromTo('.ce-stat-row',
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.15,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: '.ce-stats-list',
          start: "top 90%",
          toggleActions: "play none none none"
        }
      }
    );
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="ce-dashboard page-transition">
      <SideMenu isOpen={isMenuOpen} closeMenu={() => setIsMenuOpen(false)} />

      {/* Floating Full-Width Navbar */}
      <nav className="floating-nav">
        <div 
          className="nav-logo" 
          onClick={() => setIsMenuOpen(prev => !prev)}
          style={{ cursor: 'pointer' }}
        >
          <span className="logo-icon">≣</span>
          <span className="logo-text">SafeSite AI</span>
        </div>
        <ul className="nav-links">
          <li><Link to="/">Overview</Link></li>
          <li><Link to="/compliance-engine">Compliance Engine</Link></li>
          <li><Link to="/vision-engine">Vision Engine</Link></li>
          <li><a href="#">Forsight Engine</a></li>
          <li><a href="#">Team</a></li>
        </ul>
        <a href="#" className="nav-cta">Get in Touch</a>
      </nav>

      <div ref={heroRef} className="ce-hero">
        <video 
          ref={videoRef}
          className="ce-hero-video"
          src={veHeroVideo}
          autoPlay 
          loop 
          muted 
          playsInline
        />
        <div className="ce-hero-content">
          <div style={{ position: 'relative', width: '97%', height: '300px', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TextPressure
              text="VISION ENGINE"
              flex={true}
              alpha={false}
              stroke={false}
              width={true}
              weight={true}
              italic={true}
              textColor="#ffffff"
              strokeColor="#ff0000"
              minFontSize={36}
            />
          </div>

          {/* Bottom Left Text Block */}
          <div className="bottom-left-info">
            <p>Active Construction Quality Control:<br />Detect structural defects with pixel-accurate precision.</p>
          </div>
        </div>
      </div>

      <section className="ce-workspace-section">
        <div className="ce-workspace-top">
          <div className="ce-workspace-left">
            <h2 className="ce-section-title">1. Regulatory Scope</h2>
            <div className="ce-code-toggles">
              <button className="ce-code-btn ce-code-btn-active">Structural Elements</button>
              <button className="ce-code-btn ce-code-btn-active">Surface Defect Masks</button>
            </div>
          </div>

          <div className="ce-workspace-right">
            <h2 className="ce-section-title">Detected Structural Defects</h2>
            <div className="ce-empty-state">
              <span className="ce-empty-title">No Defects Logged</span>
              <span className="ce-empty-sub">Upload site footage to generate defect masks & structural reports.</span>
            </div>
          </div>
        </div>

        <div className="ce-workspace-middle">
          <h2 className="ce-section-title" style={{ textAlign: 'center' }}>2. Upload Site Inspection Photo</h2>
          <div className="ce-dropzone">
            <span className="ce-dropzone-text">Drop site photograph here or click to upload</span>
            <span className="ce-dropzone-sub">Supports PNG, JPG, WEBP (columns, slabs, reinforcement, formwork)</span>
          </div>
        </div>
      </section>

      <div className="ce-stats-section">
        <div className="ce-stats-container">
          <div className="ce-stats-left">
            <h2 className="ce-stats-heading">Live Vision<br/>Metrics</h2>
            <p className="ce-stats-subtext">Real-time verification against design standards, structural integrity, and timeline probabilities.</p>
          </div>
          
          <div className="ce-stats-right">
            <div className="ce-stats-list">

              <div className={`ce-stat-row ${openStat === 0 ? 'is-open' : ''}`}>
                <div className="ce-stat-row-header" onClick={() => toggleStat(0)}>
                  <span className="ce-stat-title">Composite Health</span>
                  <span className="ce-stat-toggle">+</span>
                </div>
                <div className="ce-stat-expand">
                  <div className="ce-stat-expand-inner">
                    <p>{statDetails[0]}</p>
                    <div className="ce-stat-minimal-value">Score: 100 (Pass)</div>
                  </div>
                </div>
              </div>

              <div className={`ce-stat-row ${openStat === 1 ? 'is-open' : ''}`}>
                <div className="ce-stat-row-header" onClick={() => toggleStat(1)}>
                  <span className="ce-stat-title">Design Flaws</span>
                  <span className="ce-stat-toggle">+</span>
                </div>
                <div className="ce-stat-expand">
                  <div className="ce-stat-expand-inner">
                    <p>{statDetails[1]}</p>
                    <div className="ce-stat-minimal-value">Detected: 0</div>
                  </div>
                </div>
              </div>

              <div className={`ce-stat-row ${openStat === 2 ? 'is-open' : ''}`}>
                <div className="ce-stat-row-header" onClick={() => toggleStat(2)}>
                  <span className="ce-stat-title">As-Built Defects</span>
                  <span className="ce-stat-toggle">+</span>
                </div>
                <div className="ce-stat-expand">
                  <div className="ce-stat-expand-inner">
                    <p>{statDetails[2]}</p>
                    <div className="ce-stat-minimal-value">Detected: 0</div>
                  </div>
                </div>
              </div>

              <div className={`ce-stat-row ${openStat === 3 ? 'is-open' : ''}`}>
                <div className="ce-stat-row-header" onClick={() => toggleStat(3)}>
                  <span className="ce-stat-title">On-Time Probability</span>
                  <span className="ce-stat-toggle">+</span>
                </div>
                <div className="ce-stat-expand">
                  <div className="ce-stat-expand-inner">
                    <p>{statDetails[3]}</p>
                    <div className="ce-stat-minimal-value">Status: Pending</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
