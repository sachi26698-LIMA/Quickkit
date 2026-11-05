# PDF Lock & Unlock — QA Report

**Tool:** `/tools/pdf-lock-unlock` · **Category:** PDF Tools
**Branch:** `arena/c9142958-quickkit` · **Base:** `881d174c776d56fcf1ffc76dcc4ea7349699bd09`
**Date:** 2026-11-04 · **Status:** Implemented + premium UI/UX redesign, tested locally. **Not merged, not deployed** (owner approval required).

---

## 1. What was built

A fully client-side PDF Lock & Unlock workspace with two tabs (Lock PDF / Unlock PDF),
batch processing, per-file progress, verified downloads (individual + ZIP), and
educational/privacy content. All cryptography runs in a dedicated Web Worker using
**QPDF compiled to WebAssembly** (`@neslinesli93/qpdf-wasm@0.3.1`, ISC license). No PDF
bytes or passwords are uploaded anywhere.

### Why QPDF WASM (and not the existing PDF library)
The repo already ships `@cantoo/pdf-lib` (a `pdf-lib` fork). During the audit it proved
unable to reliably round-trip encryption: decrypt-on-save re-emitted `/Encrypt`, and
manual removal left Info metadata garbled. It is therefore used **only** for
`ignoreEncryption: true` inspection probes and for reading QPDF-produced output. QPDF
WASM performs the actual encrypt/decrypt and is a mature, standards-correct implementation.

### Actual algorithms & compatibility
| Mode | Standard | PDF version | Notes |
|------|----------|-------------|-------|
| Lock (default) | **AES-256** (`/V 5 /R 6`, AESV3) | PDF 2.0 | Unicode passwords up to 127 UTF-8 bytes |
| Lock (compat) | **AES-128** (`/V 4 /R 4`, AESV2, `--use-aes=y`) | PDF 1.6 | Printable-ASCII passwords up to 32 bytes |
| Unlock | QPDF `--decrypt --allow-weak-crypto` | any | Removes open-password + permission protection with the correct password |

QPDF is invoked as `--encrypt <user> <owner> <40|128|256> [permission flags] -- in out`.
The deprecated `--force-R5` is avoided. `--check` is **never** used because its stdout
echoes the user password; decryption verification uses `--decrypt --password=…` instead.

---

## 2. Registration & discovery (no duplicates)

- `lib/catalog.ts` — single new entry `pdf-lock-unlock` (icon `pdfLock`, color `purple`),
  appended after `pdf-to-word`; PDF category blurb/description updated. Catalog now has
  **30 tools / 9 PDF tools** after merging `main` (Word to PDF + PDF Lock & Unlock).
- `components/tool-icon.tsx` — `pdfLock → LockKeyhole`.
- `app/page.tsx` — added to homepage popular chips (2nd slot) + metadata description.
- Route `app/tools/pdf-lock-unlock/page.tsx` renders through the shared `ToolShell`, so
  All Tools, the PDF category page, search, related tools, and the sitemap pick it up
  automatically. Sitemap route counts are derived from published legal pages + tools in tests.
- Verified live in E2E: homepage chip, `/tools` search ("lock unlock"), and
  `/category/pdf-tools` listing all show the tool exactly once.

---

## 3. Feature coverage

**Lock:** multiple PDFs, drag/drop + file picker, required open password + confirmation,
optional separate permissions (owner) password + confirmation, show/hide toggles,
secure generator + copy, strength meter, mismatch/validation, AES-256/AES-128 selector,
eight permission controls (print, high-res print, copy, edit, annotate, forms, assembly,
accessibility) with presets, shared or individual passwords, per-file current-password
for re-locking encrypted inputs, output renaming with `-locked` suffix, ZIP naming.

**Unlock:** protected PDFs with the correct known password, authorization checkbox,
common or individual passwords, "verify password" action, removal of opening protection
and (where supported) permission restrictions, `-unlocked` suffix, individual + ZIP downloads.

**Workflow:** names/sizes/page counts/encryption status, remove/clear-all (with confirm),
drag + arrow-key reorder, live validation, per-file + overall progress, cancel/retry,
bounded sequential processing, success/download verification. Limits: 50 MiB/file,
20 files, 100 MiB total input, 128 MiB generated, 1,000 pages/file, 2,000 pages/queue.
Large documents are never silently truncated — over-limit files are rejected with a clear message.

**Education/privacy:** 4-step walkthrough, 8 FAQs, and three privacy cards explaining
local-only processing, encryption vs reader-enforced permissions, and no password recovery.

---

## 4. Verification methodology (no unverified success claims)

Every successful result is reopened and checked before the UI shows "Locked/Unlocked and verified":

- **Lock:** output must be encrypted with the requested algorithm; permission bits must
  match the requested set; the output must decrypt with the new open password; page count,
  page dimensions and Info metadata must match the source; a negative control (decrypt with
  no password) must fail.
- **Unlock:** output must be unencrypted and open without a password; page count/dimensions
  must match the source probe; metadata is compared against a faithful reference decrypt of
  the source (the source's Info strings are themselves encrypted, so a reference decrypt is
  the only honest baseline). Mismatches discard the output and leave the original untouched.
- **Independent reader check (E2E):** downloaded files are reopened with **PDF.js**
  (`getDocument` + `getPermissions`) to confirm encryption state, page count, metadata and
  the actual permission flags a real reader sees.

Digitally signed PDFs are blocked at intake (rewriting would invalidate the signature).

---

## 5. Test results

| Suite | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ pass (0 errors) |
| `npm run format:check` | ✅ pass |
| `npm test` (Vitest, 51 files) | ✅ **951 / 951 pass** (927 baseline + 24 new) |
| New unit: `pdf-security-logic.test.ts` | ✅ 12 pass |
| New unit: `pdf-security-engine.test.ts` (real QPDF WASM) | ✅ 12 pass |
| New E2E: `pdf-lock-unlock.spec.ts` (Chromium) | ✅ **5 / 5 pass** |
| Full E2E (Chromium, 595 tests) | 573 pass · 19 fail · 3 skip |
| `npm run build` (Next 16.4.3 / Turbopack) | ✅ pass; `/tools/pdf-lock-unlock` emitted as static |

**About the 19 full-suite E2E failures:** they are in *untouched* tools
(`image-to-image`, `images-to-pdf`, `pdf-studio`, `pdf-to-image`) and are caused by the
headless Chromium environment used in this sandbox. To prove they are **pre-existing and
not regressions**, the same four spec files were run against a detached worktree of the
base commit `881d174` with the identical browser: **the exact same 19 tests fail there too.**
All registration/discovery/accessibility/quality/sitemap tests pass on this branch.

Firefox/WebKit E2E projects were **not run** — no browser binaries for them are available
in this sandbox (only Chromium could be provisioned). The new spec is Chromium-only by design.

### New engine unit tests exercise
normal + encrypted inspection, AES-256 lock with permission/metadata/content-hash
preservation, AES-128 compat, Unicode & special-character passwords, wrong-password
rejection without damage, authorization enforcement, already-unencrypted passthrough,
re-locking an encrypted PDF, signed-PDF blocking, empty/corrupt rejection, a **1,000-page**
document without truncation, and settings validation.

---

## 6. Privacy & security evidence

- E2E asserts **zero external network requests** during lock/unlock/batch flows and that
  **no password string appears in any console message**.
- Passwords live only in React state + worker messages; they are cleared after every
  run/cancel/clear/mode-switch (E2E asserts all four lock fields and the unlock field are empty).
- QPDF stdout/stderr is captured and used only for internal error classification
  (`invalid password`, header/startxref); it is never logged or posted.
- Originals are never modified; processing is in-memory and outputs are new buffers.
- Same-origin WASM assets (`/qpdf/0.3.1/…`); existing CSP already permits `wasm-unsafe-eval`.
- No cracking, brute force, dictionary attacks, guessing or bypasses — unlock requires the
  correct existing password plus an explicit authorization confirmation.

---

## 7. Screenshots (Chromium, same-origin production build)

| File | View |
|------|------|
| `01-empty-desktop.png` | Empty workspace, 1280px |
| `02-lock-settings-desktop.png` | Lock tab, passwords + permissions filled |
| `03-lock-result-desktop.png` | Locked & verified result + download |
| `04-unlock-result-desktop.png` | Unlocked & verified result |
| `05-empty-mobile.png` | Empty workspace, 390px |
| `06-lock-settings-mobile.png` | Lock settings, 390px |
| `07-lock-result-mobile.png` | Lock result, 390px |

Mobile: no horizontal overflow; tabs, queue and controls remain usable; axe
(WCAG 2.0/2.1/2.2 A/AA) reports zero violations on desktop and mobile.

---

## 8. Known limitations (disclosed honestly)

1. **Permissions are reader-enforced, not encryption.** The UI and FAQs state that
   permission flags can be ignored by non-compliant software; only the open password
   provides cryptographic protection.
2. **Individual-mode custom lock covers the open password only.** Owner password and
   permission set remain global per batch (documented in the UI help text).
3. **Individual-mode passwords are validated per file at run time** with clear errors;
   shared mode is live-validated and gates the process button.
4. **AES-128 passwords are limited to printable ASCII (≤32 bytes)** by the standard;
   AES-256 supports Unicode (≤127 UTF-8 bytes).
5. **No password recovery.** A lost open password cannot be recovered; this is stated plainly.
6. **Signed PDFs are blocked**; PDF/A conformance may be affected by re-encryption (FAQ caveat).
7. **Unlock metadata verification** compares the output to a reference decrypt of the
   source (the only honest baseline, since source Info strings are encrypted).
8. Capacity is bounded by device/library memory; the 1,000-page target is verified in
   tests but very large or heavily compressed files may still exceed available memory.

---

## 9. Build / deployment status

- Production build succeeds; the route is statically prerendered.
- QPDF assets are generated by `npm run prepare:qpdf` (wired into `predev`/`prebuild`)
  into `public/qpdf/0.3.1/` and are **gitignored** (regenerated on install/build).
- **Nothing has been merged or deployed.** Changes remain on `arena/c9142958-quickkit`
  for owner review.

---

## 10. Premium UI/UX redesign (presentation-only)

A second pass redesigned the tool as a compact, professional PDF security workspace
without touching the cryptography, worker, validation, batch engine, privacy model,
route/catalog registration, or the original five E2E tests.

### Design changes
- **Compact page header** via a new optional `ToolShell variant="compact"`: breadcrumb,
  icon + title + one-line description + local-processing badge; repeated headings and
  duplicate privacy paragraphs removed. Default `ToolShell` behavior is unchanged for
  every other tool.
- **Segmented Lock PDF / Unlock PDF tabs** directly under the heading.
- **Balanced desktop workspace**: password/encryption card on the left; upload, file
  queue, status and primary action on the right; collapsible advanced settings span
  below the main workspace to avoid tall empty columns.
- **Password panel**: grouped open/confirm/generate/copy/show-hide, strength meter,
  encryption selector, optional separate permissions password; concise hints/tooltips
  instead of permanent helper text.
- **Advanced settings**: six collapsible sections (permissions, encryption compatibility,
  individual passwords, batch options, output filename, ZIP download). Permissions use a
  compact two-column desktop / one-column mobile grid with presets; no advanced feature
  was removed.
- **Upload & queue**: polished dropzone with limits, compact file rows (icon, name, size,
  pages, status, rename, remove, reorder), per-file progress and visible errors/failures.
- **Contextual primary action**: `Lock N PDFs` / `Unlock N PDFs`, readiness-gated with an
  explanatory hint, processing state, duplicate-submission prevention, sticky bottom bar
  on mobile that does not cover the queue at page end.
- **Verified results**: success/failure per file, encryption/decryption verification,
  output name/size, individual download, Download all as ZIP, retry failed. Success is
  shown only after actual output verification.
- **Purpose-built mobile order** (≤900px): title → tabs → password settings → advanced
  accordion → upload → queue → sticky action. Full-width inputs, ≥44px touch targets,
  16px input font, no horizontal overflow.
- QUICKKIT palette tokens (Midnight/Deep Plum/Plum Rose/Rose Pink/Soft Blush/Coral),
  white surfaces, light blush page background, consistent radius/shadows, reduced-motion
  support. No new dependencies.

### Redesign verification
| Check | Result |
|-------|--------|
| `npm run typecheck` | clean |
| `npm run lint` | clean (0 errors/warnings) |
| `npm run format:check` | clean |
| `npm test` (Vitest) | **51 files / 951 tests passed** |
| Original E2E `pdf-lock-unlock.spec.ts` | **5/5 passed unchanged** (production build) |
| New E2E `pdf-lock-unlock-redesign.spec.ts` | **5/5 passed** (production build) |
| Combined PDF security E2E | **10/10 passed** against production server |
| Responsive QA | 360 / 390 / 430 / 768 / 1024 / 1440 px — order, overflow, touch targets, sticky action |
| Backend immutability | `sha256sum -c` OK for security-engine/logic/worker-types/hook/qpdf-runtime/worker + engine/logic unit tests |
| Production build | succeeds; `/tools/pdf-lock-unlock` statically prerendered |

New redesign E2E covers: advanced permissions accordion + presets + PDF.js permission
verification; individual lock passwords + per-file rename through ZIP; batch cancellation
+ password clearing + retry; individual unlock password verification; responsive layout
at all six required widths.

### Before / after screenshots
True pre-redesign baselines are preserved in `docs/pdf-lock-unlock/redesign/before/`;
post-redesign production captures are in `docs/pdf-lock-unlock/redesign/after/`.
The original `01–07*.png` report screenshots were refreshed from the production build
to reflect the redesigned UI (no Next.js dev indicator).

| State | Before | After |
|-------|--------|-------|
| Empty desktop 1440 | `redesign/before/empty-1440.png` | `redesign/after/empty-1440.png` |
| Empty tablet 768 | `redesign/before/empty-768.png` | `redesign/after/empty-768.png` |
| Empty mobile 390 | `redesign/before/empty-390.png` | `redesign/after/empty-390.png` |
| Lock settings desktop | `redesign/before/lock-settings-1440.png` | `redesign/after/lock-settings-1440.png` |
| Lock settings mobile | `redesign/before/lock-settings-390.png` | `redesign/after/lock-settings-390.png` |
| Lock result desktop | `redesign/before/lock-result-1440.png` | `redesign/after/lock-result-1440.png` |
| Lock result mobile | `redesign/before/lock-result-390.png` | `redesign/after/lock-result-390.png` |

Additional widths (360 / 430 / 1024) are captured in both folders.

### Redesign changed files
- `components/tools/pdf-lock-unlock.tsx` — presentation rewrite; state/handlers preserved.
- `components/tools/pdf-lock-unlock.module.css` — full redesign stylesheet + responsive order.
- `app/tools/pdf-lock-unlock/page.tsx` — compact shell, 3 usage steps, 6 concise FAQs.
- `components/tool-shell.tsx` — optional `variant` / `headingDescription` props (default unchanged).
- `app/globals.css` — scoped `.tool-page-compact` / `.tool-title-compact` / `.tool-guidance-compact`.
- `tests/e2e/pdf-lock-unlock-redesign.spec.ts` — new redesign E2E (original spec untouched).
- `docs/pdf-lock-unlock/` — refreshed screenshots, before/after baselines, this report.

**Unchanged:** all `lib/tools/pdf/*` security files, `workers/pdf-security.worker.ts`,
QPDF asset script, PDF security unit tests, catalog/registration, and all other tools.
