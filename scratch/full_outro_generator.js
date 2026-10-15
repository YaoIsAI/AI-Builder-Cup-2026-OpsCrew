node -e '
const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1920px;
      height: 1080px;
      background: radial-gradient(circle at 50% 15%, #1e293b 0%, #0f172a 55%, #020617 100%);
      font-family: -apple-system, BlinkMacSystemFont, "Google Sans", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #f8fafc;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 60px 80px 0 80px;
    }

    .glow-cyan {
      position: absolute;
      width: 700px;
      height: 350px;
      top: 5%;
      left: 50%;
      transform: translateX(-50%);
      background: radial-gradient(circle, rgba(56, 189, 248, 0.16) 0%, rgba(56, 189, 248, 0) 70%);
      filter: blur(45px);
      z-index: 1;
      pointer-events: none;
    }
    .glow-indigo {
      position: absolute;
      width: 800px;
      height: 400px;
      top: 45%;
      left: 10%;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0) 70%);
      filter: blur(55px);
      z-index: 1;
      pointer-events: none;
    }

    .content {
      position: relative;
      z-index: 2;
      width: 100%;
      max-width: 1620px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      height: 800px;
    }

    .contest-badge {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 8px 24px;
      background: rgba(30, 41, 59, 0.85);
      border: 1px solid rgba(56, 189, 248, 0.4);
      border-radius: 9999px;
      font-size: 16px;
      font-weight: 600;
      color: #38bdf8;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      margin-bottom: 20px;
    }
    .contest-badge::before {
      content: "";
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 12px #38bdf8;
    }

    h1.thank-you-title {
      font-size: 64px;
      font-weight: 800;
      letter-spacing: -0.5px;
      line-height: 1.15;
      background: linear-gradient(135deg, #ffffff 30%, #38bdf8 70%, #818cf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 12px;
    }
    p.project-subtitle {
      font-size: 24px;
      font-weight: 400;
      color: #94a3b8;
      margin-bottom: 50px;
    }
    p.project-subtitle strong {
      color: #e2e8f0;
      font-weight: 600;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
      width: 100%;
      margin-bottom: 50px;
    }
    .card {
      background: rgba(30, 41, 59, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 32px;
      text-align: left;
      backdrop-filter: blur(12px);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 280px;
    }
    .card::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #38bdf8, #818cf8);
    }
    .card-icon {
      font-size: 32px;
      margin-bottom: 16px;
      display: inline-block;
    }
    .card-title {
      font-size: 22px;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 12px;
    }
    .card-url {
      font-size: 15px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #38bdf8;
      background: rgba(15, 23, 42, 0.7);
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid rgba(56, 189, 248, 0.25);
      display: inline-block;
      margin-bottom: 16px;
      word-break: break-all;
    }
    .card-desc {
      font-size: 16px;
      color: #cbd5e1;
      line-height: 1.5;
      flex: 1;
    }

    .metrics-bar {
      display: flex;
      justify-content: center;
      gap: 60px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(56, 189, 248, 0.2);
      border-radius: 16px;
      padding: 24px 48px;
      margin-bottom: 50px;
      width: 100%;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }
    .metric {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .metric-val {
      font-size: 32px;
      font-weight: 800;
      color: #38bdf8;
      font-family: ui-monospace, monospace;
    }
    .metric-label {
      font-size: 14px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }

    .footer-meta {
      display: flex;
      align-items: center;
      gap: 32px;
      font-size: 18px;
      color: #64748b;
      font-weight: 500;
      margin-top: auto;
    }
    .footer-meta span {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge-live {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 9999px;
      color: #4ade80;
      font-size: 14px;
      font-weight: 600;
    }
    .badge-live::before {
      content: "";
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4ade80;
    }
  </style>
</head>
<body>
  <div class="glow-cyan"></div>
  <div class="glow-indigo"></div>

  <div class="content">
    <div class="contest-badge">AI Builder Cup 2026 · Official Submission</div>

    <h1 class="thank-you-title">Thank You for Watching!</h1>
    <p class="project-subtitle">
      <strong>OpsCrew</strong>: Autonomous Multi-Agent Expense Copilot with Deterministic Enterprise Safety
    </p>

    <div class="cards-grid">
      <div class="card">
        <div class="card-icon">🚀</div>
        <div class="card-title">Live Cloud Production</div>
        <div class="card-url">opscrew-883881551915.us-central1.run.app</div>
        <div class="card-desc">
          Deployed on Google Cloud Run with 100% active traffic, atomic Firestore persistence, and Firebase Auth visitor sessions.
        </div>
      </div>

      <div class="card">
        <div class="card-icon">🤖</div>
        <div class="card-title">Dual-Mode AI Architecture</div>
        <div class="card-url">Vertex AI Agent Platform & Gemini API</div>
        <div class="card-desc">
          Keyless ADC IAM integration with Gemini 2.5 Flash on Vertex AI, with seamless fallback to Gemini Developer API.
        </div>
      </div>

      <div class="card">
        <div class="card-icon">🛡️</div>
        <div class="card-title">Zero-Trust Enterprise Safety</div>
        <div class="card-url">SYN-001 ~ SYN-008 Rules · Fail-Closed</div>
        <div class="card-desc">
          Deterministic policy validation, 3-agent separation (Facts, Planner, Reviewer), and mandatory human confirmation.
        </div>
      </div>
    </div>

    <div class="metrics-bar">
      <div class="metric">
        <div class="metric-val">232</div>
        <div class="metric-label">Automated Tests</div>
      </div>
      <div class="metric">
        <div class="metric-val"><15s</div>
        <div class="metric-label">Target SLA</div>
      </div>
      <div class="metric">
        <div class="metric-val">100%</div>
        <div class="metric-label">Audit Parity</div>
      </div>
      <div class="metric">
        <div class="metric-val">Fail-Closed</div>
        <div class="metric-label">Access Control</div>
      </div>
    </div>

    <div class="footer-meta">
      <span class="badge-live">LIVE IN PRODUCTION</span>
      <span>•</span>
      <span>Built in Google AI Studio</span>
      <span>•</span>
      <span>Team OpsCrew · 2026</span>
    </div>
  </div>
</body>
</html>
  `;

  await page.setContent(html);
  await page.waitForTimeout(200);
  const outPath = path.resolve("scratch/outro_slide.png");
  await page.screenshot({ path: outPath, type: "png" });
  console.log("Rendered compact outro slide to:", outPath);
  await browser.close();
})();
'
