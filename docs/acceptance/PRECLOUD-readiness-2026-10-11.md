# Precloud acceptance and teammate release handoff

Local engineering/model reports were executed on October 11, 2026. Browser and material review completed on October 12 (Asia/Shanghai). This checkpoint completes the work that can be verified locally before the teammate deploys. It does not pass real-resource G3/G4, independent G5, final G6 or Submitted G7.

S3 is merged through [PR #3](https://github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew/pull/3), main merge `dd0fb3f8cff460b725588447be1d94556ee7f8bb`. The continuation branch is `feat/precloud-readiness`. Use the exact accepted PR head or resulting main commit, rather than the old S3 commit, for cloud deployment. The [release manifest](../../RELEASE_MANIFEST.json) binds reviewed source and retained materials; record the actual deployed Git SHA separately.

## Completed stages, acceptance and methods

| Stage / work | Delivered and accepted locally | Verification / evidence | Remaining gate |
| --- | --- | --- | --- |
| S3 integration | Merged owned confirmation/case/history/recovery implementation into main | Actual GitHub merge and fetched commit; historical [S3 acceptance](S03-confirmation-and-cases.md) retained | Real Firebase/Gemini write/readback remains G3 |
| S4 reliability and operations | Persistent shared/owner admission, UTC day caps and leases; 90-second end-to-end workflow deadline; late-create ordering; bounded readiness; explicit quotas; native production packaging and private digest-pinned release helper | 216 regressions, lint/build, authentic emulator 27 groups, SDK serialization tests, production artifact below; [backend detail](../PRECLOUD_BACKEND.md) | First Linux image build; IAM, indexes, public path, pause/restore and rollback on actual resources |
| S5 preparation and public development evaluation | Version-bound evaluation runner/oracle, journals, bounded opt-in live calls, independent-custody instructions and immutable public/fault/repeat reports | 350 assertions; three real local public Gemini cases passed after three preserved network failures; [evaluation status](../EVALUATION.md) | Clean release freeze and eight sealed independent cases on the teammate's separate machine; first live run, risk repeats and main demo three consecutive times |
| S6 material preparation | Official-template English editable proposal and same-page PDF; original Gemini logo; 165-second English recording plan; provenance and release inventory | All 13 final PPTX renders and all 13 rerendered PDF pages inspected; package/layout/actual GitHub link checked; [material review](PRECLOUD-materials-review-2026-10-12.md) | Real cloud screenshots/video, verified public team names, working public product/video links, final PowerPoint check and release freeze |
| Review / handoff | Backend, packaging and evaluation independently reviewed; no blocking runtime defect identified; cloud operations assigned to teammate | [Deployment runbook](../PRECLOUD_DEPLOYMENT.md), [teammate acceptance order](../CLOUD_TEAMMATE_HANDOFF.md), source binding and release review | Operator-approved account/billing/resource actions and jointly reviewed cloud evidence |

## Executed verification results

| Check | Observed result | Scope / reproduction |
| --- | --- | --- |
| Offline regressions | 216/216, zero failed/skipped/canceled; 31,653.599 ms | From the application directory: `npm ci`, `npm test`; [recorded metrics](PRECLOUD-validation-metrics-2026-10-11.json) |
| Type/format and frontend build | `npm run lint` passed; `npm run build` passed, 1,677 modules, 7.32 s | Vite 8.3.3; nonfatal existing `__dirname` native-config warning retained |
| Genuine Firebase emulators | 27/27 groups | Local Auth + Firestore, injected model fixtures, no real Gemini or production writes; [immutable report](S03-emulator-validation-2026-10-11-precloud.json). Use the documented emulator command with a new output filename |
| Semantic and recovery evaluation | 350/350 assertions, zero critical failures; 12 public cases, four public risk categories each three repeats, six fault/recovery operations | HTTP + MemoryCaseStore + injected identity/models, not real model quality; `npm run evaluate:precloud -- --help`, then the offline command in [evaluation instructions](../PRECLOUD_EVALUATION.md); [final report](PRECLOUD-offline-evaluation-2026-10-11-final.json) and adjacent formal journal |
| Production HTTP | 9/9 groups, 7,170 ms | `npm run smoke:production`, no credentials |
| Fresh production artifact | 12/12 groups, 80,416 ms; 29 source hashes unchanged; production audit zero; owned OS temporary directory cleaned, remaining zero | `npm run smoke:artifact`; exact Docker runtime file layout, fresh locked production-only install, native Node 24.14.0. Its 12 groups include the nine HTTP checks; do not add these counts as 21 independent checks. [Report](PRECLOUD-runtime-artifact-2026-10-11-final.json) |
| Linux container and cloud | NOT_RUN / PENDING | No Docker/Podman/gcloud available on this workstation; native packaging is not a Linux container or a deployed service |
| Current real local Gemini | DEV-04 passed 28,044 ms; DEV-01 23,237 ms; DEV-10 16,544 ms | Three plan-only public cases, nine successful provider calls; preserved three earlier local network failures. [History, journals and limitations](../PRECLOUD_EVALUATION.md#executed-live-results-including-initial-failures) |
| Browser interaction | Explicit consent, saved receipt/independent readback, edit invalidation, reload/same-UID history and reopened independent readback passed | Fixed production bundle, genuine local emulators and explicitly labeled `offline-browser-fixture`; [browser record](PRECLOUD-browser-review-2026-10-12.json), [default-preview screenshot](PRECLOUD-ui-desktop-2026-10-12.png), [390 px screenshot](PRECLOUD-ui-mobile-2026-10-12.png) |

Browser method: before visitor authentication, analysis was disabled. After authentication and Synthetic 05 selection, the validated offline plan passed review. Preparing confirmation left the checkbox unchecked and create disabled. Only checking consent enabled submission. The success panel reported independent readback of one USD 38 evidence-request record; opening history independently verified it again. Editing USD 38 to USD 39 cleared the old plan and authorization. Reload restored the same visitor UID, then history/open verified the original case. At the requested 390 ×844 breakpoint, document client/scroll widths were both 375, with no horizontal overflow. Shift+Tab reached the visible focus ring on Refresh history. The default screenshot reflects the actual narrow in-app preview, not a claimed 1200-pixel desktop test. Earlier S3 wide-screen evidence remains historical.

Six live case attempts across three public cases recorded 12 provider attempts. Known reported usage is 11,544 tokens; usage/actual upstream receipt of three initial failures and measured cost are unknown. Initial unavailable responses failed acceptance and remain visible. They do not demonstrate 58 unsafe executions or safe successes. Later successes do not establish P95, independent accuracy, a Reviewer improvement or operational savings.

## Source, dependencies and bounded risks

Canonical source digest: `833c353f2fee85d7207d5ff5a44d36ab52fafa11e96f650a1f1005f22edac3de`, across 32 explicitly listed UTF-8 paths with CRLF normalized to LF. Raw hashes are also preserved in the [October 11 source snapshot](PRECLOUD-freeze-2026-10-11.json). Final semantic/live reports bind to that source; earlier initial reports retain their historical in-progress hashes. The snapshot's dirty tree and S3 base commit are disclosed. It is not a clean independently accepted G5 release freeze.

The production audit has zero findings. Twelve development-tool findings (seven high, five moderate) remain documented in [dependency review](../DEPENDENCY_REVIEW.md). Do not force incompatible CLI dependency upgrades. The application reserves up to six provider attempts before each workflow; failed/canceled/unknown usage is not refunded. Admission/Firestore slowness can consume allowance and force a rerun, while business-case writes remain bounded and fail closed. Readiness performs no model call and is not proof of Auth IAM, model availability or ready production indexes. Free-tier latency and quota variability remain a real-cloud acceptance risk.

## Before cloud work and before submission

- [x] Runtime implementation, meaningful regression checks, real local emulator acceptance, public local Gemini rechecks and production-only layout verification complete.
- [x] Public evidence keeps all failed attempts, injected-provider labels and the distinction between local preparation and deployed acceptance.
- [x] English official-template draft, editable deck/PDF, provenance, recording plan, deployment helper and paired acceptance instructions prepared.
- [x] Runtime source frozen; formal tests and necessary reports retained. Temporary preview services stopped, viewport reset and agent-created browser tab closed.
- [ ] Final source/material/format/credential/cleanup publication receipt: see [the current publication review](PRECLOUD-delivery-review-2026-10-12.md). Automatic deletion approval was rejected; owner cleanup is pending. Engineering checks do not preempt that result.
- [ ] Teammate builds the actual Linux image and executes all real G3/G4 scenarios, recording Git SHA, image digest, revision, identity, rules/indexes, independent readback, isolation and drills.
- [ ] Teammate creates a clean independent freeze/custody and executes G5; current public fixtures cannot be relabeled held-out data.
- [ ] Both finalize G6 with real public links, a video under 180 seconds, verified names, current screenshots and final slide compatibility; captain verifies actual G7 Submitted receipt.

Competition requirements are mapped in [the submission checklist](../../SUBMISSION_CHECKLIST.md), based on the [official site](https://aibuildercup.com/index.html), [FAQ](https://aibuildercup.com/Faqs.html) and [themes](https://aibuildercup.com/themes.html). The eight held-out cases and engineering gate counts are team acceptance criteria, not official contest-mandated test counts. No cloud billing, resources, account settings, public-video publication or portal submission occurred during this local checkpoint.
