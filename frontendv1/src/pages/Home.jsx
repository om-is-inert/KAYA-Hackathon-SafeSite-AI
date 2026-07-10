import { useState, useRef } from 'react';
import TextPressure from '../components/TextPressure';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import heroVideo from '../../Assets/606982_Cities_City_3840x2160.mp4';
import featureImage1 from '../../Assets/pointing-sketch.jpg';
import featureImage2 from '../../Assets/farbsynthese-village-7133842.jpg';
import featureImage3 from '../../Assets/11066063-construction-site-4020496.jpg';
import { Link } from 'react-router-dom';

gsap.registerPlugin(useGSAP, ScrollTrigger);

function Home() {
  const containerRef = useRef();
  const heroRef = useRef();
  const videoRef = useRef();
  const wordmarkRef = useRef();

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: heroRef.current,
        start: "top top",
        end: "+=100%", // pin for 100vh extra scrolling
        pin: true,
        scrub: 1,
      }
    });

    // Animate video background scale
    tl.to(videoRef.current, { scale: 1.15, ease: "power2.in" }, 0);

    // Fade out wordmark and bottom-left text
    tl.to(wordmarkRef.current, { opacity: 0, ease: "power2.in" }, 0);

    // Butter smooth scrubbed animations for feature blocks
    gsap.utils.toArray('.feature-block').forEach(block => {
      const text = block.querySelector('.feature-text');
      const img = block.querySelector('.feature-image');
      
      // Animate text sliding in from the side
      gsap.fromTo(text,
        { opacity: 0, x: block.classList.contains('feature-reverse') ? 50 : -50 },
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

      // Animate image fading and scaling up
      gsap.fromTo(img,
        { opacity: 0, scale: 0.95, y: 50 },
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
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="app-container page-transition">

      {/* Pinned Hero Section */}
      <div ref={heroRef} className="hero-section">
        <video 
          ref={videoRef}
          className="hero-video"
          src={heroVideo}
          autoPlay 
          loop 
          muted 
          playsInline
        />

        <div ref={wordmarkRef} className="hero-content">
          {/* Hero Title with React Bits TextPressure Effect */}
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

          {/* Bottom Left Text Block */}
          <div className="bottom-left-info">
            <p>AI-Powered Site Inspections That<br />Catch Defects Before They Cost You</p>
          </div>
        </div>

      </div>

      {/* Standard white-background overview section below the hero */}
      <section className="overview-section">
        <div className="overview-container">
          <div className="overview-columns">
            <div className="overview-left">
              <span className="eyebrow-label">What We Do</span>
            </div>
            <div className="overview-right">
              <h3 className="statement-text">
                Before the first beam goes up, SafeSite AI reviews your site plans and flags defects that would otherwise surface mid-build — when they're far more expensive to fix.
              </h3>
              <Link to="/compliance-engine" className="nav-cta cta-large">See How It Works</Link>
            </div>
          </div>
          <div className="feature-blocks">
            {/* Block 1 */}
            <div className="feature-block feature-block-fade">
              <div className="feature-image">
                <img src={featureImage1} alt="Compliance Engine" />
              </div>
              <div className="feature-text">
                <span className="feature-eyebrow">01 — Compliance Engine</span>
                <p className="feature-body">
                  Automatically checks site plans against building codes and safety regulations — catching violations before inspectors do.
                </p>
              </div>
            </div>

            {/* Block 2 */}
            <div className="feature-block feature-block-fade feature-reverse">
              <div className="feature-text">
                <span className="feature-eyebrow">02 — Vision Engine</span>
                <p className="feature-body">
                  Computer vision scans job site imagery in real time, flagging structural defects human inspectors miss.
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
                <span className="feature-eyebrow">03 — Foresight Engine</span>
                <p className="feature-body">
                  Predicts where delays and defects are likely to occur next, based on patterns across thousands of past builds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Dummy scrollable space to allow scrolling past the overview */}
      <div style={{ height: '150vh', background: '#FAFAFA' }}></div>
    </div>
  );
}

export default Home;
