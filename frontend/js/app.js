/* ══════════════════════════════════════════════════════════════
   SafeSite AI — Notion Frontend Application Logic
   Handles tab switching, theme toggling, API calls, and UI updates
   ══════════════════════════════════════════════════════════════ */

const API = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
  ? `http://127.0.0.1:8000`
  : '';

// ── State ──────────────────────────────────────────────────────
const state = {
  compliance: null,
  defects: null,
  foresight: null,
  health: null,
  theme: 'dark'
};

// ── Theme Toggling (Notion Light / Dark) ───────────────────────
function toggleTheme() {
  const body = document.body;
  if (state.theme === 'dark') {
    state.theme = 'light';
    body.setAttribute('data-theme', 'light');
    document.getElementById('theme-btn-icon').textContent = '🌙';
    document.getElementById('theme-btn-text').textContent = 'Dark Mode';
    if (document.getElementById('theme-nav-icon')) document.getElementById('theme-nav-icon').textContent = '🌙';
    if (document.getElementById('theme-nav-text')) document.getElementById('theme-nav-text').textContent = 'Dark Mode';
  } else {
    state.theme = 'dark';
    body.removeAttribute('data-theme');
    document.getElementById('theme-btn-icon').textContent = '☀️';
    document.getElementById('theme-btn-text').textContent = 'Light Mode';
    if (document.getElementById('theme-nav-icon')) document.getElementById('theme-nav-icon').textContent = '☀️';
    if (document.getElementById('theme-nav-text')) document.getElementById('theme-nav-text').textContent = 'Light Mode';
  }
}

// ── Tab Switching & Page Metadata Updates ──────────────────────
const tabConfig = {
  compliance: {
    title: 'Compliance Engine',
    icon: '📐',
    status: '<span class="tag-pill tag-blue">Active — Pre-Construction</span>',
    scope: '<span class="tag-pill tag-purple">NBC India 2016 Part IV</span> <span class="tag-pill tag-purple">IS 456:2000</span>',
    ai: '<span class="tag-pill tag-gray">Gemini 2.5 Flash VLM + ChromaDB RAG</span>'
  },
  vision: {
    title: 'Vision Engine',
    icon: '🔍',
    status: '<span class="tag-pill tag-orange">Active — Build Execution</span>',
    scope: '<span class="tag-pill tag-purple">Structural Elements</span> <span class="tag-pill tag-purple">Surface Defect Masks</span>',
    ai: '<span class="tag-pill tag-gray">BIM-Net++ + YOLOv11 / SAM 2 + Gemini</span>'
  },
  foresight: {
    title: 'Foresight Engine',
    icon: '🔮',
    status: '<span class="tag-pill tag-green">Continuous Operations</span>',
    scope: '<span class="tag-pill tag-purple">Schedule Variance</span> <span class="tag-pill tag-purple">MILP Resource Shift</span>',
    ai: '<span class="tag-pill tag-gray">Monte Carlo 10,000x + SciPy linprog/highs</span>'
  }
};

document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
  item.addEventListener('click', () => {
    const tab = item.dataset.tab;
    document.querySelectorAll('.nav-item[data-tab]').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`panel-${tab}`).classList.add('active');
    
    // Update Notion Page Header & Breadcrumb
    const cfg = tabConfig[tab];
    document.getElementById('page-title').textContent = cfg.title;
    document.getElementById('page-icon').textContent = cfg.icon;
    document.getElementById('breadcrumb-title').textContent = cfg.title;
    document.getElementById('prop-status').innerHTML = cfg.status;
    document.getElementById('prop-scope').innerHTML = cfg.scope;
    document.getElementById('prop-ai').innerHTML = cfg.ai;
  });
});

// ── File Upload Handlers ───────────────────────────────────────
function setupUpload(inputId, zoneId, previewId, imgId, handler) {
  const input = document.getElementById(inputId);
  const zone = document.getElementById(zoneId);

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview
    const preview = document.getElementById(previewId);
    const img = document.getElementById(imgId);

    if (file.type === 'application/pdf') {
      img.src = '';
      img.alt = 'PDF Blueprint: ' + file.name;
      img.style.background = 'var(--bg-input)';
      img.style.minHeight = '240px';
      img.style.display = 'flex';
    } else {
      const url = URL.createObjectURL(file);
      img.src = url;
      img.style.display = 'block';
    }
    preview.style.display = 'block';
    zone.style.display = 'none';

    await handler(file);
  });

  // Drag-and-drop
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) {
      input.files = e.dataTransfer.files;
      input.dispatchEvent(new Event('change'));
    }
  });
}

// ── Layer 1: Compliance Analysis ───────────────────────────────
async function analyzeBlueprint(file) {
  const overlay = document.getElementById('scan-overlay');
  overlay.classList.add('active');

  const codes = [];
  document.querySelectorAll('#code-select input:checked').forEach(cb => codes.push(cb.value));

  const formData = new FormData();
  formData.append('blueprint', file);
  formData.append('codes', codes.join(','));

  try {
    const res = await fetch(`${API}/api/v1/compliance/analyze`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();
    state.compliance = data;
    renderComplianceResults(data);
    updateHealth();
  } catch (err) {
    console.error('Compliance analysis failed:', err);
    alert('Analysis failed: ' + err.message);
  } finally {
    overlay.classList.remove('active');
  }
}

function renderComplianceResults(data) {
  // Score block
  const section = document.getElementById('compliance-score-section');
  section.style.display = 'block';
  document.getElementById('compliance-score-val').textContent = `${Math.round(data.compliance_score)}%`;

  // Violation count badge
  const badge = document.getElementById('violation-count-badge');
  badge.style.display = 'inline-flex';
  badge.textContent = `${data.total_violations} items`;
  badge.className = `tag-pill ${data.critical_count > 0 ? 'tag-red' : data.high_count > 0 ? 'tag-orange' : 'tag-green'}`;

  // Nav badge
  if (data.total_violations > 0) {
    const nb = document.getElementById('badge-violations');
    nb.style.display = 'inline';
    nb.textContent = data.total_violations;
  }

  // Violations list as Notion Toggle items
  const list = document.getElementById('violations-list');
  if (data.violations.length === 0) {
    list.innerHTML = '<div class="empty-notion"><div class="empty-notion-icon">✅</div><div style="font-weight:600; color:var(--text-main-hex);">No Regulatory Violations</div><div style="font-size:13px; color:var(--text-muted);">The architectural blueprint fully satisfies selected building codes.</div></div>';
    return;
  }

  list.innerHTML = data.violations.map((v, i) => {
    const tagClass = v.severity === 'CRITICAL' ? 'tag-red' : v.severity === 'HIGH' ? 'tag-orange' : v.severity === 'MEDIUM' ? 'tag-yellow' : 'tag-green';
    return `
      <div class="notion-toggle-item">
        <div class="notion-toggle-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
          <span style="font-size: 11px; color: var(--text-muted);">▶</span>
          <span class="tag-pill ${tagClass}">${v.severity}</span>
          <span style="font-weight: 600; font-size: 13px; color: var(--text-main-hex);">${v.exact_location}</span>
          <span style="margin-left:auto; font-size: 12px; color: var(--text-muted);">${v.id}</span>
        </div>
        <div class="notion-toggle-body" style="display: ${i < 3 ? 'block' : 'none'};">
          <div style="margin-bottom: 6px;"><strong>Measured Dimension:</strong> <span style="color: var(--text-main-hex);">${v.measured_value}</span></div>
          <div style="margin-bottom: 6px;"><strong>Code Requirement:</strong> <span style="color: var(--text-main-hex);">${v.required_value}</span></div>
          <div style="margin-bottom: 8px; font-style: italic; color: var(--accent-primary);">📖 ${v.code_reference}</div>
          <div style="padding: 8px 10px; background: var(--bg-card); border-radius: var(--radius-sm); border: 1px solid var(--border);">
            <strong style="color: var(--tag-green-text);">💡 Remediation Action:</strong> ${v.fix_suggestion}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Update metrics
  document.getElementById('m-violations').textContent = data.total_violations;
}

// ── Layer 2: Defect Detection ──────────────────────────────────
async function analyzeDefects(file) {
  const overlay = document.getElementById('defect-scan-overlay');
  overlay.classList.add('active');

  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetch(`${API}/api/v1/vision/defect/analyze`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();
    state.defects = data;
    renderDefectResults(data);
    drawDefectOverlays(data);
    updateHealth();
  } catch (err) {
    console.error('Defect detection failed:', err);
    alert('Detection failed: ' + err.message);
  } finally {
    overlay.classList.remove('active');
  }
}

function renderDefectResults(data) {
  const badge = document.getElementById('defect-count-badge');
  badge.style.display = 'inline-flex';
  badge.textContent = `${data.total_defects} items`;
  badge.className = `tag-pill ${data.critical_count > 0 ? 'tag-red' : data.high_count > 0 ? 'tag-orange' : 'tag-green'}`;

  if (data.total_defects > 0) {
    const nb = document.getElementById('badge-defects');
    nb.style.display = 'inline';
    nb.textContent = data.total_defects;
  }

  // Condition metrics
  document.getElementById('vision-condition').style.display = 'block';
  document.getElementById('overall-condition').textContent = data.overall_condition || '—';
  document.getElementById('repair-cost').textContent = data.estimated_repair_cost || '—';
  document.getElementById('repair-time').textContent = data.estimated_repair_time || '—';

  const list = document.getElementById('defects-list');
  if (data.defects.length === 0) {
    list.innerHTML = '<div class="empty-notion"><div class="empty-notion-icon">✅</div><div style="font-weight:600; color:var(--text-main-hex);">No Surface Defects</div><div style="font-size:13px; color:var(--text-muted);">Scanned structural elements show no signs of cracks, spalling, or rust.</div></div>';
    return;
  }

  list.innerHTML = data.defects.map((d, i) => {
    const tagClass = d.severity === 'CRITICAL' ? 'tag-red' : d.severity === 'HIGH' ? 'tag-orange' : d.severity === 'MEDIUM' ? 'tag-yellow' : 'tag-green';
    return `
      <div class="notion-toggle-item">
        <div class="notion-toggle-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
          <span style="font-size: 11px; color: var(--text-muted);">▶</span>
          <span class="tag-pill ${tagClass}">${d.severity}</span>
          <span style="font-weight: 600; font-size: 13px; color: var(--text-main-hex);">${d.defect_type}</span>
          <span style="margin-left:auto; font-size: 12px; color: var(--text-muted);">${Math.round(d.confidence * 100)}% conf.</span>
        </div>
        <div class="notion-toggle-body" style="display: ${i < 3 ? 'block' : 'none'};">
          <div style="margin-bottom: 6px;"><strong>Location / Context:</strong> <span style="color: var(--text-main-hex);">${d.location}</span></div>
          <div style="margin-bottom: 6px;"><strong>Analysis Description:</strong> <span style="color: var(--text-main-hex);">${d.description}</span></div>
          <div style="margin-bottom: 8px; font-style: italic; color: var(--accent-primary);">📖 ${d.code_reference}</div>
          <div style="padding: 8px 10px; background: var(--bg-card); border-radius: var(--radius-sm); border: 1px solid var(--border);">
            <strong style="color: var(--tag-green-text);">🔧 Recommended Repair:</strong> ${d.remediation}
          </div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('m-defects').textContent = data.total_defects;
}

function drawDefectOverlays(data) {
  const img = document.getElementById('site-photo-img');
  const canvas = document.getElementById('defect-canvas');
  if (!img.naturalWidth) return;

  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const colors = { CRITICAL: '#eb5757', HIGH: '#f2994a', MEDIUM: '#f2c94c', LOW: '#6fcf97' };

  data.defects.forEach(d => {
    if (!d.bounding_box) return;
    const { x, y, w, h } = d.bounding_box;
    const bx = x * canvas.width, by = y * canvas.height;
    const bw = w * canvas.width, bh = h * canvas.height;
    const color = colors[d.severity] || '#3b82f6';

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = color + '28';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = color;
    ctx.font = 'bold 14px Inter';
    ctx.fillText(d.defect_type, bx + 4, by - 6);
  });
}

// ── Layer 3: Foresight ─────────────────────────────────────────
async function runForesight() {
  const formData = new FormData();
  formData.append('base_duration', 180);
  formData.append('base_cost', 5000000);

  try {
    const res = await fetch(`${API}/api/v1/foresight/risk`, { method: 'POST', body: formData });
    const data = await res.json();
    state.foresight = data;
    renderForesight(data);
    updateHealth();
    setLoopActive(true);
  } catch (err) {
    console.error('Foresight failed:', err);
    alert('Simulation failed: ' + err.message);
  }
}

function renderForesight(data) {
  document.getElementById('f-ontime').textContent = `${Math.round(data.on_time_probability * 100)}%`;
  document.getElementById('f-scenarios').textContent = data.risk_scenarios.length;
  document.getElementById('m-ontime').textContent = `${Math.round(data.on_time_probability * 100)}%`;

  // Gantt chart (Notion Bar style)
  const gantt = document.getElementById('gantt-chart');
  if (data.schedule_data && data.schedule_data.length > 0) {
    const maxDay = Math.max(...data.schedule_data.map(s => s.projected_end));
    gantt.innerHTML = data.schedule_data.map(s => {
      const pStart = (s.planned_start / maxDay) * 100;
      const pWidth = ((s.planned_end - s.planned_start) / maxDay) * 100;
      const aStart = (s.projected_start / maxDay) * 100;
      const aWidth = ((s.projected_end - s.projected_start) / maxDay) * 100;
      const rColor = s.risk_level === 'HIGH' ? 'var(--tag-red-text)' : s.risk_level === 'MEDIUM' ? 'var(--tag-orange-text)' : 'var(--tag-green-text)';

      return `
        <div class="gantt-row">
          <div class="gantt-label">${s.phase}</div>
          <div class="gantt-track">
            <div class="gantt-bar" style="left:${pStart}%; width:${pWidth}%; background:var(--accent-primary); opacity:0.35; border:1px solid var(--accent-primary);"></div>
            <div class="gantt-bar" style="left:${aStart}%; width:${aWidth}%; background:${rColor}; opacity:0.85; height:60%; top:20%;"></div>
          </div>
        </div>`;
    }).join('');
  }

  // Risk scenarios
  const riskEl = document.getElementById('risk-scenarios');
  riskEl.innerHTML = data.risk_scenarios.map(r => {
    const pct = Math.round(r.probability * 100);
    const tagClass = pct > 50 ? 'tag-green' : pct > 20 ? 'tag-yellow' : 'tag-red';
    return `
      <div class="notion-box" style="margin-bottom:12px; padding:14px 16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <strong style="font-size:14px; color:var(--text-main-hex);">${r.scenario}</strong>
          <span class="tag-pill ${tagClass}">${pct}% likelihood</span>
        </div>
        <div style="font-size:13px; color:var(--text-secondary); margin-bottom: 4px;">Trigger: <em>${r.trigger}</em></div>
        <div style="font-size:12px; color:var(--text-muted);">Impact: +${r.impact_days} days | +₹${(r.impact_cost/100000).toFixed(1)} Lakhs</div>
      </div>`;
  }).join('');
}

async function runOptimization() {
  try {
    const res = await fetch(`${API}/api/v1/foresight/optimize`, { method: 'POST' });
    const data = await res.json();
    renderOptimization(data);
  } catch (err) {
    alert('Optimization failed: ' + err.message);
  }
}

function renderOptimization(data) {
  const el = document.getElementById('optimization-result');
  if (data.status !== 'optimal') {
    el.innerHTML = '<div class="empty-notion"><p>Optimization infeasible</p></div>';
    return;
  }

  document.getElementById('f-savings').textContent = `${data.savings_percent}%`;

  el.innerHTML = `
    <div style="margin-bottom:16px; display:flex; gap:12px;">
      <div style="flex:1; text-align:center; padding:12px; background:var(--bg-input); border-radius:var(--radius-sm); border:1px solid var(--border);">
        <div style="font-size:11px; color:var(--text-muted);">ORIGINAL ESTIMATE</div>
        <div style="font-size:18px; font-weight:700; color:var(--tag-red-text);">₹${(data.original_cost/100000).toFixed(1)}L</div>
      </div>
      <div style="flex:1; text-align:center; padding:12px; background:var(--bg-input); border-radius:var(--radius-sm); border:1px solid var(--border);">
        <div style="font-size:11px; color:var(--text-muted);">MILP OPTIMIZED</div>
        <div style="font-size:18px; font-weight:700; color:var(--tag-green-text);">₹${(data.optimized_cost/100000).toFixed(1)}L</div>
      </div>
    </div>
    <div class="notion-table-wrapper" style="margin-bottom:0;">
      <div style="display:grid; grid-template-columns:1fr 100px 100px; padding:8px 12px; background:var(--bg-input); font-size:11px; font-weight:600; color:var(--text-muted); border-bottom:1px solid var(--border);">
        <div>PHASE TASK</div>
        <div>ORIGINAL</div>
        <div>OPTIMIZED</div>
      </div>
      ${data.resource_allocation.map(r => `
        <div style="display:grid; grid-template-columns:1fr 100px 100px; padding:10px 12px; font-size:13px; border-bottom:1px solid var(--border); align-items:center;">
          <span style="font-weight:500; color:var(--text-main-hex);">${r.task}</span>
          <span style="color:var(--text-muted);">${r.original_days}d</span>
          <span style="color:var(--tag-green-text); font-weight:600;">${r.optimized_days}d (${r.workers} workers)</span>
        </div>
      `).join('')}
    </div>
  `;
}

// ── Health Updates ─────────────────────────────────────────────
async function updateHealth() {
  try {
    const res = await fetch(`${API}/api/v1/project/health`);
    const data = await res.json();
    state.health = data;

    const score = Math.round(data.health_score);
    document.getElementById('m-health').textContent = `${score}%`;
    document.getElementById('topbar-health-pill').textContent = `Health: ${score}%`;
    document.getElementById('topbar-health-pill').className = `tag-pill ${score >= 80 ? 'tag-green' : score >= 60 ? 'tag-yellow' : 'tag-red'}`;
    
    document.getElementById('m-violations').textContent = data.active_violations;
    document.getElementById('m-defects').textContent = data.active_defects;

    if (data.feedback_loop_active) setLoopActive(true);
  } catch (err) {
    console.error('Health update failed:', err);
  }
}

function setLoopActive(active) {
  const dot = document.getElementById('loop-dot');
  const status = document.getElementById('loop-status');
  if (active) {
    dot.style.background = 'var(--tag-green-text)';
    status.textContent = 'Closed Loop Active';
    status.style.color = 'var(--tag-green-text)';
  } else {
    dot.style.background = 'var(--text-muted)';
    status.textContent = 'Closed Loop Idle';
    status.style.color = 'var(--text-secondary)';
  }
}

// ── Code Ingestion ─────────────────────────────────────────────
async function ingestCodes() {
  try {
    const res = await fetch(`${API}/api/v1/compliance/codes/ingest`, { method: 'POST' });
    const data = await res.json();
    alert(`✅ Ingested ${data.total_chunks} chunks from building codes`);
  } catch (err) {
    alert('Ingestion failed: ' + err.message);
  }
}

// ── Notion Checkbox Toggle ─────────────────────────────────────
document.querySelectorAll('.notion-checkbox').forEach(box => {
  box.addEventListener('click', () => {
    const cb = box.querySelector('input');
    cb.checked = !cb.checked;
    box.classList.toggle('checked', cb.checked);
  });
});

// ── Initialize ─────────────────────────────────────────────────
setupUpload('input-blueprint', 'upload-blueprint', 'blueprint-preview', 'blueprint-img', analyzeBlueprint);
setupUpload('input-site-photo', 'upload-site-photo', 'site-photo-preview', 'site-photo-img', analyzeDefects);

// Initial health check
updateHealth();
