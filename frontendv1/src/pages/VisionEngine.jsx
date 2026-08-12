import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import TextPressure from '../components/TextPressure';
import veHeroVideo from '../../Assets/13177813_1920_1080_60fps.mp4';
import closingPhoto from '../../Assets/pexels-danielellis-11701517.jpg';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './ComplianceEngine.css'; // Reusing exact same styles
import { useWarmVideo } from '../hooks/useWarmVideo';
import AnalysisProgress from '../components/AnalysisProgress';

const DEFECT_STEPS = [
  'Reading site photograph',
  'Scanning for structural defects via Gemini Vision',
  'Grading severity and confidence',
  'Cross-referencing IS 456 clauses',
  'Compiling defect report',
];

const PPE_STEPS = [
  'Detecting workers in frame',
  'Running SH17-guided PPE classification',
  'Checking helmet, vest, harness compliance',
  'Flagging non-compliant workers',
  'Compiling safety audit report',
];

const BD3_STEPS = [
  'Reading surface photograph',
  'Running BD3 taxonomy classification',
  'Scoring 7 defect classes',
  'Mapping to IS 456 / NBC code references',
  'Compiling classification report',
];

const SCAN2BIM_STEPS = [
  'Parsing as-built element list',
  'Parsing as-designed blueprint data',
  'Computing dimensional deviations',
  'Checking IS 456 / NBC tolerances',
  'Generating comparison report',
];

const na = (v) => (v === null || v === undefined || v === '' ? 'Not specified' : v);

gsap.registerPlugin(useGSAP, ScrollTrigger);

const API_BASE = 'https://kaya-hackathon-safesite-ai.onrender.com';

const TABS = [
  { id: 'defect', label: 'Structural Defects' },
  { id: 'ppe', label: 'PPE Safety Audit' },
  { id: 'bd3', label: 'BD3 Classification' },
  { id: 'scan2bim', label: 'Scan-to-BIM' },
];

// Prefilled example data for Scan2BIM demo
const SCAN2BIM_EXAMPLE = {
  asBuilt: JSON.stringify([
    { "element_id": "COL-A1", "element_type": "column", "width_mm": 312, "height_mm": 3050, "location": "Grid A1" },
    { "element_id": "BEAM-B2", "element_type": "beam", "width_mm": 248, "depth_mm": 455, "location": "Grid B2" }
  ], null, 2),
  asDesigned: JSON.stringify([
    { "element_id": "COL-A1", "element_type": "column", "width_mm": 300, "height_mm": 3000, "location": "Grid A1" },
    { "element_id": "BEAM-B2", "element_type": "beam", "width_mm": 250, "depth_mm": 450, "location": "Grid B2" }
  ], null, 2),
};

export default function VisionEngine() {
  const [activeTab, setActiveTab] = useState('defect');
  const [openStat, setOpenStat] = useState(null);

  // ── Defect state ──────────────────────────────────────────────────
  const [isDefectLoading, setIsDefectLoading] = useState(false);
  const [defectError, setDefectError] = useState(null);
  const [defectReport, setDefectReport] = useState(null);
  const fileInputRef = useRef();

  // ── PPE state ─────────────────────────────────────────────────────
  const [isPPELoading, setIsPPELoading] = useState(false);
  const [ppeError, setPPEError] = useState(null);
  const [ppeReport, setPPEReport] = useState(null);
  const ppeInputRef = useRef();

  // ── BD3 state ─────────────────────────────────────────────────────
  const [isBD3Loading, setIsBD3Loading] = useState(false);
  const [bd3Error, setBD3Error] = useState(null);
  const [bd3Report, setBD3Report] = useState(null);
  const bd3InputRef = useRef();

  // ── Scan2BIM state ────────────────────────────────────────────────
  const [isScan2BIMLoading, setIsScan2BIMLoading] = useState(false);
  const [scan2BIMError, setScan2BIMError] = useState(null);
  const [scan2BIMReport, setScan2BIMReport] = useState(null);
  const [asBuiltJSON, setAsBuiltJSON] = useState('');
  const [asDesignedJSON, setAsDesignedJSON] = useState('');

  // ── PDF download ──────────────────────────────────────────────────
  const [isDownloading, setIsDownloading] = useState(false);

  const containerRef = useRef();
  const heroRef = useRef();
  const videoRef = useRef();
  const videoWrapRef = useRef();

  useWarmVideo(veHeroVideo, videoRef, videoWrapRef, 'ce-hero-video');

  const toggleStat = (i) => setOpenStat(prev => (prev === i ? null : i));

  const statDetails = [
    "Aggregates results across all three verification layers — design compliance, on-site inspection, and predictive risk modeling — into a single pass/fail signal for the project.",
    "Cross-checks the uploaded blueprint against your selected building codes, catching code violations before construction begins.",
    "Computer vision compares live site imagery against the approved plan as work progresses, flagging structural deviations as they happen.",
    "Runs 10,000 Monte Carlo simulations against historical build data to estimate the likelihood of hitting your project deadline."
  ];

  // ── Defect analysis ───────────────────────────────────────────────
  const handleDefectUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsDefectLoading(true);
    setDefectError(null);
    setDefectReport(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch(`${API_BASE}/api/v1/vision/defect/analyze`, { method: 'POST', body: formData });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }
      setDefectReport(await response.json());
    } catch (err) {
      setDefectError(err.message || 'Failed to analyze image. Is the backend running?');
    } finally {
      setIsDefectLoading(false);
    }
  }, []);

  // ── PPE analysis ──────────────────────────────────────────────────
  const handlePPEUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsPPELoading(true);
    setPPEError(null);
    setPPEReport(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch(`${API_BASE}/api/v1/vision/ppe/analyze`, { method: 'POST', body: formData });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }
      setPPEReport(await response.json());
    } catch (err) {
      setPPEError(err.message || 'Failed to analyze PPE. Is the backend running?');
    } finally {
      setIsPPELoading(false);
    }
  }, []);

  // ── BD3 analysis ──────────────────────────────────────────────────
  const handleBD3Upload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsBD3Loading(true);
    setBD3Error(null);
    setBD3Report(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch(`${API_BASE}/api/v1/vision/bd3/analyze`, { method: 'POST', body: formData });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }
      setBD3Report(await response.json());
    } catch (err) {
      setBD3Error(err.message || 'Failed to classify defects. Is the backend running?');
    } finally {
      setIsBD3Loading(false);
    }
  }, []);

  // ── Scan2BIM comparison ───────────────────────────────────────────
  const handleScan2BIMCompare = useCallback(async () => {
    setScan2BIMReport(null);
    setScan2BIMError(null);
    if (!asBuiltJSON.trim() || !asDesignedJSON.trim()) {
      setScan2BIMError('Both JSON fields are required. Use the "Load Example" button to prefill.');
      return;
    }
    setIsScan2BIMLoading(true);
    try {
      const formData = new FormData();
      formData.append('as_built_elements', asBuiltJSON);
      formData.append('as_designed_elements', asDesignedJSON);
      const response = await fetch(`${API_BASE}/api/v1/vision/scan2bim/compare`, { method: 'POST', body: formData });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }
      setScan2BIMReport(await response.json());
    } catch (err) {
      setScan2BIMError(err.message || 'Scan-to-BIM comparison failed.');
    } finally {
      setIsScan2BIMLoading(false);
    }
  }, [asBuiltJSON, asDesignedJSON]);

  // ── PDF Download ──────────────────────────────────────────────────
  const handleDownloadPDF = useCallback(async () => {
    setIsDownloading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/vision/report/pdf`);
      if (!res.ok) throw new Error('No report available. Run an analysis first.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'defect_report.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDefectError(err.message);
    } finally {
      setIsDownloading(false);
    }
  }, []);

  const severityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return '#111';
      case 'HIGH': return '#555';
      case 'MEDIUM': return '#888';
      default: return '#999';
    }
  };

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: heroRef.current,
        start: "top top",
        end: "+=100%",
        pin: true,
        scrub: true,
      }
    });
    tl.to(videoRef.current, { scale: 1.15, ease: "power2.in" }, 0);
    tl.to('.ce-hero-content', { opacity: 0, ease: "power2.in" }, 0);

    const workspaceSections = ['.ce-workspace-left', '.ce-workspace-right', '.ce-workspace-middle'];
    workspaceSections.forEach((selector) => {
      gsap.fromTo(selector,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, ease: "power2.out",
          scrollTrigger: { trigger: selector, start: "top 85%", end: "top 60%", scrub: true }
        }
      );
    });

    gsap.fromTo('.ce-stats-left',
      { opacity: 0, x: -40 },
      {
        opacity: 1, x: 0, ease: "power2.out",
        scrollTrigger: { trigger: '.ce-stats-container', start: "top 85%", end: "top 60%", scrub: true }
      }
    );

    gsap.fromTo('.ce-stat-row',
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0, stagger: 0.15, duration: 0.8, ease: "power2.out",
        scrollTrigger: { trigger: '.ce-stats-list', start: "top 90%", toggleActions: "play none none none" }
      }
    );
  }, { scope: containerRef });

  // ── Tab panel renderers ───────────────────────────────────────────

  const renderDefectTab = () => (
    <>
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
          {defectReport && defectReport.defects && defectReport.defects.length > 0 ? (
            <div className="ce-violations-list">
              {defectReport.defects.map((d, i) => (
                <div key={d.id || i} className="ce-violation-card">
                  <div className="ce-violation-header">
                    <span className="ce-violation-severity" style={{ color: severityColor(d.severity) }}>{d.severity}</span>
                    <span className="ce-violation-id">{d.defect_type}</span>
                  </div>
                  <p className="ce-violation-location">{na(d.location)}</p>
                  <p className="ce-violation-meta">{na(d.description)}</p>
                  {d.code_reference && <p className="ce-violation-code">{d.code_reference}</p>}
                  <p className="ce-violation-fix">Remediation: {na(d.remediation)}</p>
                </div>
              ))}
              {defectReport.estimated_repair_cost && (
                <div className="ce-violation-summary-bar">
                  Est. Repair: {defectReport.estimated_repair_cost} &middot; {defectReport.estimated_repair_time}
                </div>
              )}
            </div>
          ) : (
            <div className="ce-empty-state">
              <span className="ce-empty-title">{defectReport ? `Condition: ${defectReport.overall_condition}` : 'No Defects Logged'}</span>
              <span className="ce-empty-sub">{defectReport ? `"${defectReport.image_filename}" - ${defectReport.total_defects} defect(s) detected.` : 'Upload site footage to generate defect masks & structural reports.'}</span>
            </div>
          )}
        </div>
      </div>
      <div className="ce-workspace-middle">
        <h2 className="ce-section-title" style={{ textAlign: 'center' }}>2. Upload Site Inspection Photo</h2>
        <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.webp" style={{ display: 'none' }} onChange={handleDefectUpload} />
        {defectReport && (
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
          onClick={() => !isDefectLoading && fileInputRef.current?.click()}
          style={{ cursor: isDefectLoading ? 'not-allowed' : 'pointer', opacity: isDefectLoading ? 0.6 : 1 }}
        >
          {isDefectLoading ? (
            <>
              <span className="ce-dropzone-text">Scanning site photo for defects</span>
              <AnalysisProgress steps={DEFECT_STEPS} active={isDefectLoading} />
            </>
          ) : defectError ? (
            <>
              <span className="ce-dropzone-text" style={{ color: '#D32F2F' }}>Analysis Failed</span>
              <span className="ce-dropzone-sub" style={{ color: '#D32F2F' }}>{defectError}</span>
              <span className="ce-dropzone-sub">Click to try again</span>
            </>
          ) : defectReport ? (
            <>
              <span className="ce-dropzone-text" style={{ color: '#2E7D32' }}>✓ Scan Complete — {defectReport.image_filename}</span>
              <span className="ce-dropzone-sub">{defectReport.total_defects} defect{defectReport.total_defects !== 1 ? 's' : ''} found · Condition: {defectReport.overall_condition}</span>
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
    </>
  );

  const renderPPETab = () => (
    <>
      <div className="ce-workspace-top">
        <div className="ce-workspace-left">
          <h2 className="ce-section-title">1. Safety Standard</h2>
          <div className="ce-code-toggles">
            <button className="ce-code-btn ce-code-btn-active">SH17 Dataset (17 PPE Classes)</button>
            <button className="ce-code-btn ce-code-btn-active">IS 3764 / NBC Part 7</button>
          </div>
          {ppeReport && (
            <div style={{ marginTop: '1.5rem', padding: '1.25rem 0', borderTop: '1px solid #EAEAEA' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#999', marginBottom: '0.4rem', fontFamily: "'Inter', sans-serif" }}>Site Safety Score</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 200, color: '#111', lineHeight: 1, letterSpacing: '-0.02em', fontFamily: "'Inter', sans-serif" }}>
                {ppeReport.site_safety_score.toFixed(0)}
              </div>
              <div style={{ fontSize: '11px', color: '#BBB', marginTop: '0.4rem', fontFamily: "'Inter', sans-serif" }}>
                /100 — {ppeReport.total_workers} worker{ppeReport.total_workers !== 1 ? 's' : ''} detected
              </div>
            </div>
          )}
        </div>
        <div className="ce-workspace-right">
          <h2 className="ce-section-title">PPE Compliance Results</h2>
          {ppeReport && ppeReport.workers && ppeReport.workers.length > 0 ? (
            <div className="ce-violations-list">
              {ppeReport.workers.map((w, i) => (
                <div key={i} className="ce-violation-card">
                  <div className="ce-violation-header">
                    <span className="ce-violation-severity">{w.compliance_status}</span>
                    <span className="ce-violation-id">{w.worker_id}</span>
                  </div>
                  {w.ppe_present.length > 0 && (
                    <p className="ce-violation-location">Present: {w.ppe_present.join(', ')}</p>
                  )}
                  {w.ppe_missing.length > 0 && (
                    <p className="ce-violation-meta">Missing: {w.ppe_missing.join(', ')}</p>
                  )}
                  {w.location && <p className="ce-violation-fix">Location: {w.location}</p>}
                </div>
              ))}
              {ppeReport.site_level_violations && ppeReport.site_level_violations.length > 0 && (
                <div className="ce-violation-summary-bar">
                  {ppeReport.site_level_violations.length} site-level violation{ppeReport.site_level_violations.length !== 1 ? 's' : ''} detected
                </div>
              )}
            </div>
          ) : (
            <div className="ce-empty-state">
              <span className="ce-empty-title">{ppeReport ? 'All Workers Compliant' : 'No PPE Audit Run Yet'}</span>
              <span className="ce-empty-sub">{ppeReport ? `${ppeReport.total_workers} worker(s) scanned — no violations found.` : 'Upload a site photo with workers to run the PPE safety audit.'}</span>
            </div>
          )}
        </div>
      </div>
      <div className="ce-workspace-middle">
        <h2 className="ce-section-title" style={{ textAlign: 'center' }}>2. Upload Site Photo (Workers Visible)</h2>
        <input ref={ppeInputRef} type="file" accept=".png,.jpg,.jpeg,.webp" style={{ display: 'none' }} onChange={handlePPEUpload} />
        <div
          className="ce-dropzone"
          onClick={() => !isPPELoading && ppeInputRef.current?.click()}
          style={{ cursor: isPPELoading ? 'not-allowed' : 'pointer', opacity: isPPELoading ? 0.6 : 1 }}
        >
          {isPPELoading ? (
            <>
              <span className="ce-dropzone-text">Running SH17 PPE safety audit</span>
              <AnalysisProgress steps={PPE_STEPS} active={isPPELoading} />
            </>
          ) : ppeError ? (
            <>
              <span className="ce-dropzone-text">Audit Failed</span>
              <span className="ce-dropzone-sub">{ppeError}</span>
              <span className="ce-dropzone-sub">Click to try again</span>
            </>
          ) : ppeReport ? (
            <>
              <span className="ce-dropzone-text">PPE Audit Complete — Score: {ppeReport.site_safety_score.toFixed(0)}/100</span>
              <span className="ce-dropzone-sub">{ppeReport.total_workers} workers · Model: {ppeReport.detection_model}</span>
              <span className="ce-dropzone-sub">Click to audit another photo</span>
            </>
          ) : (
            <>
              <span className="ce-dropzone-text">Drop site photo here or click to upload</span>
              <span className="ce-dropzone-sub">Best results with photos showing workers clearly (SH17: helmets, vests, harnesses, gloves...)</span>
            </>
          )}
        </div>
      </div>
    </>
  );

  const renderBD3Tab = () => (
    <>
      <div className="ce-workspace-top">
        <div className="ce-workspace-left">
          <h2 className="ce-section-title">1. BD3 Taxonomy</h2>
          <div className="ce-code-toggles">
            <button className="ce-code-btn ce-code-btn-active">7-Class BD3 Dataset</button>
            <button className="ce-code-btn ce-code-btn-active">ACM BuildSys '24</button>
          </div>
          {bd3Report && (
            <div style={{ marginTop: '1.5rem', padding: '1.25rem 0', borderTop: '1px solid #EAEAEA' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#999', marginBottom: '0.4rem', fontFamily: "'Inter', sans-serif" }}>Primary Class</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 200, color: '#111', lineHeight: 1, letterSpacing: '-0.02em', fontFamily: "'Inter', sans-serif", textTransform: 'capitalize' }}>
                {bd3Report.primary_classification}
              </div>
              <div style={{ fontSize: '11px', color: '#BBB', marginTop: '0.4rem', fontFamily: "'Inter', sans-serif" }}>
                {(bd3Report.confidence * 100).toFixed(1)}% confidence · Surface: {bd3Report.surface_condition_score.toFixed(0)}/100
                {bd3Report.requires_immediate_action ? ' · Immediate action required' : ''}
              </div>
            </div>
          )}
        </div>
        <div className="ce-workspace-right">
          <h2 className="ce-section-title">BD3 Classification Results</h2>
          {bd3Report && bd3Report.all_defects_found && bd3Report.all_defects_found.length > 0 ? (
            <div className="ce-violations-list">
              {bd3Report.all_defects_found.map((d, i) => (
                <div key={i} className="ce-violation-card">
                  <div className="ce-violation-header">
                    <span className="ce-violation-severity">{d.severity}</span>
                    <span className="ce-violation-id" style={{ textTransform: 'capitalize' }}>{d.defect_class}</span>
                  </div>
                  <p className="ce-violation-location">Confidence: {(d.confidence * 100).toFixed(1)}%{d.affected_area_percent ? ` · Area: ${d.affected_area_percent.toFixed(1)}%` : ''}</p>
                  {d.description && <p className="ce-violation-meta">{d.description}</p>}
                  {d.code_reference && <p className="ce-violation-code">{d.code_reference}</p>}
                  {d.remediation && <p className="ce-violation-fix">Remediation: {d.remediation}</p>}
                </div>
              ))}
              <div className="ce-violation-summary-bar">
                Dataset: {bd3Report.dataset_source}
              </div>
            </div>
          ) : (
            <div className="ce-empty-state">
              <span className="ce-empty-title">{bd3Report ? `Surface: ${bd3Report.primary_classification}` : 'No Classification Run Yet'}</span>
              <span className="ce-empty-sub">{bd3Report ? 'No significant defect classes detected above threshold.' : 'Upload a surface photo to classify building defects using the BD3 taxonomy.'}</span>
            </div>
          )}
        </div>
      </div>
      <div className="ce-workspace-middle">
        <h2 className="ce-section-title" style={{ textAlign: 'center' }}>2. Upload Surface Photo</h2>
        <input ref={bd3InputRef} type="file" accept=".png,.jpg,.jpeg,.webp" style={{ display: 'none' }} onChange={handleBD3Upload} />
        <div
          className="ce-dropzone"
          onClick={() => !isBD3Loading && bd3InputRef.current?.click()}
          style={{ cursor: isBD3Loading ? 'not-allowed' : 'pointer', opacity: isBD3Loading ? 0.6 : 1 }}
        >
          {isBD3Loading ? (
            <>
              <span className="ce-dropzone-text">Classifying surface defects via BD3</span>
              <AnalysisProgress steps={BD3_STEPS} active={isBD3Loading} />
            </>
          ) : bd3Error ? (
            <>
              <span className="ce-dropzone-text">Classification Failed</span>
              <span className="ce-dropzone-sub">{bd3Error}</span>
              <span className="ce-dropzone-sub">Click to try again</span>
            </>
          ) : bd3Report ? (
            <>
              <span className="ce-dropzone-text">Classified: {bd3Report.primary_classification} ({(bd3Report.confidence * 100).toFixed(1)}%)</span>
              <span className="ce-dropzone-sub">Surface score: {bd3Report.surface_condition_score.toFixed(0)}/100 · {bd3Report.all_defects_found.length} class(es) detected</span>
              <span className="ce-dropzone-sub">Click to classify another photo</span>
            </>
          ) : (
            <>
              <span className="ce-dropzone-text">Drop surface photo here or click to upload</span>
              <span className="ce-dropzone-sub">BD3 classes: crack, spalling, rebar exposure, stain, efflorescence, delamination, normal</span>
            </>
          )}
        </div>
      </div>
    </>
  );

  const renderScan2BIMTab = () => (
    <>
      <div className="ce-workspace-top">
        <div className="ce-workspace-left">
          <h2 className="ce-section-title">1. Tolerance Standard</h2>
          <div className="ce-code-toggles">
            <button className="ce-code-btn ce-code-btn-active">IS 456:2000 §11</button>
            <button className="ce-code-btn ce-code-btn-active">NBC 2016 Tolerances</button>
          </div>
          <p style={{ fontSize: '13px', color: '#666', marginTop: '1rem', lineHeight: 1.6 }}>
            Compare as-built site measurements against as-designed blueprint specifications. Deviations beyond tolerance are flagged with severity ratings.
          </p>
          <button
            className="nav-cta"
            style={{ marginTop: '1rem', fontSize: '12px', padding: '0.5rem 1rem' }}
            onClick={() => { setAsBuiltJSON(SCAN2BIM_EXAMPLE.asBuilt); setAsDesignedJSON(SCAN2BIM_EXAMPLE.asDesigned); }}
          >
            Load Example Data
          </button>
        </div>
        <div className="ce-workspace-right">
          <h2 className="ce-section-title">Deviation Report</h2>
          {scan2BIMReport && scan2BIMReport.deviations && scan2BIMReport.deviations.length > 0 ? (
            <div className="ce-violations-list">
              {scan2BIMReport.deviations.map((d, i) => (
                <div key={i} className="ce-violation-card">
                  <div className="ce-violation-header">
                    <span className="ce-violation-severity" style={{ color: severityColor(d.severity) }}>{d.severity}</span>
                    <span className="ce-violation-id">{d.element_id}</span>
                  </div>
                  <p className="ce-violation-location">{d.element_type} — {d.measurement_type}</p>
                  <p className="ce-violation-meta">
                    Designed: <strong>{d.designed_value_mm}mm</strong> · As-Built: <strong>{d.measured_value_mm}mm</strong> · Deviation: <strong style={{ color: d.is_within_tolerance ? '#111' : '#111' }}>{d.deviation_mm > 0 ? '+' : ''}{d.deviation_mm}mm</strong>
                  </p>
                  {d.code_reference && <p className="ce-violation-code">{d.code_reference} (±{d.tolerance_mm}mm tolerance)</p>}
                  {d.recommendation && <p className="ce-violation-fix">{d.recommendation}</p>}
                </div>
              ))}
              <div className="ce-violation-summary-bar">
                {scan2BIMReport.deviations_found} deviation{scan2BIMReport.deviations_found !== 1 ? 's' : ''} · {scan2BIMReport.critical} critical · Standard: {scan2BIMReport.tolerance_standard}
              </div>
            </div>
          ) : (
            <div className="ce-empty-state">
              <span className="ce-empty-title">{scan2BIMReport ? 'No Tolerance Breaches Found ✓' : 'No Comparison Run Yet'}</span>
              <span className="ce-empty-sub">{scan2BIMReport ? 'All as-built elements are within design tolerances.' : 'Paste JSON element lists below, then click Compare.'}</span>
            </div>
          )}
        </div>
      </div>

      <div className="ce-workspace-middle">
        <h2 className="ce-section-title" style={{ textAlign: 'center' }}>2. Enter Element Measurements (JSON)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', width: '100%' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999', display: 'block', marginBottom: '0.5rem', fontFamily: "'Inter', sans-serif" }}>As-Built Elements (site scan)</label>
            <textarea
              value={asBuiltJSON}
              onChange={e => setAsBuiltJSON(e.target.value)}
              placeholder={'[\n  {"element_id":"COL-A1","element_type":"column","width_mm":312,...}\n]'}
              style={{
                width: '100%', minHeight: '180px', padding: '1rem', fontFamily: 'monospace',
                fontSize: '12px', border: '1px solid #D0D0D0',
                resize: 'vertical', background: '#FAFAFA', color: '#111', boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666', display: 'block', marginBottom: '0.5rem' }}>As-Designed Elements (blueprint)</label>
            <textarea
              value={asDesignedJSON}
              onChange={e => setAsDesignedJSON(e.target.value)}
              placeholder={'[\n  {"element_id":"COL-A1","element_type":"column","width_mm":300,...}\n]'}
              style={{
                width: '100%', minHeight: '180px', padding: '1rem', fontFamily: 'monospace',
                fontSize: '12px', border: '1px solid #EAEAEA', borderRadius: '6px',
                resize: 'vertical', background: '#FAFAFA', color: '#111', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {scan2BIMError && (
          <p style={{ color: '#111', fontSize: '13px', marginTop: '1rem', textAlign: 'center' }}>{scan2BIMError}</p>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
          <button
            className="nav-cta cta-large"
            onClick={handleScan2BIMCompare}
            disabled={isScan2BIMLoading}
            style={{ opacity: isScan2BIMLoading ? 0.7 : 1 }}
          >
            {isScan2BIMLoading ? (
              <><span>Comparing...</span><AnalysisProgress steps={SCAN2BIM_STEPS} active={isScan2BIMLoading} /></>
            ) : 'Run Scan-to-BIM Comparison'}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div ref={containerRef} className="ce-dashboard page-transition">

      <div ref={heroRef} className="ce-hero">
        <div ref={videoWrapRef} />
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
          <div className="bottom-left-info">
            <p>Active Construction Quality Control:<br />Detect structural defects, PPE violations & dimensional deviations.</p>
          </div>
        </div>
      </div>

      <section className="ce-workspace-section">
          {/* Tab Switcher — hairline bottom border, no rounded corners */}
          <div style={{
            display: 'flex', gap: '0', marginBottom: '2.5rem',
            borderBottom: '1px solid #EAEAEA', overflowX: 'auto',
          }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.9rem 1.5rem', background: 'none', border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid #111' : '2px solid transparent',
                  marginBottom: '-1px', cursor: 'pointer', fontSize: '13px',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  color: activeTab === tab.id ? '#111' : '#888',
                  letterSpacing: '0.02em', whiteSpace: 'nowrap',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

        {activeTab === 'defect' && renderDefectTab()}
        {activeTab === 'ppe' && renderPPETab()}
        {activeTab === 'bd3' && renderBD3Tab()}
        {activeTab === 'scan2bim' && renderScan2BIMTab()}
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
                      Score: {defectReport ? (defectReport.overall_condition === 'Fair' ? '70' : defectReport.overall_condition === 'Poor' ? '40' : defectReport.overall_condition === 'Critical' ? '15' : '100') : '100'} ({defectReport ? defectReport.overall_condition : 'Pass'})
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
                      Detected: {defectReport ? defectReport.total_defects : 0}
                      {defectReport && defectReport.critical_count > 0 && (
                        <span style={{ color: '#111', marginLeft: '0.5rem' }}>({defectReport.critical_count} Critical)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`ce-stat-row ${openStat === 3 ? 'is-open' : ''}`}>
                <div className="ce-stat-row-header" onClick={() => toggleStat(3)}>
                  <span className="ce-stat-title">PPE Compliance</span>
                  <span className="ce-stat-toggle">+</span>
                </div>
                <div className="ce-stat-expand">
                  <div className="ce-stat-expand-inner">
                    <p>{statDetails[3]}</p>
                    <div className="ce-stat-minimal-value">
                      {ppeReport ? `Score: ${ppeReport.site_safety_score.toFixed(0)}/100 (${ppeReport.total_workers} workers)` : 'Status: Not Audited'}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`ce-stat-row ${openStat === 4 ? 'is-open' : ''}`}>
                <div className="ce-stat-row-header" onClick={() => toggleStat(4)}>
                  <span className="ce-stat-title">BD3 Surface Score</span>
                  <span className="ce-stat-toggle">+</span>
                </div>
                <div className="ce-stat-expand">
                  <div className="ce-stat-expand-inner">
                    <p>Surface defect classification across 7 BD3 taxonomy classes (ACM BuildSys '24 dataset).</p>
                    <div className="ce-stat-minimal-value">
                      {bd3Report ? `${bd3Report.surface_condition_score.toFixed(0)}/100 — ${bd3Report.primary_classification}` : 'Status: Not Classified'}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Closing Photo Break */}
      <section className="ce-photo-break">
        <img src={closingPhoto} alt="Vision Engine Closing" loading="lazy" decoding="async" />
      </section>

      {/* Story block */}
      <section className="ce-story-section" style={{ background: '#FAFAFA', padding: '8rem 4rem', display: 'flex', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#666', margin: '0 0 1.5rem 0' }}>02  —  VISION ENGINE</span>
          <h3 style={{ fontSize: '2.2rem', fontWeight: 600, lineHeight: 1.3, color: '#111', letterSpacing: '-0.02em', margin: '0 0 2.5rem 0' }}>
            Computer vision scans job site imagery in real time, flagging structural defects, PPE violations, and dimensional deviations that human inspectors miss.
          </h3>
          <Link to="/how-it-works" className="nav-cta cta-large">See How It Works</Link>
        </div>
      </section>
    </div>
  );
}
