import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import TextPressure from '../components/TextPressure';
import feHeroVideo from '../../Assets/14378494_1920_1080_24fps.mp4';
import aerialPhoto from '../../Assets/farbsynthese-village-7133842.jpg';
import closingPhoto from '../../Assets/pexels-nacho-monge-425000126-31329571.jpg';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './ComplianceEngine.css'; // Reusing exact same styles

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function ForesightEngine() {
  const [openStat, setOpenStat] = useState(null);
  const containerRef = useRef();
  const heroRef = useRef();
  const videoRef = useRef();

  const toggleStat = (i) => setOpenStat(prev => (prev === i ? null : i));

  const statDetails = [
    "Rolls up all 3 layers into a single pass/fail score for the project.",
    "Layer 1: Structural blueprint check passed successfully.",
    "Layer 2: Real-time site inspection confirms structural integrity.",
    "Layer 3: 10,000x Monte Carlo simulation executed.",
    "Likelihood of completing the project within the planned timeline window.",
    "Projected deviation from the baseline resource budget.",
    "Probability of schedule delays due to impending weather events.",
    "Risk of material shortages based on global logistics tracking."
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
    const workspaceSections = gsap.utils.toArray('.ce-workspace-top, .ce-workspace-middle, .ce-story-section');
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
          src={feHeroVideo}
          autoPlay 
          loop 
          muted 
          playsInline
        />
        <div className="ce-hero-content">
          <div style={{ position: 'relative', width: '97%', height: '300px', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TextPressure
              text="FORESIGHT ENGINE"
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
            <p>Predictive Risk Modeling:<br />Anticipate delays and cost overruns before they happen.</p>
          </div>
        </div>
      </div>


      <section className="ce-workspace-section" style={{ paddingTop: '4rem' }}>
        <div className="ce-workspace-top">
          <div className="ce-workspace-left">
            <h2 className="ce-section-title">1. Simulation Parameters</h2>
            <div className="ce-code-toggles">
              <button className="ce-code-btn ce-code-btn-active">Monte Carlo Schedule Risk</button>
              <button className="ce-code-btn ce-code-btn-active">Budget Overrun Modeling</button>
            </div>
          </div>

          <div className="ce-workspace-right">
            <h2 className="ce-section-title">Risk Forecasts</h2>
            <div className="ce-empty-state">
              <span className="ce-empty-title">No Forecasts Generated</span>
              <span className="ce-empty-sub">Upload project schedule and budget to run predictive models.</span>
            </div>
          </div>
        </div>

        <div className="ce-workspace-middle">
          <h2 className="ce-section-title" style={{ textAlign: 'center' }}>2. Upload Project Schedule (.mpp, .csv)</h2>
          <div className="ce-dropzone">
            <span className="ce-dropzone-text">Drop schedule file here or click to upload</span>
            <span className="ce-dropzone-sub">Supports Primavera P6, MS Project, or CSV format</span>
          </div>
        </div>
      </section>

      <div className="ce-stats-section">
        <div className="ce-stats-container">
          <div className="ce-stats-left">
            <h2 className="ce-stats-heading">Live Foresight<br/>Metrics</h2>
            <p className="ce-stats-subtext">Real-time predictive analytics on schedule, budget, and risk factors.</p>
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
                    <div className="ce-stat-minimal-value">Score: Pending</div>
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
                    <div className="ce-stat-minimal-value">Status: Verified</div>
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
                    <div className="ce-stat-minimal-value">Status: Clear</div>
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
                    <div className="ce-stat-minimal-value">Predicted: Pending</div>
                  </div>
                </div>
              </div>

              <div className={`ce-stat-row ${openStat === 4 ? 'is-open' : ''}`}>
                <div className="ce-stat-row-header" onClick={() => toggleStat(4)}>
                  <span className="ce-stat-title">Schedule Confidence</span>
                  <span className="ce-stat-toggle">+</span>
                </div>
                <div className="ce-stat-expand">
                  <div className="ce-stat-expand-inner">
                    <p>{statDetails[4]}</p>
                    <div className="ce-stat-minimal-value">Score: Pending</div>
                  </div>
                </div>
              </div>

              <div className={`ce-stat-row ${openStat === 5 ? 'is-open' : ''}`}>
                <div className="ce-stat-row-header" onClick={() => toggleStat(5)}>
                  <span className="ce-stat-title">Budget Variance</span>
                  <span className="ce-stat-toggle">+</span>
                </div>
                <div className="ce-stat-expand">
                  <div className="ce-stat-expand-inner">
                    <p>{statDetails[5]}</p>
                    <div className="ce-stat-minimal-value">Predicted: ±0%</div>
                  </div>
                </div>
              </div>

              <div className={`ce-stat-row ${openStat === 6 ? 'is-open' : ''}`}>
                <div className="ce-stat-row-header" onClick={() => toggleStat(6)}>
                  <span className="ce-stat-title">Weather Delay Risk</span>
                  <span className="ce-stat-toggle">+</span>
                </div>
                <div className="ce-stat-expand">
                  <div className="ce-stat-expand-inner">
                    <p>{statDetails[6]}</p>
                    <div className="ce-stat-minimal-value">Risk: Low</div>
                  </div>
                </div>
              </div>

              <div className={`ce-stat-row ${openStat === 7 ? 'is-open' : ''}`}>
                <div className="ce-stat-row-header" onClick={() => toggleStat(7)}>
                  <span className="ce-stat-title">Supply Chain Disruption</span>
                  <span className="ce-stat-toggle">+</span>
                </div>
                <div className="ce-stat-expand">
                  <div className="ce-stat-expand-inner">
                    <p>{statDetails[7]}</p>
                    <div className="ce-stat-minimal-value">Risk: Unknown</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <section className="ce-workspace-section" style={{ paddingTop: 0 }}>
        <div style={{ height: '1px', background: '#EAEAEA', width: '100%', marginBottom: '4rem' }}></div>

        {/* Section 6 */}
        <div className="ce-workspace-top">
          <div className="ce-workspace-left">
            <h2 className="ce-section-title">Probabilistic Project Schedule (Gantt)</h2>
          </div>
          <div className="ce-workspace-right">
            <div className="ce-dropzone" style={{ minHeight: '120px', padding: '3rem 2rem', gap: '1.5rem' }}>
              <span className="ce-dropzone-text">Click Run Simulation to model delay risks & duration shifts</span>
              <button className="nav-cta cta-large" style={{ width: 'fit-content' }}>Run Simulation</button>
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: '#EAEAEA', width: '100%', margin: '4rem 0' }}></div>

        {/* Section 7 */}
        <div className="ce-workspace-top">
          <div className="ce-workspace-left">
            <h2 className="ce-section-title">MILP Resource Re-Optimization</h2>
          </div>
          <div className="ce-workspace-right">
            <div className="ce-dropzone" style={{ minHeight: '120px', padding: '3rem 2rem', gap: '1.5rem' }}>
              <span className="ce-dropzone-text">Trigger optimization to compute minimum-cost crew allocation</span>
              <button className="nav-cta cta-large" style={{ width: 'fit-content' }}>Re-Optimize</button>
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: '#EAEAEA', width: '100%', margin: '4rem 0' }}></div>

        {/* Section 8 */}
        <div className="ce-workspace-top">
          <div className="ce-workspace-left">
            <h2 className="ce-section-title">Material Cost Index Forecast</h2>
          </div>
          <div className="ce-workspace-right">
            <div className="ce-dropzone" style={{ minHeight: '120px', padding: '3rem 2rem', gap: '1.5rem' }}>
              <span className="ce-dropzone-text">Time-series projection will chart cement/steel volatility here</span>
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: '#EAEAEA', width: '100%', margin: '4rem 0' }}></div>

        {/* Section 9 */}
        <div className="ce-workspace-top">
          <div className="ce-workspace-left">
            <h2 className="ce-section-title" style={{ color: '#111' }}>Monte Carlo Risk Distribution</h2>
          </div>
          <div className="ce-workspace-right">
            <div className="ce-dropzone" style={{ minHeight: '120px', padding: '3rem 2rem', gap: '1.5rem' }}>
              <span className="ce-dropzone-text">Execute simulation to view scenario likelihoods</span>
            </div>
          </div>
        </div>
      </section>

      {/* Closing Photo Break */}
      <section className="ce-photo-break">
        <img src={closingPhoto} alt="Construction Worker Overhead" />
      </section>

      {/* Story block */}
      <section className="ce-story-section" style={{ background: '#FAFAFA', padding: '8rem 4rem', display: 'flex', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#666', margin: '0 0 1.5rem 0' }}>03 — FORESIGHT ENGINE</span>
          <h3 style={{ fontSize: '2.2rem', fontWeight: 600, lineHeight: 1.3, color: '#111', letterSpacing: '-0.02em', margin: '0 0 2.5rem 0' }}>
            Predicts where delays and defects are likely to occur next, based on patterns across thousands of past builds, using continuous Monte Carlo simulation and MILP-based resource optimization.
          </h3>
          <Link to="/how-it-works" className="nav-cta cta-large">See How It Works</Link>
        </div>
      </section>
    </div>
  );
}
