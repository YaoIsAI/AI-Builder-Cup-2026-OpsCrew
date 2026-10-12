# Pre-cloud backend controls

Updated: 2026-10-11 (Asia/Shanghai). These changes prepare the accepted S3 workflow for cloud testing. They do not establish a public deployment, real Google/Firebase acceptance, account access or billed cost.

## Durable model admission and run ordering

Production model endpoints require a verified Firebase visitor, Firestore mode and a successful shared Firestore capacity reservation before any Gemini call. Disabled backend mode remains available for local planning work; it cannot make production model calls. No in-memory adapter is selected at runtime. `MemoryCaseStore` remains an explicitly injected offline test adapter.

Admission uses `opscrew_s3_usage` and `opscrew_s3_admissions`, alongside the existing server-only collections. The Firestore deny-all client rules cover these collections. No new composite index is required: admission reads deterministic documents inside transactions.

A reservation allocates a server-owned sequence for its UID, reserves the maximum number of provider attempts and acquires an expiring lease. Run creation is a separate transaction that reads that same admission/sequence and the current head before writing. A delayed creation from an older reservation therefore cannot replace a newer run's head, including transaction retries. A timed-out reservation may consume allowance later, but it never moves a run head by itself.

The run ID is deterministic for `(UID, server request ID)`. Replaying that creation returns the same run without allocating a revision or moving the head. Client input versions still do not control the authoritative server revision. Different HTTP analyses receive distinct server request IDs; they are new analyses and consume new allowance.

Runs store the absolute analysis deadline. A creation/completion callback that arrives after that deadline cannot persist a passing result. An abandoned run that committed before its response was lost is asynchronously invalidated. A later result cannot replace a newer head. Case creation still requires current owned policy/plan/review/digests and explicit human confirmation; no model or timeout path creates a business case.

Remote Firestore RPCs cannot be canceled with certainty after dispatch. At the HTTP deadline the server returns failure promptly, retains actual completed-step evidence and does not wait for further storage. Failure-envelope persistence and invalidation then run best effort. If storage remains unavailable, its final state is unknown; owned history and a new analysis are the recovery path. No durable failure or successful readback is claimed without observing it. The case command's existing exact-command/read-only recovery remains separate from analysis creation recovery.

## Default allowances

| Control | All visitors / instances | One verified visitor |
| --- | ---: | ---: |
| Concurrent model requests | 2 | 1 |
| Requests per UTC minute | 6 | 2 |
| Requests per UTC day | 60 | 12 |
| Reserved provider attempts per UTC minute | 36 | 12 |
| Reserved provider attempts per UTC day | 360 | 72 |

`/api/workflow` reserves six attempts (at most two each for FACTS, Planner and Reviewer). `/api/analyze` reserves two. The counters are conservative capacity reservations, not measured token use, a price estimate or a financial spending cap. An unknown/failed model attempt is never refunded. Released leases free concurrency only. A process crash or failed release retains capacity until its 180-second lease expires. Resetting an anonymous session cannot bypass the global quotas, which are shared in Firestore across application instances.

`MODEL_BUSY`, `MODEL_RATE_LIMIT` and `MODEL_DAILY_LIMIT` return HTTP 429 with `Retry-After`. Storage failure returns a sanitized failure and makes zero subsequent model calls. Owned case/history reads remain available when model capacity is exhausted or model processing is paused.

The operator can set these environment variables; HTTP clients cannot alter them:

| Variable | Default |
| --- | ---: |
| `OPSCREW_MODEL_ENABLED` | `true` |
| `OPSCREW_MODEL_GLOBAL_CONCURRENT` | `2` |
| `OPSCREW_MODEL_OWNER_CONCURRENT` | `1` |
| `OPSCREW_MODEL_GLOBAL_MINUTE_REQUESTS` | `6` |
| `OPSCREW_MODEL_OWNER_MINUTE_REQUESTS` | `2` |
| `OPSCREW_MODEL_GLOBAL_DAILY_REQUESTS` | `60` |
| `OPSCREW_MODEL_OWNER_DAILY_REQUESTS` | `12` |
| `OPSCREW_MODEL_GLOBAL_MINUTE_CALLS` | `36` |
| `OPSCREW_MODEL_OWNER_MINUTE_CALLS` | `12` |
| `OPSCREW_MODEL_GLOBAL_DAILY_CALLS` | `360` |
| `OPSCREW_MODEL_OWNER_DAILY_CALLS` | `72` |
| `OPSCREW_MODEL_LEASE_MS` | `180000` |

Malformed, zero, excessive or inverted per-owner/global settings fail startup. Maximum configured concurrency is 32, requests 2,000 per configured window and reserved attempts 12,000 per window. Lease bounds are 120–300 seconds. These are validation ceilings, not recommendations to raise the tested defaults. Changing the operator limits requires repeating the applicable acceptance checks.

Setting `OPSCREW_MODEL_ENABLED=false` pauses model endpoints before admission or run creation. Existing owned case/history endpoints remain available. Redeploy/restart to apply changed environment configuration. This switch does not stop requests already dispatched in an earlier process or cap unrelated cloud charges. Billing budgets/alerts, Cloud Run maximum instances, Google API quotas and Firestore operations require separate owner configuration and real verification.

## Absolute deadlines and retries

The workflow HTTP deadline is **90 seconds from route entry**, including authentication, admission, run creation, FACTS, Planner, Reviewer and result persistence. All awaited phases use the remaining absolute budget. `/api/analyze` has a 45-second absolute limit. The user cannot extend these limits in an HTTP body.

- Firebase token verification: at most 10 seconds and the remaining HTTP budget.
- Each storage phase: at most 30 seconds and the remaining HTTP budget.
- FACTS SDK attempt: at most 40 seconds and the remaining budget; FACTS phase: at most 45 seconds and the remaining budget.
- Planner/Reviewer: at most 30 seconds per attempt, a 60-second shared planning/review budget and the remaining absolute HTTP budget.
- SDK retries are disabled. The service retries only HTTP 429/503 once, while budget remains. It never retries a timeout, changes models silently, invents a successful response or substitutes a fixture in the product.
- Each attempted model call records its role, attempt, outcome, duration, upstream status and known token use. Failed/unknown usage remains unknown. FACTS output is capped at 2,048 output tokens; validated response fields and deterministic vetoes remain unchanged.

Raising the FACTS SDK ceiling from 25 to 40 seconds addresses the observed free-tier calls near the previous 25-second limit. It does not prove a new live success rate or guarantee that a free-tier request will finish within the budget. Shared deadlines may leave less time for later roles; the server fails closed with actual partial evidence.

The accepted default `gemini-3.1-flash-lite` keeps its existing sampling settings. For the optional `gemini-3.8-flash` and moving `gemini-flash-latest` alias, all three roles omit deprecated sampling controls and use low thinking effort. This follows the current [Google migration guidance](https://ai.google.dev/gemini-api/docs/latest-model?hl=en), checked October 11. Intercepted SDK serialization tests verify the actual outbound request configuration with zero Google network requests; availability, access, semantic quality and cost for those optional models remain unverified. No automatic model upgrade is performed.

## Readiness and verification

`GET /api/health` is liveness and reports stage `S4`. `GET /api/ready` requires enabled model processing, a configured Gemini secret, trusted identity, persistent storage and, in production, Firestore mode. It probes the shared usage document with a bounded five-second Admin read and makes zero model calls. Failure returns HTTP 503 with a sanitized error. Successful readiness proves this configuration/storage read only; it does not prove Gemini availability, Firebase revocation permissions, real end-to-end writes, browser behavior or public access. Those remain cloud acceptance tasks.

`GET /api/config` publishes operator limits and timeout values, never counters, visitor identities, tokens or the server Gemini secret.

Local regression methods:

```powershell
Set-Location aistudio-export-2026-10-07
npm run lint
node --import tsx --test tests/precloud-admission.test.ts tests/precloud-workflow-http.test.ts tests/s3-case-service.test.ts tests/s3-workflow-http.test.ts tests/workflow-http.test.ts
```

The added tests exercise cross-instance/concurrent reservation limits; request/call minute/day quotas; no refunds after unknown usage; UTC resets; persisted sequence/order; idempotent create replay; creation/confirmation deadlines; storage outages; kill switch; readiness; exact SDK budgets; delayed authentication/admission/result acknowledgments; and late writes after HTTP timeout. The genuine Auth/Firestore emulator runner uses an explicitly raised **harness-only** quota and a separate real-time admission clock, while its approval-expiry clock advances for expiry tests. Production-default quota rejection remains covered independently. Historical acceptance reports are immutable; new results need new evidence files.

Backend development checkpoints on October 11 passed 77/77 focused tests and a subsequent 14/14 SDK/deadline checkpoint. Eleven HTTP tests overlap, so these checkpoints cover 80 distinct focused tests, including 35 added pre-cloud tests. The latest type check, emulator-runner syntax check and Git whitespace check passed. These are developer checkpoints; the final integrated suite/emulator/source-bound release report is the handoff authority. No genuine Gemini request was made by these tests.

Cloud handoff must verify the frozen source, deploy the server runtime with Firestore/ADC/Secret Manager settings, run authentic model and owner-isolation cases, test the shared limits on actual instances, observe unknown-write/readback recovery and record real outcomes. A local fixture/emulator pass is never labeled real cloud or independent held-out evaluation.
