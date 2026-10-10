import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { EnvHttpProxyAgent, setGlobalDispatcher } from "undici";
import { createApp } from "../server.ts";

// Local network egress is unreliable; route provider calls through the same
// proxy the shell tools use (NO_PROXY keeps loopback traffic direct).
setGlobalDispatcher(new EnvHttpProxyAgent());

// One bounded diagnostic: run the conflict-branch workflow locally while
// capturing each raw provider response. Local only; nothing is committed.
const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) { console.error("no key"); process.exit(1); }

const raw = {};
const loggingProvider = async (args) => {
  const ai = new GoogleGenAI({ apiKey: args.apiKey, httpOptions: { timeout: args.timeoutMs, retryOptions: { attempts: 1 } } });
  const response = await ai.models.generateContent({
    model: args.model,
    contents: args.promptPayload,
    config: {
      abortSignal: args.abortSignal, systemInstruction: args.systemInstruction,
      temperature: 0, maxOutputTokens: 2_048,
      responseMimeType: "application/json", responseJsonSchema: args.responseJsonSchema,
    },
  });
  raw[args.role] = { text: response.text, modelVersion: response.modelVersion };
  return { text: response.text, modelVersion: response.modelVersion, usageMetadata: response.usageMetadata };
};

const app = createApp({
  apiKeyOverride: apiKey,
  planningGenerateContentFn: loggingProvider,
});
const server = app.listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}`;

const response = await fetch(`${base}/api/workflow`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    description: "[SYNTHETIC] Emergency replacement USB-C display adapter purchased by employee SYNTH-EMP-9981 prior to customer keynote for $42.00 USD. Store register was out of receipt paper.",
    amount_usd: "42.00", receipt_status: "missing", employee_identifier: "SYNTH-EMP-2015",
    model_id: "gemini-3.1-flash-lite",
  }),
  signal: AbortSignal.timeout(120_000),
});
const body = await response.json();
console.log("ok:", body.ok, "| error:", body.error?.code ?? "none");
const rev = raw["REVIEWER"]?.text ?? "(captured nothing)";
console.log("\n===== RAW REVIEWER OUTPUT =====");
console.log(typeof rev === "string" ? rev : JSON.stringify(rev));
console.log("===== model:", raw["REVIEWER"]?.modelVersion, "=====");
const pl = raw["PLANNER"]?.text;
console.log("\n===== RAW PLANNER (first 500) =====");
console.log(typeof pl === "string" ? pl.slice(0, 500) : JSON.stringify(pl));
server.closeAllConnections(); server.close();
process.exit(0);
