# Release gates and deployment runbook

## Verified locally (2026-10-31)

- [x] Six real tool routes with shared light-theme shell and unique metadata.
- [x] Homepage keyword search, category filtering, clear/empty states and working links.
- [x] Tool-specific instructions, FAQs, related links, copy/reset/download actions.
- [x] Production build, strict type-check, lint and formatting checks.
- [x] 44 unit/component/config tests and 113 production-browser tests.
- [x] Browser workflows in Chromium, Firefox and WebKit; real downloaded files validated.
- [x] Automated axe scans on all ten public pages; no detected WCAG A/AA violations in tested initial states.
- [x] Overflow checks on all ten pages at 320, 375, 390, 430, 768, 1366 and 1440px.
- [x] Security headers, input bounds, local crypto, no eval/user HTML and no tool-input logging.
- [x] Production dependency audit clean; development findings explicitly reported.
- [x] Icons, OG image, robots and configuration-aware sitemap/canonical setup.
- [x] Setup/deployment documentation, example environment file and CI workflow prepared.

## Owner/security prerequisites — not complete

- [ ] Supply operator identity, jurisdiction and verified privacy/contact method. Review Privacy and Terms with appropriate legal guidance; remove the draft launch notices only after completion.
- [ ] Confirm actual hosting request-log practices, retention and privacy disclosures.
- [ ] Review/accept or remediate 16 moderate development-tool minimatch findings. No incompatible forced downgrades were applied.
- [ ] Choose the intended remote repository/account and authorize access using normal Git/SSH/CLI login—not a token pasted into chat.
- [ ] Connect/authorize Vercel. The connector reported disconnected; GitHub connector lookup reported unsupported in this environment. Local Git remains available.
- [ ] Supply a verified production domain/origin and set `SITE_URL` for the production build. Do not enable production indexing for draft legal pages.
- [ ] Run manual assistive-technology checks (screen readers), real mobile/touch checks and a separate current Edge/Safari device pass. Automated scans are not a compliance certification.

## Safe Git publication

Work is on `feat/premium-mvp`, preserving the original `main` commit. Inspect:

```sh
git status --short --branch
git diff --stat main...HEAD
git log --oneline main..HEAD
git remote -v
```

Add only the intended owner-selected remote, inspect its target, then push the feature branch and open a pull request. Do not force-push. Review the diff and CI before merging. No remote has been added or pushed by this implementation.

## Vercel preview

1. Import the intended Git repository after authorization.
2. Use Next.js preset, repository root (or `quickkit/` if pushing the parent workspace), install `npm ci`, build `npm run build`, framework-default output.
3. No secrets or tool-service API keys are required. Keep `SITE_URL` unset on ordinary previews so they remain noindex.
4. Use the returned preview URL; verify HTTPS, all ten pages, icons, OG image, search, copy, downloads, mobile menu, errors and browser console.
5. Inspect actual deployment logs and correct any failures. Do not assume a successful deployment from a local build.

## Production approval

After the owner/legal/security gates and preview checks are resolved:

1. Add the verified custom domain in the provider UI and configure only the DNS records the provider returns. Verify ownership and HTTPS.
2. Set `SITE_URL` to the real HTTPS origin (no path, credentials, query or fragment). Rebuild.
3. Verify every canonical, OG/Twitter URL and `/sitemap.xml` entry uses that origin. Verify `/robots.txt` allows the site only when intended.
4. Repeat functional checks on the actual production URL and inspect deployment/runtime logs.
5. Run production Lighthouse and real-user performance monitoring only after deciding/disclosing any telemetry. No first-page ranking, ad approval, earnings or absolute security claim is made.

## Monetization readiness

The MVP is free with no ads, account or payment form. Before adding ads or paid plans, decide operator/business details, provider, pricing, taxes, refunds, consent and data handling. Do not add fake Pro links, ad units or approvals. Preserve tool usability and accessibility.
