# Submission materials

The English precloud proposal follows the owner-provided official AI Builder Cup template. The editable PPTX and PDF contain the same thirteen content slides. The PDF uses 192-dpi rendered slide pages with a clickable GitHub annotation; its text is not searchable or editable. Edit the PPTX for the final submission. The template's download-instruction page, unused blank page and decorative closing page are omitted. The official header/cover artwork and slide size are retained. The original template and owner-reported Gemini-generated team logo are in `assets/`; no deck, footage or code from the earlier non-Google prototype is reused.

The proposal is deliberately labeled **Precloud review draft**. The product/video links, verified public team names, actual deployed evidence and final captions depend on the teammate's cloud acceptance. A draft proposal does not satisfy final G6 or Submitted G7 by itself. Follow [the recording plan](RECORDING_PLAN.md) and [the teammate handoff](../docs/CLOUD_TEAMMATE_HANDOFF.md).

`build-proposal.mjs` is one maintained optional authoring script. It imports the official template, creates native editable text/tables/process and architecture diagrams, adds genuine local screenshots, validates the PPTX and exports the same deck as PDF. Its default document-runtime paths point to the author's bundled Artifact Tool. Other machines can set `OPSCREW_DOCUMENT_RUNTIME` and `OPSCREW_PRESENTATIONS_SKILL` to their own equivalent installation. These tools are not application runtime dependencies and are not needed to deploy OpsCrew.

Example from the repository root, using a new revision name:

```powershell
node submission/build-proposal.mjs docs/acceptance/PRECLOUD-validation-metrics-2026-10-11.json final-review
```

All thirteen final PPTX renders and thirteen independently rerendered PDF pages were visually inspected on October 12. See [material acceptance](../docs/acceptance/PRECLOUD-materials-review-2026-10-12.md). Always inspect new revisions again. Automated package/layout validation does not prove visual quality or actual PowerPoint compatibility. Template font warnings and a slide-11 estimated native-table overflow warning are retained; the inspected exports show no clipping, but the teammate must check the final editable deck in PowerPoint before submission. Keep authoring previews/finalizer candidates private, then remove them at handoff. Final PDF/PPTX and their acceptance hashes remain.
