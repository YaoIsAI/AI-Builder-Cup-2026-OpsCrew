import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "../server.ts";
import { verifyPolicyCitations } from "../src/domain/policy.ts";
import { validateExpenseFacts, validateVersionBinding } from "../src/domain/contracts.ts";
import { validatePreparedConfirmation } from "../src/lib/case-client.ts";
import { PROMPT_VERSIONS, WORKFLOW_ABORT_TIMEOUT_MS } from "../server/runtime-config.ts";

// Opt-in real-resource acceptance (G3 local / G4 cloud). It needs:
//   --live                         explicit consent for one real Gemini call
//   --base-url URL                 test a deployed URL instead of a local server
//   GEMINI_API_KEY                 server-side key in the process environment
//   FIREBASE_PROJECT_ID / FIREBASE_WEB_API_KEY / FIREBASE_AUTH_DOMAIN / FIREBASE_WEB_APP_ID
//   OPSCREW_FIREBASE_MODE=firestore (set here; the server rejects emulator-less demo ids)
// The runner stores no tokens: the anonymous idToken lives only in process memory.

const appDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectId = process.env.FIREBASE_PROJECT_ID?.trim() ?? "";
const webApiKey = process.env.FIREBASE_WEB_API_KEY?.trim() ?? "";
const args = process.argv.slice(2);
const live = args.includes("--live");
const baseUrlIndex = args.indexOf("--base-url");
const baseUrl = baseUrlIndex >= 0 ? args[baseUrlIndex + 1]?.replace(/\/$/, "") : undefined;
const outputIndex = args.indexOf("--output");
const outputArg = outputIndex >= 0 ? args[outputIndex + 1] : undefined;

function fail(message) { console.error(`REFUSED: ${message}`); process.exit(1); }
if (!live) fail("No real call was made. Pass --live to run one bounded real Gemini workflow.");
if (!projectId || !webApiKey) fail("FIREBASE_PROJECT_ID and FIREBASE_WEB_API_KEY must be in the environment.");
if (webApiKey.startsWith("AQ.") || webApiKey === projectId) fail("FIREBASE_WEB_API_KEY looks wrong.");
if (baseUrl && !/^https:\/\/[a-z0-9.-]+\.run\.app$/.test(baseUrl)) fail("--base-url must be the https *.run.app deployment URL.");

function redact(value) {
  const text = JSON.stringify(value, null, 2) ?? "null";
  return text
    .replace(new RegExp(process.env.GEMINI_API_KEY?.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") ?? "(?!x)x", "g"), "[REDACTED_KEY]")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[REDACTED_KEY]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, "[REDACTED_ID_TOKEN]");
}
function uidHash(uid) { return createHash("sha256").update(`${projectId}:${uid}`).digest("hex").slice(0, 16); }
const startedWall = Date.now();

let ownedServer;
async function startLocalServer() {
  process.env.OPSCREW_FIREBASE_MODE ??= "firestore";
  const app = createApp({ apiKeyOverride: process.env.GEMINI_API_KEY?.trim() });
  await new Promise((res, rej) => { ownedServer = app.listen(0, "127.0.0.1", res); ownedServer.once("error", rej); });
  return `http://127.0.0.1:${ownedServer.address().port}`;
}
process.on("exit", () => { try { ownedServer?.closeAllConnections(); ownedServer?.close(); } catch {} });

async function signUpAnonymous() {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(webApiKey)}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ returnSecureToken: true }),
  });
  const body = await response.json();
  assert.equal(body.error?.message ?? null, null, `Anonymous sign-up failed: ${body.error?.message ?? response.status}`);
  assert(typeof body.idToken === "string" && body.idToken.length > 20, "signUp did not return an idToken");
  return { uid: body.localId, idToken: body.idToken };
}

async function api(base, path, session, options = {}) {
  const response = await fetch(`${base}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(session ? { Authorization: `Bearer ${session.idToken}` } : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    signal: AbortSignal.timeout(120_000),
  });
  const contentType = response.headers.get("content-type") ?? "";
  assert.match(contentType, /application\/json/, `GET ${path} must answer JSON, saw ${contentType || "none"}`);
  const payload = await response.json();
  return { status: response.status, payload };
}

const INTAKE = {
  description: "[SYNTHETIC] Out-of-pocket municipal parking fee in Seattle during a client workshop ($38.00 USD). Thermal paper receipt faded and is unreadable.",
  amount_usd: "38.00", receipt_status: "missing", employee_identifier: "SYNTH-EMP-3310",
};

const checks = [];
function check(name, run) { checks.push({ name, outcome: run ? "PASS" : "FAIL" }); return run; }

async function main() {
  const base = baseUrl ?? await startLocalServer();
  const started = new Date().toISOString();
  const evidence = { schema_version: "1.0.0", stage: "G3/G4", mode: baseUrl ? "real-cloud-end-to-end" : "real-identity-local-server",
    target: base, project_id: projectId, started_at: started, requested_model_id: process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite",
    prompt_versions: PROMPT_VERSIONS, workflow_limit_ms: WORKFLOW_ABORT_TIMEOUT_MS, records: {} };

  // 1. Real anonymous identity through the real Identity Toolkit.
  const session = await signUpAnonymous();
  evidence.records.identity = { uid_hash: uidHash(session.uid), token_issued: true };

  // 2. One real Gemini-backed workflow bound to the verified identity.
  const workflowStarted = Date.now();
  const { payload: workflow } = await api(base, "/api/workflow", session, { method: "POST", body: { ...INTAKE, model_id: evidence.requested_model_id } });
  evidence.records.workflow = { ok: workflow.ok, http: workflow.http_status, duration_ms: Date.now() - workflowStarted,
    model_id: workflow.model_id, status: workflow.workflow?.status ?? null, branch: workflow.workflow?.decision?.branch ?? null,
    steps: (workflow.steps ?? []).map((step) => ({ role: step.role, attempt: step.attempt, outcome: step.outcome, upstream: step.upstream_status, tokens: step.token_usage?.total_tokens ?? null })) };
  assert.equal(workflow.ok, true, "workflow did not succeed");
  assert.equal(workflow.workflow.status, "REVIEWABLE", "expected a REVIEWABLE evidence-request run");
  assert.equal(workflow.workflow.decision.branch, "EVIDENCE_REQUEST");
  assert.equal(workflow.workflow.execution_authorized, false);
  const binding = validateVersionBinding(workflow.workflow.binding);
  check("real workflow bound to verified owner", binding.owner_id === session.uid && binding.run_id === workflow.run_id);

  // 3. Prepare the human confirmation and inspect the exact preview.
  const { payload: prepared } = await api(base, `/api/runs/${encodeURIComponent(binding.run_id)}/confirmation`, session,
    { method: "POST", body: { binding: workflow.workflow.binding } });
  const confirmation = validatePreparedConfirmation(prepared.confirmation, workflow.workflow.binding);
  evidence.records.confirmation = { approval_id_prefix: confirmation.approval_id.slice(0, 12), expires_at: confirmation.expires_at,
    input_digest_prefix: confirmation.input_digest.slice(0, 12), plan_digest_prefix: confirmation.plan_digest.slice(0, 12) };
  check("confirmation preview binds current plan", confirmation.binding.plan_id === binding.plan_id);

  // 4. Explicit human confirmation commits one case.
  const command = { approval_id: confirmation.approval_id, binding: confirmation.binding, idempotency_key: `g3-${randomUUID()}`, confirmed: true };
  const { payload: commit } = await api(base, "/api/cases", session, { method: "POST", body: command });
  assert.equal(commit.ok, true, "commit did not succeed");
  assert.equal(commit.committed, true);
  evidence.records.commit = { case_id: commit.case_id, replayed: commit.replayed };

  // 5. Independent readback proves durable storage.
  const { payload: readback } = await api(base, `/api/cases/${encodeURIComponent(commit.case_id)}`, session);
  assert.equal(readback.verified, true);
  const savedCase = readback.case;
  evidence.records.case = { case_id: savedCase.case_id, case_type: savedCase.case_type, amount_minor: savedCase.amount_minor,
    employee_identifier: savedCase.employee_identifier, synthetic: savedCase.synthetic, status: savedCase.status, created_at: savedCase.created_at,
    citation_ids: savedCase.citations.map((citation) => citation.clause_id) };
  check("readback matches confirmed plan", savedCase.case_id === commit.case_id && savedCase.amount_minor === 3800
    && savedCase.employee_identifier === "SYNTH-EMP-3310" && savedCase.synthetic === true);
  check("citations are genuine policy clauses", (() => { try { verifyPolicyCitations(savedCase.citations); return true; } catch { return false; } })());

  // 6. Exact replay is idempotent: same case, no duplicate.
  const { payload: replay } = await api(base, "/api/cases", session, { method: "POST", body: command });
  check("replay returns the same committed case", replay.case_id === commit.case_id && replay.replayed === true);

  // 7. Another real identity cannot read the case (owner isolation on real data).
  const stranger = await signUpAnonymous();
  const { status: strangerStatus } = await api(base, `/api/cases/${encodeURIComponent(commit.case_id)}`, stranger);
  check("cross-owner read is not found", strangerStatus === 404);
  evidence.records.isolation = { stranger_status: strangerStatus, stranger_uid_hash: uidHash(stranger.uid) };

  evidence.ok = checks.every((item) => item.outcome === "PASS") && checks.length > 0;
  evidence.checks = checks;
  evidence.finished_at = new Date().toISOString();
  evidence.elapsed_ms = Date.now() - startedWall;
  evidence.real_gemini_calls = 1;
  evidence.note = baseUrl
    ? "Real anonymous identity, real Gemini workflow, real Firestore commit and readback against the deployed public service."
    : "Real anonymous identity, real Gemini workflow, real Firestore commit and readback against a local server. Cloud URL checks remain separate.";
  evidence.failed = checks.filter((item) => item.outcome === "FAIL").length;
  evidence.passed = checks.filter((item) => item.outcome === "PASS").length;
  if (baseUrl) evidence.checks.push({ name: "signed-out public entry serves the app", outcome: (await fetch(base)).ok ? "PASS" : "FAIL" });

  if (outputArg) {
    const docsDirectory = resolve(appDirectory, "../docs/acceptance");
    const canonical = await realpath(docsDirectory);
    const target = resolve(canonical, outputArg.replace(/^.*[\\/]/, ""));
    if (!target.startsWith(canonical)) fail("output must stay inside docs/acceptance");
    await writeFile(target, `${redact(evidence)}\n`, { encoding: "utf8", flag: "wx" });
    console.log(`evidence: ${target}`);
  }
  console.log(JSON.stringify({ ok: evidence.ok, passed: evidence.passed, failed: evidence.failed, case_id: evidence.records.case?.case_id ?? null }));
  if (!evidence.ok) process.exitCode = 1;
}

main()
  .catch((error) => { console.error(redact({ error: error instanceof Error ? error.message : String(error) })); process.exitCode = 1; })
  .finally(() => { try { ownedServer?.closeAllConnections(); ownedServer?.close(); } catch {} });
