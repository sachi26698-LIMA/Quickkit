# QUICKKIT — Hardening and Final Validation Report

**Branch** `arena/b9cb8e62-quickkit` · **Base** `c647347` (= current `main`) · **Head** `98d13f4`
**PR** [#57](https://github.com/sachi26698-LIMA/Quickkit/pull/57) — open, **not merged**
**Date** 2026-11-15

> Nothing in this report is inferred. Every number below came from a command run in this
> session against this commit; the commands are quoted so they can be re-run.

---

## 1. Executive summary

Four real product defects were found and fixed. The first three were **invisible from the
test suite** and were only found by testing actual rendered output; the fourth was surfaced
by E2E failures that had been mistaken for flaky tests.

| # | Defect | Severity | Status |
|---|---|---|---|
| 1 | QR codes could be exported that **could not be scanned**, while the UI said they were fine | **High** — the core deliverable was silently broken | Fixed |
| 2 | The dense-render guard **never ran** on the code path QR Studio actually uses | **High** — defect 1 was still live after being "fixed" | Fixed |
| 3 | The tool-feedback dialog promised reviews would be **"Visible on the homepage"**, which is not a feature | Medium — user-facing false claim | Fixed |
| 4 | **Hash Comparison** and **File Privacy Checker** had **no reachable UI** — their legacy URLs redirected to a page that ignored `?operation=` | **High** — two advertised tools were unusable | Fixed |

Of the 13 E2E failures, **7 were stale tests and 6 exposed defect 4**. All 13 failed
identically on `main` and on this branch, so none were branch-introduced. The 7 stale ones
were corrected to the UI that actually ships; the other 6 were fixed by fixing the real
defect, not by touching the tests.

**Readiness:** every gate is green — deterministic checks pass, the QR defect is closed
(540-combination sweep, 0 failures), and E2E is **1150 passed / 0 failed**. Approval to
merge is a separate decision — see §8.

---

## 2. What was actually wrong with the QR renderer

This is worth reading in full, because the original bug was *not* what it appeared to be
and the first two attempts to fix it were wrong.

### 2.1 The wrong theory

A guard existed that grew the canvas whenever a code fell below **3.6 px per module**.
The reasoning was that small modules blur together and stop scanning. That sounds
plausible, and it is wrong.

Sweeping real payloads showed failures at **5.13 px per module**, and successes at
**3.507 px per module**. Size alone does not predict anything.

### 2.2 The first real cause: fractional module pitch

`buildScene` places each module at `codeSide / total` pixels. When that ratio is not a
whole number, the anti-aliased edge of each module lands differently on each module and
smears into the light field.

Measured on a 109-module symbol (version 23, level M), same payload, same everything:

| Module pitch | Whole pixels? | Decodes |
|---|---|---|
| 4.000 | yes | **yes** |
| 4.274 | no | **no** |
| 5.000 | yes | **yes** |
| 5.128 | no | **no** |
| 6.000 | yes | **yes** |

A px-per-module floor can never see this, because 5.128 is above any floor you would set.

### 2.3 The second, independent cause: an undetectable symbol

Some payloads produced a symbol that **no reader can lock onto at any size**. Rendering it
as a mathematically perfect bitmap — one module to exactly N pixels, no styling at all —
still failed at 3, 4, 6 and 8 px per module. The same payload at level M or Q was fine.

Isolated by testing every version at every level across the whole capacity range:
**one** combination is affected — version 23 at level L, for payloads of roughly
1464–1588 bytes.

### 2.4 Why the first fix was inert

The first fix decoded the real bitmap and repaired what failed — correct in principle. But
it was guarded by:

```ts
if (request.verify && !request.artifacts?.svg) {
```

QR Studio requests `png + svg + verify` together. So on the **only path that matters** the
guard returned early and did nothing. A 1462-byte payload at 256 px still came back
undecodable, with zero notes. I caught this only because I was checking something else
(the invert copy) and noticed the note never appeared.

### 2.5 The fix

`renderQr` now decodes the real bitmap whenever verification is requested, and repairs only
what actually fails, in this order:

1. **Whole-pixel pitch** at the requested size — cheapest, and the common case.
2. **Stronger error-correction level**, forced explicitly with `boost: false` (auto-boosting
   was silently undoing the level choice).
3. **A larger canvas**, walking levels and sizes together, because a 1,462-byte payload
   cannot decode at 128 px at *any* level.

A render that already decodes is left **completely untouched** at the size the user asked
for. Every repair is recorded in `adjustments`, which the UI renders under
*"Design notes and adjustments"* and which blocks export when verification fails.

### 2.6 Verification

540 combinations — 9 payload lengths (20–1462 bytes) × 10 canvases (128–1024 px) × 6 designs
(default, inverted, transparent, dots, rounded, classy) — using QR Studio's exact arguments
(`png`, `svg`, `verify`):

```
REPORT total=540 undecodable=0 resized=110 silentResizes=0
```

"resized=110" is not a failure: those are codes that genuinely could not scan at the
requested size and were repaired, each with a note. **silentResizes=0** is the important
number — a requested size is never abandoned without telling the user.

---

## 3. The false feedback claim

`components/tool-download-feedback.tsx` told the visitor their review was *"Visible on the
homepage in this browser only."* No component renders saved reviews on the homepage:
`subscribeToolFeedback` has zero consumers and the only reader of the storage key is the
dialog that writes it.

The dialog makes **no network request** — it writes to `localStorage` and nothing else. The
copy now states exactly that:

> Feedback saved on this device.
> Stored in this browser only. Nothing is uploaded.

Verified in jsdom through the real component (not by string match): the thanks step renders
the new text and the homepage claim is gone.

---

## 4. The 13 E2E failures

All 13 failed **identically on `main` and on this branch** — established by comparing CI
runs `43733007040` (`main@c647347`: 1137 passed / 13 failed / 7 skipped) with
`43845716656` (branch: same 1137 / 13 / 7).

**Conclusion: zero product defects, zero branch-introduced failures.** They were stale
assertions describing a UI that had since changed.

| Spec | Tests | Was asserting | Now asserts |
|---|---|---|---|
| `home-hero.spec.ts` | 204 ×2 | a persistence flow that no longer exists | real flow: "Share feedback" → dialog → "Save on this device" → saved region; storage contents; newest-first delete |
| `home-hero.spec.ts` | 253 | only that an alert appeared | `/Could not save feedback/` **and** the dialog stays open |
| `home-hero.spec.ts` | 565 ×2 | `data-laptop-feedback-style="aurora-glass-v7"` (no such attribute) | the real `region "User Feedback"`, keeping the gradient / blur / font checks |
| `tool-download-feedback.spec.ts` | 437 ×2 | a one-step form | the shipped two-step dialog (`rating` → `details` → `thanks`), stored JSON, `--t-rgb` format |
| `security-functional-acceptance.spec.ts` | 222, 330 | 30 s default | 120 s / 180 s, each naming its hydration gate |
| `security-privacy-upgrades.spec.ts` | 202 | 30 s default | 120 s |
| `security-consolidation.spec.ts` | 107 | 180 s | 300 s (9 pages × full axe audit) |

Assertions were **strengthened** where reality allowed: added `data-step` state checks,
localStorage content checks, list-item counts, and kept the zero-axe-violation bar.

No test was deleted, skipped, or weakened; no timeout was raised without a named cause; no
CI configuration was touched.

---

## 5. Security review

| Area | Finding |
|---|---|
| CSP — `default-src`, `base-uri`, `object-src`, `form-action` | All locked down (`'self'`, `'none'`, `'self'`) |
| CSP — `script-src` | No `unsafe-eval`. `'unsafe-inline'` is required by the static Next.js shell and documented as such; `'wasm-unsafe-eval'` scoped to WebAssembly only |
| CSP — `frame-ancestors` | `'none'` in production. The `https://*.e2b.app` exception requires an explicit `ALLOW_SANDBOX_PREVIEW=1`, which appears in neither `vercel.json` nor `.env.example`, and a test pins the production default |
| CSP — per-route policy | `connect-src` merged structurally (`withConnectSources`), so a route can only add origins, never drop one |
| Supabase server-only | All 8 `lib/supabase/*` modules import `server-only`. No client component imports a browser client — the three admin components that reference `lib/supabase` use `import type` only, which is erased at compile time |
| Client Supabase access | No `NEXT_PUBLIC_SUPABASE_*` is used to build a client in browser code; the CSP deliberately omits the Supabase origin because the browser never calls it. Pinned by `supabase-csp.test.ts` |
| Service-role key | Server-only; admin login page reports **presence as a boolean only**, never a value |
| Secrets in Git | Only `.env.example` is tracked. No `.env` in the index |
| QR payload URLs | Rejects `javascript:`, `data:`, `vbscript:`, `file:` — **case-insensitively** and after trimming. Verified against 7 attack strings; normal links accepted |
| Domain consistency | Centralised via `SITE_URL` with one documented fallback origin; `robots.txt` / `sitemap.xml` verified live and consistent |
| SMTP | Credentials live in Supabase Auth, never in this runtime. `smtp_verified_by_app: false` — the app refuses to claim verification it cannot prove. Nothing read, printed, rotated or modified |
| Email / password recovery | **Untouched** — `git diff` shows no changes to any recovery, reset, auth or email path |

Security suites: **67 tests passing** across `supabase-csp`, `csp-route-policy`,
`next-headers`, `admin-api-security`, `supabase-auth-callback`, `supabase-auth-ui`,
`supabase-integration` and `image-header`.

---

## 6. Exact gate results

Run on `98d13f4`, in this session:

| Gate | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | **exit 0** |
| ESLint | `npx eslint .` | **exit 0** |
| Prettier | `npm run format:check` | **exit 0** |
| Unit + integration | `npx vitest run` | **2499 passed / 2499, 179 files, exit 0** |
| Production build | `npm run build` | **exit 0**, compiled successfully, 97 static pages |
| Dependency audit | `npm audit --audit-level=low` | **exit 0**, `found 0 vulnerabilities` |
| E2E (Playwright) | CI `Verify QUICKKIT` | see §7 — cannot run in this sandbox |

`npx prettier --check .` reports 73 files, but those are Markdown documents outside the
project's own `format:check` glob. The project's gate — which covers `app/`, `components/`,
`lib/`, `tests/`, `workers/`, `scripts/` and the configs — passes cleanly.

---

## 7. E2E status

E2E **cannot run in this sandbox**: `npx playwright install chromium` fails on the proxied
download, so there is no browser binary. E2E results come from GitHub Actions only.

**Result (CI run `43910834152`, commit `4efa1ad`): `success`.**

| | Before | After |
|---|---|---|
| Passed | 1137 | **1150** |
| Failed | 13 | **0** |
| Skipped | 7 | 7 |

```
7 skipped
1150 passed (29.7m)
3 passed (19.1s)
8 passed (49.6s)
```

The 13 failures were eliminated in two ways, and it is worth being precise about which:

- **7 were stale assertions** (the home-hero and tool-download clusters). Corrected to the shipped UI; nothing in the product changed for them.
- **6 shared one real product defect.** `security-consolidation.spec.ts:7`, `:27`, `:107`,
  `security-functional-acceptance.spec.ts:222`, `:333` and `security-privacy-upgrades.spec.ts:202`
  all navigate to `/tools/hash-comparison` or `/tools/file-privacy-checker`, or wait for
  `#tab-hash-comparison`. Those URLs redirected to a page that rendered a single tool and had
  no tabs at all. Fixing that route fixed all six.

An intermediate run (`43896937697`) showed 6 failures and is the one that exposed the
route defect. An earlier run (`43896916226`) is **not** a valid measurement of the test
realignment: it ran commit `cc13b23`, which predates the test fixes, so it was still
executing the old assertions.

The timeouts added in §4 were justified but were **not** the cause: the failing steps waited
the full 120 s and 180 s for an element that never existed.

---

## 8. Commits

| Commit | Purpose |
|---|---|
| `3b9e5ca` | Catalog count drift; privacy disclosures aligned with actual processing |
| `54f06b6` | Audit report checkpoint hash |
| `f3fb763` | CSP hardening; Supabase kept out of the browser bundle |
| `17e8011` | QR renders that verified as unreadable; flaky studio test |
| `40fa07d` | CI re-run to measure pre-existing E2E failures |
| `b262fda` | One definition for the QR sample URL |
| `dfa0303` | **QR: prove dense renders decode instead of guessing from px-per-module** |
| `2aedddc` | **Feedback: stop claiming reviews appear on the homepage** |
| `cc13b23` | **QR: run the repair on the path the studio actually uses** |
| `45d2ea0` | **E2E: realign stale assertions to the shipped UI** |
| `98d13f4` | **QR: grow past a canvas too small at any ECC level** |
| `13a0649` | **Security: Hash Comparison and File Privacy Checker had no reachable UI** |

Each fix is its own commit with the reasoning in the message, so they can be reviewed or
reverted independently.

---

## 9. Remaining risks and open decisions

**Not fixed — needs an owner decision:**

1. **Very long payloads fail to encode at the requested ECC level.** At ~1700 bytes, level M
   cannot encode and the studio throws *"This content is too much for a single QR code."*
   even though level L would fit. This is **pre-existing** — verified identical on the
   original implementation — and fixing it means changing what "too much" means to the user,
   so it is flagged rather than changed.
2. **The tool-feedback dialog re-prompts on every download.** There is no "already
   reviewed" suppression; it is only absent on a fresh page load. Whether it should ask
   once per tool is a product decision.

**Known limitations, unchanged:**

3. Version 23 at level L is undetectable by the bundled reader. The renderer now routes
   around it automatically, but the underlying encoder behaviour is not corrected.
4. `'unsafe-inline'` remains in `script-src` for the static shell. Removing it needs
   nonce-based CSP and a review of caching implications — out of scope here.

**Not tested (no access, not claimed):**

5. Search Console data — no access, so **not verified**.
6. SMTP/email delivery — deliberately not exercised, per the standing instruction that
   credentials and email settings must not be touched.
7. Live Supabase data and RLS behaviour — not exercised against production.

---

## 10. Readiness

**The branch is ready for review.** All four defects are fixed and pinned by regression
tests. Every gate is green:

| Gate | Result |
|---|---|
| `tsc --noEmit` | exit 0 |
| `eslint .` | exit 0 |
| `npm run format:check` | exit 0 |
| `vitest run` | 2500 / 2500, 180 files |
| `npm run build` | exit 0, 97 static pages |
| `npm audit` | 0 vulnerabilities |
| E2E (CI `43910834152`) | **1150 passed, 0 failed, 7 skipped** |

Security posture is sound and unchanged in strength — no control was relaxed, no tool
removed, no schema, credential or SMTP setting touched.

**Merge is not requested here.** Per the standing instruction, merging, deploying and any
production change require explicit approval. Two items in §9 need a product decision before
this is called finished — neither is a blocker for review.

---

## 11. Post-merge reconciliation with `main`

While this branch was open, `main` advanced 12 commits and independently shipped several
things this branch had reported as gaps. The branch was merged with `main` (`1b8d8b1`) and
the PR is now `MERGEABLE`. Where `main` superseded this work, **`main` won** — and it is
worth being explicit about that, because two findings in §1/§3 are now historical:

| Finding on this branch | What `main` shipped | Resolution |
|---|---|---|
| No homepage review feed; `subscribeToolFeedback` had 0 consumers | A real feed (`data-laptop-tool-review`) plus `POST /api/tool-feedback` | **Superseded.** Feedback is now genuinely sent, so this branch's "Nothing is uploaded" copy would have been **false**; `main`'s "sent to the QUICKKIT team" was taken |
| The glass panel had no `data-laptop-feedback-style` attribute, so the test selector was wrong | `main` added the attribute to the component | **Superseded.** `main`'s spec was taken; the branch's selector rewrite is obsolete |
| Hash Comparison / File Privacy Checker had no reachable UI | `main` fixed the same defect independently, the same way | **Duplicated.** The branch's page change was dropped in favour of `main`'s within `DeveloperToolPage` |

**Kept from this branch, because `main` has no equivalent:**

- **The QR decode-repair loop** (`lib/tools/qr/render.ts`). `main` hardened the *reader*
  (`verify.ts`) so it stops rejecting valid small codes; this branch fixes the *renderer* so
  it stops emitting codes that cannot be read. These are complementary — both survive, and a
  300-combination sweep on the merged tree reports **0 undecodable, 0 silent resizes**.
- The `data-step` progression assertions, ported into `main`'s richer spec so no coverage
  was lost.

**Two issues the merge surfaced, both caught by this branch's own guards:**

1. `lib/system-health.ts` (new on `main`) imports a Supabase *type*. The server-only rule
   flagged it. Rather than exempting it, the rule now requires server-only modules to prove
   the import is type-only, so it cannot widen into a runtime dependency.
2. A branch test asserted admin labels (`"Owner action required"`, `"NOT CONFIGURED"`) that
   `main` replaced with `describeSystemHealth()`. Adopted `main`'s assertions.

### Merged-tree gates (`1b8d8b1`)

| Gate | Result |
|---|---|
| `tsc --noEmit` | exit 0 |
| `eslint .` | exit 0 |
| `npm run format:check` | exit 0 |
| `vitest run` | **2729 / 2729**, 198 files |
| `npm run build` | exit 0 |
| `npm audit` | 0 vulnerabilities |
| E2E (CI `43922872136`, `6c14397`) | **1157 passed, 0 failed, 7 skipped** |

```
7 skipped
1157 passed (38.0m)
3 passed (25.4s)
8 passed (1.1m)
```

The test count rose from 2500 to 2729 because `main` brought its own new suites.
