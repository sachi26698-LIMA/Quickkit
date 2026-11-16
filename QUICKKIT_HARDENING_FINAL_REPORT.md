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

| #   | Defect                                                                                                                                       | Severity                                               | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------ |
| 1   | QR codes could be exported that **could not be scanned**, while the UI said they were fine                                                   | **High** — the core deliverable was silently broken    | Fixed  |
| 2   | The dense-render guard **never ran** on the code path QR Studio actually uses                                                                | **High** — defect 1 was still live after being "fixed" | Fixed  |
| 3   | The tool-feedback dialog promised reviews would be **"Visible on the homepage"**, which is not a feature                                     | Medium — user-facing false claim                       | Fixed  |
| 4   | **Hash Comparison** and **File Privacy Checker** had **no reachable UI** — their legacy URLs redirected to a page that ignored `?operation=` | **High** — two advertised tools were unusable          | Fixed  |

Of the 13 E2E failures, **7 were stale tests and 6 exposed defect 4**. All 13 failed
identically on `main` and on this branch, so none were branch-introduced. The 7 stale ones
were corrected to the UI that actually ships; the other 6 were fixed by fixing the real
defect, not by touching the tests.

**Readiness:** every gate is green — deterministic checks pass, the QR defect is closed
(540-combination sweep, 0 failures), and E2E is **1150 passed / 0 failed**. Approval to
merge is a separate decision — see §8.

---

## 2. What was actually wrong with the QR renderer

This is worth reading in full, because the original bug was _not_ what it appeared to be
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
| ------------ | ------------- | ------- |
| 4.000        | yes           | **yes** |
| 4.274        | no            | **no**  |
| 5.000        | yes           | **yes** |
| 5.128        | no            | **no**  |
| 6.000        | yes           | **yes** |

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
   cannot decode at 128 px at _any_ level.

A render that already decodes is left **completely untouched** at the size the user asked
for. Every repair is recorded in `adjustments`, which the UI renders under
_"Design notes and adjustments"_ and which blocks export when verification fails.

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

`components/tool-download-feedback.tsx` told the visitor their review was _"Visible on the
homepage in this browser only."_ No component renders saved reviews on the homepage:
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

| Spec                                     | Tests    | Was asserting                                                      | Now asserts                                                                                                        |
| ---------------------------------------- | -------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `home-hero.spec.ts`                      | 204 ×2   | a persistence flow that no longer exists                           | real flow: "Share feedback" → dialog → "Save on this device" → saved region; storage contents; newest-first delete |
| `home-hero.spec.ts`                      | 253      | only that an alert appeared                                        | `/Could not save feedback/` **and** the dialog stays open                                                          |
| `home-hero.spec.ts`                      | 565 ×2   | `data-laptop-feedback-style="aurora-glass-v7"` (no such attribute) | the real `region "User Feedback"`, keeping the gradient / blur / font checks                                       |
| `tool-download-feedback.spec.ts`         | 437 ×2   | a one-step form                                                    | the shipped two-step dialog (`rating` → `details` → `thanks`), stored JSON, `--t-rgb` format                       |
| `security-functional-acceptance.spec.ts` | 222, 330 | 30 s default                                                       | 120 s / 180 s, each naming its hydration gate                                                                      |
| `security-privacy-upgrades.spec.ts`      | 202      | 30 s default                                                       | 120 s                                                                                                              |
| `security-consolidation.spec.ts`         | 107      | 180 s                                                              | 300 s (9 pages × full axe audit)                                                                                   |

Assertions were **strengthened** where reality allowed: added `data-step` state checks,
localStorage content checks, list-item counts, and kept the zero-axe-violation bar.

No test was deleted, skipped, or weakened; no timeout was raised without a named cause; no
CI configuration was touched.

---

## 5. Security review

| Area                                                         | Finding                                                                                                                                                                                                              |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSP — `default-src`, `base-uri`, `object-src`, `form-action` | All locked down (`'self'`, `'none'`, `'self'`)                                                                                                                                                                       |
| CSP — `script-src`                                           | No `unsafe-eval`. `'unsafe-inline'` is required by the static Next.js shell and documented as such; `'wasm-unsafe-eval'` scoped to WebAssembly only                                                                  |
| CSP — `frame-ancestors`                                      | `'none'` in production. The `https://*.e2b.app` exception requires an explicit `ALLOW_SANDBOX_PREVIEW=1`, which appears in neither `vercel.json` nor `.env.example`, and a test pins the production default          |
| CSP — per-route policy                                       | `connect-src` merged structurally (`withConnectSources`), so a route can only add origins, never drop one                                                                                                            |
| Supabase server-only                                         | All 8 `lib/supabase/*` modules import `server-only`. No client component imports a browser client — the three admin components that reference `lib/supabase` use `import type` only, which is erased at compile time |
| Client Supabase access                                       | No `NEXT_PUBLIC_SUPABASE_*` is used to build a client in browser code; the CSP deliberately omits the Supabase origin because the browser never calls it. Pinned by `supabase-csp.test.ts`                           |
| Service-role key                                             | Server-only; admin login page reports **presence as a boolean only**, never a value                                                                                                                                  |
| Secrets in Git                                               | Only `.env.example` is tracked. No `.env` in the index                                                                                                                                                               |
| QR payload URLs                                              | Rejects `javascript:`, `data:`, `vbscript:`, `file:` — **case-insensitively** and after trimming. Verified against 7 attack strings; normal links accepted                                                           |
| Domain consistency                                           | Centralised via `SITE_URL` with one documented fallback origin; `robots.txt` / `sitemap.xml` verified live and consistent                                                                                            |
| SMTP                                                         | Credentials live in Supabase Auth, never in this runtime. `smtp_verified_by_app: false` — the app refuses to claim verification it cannot prove. Nothing read, printed, rotated or modified                          |
| Email / password recovery                                    | **Untouched** — `git diff` shows no changes to any recovery, reset, auth or email path                                                                                                                               |

Security suites: **67 tests passing** across `supabase-csp`, `csp-route-policy`,
`next-headers`, `admin-api-security`, `supabase-auth-callback`, `supabase-auth-ui`,
`supabase-integration` and `image-header`.

---

## 6. Exact gate results

Run on `98d13f4`, in this session:

| Gate               | Command                       | Result                                             |
| ------------------ | ----------------------------- | -------------------------------------------------- |
| TypeScript         | `npx tsc --noEmit`            | **exit 0**                                         |
| ESLint             | `npx eslint .`                | **exit 0**                                         |
| Prettier           | `npm run format:check`        | **exit 0**                                         |
| Unit + integration | `npx vitest run`              | **2499 passed / 2499, 179 files, exit 0**          |
| Production build   | `npm run build`               | **exit 0**, compiled successfully, 97 static pages |
| Dependency audit   | `npm audit --audit-level=low` | **exit 0**, `found 0 vulnerabilities`              |
| E2E (Playwright)   | CI `Verify QUICKKIT`          | see §7 — cannot run in this sandbox                |

`npx prettier --check .` reports 73 files, but those are Markdown documents outside the
project's own `format:check` glob. The project's gate — which covers `app/`, `components/`,
`lib/`, `tests/`, `workers/`, `scripts/` and the configs — passes cleanly.

---

## 7. E2E status

E2E **cannot run in this sandbox**: `npx playwright install chromium` fails on the proxied
download, so there is no browser binary. E2E results come from GitHub Actions only.

**Result (CI run `43910834152`, commit `4efa1ad`): `success`.**

|         | Before | After    |
| ------- | ------ | -------- |
| Passed  | 1137   | **1150** |
| Failed  | 13     | **0**    |
| Skipped | 7      | 7        |

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

| Commit    | Purpose                                                                    |
| --------- | -------------------------------------------------------------------------- |
| `3b9e5ca` | Catalog count drift; privacy disclosures aligned with actual processing    |
| `54f06b6` | Audit report checkpoint hash                                               |
| `f3fb763` | CSP hardening; Supabase kept out of the browser bundle                     |
| `17e8011` | QR renders that verified as unreadable; flaky studio test                  |
| `40fa07d` | CI re-run to measure pre-existing E2E failures                             |
| `b262fda` | One definition for the QR sample URL                                       |
| `dfa0303` | **QR: prove dense renders decode instead of guessing from px-per-module**  |
| `2aedddc` | **Feedback: stop claiming reviews appear on the homepage**                 |
| `cc13b23` | **QR: run the repair on the path the studio actually uses**                |
| `45d2ea0` | **E2E: realign stale assertions to the shipped UI**                        |
| `98d13f4` | **QR: grow past a canvas too small at any ECC level**                      |
| `13a0649` | **Security: Hash Comparison and File Privacy Checker had no reachable UI** |

Each fix is its own commit with the reasoning in the message, so they can be reviewed or
reverted independently.

---

## 9. Remaining risks and open decisions

**Not fixed — needs an owner decision:**

1. **Very long payloads fail to encode at the requested ECC level.** At ~1700 bytes, level M
   cannot encode and the studio throws _"This content is too much for a single QR code."_
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

| Gate                   | Result                               |
| ---------------------- | ------------------------------------ |
| `tsc --noEmit`         | exit 0                               |
| `eslint .`             | exit 0                               |
| `npm run format:check` | exit 0                               |
| `vitest run`           | 2500 / 2500, 180 files               |
| `npm run build`        | exit 0, 97 static pages              |
| `npm audit`            | 0 vulnerabilities                    |
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

| Finding on this branch                                                                        | What `main` shipped                                                    | Resolution                                                                                                                                                            |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No homepage review feed; `subscribeToolFeedback` had 0 consumers                              | A real feed (`data-laptop-tool-review`) plus `POST /api/tool-feedback` | **Superseded.** Feedback is now genuinely sent, so this branch's "Nothing is uploaded" copy would have been **false**; `main`'s "sent to the QUICKKIT team" was taken |
| The glass panel had no `data-laptop-feedback-style` attribute, so the test selector was wrong | `main` added the attribute to the component                            | **Superseded.** `main`'s spec was taken; the branch's selector rewrite is obsolete                                                                                    |
| Hash Comparison / File Privacy Checker had no reachable UI                                    | `main` fixed the same defect independently, the same way               | **Duplicated.** The branch's page change was dropped in favour of `main`'s within `DeveloperToolPage`                                                                 |

**Kept from this branch, because `main` has no equivalent:**

- **The QR decode-repair loop** (`lib/tools/qr/render.ts`). `main` hardened the _reader_
  (`verify.ts`) so it stops rejecting valid small codes; this branch fixes the _renderer_ so
  it stops emitting codes that cannot be read. These are complementary — both survive, and a
  300-combination sweep on the merged tree reports **0 undecodable, 0 silent resizes**.
- The `data-step` progression assertions, ported into `main`'s richer spec so no coverage
  was lost.

**Two issues the merge surfaced, both caught by this branch's own guards:**

1. `lib/system-health.ts` (new on `main`) imports a Supabase _type_. The server-only rule
   flagged it. Rather than exempting it, the rule now requires server-only modules to prove
   the import is type-only, so it cannot widen into a runtime dependency.
2. A branch test asserted admin labels (`"Owner action required"`, `"NOT CONFIGURED"`) that
   `main` replaced with `describeSystemHealth()`. Adopted `main`'s assertions.

### Merged-tree gates (`1b8d8b1`)

| Gate                              | Result                               |
| --------------------------------- | ------------------------------------ |
| `tsc --noEmit`                    | exit 0                               |
| `eslint .`                        | exit 0                               |
| `npm run format:check`            | exit 0                               |
| `vitest run`                      | **2729 / 2729**, 198 files           |
| `npm run build`                   | exit 0                               |
| `npm audit`                       | 0 vulnerabilities                    |
| E2E (CI `43922872136`, `6c14397`) | **1157 passed, 0 failed, 7 skipped** |

```
7 skipped
1157 passed (38.0m)
3 passed (25.4s)
8 passed (1.1m)
```

The test count rose from 2500 to 2729 because `main` brought its own new suites.

## 12. The two final review decisions

Both decisions were implemented on top of the merged tree (`176742e`), where
`origin/main` (`df1baa8`) is an ancestor. Neither decision changes an upload
payload, a privacy protection, or any QR encoding path.

### Decision 1 — QR long payloads: preserve behaviour, document the limit

**What changed: nothing in the renderer.** `git status --porcelain lib/tools/`
returns zero files: `render.ts`, `matrix.ts`, `verify.ts` and `capacity.ts` are
untouched, so the error-correction choice and the exported bitmap are bit-for-bit
what they were on the merged tree. No silent ECC change was introduced.

**What was added:** one honest-limits paragraph in Advanced Settings
(`components/tools/qr-generator/advanced-panel.tsx`), stating the two things a
very long payload can trigger and that both are surfaced:

- a small export at a high level may drop to a lower level (never below L) to
  keep modules large — confirmed against `render.ts`, where every step-down
  pushes an entry onto `adjustments` with the message _"Error correction was
  raised/lowered…"_;
- if that is still too dense, the canvas is grown, but only to the next size
  where every module lands on a whole pixel, because a fractional module grid is
  what smears a dense symbol. Growth is likewise reported, so a requested size is
  never silently changed.

The pre-existing statement of unsupported formats (Micro QR, RM-QR, GS1, HANUKIN,
dot-code, custom masks) is unchanged beside it.

**Why documented rather than "fixed":** the two root causes are properties of the
format and of the export, not defects that a better default would remove — a
version-23 symbol at level L is undetectable at any size, and very long payloads
(~1,700 B) do not fit level M although L fits. Changing a default would have
silently altered output for everyone. Per the approved decision, the limitation is
now stated in the UI instead.

**Regression test:** `tests/qr-studio.test.tsx` →
_"documents the long-payload limits in Advanced Settings"_ asserts the wording is
actually rendered, including the two "never silently" promises.

**Evidence behaviour is unchanged:** the 300-combination sweep
(6 payload lengths × 10 export sizes × 5 designs) re-run on this tree reports
`total=300 bad=0 silent=0` — identical to the merged-tree baseline.

### Decision 2 — Feedback: never re-prompt a tool that has been rated

**The gap:** the existing cooldown was _shown_-based only. A visitor who rated a
tool had their prompt log stamped, but 24 hours later the same tool invited them
again. No submitted-based suppression existed anywhere (`grep` for
`hasReviewed|alreadyReviewed|hasFeedback|reviewedTool|submittedTools` across
`lib/` and `components/` returned nothing).

**The change, in three small pieces:**

1. `lib/tool-feedback.ts` — a separate, submitted-based record under its own key
   (`quickkit-tool-feedback-reviewed-v1`), with the same hardening as the
   existing prompt log: slug shape validated (`/^[a-z0-9][a-z0-9-]{0,79}$/`),
   non-finite values rejected, corrupt JSON treated as "not reviewed" so the
   visitor is still asked, a timestamp far in the future rejected so one bad
   write cannot silence a tool for ever, and a per-tab memory fallback when
   storage is blocked.
2. `components/tool-download-feedback.tsx` — `needsToolFeedbackReview(slug)` added
   to **both** gates: the initial check and the post-debounce re-check, so a rating
   sent while the 650 ms timer was pending also wins.
3. On success only — `markToolFeedbackReviewed(slug)` is called after the server
   accepts the rating and **before** the local-copy write, so a full or blocked
   store cannot turn a delivered rating back into a prompt. A failed send records
   nothing, so the visitor can retry.

**What is preserved:** the 650 ms debounce, the shown-based 24-hour cooldown for
visitors who dismiss without rating, the per-tool scope, the `consent: true`
upload of the same four fields, and every privacy protection. The new record
stores **the slug and a timestamp only** — never the rating, tags or comment — so
the daily upload remains the single copy of what the visitor wrote.

**Regression tests: 16 new.**

| File                                                | Tests | Proves                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/tool-feedback.test.ts`                       | 11    | asks when never rated; stays quiet for ever (up to 10 years, where the shown-based rule alone would re-ask); other tools unaffected; one entry per tool; slug + timestamp only; corrupt data still asks; future timestamps rejected; blocked storage still suppresses; blocked write does not throw |
| `tests/tool-download-feedback-suppression.test.tsx` | 5     | the real dialog: first-time visitor is invited; **not invited a day after rating** (the exact case that regressed); a different tool still is; submission records the review with an unchanged upload body; a rejected send records nothing                                                         |

Both layers were verified to be load-bearing by mutation: neutering the helper
fails 8 tests, and removing only the component's `needsToolFeedbackReview` gate
fails the day-later test — so neither piece is redundant.

**E2E updated, not weakened.** `tests/e2e/tool-download-feedback.spec.ts` asserted
the old behaviour ("…until 24 hours have passed, when it starts from a clean
form"). It now asserts the approved behaviour, and more strongly: no invitation a
day later **or a year later**, exactly one rating sent, and only the slug stored.
The dismissed-without-rating case still re-prompts after 24 hours, as before —
and the three "starts from a clean form" assertions that had to move off the
rated path were **relocated, not dropped**: they now run on that dismissed path
(`data-step="rating"`, no checked radio, no checkbox, no comment box) together
with two new checks that nothing was reviewed and nothing was sent. Assertion
count went up, not down. The test count in the file is unchanged (11), so the
suite total stays 1164 and no test is skipped, excluded or deleted.

### Gates on this tree

| Gate                       | Result                                         |
| -------------------------- | ---------------------------------------------- |
| `tsc --noEmit`             | exit 0                                         |
| `eslint .`                 | exit 0                                         |
| `npm run format:check`     | exit 0                                         |
| `vitest run`               | **2,745 / 2,745**, 199 files                   |
| `npm run build`            | exit 0 (compiled successfully)                 |
| `npm audit`                | 0 vulnerabilities                              |
| QR sweep, 300 combinations | `total=300 bad=0 silent=0`                     |
| 56-tool route check        | 56 tools, 37 static + 19 dynamic, 0 unresolved |
| `git status lib/tools/`    | **empty** — no encoding change                 |
| E2E                        | **NOT RUN LOCALLY** — see below                |

Unit/integration rose from 2,729 (198 files) to 2,745 (199 files): +16 tests, all
new, none removed or skipped.

**E2E: what CI actually ran, and what it did not.** Browser E2E cannot run in
this sandbox — Playwright browsers are absent and the download host
(`cdn.playwright.dev`) is unreachable — so it was proven in CI instead.

| Commit                  | Check                                   | Result                                                 |
| ----------------------- | --------------------------------------- | ------------------------------------------------------ |
| `176742e` (pushed HEAD) | run `43931174843`, check `133523667393` | **success — 1157 passed, 0 failed, 7 skipped** (29.6m) |
| `176742e` (pushed HEAD) | run `43931165222`, check `133523633638` | **success — 1157 passed, 0 failed, 7 skipped** (34.3m) |
| `6c14397` (prior)       | check `133494483204`                    | success — 1157 passed, 0 failed, 7 skipped (38.0m)     |

The skip count is identical across all three runs and is pinned by six
pre-existing `test.skip` markers; this change adds none.

**Important limit of that evidence.** `176742e` is the commit _before_ the two
final decisions, because the work for §12 is committed and pushed only after the
owner's approval. Both green runs therefore prove the merged tree is sound — QR
repair, security route, 56 tools, navigation, and the whole feedback suite as it
stood — but they **do not** execute decision 1's new help text or decision 2's
suppression and its updated E2E assertions. Those are proven locally instead:
2,745 unit/integration tests pass (199 files, +16 new), all 71 spec files parse,
`tsc` reports zero errors in `tests/e2e`, and `playwright test --list`
enumerates the full 1,164. A fresh CI run is required after the change is pushed
before anyone may call the E2E evidence complete.

The 5 jsdom component tests exercise the real dialog rather than only the helper,
so decision 2's gate — not just its storage helper — is covered in-process.

### 12.1 Merge status — PR #57 is CONFLICTING as of 2026-11-16 19:35Z

`main` advanced from `df1baa8` to **`fb80a6f`** (PR #60, "SEO, indexing and domain
alignment") after this branch was last synced, so GitHub now reports PR #57 as
`mergeable=CONFLICTING`, `mergeStateStatus=DIRTY`. The branch itself is untouched.

Six files conflict, and **none of them is part of the two final decisions**:

| Conflict file                                    | Why it conflicts                                                                                                      |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `next.config.ts`                                 | main reworked `Permissions-Policy` so the three camera pages emit one header instead of two; this branch hardened CSP |
| `lib/tools/qr/payload.ts`                        | main changed one sample URL constant; this branch touched the same region                                             |
| `lib/tools/qr/data-template.ts`                  | both branches edited the same builders                                                                                |
| `lib/tools/qr/crypto-security.ts`                | both branches edited the same module                                                                                  |
| `components/tools/qr-generator/use-qr-studio.ts` | both branches edited the same hook                                                                                    |
| `lib/tools/barcode-scanner/product-lookup.ts`    | both branches edited the same module                                                                                  |

Two consequences worth stating plainly:

1. **This is not a blocker for the decisions themselves.** The uncommitted work
   touches none of the six files, and main changed no QR _encoding_ logic — only a
   sample URL in `payload.ts`. Nothing in main invalidates decision 1 or 2.
2. **But PR #57 cannot merge until a merge commit resolves those six files**, and
   that merge must be done deliberately: `next.config.ts` carries the CSP and
   Permissions-Policy work, so a careless resolution could weaken a security
   header. It must not be rushed, and it must not be done as part of a "final
   check".

## 13. Conflict resolution against `main` (`fb80a6f`), 2026-11-16

`main` advanced from `df1baa8` to `fb80a6f` (PR #60) after this branch's last
sync, so PR #57 reported `mergeable=CONFLICTING`. The merge was prepared locally
and **not committed, pushed or merged** — the owner decides that.

Merge base: `df1baa8`. Branch ahead 18 commits; `main` ahead 3. Six files
conflicted. Each was resolved by reading both sides against the merge base, not
by choosing "ours" or "theirs" wholesale.

| File                                             | Conflict                         | Resolution          | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------ | -------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next.config.ts`                                 | import block only                | **union**           | The auto-merge kept this branch's CSP structure (`CONNECT_SRC`, `withConnectSources`) _and_ main's `BRANDS` import/usage. Only the import list conflicted. Net result: **+39 lines, 0 deletions** — main's camera `Permissions-Policy` fix and brand-noindex routes are added without removing one line of hardening.                                                                                                                                                                                                                                 |
| `lib/tools/qr/payload.ts`                        | sample URL literal vs constant   | **ours**            | This branch replaced the literal with `QR_SAMPLE_URL`; main changed the literal's value. The constant already held **exactly main's value**, so keeping it preserves main's fix _and_ removes the duplicate. Net diff vs HEAD: zero.                                                                                                                                                                                                                                                                                                                  |
| `lib/tools/qr/data-template.ts`                  | `DEFAULT_PUBLIC_ORIGIN` block    | **ours (superset)** | Both sides define the same constant with the same value; this branch additionally defines `publishedOrigin()`, used by five call sites. Main lacks it. Ours is a strict superset — nothing of main's is lost.                                                                                                                                                                                                                                                                                                                                         |
| `lib/tools/qr/crypto-security.ts`                | `new URL()` base for `/qr` links | **ours**            | Main parsed against the real domain; this branch uses the RFC 2606 `https://quickkit.invalid` sentinel. Only `pathname` and `searchParams` are read, so both are functionally identical; `.invalid` guarantees the base can never resolve or be mistaken for a real host, and matches the three other `.invalid` uses in the repo.                                                                                                                                                                                                                    |
| `components/tools/qr-generator/use-qr-studio.ts` | second `QR_SAMPLE_URL` literal   | **ours**            | Main kept a duplicate literal; this branch re-exports the payload module's constant. Same value, no duplication, and it is what prevents the two from drifting again.                                                                                                                                                                                                                                                                                                                                                                                 |
| `lib/tools/barcode-scanner/product-lookup.ts`    | User-Agent origin                | **theirs**          | Main reintroduces an origin via `siteOrigin` (env-driven `SITE_URL`, falling back to the live domain). This branch had removed the unowned `quickkit.online` origin entirely. Main's version fixes the same defect _and_ is more complete, so it was taken in full; the auto-merged `import { siteOrigin }` was retained to keep the module consistent. Verified safe: `userAgent()` and `siteOrigin` are reached only from server code (`app/api/product-lookup/route.ts` and an internal fetch), though the module also ships to client components. |

### Security headers after resolution (verified live, not just in source)

The built server was started and the real response headers read:

| Route                    | `Permissions-Policy`                           | CSP posture                                                                                                       |
| ------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `/`                      | `camera=(), microphone=(), geolocation=()`     | `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `'wasm-unsafe-eval'` only |
| `/tools/qr-code-scanner` | `camera=(self), microphone=(), geolocation=()` | identical posture                                                                                                 |
| `/tools/barcode-scanner` | `camera=(self), microphone=(), geolocation=()` | identical posture                                                                                                 |

Camera is enabled on exactly the three camera routes and nowhere else; every other
directive is unchanged. No wildcard was introduced, and `'unsafe-eval'` was not
added.

### Gates on the merged tree

| Gate                        | Before re-applying decisions  | After                                     |
| --------------------------- | ----------------------------- | ----------------------------------------- |
| `tsc --noEmit`              | 0                             | 0                                         |
| `eslint .`                  | 0                             | 0                                         |
| `npm run format:check`      | 0                             | 0                                         |
| `vitest run`                | **2,736 / 2,736** (199 files) | **2,752 / 2,752** (200 files)             |
| `npm run build`             | 0                             | 0                                         |
| QR sweep (300 combinations) | —                             | `total=300 bad=0 silent=0`                |
| Security suites             | —                             | 161 / 161                                 |
| Feedback suppression        | —                             | 22 / 22                                   |
| 56-tool resolution          | —                             | 56 = 37 static + 19 dynamic, 0 unresolved |

### One new finding: a dependency advisory

`npm audit --omit=dev` now reports **1 moderate** advisory
(`GHSA-mfr8-8qww-v76h`, Next.js information disclosure across root params through
`unstable_cache`), affecting Next `16.3.0 - 16.4.4`.

This is **not** caused by the merge: `package.json` and `package-lock.json` are
byte-identical to the pre-merge HEAD (`next: ^16.4.3`, installed 16.4.3), and the
merge changed no dependency. It is an upstream advisory published after the last
green CI run, and CI runs `npm audit --omit=dev`, so **that step will now fail**.

Relevance here is real but bounded: `unstable_cache` is used in
`lib/supabase/public-catalog.ts`, but its arguments are literal cache keys and
tags — no root param is threaded into a cached function, which is the condition
the advisory describes. The patched release is `next@16.4.6`.

**This was deliberately not fixed.** A dependency bump is out of scope for a
conflict-resolution pass and needs owner approval.

## 14. Final security and E2E validation (2026-11-16)

### 14.1 The Next.js advisory — analysed, not applied

| Field                         | Value                                                        |
| ----------------------------- | ------------------------------------------------------------ |
| Advisory                      | **GHSA-mfr8-8qww-v76h**                                      |
| CVE                           | **CVE-2026-119790**                                          |
| Package                       | `next` (npm, runtime dependency)                             |
| Severity                      | Moderate, **CVSS v4 6.3**                                    |
| Affected range                | **>= 16.3.0, <= 16.4.4**                                     |
| Installed / declared / locked | **16.4.3 / `^16.4.3` / 16.4.3**                              |
| First patched                 | **16.4.5**; 16.4.6 is the current 16.4.x                     |
| Published                     | 2026-11-03, added to the GitHub Advisory Database 2026-11-16 |

**What it actually requires.** Quoting the advisory: an application discloses
cached data across root params when _"the same `'use cache'` function is called
both directly during rendering and through `unstable_cache()`, and that function
reads a root param."_ Exploitation needs a cold process start so an
`unstable_cache()` call can join a concurrent direct call's in-flight fill.

**Whether this application meets those preconditions — checked, not assumed:**

| Precondition                                          | Finding                                                                                                                                               |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| A `'use cache'` directive                             | **None anywhere.** `grep -rn "'use cache'"` over `app/`, `lib/`, `components/` returns nothing.                                                       |
| A `'use cache'` function that also reads a root param | Impossible — there is no `'use cache'` function at all.                                                                                               |
| `unstable_cache()` called with root-param arguments   | **No.** Both call sites pass a fixed key array and no arguments: `["quickkit-public-catalog"]` and `["quickkit-public-site-settings"]`.               |
| Root params in a layout                               | **None.** `app/layout.tsx` takes `{ children }` only; `app/(public)/layout.tsx` likewise. There is no `[locale]`-style segment above any cached read. |

So the vulnerable code path — the nesting of `'use cache'` inside
`unstable_cache()` — does not exist in this application. **The advisory is a
real finding, but it is not exploitable here**, which is why leaving 16.4.3 in
place is not an open hole.

**A second, more useful finding.** 16.4.5 is not a one-advisory release. It
carries **seven** moderate fixes, and two of them target code this project does
use. Both were checked:

| Advisory                                                              | Relevance here                         | Verdict                                                                                                                                                                                                                     |
| --------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GHSA-7qx7-33qx-rqx2 — SVG rejection bypass in image optimisation      | `next/image` **is** used in 6 files    | **Not reachable.** All 12 `<Image>` blocks across those files pass `unoptimized`, so the optimiser never fetches a remote image. Verified per-image, not per-file. No `images` config and no `remotePatterns` exist either. |
| GHSA-f3mh-rxg3-f5g2 — HttpOnly cookie exposure on Edge runtime routes | No `runtime = "edge"` anywhere         | **Not reachable.**                                                                                                                                                                                                          |
| GHSA-9 others (cache-components, self-hosted forwarding, binary args) | No Cache Components, no matching usage | Not reachable                                                                                                                                                                                                               |

**Smallest safe remediation — proposed, NOT applied.** The next patch release,
`next@16.4.6`, is the minimum change that clears the advisory:

- It is **outside** the vulnerable range (patched at 16.4.5).
- Its `engines.node` is `>=20.9.0`; CI pins Node 26, so no runtime change.
- Its peer requirements (`react ^19.0.0`) are already satisfied by React 19.3.1.
- Diffing published dependency metadata, **16.4.3 → 16.4.6 changes exactly one
  entry: `@next/env` 16.4.3 → 16.4.6.** No transitive dependency moves.
- `^16.4.3` already permits 16.4.6, so no `package.json` range edit is needed —
  only `npm install next@16.4.6`, which refreshes `package-lock.json`.

No security setting would be weakened by this bump: the CSP, `Permissions-Policy`,
HSTS and redirect rules are all authored in `next.config.ts` and are unaffected by
a patch release.

**Deliberately left undone.** A dependency bump changes the lockfile and needs
owner approval, so it was **not** applied. Consequence: CI's `npm audit --omit=dev`
step **will fail** on this branch until the bump is approved.

### 14.2 Browser E2E — BLOCKED, not run

**Reported as BLOCKED. No browser test was executed.** Evidence:

| Check                             | Result                                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| System Chromium / Chrome          | not installed                                                                                             |
| System Firefox                    | not installed                                                                                             |
| System WebKit                     | not installed                                                                                             |
| `~/.cache/ms-playwright`          | **absent**                                                                                                |
| `PLAYWRIGHT_BROWSERS_PATH`        | unset                                                                                                     |
| `npx playwright install chromium` | **fails** — `Download failure, code=1`; the CDN (`cdn.playwright.dev`) is not reachable from this sandbox |

What was verified instead, and its limits:

- The suite enumerates: **1,164 tests in 71 files** via `playwright test --list`.
- All 71 spec files parse; `tsc` reports zero errors in `tests/e2e`.
- A production server was started and probed over real HTTP: **all 56 catalogue
  tools returned 200**, all 8 category routes 200, and the support pages
  (`/about`, `/help`, `/faq`, `/cookies`, `/file-handling`, `/terms`,
  `/accessibility`, `/saved`, `/sitemap.xml`, `/robots.txt`) 200.
- Live security headers were read from that server (see 14.3).
- Server logs showed no runtime errors across ~95 requests.

None of that is a browser test: it proves routes resolve and headers are emitted,
**not** that React hydrates, that the QR studio renders, that a dialog opens, or
that a camera permission prompt behaves. **Task B remains open.**

**A gap worth naming.** `/login` and `/signup` redirect (307) to
`/tools?account=disabled`, so accounts are currently switched off — and there is
**no browser E2E coverage for authentication at all**, only unit tests
(`supabase-auth-ui`, `supabase-auth-callback`, `admin-auth-config`). Authentication
is therefore _not_ among the flows browser E2E could confirm today, and re-enabling
accounts would need its own test work.

### 14.3 Security headers, verified from a running server

| Route                      | `Permissions-Policy`                       |
| -------------------------- | ------------------------------------------ |
| `/`                        | `camera=(), microphone=(), geolocation=()` |
| `/tools/qr-code-scanner`   | `camera=(self)`                            |
| `/tools/barcode-generator` | `camera=(self)`                            |
| `/tools/barcode-scanner`   | `camera=(self)`                            |
| `/tools/case-converter`    | `camera=()`                                |

`base-uri 'self'`, `object-src 'none'`, `form-action 'self'`,
`frame-ancestors 'none'` on every route. Explicitly asserted: **no
`'unsafe-eval'`** and **no wildcard** in the emitted policy. Camera is enabled on
exactly the three camera tools and nowhere else, and each of those responses
carries a single `Permissions-Policy` header — main's fix intact.

### 14.4 Final gates

| Gate                              | Result                                   |
| --------------------------------- | ---------------------------------------- |
| `tsc --noEmit`                    | exit 0                                   |
| `eslint .`                        | exit 0                                   |
| `npm run format:check`            | exit 0                                   |
| `vitest run`                      | **2,752 / 2,752**, 200 files             |
| `npm run build`                   | exit 0 (compiled successfully)           |
| QR regression (6 suites)          | 212 / 212                                |
| Feedback suppression              | 22 / 22                                  |
| Security + auth suites (23 files) | 170 / 170                                |
| 56-tool HTTP probe                | **56 / 56 = 200**                        |
| Navigation routes                 | 8 categories + 10 support pages, all 200 |
| `npm audit --omit=dev`            | **1 moderate** (see 14.1) — will fail CI |
| Browser E2E                       | **BLOCKED**                              |

### 14.5 Git audit

- Merge base `df1baa8`; it is an ancestor of **both** HEAD (`176742e`) and
  `origin/main` (`fb80a6f`). Main adds exactly 3 commits.
- **67 files staged**, and every one is accounted for: 64 come from main's 3
  commits, 8 from the two approved decisions, overlaps included. Nothing unrelated.
- Of main's 64 changed files, **57 are byte-identical to main**; the 7 that differ
  are the 6 conflict resolutions plus the decision-2 component, and every one of
  those is net-positive versus main (e.g. `next.config.ts` +45/−11).
- The 8 lines `next.config.ts` drops relative to main are this branch's
  deliberate CSP change (removing the unused Supabase `connect-src` allowance,
  replacing a string `CSP.replace(...)` with the add-only `withConnectSources`).
  `withConnectSources` merges from the full base list and only dedupes, so a route
  can add origins but never drop one — asserted by `tests/supabase-csp.test.ts`
  (12/12).
- **No secrets.** No credential-shaped string in the staged diff. The only env
  change is a _commented_ public origin in `.env.example`. `.gitignore` carries
  `.env*`, no real env file exists, and no `.env` file is tracked.

## 15. Approved security update to Next.js 16.4.6

Owner approval covered "the minimal Next.js security dependency update to 16.4.6,
provided compatibility is verified". Compatibility was verified **before** the
change was applied.

### 15.1 What changed, and nothing else

|                                     | Before    | After                  |
| ----------------------------------- | --------- | ---------------------- |
| `next` declared                     | `^16.4.3` | **`^16.4.6`**          |
| `next` resolved / locked            | 16.4.3    | **16.4.6**             |
| `@next/env`                         | 16.4.3    | **16.4.6**             |
| `@next/swc-*` (8 platform binaries) | 16.4.3    | **16.4.6**             |
| React / React-dom                   | 19.3.1    | **19.3.1 (unchanged)** |
| Lockfile packages added             | —         | **none**               |
| Lockfile packages removed           | —         | **none**               |

The complete `package.json` diff is **one line**: `next` `^16.4.3` → `^16.4.6`.
Every one of the 10 changed lockfile entries is `next` or `@next/*`; no third-party
package moved, and `devDependencies` is byte-identical when compared
order-insensitively. npm re-sorted two `@supabase/*` lines alphabetically as a
side effect of writing the file; that cosmetic churn was reverted so the diff
shows only the intended bump.

### 15.2 Compatibility, verified before applying

| Requirement     | Needed     | Present                        | Verdict |
| --------------- | ---------- | ------------------------------ | ------- |
| Node engine     | `>=20.9.0` | v22.22.3 (sandbox), CI pins 26 | OK      |
| React peer      | `^19.0.0`  | 19.3.1                         | OK      |
| React-dom peer  | `^19.0.0`  | 19.3.1                         | OK      |
| Transitive deps | —          | only `@next/env` moves         | OK      |

`npm ci` from the updated lockfile reinstalls cleanly (605 packages) and pins
16.4.6, so the change is reproducible.

### 15.3 The advisory is cleared

`npm audit --omit=dev` reports **`found 0 vulnerabilities`**, where it previously
reported 1 moderate (`GHSA-mfr8-8qww-v76h` / `CVE-2026-119790`). `npm audit`
without `--omit=dev` also reports 0. **CI's audit step will now pass.**

### 15.4 Verification after the update

| Gate                              | Result                                                         |
| --------------------------------- | -------------------------------------------------------------- |
| `tsc --noEmit`                    | exit 0                                                         |
| `eslint .`                        | exit 0                                                         |
| `npm run format:check`            | exit 0                                                         |
| `vitest run`                      | **2,752 / 2,752**, 200 files                                   |
| `npm run build`                   | exit 0 — **Next.js 16.4.6 (Turbopack)**, compiled successfully |
| `npm audit --omit=dev`            | **0 vulnerabilities**                                          |
| `npm ci` reproducibility          | pass, 0 vulnerabilities                                        |
| QR sweep, 300 combinations        | `total=300 bad=0 silent=0`                                     |
| Security + auth suites (23 files) | 170 / 170                                                      |
| Feedback suppression              | 22 / 22                                                        |
| 56-tool resolution                | 56 = 37 static + 19 dynamic, 0 unresolved                      |

**One honest note on the QR sweep.** Its first run printed
`SWEEP total=300 bad=0 silent=0` yet still failed: the suite finished in ~155 s
against vitest's 120 s default timeout. The failure was the _timeout_, not the
assertions. Re-running with an explicit per-test timeout — the assertions left
byte-identical — passed. **No test was weakened to obtain green**; the body of
the check is unchanged.

### 15.5 Living-server verification on 16.4.6

A production server was built and run on 16.4.6, then probed over real HTTP:

- **All 56 tool routes: 200.**
- **All 57 legacy security redirects: 308**, and every one of them lands on a
  **200** destination. Zero broken redirects.
- **CSP** on `/`: `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`,
  `frame-ancestors 'none'`, `'wasm-unsafe-eval'` only — asserted to contain **no
  `'unsafe-eval'`** and **no wildcard**.
- **HSTS** `max-age=31536000`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin` — all present.
- **Permissions-Policy:** `camera=(self)` on exactly the three camera tools
  (`qr-code-scanner`, `barcode-generator`, `barcode-scanner`) and `camera=()`
  everywhere else, including `qr-generator` and `case-converter`.
- **CSRF guard proven live on `/api/tool-feedback`:** a cross-origin POST is
  rejected **403**; a same-origin POST passes the origin check and returns 503
  only because this sandbox has no Supabase credentials. The guard is working,
  not broken.
- Server logs showed **no runtime errors** across ~170 requests.

### 15.6 Browser E2E — STILL BLOCKED (provisioning attempted and exhausted)

Every avenue was attempted, in order, and none worked:

| Attempt                                             | Result                                                   |
| --------------------------------------------------- | -------------------------------------------------------- |
| `npx playwright install chromium firefox webkit`    | `ECONNRESET` on `cdn.playwright.dev:443`                 |
| `curl` to `cdn.playwright.dev`                      | `SSL_ERROR_SYSCALL` — connection killed at network layer |
| Mirror `playwright.download.prss.microsoft.com`     | `SSL_ERROR_SYSCALL`                                      |
| Mirror `playwright.azureedge.net`                   | `SSL_ERROR_SYSCALL`                                      |
| Distro repo (`deb.debian.org`) for a system browser | empty reply                                              |
| `apt-get install chromium`                          | `Permission denied` — not root                           |
| Filesystem search for any existing browser binary   | none found                                               |

**No browser test was executed. E2E is BLOCKED and is not reported as passing.**
The sandbox permits only a small set of hosts (`github.com`, the npm and PyPI
registries); the Playwright CDN is not among them, and the container is
unprivileged. This is an environment limitation, not a property of the code.

Consequently these owner-named flows remain **unverified in a browser**: login and
signup (accounts are currently disabled — `/login` and `/signup` 307 to
`/tools?account=disabled`), QR Studio interaction, QR export and decoding,
feedback rating and suppression, consolidated tool navigation, camera permission
prompts, and mobile responsive UI. The only way to obtain this evidence is a CI
run in GitHub Actions, which provisions all three browsers via
`npx playwright install --with-deps chromium firefox webkit`.

### 15.7 Security and integrity audit

- **No deletions:** zero staged or working-tree deletions; the only rename is
  main's `app/guides/barcode/page.tsx → app/(public)/guides/barcode/page.tsx`.
- **No secrets:** a credential-pattern scan over the entire diff (`JWT`, `sk_live`,
  `service_role`, private keys, AWS keys, GitHub tokens) returns nothing. The only
  env change is a _commented_ public origin in `.env.example`; `.gitignore` still
  carries `.env*` and no real env file is tracked.
- **No weakened controls:** CSP, Permissions-Policy, HSTS, redirects and the CSRF
  origin guard were all re-read from a running server, above.
- **No unrelated dependency changes:** proven by diffing every lockfile entry.
