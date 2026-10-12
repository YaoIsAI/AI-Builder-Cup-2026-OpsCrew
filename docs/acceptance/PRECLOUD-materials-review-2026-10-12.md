# English proposal material review

Reviewed October 12, 2026. Outputs are [editable proposal](../../submission/OpsCrew_Proposal_Precloud_final-review.pptx) and [same-page PDF](../../submission/OpsCrew_Proposal_Precloud_final-review.pdf). Both are precloud review drafts, not final G6 submission materials.

## Provenance and contents

The authoring script imported the owner-provided [official template](../../submission/assets/official-submission-template.pptx), retained its 960 ×540 slide size, Google-branded header/cover and native template font policy, and used the owner-reported Gemini-generated [team logo](../../submission/assets/team-logo.png). Its thirteen content slides cover the problem, proposed value, features, process, interface, cloud architecture, technologies, traffic/cost controls, local evidence, pending acceptance and public repository. Instruction, unused blank and decorative closing slides were omitted. No prior non-Google application, deck or footage was reused. Local extensions of the Google Build origin are disclosed.

The captain's actual public name was not supplied; the cover uses the existing public GitHub alias and labels that fact. Product and video URLs remain explicitly pending. Historical screenshots are genuine October 10 local emulator/injected-model evidence and are dated as such. Current local model results and preserved failures are described separately. Real business impact, time savings and adoption are unmeasured. Eight held-out cases and repeat gates are team engineering criteria.

## Validation and test method

- [x] Thirteen final PPTX slides rendered individually at 1920 ×1080 and visually inspected; embedded assets, editable text/tables, diagrams and links were checked. No visible clipping, overlap or missing-image placeholders remained in those renders.
- [x] Structural package validation passed, thirteen slides and thirteen notes parts; original font/size policy and native tables on slides 8 and 11 verified. See the unmodified [finalizer receipt](PRECLOUD-presentation-validation-2026-10-12.json).
- [x] PDF page count is thirteen; all thirteen PDF pages independently rendered with PDFium and visually inspected. An actual GitHub URI annotation on the last page was checked with pypdf.
- [x] Final hashes and byte sizes recorded in [release inventory](../../RELEASE_MANIFEST.json); source links in speaker notes and visible evidence boundaries inspected.
- [x] English [165-second storyboard/narration and caption plan](../../submission/RECORDING_PLAN.md) prepared for actual cloud recording; no injected footage is relabeled live.
- [ ] Final PowerPoint/native-font compatibility, verified team names and actual cloud screenshots/video/public links require the owner and teammate's final G6 review.

The deck remains natively editable. The PDF is the identical slide appearance at 192 dpi, with image pages and a clickable GitHub annotation; its text is not searchable/editable. The document runtime could not replay a template `roundRect` through its vector PDF exporter, so this visual export was used and checked. This does not affect application runtime or deployment.

The finalizer retained template font metadata warnings and an estimated slide-11 native-table overflow warning (0.3006 inch). Actual inspected PPTX/PDF exports have no visible overflow. Native PowerPoint rendering was not executed, so open the final deck in PowerPoint and check that table and template font behavior before submitting or recording it. The receipt's structural checks do not establish actual PowerPoint compatibility.

Revisions: superseded draft exports and private render/finalizer candidates are disposable and removed during delivery cleanup. Retain only the current PPTX/PDF, original template/logo, maintained authoring script, necessary acceptance receipt and recording instructions. New revisions must be rebuilt with a new output name and undergo the same thirteen-page inspection; do not overwrite historical acceptance evidence.
