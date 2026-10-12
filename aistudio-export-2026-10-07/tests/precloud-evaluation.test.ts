import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { evaluatePolicy, SYNTHETIC_USD_POLICY } from "../src/domain/policy.ts";
import { POLICY_VERSION } from "../src/domain/contracts.ts";
import {
  accounting, canonical, developmentOracle, digest, evaluateSemantic,
  HELDOUT_COVERAGE, PRESELECTED_REPEATS, textSourceDigest, validateCustodianDataset, validateOracle,
} from "../scripts/evaluate-precloud.mjs";

const fixtures = JSON.parse(readFileSync(new URL("../fixtures/development-cases.json", import.meta.url), "utf8")).cases;
const fixture = fixtures.find((item: { id: string }) => item.id === "DEV-04");
const binding = { run_id: "run-semantic", owner_id: "synthetic-owner", input_version: 1, facts_version: 1, policy_version: POLICY_VERSION, plan_id: "plan-semantic", plan_version: 1 };

function resultFor(item: typeof fixture) {
  const decision = evaluatePolicy(item.facts);
  return {
    ok: true, run_id: binding.run_id, facts: structuredClone(item.facts),
    workflow: {
      binding, decision, status: item.expected.status, execution_authorized: false,
      plan: decision.case_eligible ? { ...binding, action: decision.allowed_action, proposed_case: { ...item.facts }, citations: decision.citations, rationale: "An arbitrary differently worded but grounded rationale." } : null,
      review: { ...binding, verdict: "PASS", citations: decision.citations },
    },
  };
}

test("semantic oracle checks structured meaning, while accepting alternative rationale wording", () => {
  for (const item of fixtures) {
    const results = evaluateSemantic(resultFor(item), developmentOracle(item));
    assert(results.length >= 15 && results.every((entry: { outcome: string }) => entry.outcome === "PASS"));
  }
  const body = resultFor(fixture);
  assert(body.workflow.plan);
  body.workflow.plan.rationale = "Another paragraph that the oracle does not exact-match.";
  assert(evaluateSemantic(body, developmentOracle(fixture)).every((entry: { outcome: string }) => entry.outcome === "PASS"));
});

test("a valid citation ID with unrelated or stale text/version cannot satisfy semantic support", () => {
  for (const mutate of [
    (body: any) => { body.workflow.decision.citations[0].original_text = "All reimbursements are automatically paid."; },
    (body: any) => { body.workflow.decision.citations[0].policy_version = "synthetic-expense-usd-0.9.0"; },
    (body: any) => { body.workflow.decision.citations.push(body.workflow.decision.citations[0]); },
  ]) {
    const body = structuredClone(resultFor(fixture)); mutate(body);
    assert(evaluateSemantic(body, developmentOracle(fixture)).some((entry: { assertion_id: string; outcome: string }) => entry.assertion_id === "CITATION-DECISION" && entry.outcome === "FAIL"));
  }
  assert.throws(() => validateOracle([{ id: "FABRICATED", path: "workflow.decision.citations", op: "supported_citations", value: ["SYN-999"], critical: true }]), /fabricated/);
});

test("conflicts need both source meanings; invented known values violate preserved unknowns", () => {
  const conflict = fixtures.find((item: { id: string }) => item.id === "DEV-10"), body = resultFor(conflict);
  body.facts.contradictions = ["Form amount is $38.00; there is a conflict."];
  assert(evaluateSemantic(body, developmentOracle(conflict)).some((entry: { assertion_id: string; outcome: string }) => entry.assertion_id === "BOTH-AMOUNT-SOURCES" && entry.outcome === "FAIL"));
  const unknown = fixtures.find((item: { id: string }) => item.id === "DEV-07"), invented = resultFor(unknown);
  invented.facts.amount_minor = 0;
  assert(evaluateSemantic(invented, developmentOracle(unknown)).some((entry: { assertion_id: string; outcome: string }) => entry.assertion_id === "FACT-amount_minor" && entry.outcome === "FAIL"));
});

test("binding edits, case fabrication and authorized execution fail independently", () => {
  const body = structuredClone(resultFor(fixture));
  assert(body.workflow.plan);
  body.workflow.plan.input_version++;
  body.workflow.execution_authorized = true;
  Object.assign(body, { case_record: { status: "APPROVED" } });
  const results = evaluateSemantic(body, developmentOracle(fixture));
  for (const id of ["PLAN-BINDING", "EXECUTION-NOT-AUTHORIZED", "NO-INVENTED-CASE"]) assert(results.some((entry: { assertion_id: string; outcome: string }) => entry.assertion_id === id && entry.outcome === "FAIL"));
});

test("canonical hash identifies content independently of object insertion order", () => {
  assert.equal(canonical({ z: [3, { b: 1, a: 2 }], a: "value" }), canonical({ a: "value", z: [3, { a: 2, b: 1 }] }));
  assert.equal(digest({ z: 1, a: 2 }), digest({ a: 2, z: 1 }));
  assert.notEqual(digest({ a: 2 }), digest({ a: 3 }));
  assert.throws(() => canonical({ a: Number.NaN }));
  assert.equal(textSourceDigest(Buffer.from("const value = 1;\r\n")), textSourceDigest(Buffer.from("const value = 1;\n")));
  assert.notEqual(textSourceDigest(Buffer.from("const value = 1;\n")), textSourceDigest(Buffer.from("const value = 2;\n")));
  assert.throws(() => textSourceDigest(Buffer.from([0xff])), /encoded data/);
});

test("custodian metadata checks reject contamination, mismatched freeze and altered sealed content", () => {
  // Reuse already-public development examples for metadata guards only. This is never a held-out suite.
  const context = { commit: "a".repeat(40), canonical_sources_sha256: "b".repeat(64), frozen_at: "2026-10-01T00:00:00.000Z" };
  const metadataOnly = {
    schema_version: "opscrew-custodian-1.0.0", policy_version: POLICY_VERSION,
    cases: fixtures.slice(0, 8).map((item: any, index: number) => ({ id: `SCHEMA-METADATA-${index}`, coverage: HELDOUT_COVERAGE[index], input: item.input, oracle: developmentOracle(item) })),
    custody: { author: "Guard-test custodian placeholder", independent_machine: "Guard-test separate-machine placeholder", developer_access_before_first_run: false, first_run: true, release_commit: context.commit, frozen_sources_sha256: context.canonical_sources_sha256, sealed_cases_sha256: "", created_at: "2026-10-02T00:00:00.000Z" },
  };
  metadataOnly.custody.sealed_cases_sha256 = digest(metadataOnly.cases);
  assert.doesNotThrow(() => validateCustodianDataset(metadataOnly, context));
  for (const mutate of [
    (document: any) => { document.custody.developer_access_before_first_run = true; },
    (document: any) => { document.custody.first_run = false; },
    (document: any) => { document.custody.release_commit = "c".repeat(40); },
    (document: any) => { document.custody.frozen_sources_sha256 = "d".repeat(64); },
    (document: any) => { document.custody.created_at = "2026-09-30T00:00:00.000Z"; },
    (document: any) => { document.cases[0].input.description = "[SYNTHETIC] Modified after sealing"; },
    (document: any) => { document.custody.independent_machine = ""; },
    (document: any) => { document.cases[1].coverage = document.cases[0].coverage; },
    (document: any) => { document.cases[0].oracle = [{ id: "PLACEHOLDER", path: "ok", op: "equals", value: true, critical: true }]; document.custody.sealed_cases_sha256 = digest(document.cases); },
  ]) { const document = structuredClone(metadataOnly); mutate(document); assert.throws(() => validateCustodianDataset(document, context)); }
  assert.throws(() => validateCustodianDataset(metadataOnly, { ...context, public_input_hashes: fixtures.map((item: any) => digest(item.input)) }), /public development/);
});

test("repeat runs are four preregistered risks, never twelve independent samples", () => {
  assert.deepEqual(PRESELECTED_REPEATS.map((item: { id: string }) => item.id), ["RISK-CONFLICT", "RISK-CITATION", "RISK-INJECTION", "RISK-REVISION"]);
  assert.equal(new Set(PRESELECTED_REPEATS.map((item: { development_case: string }) => item.development_case)).size, 3);
});

test("missing attempt usage and missing request telemetry are unknown, not complete zero cost", () => {
  const report = accounting([{ evidence: { steps: [
    { token_usage: { total_tokens: 140 } }, { token_usage: null },
  ] } }, { evidence: null }], "live");
  assert.equal(report.reported_provider_attempts, 2); assert.equal(report.known_reported_tokens, 140);
  assert.equal(report.attempts_with_unknown_tokens, 1); assert.equal(report.complete_token_accounting, false);
  assert.equal(report.measured_cost_usd, null);
  assert.equal(accounting([{ evidence: { steps: [{ token_usage: { total_tokens: 140 } }] } }], "offline").complete_token_accounting, false);
});
