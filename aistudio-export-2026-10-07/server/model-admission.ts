import { createHash } from "node:crypto";
import type { CaseStore, CaseTransaction } from "./case-service.ts";

export interface ModelAdmissionPolicy {
  globalConcurrent: number; ownerConcurrent: number;
  globalMinuteRequests: number; ownerMinuteRequests: number;
  globalDailyRequests: number; ownerDailyRequests: number;
  globalMinuteCalls: number; ownerMinuteCalls: number;
  globalDailyCalls: number; ownerDailyCalls: number;
  leaseMs: number;
}
export const DEFAULT_MODEL_ADMISSION_POLICY: Readonly<ModelAdmissionPolicy> = Object.freeze({
  globalConcurrent: 2, ownerConcurrent: 1,
  globalMinuteRequests: 6, ownerMinuteRequests: 2,
  globalDailyRequests: 60, ownerDailyRequests: 12,
  globalMinuteCalls: 36, ownerMinuteCalls: 12,
  globalDailyCalls: 360, ownerDailyCalls: 72,
  leaseMs: 180_000,
});
const CONFIG_FIELDS = Object.keys(DEFAULT_MODEL_ADMISSION_POLICY) as (keyof ModelAdmissionPolicy)[];
const ENV_NAMES: Record<keyof ModelAdmissionPolicy, string> = {
  globalConcurrent: "OPSCREW_MODEL_GLOBAL_CONCURRENT", ownerConcurrent: "OPSCREW_MODEL_OWNER_CONCURRENT",
  globalMinuteRequests: "OPSCREW_MODEL_GLOBAL_MINUTE_REQUESTS", ownerMinuteRequests: "OPSCREW_MODEL_OWNER_MINUTE_REQUESTS",
  globalDailyRequests: "OPSCREW_MODEL_GLOBAL_DAILY_REQUESTS", ownerDailyRequests: "OPSCREW_MODEL_OWNER_DAILY_REQUESTS",
  globalMinuteCalls: "OPSCREW_MODEL_GLOBAL_MINUTE_CALLS", ownerMinuteCalls: "OPSCREW_MODEL_OWNER_MINUTE_CALLS",
  globalDailyCalls: "OPSCREW_MODEL_GLOBAL_DAILY_CALLS", ownerDailyCalls: "OPSCREW_MODEL_OWNER_DAILY_CALLS",
  leaseMs: "OPSCREW_MODEL_LEASE_MS",
};
/** Explicit, validated operator configuration. HTTP clients cannot set these limits. */
export function modelAdmissionPolicy(env: NodeJS.ProcessEnv = process.env): ModelAdmissionPolicy {
  const policy = {...DEFAULT_MODEL_ADMISSION_POLICY};
  for (const field of CONFIG_FIELDS) {
    const text = env[ENV_NAMES[field]]?.trim();
    if (text !== undefined && text !== "") {
      if (!/^\d+$/.test(text)) throw new Error(`${ENV_NAMES[field]} must be a positive integer.`);
      policy[field] = Number(text);
    }
  }
  return validatePolicy(policy);
}
function validatePolicy(policy: ModelAdmissionPolicy): ModelAdmissionPolicy {
  for (const field of CONFIG_FIELDS) {
    const maximum = field === "leaseMs" ? 300_000 : field.includes("Concurrent") ? 32 : field.includes("Calls") ? 12_000 : 2_000;
    if (!Number.isSafeInteger(policy[field]) || policy[field] < (field === "leaseMs" ? 120_000 : 1) || policy[field] > maximum) throw new Error(`Invalid model admission limit: ${field}.`);
  }
  for (const suffix of ["Concurrent", "MinuteRequests", "DailyRequests", "MinuteCalls", "DailyCalls"] as const) {
    if (policy[`owner${suffix}`] > policy[`global${suffix}`]) throw new Error(`The owner ${suffix} limit cannot exceed the global limit.`);
  }
  return Object.freeze({...policy});
}
export class ModelAdmissionError extends Error {
  readonly code: string; readonly status: number; readonly retryAfterSeconds: number;
  constructor(code: string, message: string, status = 429, retryAfterSeconds = 60) {
    super(message); this.name = "ModelAdmissionError"; this.code = code; this.status = status; this.retryAfterSeconds = retryAfterSeconds;
  }
}
export interface ModelAdmissionTicket {
  request_id: string; owner_id: string; input_digest: string; sequence: number;
  reserved_calls: number; created_at: string; expires_at: string; released_at: string | null;
  analysis_deadline_at: string;
}
export interface ModelUsageRecord {
  owner_id: string; sequence: number;
  minute: string; minute_requests: number; minute_calls: number;
  day: string; day_requests: number; day_calls: number;
  leases: {request_id: string; expires_at: string}[];
}
function digest(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function assertId(value: string): void {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_.:-]{1,128}$/.test(value)) throw new ModelAdmissionError("INVALID_ADMISSION", "The server request identity is invalid.", 400);
}
function fresh(record: ModelUsageRecord | null, owner: string, now: number): ModelUsageRecord {
  const timestamp = new Date(now).toISOString(), minute = timestamp.slice(0, 16), day = timestamp.slice(0, 10);
  if (record && (record.owner_id !== owner || !Number.isSafeInteger(record.sequence) || record.sequence < 0 || !Array.isArray(record.leases)
    || [record.minute_requests, record.minute_calls, record.day_requests, record.day_calls].some(value => !Number.isSafeInteger(value) || value < 0)
    || typeof record.minute !== "string" || typeof record.day !== "string"
    || record.leases.some(lease => !lease || typeof lease.request_id !== "string" || !Number.isFinite(Date.parse(lease.expires_at))))) throw new ModelAdmissionError("MODEL_LIMIT_STORAGE_INVALID", "The persisted model limits are unavailable.", 503);
  return {owner_id: owner, sequence: record?.sequence ?? 0, minute, day,
    minute_requests: record?.minute === minute ? record.minute_requests : 0,
    minute_calls: record?.minute === minute ? record.minute_calls : 0,
    day_requests: record?.day === day ? record.day_requests : 0,
    day_calls: record?.day === day ? record.day_calls : 0,
    leases: (record?.leases ?? []).filter(lease => Date.parse(lease.expires_at) > now)};
}

/** Shared Firestore transactions enforce model limits across instances and visitors.
 * Capacity is reserved conservatively; unknown usage is never refunded. */
export class ModelAdmissionService {
  readonly policy: Readonly<ModelAdmissionPolicy>;
  private readonly store: CaseStore; private readonly now: () => number;
  constructor(options: {store: CaseStore; policy?: ModelAdmissionPolicy; now?: () => number}) {
    this.store = options.store; this.policy = validatePolicy(options.policy ?? modelAdmissionPolicy()); this.now = options.now ?? Date.now;
  }
  ownerRecordId(uid: string): string { return `owner_${digest(uid)}`; }
  private ticketId(uid: string, requestId: string): string { return digest(JSON.stringify([uid, requestId])); }
  async reserve(uid: string, requestId: string, inputDigest: string, reservedCalls = 6, deadlineAt?: number): Promise<ModelAdmissionTicket> {
    assertId(requestId);
    if (typeof uid !== "string" || !uid || uid.length > 128 || !/^[a-f0-9]{64}$/.test(inputDigest) || !Number.isSafeInteger(reservedCalls) || reservedCalls < 1 || reservedCalls > 6) throw new ModelAdmissionError("INVALID_ADMISSION", "The server request reservation is invalid.", 400);
    const id = this.ticketId(uid, requestId);
    return this.store.runTransaction(async transaction => {
      const previous = await transaction.get<ModelAdmissionTicket>("admissions", id);
      const globalRecord = await transaction.get<ModelUsageRecord>("usage", "global");
      const ownerRecord = await transaction.get<ModelUsageRecord>("usage", this.ownerRecordId(uid));
      if (previous) {
        if (previous.owner_id !== uid || previous.input_digest !== inputDigest || previous.reserved_calls !== reservedCalls) throw new ModelAdmissionError("ADMISSION_CONFLICT", "The server request identity was reused for different input.", 409);
        return previous;
      }
      const now = this.now(), timestamp = new Date(now).toISOString();
      const analysisDeadline = deadlineAt ?? now + 90_000;
      if (!Number.isSafeInteger(analysisDeadline) || analysisDeadline <= now || analysisDeadline > now + 90_000) throw new ModelAdmissionError("WORKFLOW_DEADLINE", "The workflow deadline expired before model capacity was reserved.", 504);
      const global = fresh(globalRecord, "global", now), owner = fresh(ownerRecord, uid, now);
      for (const [scope, record] of [["global", global], ["owner", owner]] as const) {
        if (record.leases.length >= this.policy[`${scope}Concurrent`]) throw new ModelAdmissionError("MODEL_BUSY", "The sandbox is processing another request. Wait before trying again.", 429, 10);
        if (record.minute_requests >= this.policy[`${scope}MinuteRequests`] || record.minute_calls + reservedCalls > this.policy[`${scope}MinuteCalls`]) throw new ModelAdmissionError("MODEL_RATE_LIMIT", "The sandbox's minute allowance is exhausted. Wait before trying again.");
        if (record.day_requests >= this.policy[`${scope}DailyRequests`] || record.day_calls + reservedCalls > this.policy[`${scope}DailyCalls`]) throw new ModelAdmissionError("MODEL_DAILY_LIMIT", "The sandbox's daily model allowance is exhausted. Try again after the UTC day resets.", 429, Math.max(1, Math.ceil((Date.parse(`${timestamp.slice(0, 10)}T00:00:00.000Z`) + 86_400_000 - now) / 1000)));
      }
      const sequence = owner.sequence + 1;
      if (!Number.isSafeInteger(sequence)) throw new ModelAdmissionError("MODEL_LIMIT_STORAGE_INVALID", "The request sequence is exhausted.", 503);
      const ticket: ModelAdmissionTicket = {request_id: requestId, owner_id: uid, input_digest: inputDigest, sequence, reserved_calls: reservedCalls, created_at: timestamp, expires_at: new Date(now + this.policy.leaseMs).toISOString(), released_at: null, analysis_deadline_at: new Date(analysisDeadline).toISOString()};
      for (const record of [global, owner]) {
        record.sequence++; record.minute_requests++; record.minute_calls += reservedCalls;
        record.day_requests++; record.day_calls += reservedCalls;
        record.leases.push({request_id: id, expires_at: ticket.expires_at});
      }
      transaction.set("usage", "global", global); transaction.set("usage", this.ownerRecordId(uid), owner);
      transaction.set("admissions", id, ticket);
      return ticket;
    });
  }
  async assertCurrentCreation(transaction: CaseTransaction, uid: string, ticket: ModelAdmissionTicket, inputDigest: string): Promise<void> {
    const stored = await transaction.get<ModelAdmissionTicket>("admissions", this.ticketId(uid, ticket.request_id));
    const owner = await transaction.get<ModelUsageRecord>("usage", this.ownerRecordId(uid));
    if (!stored || stored.owner_id !== uid || stored.sequence !== ticket.sequence || stored.input_digest !== inputDigest || stored.reserved_calls !== ticket.reserved_calls
      || stored.request_id !== ticket.request_id || stored.analysis_deadline_at !== ticket.analysis_deadline_at || stored.expires_at !== ticket.expires_at || stored.created_at !== ticket.created_at
      || !Number.isFinite(Date.parse(stored.analysis_deadline_at)) || !Number.isFinite(Date.parse(stored.expires_at))) throw new ModelAdmissionError("ADMISSION_CONFLICT", "The persisted request reservation did not match this input.", 409);
    if (stored.released_at || Date.parse(stored.expires_at) <= this.now() || Date.parse(stored.analysis_deadline_at) <= this.now() || !owner || owner.owner_id !== uid || owner.sequence !== ticket.sequence) throw new ModelAdmissionError("STALE_VERSION", "A newer or expired request replaced this analysis. Analyze the current input again.", 409);
  }
  async release(ticket: ModelAdmissionTicket): Promise<void> {
    const id = this.ticketId(ticket.owner_id, ticket.request_id);
    await this.store.runTransaction(async transaction => {
      const stored = await transaction.get<ModelAdmissionTicket>("admissions", id);
      const global = await transaction.get<ModelUsageRecord>("usage", "global");
      const owner = await transaction.get<ModelUsageRecord>("usage", this.ownerRecordId(ticket.owner_id));
      if (!stored || stored.owner_id !== ticket.owner_id || stored.sequence !== ticket.sequence || stored.released_at) return;
      const timestamp = new Date(this.now()).toISOString();
      for (const [recordId, record] of [["global", global], [this.ownerRecordId(ticket.owner_id), owner]] as const) {
        if (record) transaction.set("usage", recordId, {...record, leases: record.leases.filter(lease => lease.request_id !== id)});
      }
      transaction.set("admissions", id, {...stored, released_at: timestamp});
      // No request or reserved-call counter is refunded after an unknown provider outcome.
    });
  }
  async readiness(): Promise<void> {
    const record = await this.store.get<ModelUsageRecord>("usage", "global");
    fresh(record, "global", this.now());
  }
}
