# QUICKKIT

**Handy tools. Zero hassle.** A premium light-theme collection of six genuinely functional, local-first browser utilities.

## Product and architecture

- Next.js 16 App Router, React 19, strict TypeScript, npm (`package-lock.json` only).
- Server-rendered route content and metadata; client islands for inputs and browser APIs.
- CSS-variable design system, bundled Geist Variable font, Lucide icons and lightweight CSS hero illustration. No dark theme, external font requests or decorative fake controls.
- Word Counter, Case Converter, JSON Formatter, Password Generator, QR Code Generator and Image Compressor on distinct `/tools/...` routes.
- Tool logic: `lib/tools/`. Workspaces: `components/tools/`. Shared content shell: `components/tool-shell.tsx`. Catalog: `lib/catalog.ts`.
- Source of truth: **`QUICKKIT_AGENT_BRAIN_FINAL.md`**. Earlier Brain and original uploads are preserved; the FINAL specification supersedes the old one. Reference and screenshot evidence: `docs/`.

## Setup

Verified with Node.js 20.20.2 and npm 10.8.2. Use a supported Node.js release satisfying `package.json` engines.

```sh
npm ci
npm run dev
```

No API keys, database, account system, analytics or secret environment variables are needed. Copy `.env.example` only when configuring the real production origin. To disable Next.js build-tool telemetry locally, set `NEXT_TELEMETRY_DISABLED=1`.

## Checks

```sh
npm run format:check
npm run lint
npm test
npm run build
npm run typecheck
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e
```

Playwright starts the built production server on port 3001 automatically (or reuses a local server). `TEST_BASE_URL` can target another already-running preview. The quality suite intentionally expects an unconfigured, noindex preview. The CI workflow runs the same checks; it has not been executed on a remote repository in this environment.

Verification: **44 unit/component/config tests; 113 browser tests**. Chromium covers accessibility, all routes, seven widths, links, headers and core workflows. Firefox and WebKit cover all six tool workflows. Real clipboard success is verified in Chromium; denied/unavailable clipboard fallback is also tested. WebKit is not a claim of testing every Safari/iOS device, and Edge has not been separately tested.

## Processing and limits

| Tool | Notes |
|---|---|
| Word Counter | 1,000,000 UTF-16 code units; Unicode code-point character counts; whitespace-delimited words; blank-line paragraphs; 200 wpm reading estimate |
| Case Converter | 1,000,000 code units; four case modes; preserves line breaks; language rules are approximate |
| JSON Formatter | 1,000,000 characters, 128 nesting levels; JSON.parse/stringify; JavaScript number precision; duplicate keys collapse to last value |
| Password Generator | 8–64 characters; crypto.getRandomValues, rejection sampling, secure shuffle; at least one from each selected set |
| QR Generator | 2,000 UTF-8 bytes; client-side qrcode loaded on demand; 768×768 PNG; downloaded QR independently decoded in tests |
| Image Compressor | JPEG/PNG/WebP input; 15 MB, 24 MP, 8,192 px/side; same dimensions; WebP/JPEG/PNG output; JPEG uses white behind transparency; animation becomes a single frame |

Canvas re-encoding may remove metadata and alter color profiles. Output can be larger; compare sizes. PNG quality is lossless and the quality slider is disabled for PNG. Preview URLs are revoked on replacement, reset and unmount. File decode/encode support depends on the browser.

## Security and privacy

Tool inputs remain in browser memory; no uploads, persistent tool storage, accounts, payment handling, ad SDK or analytics. Fonts are bundled. Copying and downloading use the device clipboard/filesystem; these have their own privacy implications. Hosting still receives ordinary page/asset requests. Legal pages accurately mark operator identity/contact, jurisdiction and provider retention details as owner-supplied launch requirements.

Security headers include CSP, HSTS, nosniff, referrer policy and permissions policy. CSP permits inline framework scripts/styles because the current static Next.js shell requires them; it forbids eval, objects and remote script sources. A future nonce-based CSP would require reviewing dynamic rendering/cache implications. Framing restrictions are not added because the Arena preview needs embedding; review `frame-ancestors` for the actual standalone deployment.

Production audit: **0 vulnerabilities**. Full development audit: **16 moderate findings**, all inherited from minimatch <11.0.1 in lint tooling. `docs/dependency-audit-current.json` records the report. A forced audit fix suggests incompatible legacy downgrades. ESLint 10 is not currently accepted by the installed React/JSX accessibility plugins, and TypeScript 7 is outside the installed typescript-eslint peer range; the current mutually compatible versions are intentionally retained. Owner/security review or a compatible upstream fix is required before release approval.

## Deployment

See **`docs/RELEASE_CHECKLIST.md`**. The code is prepared for Vercel, not yet deployed. Root: `quickkit` if the parent workspace is pushed; `.` if this repository itself is pushed. Preset: Next.js. Install: `npm ci`. Build: `npm run build`. Output: framework default.

Set `SITE_URL` to the **verified HTTPS production origin**, rebuild, and check canonicals, sitemap, OG/Twitter URLs and indexing. Without it, robots blocks crawling, metadata is noindex and sitemap has no invented URLs. Vercel preview metadata can use `VERCEL_URL`; local previews use an explicit localhost metadata base, not a claimed public domain.

No remote is configured, no code has been pushed, and no production URL exists. Do not publish the draft legal details or enable indexing until the release checklist is resolved. Payments, subscriptions and ads are deliberately absent; future monetization requires separate business, legal, consent and provider decisions.
