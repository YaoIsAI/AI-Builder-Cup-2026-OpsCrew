import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { open, realpath } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyPolicyCitations } from "../src/domain/policy.ts";
import { validateVersionBinding } from "../src/domain/contracts.ts";
import { validatePreparedConfirmation, verifyIndependentCase } from "../src/lib/case-client.ts";
import { PROMPT_VERSIONS, WORKFLOW_ABORT_TIMEOUT_MS } from "../server/runtime-config.ts";

// --live opts into one synthetic workflow (up to six provider attempts), two
// anonymous identities and a real case write. Importing this module makes no requests.
// Private Cloud Run IAM and Firebase visitor tokens remain separate and in memory.
const appDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INTAKE = Object.freeze({
  description: "[SYNTHETIC] Out-of-pocket municipal parking fee in Seattle during a client workshop ($38.00 USD). Thermal paper receipt faded and is unreadable.",
  amount_usd: "38.00", receipt_status: "missing", employee_identifier: "SYNTH-EMP-3310",
});
const TIMEOUTS = Object.freeze({identity: 20_000, api: 20_000, workflow: 120_000, entry: 10_000, total: 240_000});

export function parseRunnerArgs(argv) {
  const result = {live: false, baseUrl: undefined, output: undefined};
  const seen = new Set();
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (!["--live", "--base-url", "--output"].includes(flag) || seen.has(flag)) throw new Error("Unknown or duplicate acceptance option.");
    seen.add(flag);
    if (flag === "--live") {result.live = true; continue;}
    const value = argv[++index];
    if (!value || value.startsWith("--")) throw new Error(flag + " requires a value; no real operation was made.");
    if (flag === "--base-url") {
      if (!/^https:\/\/[a-z0-9.-]+\.run\.app\/?$/.test(value)) throw new Error("--base-url must be an https *.run.app URL.");
      result.baseUrl = value.replace(/\/$/, "");
    } else {
      if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*\.json$/.test(value) || value.includes("..")) throw new Error("--output must be a new JSON basename inside docs/acceptance.");
      result.output = value;
    }
  }
  if (!result.live) throw new Error("REFUSED: --live is required for real identities, a workflow and a synthetic case write.");
  return result;
}
export function redactEvidence(value, secrets = []) {
  let text = JSON.stringify(value, null, 2) ?? "null";
  for (const secret of secrets) if (typeof secret === "string" && secret.trim()) text = text.split(secret.trim()).join("[REDACTED_CREDENTIAL]");
  return text.replace(/AIza[0-9A-Za-z_-]{20,}/g, "[REDACTED_KEY]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, "[REDACTED_ID_TOKEN]");
}
export function summarizeEvidence(evidence) {
  evidence.passed = evidence.checks.filter((item) => item.outcome === "PASS").length;
  evidence.failed = evidence.checks.filter((item) => item.outcome === "FAIL").length;
  evidence.ok = evidence.passed > 0 && evidence.failed === 0 && !evidence.error;
  return evidence;
}
async function startLocalServer() {
  process.env.OPSCREW_FIREBASE_MODE = "firestore";
  const {createApp} = await import("../server.ts");
  const app = createApp({apiKeyOverride: process.env.GEMINI_API_KEY?.trim()});
  let server;
  await new Promise((res, rej) => {server = app.listen(0, "127.0.0.1", res); server.once("error", rej);});
  return {base: "http://127.0.0.1:" + server.address().port, close: () => {server.closeAllConnections(); server.close();}};
}

export async function runAcceptance({
  argv = process.argv.slice(2), env = process.env, fetchImpl = fetch,
  outputDirectory = resolve(appDirectory, "../docs/acceptance"),
  localServerFactory = startLocalServer, timeouts = {},
} = {}) {
  const options = parseRunnerArgs(argv);
  const projectId = env.FIREBASE_PROJECT_ID?.trim() ?? "";
  const webApiKey = env.FIREBASE_WEB_API_KEY?.trim() ?? "";
  const platformToken = env.OPSCREW_CLOUD_RUN_ID_TOKEN?.trim() ?? "";
  if (!projectId || !webApiKey || projectId.startsWith("demo-")) throw new Error("Real Firebase project ID and a separate Firebase web API key are required.");
  if (webApiKey.startsWith("AQ.") || webApiKey === projectId || webApiKey === env.GEMINI_API_KEY?.trim()) throw new Error("Firebase web configuration must be separate from the model secret.");
  if (!options.baseUrl && (!env.GEMINI_API_KEY?.trim() || env.FIREBASE_AUTH_EMULATOR_HOST || env.FIRESTORE_EMULATOR_HOST || env.OPSCREW_FIREBASE_MODE && env.OPSCREW_FIREBASE_MODE !== "firestore")) throw new Error("Local real acceptance needs a Gemini key and Firestore mode without emulator routing.");
  if (platformToken && !options.baseUrl) throw new Error("A private Cloud Run token requires --base-url.");
  const limits = Object.fromEntries(Object.entries(TIMEOUTS).map(([name, maximum]) => [name, Math.min(maximum, Math.max(1, timeouts[name] ?? maximum))]));
  const startedWall = Date.now(), secrets = [env.GEMINI_API_KEY, webApiKey, platformToken];
  const uidHash = (uid) => createHash("sha256").update(projectId + ":" + uid).digest("hex").slice(0, 16);
  const canonicalDirectory = await realpath(outputDirectory);
  const outputPath = resolve(canonicalDirectory, options.output ?? "G3-real-" + new Date().toISOString().slice(0, 10) + "-" + randomUUID() + ".json");
  // Exclusive reservation happens before ANY identity, provider or storage operation.
  const reportFile = await open(outputPath, "wx", 0o600);
  const evidence = {
    schema_version: "1.1.0", stage: "G3/G4",
    mode: options.baseUrl ? platformToken ? "private-cloud-end-to-end" : "public-cloud-end-to-end" : "real-identity-local-server",
    target: options.baseUrl ?? null, project_id: projectId, started_at: new Date().toISOString(),
    requested_model_id: env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite", expected_prompt_versions: PROMPT_VERSIONS,
    workflow_limit_ms: WORKFLOW_ABORT_TIMEOUT_MS, workflow_requests: 0, provider_attempts_reported: null,
    provider_attempts_total: null, real_gemini_calls: null, records: {}, requests: [], checks: [], ok: false,
  };
  let ownedServer, activePhase = "initialization";
  const totalSignal = AbortSignal.timeout(limits.total);
  async function checkpoint() {
    const text = redactEvidence(evidence, secrets) + "\n";
    await reportFile.write(text, 0, "utf8");
    await reportFile.truncate(Buffer.byteLength(text));
    await reportFile.sync();
  }
  function check(name, passed) {evidence.checks.push({name, outcome: passed ? "PASS" : "FAIL"}); assert.equal(passed, true, name);}
  async function request(url, phase, requestOptions = {}, timeout = limits.api) {
    activePhase = phase;
    const record = {phase, method: requestOptions.method ?? "GET", status: null, outcome: "REQUESTED"};
    evidence.requests.push(record);
    await checkpoint();
    try {
      const response = await fetchImpl(url, {...requestOptions, signal: AbortSignal.any([totalSignal, AbortSignal.timeout(timeout)])});
      record.status = response.status; record.outcome = "RESPONSE"; await checkpoint(); return response;
    } catch (error) {record.outcome = "UNKNOWN"; await checkpoint(); throw error;}
  }
  async function signUpAnonymous() {
    const response = await request("https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + encodeURIComponent(webApiKey), "anonymous-identity",
      {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({returnSecureToken: true})}, limits.identity);
    const body = await response.json();
    assert.equal(response.ok && !body.error && typeof body.idToken === "string" && body.idToken.length > 20 && typeof body.localId === "string", true, "Anonymous sign-up must return an identity token.");
    secrets.push(body.idToken);
    return {uid: body.localId, idToken: body.idToken};
  }
  async function api(base, path, session, phase, requestOptions = {}) {
    const response = await request(base + path, phase, {
      method: requestOptions.method ?? "GET",
      headers: {Accept: "application/json", ...(requestOptions.body === undefined ? {} : {"Content-Type": "application/json"}),
        ...(session ? {Authorization: "Bearer " + session.idToken} : {}),
        ...(platformToken ? {"X-Serverless-Authorization": "Bearer " + platformToken} : {})},
      ...(requestOptions.body === undefined ? {} : {body: JSON.stringify(requestOptions.body)}),
    }, phase === "workflow" ? limits.workflow : limits.api);
    assert.match(response.headers.get("content-type") ?? "", /application\/json/, phase + " must answer JSON.");
    return {status: response.status, payload: await response.json()};
  }
  try {
    await checkpoint();
    const base = options.baseUrl ?? (ownedServer = await localServerFactory()).base;
    evidence.target = base;
    const session = await signUpAnonymous();
    evidence.records.identity = {uid_hash: uidHash(session.uid), token_issued: true};
    evidence.workflow_requests = 1;
    const workflowStarted = Date.now();
    const {status: workflowStatus, payload: workflow} = await api(base, "/api/workflow", session, "workflow", {method: "POST", body: {...INTAKE, model_id: evidence.requested_model_id}});
    const steps = Array.isArray(workflow.steps) ? workflow.steps : null;
    evidence.records.workflow = {ok: workflow.ok, http: workflowStatus, duration_ms: Date.now() - workflowStarted, model_id: workflow.model_id,
      prompt_versions: workflow.prompt_versions ?? null, status: workflow.workflow?.status ?? null, branch: workflow.workflow?.decision?.branch ?? null,
      steps: steps?.map((step) => ({role: step.role, attempt: step.attempt, outcome: step.outcome,
        requested_model_id: step.requested_model_id ?? null, model_id: step.model_id ?? null,
        duration_ms: step.duration_ms ?? null, error_code: step.error_code ?? null,
        upstream: step.upstream_status ?? null, tokens: step.token_usage?.total_tokens ?? null})) ?? null};
    evidence.provider_attempts_reported = steps?.length ?? null;
    // Failed or missing transport cannot prove a total provider count or zero usage.
    evidence.provider_attempts_total = workflow.ok === true ? steps?.length ?? null : null;
    evidence.real_gemini_calls = evidence.provider_attempts_total;
    await checkpoint();
    check("real workflow returns a reviewable synthetic evidence request", workflowStatus === 200 && workflow.ok === true && workflow.workflow?.status === "REVIEWABLE" && workflow.workflow?.decision?.branch === "EVIDENCE_REQUEST" && workflow.workflow?.execution_authorized === false);
    const binding = validateVersionBinding(workflow.workflow.binding);
    check("real workflow bound to verified owner", binding.owner_id === session.uid && binding.run_id === workflow.run_id);
    const {status: preparedStatus, payload: prepared} = await api(base, "/api/runs/" + encodeURIComponent(binding.run_id) + "/confirmation", session, "confirmation", {method: "POST", body: {binding}});
    check("confirmation endpoint succeeds", preparedStatus === 200 && prepared.ok === true);
    const confirmation = validatePreparedConfirmation(prepared.confirmation, binding);
    evidence.records.confirmation = {approval_id_prefix: confirmation.approval_id.slice(0, 12), expires_at: confirmation.expires_at, input_digest_prefix: confirmation.input_digest.slice(0, 12), plan_digest_prefix: confirmation.plan_digest.slice(0, 12)};
    check("confirmation preview binds current plan", confirmation.binding.plan_id === binding.plan_id);
    const command = {approval_id: confirmation.approval_id, binding: confirmation.binding, idempotency_key: "g3-" + randomUUID(), confirmed: true};
    // Retain the original synthetic command's identifiers before mutation. Unknown
    // commits can then be located or explicitly recovered without generating a new
    // idempotency key. Visitor/platform tokens and the raw owner UID are omitted.
    evidence.records.recovery_command = {
      run_id: binding.run_id, plan_id: binding.plan_id, input_version: binding.input_version,
      facts_version: binding.facts_version, policy_version: binding.policy_version, plan_version: binding.plan_version,
      approval_id: command.approval_id, idempotency_key: command.idempotency_key, owner_uid_hash: uidHash(session.uid),
    };
    evidence.records.commit = {outcome: "UNKNOWN", case_id: null, replayed: null};
    await checkpoint();
    const {status: commitStatus, payload: commit} = await api(base, "/api/cases", session, "commit", {method: "POST", body: command});
    evidence.records.commit = {outcome: "RESPONSE", http: commitStatus, case_id: commit.case_id ?? null, replayed: commit.replayed ?? null};
    await checkpoint();
    check("explicit confirmation commits one case", commitStatus === 200 && commit.ok === true && commit.committed === true);
    const {status: readStatus, payload: readback} = await api(base, "/api/cases/" + encodeURIComponent(commit.case_id), session, "readback");
    check("independent readback is verified", readStatus === 200 && readback.verified === true);
    const savedCase = verifyIndependentCase(readback.case, session.uid, commit.case_id, {
      schema_version: "1.0.0", owner_id: session.uid, confirmation, idempotency_key: command.idempotency_key, case_id: commit.case_id,
      committed_approval_id: commit.approval_id ?? confirmation.approval_id, invalidated_locally: false,
    });
    evidence.records.case = {case_id: savedCase.case_id, case_type: savedCase.case_type, amount_minor: savedCase.amount_minor,
      employee_identifier: savedCase.employee_identifier, synthetic: savedCase.synthetic, status: savedCase.status, created_at: savedCase.created_at,
      citation_ids: savedCase.citations.map((citation) => citation.clause_id)};
    check("readback matches confirmed synthetic intake", savedCase.amount_minor === 3800 && savedCase.employee_identifier === "SYNTH-EMP-3310" && savedCase.synthetic === true);
    verifyPolicyCitations(savedCase.citations); check("citations are genuine policy clauses", true);
    const {status: replayStatus, payload: replay} = await api(base, "/api/cases", session, "replay", {method: "POST", body: command});
    check("replay returns the same committed case", replayStatus === 200 && replay.case_id === commit.case_id && replay.replayed === true);
    const stranger = await signUpAnonymous();
    const {status: strangerStatus} = await api(base, "/api/cases/" + encodeURIComponent(commit.case_id), stranger, "owner-isolation");
    evidence.records.isolation = {stranger_status: strangerStatus, stranger_uid_hash: uidHash(stranger.uid)};
    check("cross-owner read is not found", strangerStatus === 404);
    if (options.baseUrl && !platformToken) {
      const entry = await request(base, "signed-out-public-entry", {}, limits.entry);
      check("signed-out public entry serves the app", entry.ok && /text\/html/.test(entry.headers.get("content-type") ?? ""));
    } else evidence.checks.push({name: "signed-out public entry serves the app", outcome: "NOT_RUN",
      reason: platformToken ? "Private IAM invocation does not prove public entry." : "Local acceptance does not prove cloud availability."});
  } catch (error) {
    evidence.error = {phase: activePhase, message: error instanceof Error ? error.message : String(error)};
    evidence.checks.push({name: activePhase + " completes without an exception", outcome: "FAIL"});
  } finally {
    evidence.finished_at = new Date().toISOString(); evidence.elapsed_ms = Date.now() - startedWall; summarizeEvidence(evidence);
    try {await checkpoint();} finally {await reportFile.close(); ownedServer?.close();}
  }
  return {evidence: JSON.parse(redactEvidence(evidence, secrets)), outputPath};
}
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runAcceptance().then(({evidence, outputPath}) => {
    console.log(JSON.stringify({ok: evidence.ok, passed: evidence.passed, failed: evidence.failed, output: outputPath, provider_attempts_total: evidence.provider_attempts_total}));
    if (!evidence.ok) process.exitCode = 1;
  }).catch((error) => {
    console.error(redactEvidence({error: error instanceof Error ? error.message : String(error)}, [process.env.GEMINI_API_KEY, process.env.OPSCREW_CLOUD_RUN_ID_TOKEN, process.env.FIREBASE_WEB_API_KEY]));
    process.exitCode = 1;
  });
}
