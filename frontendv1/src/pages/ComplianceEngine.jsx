import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import TextPressure from '../components/TextPressure';
import ceHeroVideo from '../../Assets/8471078-hd_1920_1080_25fps.mp4';
import closingPhoto from '../../Assets/pexels-thirdman-8482551.jpg';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './ComplianceEngine.css';
import { useWarmVideo } from '../hooks/useWarmVideo';
import AnalysisProgress from '../components/AnalysisProgress';

const ANALYSIS_STEPS = [
  'Reading blueprint geometry',
  'Extracting measurements via Gemini Vision',
  'Retrieving relevant code clauses',
  'Cross-checking against NBC & IS 456',
  'Compiling violation report',
];

const na = (v) => (v === null || v === undefined || v === '' ? 'Not specified' : v);

gsap.registerPlugin(useGSAP, ScrollTrigger);

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export default function ComplianceEngine() {
  const [openStat, setOpenStat] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [selectedCodes, setSelectedCodes] = useState([
    'NBC 2016 Part IV',
    'IS 456:2000',
  ]);

  const toggleCode = (code) => {
    setSelectedCodes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };
  const containerRef  = useRef();
  const heroRef        = useRef();
  const videoRef       = useRef();
  const videoWrapRef   = useRef();
  const fileInputRef   = useRef();

  /* Claim the pre-warmed video from the pool — runs before GSAP */
  useWarmVideo(ceHeroVideo, videoRef, videoWrapRef, 'ce-hero-video');

  const toggleStat = (i) => setOpenStat(prev => (prev === i ? null : i));

  const statDetails = [
    "Aggregates results across all three verification layers  -  design compliance, on-site inspection, and predictive risk modeling  -  into a single pass/fail signal for the project.",
    "Cross-checks the uploaded blueprint against your selected building codes, catching code violations before construction begins.",
    "Computer vision compares live site imagery against the approved plan as work progresses, flagging structural deviations as they happen.",
    "Runs 10,000 Monte Carlo simulations against historical build data to estimate the likelihood of hitting your project deadline."
  ];

  const handleUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('blueprint', file);
      formData.append('codes', selectedCodes.join(','));

      const response = await fetch(`${API_BASE}/api/v1/compliance/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message === 'Failed to fetch'
        ? 'Cannot reach backend. Start the server with: uvicorn backend.main:app --reload'
        : err.message || 'Failed to analyze blueprint.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCodes]); // ✅ Fixed: was [] — now includes selectedCodes so toggles take effect

  // ── PDF Download ──────────────────────────────────────────────────
  const [isDownloading, setIsDownloading] = useState(false);
  const handleDownloadPDF = useCallback(async () => {
    setIsDownloading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/compliance/report/pdf`);
      if (!res.ok) throw new Error('No report available. Run an analysis first.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'compliance_report.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDownloading(false);
    }
  }, []);

  // ── Code Library Manager ───────────────────────────────────────────
  const [codeLibOpen, setCodeLibOpen] = useState(false);
  const [codeList, setCodeList] = useState([]);
  const [codeLibStatus, setCodeLibStatus] = useState(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const codeUploadRef = useRef();

  const fetchCodeList = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/compliance/codes/list`);
      const data = await res.json();
      setCodeList(data.codes || []);
    } catch {
      setCodeList([]);
    }
  }, []);

  useEffect(() => {
    if (codeLibOpen) fetchCodeList();
  }, [codeLibOpen, fetchCodeList]);

  const handleCodeUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCodeLibStatus('Uploading...');
    try {
      const fd = new FormData();
      fd.append('pdf', file);
      const res = await fetch(`${API_BASE}/api/v1/compliance/codes/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      setCodeLibStatus(`✓ Uploaded "${data.filename}" — ${data.chunks_ingested} chunks ingested`);
      fetchCodeList();
    } catch {
      setCodeLibStatus('✗ Upload failed');
    }
  }, [fetchCodeList]);

  const handleIngestAll = useCallback(async () => {
    setIsIngesting(true);
    setCodeLibStatus('Ingesting all PDFs from server directory...');
    try {
      const res = await fetch(`${API_BASE}/api/v1/compliance/codes/ingest`, { method: 'POST' });
      const data = await res.json();
      setCodeLibStatus(`✓ Ingested ${data.total_chunks} chunks across ${data.doc_count} documents`);
      fetchCodeList();
    } catch {
      setCodeLibStatus('✗ Ingest failed');
    } finally {
      setIsIngesting(false);
    }
  }, [fetchCodeList]);

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
        {/* Pre-warmed video injected here by useWarmVideo hook */}
        <div ref={videoWrapRef} />
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
              <button
                className={`ce-code-btn ${selectedCodes.includes('NBC 2016 Part IV') ? 'ce-code-btn-active' : ''}`}
                onClick={() => toggleCode('NBC 2016 Part IV')}
              >
                NBC 2016 Part IV (Fire & Life Safety)
              </button>
              <button
                className={`ce-code-btn ${selectedCodes.includes('IS 456:2000') ? 'ce-code-btn-active' : ''}`}
                onClick={() => toggleCode('IS 456:2000')}
              >
                IS 456:2000 (Reinforced Concrete)
              </button>
            </div>
          </div>

          <div className="ce-workspace-right">
            <h2 className="ce-section-title">Identified Violations</h2>
            {result && result.violations && result.violations.length > 0 ? (
              <div className="ce-violations-list">
                {result.violations.map((v, i) => (
                  <div key={v.id || i} className="ce-violation-card">
                    <div className="ce-violation-header">
                      <span className="ce-violation-severity" style={{ color: severityColor(v.severity) }}>{v.severity}</span>
                      <span className="ce-violation-id">{v.id}</span>
                    </div>
                    <p className="ce-violation-location">{na(v.exact_location)}</p>
                    <p className="ce-violation-meta">
                      Measured: <strong>{na(v.measured_value)}</strong> &middot; Required: <strong>{na(v.required_value)}</strong>
                    </p>
                    {v.code_reference && <p className="ce-violation-code">{v.code_reference}</p>}
                    <p className="ce-violation-fix">Fix: {na(v.fix_suggestion)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ce-empty-state">
                <span className="ce-empty-title">{result ? 'No Violations Found  -  All Clear' : 'No Violations Detected Yet'}</span>
                <span className="ce-empty-sub">{result ? `Blueprint "${result.blueprint_filename}" passed compliance checks.` : 'Upload an architectural layout to start compliance verification.'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="ce-workspace-middle">
          <h2 className="ce-section-title" style={{ textAlign: 'center' }}>2. Upload Floor Plan / Blueprint</h2>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            style={{ display: 'none' }}
            onChange={handleUpload}
          />
          {result && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <button
                className="nav-cta cta-large"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isDownloading ? 0.7 : 1 }}
                onClick={handleDownloadPDF}
                disabled={isDownloading}
              >
                {isDownloading ? 'Downloading...' : '↓ Download PDF Report'}
              </button>
            </div>
          )}
          <div
            className="ce-dropzone"
            onClick={() => !isLoading && fileInputRef.current?.click()}
            style={{ cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1 }}
          >
            {isLoading ? (
              <>
                <span className="ce-dropzone-text">Analyzing blueprint</span>
                <AnalysisProgress steps={ANALYSIS_STEPS} active={isLoading} />
              </>
            ) : error ? (
              <>
                <span className="ce-dropzone-text" style={{ color: '#D32F2F' }}>Analysis Failed</span>
                <span className="ce-dropzone-sub" style={{ color: '#D32F2F' }}>{error}</span>
                <span className="ce-dropzone-sub">Click to try again</span>
              </>
            ) : result ? (
              <>
                <span className="ce-dropzone-text" style={{ color: '#2E7D32' }}>✓ Analysis Complete  -  {result.blueprint_filename}</span>
                <span className="ce-dropzone-sub">{result.total_violations} violation{result.total_violations !== 1 ? 's' : ''} found · Score: {result.compliance_score}/100</span>
                <span className="ce-dropzone-sub">Click to analyze another blueprint</span>
              </>
            ) : (
              <>
                <span className="ce-dropzone-text">Drop blueprint here or click to upload</span>
                <span className="ce-dropzone-sub">Supports PDF, PNG, JPG (architectural layouts, floor plans)</span>
              </>
            )}
          </div>
        </div>
        {/* Code Library Manager */}
        <div style={{ marginTop: '3rem', borderTop: '1px solid #EAEAEA', paddingTop: '2rem' }}>
          <button
            onClick={() => setCodeLibOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: 'none', border: '1px solid #D0D0D0',
              padding: '0.75rem 1.5rem', cursor: 'pointer', fontSize: '13px',
              fontWeight: 500, color: '#444', letterSpacing: '0.05em', textTransform: 'uppercase',
              width: '100%', justifyContent: 'space-between', fontFamily: "'Inter', sans-serif",
            }}
          >
            <span>Advanced: Building Code Library Manager</span>
            <span style={{ fontSize: '11px', color: '#999' }}>{codeLibOpen ? '▲ Collapse' : '▼ Expand'}</span>
          </button>

          {codeLibOpen && (
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Current codes list */}
              <div>
                <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999', marginBottom: '0.75rem', fontFamily: "'Inter', sans-serif" }}>Ingested Codes</h3>
                {codeList.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#999', fontFamily: "'Inter', sans-serif" }}>No codes found in library. Upload a PDF or trigger ingest.</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {codeList.map((c, i) => (
                      <span key={i} style={{ fontSize: '12px', padding: '4px 10px', border: '1px solid #D0D0D0', color: '#333', fontFamily: "'Inter', sans-serif" }}>
                        {c.name} <span style={{ color: '#999' }}>({c.size_mb} MB)</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <input ref={codeUploadRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleCodeUpload} />
                <button
                  className="nav-cta"
                  style={{ fontSize: '13px', padding: '0.6rem 1.2rem' }}
                  onClick={() => codeUploadRef.current?.click()}
                >
                  + Upload Building Code PDF
                </button>
                <button
                  className="nav-cta"
                  style={{ fontSize: '13px', padding: '0.6rem 1.2rem', opacity: isIngesting ? 0.7 : 1 }}
                  onClick={handleIngestAll}
                  disabled={isIngesting}
                >
                  {isIngesting ? 'Ingesting...' : '↻ Ingest All Server PDFs'}
                </button>
              </div>

              {codeLibStatus && (
                <p style={{ fontSize: '13px', color: '#555', margin: 0, fontFamily: "'Inter', sans-serif" }}>
                  {codeLibStatus}
                </p>
              )}
            </div>
          )}
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
                    <div className="ce-stat-minimal-value">
                      Score: {result ? `${result.compliance_score} (${result.compliance_score >= 80 ? 'Pass' : 'Fail'})` : '100 (Pass)'}
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
                    <div className="ce-stat-minimal-value">
                      Detected: {result ? result.total_violations : 0}
                      {result && result.critical_count > 0 && (
                        <span style={{ color: '#D32F2F', marginLeft: '0.5rem' }}>({result.critical_count} Critical)</span>
                      )}
                    </div>
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
          <span style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#666', margin: '0 0 1.5rem 0' }}>01  -  COMPLIANCE ENGINE</span>
          <h3 style={{ fontSize: '2.2rem', fontWeight: 600, lineHeight: 1.3, color: '#111', letterSpacing: '-0.02em', margin: '0 0 2.5rem 0' }}>
            Automatically checks site plans against building codes and safety regulations  -  catching violations before inspectors do.
          </h3>
          <Link to="/how-it-works" className="nav-cta cta-large">See How It Works</Link>
        </div>
      </section>
    </div>
  );
}
