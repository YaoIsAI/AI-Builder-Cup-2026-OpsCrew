# Evaluation status

## October 12 teammate review

The current reviewed runtime is different from the original October 11 snapshot. Latest methods and executed outcomes are in [PR #4 code review](acceptance/PR04-code-review-2026-10-12.md), [current 350-assertion offline report](acceptance/PR04-offline-evaluation-2026-10-12.json) and [fresh 27-group emulator report](acceptance/S03-emulator-validation-2026-10-12-pr04.json). The updated [release manifest](../RELEASE_MANIFEST.json) preserves previous identity and binds the current source. Earlier real-model results below are historical for their exact source/prompt versions; they are not new runs on the changed Reviewer prompt. Teammate cloud summaries and incomplete accounting remain separate in [the corrected operational report](DEPLOYMENT_AND_USAGE_REPORT.md). Real current-source cloud acceptance and independent G5 remain pending.

## October 11 historical checkpoint

As of the local test and model reports dated **October 11, 2026**, OpsCrew has passed local engineering and controlled safety checks. These results do not certify deployment or independent model quality. Browser and material reviews performed on October 12 are separate evidence and do not change these statistics. Detailed methods and custody rules are in [Precloud evaluation](PRECLOUD_EVALUATION.md) and the [preregistered protocol](EVALUATION_PROTOCOL.md).

| Check | Result | Scope and evidence |
| --- | --- | --- |
| Offline regression suite | 216/216; lint and build pass | [Recorded local metrics](acceptance/PRECLOUD-validation-metrics-2026-10-11.json) |
| Authentic Firebase emulators | 27/27 groups | Real emulator identity/storage, injected model output; [report](acceptance/S03-emulator-validation-2026-10-11-precloud.json) |
| Semantic and fault contracts | 350/350 assertions | 12 public cases, four risk categories ×3, six fault/recovery operations; injected model/identity with MemoryCaseStore; [report](acceptance/PRECLOUD-offline-evaluation-2026-10-11-final.json) |
| Production HTTP and native packaging | 9/9 HTTP checks; 12/12 artifact groups including those HTTP checks | Fresh production-only locked install; zero production audit findings; Linux container not run; [artifact report](acceptance/PRECLOUD-runtime-artifact-2026-10-11-final.json) |
| Local real Gemini development batch | Three later successes after three initial network failures | DEV-01/04/10; plan-only, no cloud write; all failures and journals retained in [live history](PRECLOUD_EVALUATION.md#executed-live-results-including-initial-failures) |

The live history contains six case attempts across three public cases and 12 reported provider attempts. Nine successful calls report 11,544 total tokens; the three failed attempts have unknown token usage and unknown actual upstream receipt. Overall accounting is incomplete and measured cost is null. The initial missing results remain failed attempts; they are neither demonstrated unsafe actions nor safe successes. Later rechecks cannot replace first attempts or establish independent accuracy, P95, productivity savings or Reviewer improvement.

The final local evaluation and live reports bind to canonical source digest `833c353f2fee85d7207d5ff5a44d36ab52fafa11e96f650a1f1005f22edac3de`. The preserved [October 11 manifest](acceptance/PRECLOUD-freeze-2026-10-11.json) records a dirty reviewed tree based on S3 merge `dd0fb3f`; it is a source snapshot, not a clean independent release freeze.

**G5 remains pending.** The independent teammate must generate a new manifest from the clean accepted release on a separate machine before authoring and sealing eight substantively different held-out cases, then retain every first attempt and semantic label. G5 additionally requires 100% critical safety, four high-risk categories ×3 and three consecutive complete live main-demo runs. G3/G4 real-resource identity, IAM, write/readback and recovery acceptance remain separate pending gates. No cloud or held-out pass is claimed. Follow the [custodian workflow](PRECLOUD_EVALUATION.md#eight-held-out-cases-independent-teammate-handoff) and [cloud teammate handoff](CLOUD_TEAMMATE_HANDOFF.md).
