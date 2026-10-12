// One maintained proposal builder. The application runtime does not depend on this tooling.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtime = process.env.OPSCREW_DOCUMENT_RUNTIME || "C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies";
const skill = process.env.OPSCREW_PRESENTATIONS_SKILL || "C:/Users/admin/.codex/plugins/cache/openai-primary-runtime/presentations/26.1007.11041/skills/presentations";
process.env.RUNTIME_NODE_MODULES = path.join(runtime, "node/node_modules");
const { FileBlob, PresentationFile } = await import(pathToFileURL(path.join(runtime, "node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs")).href);
const privateDirectory = path.join(repository, ".materials-build");
const source = path.join(repository, "submission/assets/official-submission-template.pptx");
const reportPath = process.argv[2];
const revision = process.argv[3] || "review";
if (!reportPath || !/^[a-zA-Z0-9-]+$/.test(revision)) throw new Error("Usage: node submission/build-proposal.mjs METRICS_JSON NEW_REVISION");
const metrics = JSON.parse(await fs.readFile(path.resolve(repository, reportPath), "utf8"));
const pptx = path.join(repository, `submission/OpsCrew_Proposal_Precloud_${revision}.pptx`);
const pdf = path.join(repository, `submission/OpsCrew_Proposal_Precloud_${revision}.pdf`);
await fs.mkdir(privateDirectory, { recursive: true });
for (const output of [pptx, pdf]) {
  try { await fs.access(output); throw new Error("Refusing to overwrite an existing material revision."); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const presentation = await PresentationFile.importPptx(await FileBlob.load(source));
const referenceFrames = presentation.slides.items;

// 01. Preserve the official cover and section header artwork. Download instructions,
// the unused blank page and the decorative closing page are not proposal content.
for (const [index, slide] of referenceFrames.entries()) {
  const blob = await presentation.export({ slide, format: "png", scale: 1 });
  await fs.writeFile(path.join(privateDirectory, `reference-${index + 1}.png`), new Uint8Array(await blob.arrayBuffer()));
}
presentation.slides.keep([0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
const inspected = await presentation.inspect({ kind: "shape,textbox", limit: 150 });
const records = inspected.records || inspected.ndjson.split("\n").filter(Boolean).map(JSON.parse);
for (const record of records) {
  const shape = presentation.resolve(record.id);
  if (record.kind === "textbox") presentation.delete(record.id);
  else if (record.position?.top > 530) shape.position = { left: 0, top: 532, width: 960, height: 8 };
}
const font = "Google Sans Flex Medium";
function text(slide, content, x, y, width, height, size = 22, bold = false, color = "#17212B") {
  const s = slide.shapes.add({ geometry: "textbox", name: content.slice(0, 50), position: { left: x, top: y, width, height }, fill: "none", line: { fill: "none", width: 0 } });
  s.text = content;
  s.text.insets = 0;
  s.text.style = { fontSize: size, typeface: font, color, bold, verticalAlignment: "top" };
  return s;
}
function title(index, heading, sources) {
  const s = presentation.slides.items[index];
  text(s, heading, 28, 70, 904, 43, 25, true);
  text(s, `OpsCrew  /  Precloud review  /  ${index + 1}`, 28, 505, 900, 20, 12, false, "#59636E");
  s.speakerNotes.text = sources.join("\n");
  return s;
}
function paragraphs(slide, values, start = 140, gap = 81, width = 888, size = 22) {
  values.forEach((value, index) => text(slide, value, 36, start + index * gap, width, gap - 10, size));
}
function node(slide, label, x, y, width = 265, height = 80) {
  const box = slide.shapes.add({ geometry: "rect", name: label, position: { left: x, top: y, width, height }, fill: "#F1F6F8", line: { fill: "#B8CCD3", width: 1 } });
  box.text = label; box.text.insets = 12;
  box.text.style = { fontSize: 21, typeface: font, color: "#173B4C", alignment: "center", verticalAlignment: "middle" };
  return box;
}
function arrow(slide, x, y, width = 27, height = 22, rotation = 0) {
  slide.shapes.add({ geometry: "rightArrow", position: { left: x, top: y, width, height, rotation }, fill: "#567481", line: { fill: "none", width: 0 } });
}
function table(slide, values, widths, y = 140, height = 290) {
  const t = slide.tables.add({ rows: values.length, columns: values[0].length, left: 36, top: y, width: widths.reduce((a, b) => a + b, 0), height, columnWidths: widths, values });
  t.borders.assign({ style: "solid", fill: "#D3DDE2", width: 1 });
  for (let r = 0; r < values.length; r++) for (let c = 0; c < values[0].length; c++) {
    const cell = t.getCell(r, c); cell.fill = r === 0 ? "#EDF3F6" : "#FFFFFF";
    cell.text.style = { fontSize: 19, typeface: font, bold: r === 0, color: "#17212B" };
  }
  return t;
}
const git = "https://github.com/sundaylee3100-ljl/AI-Builder-Cup-2026-OpsCrew";
const rules = "https://aibuildercup.com/themes.html";
const s3 = "docs/acceptance/S03-confirmation-and-cases.md";

// 02. Write an English narrative with explicit evidence boundaries.
let slide = presentation.slides.items[0];
text(slide, "Team OpsCrew", 28, 303, 744, 42, 32, true);
text(slide, "Expense exception plans with human confirmation", 28, 355, 735, 61, 24);
text(slide, "Captain: sundaylee3100-ljl (GitHub)\nTheme: Future of Work & Enterprise Productivity", 28, 428, 755, 65, 19);
text(slide, "Precloud review draft  /  11 October 2026", 28, 505, 750, 20, 12, false, "#59636E");
slide.images.add({ blob: new Uint8Array(await fs.readFile(path.join(repository, "submission/assets/team-logo.png"))), contentType: "image/png", alt: "Owner-provided Gemini-generated OpsCrew logo", fit: "contain", position: { left: 802, top: 365, width: 130, height: 129 } });
slide.speakerNotes.text = `Captain public legal name and teammate names await owner confirmation. GitHub handle is an alias.\n${rules}\nPROVENANCE.md: blank Google AI Studio Build origin. Logo supplied by owner as Gemini-generated.`;

slide = title(1, "Brief about the idea", [rules, "SCOPE.md", "docs/POLICY_AND_CONTRACTS.md"]);
paragraphs(slide, [
  "OpsCrew helps operations staff turn a synthetic expense exception into a supported handling plan.",
  "Gemini extracts facts, proposes steps, then reviews the proposal in a separate call. Fixed policy checks constrain each stage.",
  "A person reviews the current plan and explicitly confirms a case. The app reads the saved record independently before showing success.",
  "The prototype covers one synthetic USD policy. It creates handling records and performs no reimbursement or payment.",
], 132, 86);

slide = title(2, "Opportunities and proposed value", ["SCOPE.md", "docs/POLICY_AND_CONTRACTS.md", "docs/EVALUATION_PROTOCOL.md"]);
paragraphs(slide, [
  "Problem: staff must reconcile intake text, missing receipts and policy thresholds before deciding what to request next.",
  "Proposed difference: OpsCrew binds the plan to supported facts and exact policy clauses, then stores the person's confirmation with that version.",
  "Design value: input edits invalidate old plans. Contradictions and unsupported citations block case creation.",
  "Expected impact: clearer exception triage and fewer unsupported actions. Actual staff time savings and customer adoption remain unmeasured.",
], 132, 87);

slide = title(3, "Features offered by the solution", [s3, "docs/PRECLOUD_BACKEND.md"]);
paragraphs(slide, [
  "Synthetic presets and original text citations make intake decisions inspectable.",
  "Facts, Planner and Reviewer outputs expose disagreements and exact policy evidence.",
  "Firebase visitor identity, owned history and version-bound confirmation protect each person's handling records.",
  "Atomic writes, idempotent recovery and independent readback prevent duplicate or unverified success. Shared quotas bound model traffic.",
], 138, 84);

slide = title(4, "Process flow and confirmation", ["src/domain/workflow.ts", "docs/S3_CONFIRMATION_CASES.md", "docs/PRECLOUD_BACKEND.md"]);
node(slide, "Synthetic intake", 36, 145); node(slide, "Gemini facts", 346, 145); node(slide, "Planner + Reviewer", 656, 145);
arrow(slide, 308, 174); arrow(slide, 618, 174); arrow(slide, 777, 243, 28, 25, 90);
node(slide, "Saved record readback", 36, 293); node(slide, "Human confirmation", 346, 293); node(slide, "Fixed policy checks", 656, 293);
arrow(slide, 308, 322, 27, 22, 180); arrow(slide, 618, 322, 27, 22, 180);
text(slide, "Missing evidence produces a request plan. Contradictions block progression.\nEditing intake requires a new analysis and a new confirmation.", 36, 416, 885, 69, 21);

slide = title(5, "Interface and narrow-screen review", [s3, "docs/acceptance/S03-emulator-ui-mobile-2026-10-10.png"]);
slide.images.add({ blob: new Uint8Array(await fs.readFile(path.join(repository, "docs/acceptance/S03-emulator-ui-mobile-2026-10-10.png"))), contentType: "image/png", alt: "Actual S3 local emulator narrow-screen UI", fit: "contain", position: { left: 36, top: 125, width: 215, height: 370 } });
text(slide, "Observed local browser behavior", 286, 147, 635, 43, 23, true);
paragraphs(slide, [], 0);
text(slide, "Explicit confirmation remains separate from the AI review.\n\nSaved history survives a page reload with the same visitor identity.\n\nThe 390 px viewport had no horizontal overflow. Keyboard focus was visible.", 286, 208, 625, 218, 22);
text(slide, "Screenshot: local Auth/Firestore emulators and injected model output, 10 October. Public cloud behavior awaits acceptance.", 286, 444, 625, 52, 17, false, "#59636E");

slide = title(6, "Architecture of the proposed cloud deployment", ["docs/CLOUD_TEAMMATE_HANDOFF.md", "docs/PRECLOUD_DEPLOYMENT.md", "server/firebase-runtime.ts"]);
node(slide, "Browser\nEnglish React interface", 36, 145); node(slide, "Cloud Run\nNode API + validators", 346, 145); node(slide, "Gemini API\nFacts / plan / review", 656, 145);
arrow(slide, 308, 174); arrow(slide, 618, 174);
node(slide, "Firebase Auth\nVerified visitor identity", 36, 304); node(slide, "Firestore\nPlans / cases / quotas", 346, 304); node(slide, "Secret Manager\nServer credential only", 656, 304);
arrow(slide, 468, 247, 28, 25, 90);
text(slide, "The server verifies ownership and mediates every business write. Browser Firestore access is denied. Cloud deployment remains the next team gate.", 36, 430, 885, 65, 21);

slide = title(7, "Technologies used in the solution", ["PROVENANCE.md", "aistudio-export-2026-10-07/package-lock.json", "docs/PRECLOUD_DEPLOYMENT.md"]);
table(slide, [
  ["Component", "Role"],
  ["Google AI Studio Build", "Fresh application origin on 7 October"],
  ["Gemini 3.1 Flash-Lite", "Facts, separately prompted Planner and Reviewer"],
  ["Node 24 / React / TypeScript", "API, explicit review interface and fixed validators"],
  ["Firebase Auth + Firestore", "Visitor ownership, atomic records and shared quotas"],
  ["Cloud Run + Secret Manager", "Planned public runtime and server-only credential"],
], [320, 568], 138, 313);
text(slide, "Local extensions are disclosed. No code from the earlier non-Google prototype entered this repository.", 36, 465, 888, 35, 18, false, "#59636E");

slide = title(8, "Implementation cost and traffic controls", ["docs/DELIVERY_WORKBOARD.md", "docs/PRECLOUD_BACKEND.md", "docs/EVALUATION_PROTOCOL.md"]);
paragraphs(slide, [
  "Team management target: USD 40. Billing alerts and application quotas cannot guarantee a monetary spending cap.",
  "Default model limits: 2 concurrent runs globally, 1 per visitor. Each visitor has 2 runs per minute and 12 per UTC day.",
  "Global limits: 6 runs per minute and 60 per UTC day. Each workflow reserves up to 6 provider attempts. Unknown usage receives no refund.",
  "Record tokens, elapsed time and failures from real runs. Historical live failures have unknown usage and billed cost. Verify actual cloud pricing before activation.",
], 130, 88, 888, 21);

slide = title(9, "Snapshots of the prototype", [s3, "docs/acceptance/S03-emulator-ui-desktop-2026-10-10.png"]);
slide.images.add({ blob: new Uint8Array(await fs.readFile(path.join(repository, "docs/acceptance/S03-emulator-ui-desktop-2026-10-10.png"))), contentType: "image/png", alt: "Actual local S3 emulator review and confirmed-case readback", fit: "contain", position: { left: 36, top: 120, width: 585, height: 369 } });
text(slide, "Synthetic USD 38\nmissing-receipt example", 653, 138, 271, 77, 24, true);
text(slide, "The plan requests a receipt.\n\nA person confirms the handling record. The API then independently reads the saved case.\n\nNo payment occurs.", 653, 243, 271, 179, 21);
text(slide, "Local emulators + injected models.\n10 October 2026", 653, 449, 271, 49, 16, false, "#59636E");

slide = title(10, "Performance report and evidence boundaries", [reportPath, "docs/PRECLOUD_EVALUATION.md", "docs/acceptance/S02-captured-result-revalidation-2026-10-10.json"]);
table(slide, [
  ["Evidence", "Result", "Method"],
  ["Offline engineering", metrics.offline_tests, "Policy / HTTP / UI regressions"],
  ["Auth + Firestore", metrics.emulator_checks, "Real local emulators, injected models"],
  ["Public semantic cases", "12 / 12", "Injected models, MemoryCaseStore"],
  ["High-risk repeats", "12 / 12", "4 predefined public cases, each 3 runs"],
  ["Fault / recovery", "6 / 6", "Injected failures and lost responses"],
  ["Production packaging", metrics.packaging_checks, "Pruned native runtime, no Docker daemon"],
], [265, 158, 465], 132, 313);
text(slide, "Current local Gemini: 3 public branches passed after proxy repair. Three earlier failures remain recorded. Cloud stability and independent held-out acceptance remain pending.", 36, 459, 888, 43, 17, false, "#59636E");

slide = title(11, "Additional details and future development", ["docs/CLOUD_TEAMMATE_HANDOFF.md", "docs/EVALUATION_PROTOCOL.md", "SUBMISSION_CHECKLIST.md"]);
paragraphs(slide, [
  "Next acceptance: deploy the frozen release to Cloud Run with real Firebase identity, Firestore and a server-only Gemini secret.",
  "The teammate seals eight independent cases before first evaluation. Retain every attempt and run the main demo successfully three times in sequence.",
  "Then record the real cloud flow, publish the product and sub-three-minute English video, and replace the draft proposal's pending link statuses.",
  "After evaluation, consider broader policies and staff timing studies. Production reimbursement integrations require a separate design and authorization.",
], 132, 87, 888, 21);

slide = title(12, "Repository, demo and final product links", [git, "SUBMISSION_CHECKLIST.md", "submission/RECORDING_PLAN.md"]);
const link = text(slide, "Public GitHub repository", 36, 146, 888, 37, 25, true, "#086A86");
link.text.get("Public GitHub repository").link = { uri: git, isExternal: true };
text(slide, git.replace("https://", ""), 36, 194, 888, 52, 19, false, "#59636E");
text(slide, "Public demo video: pending final cloud recording\nFinal product URL: pending teammate cloud deployment", 36, 285, 888, 105, 24);
text(slide, "This proposal is a precloud review draft. The team must add working public links and verify anonymous access before contest submission.", 36, 432, 888, 58, 21);

// 03. Validate the editable PPTX, export the same deck as PDF, then render all pages.
const candidate = path.join(privateDirectory, `candidate-${revision}.pptx`);
await (await PresentationFile.exportPptx(presentation)).save(candidate);
const { finalizePresentation } = await import(pathToFileURL(path.join(skill, "container_tools/artifact_tool_utils.mjs")).href);
await finalizePresentation({
  workspaceDir: repository, candidatePath: candidate, finalPath: pptx,
  pythonExecutable: path.join(runtime, "python/python.exe"),
  integrityValidatorPath: path.join(skill, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skill, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "9144000,5143500", "--validate-bullet-geometry", "--validate-heading-fit", "--require-native-table-slide", "8", "--require-native-table-slide", "11"],
  requiredNativeTableOwnerSlides: [8, 11],
  fontPolicy: { basis: "reference", families: [font, "Google Sans Flex SemiBold"], referencePath: source, referenceSha256: createHash("sha256").update(await fs.readFile(source)).digest("hex") },
  verifyArtifactToolImport: true,
  receiptPath: path.join(privateDirectory, `proposal-${revision}.validation.json`),
});
const finalDeck = await PresentationFile.importPptx(await FileBlob.load(pptx));
for (const [index, page] of finalDeck.slides.items.entries()) {
  const png = await finalDeck.export({ slide: page, format: "png", scale: 2 });
  await fs.writeFile(path.join(privateDirectory, `proposal-${revision}-${index + 1}.png`), new Uint8Array(await png.arrayBuffer()));
}
// Artifact Tool 2.8.89 cannot replay a template image's Canvas roundRect in its
// vector PDF exporter. Build the identical visual pages from its final-PPTX
// renders at 192 dpi, with a real public link annotation. PPTX stays editable.
const pdfSource = `
import sys, pathlib
from reportlab.pdfgen import canvas
from pypdf import PdfReader
out, directory, revision, count, url = sys.argv[1:]
count = int(count)
doc = canvas.Canvas(out, pagesize=(720,405), pageCompression=1)
doc.setTitle('OpsCrew: Expense Exception Plan and Review (Precloud draft)')
doc.setAuthor('Team OpsCrew')
for number in range(1,count+1):
    doc.drawImage(str(pathlib.Path(directory) / ('proposal-' + revision + '-' + str(number) + '.png')),0,0,720,405)
    if number == count:
        doc.linkURL(url,(27,220.5,693,295.5),relative=0,thickness=0)
    doc.showPage()
doc.save()
reader = PdfReader(out)
assert len(reader.pages) == count
assert any(annotation.get_object().get('/A',{}).get('/URI') == url for annotation in reader.pages[-1].get('/Annots',[]))
print('PDF page count and actual GitHub link passed')
`;
const pdfCheck = execFileSync(path.join(runtime, "python/python.exe"), ["-B", "-c", pdfSource, pdf, privateDirectory, revision, String(finalDeck.slides.items.length), git], { encoding: "utf8", windowsHide: true });
console.log(pdfCheck.trim());
console.log(JSON.stringify({ pptx, pdf, slides: finalDeck.slides.items.length, pdfFormat: "192-dpi rendered slide pages with clickable GitHub annotation", manualVisualInspectionRequired: true }));
