import assert from "node:assert/strict";
import {test} from "node:test";
import {CaseService, MemoryCaseStore, sha256} from "../server/case-service.ts";
import type {CaseStore} from "../server/case-service.ts";
import {DEFAULT_MODEL_ADMISSION_POLICY, ModelAdmissionError, ModelAdmissionService, modelAdmissionPolicy} from "../server/model-admission.ts";
import type {ModelAdmissionPolicy} from "../server/model-admission.ts";

const INPUT = {description: "[SYNTHETIC] Parking $38 receipt missing", amount_usd: "38", receipt_status: "missing", employee_identifier: "SYNTH-EMP-100"};
const hash = sha256(INPUT);
const roomy: ModelAdmissionPolicy = {...DEFAULT_MODEL_ADMISSION_POLICY, globalConcurrent: 8, ownerConcurrent: 4,
  globalMinuteRequests: 100, ownerMinuteRequests: 100, globalDailyRequests: 100, ownerDailyRequests: 100,
  globalMinuteCalls: 600, ownerMinuteCalls: 600, globalDailyCalls: 600, ownerDailyCalls: 600};
function setup(policy: ModelAdmissionPolicy = {...DEFAULT_MODEL_ADMISSION_POLICY}) {
  const store = new MemoryCaseStore(); let now = Date.parse("2026-10-11T05:00:00.000Z");
  const service = new ModelAdmissionService({store, policy, now: () => now});
  return {store, service, tick: (ms: number) => {now += ms;}, now: () => now};
}
async function denied(operation: Promise<unknown>, code: string) {
  await assert.rejects(operation, (error: unknown) => error instanceof ModelAdmissionError && error.code === code);
}
test("independent service instances enforce one per-owner and two global active leases", async () => {
  const {store, service, now} = setup(); const other = new ModelAdmissionService({store, now});
  await service.reserve("alice", "first", hash); await denied(other.reserve("alice", "second", hash), "MODEL_BUSY");
  await other.reserve("bob", "third", hash); await denied(service.reserve("carol", "fourth", hash), "MODEL_BUSY");
  assert.equal((await store.list("admissions", "alice")).length, 1); assert.equal((await store.list("admissions", "carol")).length, 0);
});
test("parallel admission transactions cannot oversubscribe global concurrency", async () => {
  const {service} = setup();
  const results = await Promise.allSettled(Array.from({length: 20}, (_, index) => service.reserve(`owner-${index}`, `request-${index}`, hash)));
  assert.equal(results.filter(result => result.status === "fulfilled").length, 2);
  for (const result of results) if (result.status === "rejected") assert.equal(result.reason.code, "MODEL_BUSY");
});
test("idempotent reservation replays capacity once and rejects input or reserved-call changes", async () => {
  const {store, service} = setup(); const first = await service.reserve("alice", "original", hash);
  assert.deepEqual(await service.reserve("alice", "original", hash), first);
  const usage = await store.get<any>("usage", "global"); assert.equal(usage.day_requests, 1); assert.equal(usage.day_calls, 6);
  await denied(service.reserve("alice", "original", sha256({...INPUT, amount_usd: "39"})), "ADMISSION_CONFLICT");
  await denied(service.reserve("alice", "original", hash, 2), "ADMISSION_CONFLICT");
});
test("released or expired capacity never refunds reserved model calls or request counters", async () => {
  const {store, service, tick} = setup(); const first = await service.reserve("alice", "original", hash);
  await service.release(first); await service.release(first);
  const second = await service.reserve("alice", "next", hash); tick(DEFAULT_MODEL_ADMISSION_POLICY.leaseMs + 1);
  const usageBefore = await store.get<any>("usage", "global"); assert.equal(usageBefore.day_calls, 12);
  await service.reserve("bob", "after-crash", hash);
  const usageAfter = await store.get<any>("usage", "global"); assert.equal(usageAfter.day_calls, 18); assert.equal(usageAfter.day_requests, 3);
  assert.equal(usageAfter.leases.length, 1); assert.equal(usageAfter.leases[0].expires_at, new Date(Date.parse(second.expires_at) + DEFAULT_MODEL_ADMISSION_POLICY.leaseMs + 1).toISOString());
});
for (const [name, policy, expected] of [
  ["owner minute requests", {...roomy, ownerMinuteRequests: 1}, "MODEL_RATE_LIMIT"],
  ["global minute requests across new visitors", {...roomy, globalMinuteRequests: 1, ownerMinuteRequests: 1}, "MODEL_RATE_LIMIT"],
  ["owner daily requests", {...roomy, ownerDailyRequests: 1}, "MODEL_DAILY_LIMIT"],
  ["global daily requests across new visitors", {...roomy, globalDailyRequests: 1, ownerDailyRequests: 1}, "MODEL_DAILY_LIMIT"],
  ["owner minute reserved calls", {...roomy, ownerMinuteCalls: 6}, "MODEL_RATE_LIMIT"],
  ["global minute reserved calls", {...roomy, globalMinuteCalls: 6, ownerMinuteCalls: 6}, "MODEL_RATE_LIMIT"],
  ["owner daily reserved calls", {...roomy, ownerDailyCalls: 6}, "MODEL_DAILY_LIMIT"],
  ["global daily reserved calls", {...roomy, globalDailyCalls: 6, ownerDailyCalls: 6}, "MODEL_DAILY_LIMIT"],
] as const) test(`${name} is enforced after active capacity is released`, async () => {
  const {service} = setup(policy); const first = await service.reserve("alice", "original", hash); await service.release(first);
  await denied(service.reserve(name.startsWith("global") ? "new-visitor" : "alice", "next", hash), expected);
});
test("UTC minute/day resets preserve the server request sequence", async () => {
  const {service, tick} = setup({...roomy, ownerMinuteRequests: 1, ownerDailyRequests: 1});
  const first = await service.reserve("alice", "first", hash); await service.release(first);
  tick(60_000); await denied(service.reserve("alice", "later-minute", hash), "MODEL_DAILY_LIMIT");
  tick(86_400_000); const next = await service.reserve("alice", "next-day", hash); assert.equal(next.sequence, first.sequence + 1);
});
test("storage failure cannot admit model capacity or silently replace Firestore", async () => {
  const {store, service} = setup(); store.runTransaction = async () => {throw new Error("Injected offline storage failure");};
  await assert.rejects(service.reserve("alice", "first", hash), /Injected offline storage failure/);
});
test("late older creation after a newer durable reservation never replaces its head", async () => {
  const memory = new MemoryCaseStore(); let blockNext = false; let release!: () => void; let entered!: () => void;
  const gate = new Promise<void>(resolve => {release = resolve;}), enteredGate = new Promise<void>(resolve => {entered = resolve;});
  const store: CaseStore = {get: memory.get.bind(memory), list: memory.list.bind(memory), runTransaction: async operation => {
    if (blockNext) {blockNext = false; entered(); await gate;}
    return memory.runTransaction(operation);
  }};
  const service = new CaseService({store, admissionPolicy: roomy});
  const oldTicket = await service.modelAdmission.reserve("alice", "older-request", hash);
  blockNext = true; const oldCreation = service.createRun("alice", INPUT, 1, oldTicket);
  await enteredGate;
  const newTicket = await service.modelAdmission.reserve("alice", "newer-request", hash);
  const newer = await service.createRun("alice", INPUT, 1, newTicket);
  release(); await denied(oldCreation, "STALE_VERSION");
  const head = await memory.get<any>("heads", sha256({uid: "alice"}));
  assert.equal(head.run_id, newer.run_id); assert.equal(head.request_sequence, newTicket.sequence);
  assert.equal((await memory.list("runs", "alice")).length, 1);
});
test("late reservation after its HTTP waiter stopped never changes an existing run head", async () => {
  const {store} = setup(roomy); const service = new CaseService({store, admissionPolicy: roomy});
  const current = await service.createRun("alice", INPUT);
  await service.modelAdmission.reserve("alice", "reservation-after-response-timeout", hash);
  const head = await store.get<any>("heads", sha256({uid: "alice"})); assert.equal(head.run_id, current.run_id);
});
test("same server creation ticket after lost response does not allocate another run or move newer head", async () => {
  const {store} = setup(roomy); const service = new CaseService({store, admissionPolicy: roomy});
  const ticket = await service.modelAdmission.reserve("alice", "stable-operation", hash);
  const first = await service.createRun("alice", INPUT, 1, ticket); await service.modelAdmission.release(ticket);
  const newer = await service.createRun("alice", {...INPUT, amount_usd: "39"});
  const replay = await service.createRun("alice", INPUT, 1, ticket);
  assert.equal(replay.run_id, first.run_id); assert.equal(replay.input_version, 1);
  assert.equal((await store.get<any>("heads", sha256({uid: "alice"}))).run_id, newer.run_id);
  assert.equal((await store.list("runs", "alice")).length, 2);
});
test("an expired creation lease cannot write a head", async () => {
  const {store, now, tick} = setup(roomy); const service = new CaseService({store, now, admissionPolicy: roomy});
  const ticket = await service.modelAdmission.reserve("alice", "expired", hash); tick(roomy.leaseMs);
  await denied(service.createRun("alice", INPUT, 1, ticket), "STALE_VERSION");
  assert.equal(await store.get("heads", sha256({uid: "alice"})), null);
});
test("operator limit configuration rejects malformed, zero, excessive and inverted limits", () => {
  assert.deepEqual(modelAdmissionPolicy({}), DEFAULT_MODEL_ADMISSION_POLICY);
  for (const env of [{OPSCREW_MODEL_GLOBAL_CONCURRENT: "0"}, {OPSCREW_MODEL_GLOBAL_DAILY_REQUESTS: "Infinity"},
    {OPSCREW_MODEL_GLOBAL_CONCURRENT: "33"}, {OPSCREW_MODEL_LEASE_MS: "119999"}, {OPSCREW_MODEL_OWNER_CONCURRENT: "3"}]) {
    assert.throws(() => modelAdmissionPolicy(env));
  }
});
test("late completion callback cannot persist a passing plan after its absolute analysis deadline", async () => {
  const {store, now, tick} = setup(roomy); const service = new CaseService({store, now, admissionPolicy: roomy});
  const run = await service.createRun("alice", INPUT);
  tick(90_001);
  await assert.rejects(service.completeRun("alice", run.run_id, {ok: true} as any), (error: any) => error.code === "WORKFLOW_DEADLINE");
  assert.equal((await service.getRun("alice", run.run_id)).status, "DRAFT");
});
test("tampered quota counters fail closed instead of expanding budget", async () => {
  const {store, service} = setup(); await service.reserve("alice", "first", hash);
  const record = await store.get<any>("usage", "global");
  await store.runTransaction(async transaction => {transaction.set("usage", "global", {...record, day_calls: -1});});
  await denied(service.reserve("bob", "second", hash), "MODEL_LIMIT_STORAGE_INVALID");
});
