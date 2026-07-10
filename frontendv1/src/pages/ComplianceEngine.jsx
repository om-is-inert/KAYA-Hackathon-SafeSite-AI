import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import TextPressure from '../components/TextPressure';
import ceHeroVideo from '../../Assets/8471078-hd_1920_1080_25fps.mp4';
import closingPhoto from '../../Assets/pexels-thirdman-8482551.jpg';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './ComplianceEngine.css';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function ComplianceEngine() {
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
          <div style={{ position: 'relative', width: '97%', height: '300px', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

          {/* Bottom Left Text Block */}
          <div className="bottom-left-info">
            <p>Automated Blueprint Analysis That<br />Catches Violations Before Inspectors Do</p>
          </div>
        </div>
      </div>

      <section className="ce-workspace-section">
        <div className="ce-workspace-top">
          <div className="ce-workspace-left">
            <h2 className="ce-section-title">1. Select Building Codes</h2>
            <div className="ce-code-toggles">
              <button className="ce-code-btn ce-code-btn-active">NBC 2016 Part IV (Fire & Life Safety)</button>
              <button className="ce-code-btn ce-code-btn-active">IS 456:2000 (Reinforced Concrete)</button>
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

        <div className="ce-workspace-middle">
          <h2 className="ce-section-title" style={{ textAlign: 'center' }}>2. Upload Floor Plan / Blueprint</h2>
          <div className="ce-dropzone">
            <span className="ce-dropzone-text">Drop blueprint here or click to upload</span>
            <span className="ce-dropzone-sub">Supports PDF, PNG, JPG (architectural layouts, floor plans)</span>
          </div>
        </div>
      </section>

      <div className="ce-stats-section">
        <div className="ce-stats-container">
          <div className="ce-stats-left">
            <h2 className="ce-stats-heading">Live Compliance<br/>Metrics</h2>
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

      {/* Closing Photo Break */}
      <section className="ce-photo-break">
        <img src={closingPhoto} alt="Compliance Engine Closing" />
      </section>

      {/* Story block */}
      <section className="ce-story-section" style={{ background: '#FAFAFA', padding: '8rem 4rem', display: 'flex', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#666', margin: '0 0 1.5rem 0' }}>01 — COMPLIANCE ENGINE</span>
          <h3 style={{ fontSize: '2.2rem', fontWeight: 600, lineHeight: 1.3, color: '#111', letterSpacing: '-0.02em', margin: '0 0 2.5rem 0' }}>
            Automatically checks site plans against building codes and safety regulations — catching violations before inspectors do.
          </h3>
          <Link to="/how-it-works" className="nav-cta cta-large">See How It Works</Link>
        </div>
      </section>
    </div>
  );
}
