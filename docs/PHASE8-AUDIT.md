# Phase 8 Audit — Image & PDF Advanced Batch Processing V2

Audit of the repository at `881d174` (merged PR #15), branch
`arena/0f4d0d5c-quickkit`. Read-only; no code was modified to produce this
report.

## 1. Tool inventory

**Image Tools (4)** — all in scope:

| Slug               | Route                     | Component                               |
| ------------------ | ------------------------- | --------------------------------------- |
| `image-compressor` | `/tools/image-compressor` | `components/tools/image-compressor.tsx` |
| `image-resizer`    | `/tools/image-resizer`    | `components/tools/image-resizer.tsx`    |
| `image-cropper`    | `/tools/image-cropper`    | `components/tools/image-cropper.tsx`    |
| `image-to-image`   | `/tools/image-to-image`   | `components/tools/image-to-image.tsx`   |

**PDF Tools (8)** — all in scope:

| Slug            | Route                  |
| --------------- | ---------------------- |
| `images-to-pdf` | `/tools/images-to-pdf` |
| `pdf-to-image`  | `/tools/pdf-to-image`  |
| `pdf-studio`    | `/tools/pdf-studio`    |
| `merge-pdf`     | `/tools/merge-pdf`     |
| `split-pdf`     | `/tools/split-pdf`     |
| `compress-pdf`  | `/tools/compress-pdf`  |
| `pdf-to-word`   | `/tools/pdf-to-word`   |

Out of scope and untouched: `qr-generator`, all calculators.

## 2. Current limits

### Shared converter limits (`CONVERT_LIMITS`, `lib/tools/image-convert.ts:227`)

| Limit           | Value   | Phase 8 target | Gap           |
| --------------- | ------- | -------------- | ------------- |
| `maxFiles`      | **20**  | 1,000          | **50× short** |
| `maxImageBytes` | 15 MB   | —              | —             |
| `maxPdfBytes`   | 25 MB   | —              | —             |
| `maxPdfPages`   | **100** | 1,000          | **10× short** |
| `maxBatchBytes` | 150 MB  | —              | —             |
| `maxPagePixels` | 36 MP   | —              | —             |

These are enforced at runtime, e.g. `image-convert-runner.ts:1018` throws
`Add at most 20 images at a time.`

### Standalone image tools

`lib/tools/image-compress.ts:29`, `image-resize.ts:11`, `image-crop.ts:77`
each declare `MAX_BATCH_FILES = 20` and `MAX_BATCH_PIXELS = 200_000_000`.

### Standalone PDF engines — already at target

`lib/tools/pdf/merge-engine.ts` and `split-engine.ts` declare:

- `maxPagesPerFile: 1000`
- `maxTotalPages: 2000`
- `maxFiles: 20` / `25`

**This is the single most important audit finding.** The merge/split/compress
engines already satisfy the 1,000-page target and enforce it with clear
messages (`merge-engine.ts:296`, `:1420`). Phase C capacity work is therefore
mostly about the _converter_ tools (`pdf-to-image`, `images-to-pdf`,
`pdf-studio`), which are capped at 100 pages via `CONVERT_LIMITS.maxPdfPages`,
**not** about the standalone engines. Raising those engines further would be
unnecessary and risky.

## 3. Libraries

| Purpose        | Library                                               |
| -------------- | ----------------------------------------------------- |
| PDF read/write | `@cantoo/pdf-lib` 2.11.1                              |
| PDF render     | `pdfjs-dist` 6.4.299                                  |
| Image codecs   | dependency-free in-repo (`lib/tools/image-codec.ts`)  |
| ZIP            | in-repo `zipOutputs` (`image-convert-runner.ts:1452`) |

No `sharp`, `jimp`, `fflate` or `jszip`. Everything is browser-local; no upload
path exists, which satisfies the privacy requirement by construction.

## 4. Web Workers — partially present

| Worker                           | Scope                                           |
| -------------------------------- | ----------------------------------------------- |
| `workers/image-encode.worker.ts` | **BMP, TIFF, GIF only**                         |
| `workers/pdf-compress.worker.ts` | compress                                        |
| merge/split worker hooks         | `lib/tools/pdf/use-pdf-{merge,split}-worker.ts` |
| `public/ocr/worker.min.js`       | PDF→Word OCR                                    |

**Gap:** the CPU-heavy paths that Phase G targets — JPEG/PNG/WebP/AVIF encode,
canvas resampling, thumbnail rasterisation — still run on the main thread. The
existing worker only covers three lossless formats.

## 5. Existing capability matrix

Legend: ✅ present · ⚠️ partial · ❌ absent

### Phase B — image batch

| Capability                    | Compressor | Resizer | Cropper | Image-to-Image      |
| ----------------------------- | ---------- | ------- | ------- | ------------------- |
| Multi-file select             | ✅         | ✅      | ✅      | ✅                  |
| Drag & drop                   | ✅         | ✅      | ✅      | ✅                  |
| Folder selection              | ❌         | ❌      | ❌      | ❌                  |
| Thumbnails                    | ✅         | ✅      | ✅      | ✅                  |
| Select all / none             | ❌         | ❌      | ❌      | ❌                  |
| Remove / replace              | ✅         | ✅      | ✅      | ✅                  |
| Corrupt-file detection        | ✅         | ✅      | ✅      | ✅                  |
| **Apply to All**              | ❌         | ❌      | ❌      | ⚠️ global only      |
| **Individual override**       | ✅         | ✅      | ❌      | ⚠️ rotate/crop only |
| Inherited-vs-custom indicator | ❌         | ❌      | ❌      | ❌                  |
| ZIP download                  | ✅         | ✅      | ✅      | ✅                  |
| Export selected only          | ❌         | ❌      | ❌      | ❌                  |

### Phase C — PDF page organisation (`pdf-studio`)

| #   | Capability                 | State         |
| --- | -------------------------- | ------------- |
| 1   | Page thumbnails            | ✅            |
| 2   | Drag-and-drop reorder      | ✅            |
| 3   | Move page to position      | ✅            |
| 4   | Insert **before** selected | ❌            |
| 5   | Insert **after** selected  | ❌            |
| 6   | Delete selected            | ✅            |
| 7   | Duplicate pages            | ✅            |
| 8   | Rotate individual          | ✅            |
| 9   | Rotate selected            | ❌            |
| 10  | Rotate all                 | ❌            |
| 11  | Extract selected           | ✅            |
| 12  | Extract custom ranges      | ✅            |
| 13  | Select all                 | ❌            |
| 14  | Deselect all               | ❌            |
| 15  | Invert selection           | ❌            |
| 16  | Select odd/even            | ❌            |
| 17  | Range selection            | ✅            |
| 18  | Page count / navigation    | ⚠️ count only |

There is no multi-page _selection set_ abstraction at all — `setRemoved` /
`toggleRemoved` / `rotatePage` / `duplicatePage` all act per page id, which is
why 9, 10, 13–16 are absent together. Introducing a selection set is the
prerequisite for the whole block.

### Phase D — page numbering

Already implemented in `lib/tools/pdf-studio.ts:99`:

| Option                                | State                   |
| ------------------------------------- | ----------------------- |
| Enable/disable                        | ✅ `pageNumbers`        |
| Format string                         | ✅ `pageNumberFormat`   |
| Position (6 corners)                  | ✅ `pageNumberPosition` |
| Font size                             | ✅ `pageNumberSize`     |
| Watermark text/opacity/size/angle     | ✅                      |
| **Custom starting number**            | ❌                      |
| **Prefix / suffix**                   | ❌                      |
| **Roman numerals**                    | ❌                      |
| **Font family / colour**              | ❌                      |
| **Header / footer text**              | ❌                      |
| **Custom margins**                    | ❌ (hardcoded 24 pt)    |
| **Apply to selected / exclude cover** | ❌                      |

So Phase D is roughly 40% done. The plumbing (pure `pageNumberLabel` +
`pageNumberPlacement`, stamping pass in `buildDocument`) exists and is
unit-tested; what is missing are the option surface and per-page targeting.

### Phase E — global/individual settings model

**Largely absent, but with more reusable infrastructure than first appeared.**

Absent: `applyToAll` / apply-to-selected (0 hits anywhere) and an
inherited-vs-custom indicator.

**Correction (verified later, Stage 1 audit):** the claim below that there is
"any per-file override map (0 hits)" was **wrong**. Two tools already have real
per-item override models — the earlier grep missed them because it searched for
`overrideMap` / `perFileSettings` rather than the vocabulary actually in use:

- `image-compressor.tsx:63` — `type Override = { enabled, format, quality,
targetValue, targetUnit, name, suffix }`, applied at `:214-224` via
  `item.override.enabled` checks that fall back to the global setting.
- `image-resizer.tsx:104` — `type ItemOverride = { enabled, width, height,
lockAspect, ... }`, applied at `:507-512`.
- `image-cropper` and `image-to-image` genuinely have none.

So Stage 1 must **extend** the existing compressor and resizer override models
rather than build a new one, and the `enabled` flag is the inherited-vs-custom
signal that the indicator requirement needs — it is already there, just not
surfaced in the UI. `image-to-image` holds one `ImageSettings` object for the
whole batch; its only per-item state is queue-level rotation and crop.

Present and reusable:

- **`image-resizer` already keeps per-item undo history** —
  `Record<string, HistoryEntry>` keyed by item id (`image-resizer.tsx:406`),
  with `pushHistory` at `:660`. That is the exact per-file shape Phase E needs.
- **`image-cropper` uses a generic history module** —
  `createHistory<T>` / `commitHistory<T>` / `undoHistory` / `redoHistory` in
  `lib/tools/image-crop.ts:664+`. It is already generic over `T`, so it can
  carry a settings+override pair without modification.
- Undo/redo coverage by tool: `image-resizer` ✅, `image-cropper` ✅,
  `image-compressor` ❌, `image-to-image` ❌, `images-to-pdf` ❌,
  `pdf-to-image` ❌, `pdf-studio` ❌.

So Phase E is best delivered by lifting the resizer's per-item pattern and the
cropper's generic `History<T>` into the shared module, rather than writing a new
history implementation. The genuinely new work is the override layer.

### Phase G — performance

| Capability                  | State                                 |
| --------------------------- | ------------------------------------- |
| Chunked processing          | ❌                                    |
| Bounded concurrency         | ❌                                    |
| Lazy thumbnails             | ❌                                    |
| Virtualised lists           | ❌                                    |
| Streaming ZIP               | ❌ (`zipOutputs` buffers all outputs) |
| Per-file + total progress   | ✅                                    |
| Cancel                      | ✅                                    |
| Retry / skip failed         | ⚠️ retry only                         |
| Memory release after export | ⚠️ partial                            |

`renderPdfThumbnails` (`image-convert-runner.ts:1410`) rasterises eagerly, and
**no batch list is virtualised**. **At 1,000 items this is the failure mode**:
the UI would attempt 1,000 canvas renders and 1,000 object URLs up front.

Useful precedent does exist, though — `IntersectionObserver` is already used in
three places: `components/reveal.tsx:28` (scroll reveal, with a
`!("IntersectionObserver" in window)` fallback at `:21` worth copying) and
`components/tools/pdf-to-word/{docx-pane.tsx:150, pdf-pane.tsx:66}`, which
lazily observe long document panes. So lazy thumbnail loading should reuse the
established pattern and its feature-detection fallback rather than introduce a
new one. No `react-window`/`content-visibility` is present, so windowed list
rendering is genuinely new.

## 6. Test and route baseline to preserve

- 23 image/PDF unit suites + `tests/e2e/` 27 files; full suite **927 tests / 49 files** green at `881d174`.
- `tests/split-regression.test.tsx` (12 cases) guards the four-way split, the 308 redirect and catalogue integrity.
- `tests/four-tool-consistency.test.tsx` and `four-tool-workspace.test.tsx` lock in shared structure.
- Routes: four converter tools + `merge-pdf` / `split-pdf` / `compress-pdf` / `pdf-to-word`; `/tools/image-converter` → 308.

## 7. Proposed architecture

### 7.1 Shared batch infrastructure (new, additive)

A `lib/tools/batch/` module rather than per-tool duplication:

- **`SelectionSet`** — ordered id set with `all`, `none`, `invert`, `odd`,
  `even`, `range`, `toggle`. Prerequisite for Phase C items 9–16 and Phase E
  "apply to selected".
- **`OverrideMap<T>`** — `Record<id, Partial<T>>` layered over a global
  `T`, plus `effective(id)` and `isCustom(id, key)`. Gives inherited-vs-custom
  for free and guarantees global edits cannot silently erase overrides (Phase E
  requirement).
- **`History<T>`** — bounded undo/redo over the settings+override pair.
  **Reuse the existing generic `History<T>` in `lib/tools/image-crop.ts:664`**
  (`createHistory` / `commitHistory` / `undoHistory` / `redoHistory`) and the
  resizer's per-item `Record<string, HistoryEntry>` shape rather than writing a
  new implementation.
- **`runBounded(items, worker, {concurrency, signal, onProgress})`** — the one
  concurrency primitive all tools share, with per-item and total progress,
  cancel, retry and skip.

### 7.2 Capacity: raise ceilings adaptively, not absolutely

The brief is explicit that 1,000 must not be advertised until stress-tested.
Proposal:

- Replace the fixed `maxFiles: 20` with `planBatch(bytes[], pixelEstimate)`
  returning `{accepted, deferred, reason}` against a memory budget derived from
  `deviceMemory` / `hardwareConcurrency`, falling back to a conservative
  default when those APIs are unavailable.
- Queue beyond the budget rather than rejecting, so a 1,000-file drop is
  _processed in waves_ instead of refused or truncated.
- Keep `maxPagesPerFile: 1000` / `maxTotalPages: 2000` in the merge/split
  engines untouched — already at target.
- Raise `CONVERT_LIMITS.maxPdfPages` only for the converter tools, gated on the
  same budget.

### 7.3 Virtualisation and lazy thumbnails

Windowed list rendering plus `IntersectionObserver`-driven thumbnail
generation, so a 1,000-item queue holds ~20 live canvases at a time. This is
the precondition for any 1,000-item claim being honest.

### 7.4 Workers

Extend the worker boundary from BMP/TIFF/GIF to the full encode path, keeping
the existing transferable-buffer pattern. Canvas resampling stays on the main
thread unless `OffscreenCanvas` is available, with a fallback.

### 7.5 Sequencing

1. Shared batch infrastructure (§7.1) — unblocks everything else.
2. Virtualisation + lazy thumbnails (§7.3) — unblocks any capacity increase.
3. `SelectionSet` wired into `pdf-studio` → Phase C items 4, 5, 9, 10, 13–16.
4. `OverrideMap` + `History` in `image-to-image` → Phase B/E, then replicate.
5. Phase D option surface on the existing numbering plumbing.
6. Adaptive ceilings (§7.2) last, only after 1–5 are measurable.
7. Stress tests (Phase I) at each step, not at the end.

## 8. Risks and honest constraints

- **No browser binary in this sandbox.** Playwright cannot execute
  (`playwright install` fails with `ECONNRESET`). The 927 unit tests and the
  production build run locally; the 666 e2e cases run only in CI. **Real-device
  memory measurement for Phase I is therefore not possible here** — any
  1,000-item claim would have to be validated by you or in CI.
- **`deviceMemory` is Chromium-only** and often capped at 8. The adaptive budget
  must degrade safely on Safari/Firefox rather than assume it.
- **pdf-lib holds whole documents in memory.** 1,000-page PDFs are feasible
  (the merge engine already allows it) but 1,000 _rendered_ pages are not;
  rendering must stay streamed and per-page.
- **Existing `zipOutputs` buffers everything.** A 1,000-file ZIP needs
  incremental generation or it will exhaust memory before download.
- Password-protected PDFs remain refused. Verified earlier that
  `pdf-lib`'s `save({userPassword})` is a **silent no-op** returning an
  unencrypted file, so protection must not be offered.

## 9. Recommendation

Proceed in the §7.5 order, one tool at a time, gated on the existing suite.
Do **not** raise any user-visible limit until virtualisation (§7.3) and bounded
concurrency (§7.1) are in place — otherwise the only effect is converting a
clean "20 max" refusal into a frozen tab.
