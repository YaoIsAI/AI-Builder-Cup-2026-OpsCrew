import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const chapters = [
  {
    num: "01",
    numText: "CHAPTER 01 OF 05",
    title: "Visitor Isolation & DEV-04 Intake",
    desc: "Establishing an ephemeral session boundary and ingesting synthetic claim facts without credential exposure.",
    cards: [
      {
        tag: "STEP 1 · ISOLATION",
        heading: "Ephemeral Visitor Boundary",
        detail: "Authenticates an anonymous Firebase visitor session with isolated local state and strict request rate limits."
      },
      {
        tag: "STEP 2 · INTAKE",
        heading: "Synthetic DEV-04 Fixture",
        detail: "Loads a synthetic $38.00 parking claim for employee SYNTH-EMP-100 without personal employee records or confidential data."
      },
      {
        tag: "STEP 3 · NORMALIZATION",
        heading: "Deterministic Units",
        detail: "Normalizes monetary values to minor cents (3800) and marks receipt status as missing for downstream compliance rules."
      }
    ],
    activeIndex: 0
  },
  {
    num: "02",
    numText: "CHAPTER 02 OF 05",
    title: "Cloud Multi-Agent Deliberation",
    desc: "Executing 3-role consensus across Gemini 2.5 Flash on Vertex AI with live latency tracking and immutable telemetry.",
    cards: [
      {
        tag: "STEP 1 · EXTRACTOR",
        heading: "Facts Normalization",
        detail: "Structures raw expense inputs into schema-validated minor units, category taxonomy, and evidence boundaries."
      },
      {
        tag: "STEP 2 · PLANNER",
        heading: "Policy-Grounded Reasoning",
        detail: "Proposes deterministic expense handling steps without permission to execute, pay, or persist records."
      },
      {
        tag: "STEP 3 · REVIEWER",
        heading: "Adversarial Audit",
        detail: "Independently checks the proposal against business policy contracts and flags missing evidence or policy breaches."
      }
    ],
    activeIndex: 1
  },
  {
    num: "03",
    numText: "CHAPTER 03 OF 05",
    title: "Deterministic Policy Matrix",
    desc: "Zero-hallucination compliance enforcement citing clause SYN-004, with finance operator draft notices.",
    cards: [
      {
        tag: "STEP 1 · RULE SYN-004",
        heading: "Receipt Requirement",
        detail: "Strict policy rule requiring an itemized merchant receipt or signed explanation for any parking expense."
      },
      {
        tag: "STEP 2 · VERIFICATION",
        heading: "Role Attestation",
        detail: "Validates passing reviewer consensus while maintaining a fail-closed boundary against automated reimbursement."
      },
      {
        tag: "STEP 3 · OPERATOR NOTICE",
        heading: "Pre-Draft Assistance",
        detail: "Generates human-editable communication pre-draft citing policy clause SYN-004 for operator convenience."
      }
    ],
    activeIndex: 2
  },
  {
    num: "04",
    numText: "CHAPTER 04 OF 05",
    title: "Human-in-the-Loop Authorization",
    desc: "Fail-closed safety contract requiring explicit human inspection and check before committing synthetic records.",
    cards: [
      {
        tag: "STEP 1 · FAIL-CLOSED",
        heading: "Unchecked Default",
        detail: "Authorization checkbox defaults to unchecked, strictly preventing accidental or programmatic pass-through."
      },
      {
        tag: "STEP 2 · OPERATOR REVIEW",
        heading: "Plan Deliberation",
        detail: "Human operator reviews the AI consensus proposal, verifies policy citations, and deliberate actions."
      },
      {
        tag: "STEP 3 · ATOMIC COMMIT",
        heading: "Explicit Consent",
        detail: "Human check and confirm action triggers signed, immutable case creation with cryptographic audit binding."
      }
    ],
    activeIndex: 3
  },
  {
    num: "05",
    numText: "CHAPTER 05 OF 05",
    title: "Firestore Readback & Audit Parity",
    desc: "Independent GET verification confirming atomic persistence and perfect state parity across visitor sessions.",
    cards: [
      {
        tag: "STEP 1 · SEPARATE GET",
        heading: "Independent Verification",
        detail: "Success status renders ONLY after an independent round-trip read request confirms persistence in Firestore."
      },
      {
        tag: "STEP 2 · ATOMIC RECORD",
        heading: "Audit Immutability",
        detail: "Case ID, timestamp, and human approver credentials are permanently bound to the immutable audit trail."
      },
      {
        tag: "STEP 3 · STATE PARITY",
        heading: "History Reopen",
        detail: "Refreshing visitor history and reopening the case confirms zero state drift and complete lifecycle integrity."
      }
    ],
    activeIndex: 4
  }
];

function generateSlideHtml(ch) {
  const dotsHtml = [0, 1, 2, 3, 4].map(idx => {
    return idx === ch.activeIndex 
      ? '<div class="dot active"></div>' 
      : '<div class="dot"></div>';
  }).join("\n");

  const cardsHtml = ch.cards.map(c => `
    <div class="step-card">
      <div class="card-tag">${c.tag}</div>
      <div class="card-heading">${c.heading}</div>
      <div class="card-detail">${c.detail}</div>
    </div>
  `).join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1920px;
      height: 1080px;
      background: radial-gradient(circle at 50% 15%, #1e293b 0%, #0f172a 55%, #020617 100%);
      font-family: -apple-system, BlinkMacSystemFont, "Google Sans", "Segoe UI", Roboto, sans-serif;
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 120px;
      position: relative;
      overflow: hidden;
    }
    .glow-cyan {
      position: absolute; width: 750px; height: 380px; top: 8%; left: 50%;
      transform: translateX(-50%);
      background: radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, transparent 70%);
      filter: blur(55px); pointer-events: none;
    }
    .glow-indigo {
      position: absolute; width: 650px; height: 380px; bottom: 12%; right: 12%;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
      filter: blur(65px); pointer-events: none;
    }
    .chapter-badge {
      display: inline-flex; align-items: center; gap: 10px;
      padding: 8px 24px; background: rgba(30, 41, 59, 0.9);
      border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 9999px;
      font-size: 15px; font-weight: 700; color: #38bdf8;
      letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px;
    }
    .chapter-badge::before {
      content: ""; width: 8px; height: 8px; border-radius: 50%;
      background: #38bdf8; box-shadow: 0 0 10px #38bdf8;
    }
    .chapter-num {
      font-size: 20px; font-weight: 800; color: #38bdf8; letter-spacing: 3px;
      text-transform: uppercase; margin-bottom: 12px;
    }
    h1.chapter-title {
      font-size: 58px; font-weight: 800; letter-spacing: -0.5px;
      background: linear-gradient(135deg, #ffffff 40%, #38bdf8 80%, #818cf8 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      margin-bottom: 16px; text-align: center;
    }
    p.chapter-desc {
      font-size: 22px; color: #94a3b8; max-width: 1100px; text-align: center;
      line-height: 1.5; margin-bottom: 48px;
    }
    .cards-row {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; width: 100%; max-width: 1450px;
    }
    .step-card {
      background: rgba(30, 41, 59, 0.65); border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px; padding: 32px 28px; text-align: left;
      backdrop-filter: blur(14px); position: relative;
      box-shadow: 0 12px 30px rgba(0,0,0,0.3);
    }
    .step-card::before {
      content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, #38bdf8, #818cf8); border-radius: 18px 18px 0 0;
    }
    .card-tag {
      font-size: 13px; font-weight: 700; color: #38bdf8; letter-spacing: 1.5px;
      text-transform: uppercase; margin-bottom: 12px;
    }
    .card-heading {
      font-size: 21px; font-weight: 700; color: #f1f5f9; margin-bottom: 12px;
    }
    .card-detail {
      font-size: 15.5px; color: #cbd5e1; line-height: 1.55;
    }
    .footer-progress {
      margin-top: 50px; display: flex; align-items: center; gap: 16px;
    }
    .dot {
      width: 12px; height: 12px; border-radius: 50%; background: #334155;
      transition: all 0.3s ease;
    }
    .dot.active {
      width: 40px; height: 12px; border-radius: 6px; background: #38bdf8;
      box-shadow: 0 0 14px #38bdf8;
    }
  </style>
</head>
<body>
  <div class="glow-cyan"></div>
  <div class="glow-indigo"></div>

  <div class="chapter-badge">AI BUILDER CUP 2026 · SYSTEM DEMONSTRATION</div>
  <div class="chapter-num">${ch.numText}</div>
  <h1 class="chapter-title">${ch.title}</h1>
  <p class="chapter-desc">${ch.desc}</p>

  <div class="cards-row">
    ${cardsHtml}
  </div>

  <div class="footer-progress">
    ${dotsHtml}
  </div>
</body>
</html>`;
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  const outDir = path.resolve("submission/video_output/chapters");
  fs.mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const html = generateSlideHtml(ch);
    await page.setContent(html);
    const outPath = path.join(outDir, `chapter_${ch.num}_slide.png`);
    await page.screenshot({ path: outPath });
    console.log(`Rendered ${outPath}`);
  }

  await browser.close();
}

main().catch(err => {
  console.error("Error rendering chapter slides:", err);
  process.exit(1);
});
