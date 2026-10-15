import { chromium } from "playwright";
import path from "path";
import fs from "fs";

(async () => {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true
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
      background: radial-gradient(circle at 50% 12%, #1e293b 0%, #0f172a 45%, #020617 100%);
      font-family: -apple-system, BlinkMacSystemFont, "Google Sans", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #f8fafc;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 55px 90px 75px 90px;
    }

    .glow-cyan {
      position: absolute;
      width: 900px;
      height: 400px;
      top: 0%;
      left: 50%;
      transform: translateX(-50%);
      background: radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, rgba(56, 189, 248, 0) 70%);
      filter: blur(55px);
      z-index: 1;
      pointer-events: none;
    }
    .glow-indigo {
      position: absolute;
      width: 800px;
      height: 450px;
      top: 35%;
      left: 15%;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.14) 0%, rgba(99, 102, 241, 0) 70%);
      filter: blur(65px);
      z-index: 1;
      pointer-events: none;
    }
    .glow-emerald {
      position: absolute;
      width: 600px;
      height: 350px;
      top: 45%;
      right: 15%;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0) 70%);
      filter: blur(60px);
      z-index: 1;
      pointer-events: none;
    }

    .header-section {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .contest-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 7px 22px;
      background: rgba(30, 41, 59, 0.9);
      border: 1px solid rgba(56, 189, 248, 0.45);
      border-radius: 9999px;
      font-size: 13.5px;
      font-weight: 700;
      color: #38bdf8;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
      margin-bottom: 12px;
    }
    .contest-badge::before {
      content: "";
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 10px #38bdf8;
    }

    h1.thank-you-title {
      font-size: 56px;
      font-weight: 800;
      letter-spacing: -0.5px;
      line-height: 1.15;
      background: linear-gradient(135deg, #ffffff 30%, #38bdf8 70%, #818cf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }
    p.project-subtitle {
      font-size: 21px;
      font-weight: 400;
      color: #94a3b8;
    }
    p.project-subtitle strong {
      color: #f1f5f9;
      font-weight: 700;
    }

    /* 3 Enlarged Enterprise Pillar Cards */
    .cards-grid {
      position: relative;
      z-index: 2;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 28px;
      width: 100%;
      max-width: 1740px;
      margin: 18px 0;
    }
    .card {
      background: rgba(30, 41, 59, 0.72);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 30px 28px;
      text-align: left;
      backdrop-filter: blur(16px);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 380px;
    }
    .card::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
    }
    .card-blue::before {
      background: linear-gradient(90deg, #38bdf8, #2563eb);
    }
    .card-purple::before {
      background: linear-gradient(90deg, #a855f7, #6366f1);
    }
    .card-emerald::before {
      background: linear-gradient(90deg, #10b981, #059669);
    }

    .card-top {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 12px;
    }
    .card-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    .icon-blue { background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); }
    .icon-purple { background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.3); }
    .icon-emerald { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); }

    .card-title {
      font-size: 21px;
      font-weight: 700;
      color: #f8fafc;
    }

    .card-url-box {
      font-size: 13.5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #38bdf8;
      background: rgba(15, 23, 42, 0.75);
      padding: 9px 13px;
      border-radius: 9px;
      border: 1px solid rgba(56, 189, 248, 0.3);
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;
    }
    .card-url-box.purple {
      color: #c084fc;
      border-color: rgba(168, 85, 247, 0.3);
    }
    .card-url-box.emerald {
      color: #34d399;
      border-color: rgba(16, 185, 129, 0.3);
    }

    .card-bullets {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .card-bullets li {
      font-size: 14.5px;
      color: #cbd5e1;
      line-height: 1.5;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .card-bullets li::before {
      content: "▹";
      color: #38bdf8;
      font-size: 16px;
      line-height: 1.2;
    }
    .card-purple .card-bullets li::before { color: #a855f7; }
    .card-emerald .card-bullets li::before { color: #10b981; }

    /* Bottom KPI Bar */
    .metrics-bar {
      position: relative;
      z-index: 2;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(56, 189, 248, 0.28);
      border-radius: 16px;
      padding: 16px 48px;
      width: 100%;
      max-width: 1740px;
      box-shadow: 0 10px 28px rgba(0,0,0,0.45);
    }
    .metric {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .metric-val {
      font-size: 27px;
      font-weight: 800;
      color: #38bdf8;
      font-family: ui-monospace, monospace;
      letter-spacing: -0.5px;
    }
    .metric-val.green { color: #4ade80; }
    .metric-val.purple { color: #c084fc; }
    .metric-val.amber { color: #fbbf24; }
    .metric-label {
      font-size: 12.5px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      font-weight: 600;
    }
    .metric-divider {
      width: 1px;
      height: 36px;
      background: rgba(255, 255, 255, 0.12);
    }

    /* Footer Meta */
    .footer-meta {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      max-width: 1740px;
      font-size: 14.5px;
      color: #94a3b8;
      font-weight: 500;
    }
    .footer-meta a {
      color: #38bdf8;
      text-decoration: none;
      font-weight: 600;
    }
    .badge-live {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 14px;
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.35);
      border-radius: 9999px;
      color: #4ade80;
      font-size: 13px;
      font-weight: 600;
    }
    .badge-live::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 8px #4ade80;
    }
  </style>
</head>
<body>
  <div class="glow-cyan"></div>
  <div class="glow-indigo"></div>
  <div class="glow-emerald"></div>

  <div class="header-section">
    <div class="contest-badge">AI BUILDER CUP 2026 · OFFICIAL SUBMISSION</div>
    <h1 class="thank-you-title">Thank You for Watching!</h1>
    <p class="project-subtitle">OpsCrew: <strong>Autonomous Multi-Agent Copilot for Financial Operations</strong></p>
  </div>

  <div class="cards-grid">
    <!-- Card 1 -->
    <div class="card card-blue">
      <div>
        <div class="card-top">
          <div class="card-icon icon-blue">🚀</div>
          <div class="card-title">Live Cloud Run Production</div>
        </div>
        <div class="card-url-box">
          <span>🔗</span>
          <span>opscrew-883881551915.us-central1.run.app</span>
        </div>
        <ul class="card-bullets">
          <li><strong>Zero Client Secrets:</strong> Secret Manager backend injection; no browser API key leakage.</li>
          <li><strong>Dual-Mode Autopilot:</strong> Native Vertex AI & Gemini Flash 2.5 failover.</li>
          <li><strong>Stateless Scaling:</strong> Cloud Run autoscaling with independent container health checks.</li>
        </ul>
      </div>
    </div>

    <!-- Card 2 -->
    <div class="card card-purple">
      <div>
        <div class="card-top">
          <div class="card-icon icon-purple">🛡️</div>
          <div class="card-title">Verified Engineering Rigor</div>
        </div>
        <div class="card-url-box purple">
          <span>📦</span>
          <span>github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew</span>
        </div>
        <ul class="card-bullets">
          <li><strong>232/232 Passing Tests:</strong> Full unit, integration, and smoke test coverage.</li>
          <li><strong>Target &lt;15s SLA:</strong> ~8-12s measured deliberation replacing 48h manual backlog.</li>
          <li><strong>Deterministic Engine:</strong> Zero-hallucination SYN-001 ~ SYN-008 compliance logic.</li>
        </ul>
      </div>
    </div>

    <!-- Card 3 -->
    <div class="card card-emerald">
      <div>
        <div class="card-top">
          <div class="card-icon icon-emerald">⚖️</div>
          <div class="card-title">Fail-Closed Governance</div>
        </div>
        <div class="card-url-box emerald">
          <span>🔒</span>
          <span>Firestore Native Atomic State & Audit Ledger</span>
        </div>
        <ul class="card-bullets">
          <li><strong>Human-in-the-Loop Mandate:</strong> Strict operator confirmation; zero auto-payment.</li>
          <li><strong>$40 Monthly Budget Cap:</strong> Fail-closed token admission safeguards contest budget.</li>
          <li><strong>Cryptographic Parity:</strong> Independent GET readback guarantees data integrity.</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- Bottom KPI Bar -->
  <div class="metrics-bar">
    <div class="metric">
      <div class="metric-val green">232 / 232</div>
      <div class="metric-label">Automated Tests PASS</div>
    </div>
    <div class="metric-divider"></div>
    <div class="metric">
      <div class="metric-val">&lt; 15s</div>
      <div class="metric-label">Consensus SLA</div>
    </div>
    <div class="metric-divider"></div>
    <div class="metric">
      <div class="metric-val purple">0 AUTO-PAY</div>
      <div class="metric-label">Human-in-the-Loop</div>
    </div>
    <div class="metric-divider"></div>
    <div class="metric">
      <div class="metric-val amber">$40 CAP</div>
      <div class="metric-label">Monthly Guardrail</div>
    </div>
    <div class="metric-divider"></div>
    <div class="metric">
      <div class="metric-val green">100%</div>
      <div class="metric-label">Audit Readback Parity</div>
    </div>
  </div>

  <!-- Footer Meta -->
  <div class="footer-meta">
    <div class="badge-live">Google Cloud Run · Verified Active</div>
    <div>Production URL: <span style="color:#f8fafc; font-family:monospace;">https://opscrew-883881551915.us-central1.run.app</span></div>
    <div>AI Builder Cup 2026 Submission</div>
  </div>
</body>
</html>
  `;

  await page.setContent(html);
  const outPath = path.resolve("submission/video_output/outro_slide.png");
  await page.screenshot({ path: outPath });
  await page.screenshot({ path: path.resolve("scratch/outro_slide_v3.png") });
  console.log("Successfully rendered updated outro slide:", outPath);
  await browser.close();
})();
