# QUICKKIT

**Handy tools. Zero hassle.** A premium light-theme collection of seven genuinely functional, local-first browser utilities.

## Product and architecture

- Next.js 16 App Router, React 19, strict TypeScript, npm (`package-lock.json` only).
- Server-rendered route content and metadata; client islands for inputs and browser APIs.
- CSS-variable design system, bundled Geist Variable font, Lucide icons and lightweight CSS hero illustration. No dark theme, external font requests or decorative fake controls.
- Word Counter, Case Converter, JSON Formatter, Password Generator, QR Code Generator, Image Compressor and Image Resizer on distinct `/tools/...` routes. The new **Image Tools** category starts with the Image Resizer (`/tools/image-resizer`), upgraded in place to a full local image editor — see `docs/FEATURE_IMAGE_RESIZER.md`.
- Tool logic: `lib/tools/`. Workspaces: `components/tools/`. Shared content shell: `components/tool-shell.tsx`. Catalog: `lib/catalog.ts`.
- Source of truth: **`QUICKKIT_AGENT_BRAIN_FINAL.md`**. Earlier Brain and original uploads are preserved; the FINAL specification supersedes the old one. Reference and screenshot evidence: `docs/`.

## Setup

Launch audit verified Node.js 22.23.4. Use Node 22 (`.nvmrc`, package engines and CI are aligned). Earlier Node 20 results are historical, not the chosen deployment runtime.

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

Verification: **134 unit/component/config/compatibility tests; 117 browser tests passed on the Image Tools branch, with 2 explicit browser-permission capability skips**. Chromium covers accessibility, all routes, seven widths, links, headers and core workflows. Firefox and WebKit cover every tool workflow. Real clipboard success is verified in Chromium; denied/unavailable clipboard fallback is also tested. WebKit is not a claim of testing every Safari/iOS device, and Edge has not been separately tested.

## Processing and limits

| Tool | Notes |
|---|---|
| Word Counter | 1,000,000 UTF-16 code units; Unicode code-point character counts; whitespace-delimited words; blank-line paragraphs; 200 wpm reading estimate |
| Case Converter | 1,000,000 code units; four case modes; preserves line breaks; language rules are approximate |
| JSON Formatter | 1,000,000 characters, 128 nesting levels; rejects non-finite numeric overflow; JSON.parse/stringify; JavaScript number precision; duplicate keys collapse to last value |
| Password Generator | 8–64 characters; crypto.getRandomValues, rejection sampling, secure shuffle; at least one from each selected set |
| QR Generator | 2,000 UTF-8 bytes; client-side qrcode loaded on demand; 768×768 PNG; downloaded QR independently decoded in tests |
| Image Compressor | JPEG/PNG/WebP input; 15 MB, 24 MP, 8,192 px/side; same dimensions; WebP/JPEG/PNG output; JPEG uses white behind transparency; animation becomes a single frame |
| Image Resizer (v2) | JPEG/PNG/WebP/AVIF input; 15 MB, 24 MP, 8,192 px/side; exact width/height, percentage, longest/shortest side, aspect-ratio lock, 8 everyday + 18 social presets (Instagram, YouTube, Facebook, WhatsApp, X, LinkedIn, Pinterest) and session custom presets; crop with fixed ratios, rotate any angle, flip, brightness/contrast/saturation and filters; split/side-by-side compare, zoom, per-image undo/redo; DPI and print-size conversion; batches of 20 with per-image size/format/quality/name/suffix overrides, replace-file, individual or ZIP download; JPEG/PNG/WebP/AVIF output with quality control and an EXIF/GPS metadata panel; no upload |

Canvas re-encoding may remove metadata and alter color profiles. Output can be larger; compare sizes. PNG quality is lossless and the quality slider is disabled for PNG. In the resizer, unlocks stretch (aspect ratio ignored), preset "Fill & crop" centre-crops, "Fit inside" keeps the whole frame, and the ZIP stores already-compressed images without re-compressing them. Preview URLs are revoked on replacement, reset and unmount. File decode/encode support depends on the browser.

## Security and privacy

Tool inputs remain in browser memory; no uploads, persistent tool storage, accounts, payment handling, ad SDK or analytics. Fonts are bundled. Copying and downloading use the device clipboard/filesystem; these have their own privacy implications. Hosting still receives ordinary page/asset requests. Legal pages accurately mark operator identity/contact, jurisdiction and provider retention details as owner-supplied launch requirements.

Security headers include CSP, HSTS, nosniff, referrer policy and permissions policy. CSP permits inline framework scripts/styles because the current static Next.js shell requires them; it forbids eval, objects and remote script sources. A future nonce-based CSP would require reviewing dynamic rendering/cache implications. Framing restrictions are not added because the Arena preview needs embedding; review `frame-ancestors` for the actual standalone deployment.

Production audit: **0 vulnerabilities**. Original full audit: **16 moderate entries**, all one inherited minimatch GHSA. Scoped override upgrades only the TypeScript parser’s minimatch 10.2.6 to 11.0.3; an 80-case pre-upgrade corpus and real project-service parser call verify the supported consumer API. Older ESLint/plugin callable v3 APIs are preserved. **15 raw moderate dev-only entries remain** on minimatch 3.1.5 ancestry. Source review finds the described v7+ optimizer absent in v3, but this is our assessment, not an upstream change to the advisory or a clean full audit. Owner/security acceptance or compatible upstream remediation remains a release gate. Full per-entry chains and evidence: `docs/security/DEPENDENCY_REVIEW.md`. No audit suppression, global breaking override, forced downgrade or lint-rule deletion was used.

The package remains private and is now marked UNLICENSED pending an owner-approved source licence decision, rather than granting the npm initializer’s default ISC licence. Third-party licence obligations remain applicable.

## Deployment

See **`RELEASE_CHECKLIST.md`**. The code is prepared for Vercel, not yet deployed. Root: `quickkit` if the parent workspace is pushed; `.` if this repository itself is pushed. Preset: Next.js. Install: `npm ci`. Build: `npm run build`. Output: framework default.

Set `SITE_URL` to the **verified HTTPS production origin**, but keep `LAUNCH_APPROVED=false` until legal, security, domain and preview checks are approved. Only then set approval true in Production and redeploy. Both origin and explicit approval are required; Vercel Preview/Development remain blocked even if approval leaks into their environment. While blocked, robots disallows crawling, metadata and X-Robots-Tag say noindex and sitemap is empty. Vercel preview metadata can use `VERCEL_URL`; local previews use an explicit localhost metadata base, not a claimed public domain.

GitHub publication completed to the owner-selected repository `https://github.com/sachi26698-LIMA/Quickkit.git`: audited code was pushed to `main` and `fix/launch-audit` without force, and both remote hashes were verified. The selected repository is public; its visibility was not changed by this work. No website deployment has been performed. Vercel connector is now enabled and credential validation succeeded, but no intended team/project/domain was selected or created. The GitHub connector is unsupported here; use the documented browser-authorized Git/CLI import flow. Do not publish the draft legal details or enable indexing until the release checklist is resolved. Payments, subscriptions and ads are deliberately absent; future monetization requires separate business, legal, consent and provider decisions.
