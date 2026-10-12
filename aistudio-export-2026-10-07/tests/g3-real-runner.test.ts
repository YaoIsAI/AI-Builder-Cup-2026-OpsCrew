import assert from "node:assert/strict";
import test from "node:test";
import {mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {parseRunnerArgs, redactEvidence, runAcceptance} from "../scripts/check-g3-real.mjs";
import {POLICY_VERSION} from "../src/domain/contracts.ts";
import {evaluatePolicy} from "../src/domain/policy.ts";

const BASE = "https://synthetic-acceptance.run.app";
const ENV = {FIREBASE_PROJECT_ID: "synthetic-real-project", FIREBASE_WEB_API_KEY: "synthetic-public-web-configuration", GEMINI_API_KEY: "synthetic-model-secret"};
const OWNER_TOKEN = "synthetic-owner-token-not-a-credential";
const STRANGER_TOKEN = "synthetic-stranger-token-not-a-credential";
const PLATFORM_TOKEN = "synthetic-platform-token-not-a-credential";
const binding = {run_id: "synthetic-run", owner_id: "synthetic-owner", input_version: 1, facts_version: 1, policy_version: POLICY_VERSION, plan_id: "synthetic-plan", plan_version: 1};
const facts = {amount_minor: 3800, currency: "USD" as const, receipt_status: "missing" as const, description: "[SYNTHETIC] Parking receipt missing.", employee_identifier: "SYNTH-EMP-3310", missing_information: [], contradictions: []};
const decision = evaluatePolicy(facts);
const confirmation = {approval_id: "synthetic-approval", binding, action: "create_exception_case", input_digest: "a".repeat(64), plan_digest: "b".repeat(64), prepared_at: "2026-10-12T01:00:00Z", expires_at: "2026-10-12T01:10:00Z"};
const savedCase = {schema_version: "1.0.0", ...binding, case_id: "synthetic-case", approval_id: confirmation.approval_id, action: "create_exception_case", case_type: "EVIDENCE_REQUEST", employee_identifier: facts.employee_identifier, amount_minor: 3800, currency: "USD", receipt_status: "missing", description: facts.description, evidence_requirements: decision.evidence_requirements, status: "OPEN", synthetic: true, citations: decision.citations, created_at: "2026-10-12T01:01:00Z"};
const step = (role: string, attempt = 1) => ({role, attempt, outcome: "SUCCESS", requested_model_id: "gemini-3.1-flash-lite", model_id: "synthetic-returned-model-version", duration_ms: 123, error_code: null, upstream_status: 200, token_usage: {total_tokens: 12}});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status, headers: {"Content-Type": "application/json"}});
interface MockOptions {entryStatus?: number; retry?: boolean; failWorkflow?: boolean; unknownWorkflow?: boolean; failReadback?: boolean; failCommit?: boolean; timeoutPhase?: "identity" | "entry"; beforeCommit?: (init: RequestInit) => Promise<void>;}
function mockFetch(options: MockOptions = {}) {
  const requests: Array<{url: string; init: RequestInit}> = [];
  let identities = 0, commits = 0;
  const waitForAbort = (signal: AbortSignal | null | undefined) => new Promise<Response>((_resolve, reject) => {
    const hold = setTimeout(() => reject(new Error("mock request exceeded test bound")), 2_000);
    const abort = () => {clearTimeout(hold); reject(signal?.reason ?? new Error("mock abort"));};
    if (signal?.aborted) abort(); else signal?.addEventListener("abort", abort, {once: true});
  });
  const fetchImpl: typeof fetch = async (input, init = {}) => {
    const url = input instanceof Request ? input.url : String(input);
    requests.push({url, init});
    if (url.startsWith("https://identitytoolkit.googleapis.com/")) {
      if (options.timeoutPhase === "identity") return waitForAbort(init.signal);
      identities++;
      return json({localId: identities === 1 ? "synthetic-owner" : "synthetic-stranger", idToken: identities === 1 ? OWNER_TOKEN : STRANGER_TOKEN});
    }
    if (url.endsWith("/api/workflow")) {
      if (options.unknownWorkflow) throw new Error("unknown transport with " + ENV.GEMINI_API_KEY + " and " + PLATFORM_TOKEN);
      const steps = options.retry ? [{...step("FACTS"), outcome: "ERROR", upstream_status: 503, error_code: "GEMINI_API_ERROR_503", token_usage: null}, step("FACTS", 2), step("PLANNER"), step("REVIEWER")] : [step("FACTS"), step("PLANNER"), step("REVIEWER")];
      if (options.failWorkflow) return json({ok: false, steps: steps.slice(0, 2), error: {code: "SYNTHETIC_FAILURE"}}, 503);
      return json({ok: true, run_id: binding.run_id, model_id: "synthetic-model", steps, workflow: {status: "REVIEWABLE", decision, execution_authorized: false, binding}});
    }
    if (url.endsWith("/confirmation")) return json({ok: true, confirmation});
    if (url.endsWith("/api/cases")) {
      await options.beforeCommit?.(init);
      if (options.failCommit) throw new Error("unknown commit transport outcome");
      return json({ok: true, committed: true, case_id: savedCase.case_id, approval_id: confirmation.approval_id, replayed: commits++ > 0});
    }
    if (url.endsWith("/api/cases/" + savedCase.case_id)) {
      if (new Headers(init.headers).get("Authorization") === "Bearer " + STRANGER_TOKEN) return json({ok: false}, 404);
      if (options.failReadback) throw new Error("readback transport failure");
      return json({ok: true, verified: true, case: savedCase});
    }
    assert.equal(url, BASE, "Only explicitly mocked endpoints may be called.");
    if (options.timeoutPhase === "entry") return waitForAbort(init.signal);
    return new Response("<!doctype html><title>Synthetic app</title>", {status: options.entryStatus ?? 200, headers: {"Content-Type": "text/html"}});
  };
  return {fetchImpl, requests};
}
async function temporaryDirectory(t: test.TestContext) {
  const directory = await mkdtemp(join(tmpdir(), "opscrew-g3-test-"));
  t.after(() => rm(directory, {recursive: true, force: true}));
  return directory;
}
async function execute(t: test.TestContext, options: MockOptions = {}, privateInvocation = false) {
  const outputDirectory = await temporaryDirectory(t), mock = mockFetch(options);
  const result = await runAcceptance({
    argv: ["--live", "--base-url", BASE, "--output", "result.json"],
    env: {...ENV, ...(privateInvocation ? {OPSCREW_CLOUD_RUN_ID_TOKEN: PLATFORM_TOKEN} : {})},
    fetchImpl: mock.fetchImpl, outputDirectory,
    timeouts: {identity: 25, entry: 25},
  });
  const persisted = JSON.parse(await readFile(join(outputDirectory, "result.json"), "utf8"));
  assert.deepEqual(persisted, result.evidence, "Final returned and retained evidence agree.");
  return {...result, ...mock, persisted};
}

test("real acceptance refuses missing, duplicate and malformed options before any side effect", () => {
  for (const argv of [[], ["--live", "--base-url"], ["--live", "--base-url", "--output", "new.json"], ["--live", "--output"], ["--live", "--unknown"], ["--live", "--live"], ["--live", "--output", "../outside.json"], ["--live", "--base-url", "http://unsafe.run.app"]]) {
    assert.throws(() => parseRunnerArgs(argv));
  }
  assert.equal(parseRunnerArgs(["--live", "--base-url", BASE + "/"]).baseUrl, BASE);
});
test("public acceptance includes the final entry check and reports three provider attempts", async (t) => {
  const {evidence, requests} = await execute(t);
  assert.equal(evidence.ok, true); assert.equal(evidence.failed, 0);
  assert.equal(evidence.workflow_requests, 1); assert.equal(evidence.provider_attempts_total, 3);
  assert.equal(evidence.real_gemini_calls, 3);
  assert.equal(evidence.passed, evidence.checks.filter((item: {outcome: string}) => item.outcome === "PASS").length);
  assert.equal(requests.filter((item) => item.url === BASE).length, 1);
});
test("public entry failure cannot produce overall PASS", async (t) => {
  const {evidence} = await execute(t, {entryStatus: 404});
  assert.equal(evidence.ok, false); assert(evidence.failed > 0);
  assert(evidence.checks.some((item: {name: string; outcome: string}) => item.name === "signed-out public entry serves the app" && item.outcome === "FAIL"));
  assert.equal(evidence.records.commit.case_id, savedCase.case_id);
});
test("provider retry telemetry is counted as four attempts rather than one workflow", async (t) => {
  const {evidence} = await execute(t, {retry: true});
  assert.equal(evidence.ok, true); assert.equal(evidence.provider_attempts_reported, 4); assert.equal(evidence.provider_attempts_total, 4);
});
test("failed workflow retains observed attempts and unknown total without case writes", async (t) => {
  const {evidence, requests} = await execute(t, {failWorkflow: true});
  assert.equal(evidence.ok, false); assert.equal(evidence.records.workflow.http, 503);
  assert.equal(evidence.provider_attempts_reported, 2); assert.equal(evidence.provider_attempts_total, null);
  assert.equal(evidence.real_gemini_calls, null);
  assert.equal(requests.some((item) => item.url.endsWith("/api/cases")), false);
});
test("unknown workflow transport retains failure and redacts both credential types", async (t) => {
  const {evidence, persisted} = await execute(t, {unknownWorkflow: true}, true);
  assert.equal(evidence.ok, false); assert.equal(evidence.provider_attempts_reported, null); assert.equal(evidence.provider_attempts_total, null);
  assert.equal(evidence.requests.find((item: {phase: string}) => item.phase === "workflow").outcome, "UNKNOWN");
  const serialized = JSON.stringify(persisted);
  for (const secret of [ENV.GEMINI_API_KEY, PLATFORM_TOKEN, OWNER_TOKEN]) assert.equal(serialized.includes(secret), false);
});
test("readback failure retains the committed case for independent recovery", async (t) => {
  const {evidence} = await execute(t, {failReadback: true});
  assert.equal(evidence.ok, false); assert.equal(evidence.error.phase, "readback");
  assert.equal(evidence.records.commit.case_id, savedCase.case_id); assert.equal(evidence.records.commit.outcome, "RESPONSE");
  assert.equal(evidence.records.recovery_command.approval_id, confirmation.approval_id);
  assert.equal(evidence.records.recovery_command.run_id, binding.run_id);
  assert.equal(evidence.provider_attempts_total, 3);
});
test("unknown commit transport remains unknown and is never blindly retried", async (t) => {
  const {evidence, requests} = await execute(t, {failCommit: true});
  assert.equal(evidence.ok, false); assert.equal(evidence.records.commit.outcome, "UNKNOWN");
  assert.equal(evidence.records.commit.case_id, null);
  assert.equal(requests.filter((item) => item.url.endsWith("/api/cases")).length, 1);
});
test("unknown commit retains the original recovery identifiers before mutation without credentials", async (t) => {
  const outputDirectory = await temporaryDirectory(t);
  let checkedBeforeMutation = false;
  const mock = mockFetch({failCommit: true, beforeCommit: async (init) => {
    const checkpoint = JSON.parse(await readFile(join(outputDirectory, "result.json"), "utf8"));
    const originalCommand = JSON.parse(String(init.body));
    assert.equal(checkpoint.records.recovery_command.idempotency_key, originalCommand.idempotency_key);
    assert.equal(checkpoint.records.recovery_command.approval_id, originalCommand.approval_id);
    assert.equal(checkpoint.records.commit.outcome, "UNKNOWN");
    checkedBeforeMutation = true;
  }});
  const {evidence} = await runAcceptance({argv: ["--live", "--base-url", BASE, "--output", "result.json"],
    env: {...ENV, OPSCREW_CLOUD_RUN_ID_TOKEN: PLATFORM_TOKEN}, fetchImpl: mock.fetchImpl, outputDirectory});
  assert.equal(checkedBeforeMutation, true);
  const sent = JSON.parse(String(mock.requests.find((item) => item.url.endsWith("/api/cases"))!.init.body));
  const recovery = evidence.records.recovery_command;
  assert.equal(recovery.approval_id, sent.approval_id); assert.equal(recovery.idempotency_key, sent.idempotency_key);
  for (const key of ["run_id", "plan_id", "input_version", "facts_version", "policy_version", "plan_version"]) assert.equal(recovery[key], sent.binding[key]);
  assert.match(recovery.owner_uid_hash, /^[a-f0-9]{16}$/);
  const retained = JSON.stringify(evidence);
  for (const token of [OWNER_TOKEN, STRANGER_TOKEN, PLATFORM_TOKEN, ENV.GEMINI_API_KEY]) assert.equal(retained.includes(token), false);
  assert.equal(recovery.owner_id, undefined);
});
test("retained provider telemetry preserves returned model, timing and failed upstream retry", async (t) => {
  const {evidence} = await execute(t, {retry: true});
  const steps = evidence.records.workflow.steps;
  assert.equal(steps[0].requested_model_id, "gemini-3.1-flash-lite");
  assert.equal(steps[0].model_id, "synthetic-returned-model-version");
  assert.equal(steps[0].duration_ms, 123); assert.equal(steps[0].error_code, "GEMINI_API_ERROR_503");
  assert.equal(steps[0].upstream, 503); assert.equal(steps[0].tokens, null);
  assert.equal(steps[1].attempt, 2); assert.equal(steps[1].error_code, null); assert.equal(steps[1].tokens, 12);
});
test("existing output is refused before identities, models or storage are contacted", async (t) => {
  const outputDirectory = await temporaryDirectory(t), mock = mockFetch();
  const path = join(outputDirectory, "existing.json"); await writeFile(path, "original evidence");
  await assert.rejects(runAcceptance({argv: ["--live", "--base-url", BASE, "--output", "existing.json"], env: ENV, fetchImpl: mock.fetchImpl, outputDirectory}), /EEXIST/);
  assert.equal(mock.requests.length, 0); assert.equal(await readFile(path, "utf8"), "original evidence");
});
test("private IAM and visitor tokens use separate headers without claiming signed-out access", async (t) => {
  const {evidence, requests} = await execute(t, {}, true);
  assert.equal(evidence.ok, true); assert.equal(evidence.mode, "private-cloud-end-to-end");
  const workflowHeaders = new Headers(requests.find((item) => item.url.endsWith("/api/workflow"))!.init.headers);
  assert.equal(workflowHeaders.get("Authorization"), "Bearer " + OWNER_TOKEN);
  assert.equal(workflowHeaders.get("X-Serverless-Authorization"), "Bearer " + PLATFORM_TOKEN);
  assert.equal(requests.some((item) => item.url === BASE), false);
  assert(evidence.checks.some((item: {name: string; outcome: string}) => item.name === "signed-out public entry serves the app" && item.outcome === "NOT_RUN"));
});
test("anonymous identity request has a bounded timeout and retains its failed attempt", async (t) => {
  const {evidence, requests} = await execute(t, {timeoutPhase: "identity"});
  assert.equal(evidence.ok, false); assert.equal(evidence.error.phase, "anonymous-identity");
  assert.equal(evidence.requests[0].outcome, "UNKNOWN"); assert.equal(requests.length, 1);
  assert.equal(evidence.workflow_requests, 0); assert.equal(evidence.real_gemini_calls, null);
});
test("public entry timeout is retained after commit and makes overall acceptance fail", async (t) => {
  const {evidence} = await execute(t, {timeoutPhase: "entry"});
  assert.equal(evidence.ok, false); assert.equal(evidence.error.phase, "signed-out-public-entry");
  assert.equal(evidence.records.commit.case_id, savedCase.case_id);
});
test("redactor preserves unknown values while removing exact credentials and JWTs", () => {
  const text = redactEvidence({unknown: null, key: "synthetic-secret", token: "eyJsynthetic.payload.signature"}, ["synthetic-secret", ""]);
  assert.equal(text.includes("synthetic-secret"), false); assert.equal(text.includes("eyJsynthetic"), false);
  assert.equal(JSON.parse(text).unknown, null);
});
