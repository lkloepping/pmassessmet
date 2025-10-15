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
        <p style="margin:0 0 6px 0;">This assessment helps you reflect across five core areas. For each statement, choose a number from <span class="kbd">0</span> (not like me at all) to <span class="kbd">5</span> (exactly like me).</p>
        <div class="legend" style="margin-top:6px;"><span>0 Not like me</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5 Exactly like me</span></div>
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
      <button id="download-csv">Download CSV</button>
      <button id="start-over" class="ghost">Start Over</button>
    </div>
  `;

  grid.appendChild(canvasWrap);
  grid.appendChild(side);

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
    if (t.id === "download-png") downloadChartPNG(canvas);
    if (t.id === "download-csv") downloadCSV(state);
    if (t.id === "start-over") { localStorage.removeItem(STATE_KEY); render(); }
  });

  return container;
}

function getVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function downloadChartPNG(canvas) {
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = "assessment-radar.png";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
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


