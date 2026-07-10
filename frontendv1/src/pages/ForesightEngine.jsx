import React, { useState, useRef, useCallback } from 'react';
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

const API_BASE = 'http://localhost:8000';

export default function ForesightEngine() {
  const [openStat, setOpenStat] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isForecasting, setIsForecasting] = useState(false);
  const [riskReport, setRiskReport] = useState(null);
  const [optimizeResult, setOptimizeResult] = useState(null);
  const [forecastResult, setForecastResult] = useState(null);
  const [error, setError] = useState(null);
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

  // ── Run Simulation ──
  const handleRunSimulation = useCallback(async () => {
    setIsSimulating(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('base_duration', '180');
      formData.append('base_cost', '5000000');

      const response = await fetch(`${API_BASE}/api/v1/foresight/risk`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }
      const data = await response.json();
      setRiskReport(data);
    } catch (err) {
      setError(err.message || 'Failed to run simulation.');
    } finally {
      setIsSimulating(false);
    }
  }, []);

  // ── Run Optimization ──
  const handleOptimize = useCallback(async () => {
    setIsOptimizing(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/v1/foresight/optimize`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }
      const data = await response.json();
      setOptimizeResult(data);
    } catch (err) {
      setError(err.message || 'Failed to run optimization.');
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  // ── Run Forecast ──
  const handleForecast = useCallback(async () => {
    setIsForecasting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('horizon_days', '90');
      formData.append('target', 'cement_cost_index');

      const response = await fetch(`${API_BASE}/api/v1/foresight/forecast`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }
      const data = await response.json();
      setForecastResult(data);
    } catch (err) {
      setError(err.message || 'Failed to run forecast.');
    } finally {
      setIsForecasting(false);
    }
  }, []);

  const scenarioColor = (scenario) => {
    if (scenario.includes('On-time')) return '#2E7D32';
    if (scenario.includes('Minor')) return '#E65100';
    return '#D32F2F';
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
            {riskReport && riskReport.risk_scenarios && riskReport.risk_scenarios.length > 0 ? (
              <div className="ce-violations-list">
                {riskReport.risk_scenarios.map((s, i) => (
                  <div key={i} style={{
                    padding: '1.2rem 1.5rem',
                    borderLeft: `3px solid ${scenarioColor(s.scenario)}`,
                    background: '#FAFAFA',
                    marginBottom: '0.75rem',
                    borderRadius: '0 4px 4px 0',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>{s.scenario}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: scenarioColor(s.scenario) }}>
                        {(s.probability * 100).toFixed(1)}%
                      </span>
                    </div>
                    {s.impact_days > 0 && (
                      <p style={{ fontSize: '13px', color: '#444', margin: '0 0 0.3rem 0' }}>
                        +{s.impact_days} days delay · +₹{(s.impact_cost / 100000).toFixed(1)}L cost overrun
                      </p>
                    )}
                    <p style={{ fontSize: '12px', color: '#666', margin: 0, fontStyle: 'italic' }}>Trigger: {s.trigger}</p>
                  </div>
                ))}
                <div style={{ padding: '0.8rem 1.5rem', background: '#F5F5F5', borderRadius: '4px', marginTop: '0.5rem', fontSize: '12px', color: '#666' }}>
                  Based on {riskReport.monte_carlo_iterations.toLocaleString()} Monte Carlo iterations
                </div>
              </div>
            ) : (
              <div className="ce-empty-state">
                <span className="ce-empty-title">No Forecasts Generated</span>
                <span className="ce-empty-sub">Click "Run Simulation" below to run predictive models.</span>
              </div>
            )}
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
                    <div className="ce-stat-minimal-value">
                      {riskReport ? `Predicted: ${(riskReport.on_time_probability * 100).toFixed(1)}%` : 'Predicted: Pending'}
                    </div>
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
                    <div className="ce-stat-minimal-value">
                      {riskReport ? `P80: ${riskReport.risk_scenarios?.[1]?.impact_days || 0} days overrun` : 'Score: Pending'}
                    </div>
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
                    <div className="ce-stat-minimal-value">
                      {optimizeResult ? `Savings: ${optimizeResult.savings_percent}%` : 'Predicted: ±0%'}
                    </div>
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
                    <div className="ce-stat-minimal-value">Risk: Coming Soon</div>
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
                    <div className="ce-stat-minimal-value">Risk: Coming Soon</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <section className="ce-workspace-section" style={{ paddingTop: 0 }}>
        <div style={{ height: '1px', background: '#EAEAEA', width: '100%', marginBottom: '4rem' }}></div>

        {/* Section 6 — Gantt from schedule_data */}
        <div className="ce-workspace-top">
          <div className="ce-workspace-left">
            <h2 className="ce-section-title">Probabilistic Project Schedule (Gantt)</h2>
          </div>
          <div className="ce-workspace-right">
            {riskReport && riskReport.schedule_data && riskReport.schedule_data.length > 0 ? (
              <div style={{ width: '100%' }}>
                {riskReport.schedule_data.map((phase, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '0.75rem 0', borderBottom: '1px solid #F0F0F0',
                    fontSize: '13px',
                  }}>
                    <span style={{ width: '140px', fontWeight: 600, color: '#111' }}>{phase.phase}</span>
                    <div style={{ flex: 1, position: 'relative', height: '24px', background: '#F5F5F5', borderRadius: '4px', overflow: 'hidden' }}>
                      {/* Planned bar */}
                      <div style={{
                        position: 'absolute', top: '2px', height: '8px', borderRadius: '4px',
                        background: '#C8C8C8',
                        left: `${(phase.planned_start / 220) * 100}%`,
                        width: `${((phase.planned_end - phase.planned_start) / 220) * 100}%`,
                      }} />
                      {/* Projected bar */}
                      <div style={{
                        position: 'absolute', top: '14px', height: '8px', borderRadius: '4px',
                        background: phase.risk_level === 'HIGH' ? '#D32F2F' : phase.risk_level === 'MEDIUM' ? '#E65100' : '#2E7D32',
                        left: `${(phase.projected_start / 220) * 100}%`,
                        width: `${((phase.projected_end - phase.projected_start) / 220) * 100}%`,
                      }} />
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '3px',
                      color: phase.risk_level === 'HIGH' ? '#D32F2F' : phase.risk_level === 'MEDIUM' ? '#E65100' : '#2E7D32',
                      background: phase.risk_level === 'HIGH' ? '#FFEBEE' : phase.risk_level === 'MEDIUM' ? '#FFF3E0' : '#E8F5E9',
                    }}>{phase.risk_level}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '11px', color: '#999' }}>
                  <span>■ Planned</span>
                  <span style={{ color: '#D32F2F' }}>■ Projected (risk-adjusted)</span>
                </div>
              </div>
            ) : (
              <div className="ce-dropzone" style={{ minHeight: '120px', padding: '3rem 2rem', gap: '1.5rem' }}>
                <span className="ce-dropzone-text">Click Run Simulation to model delay risks & duration shifts</span>
                <button
                  className="nav-cta cta-large"
                  style={{ width: 'fit-content' }}
                  onClick={handleRunSimulation}
                  disabled={isSimulating}
                >
                  {isSimulating ? 'Simulating...' : 'Run Simulation'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ height: '1px', background: '#EAEAEA', width: '100%', margin: '4rem 0' }}></div>

        {/* Section 7 — MILP Optimization */}
        <div className="ce-workspace-top">
          <div className="ce-workspace-left">
            <h2 className="ce-section-title">MILP Resource Re-Optimization</h2>
          </div>
          <div className="ce-workspace-right">
            {optimizeResult && optimizeResult.status === 'optimal' ? (
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem' }}>
                  <div style={{ flex: 1, padding: '1rem', background: '#F5F5F5', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Original</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#111' }}>₹{(optimizeResult.original_cost / 100000).toFixed(1)}L</div>
                  </div>
                  <div style={{ flex: 1, padding: '1rem', background: '#E8F5E9', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#2E7D32', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Optimized</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#2E7D32' }}>₹{(optimizeResult.optimized_cost / 100000).toFixed(1)}L</div>
                  </div>
                  <div style={{ flex: 1, padding: '1rem', background: '#F5F5F5', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Savings</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#2E7D32' }}>{optimizeResult.savings_percent}%</div>
                  </div>
                </div>
                {optimizeResult.resource_allocation.map((task, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.6rem 0', borderBottom: '1px solid #F0F0F0', fontSize: '13px',
                  }}>
                    <span style={{ fontWeight: 500, color: '#111' }}>{task.task}</span>
                    <span style={{ color: '#666' }}>{task.optimized_days}d · {task.workers} workers · ₹{(task.total_cost / 1000).toFixed(0)}K</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ce-dropzone" style={{ minHeight: '120px', padding: '3rem 2rem', gap: '1.5rem' }}>
                <span className="ce-dropzone-text">Trigger optimization to compute minimum-cost crew allocation</span>
                <button
                  className="nav-cta cta-large"
                  style={{ width: 'fit-content' }}
                  onClick={handleOptimize}
                  disabled={isOptimizing}
                >
                  {isOptimizing ? 'Optimizing...' : 'Re-Optimize'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ height: '1px', background: '#EAEAEA', width: '100%', margin: '4rem 0' }}></div>

        {/* Section 8 — Material Cost Forecast */}
        <div className="ce-workspace-top">
          <div className="ce-workspace-left">
            <h2 className="ce-section-title">Material Cost Index Forecast</h2>
          </div>
          <div className="ce-workspace-right">
            {forecastResult && forecastResult.predictions && forecastResult.predictions.length > 0 ? (
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '12px', color: '#666' }}>
                  <span>Target: {forecastResult.target}</span>
                  <span>{forecastResult.horizon_days}-day horizon</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', height: '120px' }}>
                  {forecastResult.predictions.filter((_, i) => i % 5 === 0).map((p, i) => {
                    const minVal = Math.min(...forecastResult.predictions.map(p => p.lower_bound));
                    const maxVal = Math.max(...forecastResult.predictions.map(p => p.upper_bound));
                    const range = maxVal - minVal || 1;
                    const height = ((p.value - minVal) / range) * 100;
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <div style={{
                          width: '100%', background: '#111', borderRadius: '2px 2px 0 0',
                          height: `${Math.max(height, 5)}%`,
                          transition: 'height 0.3s ease',
                        }} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '11px', color: '#999' }}>
                  <span>{forecastResult.predictions[0].date}</span>
                  <span>{forecastResult.predictions[forecastResult.predictions.length - 1].date}</span>
                </div>
              </div>
            ) : (
              <div className="ce-dropzone" style={{ minHeight: '120px', padding: '3rem 2rem', gap: '1.5rem' }}>
                <span className="ce-dropzone-text">Time-series projection will chart cement/steel volatility here</span>
                <button
                  className="nav-cta cta-large"
                  style={{ width: 'fit-content' }}
                  onClick={handleForecast}
                  disabled={isForecasting}
                >
                  {isForecasting ? 'Forecasting...' : 'Run Forecast'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ height: '1px', background: '#EAEAEA', width: '100%', margin: '4rem 0' }}></div>

        {/* Section 9 — Monte Carlo Risk Distribution */}
        <div className="ce-workspace-top">
          <div className="ce-workspace-left">
            <h2 className="ce-section-title" style={{ color: '#111' }}>Monte Carlo Risk Distribution</h2>
          </div>
          <div className="ce-workspace-right">
            {riskReport && riskReport.risk_scenarios ? (
              <div style={{ width: '100%' }}>
                {riskReport.risk_scenarios.map((s, i) => (
                  <div key={i} style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '13px' }}>
                      <span style={{ fontWeight: 500, color: '#111' }}>{s.scenario}</span>
                      <span style={{ fontWeight: 700, color: scenarioColor(s.scenario) }}>{(s.probability * 100).toFixed(1)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#F0F0F0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '4px',
                        background: scenarioColor(s.scenario),
                        width: `${s.probability * 100}%`,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ce-dropzone" style={{ minHeight: '120px', padding: '3rem 2rem', gap: '1.5rem' }}>
                <span className="ce-dropzone-text">Execute simulation to view scenario likelihoods</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Error Banner */}
      {error && (
        <div style={{
          position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
          background: '#D32F2F', color: '#fff', padding: '1rem 2rem', borderRadius: '8px',
          fontSize: '14px', fontWeight: 500, zIndex: 1000, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          maxWidth: '600px', textAlign: 'center',
        }}>
          {error}
        </div>
      )}

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
