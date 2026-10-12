import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import type {Server} from "node:http";
import {createApp} from "../server.ts";

const fixture = JSON.parse(readFileSync(new URL("../fixtures/development-cases.json", import.meta.url), "utf8")).cases.find((item: {id: string}) => item.id === "DEV-04");

for (const model of ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"]) {
  test(`actual SDK serialization preserves valid FACTS/Planner/Reviewer controls for ${model}`, async () => {
    const nativeFetch = globalThis.fetch, requests: {role: string; config: any}[] = [];
    // Exercise production SDK serialization while intercepting every Google request
    // before network access. The key and responses below are explicitly offline.
    globalThis.fetch = (async (resource: string | URL | Request, init?: RequestInit) => {
      const url = resource instanceof Request ? resource.url : String(resource);
      if (url.startsWith("http://127.0.0.1:")) return nativeFetch(resource, init);
      assert(url.startsWith("https://generativelanguage.googleapis.com/"), "Unexpected outbound request blocked");
      assert(url.includes(`/models/${model}:generateContent`));
      const body = JSON.parse(String(init?.body ?? await (resource as Request).text()));
      const config = body.generationConfig;
      const isFacts = Boolean(config.responseSchema?.properties?.amount_minor);
      const payload = isFacts ? null : JSON.parse(body.contents[0].parts[0].text);
      const role = isFacts ? "FACTS" : payload.planner_proposal ? "REVIEWER" : "PLANNER";
      requests.push({role, config});
      const decision = payload?.deterministic_decision, facts = payload?.validated_facts;
      const output = isFacts ? fixture.facts : role === "REVIEWER" ? {
        verdict: "PASS", issues: [], citation_ids: decision.citations.map((citation: any) => citation.clause_id),
      } : {branch: decision.branch, action: decision.allowed_action,
        proposed_case: {case_type: decision.branch, amount_minor: facts.amount_minor, currency: facts.currency, receipt_status: facts.receipt_status,
          employee_identifier: facts.employee_identifier, description: facts.description, evidence_requirements: decision.evidence_requirements},
        citation_ids: decision.citations.map((citation: any) => citation.clause_id), rationale: "Intercepted offline SDK serialization regression."};
      return new Response(JSON.stringify({candidates: [{content: {role: "model", parts: [{text: JSON.stringify(output)}]}, finishReason: "STOP"}], modelVersion: "offline-sdk-serialization"}), {status: 200, headers: {"content-type": "application/json"}});
    }) as typeof fetch;
    let server: Server | undefined;
    try {
      const app = createApp({apiKeyOverride: "offline-sdk-placeholder-never-transmitted"});
      server = await new Promise(resolve => {const owned = app.listen(0, "127.0.0.1", () => resolve(owned));});
      assert(server);
      const address = server.address(); assert(address && typeof address === "object");
      const response = await nativeFetch(`http://127.0.0.1:${address.port}/api/workflow`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({...fixture.input, model_id: model})});
      const result = await response.json();
      assert.equal(response.status, 200); assert.equal(result.workflow.status, "REVIEWABLE");
      assert.equal(result.workflow.execution_authorized, false);
      assert.deepEqual(requests.map(request => request.role), ["FACTS", "PLANNER", "REVIEWER"]);
      for (const request of requests) {
        assert.equal(request.config.responseMimeType, "application/json");
        assert.equal(request.config.maxOutputTokens, 2048);
        if (model === "gemini-3.1-flash-lite") {
          assert.equal(request.config.temperature, request.role === "FACTS" ? 0.1 : 0);
          assert.equal(request.config.thinkingConfig, undefined);
        } else {
          for (const unsupported of ["temperature", "topP", "topK", "candidateCount"]) assert(!(unsupported in request.config));
          assert.equal(request.config.thinkingConfig.thinkingLevel, "LOW");
        }
      }
    } finally {
      globalThis.fetch = nativeFetch;
      if (server) {server.closeAllConnections(); await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));}
    }
  });
}
