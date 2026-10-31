# Verification record — 31 October 2026

## Environment

Node.js 20.20.2, npm 10.8.2, Next.js 16.4.3, React 19.3.1. Tests run against `next build` + `next start` on local port 3001, not merely a development server.

## Results

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed; all public content/tool routes statically rendered.
- `npm test`: 44 tests passed (tool logic, bounds, Unicode, 1M text input, large/deep JSON, password sets, component copy states and production-origin validation).
- `npm run test:e2e`: 113 tests passed. Ten route accessibility scans, 70 route/viewport overflow checks, discovery/navigation, metadata/links/headers, input privacy request check and six tool workflows.
- Browsers: Chromium, Firefox and WebKit for all six tool workflows; broader quality sweep in Chromium. Not a claim of physical iPhone/Safari or separate Edge testing.
- Actual clipboard success/readback verified in Chromium. Clipboard denial/unavailable fallback tested independently.
- Downloaded QR PNG decoded with independent jsQR and matched to original Unicode URL. Image downloads inspected as WebP/JPEG/PNG; dimensions, transparency and JPEG white background checked through decoded browser pixels.
- Invalid/empty/oversized/corrupt input states tested. Manual object-URL instrumentation showed 0 active preview URLs after image reset.
- `npm audit --omit=dev`: zero findings. Full audit: 16 moderate inherited lint-tool findings. See `dependency-audit-current.json` and README; not hidden or force-downgraded away.

## Failures found and corrected

- Initial mobile Escape event handler was scoped too narrowly to the nav. It now handles Escape at the header boundary and restores the toggle focus.
- WebKit early typing could occur before hydration; editable workspace controls are now disabled until handlers attach, using a shared hydration-ready hook. The original failing test then passed, followed by the full 113-test run.
- Early core test selectors matched multiple status/alert regions (including the framework route announcer). Selectors were scoped to the relevant tool result; workflows re-run.
- Image URL resource hook has a narrowly documented lint exception: resource creation must occur after mount, and cleanup revokes the externally allocated URL. No global lint disable.

## Performance evidence

Lighthouse 12.8.2 was used because it supports this Node 20 environment. Its CLI was run against the production build with Playwright’s installed Chromium binary, simulated mobile defaults.

- Initial run concurrently with the cross-browser regression was CPU-contended: 75 Performance, 100 Accessibility, 100 Best Practices, 63 SEO. Preserved as `verification/lighthouse-home.json`.
- Isolated rerun (no browser regression running): **99 Performance, 100 Accessibility, 100 Best Practices, 63 SEO**, with 90 ms total blocking time. Raw report: `verification/lighthouse-home-isolated.json`.
- SEO loses indexing credit intentionally: this unconfigured preview has `noindex` and disallow rules. Do not mistake a local preview score for production SEO acceptance. Configure the real domain only after legal/owner gates and re-audit.
- These are local lab measurements, not guaranteed production or real-user scores; network, hosting, device and workload affect results.

## Manual evidence and remaining scope

Desktop/mobile screenshots reviewed for the homepage and representative Word Counter before applying the design across tools. Final screenshots are in `verification/`. Automated accessibility results do not replace manual screen reader and touch testing. Release approval, final legal details, development advisory review, verified production origin and actual remote deployment remain open gates in `RELEASE_CHECKLIST.md`.

A final clean `npm ci` reinstall was followed by formatting, lint, all 44 unit/component/config tests, production build and type-check; all passed. Only `.env.example` exists at the repository root; no actual `.env` credentials were created. `git diff --check` passed.
