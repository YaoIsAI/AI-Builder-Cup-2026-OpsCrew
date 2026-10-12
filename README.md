# OpsCrew: Expense Exception Plan & Review

OpsCrew is a fresh Google AI Studio Build application extended locally for AI Builder Cup 2026. It turns **synthetic USD expense intake** into a reviewable handling plan using Gemini fact extraction, a separately prompted Planner and Reviewer, and fixed policy checks. A person explicitly confirms the current plan before the server saves a case and independently reads it back. The app performs no reimbursement approval or payment.

S3 is merged into GitHub main through [PR #3](https://github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew/pull/3), merge `dd0fb3f8cff460b725588447be1d94556ee7f8bb`. The continuation tracked in [PR #4](https://github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew/pull/4) adds persistent model admission, bounded deadlines, safe late-write ordering, production packaging and submission preparation. The teammate's October 12 updates add shared intake validation, production security headers, strict TypeScript and an exact-citation Reviewer prompt. Review corrections fix real-resource evidence accounting and the deployment guide. See [the latest code review](docs/acceptance/PR04-code-review-2026-10-12.md); [earlier precloud acceptance](docs/acceptance/PRECLOUD-readiness-2026-10-11.md) remains historical.

The next operator is the teammate. Begin with [the ordered cloud handoff](docs/CLOUD_TEAMMATE_HANDOFF.md), [deployment instructions](docs/PRECLOUD_DEPLOYMENT.md) and [reviewed cloud usage report](docs/DEPLOYMENT_AND_USAGE_REPORT.md). The teammate reported historical public planning and a later six-step Firestore path on revision `opscrew-00004-mtz`; source-to-image binding and complete real G3/G4 resource acceptance remain unverified. Independent held-out/live stability, final public video/product links and actual portal submission remain team gates. Local tests, liveness and historical runs on older revisions cannot pass them.

## Source origin and contest scope

The team created a blank Google Build app on October 7, without importing code from the earlier non-Google local prototype. Subsequent local changes are disclosed in [provenance](PROVENANCE.md), [scope](SCOPE.md) and [build log](docs/BUILD_LOG.md). The [AI Studio app](https://aistudio.google.com/apps/e8a0fb37-f747-45d2-b376-b832ac7fe09f) is the creation/editor reference. The final contest prototype requires an actual working Cloud Run/Firebase deployment and English source/docs/presentation. See [official requirements](https://aibuildercup.com/themes.html) and [submission checklist](SUBMISSION_CHECKLIST.md).

## Repository layout

- `aistudio-export-2026-10-07/`: application, locked dependencies, formal tests, deployment scripts and public synthetic fixtures. Run npm commands here.
- `docs/`: contracts, stage acceptance, current cloud handoff and immutable redacted evidence.
- `submission/`: editable official-template proposal, matching PDF, recording plan and optional material builder.
- `RELEASE_MANIFEST.json`: source/material identity and explicit pending cloud/video/portal fields.

Only this Google Build continuation is published. Secrets, dependency directories, generated bundles and private authoring previews are excluded from Git. Formal regression tests and source-bound acceptance results are necessary project outputs.

## Reproduce local checks

Use Node 24 and npm 11. The author tested Node 24.14.0/npm 11.9.0. Pull the **reviewed precloud commit**, rather than assuming an older main has these changes:

```powershell
git clone https://github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew.git
cd AI-Builder-Cup-2026-OpsCrew
git switch --track origin/feat/precloud-readiness
cd aistudio-export-2026-10-07
npm ci
npm test
npm run lint
npm run build
npm run smoke:production
npm run smoke:artifact
npm run evaluate:precloud -- --offline --output docs/acceptance/PRECLOUD-teammate-offline-NEW.json
```

Choose a new evidence filename. Offline evaluation makes no real Gemini call and uses injected identity/model output with MemoryCaseStore. Authentic Firebase emulator testing is separate; see [S3 emulator instructions](docs/S3_CONFIRMATION_CASES.md) and [current evaluation methods](docs/PRECLOUD_EVALUATION.md). `smoke:artifact` performs a fresh production-only lockfile install and validates the native Node runtime folder layout used by the Dockerfile. It does not run a Linux container. The teammate must execute an actual image build and deployment.

## Run the application locally

```powershell
Copy-Item .env.example .env
npm run dev
```

Open http://localhost:3000. Configure a personally authorized `GEMINI_API_KEY` only on the server, never in a `VITE_` variable, screenshot, report or PR. Set `GEMINI_MODEL=gemini-3.1-flash-lite` for the accepted release. Model availability and pricing depend on the operator's project. Public production model routes require trusted Firebase identity and persistent Firestore admission. `npm run preview` serves only static frontend assets and is not the full API app.

Default quotas reserve up to six provider attempts per workflow: global concurrency 2, visitor concurrency 1, global 6 runs/minute and 60/day, visitor 2/minute and 12/day. Counters reset by UTC calendar day and persist across instances. Unknown/failed usage is not refunded. The model kill switch stops new analysis while preserving owned case readback. Quotas and budget alerts do not guarantee a currency spending cap.

`GET /api/health` is liveness. `GET /api/ready` checks configuration and a bounded Firestore read, makes zero model calls, and does not prove Auth IAM, Gemini access, indexes or complete resource acceptance. Follow the real-resource scenario checklist rather than relying on a green probe.

## Team and submission handoff

Owner A reviews policy, local evidence and submission claims. Teammate B operates authorized Google Cloud/Firebase resources and returns real deployment/test evidence. Both verify final links and materials. Account consent, billing activation, eligibility and portal declarations require the authorized human. Keep private identity/financial documents outside this public repository.

The proposal is a **precloud review draft** with honest pending product/video links and captain GitHub alias. Complete the final names and cloud evidence after verification. [Recording plan](submission/RECORDING_PLAN.md) targets 165 seconds and requires encoded duration strictly below 180 seconds. Internal freeze is October 16 and submission October 17; verify the actual portal deadline. [Official timeline](https://aibuildercup.com/index.html)

For PRs, follow [CONTRIBUTING.md](CONTRIBUTING.md). Do not change the accepted model, prompts, policy, quota limits or deployment settings during evaluation without creating a new release and retaining earlier evidence.
