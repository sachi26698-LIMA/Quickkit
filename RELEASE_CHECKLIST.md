# QUICKKIT — final pre-launch release checklist

**Review date:** 31 October 2026
**Status:** technical preview verified; code pushed to the owner-selected GitHub repository; public website launch NOT approved; no deployment performed.
**Current branch:** `fix/launch-audit` (branched from `feat/premium-mvp`; original `main` and history preserved).

## 1. Dependency review — completed investigation, explicit residual decision

- [x] Identify all 16 original moderate npm entries and exact dependency chains.
- [x] Verify they propagate one advisory: GHSA-g3hv-75wg-m249, not sixteen independent vulnerabilities.
- [x] Safely upgrade only the parser’s minimatch 10.2.6 → 11.0.3. Preserve legacy callable v3 consumers. Test the real parser path and 80 pre-upgrade matching cases.
- [x] Preserve raw reports, full original graph, resulting chains and applicability analysis in `docs/security/`.
- [x] No forced downgrades, global API-breaking override, removed lint checks or advisory suppression.
- [ ] **Security/owner decision:** full npm audit still has **15 moderate development-only entries** on minimatch 3.1.5 ancestry. Source review finds the described v7+ optimizer absent in v3; npm’s broad version range still flags it. Review and explicitly accept that documented assessment, or wait for a compatible maintained/upstream fix. Do NOT describe the full audit as clean.
- [ ] Re-run full `npm audit` and `npm audit --omit=dev` immediately before release. Investigate any new finding separately. Current production audit: zero findings.

Full evidence and per-entry table: [`docs/security/DEPENDENCY_REVIEW.md`](docs/security/DEPENDENCY_REVIEW.md).

## 2. Technical quality — verified locally

- [x] Node 22.23.4 clean install, formatting, lint, strict type-check, 70 unit/component/config/compatibility tests and production build.
- [x] Original browser coverage preserved and expanded: **123 passed; 2 explicit capability skips**. Extra real clipboard-readback test is Chromium-only; other browser core/file workflows still run.
- [x] Six real routes and working discovery, clear/reset, copy feedback/fallback, file processing and downloads.
- [x] QR PNG downloaded and independently decoded; image WebP/JPEG/PNG downloaded, type/dimensions/pixels checked.
- [x] JPEG/PNG/WebP input header bounds, corrupt/empty/oversized input errors, async reset cancellation and object-URL cleanup tested in Chromium/Firefox/WebKit.
- [x] Automated accessibility scans on ten pages, keyboard skip/menu handling, focus, reduced motion and 320–1440px overflow checks.
- [x] Fixed stale Word Counter copy feedback, JSON finite-number overflow, oversized-image pre-decode allocation risk and small mobile form fonts.
- [ ] Owner/manual acceptance: screen-reader checks (e.g. VoiceOver/NVDA), real iOS/Android touch/download tests, actual Edge and Safari device pass. WebKit automation is not a physical Safari certification.
- [ ] After selecting a production host/domain, repeat performance and functional checks on its actual HTTPS preview/production URLs. Prior local Lighthouse scores are not guaranteed deployment results.

Evidence: `docs/FINAL_QUALITY_AUDIT.md`, `docs/verification/launch-audit-*`.

## 3. Legal and owner inputs — blocking

- [ ] Supply actual operator legal name/business form, operating jurisdiction and target markets/audience.
- [ ] Supply a real monitored privacy/legal contact and any legally required business/registration/address details.
- [ ] Confirm hosting features and request/security log practices, retention, access, regions and subprocessors.
- [ ] Fill `ownerDetails` in `lib/site.ts` (entity, jurisdiction, address/registration if required, privacy/security/copyright/business inboxes, minimum age) and replace the demo contact address and social URLs.
- [ ] Finalize all twelve legal/information pages (`/terms`, `/privacy`, `/cookies`, `/disclaimer`, `/about`, `/contact`, `/faq`, `/copyright`, `/accessibility`, `/security`, `/file-handling`, `/intellectual-property`) with suitable legal review. Remove the draft notices and bump `LEGAL_LAST_UPDATED` only after completion. The pages themselves are implemented — see [`docs/LEGAL_PAGES.md`](docs/LEGAL_PAGES.md) and [`docs/LEGAL_PAGES_CHECKLIST.md`](docs/LEGAL_PAGES_CHECKLIST.md).
- [ ] Decide source-code licensing before making the repository public. Package stays private/UNLICENSED meanwhile; third-party licences still apply.
- [ ] No ads, payments, subscriptions or analytics until separate business/privacy/provider decisions and consent review. If any is added, update `/privacy` and `/cookies` in the same change and implement a genuine opt-in first.
- [ ] Run `node scripts/check-site-links.mjs <preview-url>` and `npm run test:e2e` on the candidate build; both must be clean before approval.

Exact fields and source pages: [`docs/OWNER_INPUTS.md`](docs/OWNER_INPUTS.md). No legal/business information has been invented.

## 4. GitHub — publication status and reusable connection steps

**Completed:** owner supplied `https://github.com/sachi26698-LIMA/Quickkit.git`, approved official GitHub CLI browser authorization, and code was pushed to `main` and `fix/launch-audit` with matching remote hashes. Repository visibility was already PUBLIC and was not modified. No force-push or existing-history replacement was used. Initial audited code commit: `5b8725e`; later documentation commits record this publication. CI status must be checked separately; a push is not a passing CI or deployed-site claim.

The instructions below remain available for cloning/reconnecting on your own machine. Do not add a duplicate `origin` or repeat completed setup blindly.

1. On your own device, install Git and Node 26 (`nvm install 26` / `nvm use` if using nvm), matching `.nvmrc`, `package.json` engines and CI. The Phase 5 sandbox used Node 22.22.3; its successful build is not a substitute for validating on Node 26.
2. Obtain the **whole repository with `.git` history** from `/home/user/quickkit`, not only visible source snippets. Workspace ZIP/download tools may omit hidden `.git`; verify `git log` after extraction. If history is absent, request a history-preserving export before initializing over anything.
3. In GitHub, create your chosen repository under the correct user/organization. Use **private initially**. For this already-initialized project, create an **empty repository without README/licence/gitignore** to avoid unrelated initial history.
4. Authenticate using GitHub CLI browser login (`gh auth login`, choose browser/device login) or normal Git SSH setup. Authorize in your browser. **Never paste a password/PAT/private key into this chat.** The GitHub connector lookup is unsupported here; ordinary Git/CLI still works.
5. In the project directory, inspect:
   ```sh
   git status --short --branch
   git log --oneline --all -10
   git remote -v
   git diff --stat main...HEAD
   ```
6. Copy the repository’s real SSH/HTTPS clone URL from GitHub. Only if no `origin` exists, run `git remote add origin` followed by that URL. Do not replace an existing remote blindly. If a remote has appeared, inspect it and confirm ownership first.
7. Publish the preserved branches without force:
   ```sh
   git push -u origin main
   git push -u origin fix/launch-audit
   ```
8. Open a pull request from `fix/launch-audit` into `main`. Review the full diff/history, CI and security report, then merge only after approval. Enable branch protection/required CI checks and restrict write access. The initial push is now complete; inspect existing remote branches before any subsequent push.

### History-preserving bundle alternative

A verified `quickkit-release.bundle` is supplied beside the project in the workspace. It contains all Git branches/history at the final audit commit, without `.git/config` credentials or working-tree secret files. Download it to your own machine, then:

```sh
git clone -b fix/launch-audit /path/to/quickkit-release.bundle quickkit
cd quickkit
git remote rename origin source-bundle
git branch main source-bundle/main
git log --oneline --all -10
git status --short --branch
```

`/path/to/quickkit-release.bundle` is a local path you replace with your download location, not a repository URL. The `origin` being renamed here is the known local bundle source created by this clone. Now add the real GitHub URL as a **new** `origin`, verify it and use the two push commands above. Do not run these rename/branch commands in an unrelated existing checkout. `git bundle verify` can check the bundle from within a Git repository before use.

## 5. Vercel — connection and preview steps

**Current app status:** connector enabled; credentials validated successfully in this audit. This authorizes tool access, not an assumed project/team/domain. No project or deployment was created or altered.

1. In Vercel, select your intended account/team. Use **Add New → Project → Import Git Repository** (UI labels may vary).
2. Connect/authorize the official GitHub integration in your browser and grant access only to the intended repository. Import it after the approved changes are available. If your repository is not listed, adjust that GitHub App installation’s repository permissions.
3. Root directory: `.` when pushing this repository itself. Use `quickkit/` only if you intentionally push the parent workspace containing that folder. Root must contain this `package.json` and `vercel.json`.
4. Framework: **Next.js**. Node: **26.x**. Install: **`npm ci`**. Build: **`npm run build`**. Output: **framework default**; do not force a static-export directory.
5. `vercel.json`, `.nvmrc`, package engines and CI describe these settings. `.vercel/` and credentials are ignored. No tool API keys or secrets are needed.
6. Keep **`LAUNCH_APPROVED=false`** for every environment. Leave `SITE_URL` unset until you choose/verify the actual origin. Do not add arbitrary `VERCEL_ENV`/`VERCEL_URL`; Vercel supplies them.
7. Create a **preview** from the feature branch before production approval. With `main` as the production branch, pushing/merging `main` can create an unindexed production deployment; do not equate that with approval to launch. Review automatic deployment behavior first.
8. Use only the deployment URL actually returned by Vercel. Inspect real build logs and fix any errors. Verify HTTPS, every static page, search, every tool, download/copy, metadata, icons, all twelve legal/information pages, mobile UI and console.
9. Verify `X-Robots-Tag: noindex`, noindex metadata, `Disallow: /` and empty sitemap on that preview. Use deployment protection when appropriate: **noindex is not access control**. Do not upload confidential test data to a public page URL.

## 6. Domain and indexing — blocked by default

- [ ] Supply the exact authorized production domain. Add it only to the intended project, configure the provider-returned DNS records, verify ownership and HTTPS, and choose the canonical www/non-www redirect.
- [ ] Set `SITE_URL` to that **verified HTTPS origin**, without path, credentials, query or fragment. It is not a secret. Rebuild, but keep approval false while testing.
- [ ] Confirm legal/security/manual acceptance gates are complete and record the owner’s approval.
- [ ] Only then set **`LAUNCH_APPROVED=true` in Production only**, rebuild/redeploy, and validate actual headers/metadata/robots/sitemap.

The code requires BOTH a configured origin AND explicit approval to allow indexing. Vercel Preview/Development stay blocked even if production variables are accidentally copied there. Configured domain alone does not enable indexing. These are build-time/static-route values: changing environment settings without redeploying is insufficient.

## 7. Production go/no-go

- [ ] Owner inputs and final legal pages approved.
- [ ] Security residual decision recorded or compatible upstream remediation installed and retested.
- [ ] GitHub PR/CI reviewed and intended production branch/project confirmed.
- [ ] HTTPS preview functional/device/console/privacy tests pass.
- [ ] Actual domain, DNS, redirects and origin verified.
- [ ] Only then enable Production launch approval; never on preview.
- [ ] Check canonical/OG/Twitter URLs, icons, every sitemap entry, robots and X-Robots-Tag on actual deployment.
- [ ] Independently scan the deployed QR and open each real downloaded image. Verify clipboard fallback on browsers that deny access.
- [ ] Re-run deployed Lighthouse and check caching/security headers. Do not promise rankings or revenue.
- [ ] Confirm rollback instructions and preserve the last known-good deployment. If a problem appears, redeploy with approval false, revert/roll back through the provider UI; do not rewrite Git history.

## 8. Remaining owner actions, in order

1. Re-run `npm audit` for the release candidate (Phase 5 on 10 November 2026 reported zero production and full-tree findings); review the historical dependency note if advisory metadata changes, and supply the legal/contact/hosting inputs.
2. Choose repository owner/name/visibility and follow the GitHub browser-login steps.
3. Select the authorized Vercel team/project and import that repository; connection itself is already validated.
4. Complete preview/manual testing and verify your actual domain.
5. Approve legal/security/domain readiness explicitly; then enable production indexing and verify the real release.

No passwords, tokens, DNS-account credentials or private keys are required in chat. No domain, deployment URL, company details or successful public launch has been invented.
