import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SideMenu from '../components/SideMenu';
import './ComplianceEngine.css';

export default function ComplianceEngine() {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="ce-dashboard page-transition">
      <SideMenu isOpen={isMenuOpen} closeMenu={() => setIsMenuOpen(false)} />

      {/* Floating Full-Width Navbar */}
      <nav className="floating-nav">
        <div 
          className="nav-logo" 
          onClick={() => setIsMenuOpen(prev => !prev)}
          style={{ cursor: 'pointer' }}
        >
          <span className="logo-icon">≣</span>
          <span className="logo-text">SafeSite AI</span>
        </div>
        <ul className="nav-links">
          <li><a href="#">Company</a></li>
          <li><a href="#">Platform</a></li>
          <li><Link to="/compliance-engine">Compliance Engine</Link></li>
          <li><a href="#">Vision Engine</a></li>
          <li><a href="#">Team</a></li>
          <li><a href="#">Investors</a></li>
          <li><a href="#">News</a></li>
        </ul>
        <a href="#" className="nav-cta">Get in Touch</a>
      </nav>

      <div className="ce-hero">
        <div className="ce-hero-content">
          <div className="ce-breadcrumb">
            <Link to="/">SafeSite AI</Link> / Compliance Engine
          </div>
          
          <h1 className="ce-title">Compliance Engine</h1>

          <button 
            className="ce-details-toggle" 
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          >
            System Details <span style={{ fontSize: '10px', marginLeft: '4px' }}>{isDetailsOpen ? '▲' : '▼'}</span>
          </button>

          {isDetailsOpen && (
            <div className="ce-meta-rows">
              <div className="ce-meta-row">
                <span className="ce-meta-label">Status</span>
                <span className="ce-pill ce-pill-blue">Active — Pre-Construction</span>
              </div>
              <div className="ce-meta-row">
                <span className="ce-meta-label">Regulatory Scope</span>
                <div className="ce-pill-group">
                  <span className="ce-pill ce-pill-purple">NBC India 2016 Part IV</span>
                  <span className="ce-pill ce-pill-purple">IS 456:2000</span>
                </div>
              </div>
              <div className="ce-meta-row">
                <span className="ce-meta-label">AI Core</span>
                <span className="ce-pill ce-pill-dark">Gemini 2.5 Flash VLM + ChromaDB RAG</span>
              </div>
              <div className="ce-meta-row">
                <span className="ce-meta-label">Closed-Loop Sync</span>
                <span className="ce-pill ce-pill-green">Integrated with Vision & Foresight</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="ce-stats-section">
        <div className="ce-stat-cards">
          <div className="ce-stat-card">
            <div className="ce-stat-top">
              <span className="ce-stat-title">Composite Health</span>
              <span className="ce-pill ce-pill-green ce-pill-small">Pass</span>
            </div>
            <div className="ce-stat-value">100</div>
            <div className="ce-stat-sub">Across all 3 layers</div>
          </div>
          <div className="ce-stat-card">
            <div className="ce-stat-top">
              <span className="ce-stat-title">Design Flaws</span>
              <span className="ce-pill ce-pill-dark ce-pill-small">Layer 1</span>
            </div>
            <div className="ce-stat-value">0</div>
            <div className="ce-stat-sub">Blueprint check</div>
          </div>
          <div className="ce-stat-card">
            <div className="ce-stat-top">
              <span className="ce-stat-title">As-Built Defects</span>
              <span className="ce-pill ce-pill-dark ce-pill-small">Layer 2</span>
            </div>
            <div className="ce-stat-value">0</div>
            <div className="ce-stat-sub">Site inspection</div>
          </div>
          <div className="ce-stat-card">
            <div className="ce-stat-top">
              <span className="ce-stat-title">On-Time Probability</span>
              <span className="ce-pill ce-pill-dark ce-pill-small">Layer 3</span>
            </div>
            <div className="ce-stat-value">—</div>
            <div className="ce-stat-sub">10,000x simulation</div>
          </div>
        </div>
      </div>

      <section className="ce-workspace-section">
        <div className="ce-workspace">
        <div className="ce-workspace-left">
          <h2 className="ce-section-title">1. Select Building Codes</h2>
          <div className="ce-code-toggles">
            <button className="ce-code-btn ce-code-btn-active">✓ NBC 2016 Part IV (Fire & Life Safety)</button>
            <button className="ce-code-btn ce-code-btn-active">✓ IS 456:2000 (Reinforced Concrete)</button>
          </div>

          <h2 className="ce-section-title ce-mt-4">2. Upload Floor Plan / Blueprint</h2>
          <div className="ce-dropzone">
            <span className="ce-dropzone-icon">📐</span>
            <span className="ce-dropzone-text">Drop blueprint here or click to upload</span>
            <span className="ce-dropzone-sub">Supports PDF, PNG, JPG (architectural layouts, floor plans)</span>
          </div>
        </div>

        <div className="ce-workspace-right">
          <h2 className="ce-section-title">Identified Violations</h2>
          <div className="ce-empty-state">
            <span className="ce-empty-icon">🔍</span>
            <span className="ce-empty-title">No Violations Detected Yet</span>
            <span className="ce-empty-sub">Upload an architectural layout to start compliance verification.</span>
          </div>
        </div>
        </div>
      </section>
    </div>
  );
}
