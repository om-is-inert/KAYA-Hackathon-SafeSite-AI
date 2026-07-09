import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import SideMenu from '../components/SideMenu';
import TextPressure from '../components/TextPressure';
import ceHeroVideo from '../../Assets/4790152_Building_Working_1280x720.mp4';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './ComplianceEngine.css';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function ComplianceEngine() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const containerRef = useRef();
  const heroRef = useRef();
  const videoRef = useRef();

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
    // Butter smooth scrubbed animations for zigzag stats
    gsap.utils.toArray('.ce-zigzag-block').forEach((block, i) => {
      const text = block.querySelector('.ce-zigzag-text');
      const val = block.querySelector('.ce-zigzag-value-container');
      
      const textIsLeft = i % 2 === 0;

      // Animate text sliding in from the side
      gsap.fromTo(text,
        { opacity: 0, x: textIsLeft ? -50 : 50 },
        { 
          opacity: 1, 
          x: 0, 
          ease: "power2.in",
          scrollTrigger: {
            trigger: block,
            start: "top 85%",
            end: "top 50%",
            scrub: 1.5
          }
        }
      );

      // Animate value fading and scaling up
      gsap.fromTo(val,
        { opacity: 0, scale: 0.8, y: 50 },
        { 
          opacity: 1, 
          scale: 1, 
          y: 0,
          ease: "power2.in",
          scrollTrigger: {
            trigger: block,
            start: "top 95%",
            end: "top 55%",
            scrub: 1.5
          }
        }
      );
    });

    // Animate workspace columns
    gsap.utils.toArray('.ce-workspace-left, .ce-workspace-right').forEach((col) => {
      gsap.fromTo(col,
        { opacity: 0, y: 50 },
        { 
          opacity: 1, 
          y: 0,
          ease: "power2.in",
          scrollTrigger: {
            trigger: col,
            start: "top 85%",
            end: "top 60%",
            scrub: 1.5
          }
        }
      );
    });
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
          <li><a href="#">Vision Engine</a></li>
          <li><a href="#">Forsight Engine</a></li>
          <li><a href="#">Team</a></li>
        </ul>
        <a href="#" className="nav-cta">Get in Touch</a>
      </nav>

      <div ref={heroRef} className="ce-hero">
        <video 
          ref={videoRef}
          className="ce-hero-video"
          src={ceHeroVideo}
          autoPlay 
          loop 
          muted 
          playsInline
        />
        <div className="ce-hero-content">
          <div style={{ position: 'relative', width: '80%', height: '300px', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TextPressure
              text="COMPLIANCE ENGINE"
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
        </div>
      </div>

      <section className="ce-workspace-section">
        <div className="ce-workspace">
        <div className="ce-workspace-left">
          <h2 className="ce-section-title">1. Select Building Codes</h2>
          <div className="ce-code-toggles">
            <button className="ce-code-btn ce-code-btn-active">✓ NBC 2016 Part IV (Fire & Life Safety)</button>
            <button className="ce-code-btn ce-code-btn-active">✓ IS 456:2000 (Reinforced Concrete)</button>
          </div>

          <h2 className="ce-section-title ce-mt-4">2. Upload Floor Plan / Blueprint</h2>
          <div className="ce-dropzone">
            <span className="ce-dropzone-text">Drop blueprint here or click to upload</span>
            <span className="ce-dropzone-sub">Supports PDF, PNG, JPG (architectural layouts, floor plans)</span>
          </div>
        </div>

        <div className="ce-workspace-right">
          <h2 className="ce-section-title">Identified Violations</h2>
          <div className="ce-empty-state">
            <span className="ce-empty-title">No Violations Detected Yet</span>
            <span className="ce-empty-sub">Upload an architectural layout to start compliance verification.</span>
          </div>
        </div>
        </div>
      </section>

      <div className="ce-stats-section">
        <div className="ce-zigzag-blocks">
          
          {/* Row 1: Text Left, Value Right */}
          <div className="ce-zigzag-block">
            <div className="ce-zigzag-text">
              <span className="ce-zigzag-eyebrow">Composite Health <span className="ce-pill ce-pill-green ce-pill-small" style={{marginLeft: '1rem'}}>Pass</span></span>
              <p className="ce-zigzag-body">Across all 3 layers</p>
            </div>
            <div className="ce-zigzag-value-container">
              <span className="ce-zigzag-value">100</span>
            </div>
          </div>

          {/* Row 2: Value Left, Text Right */}
          <div className="ce-zigzag-block">
            <div className="ce-zigzag-value-container">
              <span className="ce-zigzag-value">0</span>
            </div>
            <div className="ce-zigzag-text">
              <span className="ce-zigzag-eyebrow">Design Flaws <span className="ce-pill ce-pill-dark ce-pill-small" style={{marginLeft: '1rem'}}>Layer 1</span></span>
              <p className="ce-zigzag-body">Blueprint check</p>
            </div>
          </div>

          {/* Row 3: Text Left, Value Right */}
          <div className="ce-zigzag-block">
            <div className="ce-zigzag-text">
              <span className="ce-zigzag-eyebrow">As-Built Defects <span className="ce-pill ce-pill-dark ce-pill-small" style={{marginLeft: '1rem'}}>Layer 2</span></span>
              <p className="ce-zigzag-body">Site inspection</p>
            </div>
            <div className="ce-zigzag-value-container">
              <span className="ce-zigzag-value">0</span>
            </div>
          </div>

          {/* Row 4: Value Left, Text Right */}
          <div className="ce-zigzag-block">
            <div className="ce-zigzag-value-container">
              <span className="ce-zigzag-value">—</span>
            </div>
            <div className="ce-zigzag-text">
              <span className="ce-zigzag-eyebrow">On-Time Probability <span className="ce-pill ce-pill-dark ce-pill-small" style={{marginLeft: '1rem'}}>Layer 3</span></span>
              <p className="ce-zigzag-body">10,000x simulation</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
