import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import TextPressure from '../components/TextPressure';
import './HowItWorks.css';

gsap.registerPlugin(ScrollTrigger);

export default function HowItWorks() {
  const containerRef = useRef();

  useGSAP(() => {
    // Animate process blocks
    gsap.utils.toArray('.hiw-block').forEach((block, i) => {
      gsap.from(block, {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: block,
          start: 'top 85%',
        }
      });
    });

    // Intro text animation
    gsap.from('.hiw-intro-text', {
      y: 20,
      opacity: 0,
      duration: 0.8,
      delay: 0.3,
      ease: 'power3.out',
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="hiw-page page-transition">
      <section className="hiw-intro-section">
        <div style={{ position: 'relative', width: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TextPressure
            text="HOW IT WORKS"
            flex={true}
            alpha={false}
            stroke={false}
            width={true}
            weight={true}
            italic={true}
            textColor="#111111"
            strokeColor="#111111"
            minFontSize={36}
            sizeFactor={0.8}
          />
        </div>
        <div className="hiw-intro-text">
          <p>
            SafeSite AI runs as one connected pipeline across three engines — from blueprint to build. Here's how each one works.
          </p>
        </div>
      </section>

      <section className="hiw-process-section">
        <div className="hiw-container">
          
          {/* Compliance Engine Block */}
          <div className="hiw-block">
            <div className="hiw-label">01 — COMPLIANCE ENGINE</div>
            <div className="hiw-flow">
              <span>Upload Blueprint</span>
              <span className="hiw-arrow">→</span>
              <span>Checked Against Building Codes</span>
              <span className="hiw-arrow">→</span>
              <span>Violations Flagged</span>
            </div>
            <p className="hiw-desc">
              Leverages the Gemini Vision-Language Model (VLM) to automatically extract spatial dimensions from blueprints. Extracted vectors are cross-referenced via a RAG pipeline against structural codes like IS 456:2000 and NBC 2016 Part IV to instantly flag and score life-safety compliance violations.
            </p>
          </div>

          <div className="hiw-divider"></div>

          {/* Vision Engine Block */}
          <div className="hiw-block">
            <div className="hiw-label">02 — VISION ENGINE</div>
            <div className="hiw-flow">
              <span>Upload Site Photo</span>
              <span className="hiw-arrow">→</span>
              <span>Scanned for Structural Defects</span>
              <span className="hiw-arrow">→</span>
              <span>Defect Report Generated</span>
            </div>
            <p className="hiw-desc">
              Runs a two-stage computer vision pipeline: fine-tuned YOLOv11-seg and SAM 2 models generate pixel-perfect bounding boxes for micro-fractures, honeycombing, and spalling. A zero-shot VLM fallback classifies complex structural anomalies and maps them to required code remediations.
            </p>
          </div>

          <div className="hiw-divider"></div>

          {/* Foresight Engine Block */}
          <div className="hiw-block">
            <div className="hiw-label">03 — FORESIGHT ENGINE</div>
            <div className="hiw-flow">
              <span>Upload Project Schedule</span>
              <span className="hiw-arrow">→</span>
              <span>Monte Carlo Simulation + MILP Optimization</span>
              <span className="hiw-arrow">→</span>
              <span>Risk Forecast & Resource Plan</span>
            </div>
            <p className="hiw-desc">
              Executes 10,000x Monte Carlo probability simulations using NumPy, running triangular and binomial distributions against weather, supply chain, and rework risk factors. Outputs strict P50, P80, and P95 schedule/cost bands, feeding a MILP optimizer to autonomously reallocate job site resources.
            </p>
          </div>

        </div>
      </section>

      <section className="hiw-closing-section">
        <div className="hiw-closing-content">
          <span className="hiw-closing-label">GET IN TOUCH</span>
          <h3 className="hiw-closing-statement">
            Ready to deploy SafeSite AI on your next project?
          </h3>
          <Link to="#" className="nav-cta cta-large">Contact Us</Link>
        </div>
      </section>
    </div>
  );
}
