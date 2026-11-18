# QUICKKIT — Global Navigation, Loading Experience & Gooey Menu Upgrade

**Branch:** `arena/76c44b7b-quickkit` (from `6d0305e`)
**Status:** implemented and verified locally. **Not committed, not pushed, not merged, not deployed.**
**Owner approval pending.**

---

## 1. Root causes found

### 1.1 The navigation symptom was a stylesheet bug, not a router bug

**Symptom:** clicking an internal link showed the page being _left_ glide to the
top before the destination appeared.

**Cause, traced to source:** `app/globals.css` set `html { scroll-behavior: smooth }`.
Next.js resets the document scroll on every client navigation with a bare
assignment (`node_modules/next/dist/client/components/layout-router.js:168`):

```js
htmlElement.scrollTop = 0;
```

Per CSSOM, a direct `scrollTop` assignment **does** honour the scroller's
`scroll-behavior`. So the global `smooth` animated Next's own scroll reset — the
animation was applied to the outgoing page by our own CSS.

**This also explains the related complaints:**

- "no unwanted route-transition animation" — verified there is **no**
  `app/template.tsx` and no `@view-transition`; there was never a transition
  animation, only this scroll animation.
- "open at scroll position 0 instantly" — the reset was already correct, it was
  the _animation_ that made it visible.
- back/forward restore — unaffected once the default is `auto`.

**Fix:** default is now `auto`. Deliberate in-page anchors opt back in through a
new `data-smooth-scroll` attribute set by `components/smooth-anchor.tsx`, and
`prefers-reduced-motion` overrides the opt-in with `!important`.

### 1.2 Searching could spin forever

`lib/use-tool-search.ts` inferred "still loading" from `filter === null` and had
no `.catch`. A failed chunk download therefore looked identical to a slow one,
and the UI said "Searching…" permanently. Now the rejection is handled and
surfaced as a real error state with a reload instruction.

### 1.3 There were no loading boundaries at all

`find app -name loading.tsx` returned **zero** files. Every route rendered
nothing while its server work resolved.

### 1.4 There was no offline support at all

No service worker, no manifest, no offline page, no registration. `proxy.ts` is
Supabase auth middleware, not a worker. The audit precedes any implementation,
as requested.

### 1.5 Upload/progress was already strong — and was left alone

Every file tool (`compress-pdf`, `merge-pdf`, `pdf-lock-unlock`, `image-to-text`,
`split-pdf`, …) already reports real, worker-derived progress with
`role="status"` / `role="alert"` and cancel/retry. Rather than rewrite working
code, this change **adds a shared primitive** (`components/upload-progress.tsx`)
so any future surface has an honest, accessible default. Only one thing was
missing and is now explicit: **no percentage is ever rendered without a real
measurement.**

---

## 2. Files changed

**Modified (7)**

| File                                | Change                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `app/globals.css`                   | scroll-behavior root fix + reduced-motion override; skeleton, search-status, gooey-nav, offline-banner, upload-progress styles |
| `components/header.tsx`             | desktop nav id → `desktop-navigation`; mounts `GooeyNav`; trigger ref                                                          |
| `components/hero-search.tsx`        | `useDeferredValue` pending state; shared `SearchStatus`                                                                        |
| `components/hero-screen-search.tsx` | genuine loading/error states from the on-demand catalogue                                                                      |
| `components/tool-explorer.tsx`      | deferred pending state; shared `SearchStatus`                                                                                  |
| `lib/use-tool-search.ts`            | exposes `status`; handles rejection                                                                                            |
| `app/(public)/layout.tsx`           | mounts `SmoothAnchor` and `OfflineIndicator`                                                                                   |

**Added (20)**

| File                                          | Purpose                              |
| --------------------------------------------- | ------------------------------------ |
| `components/skeletons/index.tsx`              | shared skeleton primitives           |
| `app/(public)/loading.tsx`                    | fallback: home, legal, help, account |
| `app/(public)/tools/loading.tsx`              | explorer / search results            |
| `app/(public)/tools/[calculator]/loading.tsx` | all 42 tool pages                    |
| `app/(public)/category/[slug]/loading.tsx`    | category pages                       |
| `app/(public)/guides/loading.tsx`             | long-form guides                     |
| `app/admin/(protected)/loading.tsx`           | dashboard + admin data pages         |
| `components/smooth-anchor.tsx`                | in-page anchor opt-in                |
| `components/gooey-nav.tsx`                    | gooey mobile menu                    |
| `components/search-status.tsx`                | honest search states                 |
| `components/upload-progress.tsx`              | honest progress primitive            |
| `components/offline-indicator.tsx`            | banner + SW registration             |
| `public/sw.js`                                | service worker (allowlist)           |
| `app/offline/page.tsx`                        | offline fallback page                |
| `app/manifest.ts`                             | web manifest                         |
| `tests/navigation-scroll.test.ts`             | 8 tests                              |
| `tests/skeletons.test.ts`                     | 15 tests                             |
| `tests/gooey-nav.test.tsx`                    | 13 tests                             |
| `tests/search-status.test.tsx`                | 10 tests                             |
| `tests/upload-progress.test.tsx`              | 10 tests                             |
| `tests/offline-support.test.ts`               | 16 tests                             |

**Deletions: 0.** No dependency added. No package.json change.

---

## 3. Features implemented

**Global navigation.** Instant scroll reset on every route change; smooth kept
for deliberate in-page anchors only; back/forward untouched; reduced motion wins.

**Skeletons.** Six boundaries built from one set of primitives, each shaped like
its real page. Shimmer animates only `background-position` (compositor, no
reflow). Heights match the real blocks so the swap costs no CLS. Reduced motion
gets still placeholders.

**Uploading/progress.** Shared primitive with determinate (real %) and
indeterminate (no number) modes, plus success / failure / cancelled / retry
states and full ARIA. Existing tool progress untouched and unweakened.

**Searching.** Real pending state via `useDeferredValue`; genuine loading, empty,
success and error states; the catalogue chunk now fails visibly instead of
spinning; animations unmount when work completes.

**Gooey menu.** Clip-path morph, staggered rows, blurred liquid underlay.
Keyboard: focus moves in on open, Tab/Shift+Tab wrap inside the panel, Escape
closes the sub-list then the panel and restores focus to the trigger.
`aria-expanded` / `aria-controls` maintained. All destinations come from
`navCategories` — nothing dropped or re-pointed. Reduced motion removes the
morph entirely.

**Offline.** Service worker with an explicit allowlist. Network-first
navigations for the 12 approved public pages; cache-first only for immutable
`/_next/static/`. **Never cached:** `/api/*`, `/admin*`, `/auth/*`, cross-origin
(Supabase, AdSense), non-GET, `no-store`/`private`, opaque responses.
Version-based invalidation on activate, plus a manual "Clear saved pages".

---

## 4. Tests

**Unit/component: 2846 passed / 2846 (207 files).** Was 2774 before this work;
**72 new tests added, 0 existing tests modified or weakened.**

| Suite                  | Result                   |
| ---------------------- | ------------------------ |
| Full Vitest            | **2846 / 2846**          |
| TSC (`--noEmit`)       | **0 errors**             |
| ESLint                 | **0 errors, 0 warnings** |
| Prettier `--check`     | **pass**                 |
| Production build       | **pass** (160 routes)    |
| `npm audit --omit=dev` | **0 vulnerabilities**    |

**Live production server checks (`next start`, Next 16.4.6):**

| Check                                                                           | Result                                                                                                                           |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Key routes (`/`, `/tools`, `/about`, `/privacy`, `/offline`, `/guides/barcode`) | **200**                                                                                                                          |
| `/manifest.webmanifest`, `/sw.js`, `/icon.svg`                                  | **200**, correct content types                                                                                                   |
| 37 tool routes + 10 `[calculator]` tools                                        | **all 200**                                                                                                                      |
| Legacy redirects                                                                | **56 / 56 → 308**                                                                                                                |
| CSRF (cross-origin POST / no-Origin POST)                                       | **403 / 403** — unchanged                                                                                                        |
| Security headers                                                                | CSP, HSTS, nosniff, referrer — all present                                                                                       |
| CSP integrity                                                                   | `object-src 'none'`, `frame-ancestors 'none'`, **no `'unsafe-eval'`**                                                            |
| Shipped CSS                                                                     | `html{scroll-behavior:auto}`, `html[data-smooth-scroll]{…smooth}`, `auto!important` under reduced motion **exactly as intended** |
| Navigation markup                                                               | **1** nav landmark, **no duplicate ids**                                                                                         |
| Server log                                                                      | clean, no errors                                                                                                                 |

**Browser E2E: NOT RUN — BLOCKED.** `npx playwright install chromium` fails in
this sandbox (`Download failure, code=1`); no browser binary is obtainable, as
established previously. **1164 E2E tests enumerate successfully**, and the
existing mobile-navigation and scroll assertions were checked by reading them,
but I have not executed them. CI is the only source of browser evidence, and I
have not claimed otherwise.

---

## 5. Remaining limitations

1. **The homepage uses the generic `(public)` fallback skeleton**, not a bespoke
   one. A per-segment `loading.tsx` requires moving `app/(public)/page.tsx` into
   its own directory, and three source audits read that exact path
   (`google-verification`, `ad-placements`, `catalog-counts`). Breaking those to
   gain a slightly better homepage skeleton was not a good trade. It still
   avoids CLS; it is simply less specific than the tool and category skeletons.
2. **No skeleton for `/saved`, `/login`, `/signup`, `/account`** beyond the
   generic fallback — they render no server data worth a bespoke shape.
3. **Offline covers 12 public pages**, not the whole site. A page never visited
   shows `/offline`. This is stated in the banner rather than glossed over.
4. **The service worker is untested in a real browser.** Its allowlist logic is
   unit-tested against 20+ paths, but registration, cache population and the
   offline fallback have not been exercised in Chromium here.
5. **Tool workspaces are not cached as pages.** Their code is fully local, but
   serving a stale page could pair an old UI with a new worker.
6. **`UploadProgress` is available but not yet adopted by the individual tools.**
   They already had their own progress UI; rewiring 20+ working tools was out of
   scope and riskier than the benefit.

## 6. Browser-specific issues

- **None observed**, because no browser was available to test in. Two facts are
  worth recording for the CI run:
  - `clip-path` morph uses `inset(... round ...)`; supported in all current
    Chromium, Firefox and Safari. Safari needs no prefix at these versions.
  - `color-mix()` is used once, for the success border colour only, and only
    affects appearance — no layout or function depends on it.
- The scroll fix relies on `scrollTop` honouring `scroll-behavior`, which is
  specified behaviour and consistent across engines; the previous bug was
  precisely that consistency.

---

## Not done, by instruction

Not committed. Not pushed. Not merged. Not deployed. No SMTP, credential,
Production-setting or dependency change.

---

## 7. Final pre-commit review (2026-11-17)

### 7.1 One real defect found and fixed during review

The diff review caught a bug I had introduced. In `components/hero-search.tsx` the
filter gated on `searching` (derived from the **live** query) while filtering by
`search` (derived from the **deferred** value). Between the two, the deferred
value is still `""`, and `String.includes("")` is true for every string — so the
panel would briefly offer the entire catalogue as "matches" before narrowing.

Fixed by gating on the deferred term itself, so the list is empty rather than
wrong during that window. `tests/hero-search-deferred.test.tsx` (3 tests) locks
it down. This is exactly the class of regression a diff review is for.

### 7.2 Review results

| Check                                                                                  | Result                                                                |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Modified files                                                                         | **7**, all intended, all reviewed as diffs                            |
| New files                                                                              | **23** (21 code/test + report + 1 regression test)                    |
| Deletions                                                                              | **0**                                                                 |
| Existing tests modified                                                                | **0** — 75 added, none touched                                        |
| New dependencies                                                                       | **0** — imports are only `react`, `next`, `lucide-react`              |
| `package.json` / lockfile / `next.config` / CI config                                  | **untouched**                                                         |
| `as any` / `@ts-ignore` / `eslint-disable` added                                       | **none**                                                              |
| `eval` / `innerHTML` / `dangerouslySetInnerHTML` added                                 | **none**                                                              |
| CSP / `frame-ancestors` weakened                                                       | **no** (verified in the built manifest)                               |
| `NEXT_PUBLIC_` additions                                                               | **none**                                                              |
| Secret scan (keys, JWTs, `service_role`, `sk_live`, `ghp_`, PEM, emails, base64 blobs) | **clean**                                                             |
| `.env`, credentials, `.pem`, `.key` files touched                                      | **none**                                                              |
| Service-worker allowlist, executed                                                     | **20/20 cases correct** — no API, admin, auth or cross-origin caching |

### 7.3 Browser E2E — BLOCKED, not run

Every provisioning route was attempted and exhausted in this environment:

| Route                                    | Result                                       |
| ---------------------------------------- | -------------------------------------------- |
| `npx playwright install chromium`        | `Download failure, code=1`                   |
| `cdn.playwright.dev`                     | unreachable                                  |
| `playwright.download.prss.microsoft.com` | unreachable                                  |
| `@puppeteer/browsers` → Chrome           | `ECONNRESET` to `googlechromelabs.github.io` |
| Installed browser binaries               | none                                         |
| `apt-get`                                | not root (uid 1001)                          |

**1164 E2E tests enumerate successfully** (71 files) and run in CI. No browser
evidence is claimed locally.

### 7.4 Branch and remote

- Branch `arena/76c44b7b-quickkit`, **created** on origin by this push.
- Commit **`cc3a7d2859447e4a62d319cff4921271ff52a85f`**.
- PR **#67**, state **OPEN**, **not merged**, no deploy.

### 7.5 PR is CONFLICTING against current `main` — intentionally not resolved

While this work was in progress `main` advanced from `6d0305e` to `33ea9c4`
(46 files, +3072/−699). Five files overlap mine, and `main` rewrote them
substantially (`app/globals.css` +968, `components/hero-search.tsx` +211,
`components/tool-explorer.tsx` +298, `components/header.tsx` +48,
`app/(public)/layout.tsx` +33). `main` also added its own
`lib/use-recent-searches.ts` and a rewritten `hero-search.tsx` that no longer
contains the code my deferred-query fix applies to.

A scratch-worktree trial merge produced **three genuine content conflicts**:

```
CONFLICT (content): app/globals.css
CONFLICT (content): components/hero-search.tsx
CONFLICT (content): components/tool-explorer.tsx
```

They were **not** resolved. Resolving them means re-implementing the search
status and deferred-filter changes on top of `main`'s new recent-searches
design, and re-deciding the `globals.css` conflict against `main`'s rewritten
stylesheet — both are design decisions for the owner, and silently resolving
unrelated conflicts is explicitly out of bounds.

`main` has **no** skeletons, gooey menu, offline support or service worker
(verified: zero matching files), so nothing in this PR is duplicated work.

**Recommended next step:** rebase this branch onto `origin/main` and resolve the
three conflicts deliberately, then re-run the full gate suite and CI.

---

## 8. Refinement round — the skeleton bug, the search contract, and CI green (2026-11-17)

### 8.1 The skeleton-over-content bug: cause and fix

**Symptom.** Placeholders and real homepage content appearing together.

**Cause, verified against the build and a running server.** Every public route in
this app is **statically rendered** — the build marks them all `○`; only
`/admin/*` and the API are `ƒ`. A `loading.tsx` on a static route cannot help,
because there is nothing to wait for. What it actually does is make Next open a
Suspense boundary around a page whose HTML is already complete, and stream a
skeleton into the same response:

```
<div class="container skeleton-page" aria-busy="true" aria-live="polite">
  <span class="sr-only" role="status">Loading this page…</span>
  ...30 skeleton blocks...
```

Measured before the fix: `/` → 2 `skeleton-page` roots, `/tools` → 6. The
skeleton's `role="status"` was also a **second live region**, which made
`getByRole("status")` ambiguous — the root cause of most of the nine browser
failures.

**Fix.** Removed the boundaries from every static route and kept the one that
earns its place:

| Route                                                    | Mode        | Boundary    |
| -------------------------------------------------------- | ----------- | ----------- |
| `/`, `/tools`, tools, categories, guides, legal, account | `○` static  | **removed** |
| `/admin/*`                                               | `ƒ` dynamic | **kept**    |

`SkeletonPage` now exposes exactly one live region and no longer puts
`aria-live` on the container as well. `tests/skeletons.test.ts` asserts the
absence of the static boundaries, so they cannot return by accident.

**After the fix, measured on a running production server:**

| Route                                    | skeleton roots | live regions         |
| ---------------------------------------- | -------------- | -------------------- |
| `/`                                      | **0**          | 0                    |
| `/tools`                                 | **0**          | 1 (its result count) |
| `/about`, `/privacy`                     | **0**          | 0                    |
| `/tools/merge-pdf`                       | **0**          | 0                    |
| `/category/pdf-tools`, `/guides/barcode` | **0**          | 0                    |

Content renders exactly once (`<h1>` count on `/` is 1; the second
`hero-headline` match is the RSC payload, not markup).

### 8.2 The search announcement contract

`SearchStatus` had been changed to announce "1 tool found", breaking three
browser tests that assert "1 tools found". Restored exactly, pinned by a unit
test, and an `announce` prop suppresses a duplicate live region where the page
already owns one. Empty announcements are no longer rendered at all.

### 8.3 Merge with main

`main` had advanced 46 files to `33ea9c4`, rewriting five of the same files.
Three real conflicts (`globals.css`, `hero-search.tsx`, `tool-explorer.tsx`)
were resolved **semantically**, keeping both sides:

- **CSS**: both additive blocks kept (my skeleton/progress rules + main's
  command palette and recent-chip styles).
- **Search**: `main`'s `rankTools` ranking, ARIA combobox with
  `aria-activedescendant`, recent-search seeds and sort controls are all
  preserved. The deferred query was re-applied **on top of** `rankTools` rather
  than reverting main's design.
- **Header**: aligned to `main`'s slug-based `emptyCategorySlugs`, so the gooey
  menu and the desktop menu agree on `nofollow`.

No main work was discarded. Backup branch: `backup/76c44b7b-pre-rebase`.

### 8.4 Homepage recent history

The `RecentToolsSection` was removed from the homepage as requested. The
component file and `main`'s tests for it were left untouched — only the homepage
usage and its import were removed, so nothing was weakened.

### 8.5 Gooey menu

Upgraded from a two-stop clip to a **three-stop liquid morph** (droplet under
the trigger → stretched film → settled panel) with rows that rise, overshoot and
settle on a stagger. Still compositor-only, still fully neutralised under
`prefers-reduced-motion`, and the menu is **state-driven** — it renders on the
`open` flag with no `animationend` listener, so it is equally usable with
animation disabled.

### 8.6 Final verification

| Check                    | Result                                              |
| ------------------------ | --------------------------------------------------- |
| TypeScript               | **0 errors**                                        |
| ESLint                   | **0 errors, 0 warnings**                            |
| Prettier                 | **pass**                                            |
| Unit / integration       | **2863 / 2863** (209 files)                         |
| Production build         | **pass** (160 routes)                               |
| `npm audit --omit=dev`   | **0 vulnerabilities**                               |
| **CI browser E2E**       | **PASS — 1157 passed, 0 failed, 7 skipped** (37.7m) |
| Previously failing tests | **all 9 now pass**                                  |

One WebKit test (`pdf-compressor.spec.ts:398`) was reported **flaky** — it
passed on retry, and this branch never touched the compressor. Recorded honestly
rather than omitted.

PR #67 is now **MERGEABLE** (was CONFLICTING). **Not merged. Not deployed.**
