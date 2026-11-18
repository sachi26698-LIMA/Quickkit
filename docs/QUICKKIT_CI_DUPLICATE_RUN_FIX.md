# QUICKKIT — duplicate CI runs and the WebKit mobile-cancel failure

**Status:** workflow fix applied. The failing E2E test was **not** modified and is
**not** claimed to be resolved. Read §4 before assuming CI is now reliably green.

---

## 1. What was observed

Commit `27066e1` (PR #66 head) produced **two** `Verify QUICKKIT` runs seconds
apart, on the same commit:

| Run | Event | Result | Duration |
|---|---|---|---|
| `44245293316` | `pull_request` | **success** | 46m56s |
| `44245285678` | `push` | **failure** | ~43m |

The failure was one E2E test out of 1,157:

```
[webkit] pdf-compressor.spec.ts:398 › cancels a large batch and leaves
unfinished PDFs ready to retry (mobile pointer)
Test timeout of 120000ms exceeded.
  - waiting for locator('.pdf-mobile-action .primary')
```

All other gates in **both** runs passed: `format:check`, `lint`, `npm test`
(2,849/2,849), `build`, `typecheck`, `npm audit`, and 1,156 of 1,157 E2E tests.

## 2. Root cause of the duplicate runs

`.github/workflows/ci.yml` declared:

```yaml
on:
  push:
  pull_request:
```

A bare `push:` matches **every branch**. So every push to a PR branch started
the full 35-minute workflow, and the `pull_request` event started it again for
the same commit. This is confirmed by the run history — every PR head shows a
`push`/`pull_request` pair within seconds of each other:

```
44246593570 push          d06bc03
44246599052 pull_request  d06bc03
44245285678 push          27066e1
44245293316 pull_request  27066e1
44240879976 push          2f17a21
44240882384 pull_request  2f17a21
```

## 3. Why this made the PR unhealthy

GitHub records a check run per workflow run, and a single failed check run marks
the **commit status** `failure`. With two runs per commit there were two `verify`
check runs of the same name — one green, one red — and the PR's
`mergeStateStatus` became `UNSTABLE` even though the `pull_request` run on the
identical commit had passed.

### The fix

```yaml
on:
  push:
    branches: [main]   # post-merge gate, runs once per merged commit
  pull_request:        # pre-merge gate, unchanged
```

Neither trigger is removed. Post-merge validation on `main` is preserved, and
every PR head is still verified before merge. What disappears is the **redundant
second copy** of an identical 35-minute job.

## 4. What this fix does NOT do — the E2E failure is still unexplained

**I could not determine why the test timed out, and I am not calling it a flake.**

Facts that argue against "harmless flake":

- `playwright.config.ts` sets `retries: 1` in CI, so the test **failed twice**
  (initial attempt and one retry) before the run was marked failed.
- The same test passed in the `pull_request` run of the identical commit.
- It also failed on `2f17a21` (PR #67's head) in that commit's `push` run while
  its `pull_request` run passed — so the same test has now failed at least twice
  across two unrelated branches.

Facts that argue against "regression caused by PR #66":

- `tests/e2e/pdf-compressor.spec.ts` and `components/tools/compress-pdf.tsx`
  are **absent** from the entire Phase 1–5 diff (`7e74335..27066e1`).
- The spec file is **byte-identical** to `main`'s copy.
- The unit suite, the build and 1,156 other E2E tests pass.

### What the test does, and where the 120s can go

The test loads 12 large PDFs, enables target-size mode, starts compression, then
asserts the sticky mobile action bar (`.pdf-mobile-action .primary`) is visible
and reads "Cancel". It waits for the `.primary` button **inside the sticky bar** —
not for the bar itself.

Before that wait it does `setInputFiles` with 12 files and then:

```ts
await expect(
  page.getByRole("button", { name: "Compress 12 PDFs" }),
).toBeEnabled({ timeout: 60_000 });
```

So the 120s test budget is already shared with real PDF parsing for 12 files,
plus a 60s readiness wait. On a slower WebKit run, the remaining budget for the
cancel-bar assertion can be exhausted. That is a **plausible mechanism, not a
proven one** — I could not reproduce it.

## 5. Why I could not reproduce it locally

The sandbox cannot run the E2E suite against WebKit:

- `npx playwright install webkit` fails — the browser download host is not
  reachable from this environment (`Download failure, code=1`).
- `npx playwright install --with-deps webkit` also fails, because the container's
  package manager has no candidates for `fonts-liberation`, `xfonts-scalable`,
  `fonts-ipafont-gothic`, `fonts-wqy-zenhei`, `fonts-tlwg-loma-otf`.
- The CI failure logs and the `browser-failure-traces` artifact are both served
  from `*.blob.core.windows.net`, which this environment cannot reach (`EOF`).

**Therefore: no local reproduction, no trace inspection, no proof of cause.**
Anyone claiming this test is fixed would be guessing.

## 6. Recommended follow-up (owner decision)

The honest options, in order of preference:

1. **Raise only the readiness budget, not the assertion.** The 60s
   `toBeEnabled` wait for "Compress 12 PDFs" competes with the 120s test budget.
   Moving readiness into `test.setTimeout` headroom (or reducing fixture size)
   addresses the plausible mechanism without touching what the test asserts.
2. **Split the assertion.** Verify the sticky bar renders and flips to "Cancel"
   in a test that does not also parse 12 PDFs, and keep the end-to-end
   cancellation behaviour in the heavier test.
3. **Do nothing and observe.** With duplicate runs gone, the test now runs once
   per commit. If it still fails intermittently, the cause is in the test or the
   WebKit build, and option 1 becomes necessary.

I did not implement any of these: they change a test, and the task forbade
weakening tests. Option 1 does not weaken an assertion (it only changes timing
headroom), but it is still the owner's call.
