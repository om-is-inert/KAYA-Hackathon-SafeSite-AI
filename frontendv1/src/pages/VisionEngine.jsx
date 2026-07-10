import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import TextPressure from '../components/TextPressure';
import veHeroVideo from '../../Assets/13177813_1920_1080_60fps.mp4';
import closingPhoto from '../../Assets/pexels-danielellis-11701517.jpg';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './ComplianceEngine.css'; // Reusing exact same styles

gsap.registerPlugin(useGSAP, ScrollTrigger);

const API_BASE = 'http://localhost:8000';

export default function VisionEngine() {
  const [openStat, setOpenStat] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const containerRef = useRef();
  const heroRef = useRef();
  const videoRef = useRef();
  const fileInputRef = useRef();

  const toggleStat = (i) => setOpenStat(prev => (prev === i ? null : i));

  const statDetails = [
    "Aggregates results across all three verification layers — design compliance, on-site inspection, and predictive risk modeling — into a single pass/fail signal for the project.",
    "Cross-checks the uploaded blueprint against your selected building codes, catching code violations before construction begins.",
    "Computer vision compares live site imagery against the approved plan as work progresses, flagging structural deviations as they happen.",
    "Runs 10,000 Monte Carlo simulations against historical build data to estimate the likelihood of hitting your project deadline."
  ];

  const handleUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setReport(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_BASE}/api/v1/vision/defect/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setReport(data);
    } catch (err) {
      setError(err.message || 'Failed to analyze image. Is the backend running?');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const severityColor = (sev) => {
    switch (sev) {
      case 'CRITICAL': return '#D32F2F';
      case 'HIGH': return '#E65100';
      case 'MEDIUM': return '#F9A825';
      case 'LOW': return '#666';
      default: return '#111';
    }
  };

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
            {report && report.defects && report.defects.length > 0 ? (
              <div className="ce-violations-list">
                {report.defects.map((d, i) => (
                  <div key={d.id || i} className="ce-violation-card" style={{
                    padding: '1.2rem 1.5rem',
                    borderLeft: `3px solid ${severityColor(d.severity)}`,
                    background: '#FAFAFA',
                    marginBottom: '0.75rem',
                    borderRadius: '0 4px 4px 0',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: severityColor(d.severity), textTransform: 'uppercase', letterSpacing: '0.1em' }}>{d.severity}</span>
                      <span style={{ fontSize: '12px', color: '#555', fontWeight: 600 }}>{d.defect_type}</span>
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#111', margin: '0 0 0.4rem 0' }}>{d.location}</p>
                    <p style={{ fontSize: '13px', color: '#444', margin: '0 0 0.4rem 0' }}>{d.description}</p>
                    {d.code_reference && (
                      <p style={{ fontSize: '12px', color: '#666', margin: '0 0 0.4rem 0', fontStyle: 'italic' }}>{d.code_reference}</p>
                    )}
                    <p style={{ fontSize: '12px', color: '#555', margin: 0 }}>Remediation: {d.remediation}</p>
                  </div>
                ))}
                {report.estimated_repair_cost && (
                  <div style={{ padding: '1rem 1.5rem', background: '#F5F5F5', borderRadius: '4px', marginTop: '0.5rem', fontSize: '13px', color: '#444' }}>
                    Est. Repair: {report.estimated_repair_cost} · {report.estimated_repair_time}
                  </div>
                )}
              </div>
            ) : (
              <div className="ce-empty-state">
                <span className="ce-empty-title">{report ? `Condition: ${report.overall_condition}` : 'No Defects Logged'}</span>
                <span className="ce-empty-sub">{report ? `"${report.image_filename}" — ${report.total_defects} defect(s) detected.` : 'Upload site footage to generate defect masks & structural reports.'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="ce-workspace-middle">
          <h2 className="ce-section-title" style={{ textAlign: 'center' }}>2. Upload Site Inspection Photo</h2>
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            style={{ display: 'none' }}
            onChange={handleUpload}
          />
          <div
            className="ce-dropzone"
            onClick={() => !isLoading && fileInputRef.current?.click()}
            style={{ cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1 }}
          >
            {isLoading ? (
              <>
                <span className="ce-dropzone-text">Scanning site photo for defects...</span>
                <span className="ce-dropzone-sub">YOLOv11-seg + Gemini VLM are processing your image. This may take 15–30 seconds.</span>
              </>
            ) : error ? (
              <>
                <span className="ce-dropzone-text" style={{ color: '#D32F2F' }}>Analysis Failed</span>
                <span className="ce-dropzone-sub" style={{ color: '#D32F2F' }}>{error}</span>
                <span className="ce-dropzone-sub">Click to try again</span>
              </>
            ) : report ? (
              <>
                <span className="ce-dropzone-text" style={{ color: '#2E7D32' }}>✓ Scan Complete — {report.image_filename}</span>
                <span className="ce-dropzone-sub">{report.total_defects} defect{report.total_defects !== 1 ? 's' : ''} found · Condition: {report.overall_condition}</span>
                <span className="ce-dropzone-sub">Click to scan another photo</span>
              </>
            ) : (
              <>
                <span className="ce-dropzone-text">Drop site photograph here or click to upload</span>
                <span className="ce-dropzone-sub">Supports PNG, JPG, WEBP (columns, slabs, reinforcement, formwork)</span>
              </>
            )}
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
                    <div className="ce-stat-minimal-value">
                      Score: {report ? (report.overall_condition === 'Fair' ? '70' : report.overall_condition === 'Poor' ? '40' : report.overall_condition === 'Critical' ? '15' : '100') : '100'} ({report ? report.overall_condition : 'Pass'})
                    </div>
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
                    <div className="ce-stat-minimal-value">
                      Detected: {report ? report.total_defects : 0}
                      {report && report.critical_count > 0 && (
                        <span style={{ color: '#D32F2F', marginLeft: '0.5rem' }}>({report.critical_count} Critical)</span>
                      )}
                    </div>
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
        <img src={closingPhoto} alt="Vision Engine Closing" />
      </section>

      {/* Story block */}
      <section className="ce-story-section" style={{ background: '#FAFAFA', padding: '8rem 4rem', display: 'flex', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#666', margin: '0 0 1.5rem 0' }}>02 — VISION ENGINE</span>
          <h3 style={{ fontSize: '2.2rem', fontWeight: 600, lineHeight: 1.3, color: '#111', letterSpacing: '-0.02em', margin: '0 0 2.5rem 0' }}>
            Computer vision scans job site imagery in real time, flagging structural defects human inspectors miss.
          </h3>
          <Link to="/how-it-works" className="nav-cta cta-large">See How It Works</Link>
        </div>
      </section>
    </div>
  );
}
