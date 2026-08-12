import { useRef, useState, useEffect, useCallback } from 'react';
import TextPressure from '../components/TextPressure';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import heroVideo from '../../Assets/606982_Cities_City_3840x2160.mp4';
import featureImage1 from '../../Assets/pointing-sketch.jpg';
import featureImage2 from '../../Assets/farbsynthese-village-7133842.jpg';
import featureImage3 from '../../Assets/11066063-construction-site-4020496.jpg';
import { Link } from 'react-router-dom';
import { useWarmVideo } from '../hooks/useWarmVideo';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

function Home() {
  const containerRef  = useRef();
  const heroRef        = useRef();
  const videoRef       = useRef();
  const videoWrapRef   = useRef();
  const wordmarkRef    = useRef();

  // ── Health Dashboard state ─────────────────────────────────────────
  const [health, setHealth] = useState(null);
  const [backendOnline, setBackendOnline] = useState(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [loopMsg, setLoopMsg] = useState(null);

  const fetchHealth = useCallback(async () => {
    try {
      const [healthRes, pingRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/project/health`),
        fetch(`${API_BASE}/api/health`),
      ]);
      setBackendOnline(pingRes.ok);
      if (healthRes.ok) setHealth(await healthRes.json());
    } catch {
      setBackendOnline(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const handleTriggerLoop = useCallback(async () => {
    setIsTriggering(true);
    setLoopMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/project/loop/trigger`, { method: 'POST' });
      const data = await res.json();
      setLoopMsg({ ok: data.status !== 'no_data', text: data.message || 'Foresight recalculated.' });
      if (data.status !== 'no_data') fetchHealth();
    } catch {
      setLoopMsg({ ok: false, text: 'Cannot reach backend.' });
    } finally {
      setIsTriggering(false);
    }
  }, [fetchHealth]);

  useWarmVideo(heroVideo, videoRef, videoWrapRef, 'hero-video');

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: heroRef.current,
        start: "top top",
        end: "+=100%",
        pin: true,
        scrub: 1,
      }
    });

    tl.to(videoRef.current, { scale: 1.15, ease: "power2.in" }, 0);
    tl.to(wordmarkRef.current, { opacity: 0, ease: "power2.in" }, 0);

    gsap.utils.toArray('.feature-block').forEach(block => {
      const text = block.querySelector('.feature-text');
      const img = block.querySelector('.feature-image');

      gsap.fromTo(text,
        { opacity: 0, x: block.classList.contains('feature-reverse') ? 50 : -50 },
        {
          opacity: 1, x: 0, ease: "power2.in",
          scrollTrigger: { trigger: block, start: "top 85%", end: "top 50%", scrub: 1.5 }
        }
      );

      gsap.fromTo(img,
        { opacity: 0, scale: 0.95, y: 50 },
        {
          opacity: 1, scale: 1, y: 0, ease: "power2.in",
          scrollTrigger: { trigger: block, start: "top 95%", end: "top 55%", scrub: 1.5 }
        }
      );
    });

    gsap.fromTo('.health-dashboard',
      { opacity: 0, y: 50 },
      {
        opacity: 1, y: 0, ease: "power2.out",
        scrollTrigger: { trigger: '.health-dashboard', start: "top 85%", end: "top 60%", scrub: 1.5 }
      }
    );
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="app-container page-transition">

      {/* Pinned Hero Section */}
      <div ref={heroRef} className="hero-section">
        <div ref={videoWrapRef} />
        <div ref={wordmarkRef} className="hero-content">
          <div style={{ position: 'relative', width: '80%', height: '300px', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TextPressure
              text="SafeSite AI"
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
            <p>AI-Powered Site Inspections That<br />Catch Defects Before They Cost You</p>
          </div>

          {/* Connection status — minimal text label, no colored pill */}
          <div style={{
            position: 'absolute', bottom: '2rem', right: '2rem', zIndex: 10,
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)',
            letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            <span style={{
              width: '6px', height: '6px', flexShrink: 0,
              background: backendOnline === false ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.8)',
            }} />
            {backendOnline === null ? 'Connecting...' : backendOnline ? 'Backend Online' : 'Backend Offline'}
          </div>
        </div>
      </div>

      {/* Project Health Dashboard */}
      <section className="health-dashboard ce-workspace-section">
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Header row — matches ce-workspace-top pattern */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #EAEAEA', paddingBottom: '2rem' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#999' }}>Live Project Intelligence</span>
              <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 200, color: '#111', letterSpacing: '-0.01em', margin: '0.5rem 0 0 0', lineHeight: 1.2 }}>
                Project Health
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={fetchHealth}
                style={{ background: 'none', border: '1px solid #D0D0D0', padding: '0.6rem 1.2rem', cursor: 'pointer', fontSize: '13px', color: '#666', fontWeight: 500, fontFamily: "'Inter', sans-serif" }}
              >
                ↺ Refresh
              </button>
              <button
                className="nav-cta"
                style={{ fontSize: '13px', padding: '0.6rem 1.2rem', opacity: isTriggering ? 0.7 : 1 }}
                onClick={handleTriggerLoop}
                disabled={isTriggering}
              >
                {isTriggering ? 'Recalculating...' : '↻ Trigger Recalculation'}
              </button>
            </div>
          </div>

          {/* Loop message — on-theme plain text */}
          {loopMsg && (
            <p style={{ fontSize: '13px', color: '#555', marginBottom: '2rem', fontFamily: "'Inter', sans-serif", borderTop: '1px solid #EAEAEA', paddingTop: '0.75rem' }}>
              {loopMsg.ok ? '✓' : '✗'} {loopMsg.text}
            </p>
          )}

          {health ? (
            <>
              {/* Score grid — plain numbers, no colored backgrounds or rings */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0', borderTop: '1px solid #EAEAEA', marginBottom: '4rem' }}>
                {[
                  { label: 'Overall', value: health.health_score, sub: 'composite' },
                  { label: 'Compliance', value: health.compliance_score, sub: '35% weight' },
                  { label: 'Vision', value: health.vision_score, sub: '35% weight' },
                  { label: 'Foresight', value: health.foresight_score, sub: '30% weight' },
                ].map((item, i) => (
                  <div key={i} style={{
                    padding: '2rem 1.5rem',
                    borderRight: i < 3 ? '1px solid #EAEAEA' : 'none',
                    borderBottom: '1px solid #EAEAEA',
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#999', marginBottom: '0.75rem', fontFamily: "'Inter', sans-serif" }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 200, color: '#111', lineHeight: 1, letterSpacing: '-0.02em', fontFamily: "'Inter', sans-serif" }}>
                      {item.value.toFixed(0)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#BBB', marginTop: '0.4rem', fontFamily: "'Inter', sans-serif" }}>
                      /100 — {item.sub}
                    </div>
                  </div>
                ))}
              </div>

              {/* Detail counters — plain list, on-theme */}
              <div className="ce-stats-list">
                {[
                  { label: 'Active Violations', value: health.active_violations },
                  { label: 'Active Defects', value: health.active_defects },
                  { label: 'Active Risks', value: health.active_risks },
                  { label: 'Feedback Loop', value: health.feedback_loop_active ? 'Active' : 'Idle' },
                  { label: 'Last Scan', value: health.last_scan_timestamp ? new Date(health.last_scan_timestamp).toLocaleTimeString() : 'Never' },
                ].map((item, i) => (
                  <div key={i} className="ce-stat-row" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 0' }}>
                    <span style={{ fontSize: '14px', color: '#111', fontFamily: "'Inter', sans-serif" }}>{item.label}</span>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#555', fontFamily: "'Inter', sans-serif" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ padding: '4rem 0', borderTop: '1px solid #EAEAEA' }}>
              <p style={{ fontSize: '14px', color: '#999', fontFamily: "'Inter', sans-serif", margin: 0 }}>
                {backendOnline === false
                  ? 'Backend is offline. Start the server to see live project health.'
                  : 'Health data will appear here once you run a compliance or vision analysis.'}
              </p>
              <p style={{ fontSize: '12px', color: '#CCC', marginTop: '0.5rem', fontFamily: "'Inter', sans-serif" }}>
                Auto-refreshes every 30 seconds · GET /api/v1/project/health
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Standard overview section */}
      <section className="overview-section">
        <div className="overview-container">
          <div className="overview-columns">
            <div className="overview-left">
              <span className="eyebrow-label">What We Do</span>
            </div>
            <div className="overview-right">
              <h3 className="statement-text">
                Before the first beam goes up, SafeSite AI reviews your site plans and flags defects that would otherwise surface mid-build  -  when they're far more expensive to fix.
              </h3>
              <Link to="/how-it-works" className="nav-cta cta-large">See How It Works</Link>
            </div>
          </div>
          <div className="feature-blocks">
            <div className="feature-block feature-block-fade">
              <div className="feature-image">
                <img src={featureImage1} alt="Compliance Engine" />
              </div>
              <div className="feature-text">
                <span className="feature-eyebrow">01  -  Compliance Engine</span>
                <p className="feature-body">
                  Automatically checks site plans against building codes and safety regulations  -  catching violations before inspectors do.
                </p>
              </div>
            </div>

            <div className="feature-block feature-block-fade feature-reverse">
              <div className="feature-text">
                <span className="feature-eyebrow">02  -  Vision Engine</span>
                <p className="feature-body">
                  Computer vision scans job site imagery in real time, flagging structural defects, PPE violations, and Scan-to-BIM deviations.
                </p>
              </div>
              <div className="feature-image">
                <img src={featureImage2} alt="Vision Engine" />
              </div>
            </div>

            <div className="feature-block feature-block-fade">
              <div className="feature-image">
                <img src={featureImage3} alt="Foresight Engine" />
              </div>
              <div className="feature-text">
                <span className="feature-eyebrow">03  -  Foresight Engine</span>
                <p className="feature-body">
                  Predicts where delays and defects are likely to occur next, based on patterns across thousands of past builds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

export default Home;
