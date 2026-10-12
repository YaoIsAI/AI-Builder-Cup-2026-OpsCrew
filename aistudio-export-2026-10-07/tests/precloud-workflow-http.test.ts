import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import type {Server} from "node:http";
import {test} from "node:test";
import {createApp} from "../server.ts";
import type {CreateAppOptions} from "../server.ts";
import {CaseService, MemoryCaseStore, sha256} from "../server/case-service.ts";
import {DEFAULT_MODEL_ADMISSION_POLICY} from "../server/model-admission.ts";
import type {ModelAdmissionPolicy} from "../server/model-admission.ts";
import type {FirebaseRuntime} from "../server/firebase-runtime.ts";

const fixture = JSON.parse(readFileSync(new URL("../fixtures/development-cases.json", import.meta.url), "utf8")).cases.find((item: {id: string}) => item.id === "DEV-04");
const input = {...fixture.input, input_version: 7};
const roomy: ModelAdmissionPolicy = {...DEFAULT_MODEL_ADMISSION_POLICY, ownerMinuteRequests: 6, ownerMinuteCalls: 36};
function setup(policy = roomy) {
  const store = new MemoryCaseStore(), service = new CaseService({store, admissionPolicy: policy});
  const runtime: FirebaseRuntime = {config: {enabled: true, mode: "emulator", firebase: {projectId: "demo-offline", apiKey: "offline-placeholder", authDomain: "localhost", appId: "offline-placeholder"}, auth_emulator_url: "http://127.0.0.1:9099"},
    caseService: service, verifyIdToken: async token => {if (token !== "offline-owner") throw new Error("Offline token rejected"); return {uid: "owner"};}};
  const roles: string[] = [];
  const options: CreateAppOptions = {caseRuntime: runtime, apiKeyOverride: "offline-provider-no-network",
    generateContentFn: async () => {roles.push("FACTS"); return {text: JSON.stringify(fixture.facts)};},
    planningGenerateContentFn: async args => {
      roles.push(args.role);
      const {deterministic_decision: decision, validated_facts: facts} = JSON.parse(args.promptPayload);
      return {text: JSON.stringify(args.role === "REVIEWER" ? {verdict: "PASS", issues: [], citation_ids: decision.citations.map((c: {clause_id: string}) => c.clause_id)} : {
        branch: decision.branch, action: decision.allowed_action,
        proposed_case: {case_type: decision.branch, employee_identifier: facts.employee_identifier, amount_minor: facts.amount_minor, currency: facts.currency, receipt_status: facts.receipt_status, description: facts.description, evidence_requirements: decision.evidence_requirements},
        rationale: "Offline deadline and admission regression.", citation_ids: decision.citations.map((c: {clause_id: string}) => c.clause_id)})};
    }};
  return {store, service, runtime, options, roles};
}
async function withServer(options: CreateAppOptions, run: (base: string) => Promise<void>) {
  const server: Server = await new Promise(resolve => {const owned = createApp(options).listen(0, "127.0.0.1", () => resolve(owned));});
  const address = server.address(); assert(address && typeof address === "object");
  try {await run(`http://127.0.0.1:${address.port}`);}
  finally {server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));}
}
async function request(base: string, path: string, body?: unknown) {
  const response = await fetch(base + path, {method: body === undefined ? "GET" : "POST", headers: {authorization: "Bearer offline-owner", ...(body === undefined ? {} : {"content-type": "application/json"})}, ...(body === undefined ? {} : {body: JSON.stringify(body)})});
  return {status: response.status, headers: response.headers, body: await response.json()};
}
test("model processing pause makes zero model/head writes while owned history remains readable", async () => {
  const state = setup();
  await withServer({...state.options, modelEnabled: false}, async base => {
    const failed = await request(base, "/api/workflow", input);
    assert.equal(failed.status, 503); assert.equal(failed.body.error.code, "MODEL_DISABLED");
    assert.equal((await request(base, "/api/runs")).status, 200);
    assert.equal((await request(base, "/api/cases")).status, 200);
    assert.equal((await request(base, "/api/ready")).status, 503);
  });
  assert.deepEqual(state.roles, []); assert.deepEqual(await state.store.list("runs", "owner"), []);
  assert.equal(await state.store.get("usage", "global"), null);
});
test("HTTP minute quota fails before the provider and provides bounded Retry-After", async () => {
  const state = setup({...roomy, ownerMinuteRequests: 1});
  await withServer(state.options, async base => {
    assert.equal((await request(base, "/api/workflow", input)).status, 200);
    const rejected = await request(base, "/api/workflow", input);
    assert.equal(rejected.status, 429); assert.equal(rejected.body.error.code, "MODEL_RATE_LIMIT");
    assert.equal(rejected.headers.get("retry-after"), "60");
    assert.equal((await request(base, "/api/runs")).body.runs.length, 1);
  });
  assert.deepEqual(state.roles, ["FACTS", "PLANNER", "REVIEWER"]);
});
test("model-call timeout remains recorded without retry and releases capacity without refund", async () => {
  const state = setup();
  await withServer({...state.options, routeTimeoutMs: 20, workflowTimeoutMs: 100,
    generateContentFn: async () => {state.roles.push("FACTS"); return new Promise(() => {});}}, async base => {
    const failed = await request(base, "/api/workflow", input);
    assert.equal(failed.body.http_status, 504); assert.equal(failed.body.steps.length, 1);
    assert.equal(failed.body.steps[0].error_code, "GEMINI_REQUEST_TIMEOUT");
    const run = (await request(base, "/api/runs")).body.runs[0];
    assert.equal(run.status, "ERROR"); assert.equal(run.workflow_response.steps[0].outcome, "ERROR");
  });
  const usage = await state.store.get<any>("usage", "global");
  assert.equal(usage.day_calls, 6); assert.equal(usage.leases.length, 0); assert.deepEqual(state.roles, ["FACTS"]);
});
test("successful model requests receive the raised FACTS SDK limit and real admission summary", async () => {
  const state = setup(); let sdkLimit: number | undefined;
  await withServer({...state.options, generateContentFn: async args => {sdkLimit = args.timeoutMs; return {text: JSON.stringify(fixture.facts)};}}, async base => {
    const config = (await request(base, "/api/config")).body;
    assert.equal(config.stage, "S4"); assert.equal(config.request_timeout_ms, 40_000); assert.equal(config.route_timeout_ms, 45_000);
    assert.equal(config.workflow_timeout_ms, 90_000); assert.equal(config.planning_step_timeout_ms, 30_000);
    assert.equal(config.model_admission.workflow_reserved_calls, 6); assert.equal(config.model_admission.unknown_usage_refunded, false);
    assert.equal((await request(base, "/api/workflow", input)).status, 200);
    assert(!JSON.stringify(config).includes("offline-provider-no-network")); assert(!("usage" in config));
  });
  assert.equal(sdkLimit, 40_000);
});
test("readiness probes persistent storage with zero provider calls and fails closed on outage", async () => {
  const state = setup();
  await withServer(state.options, async base => {
    const ready = await request(base, "/api/ready"); assert.equal(ready.status, 200); assert.equal(ready.body.ready, true); assert.equal(ready.body.model_calls, 0);
    state.store.get = async () => {throw new Error("Private ADC/path diagnostic");};
    const down = await request(base, "/api/ready"); assert.equal(down.status, 503); assert.equal(down.body.error.code, "SANDBOX_STORAGE_NOT_READY");
    assert(!JSON.stringify(down.body).includes("Private ADC"));
    assert.equal((await request(base, "/api/health")).status, 200);
  });
  assert.deepEqual(state.roles, []);
});
test("late creation after HTTP storage timeout cannot replace a newer completed workflow", async () => {
  const state = setup(); const original = state.service.createRun.bind(state.service);
  let first = true, release!: () => void; const gate = new Promise<void>(resolve => {release = resolve;});
  let late!: Promise<unknown>;
  state.service.createRun = async (...args) => {
    if (first) {first = false; late = gate.then(() => original(...args)); return await late as Awaited<ReturnType<typeof original>>;}
    return original(...args);
  };
  await withServer({...state.options, caseStorageTimeoutMs: 15}, async base => {
    const old = await request(base, "/api/workflow", input);
    assert.equal(old.status, 503); assert.equal(old.body.error.code, "CASE_STORAGE_TIMEOUT"); assert.deepEqual(state.roles, []);
    const newer = await request(base, "/api/workflow", {...input, input_version: 8});
    assert.equal(newer.status, 200); assert.equal(newer.body.workflow.status, "REVIEWABLE");
    release(); await assert.rejects(late, (error: any) => error.code === "STALE_VERSION");
    const head = await state.store.get<any>("heads", sha256({uid: "owner"})); assert.equal(head.run_id, newer.body.run_id);
    assert.equal((await request(base, "/api/runs")).body.runs.length, 1);
  });
});
test("a run committed before its timed-out creation response stays abandoned after a newer result", async () => {
  const state = setup(); const original = state.service.createRun.bind(state.service);
  let first = true, release!: () => void, oldId = ""; const gate = new Promise<void>(resolve => {release = resolve;});
  state.service.createRun = async (...args) => {
    const run = await original(...args);
    if (first) {first = false; oldId = run.run_id; await gate;}
    return run;
  };
  await withServer({...state.options, caseStorageTimeoutMs: 15}, async base => {
    assert.equal((await request(base, "/api/workflow", input)).status, 503);
    const newer = await request(base, "/api/workflow", {...input, input_version: 8}); assert.equal(newer.status, 200);
    release();
    for (let attempt = 0; attempt < 20 && (await state.service.getRun("owner", oldId)).status !== "INVALIDATED"; attempt++) await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal((await state.service.getRun("owner", oldId)).status, "INVALIDATED");
    assert.equal((await state.store.get<any>("heads", sha256({uid: "owner"}))).run_id, newer.body.run_id);
    assert.equal((await state.store.list("cases", "owner")).length, 0);
  });
});
test("auth and run persistence consume the same absolute HTTP model budget", async () => {
  const state = setup(); let factSdkBudget = 0;
  state.runtime.verifyIdToken = async () => {await new Promise(resolve => setTimeout(resolve, 200)); return {uid: "owner"};};
  const create = state.service.createRun.bind(state.service);
  state.service.createRun = async (...args) => {await new Promise(resolve => setTimeout(resolve, 150)); return create(...args);};
  await withServer({...state.options, workflowTimeoutMs: 1000, generateContentFn: async args => {
    factSdkBudget = args.timeoutMs!; return {text: JSON.stringify(fixture.facts)};
  }}, async base => {
    const result = await request(base, "/api/workflow", input); assert.equal(result.status, 200);
    assert(factSdkBudget > 0 && factSdkBudget <= 650, `Expected reduced remaining SDK budget, got ${factSdkBudget}ms`);
  });
});
test("HTTP deadline while verifying identity responds promptly with zero admission/model writes", async () => {
  const state = setup();
  state.runtime.verifyIdToken = async () => {await new Promise(resolve => setTimeout(resolve, 100)); return {uid: "owner"};};
  await withServer({...state.options, workflowTimeoutMs: 20}, async base => {
    const started = performance.now(); const result = await request(base, "/api/workflow", input);
    assert.equal(result.body.http_status, 504); assert.equal(result.body.error.code, "GEMINI_REQUEST_TIMEOUT");
    assert(performance.now() - started < 200); assert.deepEqual(result.body.steps, []);
  });
  assert.deepEqual(state.roles, []); assert.equal(await state.store.get("usage", "global"), null);
});
test("HTTP deadline while reserving capacity never proceeds to run/model creation", async () => {
  const state = setup(); const reserve = state.service.modelAdmission.reserve.bind(state.service.modelAdmission);
  state.service.modelAdmission.reserve = async (...args) => {await new Promise(resolve => setTimeout(resolve, 60)); return reserve(...args);};
  await withServer({...state.options, workflowTimeoutMs: 20}, async base => {
    const result = await request(base, "/api/workflow", input); assert.equal(result.body.http_status, 504);
    await new Promise(resolve => setTimeout(resolve, 70));
    assert.equal((await state.store.list("runs", "owner")).length, 0);
    assert.equal(await state.store.get("usage", "global"), null);
  });
  assert.deepEqual(state.roles, []);
});
test("HTTP deadline during a committed result's delayed acknowledgment returns no reviewable result", async () => {
  const state = setup(); const complete = state.service.completeRun.bind(state.service);
  state.service.completeRun = async (...args) => {const result = await complete(...args); await new Promise(resolve => setTimeout(resolve, 1000)); return result;};
  await withServer({...state.options, workflowTimeoutMs: 300}, async base => {
    const started = performance.now(); const result = await request(base, "/api/workflow", input);
    assert.equal(result.body.http_status, 504); assert.equal(result.body.ok, false); assert.equal(result.body.workflow, null);
    assert.deepEqual(result.body.steps.map((step: {role: string}) => step.role), ["FACTS", "PLANNER", "REVIEWER"]);
    assert(performance.now() - started < 600);
    for (let attempt = 0; attempt < 20 && (await state.store.list<any>("runs", "owner"))[0]?.status !== "INVALIDATED"; attempt++) await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal((await state.store.list<any>("runs", "owner"))[0].status, "INVALIDATED");
    assert.equal((await state.store.list("cases", "owner")).length, 0);
  });
});
