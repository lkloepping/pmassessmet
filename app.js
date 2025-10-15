/* SPA for 5-page assessment (10 questions each) with 0–5 Likert, radar chart, and export */

const STATE_KEY = "assessment_state_v1";

/** @typedef {{ pages: number[][], currentPage: number, labels: string[] }} AssessmentState */

/**
 * Initialize app state. pages[pageIndex][questionIndex] => number | null (0-5)
 */
function createInitialState() {
  const pages = Array.from({ length: 5 }, () => Array(10).fill(null));
  const labels = (window.QUESTIONS && Array.isArray(window.QUESTIONS.labels) && window.QUESTIONS.labels.length === 5)
    ? window.QUESTIONS.labels
    : [
      "Dimension 1",
      "Dimension 2",
      "Dimension 3",
      "Dimension 4",
      "Dimension 5",
    ];
  return /** @type {AssessmentState} */ ({ pages, currentPage: -1, labels });
}

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    // Basic shape validation
    if (!Array.isArray(parsed.pages) || parsed.pages.length !== 5) return createInitialState();
    return parsed;
  } catch {
    return createInitialState();
  }
}

function saveState(state) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function $(sel, root = document) { return root.querySelector(sel); }

function render() {
  const app = $("#app");
  if (!app) return;
  const state = loadState();
  const view = state.currentPage === -1 ? renderCover() : (state.currentPage < 5 ? renderAssessment(state) : renderResults(state));
  app.innerHTML = "";
  app.appendChild(view);
}

function renderContainer(children) {
  const container = document.createElement("div");
  container.className = "container";
  for (const child of children) container.appendChild(child);
  return container;
}

function renderHeader(title, subtitle, progressRatio, showRestart) {
  const header = document.createElement("div");
  header.className = "header";

  const left = document.createElement("div");
  const h = document.createElement("div"); h.className = "title"; h.textContent = title;
  const s = document.createElement("div"); s.className = "subtitle"; s.textContent = subtitle;
  left.appendChild(h); left.appendChild(s);

  const right = document.createElement("div"); right.style.flex = "1"; right.style.display = "flex"; right.style.gap = "8px"; right.style.alignItems = "center";
  const prog = document.createElement("div"); prog.className = "progress"; prog.style.flex = "1";
  const bar = document.createElement("div"); bar.style.width = `${Math.round(progressRatio * 100)}%`;
  prog.appendChild(bar);
  right.appendChild(prog);
  if (showRestart) {
    const restart = document.createElement("button"); restart.className = "ghost"; restart.textContent = "Restart";
    restart.addEventListener("click", () => {
      localStorage.removeItem(STATE_KEY);
      render();
    });
    right.appendChild(restart);
  }

  header.appendChild(left);
  header.appendChild(right);
  return header;
}

function renderCover() {
  const title = "Product Manager Assessment";
  const subtitle = "Five short sections • Ten statements each • 0–5 rating scale";

  const start = document.createElement("button");
  start.className = "primary";
  start.textContent = "Begin Assessment";
  start.addEventListener("click", () => {
    const s = loadState();
    s.currentPage = 0;
    saveState(s);
    render();
  });

  const help = document.createElement("div");
  help.className = "card";
  const labels = window.QUESTIONS?.labels || ["Dimension 1","Dimension 2","Dimension 3","Dimension 4","Dimension 5"];
  help.innerHTML = `
    <div style="display:grid; gap:12px;">
      <div>
        <p style="margin:0;">This assessment helps you reflect across five core areas. For each statement, choose a number from <span class="kbd">0</span> (not like me at all) to <span class="kbd">5</span> (exactly like me).</p>
      </div>
      <div class="grid" style="gap:8px;">
        <div class="card" style="padding:12px;">
          <div style="font-weight:700; margin-bottom:6px;">How it works</div>
          <ul style="margin:0; padding-left:18px; line-height:1.6;">
            <li>5 pages, 10 statements per page</li>
            <li>Rate each statement 0–5 based on how much it reflects you</li>
            <li>See a radar chart summary at the end</li>
          </ul>
        </div>
        <div class="card" style="padding:12px;">
          <div style="font-weight:700; margin-bottom:6px;">Sections</div>
          <ul style="margin:0; padding-left:18px; line-height:1.6;">
            ${labels.map(l => `<li>${l}</li>`).join("")}
          </ul>
        </div>
        <div class="card" style="padding:12px;">
          <div style="font-weight:700; margin-bottom:6px;">Time</div>
          <p style="margin:0;">About 6–8 minutes. You can navigate back before you submit.</p>
        </div>
      </div>
      <p style="margin:0; color: var(--muted-foreground);">Your responses are stored only in your browser. You can download your results as an image and CSV.</p>
    </div>
  `;

  const footer = document.createElement("div");
  footer.className = "footer";
  footer.appendChild(start);

  return renderContainer([
    renderHeader(title, subtitle, 0, false),
    help,
    footer,
  ]);
}

function renderAssessment(state) {
  const pageIndex = state.currentPage;
  const pageTitle = `${(window.QUESTIONS?.labels?.[pageIndex]) || `Page ${pageIndex + 1}`}`;
  const subtitle = `Answer all 10 questions. Tap a number from 0–5.`;
  const progressRatio = (pageIndex) / 6; // reserve last step for results

  const grid = document.createElement("div");
  grid.className = "grid";

  const answers = state.pages[pageIndex];
  const texts = window.QUESTIONS?.pages?.[pageIndex] || Array.from({ length: 10 }, (_, i) => `Question ${i + 1}`);
  for (let i = 0; i < 10; i++) {
    const q = document.createElement("div");
    q.className = "question card";
    const label = document.createElement("div");
    label.textContent = texts[i] || `Question ${i + 1}`;
    const likert = document.createElement("div");
    likert.className = "likert";
    for (let v = 0; v <= 5; v++) {
      const pill = document.createElement("div");
      pill.className = "pill" + (answers[i] === v ? " selected" : "");
      pill.textContent = String(v);
      pill.setAttribute("role", "button");
      pill.setAttribute("tabindex", "0");
      pill.addEventListener("click", () => handleSelect(pageIndex, i, v));
      pill.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelect(pageIndex, i, v); }
      });
      likert.appendChild(pill);
    }
    q.appendChild(label);
    q.appendChild(likert);
    grid.appendChild(q);
  }

  const error = document.createElement("div");
  error.className = "error";
  error.style.display = "none";
  error.textContent = "Please answer all questions to continue.";

  const footer = document.createElement("div");
  footer.className = "footer";
  const back = document.createElement("button"); back.textContent = "Back"; back.className = "ghost";
  back.disabled = pageIndex === 0;
  back.addEventListener("click", () => {
    const s = loadState();
    s.currentPage = Math.max(0, s.currentPage - 1);
    saveState(s);
    render();
  });
  const next = document.createElement("button"); next.textContent = pageIndex === 4 ? "See Results" : "Continue"; next.className = "primary";
  next.addEventListener("click", () => {
    if (!isPageComplete(pageIndex)) { error.style.display = "block"; return; }
    const s = loadState();
    s.currentPage = s.currentPage + 1;
    saveState(s);
    render();
  });
  footer.appendChild(back);
  footer.appendChild(next);

  return renderContainer([
    renderHeader(pageTitle, subtitle, progressRatio, true),
    grid,
    error,
    footer,
  ]);
}

function handleSelect(pageIndex, questionIndex, value) {
  const s = loadState();
  s.pages[pageIndex][questionIndex] = value;
  saveState(s);
  render();
}

function isPageComplete(pageIndex) {
  const s = loadState();
  return s.pages[pageIndex].every(v => typeof v === "number");
}

function computeAverages(state) {
  // Average each page's 10 answers, result within 0–5
  return state.pages.map(arr => arr.reduce((a, b) => a + (b ?? 0), 0) / arr.length);
}

let chartInstance = null;

function renderResults(state) {
  const title = "Your Results";
  const subtitle = "Radar chart of your five dimension scores";
  const progressRatio = 1;

  const grid = document.createElement("div");
  grid.className = "results-grid";

  const canvasWrap = document.createElement("div");
  canvasWrap.className = "card";
  const canvas = document.createElement("canvas");
  canvas.width = 640; canvas.height = 480;
  canvasWrap.appendChild(canvas);

  const side = document.createElement("div");
  side.className = "card";
  const scores = computeAverages(state);
  side.innerHTML = `
    <div style="font-weight:700; margin-bottom:8px;">Scores</div>
    <div>${state.labels.map((l, i) => `<div style=\"display:flex;justify-content:space-between;margin:4px 0;\"><span>${l}</span><strong>${scores[i].toFixed(2)}</strong></div>`).join("")}</div>
    <hr style="border-color: var(--border); margin: 12px 0;" />
    <div style="display:flex; gap:8px; flex-wrap: wrap;">
      <button id="download-png" class="primary">Download Chart (PNG)</button>
      <button id="download-pdf">Download PDF Report</button>
      <button id="download-csv">Download CSV</button>
      <button id="start-over" class="ghost">Start Over</button>
    </div>
  `;

  grid.appendChild(canvasWrap);
  grid.appendChild(side);

  // Detailed Scores section (bars)
  const detailed = document.createElement("div");
  detailed.className = "card";
  detailed.innerHTML = `<div style="font-weight:700; margin-bottom:8px;">Detailed Scores</div>`;
  const list = document.createElement("div");
  list.style.display = "grid";
  list.style.gap = "8px";
  state.labels.forEach((name, i) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.gap = "12px";
    const label = document.createElement("span"); label.textContent = name; label.style.color = getVar("--foreground");
    const right = document.createElement("div"); right.style.display = "flex"; right.style.alignItems = "center"; right.style.gap = "8px";
    const bar = document.createElement("div"); bar.className = "bar"; bar.style.width = "160px";
    const fill = document.createElement("div"); fill.style.width = `${(scores[i] / 5) * 100}%`;
    bar.appendChild(fill);
    const val = document.createElement("span"); val.style.minWidth = "4rem"; val.style.textAlign = "right"; val.style.color = getVar("--primary"); val.textContent = `${scores[i].toFixed(2)} / 5.00`;
    right.appendChild(bar); right.appendChild(val);
    row.appendChild(label); row.appendChild(right);
    list.appendChild(row);
  });
  detailed.appendChild(list);

  // Analysis & Recommendations (native details/summary as lightweight accordion)
  const analysisCard = document.createElement("div");
  analysisCard.className = "card";
  const analysisTitle = document.createElement("div"); analysisTitle.style.fontWeight = "700"; analysisTitle.style.marginBottom = "8px"; analysisTitle.textContent = "Detailed Analysis & Recommendations";
  analysisCard.appendChild(analysisTitle);
  const analysisWrap = document.createElement("div"); analysisWrap.style.display = "grid"; analysisWrap.style.gap = "8px";
  state.labels.forEach((name, i) => {
    const pct = (scores[i] / 5) * 100;
    const level = pct >= 70 ? "high" : pct >= 40 ? "medium" : "low";
    const details = document.createElement("details");
    details.style.border = `1px solid ${getVar("--border-bridge") || "#e5e7eb"}`;
    details.style.borderRadius = getVar("--radius") || "10px";
    details.style.padding = "8px 12px";
    const summary = document.createElement("summary");
    summary.style.cursor = "pointer";
    summary.innerHTML = `<strong>${name}</strong> <span style="color: var(--muted-foreground);">Score: ${scores[i].toFixed(2)} / 5.00</span>`;
    const body = document.createElement("div"); body.style.marginTop = "8px";
    
    // Get analysis data from window.ANALYSIS
    const analysisData = window.ANALYSIS?.[name]?.[level];
    const description = analysisData?.description || `Analysis for ${name} (${level} level)`;
    const improvement = analysisData?.improvement || `Improvement suggestions for ${name}`;
    const strengths = analysisData?.strengths || `Strengths in ${name}`;
    
    body.innerHTML = `
      <div style="margin-bottom:8px;">
        <div style="margin-bottom:6px; color: var(--foreground); font-weight: 600;">Analysis</div>
        <p style="color: var(--muted-foreground); margin: 0 0 8px 0;">${description}</p>
      </div>
      <div style="margin-bottom:8px;">
        <div style="margin-bottom:6px; color: var(--foreground); font-weight: 600;">Areas for Growth</div>
        <p style="color: var(--muted-foreground); margin: 0 0 8px 0;">${improvement}</p>
      </div>
      <div style="margin-bottom:8px;">
        <div style="margin-bottom:6px; color: var(--foreground); font-weight: 600;">Strengths</div>
        <p style="color: var(--muted-foreground); margin: 0;">${strengths}</p>
      </div>
      <div class="bar" style="margin-top:8px; width: 220px;"><div style="width:${pct}%"></div></div>`;
    details.appendChild(summary); details.appendChild(body);
    analysisWrap.appendChild(details);
  });
  analysisCard.appendChild(analysisWrap);

  const footer = document.createElement("div");
  footer.className = "footer";
  const back = document.createElement("button"); back.textContent = "Back"; back.className = "ghost";
  back.addEventListener("click", () => {
    const s = loadState();
    s.currentPage = 4;
    saveState(s);
    render();
  });
  footer.appendChild(back);

  const container = renderContainer([
    renderHeader(title, subtitle, progressRatio, true),
    grid,
    detailed,
    analysisCard,
    footer,
  ]);

  // Instantiate radar chart after it is in the DOM
  setTimeout(() => {
    if (typeof Chart === "undefined" || !canvas) {
      const fallback = document.createElement("div");
      fallback.className = "card";
      fallback.textContent = "Unable to load chart library. Please check your connection and try again.";
      canvas.parentElement?.appendChild(fallback);
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: "radar",
      data: {
        labels: state.labels,
        datasets: [{
          label: "Score",
          data: scores,
          borderColor: getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
          backgroundColor: "rgba(91, 141, 239, 0.25)",
          pointBackgroundColor: "#fff",
        }]
      },
      options: {
        responsive: true,
        scales: {
          r: {
            beginAtZero: true,
            min: 0,
            max: 5,
            ticks: { stepSize: 1, color: getVar("--muted") },
            grid: { color: "#1e2230" },
            angleLines: { color: "#1e2230" },
            pointLabels: { color: getVar("--text") }
          }
        },
        plugins: { legend: { display: false } }
      }
    });
  }, 0);

  container.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.id === "download-png") downloadChartPNG(canvas, state.labels, scores);
    if (t.id === "download-pdf") downloadPDF(canvas, state.labels, scores);
    if (t.id === "download-csv") downloadCSV(state);
    if (t.id === "start-over") { localStorage.removeItem(STATE_KEY); render(); }
  });

  return container;
}

function getVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function downloadChartPNG(chartCanvas, labels, scores) {
  const padding = 24;
  const rowHeight = 24;
  const headerHeight = 28;
  const analysisHeight = 120; // Height for analysis section
  const tableRows = labels.length;
  const tableHeight = headerHeight + tableRows * rowHeight + padding;
  const width = Math.max(chartCanvas.width, 800);
  const height = chartCanvas.height + tableHeight + analysisHeight + padding * 3;

  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d");
  if (!ctx) return;

  // Background
  ctx.fillStyle = getVar("--card") || "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Draw chart centered
  const chartX = Math.floor((width - chartCanvas.width) / 2);
  ctx.drawImage(chartCanvas, chartX, padding);

  // Scores table
  const tableY = chartCanvas.height + padding * 1.5;
  ctx.fillStyle = getVar("--foreground") || "#111827";
  ctx.font = "600 18px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  ctx.fillText("Detailed Scores", padding, tableY);

  // Header line
  ctx.strokeStyle = getVar("--border") || "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, tableY + 8);
  ctx.lineTo(width - padding, tableY + 8);
  ctx.stroke();

  // Score rows
  const labelX = padding;
  const scoreX = width - padding;
  ctx.font = "400 16px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  for (let i = 0; i < labels.length; i++) {
    const y = tableY + 8 + headerHeight + i * rowHeight;
    ctx.fillStyle = getVar("--foreground") || "#111827";
    ctx.fillText(labels[i], labelX, y);
    const scoreText = String(scores[i].toFixed(2));
    const metrics = ctx.measureText(scoreText);
    ctx.fillText(scoreText, scoreX - metrics.width, y);
  }

  // Analysis section
  const analysisY = tableY + tableHeight + padding;
  ctx.font = "600 18px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  ctx.fillText("Key Insights", padding, analysisY);

  // Add top 3 insights
  const insights = labels.map((label, i) => {
    const pct = (scores[i] / 5) * 100;
    const level = pct >= 70 ? "high" : pct >= 40 ? "medium" : "low";
    const analysisData = window.ANALYSIS?.[label]?.[level];
    return {
      label,
      score: scores[i],
      level,
      insight: analysisData?.description || `Analysis for ${label}`
    };
  }).sort((a, b) => b.score - a.score).slice(0, 3);

  ctx.font = "400 14px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  let currentY = analysisY + 30;
  insights.forEach((insight, i) => {
    ctx.fillStyle = getVar("--foreground") || "#111827";
    ctx.fillText(`${i + 1}. ${insight.label} (${insight.score.toFixed(2)}/5)`, padding, currentY);
    currentY += 20;
    
    // Wrap text for insight
    const words = insight.insight.split(' ');
    let line = '';
    let lineY = currentY;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > width - padding * 2 && n > 0) {
        ctx.fillStyle = getVar("--muted-foreground") || "#6b7280";
        ctx.fillText(line, padding, lineY);
        line = words[n] + ' ';
        lineY += 16;
      } else {
        line = testLine;
      }
    }
    ctx.fillStyle = getVar("--muted-foreground") || "#6b7280";
    ctx.fillText(line, padding, lineY);
    currentY = lineY + 25;
  });

  const url = out.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = "assessment-complete-report.png";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function downloadPDF(chartCanvas, labels, scores) {
  if (typeof window.jspdf === 'undefined') {
    alert('PDF library not loaded. Please refresh and try again.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Product Manager Assessment Results', margin, margin + 10);

  // Date
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, margin + 20);

  // Chart (convert canvas to image)
  const chartDataURL = chartCanvas.toDataURL('image/png');
  const chartWidth = Math.min(contentWidth, 150);
  const chartHeight = (chartCanvas.height / chartCanvas.width) * chartWidth;
  doc.addImage(chartDataURL, 'PNG', margin, margin + 30, chartWidth, chartHeight);

  // Scores table
  let currentY = margin + 30 + chartHeight + 20;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Detailed Scores', margin, currentY);
  currentY += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  labels.forEach((label, i) => {
    const score = scores[i].toFixed(2);
    doc.text(`${label}: ${score}/5.00`, margin, currentY);
    currentY += 8;
  });

  // Analysis sections
  currentY += 10;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Detailed Analysis & Recommendations', margin, currentY);
  currentY += 15;

  labels.forEach((label, i) => {
    // Check if we need a new page
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = margin;
    }

    const score = scores[i];
    const pct = (score / 5) * 100;
    const level = pct >= 70 ? "high" : pct >= 40 ? "medium" : "low";
    const analysisData = window.ANALYSIS?.[label]?.[level];

    // Section header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${label} (${score.toFixed(2)}/5.00)`, margin, currentY);
    currentY += 8;

    // Analysis
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Analysis:', margin, currentY);
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    const analysisText = analysisData?.description || `Analysis for ${label}`;
    const analysisLines = doc.splitTextToSize(analysisText, contentWidth);
    doc.text(analysisLines, margin, currentY);
    currentY += analysisLines.length * 5 + 5;

    // Areas for Growth
    doc.setFont('helvetica', 'bold');
    doc.text('Areas for Growth:', margin, currentY);
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    const improvementText = analysisData?.improvement || `Improvement suggestions for ${label}`;
    const improvementLines = doc.splitTextToSize(improvementText, contentWidth);
    doc.text(improvementLines, margin, currentY);
    currentY += improvementLines.length * 5 + 5;

    // Strengths
    doc.setFont('helvetica', 'bold');
    doc.text('Strengths:', margin, currentY);
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    const strengthsText = analysisData?.strengths || `Strengths in ${label}`;
    const strengthsLines = doc.splitTextToSize(strengthsText, contentWidth);
    doc.text(strengthsLines, margin, currentY);
    currentY += strengthsLines.length * 5 + 15;
  });

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 30, pageHeight - 10);
  }

  doc.save('assessment-complete-report.pdf');
}

function downloadCSV(state) {
  const scores = computeAverages(state);
  const rows = [
    ["Dimension", "Score"],
    ...state.labels.map((l, i) => [l, scores[i].toFixed(2)])
  ];
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "assessment-scores.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Initial render
window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  if (params.get("reset") === "1") {
    localStorage.removeItem(STATE_KEY);
  }
  render();
});


