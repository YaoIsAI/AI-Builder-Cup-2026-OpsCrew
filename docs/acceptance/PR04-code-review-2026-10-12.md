# PR #4 teammate code review

Reviewed October 12, 2026. The user authorized review and merge of eligible teammate changes. Previous reviewer head: `8793865657a5566e0ed34b31dac13a84d60ab88c`; teammate head reviewed: `6091ed3868bcb1d889a82e3b4b700497c1154058`. [PR #5](https://github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew/pull/5) is closed without a GitHub merge, but its complete history is already included in [PR #4](https://github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew/pull/4). Main was still the accepted S3 merge when review began. Subsequent reviewer corrections remain on this same branch for exact-head verification before merging.

## Review findings and corrections

Three independent reviews covered runtime behavior, deployment/acceptance tooling and evidence/operational claims. No blocking runtime defect was found in the teammate's intake/CSP/strict-typing/Reviewer changes. The following P2 issues required correction before merge:

| Finding | Trigger / consequence | Correction and meaningful regression |
| --- | --- | --- |
| Final-entry false PASS | The live runner computed `ok` and counts before its final signed-out entry check; a 404 could still exit successfully | Final aggregation follows all checks; failed/timed-out public entry remains FAIL even after a committed case |
| Lost or late evidence | Exceptions after model calls or business writes skipped report saving; an existing output was refused only after real side effects | Exclusive output preflight before all calls; synced request checkpoints and final failure evidence; tests prove existing output makes zero calls and unknown writes are retained |
| Untraceable unknown command | A failed commit/readback lacked the original command metadata needed to locate the operation | Persist run/plan/versions/approval/idempotency identifiers and owner hash before commit; preserve unknown outcome without blind retry or token storage |
| Accounting and private transport | One workflow was labeled one provider call; private requests omitted the Cloud Run IAM header; signup/entry lacked bounds and bare flags could fall into another mode | Preserve per-attempt model/time/error/token telemetry and unknown totals; distinct IAM/Firebase headers; private entry marked NOT_RUN; strict CLI parsing and bounded requests; all covered offline |
| Incorrect operational guidance | Fabricated policy thresholds/clauses, incompatible API fields, wrong pause flag, `latest` described as pinned, USD40 described as a hard cap, and rollback to public unprotected code | Rewrite English MD/HTML against source; retain scope/cost limits and correctly versioned secrets; remove unprotected public fallback guidance |
| Evidence/source overclaim | Cross-revision partial cloud summaries were labeled complete acceptance; old manifest hashes no longer matched five changed files | Preserve historical JSON; disclose missing complete attempt/source/image binding; create current source identity and fresh local reports; current real G3/G4 and G5 remain pending |

The one-off `diag-reviewer.mjs` raw-output diagnostic was removed from the current tree; its history is preserved in Git. A maintained acceptance runner and formal regression tests remain. Local assistant configuration is ignored without claiming all local edits were generated in Google Build.

## Runtime and deployment review

- Shared intake validation precedes admission/model calls. Production identity, persistent quota, workflow deadlines and late-create ordering are retained.
- Reviewer prompt now explicitly requires the exact citation set, matching the existing deterministic verifier. Prompt version is `opscrew-reviewer-1.0.1`; FACTS/Planner versions are unchanged.
- The confirmation component's effect update preserves edit invalidation and read-only recovery; the server remains the final owner/current-version/approval gate.
- Production CSP covers anonymous Firebase/token endpoints without enabling arbitrary scripts. Actual mobile/Safari authentication/token refresh should still be part of the operator's cloud browser acceptance; no unnecessary CSP relaxation was introduced.
- Deployment exclusions retain all application/runtime files. Native packaging reproduces the production-only Docker runtime layout; no actual Linux image build or cloud change was performed by this reviewer.

## Executed local validation

Runtime canonical source digest: `35f0f112162996f5a26036a35998d7f53316a89c97f9c30327b0380c4a22d05c`, using the same 32 normalized UTF-8 paths as the original freeze. Reviewer-tool/test hashes are also recorded in the [current release manifest](../../RELEASE_MANIFEST.json). Original source snapshot and cloud JSON remain unchanged.

| Check | Observed result | Method / boundary |
| --- | --- | --- |
| Teammate head before corrections | 217/217 tests; strict lint PASS; build PASS, 1,677 modules, 4.05 s | Actual local commands, no live model; preexisting Vite native-config warning retained |
| Corrected live runner | 15/15 focused regressions; syntax/lint PASS | Injected transport, no real identity/model/cloud calls; proves public-entry failure, output preflight, unknown commit/recovery metadata, telemetry, timeout, redaction and private headers |
| Full post-correction suite | 232/232 PASS, zero failed/skipped/cancelled; 37,866.0611 ms; strict lint PASS | `npm test`, `npm run lint`; [source-bound local validation](PR04-local-validation-2026-10-12.json) |
| Genuine local Firebase | 27/27 groups PASS | [Fresh emulator report](S03-emulator-validation-2026-10-12-pr04.json), zero real Gemini and zero production writes. Initial CLI filename was refused before checks; corrected to the allowed immutable S03 name and reran successfully |
| Public semantic/fault/repeats | 350/350 assertions; zero critical failures; 8,427 ms | [New offline report](PR04-offline-evaluation-2026-10-12.json) and adjacent journal; 12 public cases, four categories ×3 and six faults; injected providers/identity with MemoryCaseStore |
| Fresh production layout | 12/12 groups including nine HTTP checks; 86,129 ms | Fresh locked production-only install and native Node runtime, without model credentials; its owned temporary directory was cleaned by the maintained checker. Linux container NOT_RUN |
| Format, links, source and credentials | PASS: 149 publishable files, 35 Markdown files, 276 relative links, 39 JSON files and five journals; zero errors or credential patterns | All 32 runtime, six operational and six retained material hashes match; historical formal tests/reports are retained |

## Cloud and merge boundary

The teammate's historical Cloud Run summaries are partial plan-only evidence, with unresolved provider counting and exact source/image binding. This reviewer issued only four read-only root/health/config/readiness requests; [all returned no HTTP response through the local network path](PR04-cloud-readonly-review-2026-10-12.json). This does not establish a down service or a 503 response. No signup, model, business-write, billing, IAM or traffic request occurred.

Three GitHub detail attempts failed with connection/timeout errors. The owner was asked to restore network access under the session's webpage protocol; local work continued. Remote merge is **PENDING_NETWORK_AND_EXACT_HEAD_RECHECK** at this local checkpoint. After network restoration, verify the final pushed head, required checks/merge state, then merge the accepted PR to main and independently fetch the result. This working merge record is updated from observed results, without rewriting executed test evidence.

Final parent-directory Glob examined 47,051 entries: zero newly owned temporary-pattern paths remained. The maintained artifact checker and regression tests cleaned their own OS temporary directories; emulator ports 8080/9099 have no listeners. Fifty-three inherited temporary-pattern paths remain within the previously blocked private render directory and the two debug logs. No rejected deletion was retried. Formal tests/new reports are necessary results; no global cleanup-done claim is made while inherited targets remain.

## Network-restored integration checkpoint

The owner notified network restoration and subsequently explicitly authorized direct review and merge. A fresh GitHub read/fetch found three additional teammate commits, ending at `7fb9e03ed21c8e6a3eb01e5be2574ccec3dfae9a`. The reviewer merged that history without a force push, retaining the earlier fixes. Conflicting deployment reports preserve correct English contracts and incorporate the new claimed `opscrew-00004-mtz` revision and six-step Firestore happy path as attributed, partial evidence. No new full response/attempt journal or accepted source/image binding accompanies those claims.

The ESM alias and vendor-chunk optimization are accepted. The proposed smoke `nodeMajor >= 22` guards are not accepted as proof of broader runtime compatibility: the project engines, `.node-version` and Docker contract remain Node 24. Both tools retain that guard. The maintained production asset group now serves and verifies every built JavaScript chunk. Function-style chunk compatibility and its deprecation are documented by [Vite's migration guide](https://vite.dev/guide/migration); early Node 22 cannot directly execute the current TypeScript startup as described in [Node's TypeScript documentation](https://nodejs.org/docs/latest-v22.x/api/typescript.html).

Fresh [integration evidence](PR04-build-integration-2026-10-12.json) binds canonical source `5acc8cafe5a41e3a1d773905072c23021d76508a4cf7ad4d04c6858fe42f2704`:

- Full offline suite: **232/232**, zero failed/skipped/cancelled, 36,155.8111 ms; strict type check PASS.
- Vite 8.3.3 production build: **PASS**, 1,677 modules, 2.91 seconds, zero warnings observed; application entry 79.28 kB plus vendor/runtime chunks.
- Fresh locked production-only native artifact: **12/12** groups including nine HTTP groups and all **five** JavaScript chunks, 93,034 ms. Actual Linux container NOT_RUN.
- Actual production-browser mount/console inspection: **NOT_RUN — browser tool unavailable**. IAB was unavailable; Comet coordinate input and recovery screenshot failed. No successful test tab or screenshot was created. The owned localhost server/session was stopped and port 3194 has no listener. The operator should check the split build in a real browser; no browser pass is claimed.
- All 30 other runtime inventory paths and all six operational paths are unchanged. Previous **27/27** emulator groups and **350/350** semantic assertions are retained for that unchanged business logic; they were not rerun or rewritten as new-source cloud checks.

GitHub's active ruleset `24760417` ordinarily requires one approving review, with a pre-existing `RepositoryRole` actor 5 `always` exception. The current authenticated repository permission is admin. The owner explicitly authorized direct approval and merge after this rule was disclosed. No ruleset or permission is modified; the normal exact-head merge API is used under that existing exception. A GitHub author cannot submit an approving review on their own PR; this document records the completed independent local review without inventing such a GitHub event. This checkpoint is **LOCAL_REVIEW_APPROVED_PENDING_EXACT_REMOTE_HEAD_MERGE**; only the actual GitHub merged state and fetched merge SHA can establish merge completion.

The post-restoration Glob examined 47,144 entries and found no new reviewer-owned temporary pattern. The inherited 53 render-cache/debug paths remain under the earlier cleanup restriction. New user video, subtitles, slide assets, player, archive and extraction directory were not created by this review and are preserved outside this PR.
