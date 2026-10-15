import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const TARGET_URL = "https://opscrew-883881551915.us-central1.run.app";
const PROXY_SERVER = "http://127.0.0.1:7897";
const OUTPUT_DIR = path.resolve("submission/video_output");
const RAW_DIR = path.resolve("submission/video_output/raw_master");
const AUDIO_DIR = path.resolve("submission/video_output/eleven_audio");
const CHAP_DIR = path.resolve("submission/video_output/chapters");

if (fs.existsSync(RAW_DIR)) {
  fs.rmSync(RAW_DIR, { recursive: true, force: true });
}
fs.mkdirSync(RAW_DIR, { recursive: true });

// Subtitle texts for demo segments
const SUBTITLES = {
  ch1: "A secure visitor session is initiated. We inject synthetic exception DEV-04:\nA $38 parking expense with a missing receipt. The system prepares for autonomous analysis.",
  ch2: "A specialized multi-agent pipeline takes over: Extractor isolates facts, Planner formulates resolution,\nand adversarial Reviewer validates against corporate policy with immutable telemetry.",
  ch3: "The deliberation yields a deterministic result. Guardrail SYN-004 flags missing receipt,\nrestricting auto-reimbursement. A pre-draft notice is generated without executing payment.",
  ch4: "We enforce a strict human-in-the-loop mandate. The operator inspects the proposed plan,\nvalidates constraints, and explicitly authorizes the synthetic case record.",
  ch5: "Trust requires verification. The operator executes a separate read request directly from Firestore.\nThe case record achieves perfect audit parity, proving cryptographic consistency."
};

function formatSrtTime(ms) {
  const h = Math.floor(ms / 3600000).toString().padStart(2, "0");
  const m = Math.floor((ms % 3600000) / 60000).toString().padStart(2, "0");
  const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, "0");
  const millis = (ms % 1000).toString().padStart(3, "0");
  return `${h}:${m}:${s},${millis}`;
}

function formatVttTime(ms) {
  return formatSrtTime(ms).replace(",", ".");
}

async function recordLiveDemos() {
  console.log("=== Launching Chrome to Record Live Browser Segments ===");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    proxy: { server: PROXY_SERVER },
    args: [
      "--window-size=1920,1080",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-infobars",
      "--force-device-scale-factor=1"
    ]
  });

  const rawRecordingStartTime = Date.now();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: RAW_DIR,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();
  console.log("Loading Cloud Run app:", TARGET_URL);
  await page.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("#expense-description", { timeout: 20000 });

  // Inject top chrome bar, cursor visualizer, and bottom subtitle capsule (NO in-screen HUD toast)
  await page.evaluate(() => {
    // Top Bar
    const bar = document.createElement("div");
    bar.id = "demo-browser-chrome";
    bar.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; height: 42px;
      background: #0f172a; border-bottom: 1px solid #334155;
      z-index: 9999999; display: flex; align-items: center; padding: 0 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.25);
    `;
    bar.innerHTML = `
      <div style="display:flex; gap:6px; margin-right:16px;">
        <div style="width:12px; height:12px; border-radius:50%; background:#ef4444;"></div>
        <div style="width:12px; height:12px; border-radius:50%; background:#f59e0b;"></div>
        <div style="width:12px; height:12px; border-radius:50%; background:#10b981;"></div>
      </div>
      <div style="flex:1; max-width:520px; background:#1e293b; border-radius:6px; height:28px; display:flex; align-items:center; padding:0 12px; font-size:12px; font-family:ui-monospace, monospace; border:1px solid #475569;">
        <span style="color:#10b981; margin-right:8px; font-size:13px;">🔒</span>
        <span style="color:#f8fafc; font-weight:600;">https://opscrew-883881551915.us-central1.run.app</span>
      </div>
      <div style="flex:1; display:flex; justify-content:center;">
        <span style="color:#94a3b8; font-size:12px; font-weight:600; letter-spacing:0.5px;">AI BUILDER CUP 2026 · LIVE DEMONSTRATION</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981; box-shadow:0 0 8px #10b981;"></span>
        <span style="color:#38bdf8; font-size:11px; font-weight:600; letter-spacing:0.5px;">CLOUD RUN · PRODUCTION</span>
      </div>
    `;
    document.body.prepend(bar);
    document.body.style.paddingTop = "42px";

    // Cursor
    const cursor = document.createElement("div");
    cursor.id = "demo-mouse-cursor";
    cursor.style.cssText = `
      position: fixed; width: 20px; height: 20px;
      background: rgba(14, 165, 233, 0.85); border: 2px solid #ffffff;
      border-radius: 50%; pointer-events: none; z-index: 99999999;
      transform: translate(-50%, -50%); transition: transform 0.1s ease-out, background 0.15s ease;
      box-shadow: 0 0 12px rgba(14,165,233,0.9);
    `;
    document.body.appendChild(cursor);

    window.__updateCursor = (x, y) => {
      cursor.style.left = x + "px";
      cursor.style.top = y + "px";
    };

    window.__clickCursor = () => {
      cursor.style.transform = "translate(-50%, -50%) scale(0.75)";
      cursor.style.background = "rgba(16, 185, 129, 0.95)";
      setTimeout(() => {
        cursor.style.transform = "translate(-50%, -50%) scale(1)";
        cursor.style.background = "rgba(14, 165, 233, 0.85)";
      }, 200);
    };

    // Subtitle Capsule at bottom: 75px
    const sub = document.createElement("div");
    sub.id = "demo-subtitle-overlay";
    sub.style.cssText = `
      position: fixed; bottom: 75px; left: 50%; transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.94); color: #f8fafc; border: 2px solid rgba(56, 189, 248, 0.85);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      padding: 12px 36px; border-radius: 9999px; font-size: 16.5px; font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      text-align: center; max-width: 86%; z-index: 9999998; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.6);
      transition: opacity 0.25s ease; opacity: 0; line-height: 1.45;
    `;
    document.body.appendChild(sub);

    window.__setSubtitle = (text) => {
      if (!text) {
        sub.style.opacity = "0";
      } else {
        sub.innerText = text;
        sub.style.opacity = "1";
      }
    };
  });

  await page.waitForTimeout(600);
  const pageReadyOffsetSec = (Date.now() - rawRecordingStartTime) / 1000;
  console.log(`[Zero-Blank] Browser ready at offset: ${pageReadyOffsetSec.toFixed(3)}s`);

  const demoStartTime = Date.now();
  const getElapsedMs = () => Date.now() - demoStartTime;
  const getElapsedSec = () => (getElapsedMs() / 1000).toFixed(1);
  const logStep = (msg) => console.log(`[Demo T+${getElapsedSec()}s] ${msg}`);

  async function waitTargetTime(targetSec) {
    const elapsed = getElapsedMs() / 1000;
    const remaining = targetSec - elapsed;
    if (remaining > 0) {
      await page.waitForTimeout(remaining * 1000);
    }
  }

  async function setSubtitle(text) {
    await page.evaluate((text) => window.__setSubtitle(text), text);
  }

  async function moveCursorTo(x, y, steps = 15) {
    await page.mouse.move(x, y, { steps });
    await page.evaluate(({ x, y }) => window.__updateCursor(x, y), { x, y });
  }

  async function clickLocator(locator) {
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(150);
    const box = await locator.boundingBox();
    if (box) {
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await moveCursorTo(cx, cy);
      await page.evaluate(() => window.__clickCursor());
      await page.waitForTimeout(150);
    }
    await locator.click();
    await page.waitForTimeout(200);
  }

  async function smoothScrollTo(targetY, durationMs = 600) {
    await page.evaluate(async ({ targetY, durationMs }) => {
      const startY = window.scrollY;
      const diff = targetY - startY;
      const startTime = performance.now();
      return new Promise((resolve) => {
        function step(now) {
          const progress = Math.min((now - startTime) / durationMs, 1);
          const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
          window.scrollTo(0, startY + diff * ease);
          if (progress < 1) requestAnimationFrame(step);
          else resolve();
        }
        requestAnimationFrame(step);
      });
    }, { targetY, durationMs });
    await page.waitForTimeout(200);
  }

  // Initial cursor position
  await moveCursorTo(1450, 160);

  // ==========================================
  // CHAPTER 01 DEMO (0.0s - 14.0s)
  // ==========================================
  logStep(">>> CHAPTER 01 DEMO: Visitor Isolation & DEV-04 Intake <<<");
  await setSubtitle(SUBTITLES.ch1);

  await smoothScrollTo(720, 400);
  const sessionBtn = page.locator('button:has-text("Start visitor session")');
  await clickLocator(sessionBtn);

  await page.waitForSelector("text=Firebase visitor session", { timeout: 20000 });
  await page.waitForTimeout(300);

  await smoothScrollTo(180, 400);
  const clearBtn = page.locator('button:has-text("Clear Form")');
  await clickLocator(clearBtn);
  await page.waitForTimeout(150);

  const descLoc = page.locator("#expense-description");
  await descLoc.scrollIntoViewIfNeeded();
  const descBox = await descLoc.boundingBox();
  if (descBox) await moveCursorTo(descBox.x + 100, descBox.y + 30);
  await page.evaluate(() => window.__clickCursor());
  await descLoc.click();
  await descLoc.pressSequentially("[SYNTHETIC] Parking fee $38.00 for SYNTH-EMP-100. Receipt lost.", { delay: 18 });

  const amtLoc = page.locator("#expense-amount-usd");
  const amtBox = await amtLoc.boundingBox();
  if (amtBox) await moveCursorTo(amtBox.x + 80, amtBox.y + 15);
  await page.evaluate(() => window.__clickCursor());
  await amtLoc.click();
  await amtLoc.pressSequentially("38.00", { delay: 25 });

  const missingRadio = page.locator('label[for="receipt-status-missing"]');
  await clickLocator(missingRadio);

  const empLoc = page.locator("#employee-identifier");
  const empBox = await empLoc.boundingBox();
  if (empBox) await moveCursorTo(empBox.x + 80, empBox.y + 15);
  await page.evaluate(() => window.__clickCursor());
  await empLoc.click();
  await empLoc.pressSequentially("SYNTH-EMP-100", { delay: 25 });

  const analyzeBtn = page.locator('button:has-text("Analyze, plan & review")').first();
  await analyzeBtn.scrollIntoViewIfNeeded();
  const aBox = await analyzeBtn.boundingBox();
  if (aBox) await moveCursorTo(aBox.x + aBox.width / 2, aBox.y + aBox.height / 2);

  await waitTargetTime(14.0);

  // ==========================================
  // CHAPTER 02 DEMO (14.0s - 33.0s, duration 19.0s)
  // ==========================================
  logStep(">>> CHAPTER 02 DEMO: Cloud Multi-Agent Deliberation <<<");
  await setSubtitle(SUBTITLES.ch2);

  await clickLocator(analyzeBtn);

  try {
    await page.waitForSelector('text=Run versions and completed-step telemetry', { timeout: 60000 });
  } catch (e) {}

  await waitTargetTime(25.0);
  await smoothScrollTo(360, 400);

  const teleSummary = page.locator('summary:has-text("Run versions and completed-step telemetry")');
  await clickLocator(teleSummary);
  await page.waitForTimeout(500);

  await moveCursorTo(1150, 750);
  await page.waitForTimeout(1000);
  await moveCursorTo(1350, 750);

  await waitTargetTime(33.0);

  // ==========================================
  // CHAPTER 03 DEMO (33.0s - 50.0s, duration 17.0s)
  // ==========================================
  logStep(">>> CHAPTER 03 DEMO: Deterministic Policy Matrix <<<");
  await setSubtitle(SUBTITLES.ch3);

  await smoothScrollTo(220, 500);
  await page.waitForTimeout(300);

  const syn004Loc = page.locator('text=SYN-004').first();
  if (await syn004Loc.count() > 0) {
    const sBox = await syn004Loc.boundingBox();
    if (sBox) await moveCursorTo(sBox.x + 30, sBox.y + 10);
  }
  await page.waitForTimeout(1600);

  const passLoc = page.locator('text=PASS').first();
  if (await passLoc.count() > 0) {
    const pBox = await passLoc.boundingBox();
    if (pBox) await moveCursorTo(pBox.x + 20, pBox.y + 10);
  }
  await page.waitForTimeout(1600);

  await smoothScrollTo(440, 500);
  await moveCursorTo(1150, 530);
  await page.waitForTimeout(1800);
  await moveCursorTo(1150, 700);

  await waitTargetTime(50.0);

  // ==========================================
  // CHAPTER 04 DEMO (50.0s - 63.0s, duration 13.0s)
  // ==========================================
  logStep(">>> CHAPTER 04 DEMO: Human-in-the-Loop Authorization <<<");
  await setSubtitle(SUBTITLES.ch4);

  await smoothScrollTo(720, 400);
  const prepBtn = page.locator('button:has-text("Prepare human confirmation")');
  await clickLocator(prepBtn);
  await page.waitForTimeout(300);

  const cbLoc = page.locator('input[type="checkbox"]');
  await cbLoc.waitFor({ state: "visible", timeout: 10000 });
  const cbBox = await cbLoc.boundingBox();
  if (cbBox) await moveCursorTo(cbBox.x + 8, cbBox.y + 8);
  await page.waitForTimeout(2500); // 2.5s deliberate un-checked hover!

  await page.evaluate(() => window.__clickCursor());
  await cbLoc.check();
  await page.waitForTimeout(600);

  const confirmBtn = page.locator('button:has-text("Confirm & create synthetic case")');
  await clickLocator(confirmBtn);

  await page.waitForSelector("text=Saved case verified by independent readback", { timeout: 20000 });

  await waitTargetTime(63.0);

  // ==========================================
  // CHAPTER 05 DEMO (63.0s - 78.0s, duration 15.0s)
  // ==========================================
  logStep(">>> CHAPTER 05 DEMO: Firestore Readback & Audit Parity <<<");
  await setSubtitle(SUBTITLES.ch5);

  await smoothScrollTo(950, 500);
  const bannerLoc = page.locator('text=Saved case verified by independent readback').first();
  if (await bannerLoc.count() > 0) {
    const box = await bannerLoc.boundingBox();
    if (box) await moveCursorTo(box.x + box.width / 2, box.y + box.height / 2);
  }
  await page.waitForTimeout(1400);

  const caseIdLoc = page.locator('text=Saved case verified by independent readback').locator('..').locator('dd.font-mono').first();
  if (await caseIdLoc.count() > 0) {
    const b = await caseIdLoc.boundingBox();
    if (b) await moveCursorTo(b.x + b.width / 2, b.y + b.height / 2);
  }

  const refreshBtn = page.locator('button:has-text("Refresh history")');
  if (await refreshBtn.count() > 0) {
    await clickLocator(refreshBtn);
  }
  await page.waitForTimeout(800);

  const openBtn = page.locator('button:has-text("Open & verify case")').first();
  if (await openBtn.count() > 0) {
    await clickLocator(openBtn);
  }
  await page.waitForTimeout(1000);

  const noticeLoc = page.locator('text=Saved case verified through a separate read request');
  if (await noticeLoc.count() > 0) {
    const nBox = await noticeLoc.boundingBox();
    if (nBox) await moveCursorTo(nBox.x + 150, nBox.y + 10);
  }

  await waitTargetTime(78.0);

  logStep("All demo chapters recorded successfully. Closing browser.");
  await context.close();
  await browser.close();

  const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith(".webm"));
  if (files.length === 0) {
    throw new Error("No webm video recorded in " + RAW_DIR);
  }
  const rawFile = path.join(RAW_DIR, files[0]);
  return { rawFile, pageReadyOffsetSec };
}

function assembleAllSegments(rawFile, pageReadyOffsetSec) {
  console.log("\n=== Slicing Demo Segments and Muxing ElevenLabs Audio ===");

  const demoSegments = [
    { id: "chapter_01_demo", startSec: 0.0, durSec: 14.0, audio: "ch1_demo.wav" },
    { id: "chapter_02_demo", startSec: 14.0, durSec: 19.0, audio: "ch2_demo.wav" },
    { id: "chapter_03_demo", startSec: 33.0, durSec: 17.0, audio: "ch3_demo.wav" },
    { id: "chapter_04_demo", startSec: 50.0, durSec: 13.0, audio: "ch4_demo.wav" },
    { id: "chapter_05_demo", startSec: 63.0, durSec: 15.0, audio: "ch5_demo.wav" }
  ];

  for (const seg of demoSegments) {
    const sliceStart = pageReadyOffsetSec + seg.startSec;
    const audioPath = path.join(AUDIO_DIR, seg.audio);
    const outMp4 = path.join(CHAP_DIR, `${seg.id}.mp4`);

    console.log(`[Slice] ${seg.id}: start=${sliceStart.toFixed(2)}s, dur=${seg.durSec}s, audio=${seg.audio}`);
    execSync(
      `ffmpeg -y -ss ${sliceStart.toFixed(3)} -i "${rawFile}" -i "${audioPath}" -t ${seg.durSec.toFixed(1)} -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -r 25 -c:a aac -b:a 192k -ar 48000 -af "apad=whole_dur=${seg.durSec.toFixed(1)}" -map 0:v:0 -map 1:a:0 "${outMp4}"`,
      { stdio: "ignore" }
    );
    const actualDur = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outMp4}"`).toString().trim();
    console.log(`  -> Rendered ${seg.id}.mp4: ${actualDur}s`);
  }

  console.log("\n=== Master Timeline Assembly (12 Consecutive Clips) ===");
  // Sequence:
  // 1. part1_slides.mp4 (20.02s)
  // 2. chapter_01_slide.mp4 (4.0s)
  // 3. chapter_01_demo.mp4 (14.0s)
  // 4. chapter_02_slide.mp4 (4.0s)
  // 5. chapter_02_demo.mp4 (19.0s)
  // 6. chapter_03_slide.mp4 (4.0s)
  // 7. chapter_03_demo.mp4 (17.0s)
  // 8. chapter_04_slide.mp4 (4.0s)
  // 9. chapter_04_demo.mp4 (13.0s)
  // 10. chapter_05_slide.mp4 (4.0s)
  // 11. chapter_05_demo.mp4 (15.0s)
  // 12. part3_outro.mp4 (14.0s)

  const clipList = [
    path.join(OUTPUT_DIR, "part1_slides.mp4"),
    path.join(CHAP_DIR, "chapter_01_slide.mp4"),
    path.join(CHAP_DIR, "chapter_01_demo.mp4"),
    path.join(CHAP_DIR, "chapter_02_slide.mp4"),
    path.join(CHAP_DIR, "chapter_02_demo.mp4"),
    path.join(CHAP_DIR, "chapter_03_slide.mp4"),
    path.join(CHAP_DIR, "chapter_03_demo.mp4"),
    path.join(CHAP_DIR, "chapter_04_slide.mp4"),
    path.join(CHAP_DIR, "chapter_04_demo.mp4"),
    path.join(CHAP_DIR, "chapter_05_slide.mp4"),
    path.join(CHAP_DIR, "chapter_05_demo.mp4"),
    path.join(OUTPUT_DIR, "part3_outro.mp4")
  ];

  const concatTxt = path.join(OUTPUT_DIR, "master_concat.txt");
  fs.writeFileSync(concatTxt, clipList.map(p => `file '${p}'`).join("\n") + "\n", "utf8");

  const finalVideo = path.join(OUTPUT_DIR, "OpsCrew_Combined_Official_Demo_165s.mp4");
  console.log("Concatenating into final video:", finalVideo);
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatTxt}" -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -r 25 -c:a aac -b:a 192k -ar 48000 "${finalVideo}"`,
    { stdio: "inherit" }
  );

  const finalDur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalVideo}"`).toString().trim());
  const sha256 = execSync(`shasum -a 256 "${finalVideo}"`).toString().split(" ")[0];

  generateSubtitles(clipList);

  console.log("\n===============================================================================");
  console.log("       MASTER COMBINED DEMO VIDEO GENERATED SUCCESSFULLY!                     ");
  console.log("===============================================================================");
  console.log("Final Video File: ", finalVideo);
  console.log(`Measured Duration: ${finalDur.toFixed(2)} seconds (Strict Limit: <180s: ${finalDur < 180 ? "PASS" : "FAIL"})`);
  console.log("SHA256 Checksum:  ", sha256);
  console.log("===============================================================================\n");
}

function generateSubtitles(clipList) {
  console.log("=== Generating Complete Master Subtitles (SRT & VTT) ===");
  const entries = [
    {
      startMs: 400, endMs: 6500,
      text: "Welcome to OpsCrew. We built an autonomous multi-agent copilot\nfor the AI Builder Cup 2026."
    },
    {
      startMs: 7000, endMs: 19500,
      text: "Deployed securely on Google Cloud Run with Vertex AI and Gemini,\nOpsCrew bridges the gap between AI deliberation and enterprise policy.\nLet us observe a live production transaction."
    },
    {
      startMs: 20020 + 300, endMs: 20020 + 3600,
      text: "CHAPTER 01 OF 05\nVisitor Isolation & DEV-04 Intake"
    },
    {
      startMs: 24020 + 300, endMs: 24020 + 13000,
      text: "A secure visitor session is initiated. We inject synthetic exception DEV-04:\nA $38 parking expense with a missing receipt. The system prepares for autonomous analysis."
    },
    {
      startMs: 38020 + 300, endMs: 38020 + 3600,
      text: "CHAPTER 02 OF 05\nCloud Multi-Agent Deliberation"
    },
    {
      startMs: 42020 + 300, endMs: 42020 + 18000,
      text: "A specialized multi-agent pipeline takes over: Extractor isolates facts, Planner formulates resolution,\nand adversarial Reviewer validates against corporate policy with immutable telemetry."
    },
    {
      startMs: 61020 + 300, endMs: 61020 + 3600,
      text: "CHAPTER 03 OF 05\nDeterministic Policy Matrix"
    },
    {
      startMs: 65020 + 300, endMs: 65020 + 16000,
      text: "The deliberation yields a deterministic result. Guardrail SYN-004 flags missing receipt,\nrestricting auto-reimbursement. A pre-draft notice is generated without executing payment."
    },
    {
      startMs: 82020 + 300, endMs: 82020 + 3600,
      text: "CHAPTER 04 OF 05\nHuman-in-the-Loop Authorization"
    },
    {
      startMs: 86020 + 300, endMs: 86020 + 12000,
      text: "We enforce a strict human-in-the-loop mandate. The operator inspects the proposed plan,\nvalidates constraints, and explicitly authorizes the synthetic case record."
    },
    {
      startMs: 99020 + 300, endMs: 99020 + 3600,
      text: "CHAPTER 05 OF 05\nFirestore Readback & Audit Parity"
    },
    {
      startMs: 103020 + 300, endMs: 103020 + 14000,
      text: "Trust requires verification. The operator executes a separate read request directly from Firestore.\nThe case record achieves perfect audit parity, proving cryptographic consistency."
    },
    {
      startMs: 118020 + 500, endMs: 118020 + 13500,
      text: "OpsCrew operates with precision. Backed by 232 verified tests, a sub-15-second SLA,\nand strict $40 boundary constraints. Experience the live Cloud Run deployment today."
    }
  ];

  let srt = "";
  let vtt = "WEBVTT\n\n";

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    srt += `${i + 1}\n${formatSrtTime(e.startMs)} --> ${formatSrtTime(e.endMs)}\n${e.text}\n\n`;
    vtt += `${formatVttTime(e.startMs)} --> ${formatVttTime(e.endMs)}\n${e.text}\n\n`;
  }

  const srtFile = path.join(OUTPUT_DIR, "OpsCrew_Combined_Official_Demo_165s.srt");
  const vttFile = path.join(OUTPUT_DIR, "OpsCrew_Combined_Official_Demo_165s.vtt");
  fs.writeFileSync(srtFile, srt.trim() + "\n", "utf8");
  fs.writeFileSync(vttFile, vtt.trim() + "\n", "utf8");
  console.log("Master Subtitles generated:", srtFile, vttFile);
}

async function main() {
  const { rawFile, pageReadyOffsetSec } = await recordLiveDemos();
  assembleAllSegments(rawFile, pageReadyOffsetSec);
}

main().catch(err => {
  console.error("Recording error:", err);
  process.exit(1);
});
