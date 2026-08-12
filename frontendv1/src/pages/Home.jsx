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

// Score ring SVG component
function ScoreRing({ score, label, color, weight }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(score, 0), 100) / 100;
  const dash = pct * circ;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="44" cy="44" r={r} fill="none" stroke="#F0F0F0" strokeWidth="7" />
        <circle
          cx="44" cy="44" r={r} fill="none"
          stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div style={{ textAlign: 'center', marginTop: '-4px' }}>
        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111', letterSpacing: '-0.02em' }}>
          {score.toFixed(0)}<span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#999' }}>/100</span>
        </div>
        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888' }}>{label}</div>
        <div style={{ fontSize: '10px', color: '#bbb', marginTop: '1px' }}>{weight} weight</div>
      </div>
    </div>
  );
}

function Home() {
  const containerRef  = useRef();
  const heroRef        = useRef();
  const videoRef       = useRef();
  const videoWrapRef   = useRef();
  const wordmarkRef    = useRef();

  // ── Health Dashboard state ─────────────────────────────────────────
  const [health, setHealth] = useState(null);
  const [backendOnline, setBackendOnline] = useState(null); // null = checking, true/false
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
    const interval = setInterval(fetchHealth, 30000); // poll every 30s
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

  /* Claim the pre-warmed video from the pool — runs before GSAP */
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

  const overallColor = (score) => {
    if (score >= 80) return '#2E7D32';
    if (score >= 50) return '#E65100';
    return '#D32F2F';
  };

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

          {/* Connection status pill — lives inside the hero overlay */}
          <div style={{
            position: 'absolute', bottom: '2rem', right: '2rem', zIndex: 10,
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
            padding: '0.45rem 0.9rem', borderRadius: '100px',
            fontSize: '12px', fontWeight: 600, color: '#fff', letterSpacing: '0.04em',
          }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
              background: backendOnline === null ? '#888' : backendOnline ? '#4CAF50' : '#D32F2F',
              boxShadow: backendOnline ? '0 0 6px #4CAF50' : 'none',
              transition: 'background 0.4s ease',
            }} />
            {backendOnline === null ? 'Connecting...' : backendOnline ? 'Backend Online' : 'Backend Offline'}
          </div>
        </div>
      </div>

      {/* Project Health Dashboard */}
      <section className="health-dashboard" style={{
        background: '#fff', padding: '5rem 4rem', borderBottom: '1px solid #EAEAEA',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#999' }}>Live Project Intelligence</span>
              <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#111', letterSpacing: '-0.02em', margin: '0.5rem 0 0 0' }}>
                Project Health Dashboard
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={fetchHealth}
                style={{ background: 'none', border: '1px solid #EAEAEA', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '12px', color: '#666', fontWeight: 600 }}
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

          {loopMsg && (
            <div style={{
              padding: '0.75rem 1.25rem', borderRadius: '6px', marginBottom: '2rem', fontSize: '13px',
              background: loopMsg.ok ? '#E8F5E9' : '#FFEBEE', color: loopMsg.ok ? '#2E7D32' : '#D32F2F', fontWeight: 500,
            }}>
              {loopMsg.ok ? '✓' : '✗'} {loopMsg.text}
            </div>
          )}

          {health ? (
            <>
              {/* Overall health banner */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '2rem', padding: '2rem',
                background: health.health_score >= 80 ? '#E8F5E9' : health.health_score >= 50 ? '#FFF3E0' : '#FFEBEE',
                borderRadius: '12px', marginBottom: '3rem', flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#888', fontWeight: 700, marginBottom: '0.4rem' }}>
                    Overall Health Score
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontSize: '3.5rem', fontWeight: 900, color: overallColor(health.health_score), letterSpacing: '-0.03em', lineHeight: 1 }}>
                      {health.health_score.toFixed(0)}
                    </span>
                    <span style={{ fontSize: '1.2rem', color: '#aaa' }}>/100</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
                  <ScoreRing score={health.compliance_score} label="Compliance" color={overallColor(health.compliance_score)} weight="35%" />
                  <ScoreRing score={health.vision_score} label="Vision" color={overallColor(health.vision_score)} weight="35%" />
                  <ScoreRing score={health.foresight_score} label="Foresight" color={overallColor(health.foresight_score)} weight="30%" />
                </div>
              </div>

              {/* Detail counters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {[
                  { label: 'Active Violations', value: health.active_violations, warn: health.active_violations > 0 },
                  { label: 'Active Defects', value: health.active_defects, warn: health.active_defects > 0 },
                  { label: 'Active Risks', value: health.active_risks, warn: health.active_risks > 2 },
                  { label: 'Feedback Loop', value: health.feedback_loop_active ? 'Active' : 'Idle', warn: !health.feedback_loop_active },
                  { label: 'Last Scan', value: health.last_scan_timestamp ? new Date(health.last_scan_timestamp).toLocaleTimeString() : 'Never', warn: false },
                ].map((item, i) => (
                  <div key={i} style={{
                    padding: '1.25rem 1.5rem', background: '#FAFAFA', borderRadius: '8px',
                    borderLeft: `3px solid ${item.warn ? '#E65100' : '#EAEAEA'}`,
                  }}>
                    <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>{item.label}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: item.warn ? '#E65100' : '#111' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>
                {backendOnline === false ? '⚠' : '⏳'}
              </div>
              <p style={{ fontSize: '14px', fontWeight: 500 }}>
                {backendOnline === false
                  ? 'Backend is offline. Start the server to see live project health.'
                  : 'Health data will appear here once you run a compliance or vision analysis.'}
              </p>
              <p style={{ fontSize: '12px', color: '#bbb', marginTop: '0.5rem' }}>
                Auto-refreshes every 30 seconds · Polls /api/v1/project/health
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Standard white-background overview section below the hero */}
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
            {/* Block 1 */}
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

            {/* Block 2 */}
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

            {/* Block 3 */}
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
