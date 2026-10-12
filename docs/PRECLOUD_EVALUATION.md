# Precloud evaluation and independent custody

Updated: 2026-10-11 (Asia/Shanghai). This implements the team's [preregistered evaluation protocol](EVALUATION_PROTOCOL.md). These engineering thresholds are team release gates, not organizer-prescribed metrics. A local pass does not satisfy the contest's deployed-prototype requirement.

## Scope and contest fit

OpsCrew belongs to **Future of Work & Enterprise Productivity**: Gemini extracts expense evidence, proposes a policy-backed exception, and independently reviews it; a person confirms a current plan before one synthetic case is committed and independently read back. The competition requires Google AI/platform use and a Cloud Run/Firebase deployment, English materials, a proposal deck converted to PDF, and a public video. The FAQ specifies a public repository, a deployed link, a video under three minutes, and a fresh project built during the competition. [Requirements and scoring](https://aibuildercup.com/themes.html), [FAQ](https://aibuildercup.com/Faqs.html)

The public [provenance](../PROVENANCE.md) records the blank Google AI Studio Build origin, original export hashes, historical genuine Gemini envelopes, and later locally authored extensions. Existing application code from the older parent workspace was not imported. The evaluation report must retain that distinction; offline fixtures are never renamed as Google-generated or live results. Eligibility, actual portal fields, declarations, logo rights and registration remain captain-owned verification.

The 40% technical/Gen AI criterion needs genuine model participation and a functioning deployed workflow. The 25% impact criterion needs a concrete user problem and measured evidence before claiming savings. The 25% innovation criterion can demonstrate current-revision human confirmation, deterministic policy veto, business uniqueness and independent readback. The 10% experience criterion needs usable English UI and coherent failure/recovery behavior. These are evidence priorities, not a predicted score. [Official criteria](https://aibuildercup.com/themes.html)

## Local runner and executed evidence

Run from `aistudio-export-2026-10-07` with the repository's pinned Node/npm versions:

```powershell
node scripts/evaluate-precloud.mjs --offline --output docs/acceptance/PRECLOUD-offline-evaluation-NEW.json
```

Every output name must be new. Existing report or journal names are refused before model calls. A formal `.attempts.jsonl` journal records request starts and completed results immediately; retain it with the final JSON. A start without a finish means an interrupted/unknown attempt, not success or zero usage. The final report compares source hashes before and after execution and cannot pass if implementation, configuration or oracle changed during the run.

This runner exercises real loopback HTTP routes with **injected model outputs, a deliberately injected offline identity verifier and `MemoryCaseStore`**. Its configuration object uses the emulator shape for code-path coverage, but no Firebase SDK emulator identity or Firestore emulator is involved. Genuine emulator evidence remains separate in the [S3 acceptance report](acceptance/S03-confirmation-and-cases.md) and the current precloud acceptance bundle.

| Denominator | Local runner | Meaning |
| --- | --- | --- |
| Public development cases | 12 | Existing public synthetic examples; prompt/policy developers can read them |
| High-risk repeat operations | 4 categories × 3 attempts | Conflict, fabricated/stale citation, prompt injection, stale human confirmation after revision; repeats add **zero independent cases** |
| Injected fault/recovery operations | 6 | Bounded timeout, 429 then success, exhausted 5xx, invalid JSON, storage failure before model invocation, lost response with service restart/readback outage |
| Oracle guard regressions | 8 | Meaning rather than wording; unsupported citation text/version; both conflict sources; unknown preservation; binding/authority/case fabrication; stable hashes; custody contamination; unknown usage |

The [initial run](acceptance/PRECLOUD-offline-evaluation-2026-10-11-initial.json) passed 12/12 public cases, 12/12 repeat operations and 6/6 faults, with **350 assertions and no critical failures**. It ran for 8,900 ms including initial local module loading, made zero real Gemini calls and zero production Firestore writes. Its source was an in-progress precloud tree; it is historical local evidence, not the final freeze or a model-quality measurement. Source changes after that run require a new report rather than editing it. Later source-bound release evidence is linked from the final precloud acceptance record.

The [final source-bound local run](acceptance/PRECLOUD-offline-evaluation-2026-10-11-final.json), with its [immediate attempt journal](acceptance/PRECLOUD-offline-evaluation-2026-10-11-final.attempts.jsonl), ran from `2026-10-11T12:35:49.063Z` to `2026-10-11T12:35:54.120Z` (5,057 ms). It passed the same 12 public cases, 12 risk repetitions, six faults and 350 assertions with zero critical failures. Start/end source digests matched `833c353f2fee85d7207d5ff5a44d36ab52fafa11e96f650a1f1005f22edac3de`. All 77 reported provider-stage attempts were injected and had no actual token telemetry; real Gemini calls and production Firestore writes were zero. The first development case included 3,497 ms of cold module initialization, so this timing is not a model/cloud latency measurement.

The [October 11 precloud snapshot](acceptance/PRECLOUD-freeze-2026-10-11.json) identifies these reviewed sources, policy, prompts, model, oracle and preselected risks. It truthfully records base commit `dd0fb3f8cff460b725588447be1d94556ee7f8bb` and `working_tree_dirty: true`: changes were under review and not yet committed. This is a source-binding document, **not a clean accepted release freeze, independent custody certificate or G5 pass**. The custodian must generate a new manifest from the clean accepted release on their own machine before authoring hidden cases, as specified below. Retain the historical snapshot unchanged.

The offline provider intentionally follows the known deterministic policy. Thus a passing offline semantic rate demonstrates the contracts and gates, not Gemini's extraction accuracy, Reviewer benefit or performance. Before/after business-case counts establish zero unauthorized/new cases for denials; runs, reservations and redacted audit events may exist. The lost-response fixture intentionally commits exactly one authorized synthetic case and recovers the same ID; its count is one, not zero.

## Semantic oracle

Each custodian case has an `oracle` array of `{id, path, op, critical, ...}`. Assert structured facts, preserved unknowns, the applicable branch, supported citations, permissible action, execution state and version binding. Do not exact-match generated rationale paragraphs.

| Operation | Expected fields | What it verifies |
| --- | --- | --- |
| `equals` | `value` | Exact structured scalar/null meaning; amounts use integer USD cents |
| `set_equals` | `value: []` | Exact unordered required-field set; duplicates rejected |
| `contains_groups` | `groups: [[alternative, ...], ...]` | Each conflict source has at least one meaningful representation in the preserved contradiction list |
| `supported_citations` | `value: [clause IDs]` | Exact supporting set **and canonical policy version/text**; a real ID alone cannot pass |
| `version_binding` | No `value`; path points to plan/review | Run, owner, input/facts/policy/plan versions agree with the current workflow binding |
| `not_null` / `absent` | No `value` | Required structured record exists / an unauthorized result field was not invented |

All custodian cases must include critical assertions for `ok`, facts' amount/currency/employee/receipt, workflow status/branch/eligibility/execution state, and decision/Reviewer citations. Add plan/action/binding, missing-field and both-source conflict assertions where applicable. A syntactically valid schema is not sufficient semantic coverage: the independent custodian must review the labels against the frozen policy before sealing.

Assertions produce individual PASS/FAIL outcomes. Case pass requires every assertion; an unmet critical assertion blocks that run's release-quality claim. On transport failure, missing facts/workflow cause required assertions to fail: this means the expected result was unavailable, not that the model demonstrably proposed an unsafe action. Report transport availability, completed-result semantics and controlled safety operations separately; do not treat unavailable cases as safe successes or remove them from the first-attempt denominator. An absent `case_record` field in a plan-only error envelope does not prove the safety of a durable write path. Human disputes need a written adjudication naming the assertion and rationale, without silently changing labels or deleting failed attempts.

## Small owner-authorized live development batch

Only use the owner's designated Gemini key in the process environment. The runner never accepts credentials in arguments, never reads a key file, and redirects dotenv to the operating system's null device before loading the server. Do not paste a key into source, documentation or a saved command. This command assumes `GEMINI_API_KEY` is already safely set by the operator:

```powershell
node scripts/evaluate-precloud.mjs --live --cases DEV-01,DEV-04,DEV-10 --maximum-provider-attempts 18 --output docs/acceptance/PRECLOUD-live-development-NEW.json
```

The batch explicitly disables Firebase and tests **live Gemini planning locally**; it creates no cloud case and supplies no fabricated identity. Six is a conservative maximum provider attempts per selected workflow (three roles, at most two attempts each). The allowance is checked before calls and defaults to 24. No runner-level request retry is performed. SDK/server retries remain visible in the response telemetry. Billing/key/access errors stop the batch; an exhausted 429 stops further cases. Preserve all failed and unattempted cases. A missing response/usage is unknown, not zero tokens or cost. The selected model, prompt versions and raw per-attempt durations are retained; this small batch cannot establish a reliable P95 or financial savings.

### Executed live results, including initial failures

All three reports below have matching start/end source digest `833c353f2fee85d7207d5ff5a44d36ab52fafa11e96f650a1f1005f22edac3de`; no application, prompt, policy or oracle source changed between them. Every formal report has its immediate attempt journal. They use the owner's authorized test key and `gemini-3.1-flash-lite` without activating billing.

| Batch | Case attempts and outcome | Reported provider attempts / usage | Retained evidence |
| --- | --- | --- | --- |
| Initial local network configuration | DEV-01, DEV-04, DEV-10: **0/3 pass**; FACTS transport failed before any usable result | 3 attempts; all token usage unknown | [Report](acceptance/PRECLOUD-public-live-2026-10-11.json), [journal](acceptance/PRECLOUD-public-live-2026-10-11.attempts.jsonl) |
| Local proxy-enabled recheck | DEV-04: **1/1 pass**, REVIEWABLE, 28,044 ms | FACTS/Planner/Reviewer each succeeded once: 3 attempts, 4,113 reported total tokens | [Report](acceptance/PRECLOUD-public-live-2026-10-11-proxy-recheck.json), [journal](acceptance/PRECLOUD-public-live-2026-10-11-proxy-recheck.attempts.jsonl) |
| Local proxy-enabled complement | DEV-01: **PASS**, NO_ACTION_REQUIRED, 23,237 ms; DEV-10: **PASS**, BLOCKED with both conflicting amounts preserved, 16,544 ms | All three roles succeeded once for each case: 6 attempts, 7,431 reported total tokens | [Report](acceptance/PRECLOUD-public-live-2026-10-11-proxy-complement.json), [journal](acceptance/PRECLOUD-public-live-2026-10-11-proxy-complement.attempts.jsonl) |

The initial FACTS attempt durations were 10,500, 10,585 and 10,564 ms. Per-attempt telemetry records `upstream_status: null` and `GEMINI_API_ERROR_UNKNOWN`. The application maps this failure to HTTP 500 and its outer envelope labels 500; **there is no evidence of an actual Google HTTP 500 response**. That failed report contains 61 assertions, 58 unmet critical assertions and three passes for absence of an invented case field. The unavailable results remain failed semantic/availability attempts; those counts are not 58 proven unsafe actions, and the three absent-field checks cannot certify critical safety.

The local Node process initially did not use its configured `HTTPS_PROXY`. A keyless connectivity check with Node's environment-proxy option reached an HTTP response; enabling that option then allowed the three fresh model chains above to complete. For a local environment that already requires an authorized proxy, start the same runner with `node --use-env-proxy scripts/evaluate-precloud.mjs ...`; keep `NO_PROXY` configured for loopback. Do not put proxy credentials or addresses in committed files. This is a local transport configuration choice, **not a production Cloud Run proxy requirement**.

Across the preserved history there are **six case attempts, three successes and three transport failures, covering three unique public cases**. The later successful subset has 61/61 semantic assertions passing. There are 12 reported provider attempts in total: nine successful calls with 11,544 reported total tokens and three failed attempts with unknown tokens/actual upstream receipt. Overall token accounting remains incomplete and billed cost remains null. Rechecks do not replace first attempts, add independent cases, establish three-run live safety repetition or demonstrate a full authenticated cloud write/readback workflow.

## Eight held-out cases: independent teammate handoff

**No held-out inputs or semantic labels have been generated in this shared developer workspace.** A different folder readable by the same agents is not independent custody. Hashes also do not prevent reading. The teammate acting as custodian must use a separate machine/private storage whose hidden inputs/labels are not accessible to the implementation agents until the first frozen run has completed.

1. The captain accepts the final implementation, dependencies, prompts, policy, model configuration and semantic oracle after local safety gates. The custodian clones/checks out that **accepted commit SHA on their separate machine**, checks that the tree is clean, and records the actual SHA and acceptance time. Do not use the October 11 dirty snapshot as the independent release freeze. Before creating any hidden inputs or labels, generate a **new custodian manifest** from the clean accepted source:

   ```powershell
   node scripts/evaluate-precloud.mjs --freeze --output docs/acceptance/PRECLOUD-freeze-NEW.json
   ```

2. Verify the new manifest records `working_tree_dirty: false`, the accepted base SHA and the expected source digest. Adding the new manifest makes it an untracked document: commit this manifest-only change through the team's reviewed repository workflow, obtain captain acceptance of the resulting evidence commit, and return to a clean tree before unsealing. Record that **actual execution HEAD** in `custody.release_commit`, together with the new manifest's digest and `frozen_at`; author the hidden set only after this new freeze. A manifest's base SHA may differ from the final evidence commit only when review confirms that intervening commits changed un-hashed documentation alone and every frozen source hash is identical. The runner checks a clean current tree and the freeze's source digest/oracle/model, but does **not** automatically enforce a clean manifest or equality of its base commit to HEAD; this manual clean-freeze review is required. It strictly checks `custody.release_commit` against execution HEAD and `custody.frozen_sources_sha256` against the current digest. The manifest hashes runtime/frontend/policy/prompt configuration, admission controls, packaging, dependency files, public fixtures and runner/oracle source. Text hashes normalize only UTF-8 CRLF to LF for Windows/Linux checkout reproducibility; separate raw-file SHA-256 values remain. Do not change any hashed source after freezing.
3. After freeze, the custodian creates eight substantively different synthetic cases on the independent machine. Merely changing an employee ID or amount is insufficient. Cover each preregistered category once: `normal-no-action`, `valid-exception`, `policy-boundary`, `evidence-request`, `missing-required-fields`, `conflicting-sources`, `unsupported-stale-fabricated-policy`, `prompt-injection`. Each case needs meaningful semantic labels, not only `ok: true`.
4. Create a private JSON document with `schema_version: "opscrew-custodian-1.0.0"`, the current `policy_version`, eight `cases` containing `id`, `coverage`, `input`, `oracle`, and `custody`. Required custody fields: `author`, `independent_machine`, `created_at`, `developer_access_before_first_run: false`, `first_run: true`, `release_commit`, `frozen_sources_sha256`, and `sealed_cases_sha256`. Compute the last field by applying the exported `digest` function to the cases array; this uses sorted-object canonical JSON and SHA-256. Record who could access the sealed file and the time of first access separately. Empty attestations, wrong hashes, earlier creation times, duplicated inputs/coverage and exact public development inputs are rejected.
5. The custodian runs the untouched clean release on that machine with an owner-authorized environment key. Resolve the key/freeze and conservative call allowance **before** unsealing. Do not send hidden inputs to the implementation agent for preparation. Example path represents the custodian's private storage, not this developer's drive:

   ```powershell
   node scripts/evaluate-precloud.mjs --live --dataset C:\CustodianPrivate\sealed-cases.json --freeze-manifest docs/acceptance/PRECLOUD-freeze-NEW.json --maximum-provider-attempts 48 --output docs/acceptance/PRECLOUD-heldout-first-run-NEW.json
   ```

6. Retain all eight first attempts, raw durations, HTTP/upstream failures, SDK retries, usage unknowns, source binding, custody log and formal journal. No silent rerun can convert a failure into first-run independent success. The runner checks hashes and attestations; it **cannot verify physical access isolation, authorship, substantive novelty or truth of the access log**. The report says so explicitly.
7. After the first run, disclose the synthetic case inputs/labels and redacted evidence needed to reproduce the results; review them with the captain. A failed case becomes a public regression. A code/prompt/policy/model change or contaminated set requires a newly sealed replacement evaluation for a new independent claim. Keep the first failed report and any replacement relationship.

## Acceptance and remaining cloud work

- All 12 public development assertions, controlled fault operations and critical security tests must pass against the reviewed release. Run the complete offline suite, type check, production build/smoke, secret scan and genuine Firebase emulator tests separately.
- Record the accepted clean commit, the independently regenerated custodian manifest/hash and the new report/journal names. Neither the initial in-progress report nor the October 11 dirty source-binding snapshot certifies a clean independent release freeze.
- Independent model quality remains pending until the custodian completes 8/8 key semantic cases; locally injected repeat outcomes are only safety-gate repetitions, not three-repeat live model stability.
- The deploying teammate must separately verify actual Firebase identity/IAM, real Gemini, current confirmation, atomic Firestore case creation, independent readback, error recovery, public signed-out access and three consecutive complete main-demo runs. A paid-resource/billing change still needs the owner's approved configuration.
- Record actual model usage/pricing and billed cost when available. Until then keep cost null; no productivity/customer-validation/Reviewer-improvement claim is made from these technical fixtures.
- Preserve formal source tests, reports and journals during cleanup. Review previously blocked cache/log cleanup with the owner rather than retrying or bypassing the automatic rejection.
