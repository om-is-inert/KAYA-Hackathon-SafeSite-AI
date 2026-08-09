import React, { useEffect, useState } from 'react';
import './AnalysisProgress.css';

/**
 * On-theme progress indicator for long-running Gemini calls (15-30s).
 * Steps auto-advance on a timer so the wait always shows forward motion,
 * even though we have no real progress events from the backend.
 */
export default function AnalysisProgress({ steps, active }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setStepIndex(0);
      return;
    }
    const perStep = 4500;
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, perStep);
    return () => clearInterval(timer);
  }, [active, steps.length]);

  if (!active) return null;

  return (
    <div className="ap-container">
      <div className="ap-bar-track">
        <div className="ap-bar-fill" />
      </div>
      <div className="ap-steps">
        {steps.map((step, i) => (
          <div key={step} className={`ap-step ${i < stepIndex ? 'is-done' : ''} ${i === stepIndex ? 'is-active' : ''}`}>
            <span className="ap-step-marker" />
            <span className="ap-step-label">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
