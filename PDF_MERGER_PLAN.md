# QUICKKIT PDF Merger — Research, Product Plan and Implementation Record

**Status:** **implemented — awaiting owner approval**  
**Plan and owner scope approval:** 1 November 2026  
**Implementation delivered for owner review:** 1 November 2026  
**Current active tool:** PDF Merger only  
**Approval gate:** The owner approved the plan and added mandatory browser-only privacy, explicit error-handling and complete mobile-workflow requirements. Implementation and QA are complete for owner review, but PDF Merger must not be marked live/complete and no other tool may start until the owner personally approves this implementation. It has not been deployed or indexed.

**Implementation evidence:** route `/tools/merge-pdf`; QA record in `docs/pdf-merger/QA_REPORT.md`; desktop/mobile screenshots in `docs/pdf-merger/`.

## 1. Executive recommendation

Build PDF Merger as a complete browser-only product at `/tools/merge-pdf`. It should let a user combine multiple PDFs, control file order, choose all or selected pages from each file, review an exact output summary, and download one validated PDF without uploading documents.

The recommended technical direction is:

- **Merge engine candidate:** `@cantoo/pdf-lib`, an actively maintained MIT-licensed fork of `pdf-lib`, lazy-loaded inside a dedicated Web Worker.
- **Preview engine:** Mozilla PDF.js through `pdfjs-dist`, self-hosted and lazy-loaded only for first-page and page-picker thumbnails.
- **Fallback engine to benchmark in the spike:** qpdf compiled to WebAssembly, used only if the pdf-lib-family engine fails structural-safety or fidelity gates.
- **No server processing:** files, passwords and output bytes stay in the browser. No account, cloud import, analytics event or persistent file storage is part of this tool.

A standard `copyPages()` demo is not sufficient for production. The implementation must prove that unselected pages are not hidden inside the output as orphan objects, internal destinations do not point to duplicate or omitted pages, form appearances are not silently lost, and the downloaded file reopens with exactly the selected pages in the selected order.

## 2. User needs and product purpose

### Primary user jobs

1. Combine a cover letter, report and appendices into one shareable document.
2. Assemble invoices, receipts, certificates or application documents in a required order.
3. Join chapter or section PDFs while excluding covers, blanks or unrelated pages.
4. Merge scanned batches while checking visually that the correct documents and pages were selected.
5. Combine sensitive documents without uploading them to an unknown server.
6. Produce one predictable file name and page count before downloading.

### Success expectations

- The output order is obvious before processing.
- Page ranges are understandable without learning a complex syntax.
- A wrong, corrupt, encrypted or oversized file is identified by name.
- Processing can be cancelled and never produces a partial “successful” output.
- The originals are never modified.
- Visual page content is copied structurally, not rasterized into images.
- Limitations affecting bookmarks, forms, signatures and attachments are disclosed before the user relies on the output.

### Non-goals for this tool

PDF Merger is the canonical **combine files** tool. These belong to separate future tools and are not hidden modes in this release:

- Splitting one PDF into multiple output files.
- Reordering, rotating or deleting pages inside a single PDF as a general organizer.
- Converting images, Word, Excel or other formats into PDF.
- OCR or editing PDF text/images.
- Compressing to a target size.
- Password-protecting the merged output.
- Repairing severely damaged PDFs.
- Cloud-drive import/export, sharing links or collaboration.
- PDF/A or PDF/UA conversion/validation.

## 3. Proposed identity and integration

| Field | Proposal |
|---|---|
| Tool name | PDF Merger |
| Stable ID | `merge-pdf` |
| Slug / URL | `merge-pdf` / `/tools/merge-pdf` |
| Category | PDF Tools (`pdf`) |
| Icon | Lucide `Combine` |
| Accent | QUICKKIT purple |
| Processing | Browser-only |
| Short description | Combine PDFs in the order you choose, include only the pages you need, and download one file — without uploading your documents. |
| Search keywords | combine PDF, join PDF, PDF combiner, append PDF, merge files, page ranges |

The existing approved premium light design remains the baseline: white surfaces, soft lavender, purple primary actions, mint success accents, Geist typography, 18px-class rounded cards, Lucide icons and subtle motion.

## 4. Complete feature checklist

### 4.1 File intake and queue

- [ ] Choose multiple PDFs through a native file picker.
- [ ] Drag and drop multiple PDFs onto a clearly highlighted drop zone.
- [ ] Add more files after the initial selection without losing the current queue.
- [ ] Accept files based on PDF content signature and successful parsing, not extension or browser MIME type alone.
- [ ] Inspect files sequentially so one large or corrupt file does not freeze the whole queue.
- [ ] Show each file's order number, name, formatted size and page count.
- [ ] Allow the same file to be added more than once when the user intentionally needs it twice; display a “Duplicate” badge when name, size and modified time match another entry.
- [ ] Require at least two queue entries before merging.
- [ ] Remove an individual file.
- [ ] Clear all files through an inline confirmation state.
- [ ] Start a completely new merge after success.

### 4.2 File ordering

- [ ] Drag file cards with a pointer to change merge order.
- [ ] Provide visible Move up and Move down buttons for keyboard and touch users.
- [ ] Provide Move to top and Move to bottom actions for longer queues.
- [ ] Sort by file name using natural ascending order.
- [ ] Reverse the current queue order.
- [ ] Announce order changes through an assistive-technology live region.
- [ ] Preserve focus sensibly after reorder and removal.

### 4.3 Previews and page selection

- [ ] Generate a first-page thumbnail for each readable PDF.
- [ ] Use a document-icon fallback if a thumbnail fails; thumbnail failure must not block merging.
- [ ] Let the user include **All pages** or a **Custom selection** for each file.
- [ ] Support page-range text such as `1-3, 5, 8-end`.
- [ ] Normalize selections to unique pages in original document order.
- [ ] Explain invalid tokens, reversed ranges, empty selections and pages beyond the document with file-specific errors.
- [ ] Provide quick choices for All pages, First page and Last page.
- [ ] Provide an expandable visual page picker with page thumbnails and checkboxes.
- [ ] Render page-picker thumbnails lazily in batches of 24 with “Show more pages.”
- [ ] Synchronize the visual selection and compressed range text.
- [ ] Show selected-page count for every file.
- [ ] Show the exact output span each file contributes, for example “Adds output pages 13–24.”
- [ ] Do not reorder pages inside a source file; that remains PDF Organizer's distinct job.

### 4.4 Output settings and processing

- [ ] Custom output filename, defaulting to `quickkit-merged.pdf`.
- [ ] Sanitize path separators and control characters; always finish with `.pdf`.
- [ ] Optional output document title; default to the filename without `.pdf` if left blank.
- [ ] Exact summary of file count, selected pages and total source size.
- [ ] A clearly disabled Merge button with the reason when the queue is not ready.
- [ ] Worker-based processing with stage labels: Preparing, Copying pages, Checking output, Building download.
- [ ] Meaningful progress based on copied files/pages; final serialization is shown as an indeterminate finishing stage rather than a fake percentage.
- [ ] Cancel an in-progress merge and return to the editable queue.
- [ ] Atomic behavior: any failed source or output validation means no download is presented as successful.
- [ ] Reopen the merged bytes before success and verify page count.
- [ ] Verify that no extra page objects outside the output page tree remain. See the object-graph safety gate in Section 8.
- [ ] Any change to files, order, selection, filename, title or options immediately invalidates a previous result.

### 4.5 Result and download

- [ ] Show output filename, page count, actual file size, source count and measured processing time.
- [ ] Show a first-page thumbnail of the result when rendering succeeds.
- [ ] Provide a real `Download PDF` link for an `application/pdf` Blob.
- [ ] Provide “Back to files” without discarding the queue.
- [ ] Provide “Start new merge” that revokes object URLs and clears in-memory file state.
- [ ] Never auto-open the downloaded PDF in an embedded viewer.

### 4.6 Proposed advanced features requiring explicit approval

#### A. Password-protected source PDFs

- [ ] Detect encryption and first try the empty user password where applicable.
- [ ] If a password is required, mark only that file as blocked and provide an inline password entry with show/hide control.
- [ ] Keep the password only in current-page memory and worker messages on the same device.
- [ ] Never store, log, transmit or include the password in analytics, errors, screenshots or the URL.
- [ ] Clear the password when the file is removed, the queue is reset or the merge completes.
- [ ] Explain before merging that the merged output will **not** be encrypted.
- [ ] Do not use `ignoreEncryption` as a substitute for correct decryption.
- [ ] Ship this feature only if independently generated encrypted fixtures pass; otherwise encrypted files are rejected with a clear limitation.

#### B. Generated source bookmarks

- [ ] Optional output setting: No bookmarks, one bookmark per file using file names, or one per file using document titles with filename fallback.
- [ ] Default to **No bookmarks** so potentially sensitive file names are not embedded without a deliberate choice.
- [ ] Support Unicode bookmark text.
- [ ] Verify generated outline destinations through an independent parser/renderer.
- [ ] State clearly that generated source bookmarks do not preserve the original documents’ internal bookmark trees.

### 4.7 Features evaluated and deliberately excluded from version 1

| Feature | Decision | Reason |
|---|---|---|
| Preserve original bookmark trees | Exclude | pdf-lib-style page copying does not reliably carry document outlines; generated source bookmarks are the bounded alternative. |
| Keep form fields fully interactive | Exclude as a guarantee | Page copying can orphan widgets from the document AcroForm. The safe policy is to flatten detected fields or fail that merge; see Section 5. |
| Alternate-and-mix/interleave scans | Exclude | Valuable but a distinct collation workflow, not necessary for the canonical merger. |
| Normalize all pages to A4/Letter | Exclude | Scaling pages can distort content and loses annotations/forms; preserve original page boxes. |
| Insert blank pages for duplex printing | Exclude from v1 | Professional niche feature; avoid scope growth until core fidelity is proven. |
| Generated table-of-contents page | Exclude | Bookmarks are more useful and less intrusive. |
| Add filename footers/page numbers | Exclude | Distinct watermark/page-number jobs. |
| Compress output | Exclude | Structural rewriting is not honest image/PDF compression. |
| Merge images or Office files | Exclude | Distinct conversion tools and much larger fidelity surface. |
| Cloud storage | Exclude | Requires accounts/OAuth and contradicts the local-first promise. |

## 5. Fidelity contract and limitations

### Intended to preserve

- Selected page order and count.
- Page content and resources needed to render those pages, including text, vector drawing, images and embedded fonts.
- Page boxes and page rotation.
- Visual layout without rasterizing pages or applying a quality setting.
- External URI link annotations where the copied page structure remains valid.
- Internal page links only when they can be retargeted to a selected output page and independently verified.

### Required form policy

- Detect interactive form fields during inspection and show a file-level warning.
- Before copying, flatten supported AcroForm fields so their visible values become page content and widgets are removed.
- If flattening cannot be proven complete for a document class in the engine spike, the tool must either reject that document with an actionable message or return to the owner for a scope decision. It must not silently produce fields that disappear or become unbound widgets.
- XFA-heavy documents require separate fixture evidence; no universal XFA claim is planned.

### Not preserved or not guaranteed

- Original outlines/bookmarks, named destinations, page labels and article threads.
- Embedded file attachments and portfolio structure.
- Optional-content layers and document-level viewer preferences.
- Tagged-PDF/accessibility structure and PDF/UA conformance.
- Document JavaScript, actions and dynamic XFA behavior.
- Digital-signature validity. Any structural merge invalidates a signature even if a signature appearance remains visible.
- PDF/A identity or archival conformance.
- Source metadata/XMP other than the new output title and normal creation/modification information.
- Some complex annotations, appearance streams or internal destinations.

These limitations belong in the workspace warning area when relevant and in the FAQ—not only in developer documentation.

## 6. Proposed limits and error behavior

These are proposed launch targets. They must be confirmed through load testing on desktop and constrained mobile-browser profiles; if a lower limit is necessary, the UI and this plan must be updated before release.

| Limit | Proposed target |
|---|---:|
| Queue entries | 25 |
| Size per PDF | 50 MiB |
| Combined source size | 100 MiB |
| Pages in one source PDF | 1,000 |
| Selected output pages | 1,000 |
| Output filename | 80 characters before `.pdf` handling |
| First-page thumbnail backing size | Max 480 × 680 px |
| Page-picker thumbnail backing size | Max 320 × 452 px |
| Concurrent thumbnail renders | 2 |

### Error taxonomy

| Condition | User-facing behavior |
|---|---|
| Empty file | Reject that entry: “This file is empty.” |
| Not a PDF | Reject by filename; do not rely on its extension in the message. |
| Corrupt/unsupported structure | Keep other valid files editable; block merge until the bad entry is removed. |
| Encrypted, password needed | Show the password workflow if approved; otherwise state the limitation. |
| Wrong password | Keep the file blocked; never reveal whether a different password field matched another file. |
| File/count/page limits | Explain the exact limit and what to remove. |
| Invalid page range | Identify the file and invalid token/range. |
| Form flattening failure | Block only the affected merge; do not claim success. |
| Output validation failure | Discard the output and show a safe generic failure with next steps. |
| Worker unavailable | Offer the tested same-page fallback only if it passes the same gates; otherwise show a browser-support error. |
| Cancellation | Return to Ready state, not an error state. |
| Browser out of memory | Show a recovery message recommending fewer or smaller files; retain file references where the browser state allows. |

Raw parser errors, stack traces, passwords and document contents must never be printed to the page or console in production code.

## 7. Proposed UI/UX layout

### 7.1 Page hierarchy

The page follows the existing QUICKKIT tool-shell pattern:

1. Breadcrumb: Home → Tools → PDF Tools → PDF Merger.
2. Tool icon, eyebrow “PDF TOOLS · LOCAL BROWSER TOOL,” one H1 and a concise original introduction.
3. Privacy/limit chips: “No upload,” proposed file/page limits, “Originals unchanged.”
4. Dedicated workspace.
5. Privacy explanation rendered from this tool's browser-processing definition.
6. “How to use it.”
7. Tool-specific FAQs and limitations.
8. Category/directory links. No fake related PDF tools until another PDF tool is actually live.

### 7.2 Desktop workspace wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Build one clean document                         [Local processing] │
│ Add PDFs, arrange them, choose pages, then download one merged file.│
├──────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │        Drop PDFs here  or  [Choose PDF files]                  │  │
│  │        PDF only · up to 25 files · limits shown before use     │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Your files (3)       [Sort A–Z] [Reverse] [Add more] [Clear all]    │
│  ┌──────────────────────────────────────────────┬─────────────────┐  │
│  │ 1  [≡] [thumb] report.pdf                    │ Output          │  │
│  │    24 pages · 3.2 MB · Ready                 │ Files       3   │  │
│  │    Pages [All|Custom] 1-12       12 selected │ Pages      31   │  │
│  │    Adds output pages 1–12                    │ Sources  8.6 MB │  │
│  │    [Choose pages visually] [↑][↓][Remove]    │                 │  │
│  │                                              │ Filename [____] │  │
│  │ 2  [≡] [thumb] appendix.pdf                  │ Title    [____] │  │
│  │    15 pages · 4.1 MB · Forms will flatten    │ Bookmarks [None]│  │
│  │    Pages [All]                   15 selected │                 │  │
│  │    Adds output pages 13–27                   │ [Merge 3 PDFs]  │  │
│  │                                              │ Local-only note │  │
│  │ 3  [≡] [thumb] certificate.pdf               └─────────────────┘  │
│  │    4 pages · 1.3 MB · Ready                                      │
│  └──────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

Desktop proportions: file queue approximately two-thirds, sticky output panel approximately one-third inside the workspace. File cards use white surfaces with a soft lavender border and mint/lavender status chips. The output panel uses a very light lavender surface so the final action is visually distinct without darkening the theme.

### 7.3 File-card anatomy

- Order number and drag handle.
- 52 × 72 CSS-pixel first-page thumbnail with white page background and subtle border.
- File name with middle truncation; full name available to assistive technology and through the native title behavior where appropriate.
- Metadata line: pages, size, status and warnings.
- Selection controls and selected count.
- Output-span text.
- Reorder/remove icon buttons with text labels available to assistive technology and full button text where space allows.
- Password panel appears inline only for a blocked encrypted file.
- Error panel appears inline and does not hide the Remove action.

### 7.4 Mobile layout

```text
PDF Merger
Combine PDFs locally...

[Choose PDF files]
You can also add more after choosing.

Your files (3)                         [Add]
┌─────────────────────────────────────┐
│ 1 [thumb] report.pdf               │
│ 24 pages · 3.2 MB · Ready          │
│ Pages: [All | Custom]              │
│ [1-12................] 12 selected │
│ Adds output pages 1–12             │
│ [↑] [↓] [Pages] [Remove]           │
└─────────────────────────────────────┘
... additional cards ...

Output
3 files · 31 pages · 8.6 MB sources
Filename [quickkit-merged]
[Merge 3 PDFs]
```

Mobile rules:

- Single column; no horizontal scrolling.
- File-picker action is primary because drag-and-drop is not the natural mobile path.
- Reorder buttons remain visible; drag is never required.
- Page picker uses a three-column thumbnail grid.
- A sticky bottom action bar may duplicate only the summary and primary Merge action when the queue is ready, with safe-area padding and enough page bottom padding to avoid covering content. It must disappear while a password field or page picker needs focused interaction if testing shows overlap.

### 7.5 Required states

| State | Design |
|---|---|
| Empty | Large inviting drop zone, exact supported input and local-processing note. |
| Drag active | Purple dashed border, lavender wash, “Release to add PDFs.” |
| Inspecting | File-card skeleton with filename and “Reading…” status; queue actions for that card disabled. |
| Ready | Thumbnail, metadata, selection and output span. |
| Needs password | Amber-tinted inline panel, lock icon, password field and Unlock button. |
| File error | Red-tinted inline panel with reason and Remove action. |
| Processing | Output panel changes to stage/progress, queue is inert, Cancel remains available. |
| Success | Mint success panel, output facts, result thumbnail and download. |
| Merge error | Error summary linked to the affected file/setting; queue remains intact. |
| Result invalidated | Success panel clears immediately after any edit; no stale download remains. |

### 7.6 Accessibility and interaction requirements

- The visually styled drop zone does not replace a real, keyboard-accessible file input.
- Every drag action has button alternatives.
- Icon buttons have accessible names; status is never communicated by color alone.
- File-list changes use a polite live region without announcing every thumbnail.
- Progress uses native progress semantics where determinate and a labelled busy region during final serialization.
- Focus moves to the success heading or download action after completion and to the first relevant error after failure.
- Removing a card moves focus to the next logical queue control or “Add PDFs.”
- All targets meet the existing 40px-class tool-control standard.
- Motion is limited to subtle card/drag transitions and respects `prefers-reduced-motion`.
- Thumbnails are decorative duplicates of the filename/page information and use empty alt text; page-picker controls are labelled by page number.

## 8. Technical research and architecture

### 8.1 Engine comparison

Research checked against npm and upstream repositories on 1 November 2026.

| Candidate | Current evidence | Strengths | Concerns | Recommendation |
|---|---|---|---|---|
| `pdf-lib` 1.17.1 | MIT; last npm release in Nov 2021; documented `copyPages`; explicitly does not support encrypted documents | Mature API, widely used, pure JS | Stale release; encrypted files unsupported; outlines not copied; forms can break; deep-copy graph risks | Benchmark as a control, not the preferred new dependency |
| `@cantoo/pdf-lib` 2.11.1 | MIT; released Sep 2026; actively maintained fork; same core API plus encrypted-document support; npm unpacked package is large but the lazy browser bundle must be measured | Current maintenance, password support, form flatten improvements, TypeScript, browser/Node tests | Smaller ecosystem than upstream; extra SVG/color dependencies; same page-copy graph model; crypto and fidelity need independent fixtures | **Primary candidate**, pinned and spike-gated |
| `pdfjs-dist` 6.4.299 | Apache-2.0; Mozilla PDF.js; actively released | Best fit for rendering/inspection cross-checks; worker API and page rendering | Not a merger; worker and WASM/font assets add size; must use a patched current release and secure options | **Preview/validation only** |
| qpdf WASM wrappers | qpdf itself is a mature Apache-2.0 C++ engine for structural transformations and page selection; available npm wrappers vary in age/API maturity | Strong page selection, encryption and foreign-object handling; CLI may handle difficult structures | WASM/CSP integration, raw CLI/FS ergonomics, wrapper supply-chain variance, weaker granular progress | **Fallback candidate** if pdf-lib graph/form gates fail |
| `@libpdf/core` 0.5.3 | MIT; modern TypeScript library with merge/encryption/forms; project labels itself beta | Promising complete API and active development | 0.x API stability and less production history for this use case | Watchlist; do not base v1 on it without a separate comparative spike |
| `pdf-merger-js` | Wrapper around upstream `pdf-lib`; includes CLI-oriented dependency | Simple merge examples | Adds no structural guarantees and less control over validation/progress | Reject |

### 8.2 Critical object-graph safety finding

pdf-lib's object copier recursively copies objects reachable from a selected page. A link, widget or other page reference can therefore pull an **unselected page object** into the output as an orphan. That page may not appear in a reader, but its content can still exist in the downloaded bytes. Public issue/research reports also show that `copyPages()` does not preserve outlines and can leave form widgets disconnected from the AcroForm.

Therefore the implementation spike must build a fixture containing:

- a selected page with an internal link to an unselected page;
- a unique text marker on the unselected page;
- a selected page linking to another selected page;
- a multi-page form field/widget relationship;
- a named destination if fixture generation is practical.

Acceptance requires all of the following:

1. Output page-tree count equals the selected count.
2. No `PDFPageLeaf` object exists outside the output page tree.
3. Decompressed/raw output searches do not contain the unselected marker, with a positive control proving the search finds it in the source.
4. Internal links to selected pages resolve to the actual output pages or are removed.
5. Links/actions to omitted pages are removed, not retargeted to an orphan.
6. Reopening the output in PDF.js renders/extracts the expected page markers in order.

Possible implementation strategies to evaluate:

- Normalize explicit and named destinations before copy.
- Remove article beads and unsafe page references from copied annotations/actions.
- Flatten forms before copy.
- Retarget copied annotation destinations after copy.
- Traverse the output from the catalog/page tree and remove unreachable indirect objects.
- Refuse to save if any non-page-tree page object remains.

If these cannot be proven with the pdf-lib-family adapter, page-range merging must not ship on that adapter. The fallback is a qpdf-WASM spike or a reduced scope decision returned to the owner.

### 8.3 Proposed module boundaries

```text
lib/tools/pdf/
  page-ranges.ts          # pure parser/normalizer/formatter
  merge-limits.ts         # shared limits and user-safe error codes
  merge-types.ts          # worker-safe request/result contracts
  inspect-pdf.ts          # engine inspection adapter
  merge-pdf-core.ts       # engine merge + graph validation
  pdf-outline.ts          # optional generated source bookmarks
  pdf-thumbnail.ts        # PDF.js lazy thumbnail service

components/tools/
  pdf-merger.tsx          # workspace state and composition
  pdf-merger/
    file-card.tsx
    page-picker.tsx
    output-panel.tsx
    password-panel.tsx

workers/
  pdf-merger.worker.ts    # inspect/merge requests, progress, cancellation by termination

app/tools/merge-pdf/
  page.tsx
```

Pure range, ordering, filename and summary logic must not depend on React or the PDF engine. The engine sits behind an adapter so the spike can replace it without redesigning the UI.

### 8.4 Data flow

1. React state stores `File` references and small metadata—not full file byte arrays.
2. Inspection requests are sent to one dedicated worker sequentially.
3. The worker reads one file at a time, checks the signature, detects encryption, parses page count and flags, then releases its document reference.
4. The main thread separately lazy-loads PDF.js for thumbnails. PDF.js receives a copy of bytes because it can detach transferred buffers, renders at a capped size, destroys its loading task/document and revokes thumbnail URLs on removal/reset.
5. Merge sends ordered entry descriptors and selected zero-based page indices to the worker.
6. The worker reads and copies one source at a time, reports completed pages, performs graph/form processing, creates output bytes, reopens and validates them, then transfers the output buffer back.
7. The UI creates one Blob URL for the result. Any edit revokes/invalidates it.
8. Cancel terminates and recreates the worker. A tested main-thread fallback is used only if module-worker startup is unavailable and it passes the same core tests.

### 8.5 Security controls

- Pin exact dependency versions after `npm audit`, license review and bundle inspection.
- Serve PDF.js worker/assets from the same origin; never load library code from a CDN.
- Use a current patched PDF.js release and set `isEvalSupported: false`. Do not use the full PDF.js viewer, annotation HTML layer or document scripting for thumbnails.
- Review whether PDF.js WASM components require a narrowly scoped Content Security Policy change. Do not weaken the global CSP without evidence.
- Treat every PDF and filename as hostile input. Render metadata/filenames as text only.
- Validate file signature, parser result, page count, selected indices and worker message shapes.
- Passwords are not persisted. JavaScript cannot guarantee secure memory erasure, so lifetime is minimized and references are cleared.
- Merging is not antivirus scanning or sanitization. The FAQ must say that a malicious source PDF may remain dangerous in another reader.
- No file content, file names, passwords or page ranges are sent to QUICKKIT servers or analytics.

### 8.6 Performance controls

- Load the PDF workspace and engines only on `/tools/merge-pdf`; no PDF engine may enter the homepage/category bundle.
- Lazy-load PDF.js after the first readable file or first expansion of the page picker.
- Render only the first page initially; page grids load in batches with a maximum of two concurrent renders.
- Cap thumbnail canvas pixels and destroy PDF.js resources.
- Process sources sequentially and avoid holding every source ArrayBuffer at once.
- Transfer the final ArrayBuffer from worker to UI where supported.
- Record route bundle size, engine download size, inspection time, merge time and peak-memory observations for representative fixtures. Performance claims in UI copy are prohibited unless measured.

### 8.7 QUICKKIT integration scope

To keep this delivery focused on one complete tool, the recommended integration is deliberately narrow:

- Add a registry-compatible `merge-pdf` definition to the current catalog data.
- Add the manual `/tools/merge-pdf` route following the current production pattern.
- Make homepage counts/search/category data derive correctly for seven tools where the existing code hardcodes six.
- Add the PDF icon through the smallest safe centralization or existing icon contract, with parity tests for the six current tools.
- Make `ToolShell` support a curated empty related set for PDF Merger; show directory/category navigation instead of unrelated tools.
- Let the existing sitemap continue to derive from live catalog entries while global indexing remains gated.

The full generated Tool Registry migration remains a separate platform task. It should not destabilize all six current tools inside the PDF Merger delivery unless the owner explicitly chooses that larger prerequisite.

## 9. SEO and content plan

### Proposed metadata

- **Title:** `PDF Merger — Combine PDF Files in Your Browser | QUICKKIT`
- **Description:** `Combine multiple PDFs into one file locally in your browser. Reorder files, choose pages, preview documents and download the merged PDF without uploading them.`
- **Canonical path:** `/tools/merge-pdf`
- **Social image:** use the existing factual QUICKKIT Open Graph system; no ratings, “best,” speed or user-count claims.

### Proposed visible introduction

> Put scattered PDFs into one clean document. Arrange the files, include all pages or only the ranges you need, and download a single PDF. Everything is processed locally in your browser, so your documents are not uploaded to QUICKKIT.

### Planned steps

1. Choose or drop at least two PDF files.
2. Drag the files—or use the move buttons—to set the document order.
3. Keep all pages or choose a page range for each file.
4. Review the output page count and file name.
5. Select Merge PDFs and download the combined file.

### Planned FAQs

- Are my PDFs uploaded?  
  No. The files are read and merged in your browser; closing or resetting the page clears the in-memory workspace.
- Will merging reduce quality?  
  Pages are copied structurally rather than converted to images, but some document-level features such as bookmarks, attachments and interactive form behavior are not preserved.
- Can I include only some pages from a file?  
  Yes, with ranges such as `1-3, 5, 8-end` or the visual page picker.
- What happens to bookmarks and form fields?  
  Original bookmark trees are not preserved. Supported form fields are flattened so visible values remain as page content.
- Can I merge a password-protected PDF?  
  This FAQ is included only if the password feature passes its security/fidelity gate. It must state that the correct password stays on the device and the merged output is not encrypted.
- Will a digital signature still be valid?  
  No. Combining pages changes the document structure and invalidates existing signatures.
- Why is a PDF rejected?  
  It may be corrupt, not actually a PDF, encrypted without the correct password, or beyond the displayed file/page limits.
- Does PDF Merger make a PDF safe to open?  
  No. Merging is not malware scanning or sanitization; open only documents from sources you trust.

## 10. QA and evidence plan

### 10.1 Fixture corpus

Generate deterministic synthetic fixtures—never private documents—including:

- Text-marker PDFs with different page counts, sizes and rotations.
- Image-heavy and vector-heavy pages.
- PDFs with internal links to selected and omitted pages.
- PDFs with external links and common annotations.
- AcroForm text, checkbox, radio and dropdown fields with appearances.
- A signature-field/signature-appearance fixture where practical.
- Corrupt header, truncated xref/content and non-PDF bytes with `.pdf` name.
- Empty file and one-page file.
- Independently generated AES/RC4 encrypted fixtures if password support is approved.
- A source outline fixture to prove original outlines are not falsely claimed as preserved and generated bookmarks work if approved.
- Large-page-count and large-image fixtures for local performance testing.

### 10.2 Unit and core tests

- Page-range parser: valid, whitespace, duplicates, reverse order, `end`, reversed range, zero, overflow, empty and malformed tokens.
- Queue ordering, sorting, output-span calculation and limit aggregation.
- Filename/title sanitization, including Unicode and reserved characters.
- PDF signature and inspection error mapping.
- Merge all pages and ranges; reopen output and assert count, order markers, dimensions and rotations.
- Object-graph leakage, link retarget/removal and orphan-page assertions.
- Form flatten visual values and absence of live fields.
- Generated bookmark titles/destinations if enabled.
- Encrypted correct/wrong/empty-password behavior if enabled.
- Worker request/progress/error protocol and cancellation state.

### 10.3 Browser tests

- Complete keyboard-only journey from file selection to download.
- File picker and drag/drop intake.
- Reorder by buttons and pointer drag.
- Range text and visual page picker synchronization.
- Password success/failure if enabled.
- Download the result and independently parse/render it in the test.
- Result invalidation after every class of edit.
- Cancel a sufficiently large synthetic merge.
- Assert no document-bearing network request and no unexpected console errors.
- Axe checks for empty, populated, password, error, processing and success states.
- Responsive checks at 360, 390, 768, 1024 and 1440 CSS pixels.
- Existing six-tool regression suite remains green.

### 10.4 Required delivery evidence

- Full desktop screenshot of populated workspace and success state.
- Full mobile screenshot of populated workspace and success state.
- Feature-by-feature completion checklist.
- Actual lint, typecheck, formatting, unit, browser and production-build results.
- Bundle/lazy-loading evidence proving PDF code is absent from the homepage bundle.
- Known limitations and any spike findings that changed scope.
- Working local demo for owner review.
- `TOOL_DEVELOPMENT_STATUS.md` updated first to “implemented — awaiting owner approval,” then to `live` only after owner approval.

## 11. Implementation sequence after approval

1. **Engine spike and decision record**
   - Compare `@cantoo/pdf-lib` against upstream control and qpdf-WASM fallback using the fixture corpus.
   - Measure bundle, worker integration, CSP needs, performance and memory.
   - Stop and report if graph leakage, forms or encryption cannot meet the contract.
2. **Pure logic**
   - Limits, page ranges, queue calculations, filenames and error taxonomy with unit tests.
3. **Worker core**
   - Inspection, merge, graph safety, form policy, output validation and progress.
4. **Premium workspace UI**
   - Empty/drop, queue, sorting/reorder, range controls, output panel, progress/cancel and success states.
5. **Previews and approved advanced features**
   - PDF.js first-page/page-picker thumbnails.
   - Password workflow and generated bookmarks only if approved and spike-proven.
6. **Page and catalog integration**
   - Route, metadata, content, FAQ, catalog/search/icon/sitemap integration without exposing a placeholder early.
7. **Full QA and delivery package**
   - All automated gates, screenshots, demo, limitations and status update.
8. **Owner review stop point**
   - No next tool begins until the owner approves PDF Merger.

## 12. Definition of done

PDF Merger is not complete until:

- Every approved checklist item is implemented or formally removed by the owner after spike evidence.
- Every visible button, option and state works.
- No critical or high-severity bug is known.
- Output files are independently reopened and visually/textually verified.
- Excluded-page content leakage tests pass.
- Desktop and mobile screenshots are reviewed.
- Accessibility and keyboard journeys pass.
- Lint, typecheck, unit tests, browser tests and production build pass.
- Existing tools regress in no way.
- Privacy/network behavior matches the page copy.
- The owner reviews the demo and explicitly approves the tool.

## 13. Main risks

| Risk | Impact | Mitigation |
|---|---|---|
| Unselected page content hidden in output | Critical privacy/data leak | Dedicated graph-safety spike and positive/negative leakage tests; fail closed |
| Form values disappear or widgets break | High data loss | Detect, flatten with visual fixtures, or block unsupported forms |
| Fork crypto mishandles encrypted PDFs | High security/fidelity | Independent encrypted fixtures; feature can be removed without weakening core |
| Large PDFs exhaust mobile memory | High crash risk | Sequential worker processing, strict limits, constrained-device testing |
| PDF.js preview increases bundle/attack surface | Medium performance/security | Lazy same-origin current release, `isEvalSupported: false`, destroy resources, graceful fallback |
| Bookmarks generated incorrectly | Medium document quality | Optional/off by default, Unicode and destination tests |
| Scope grows into Organizer/Split | Medium schedule/quality | File order + page selection only; no internal page reordering |

## 14. Decisions required from the owner

Please approve or revise:

1. **Name and URL:** PDF Merger at `/tools/merge-pdf`.
2. **Core scope:** file reorder, per-file ranges, visual page picker, first-page previews, worker progress/cancel and validated download.
3. **Password support:** include user-supplied passwords for encrypted sources, with an unencrypted output, or reject encrypted PDFs in v1.
4. **Generated bookmarks:** include the optional one-bookmark-per-file setting, or ship with no bookmark creation.
5. **Form policy:** flatten supported interactive fields and block unprovable cases rather than claiming interactive preservation.
6. **Proposed limits:** 25 files, 50 MiB each, 100 MiB total and 1,000 selected pages, subject to load-test evidence.
7. **Engine path:** `@cantoo/pdf-lib` as the primary spike candidate, PDF.js for previews, qpdf-WASM as fallback if structural gates fail.
8. **Integration path:** narrow current-catalog integration for this one tool, with the full Tool Registry migration kept as separate platform work.
9. **UI layout:** desktop queue + sticky output panel; mobile stacked cards + output section/action bar.

**No implementation will begin until these decisions are approved.**

## 15. Research sources

- pdf-lib upstream features, page copying and encryption limitation: https://github.com/hopding/pdf-lib
- `@cantoo/pdf-lib` package, fork changes and encryption support: https://www.npmjs.com/package/@cantoo/pdf-lib
- pdf-lib bookmark limitation report: https://github.com/Hopding/pdf-lib/issues/218
- pdf-lib form-field copy report: https://github.com/Hopding/pdf-lib/issues/1205
- PDF.js API (`getDocument`, document/page proxies and worker model): https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html
- PDF.js security advisory and `isEvalSupported` workaround: https://github.com/mozilla/pdf.js/security/advisories/GHSA-wgrm-67xf-hhpq
- qpdf page-selection and document-level limitations: https://qpdf.readthedocs.io/en/stable/cli.html
- MDN object URL lifecycle: https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static
- MDN transferable ArrayBuffers and Web Workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
