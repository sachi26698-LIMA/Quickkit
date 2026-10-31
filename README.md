# QUICKKIT

Handy tools. Zero hassle.

## Status
Phase 1 foundation complete. Tools are explicitly marked planned, not functional yet. Do not launch as a finished utility site. The authoritative specification is `QUICKKIT_AGENT_BRAIN.md`.

## Stack
Next.js 16 App Router, React 19, strict TypeScript, npm, CSS custom properties, Lucide, Vitest, Playwright. CSS is intentionally used instead of Tailwind to keep this small foundation dependency-light.

## Local development
Node.js 20.19+ (verified with 20.20.2).

```sh
npm ci
npm run dev
```

## Verification
```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
# In a second terminal, after the production server is ready:
npx playwright install --with-deps chromium
npm run test:e2e
```

Playwright checks live filtering, clear/reset, empty states, skip-link focus, page errors, and overflow at 320, 375, 390, 430, 768, 1366, and 1440 pixels. Current browser coverage is Chromium only, not a full WCAG audit. No secrets or external services are required.

## Security / privacy
No analytics, cookies, database, account system, or input uploads. Production dependencies have zero audit findings at Phase 1 verification. Full audit has 16 moderate development-tool findings rooted in minimatch (<11.0.1), including inherited ESLint dependencies. Do not force the suggested downgrade to obsolete ESLint/Next configuration. Review a compatible upstream fix before release. Raw report: `docs/dependency-audit-phase-1.json`.

## Deployment preparation
Target Vercel preset: Next.js. Root directory: this project directory. Install: `npm ci`. Build: `npm run build`. Leave output directory at framework default. No environment variables currently required. No deployment or remote has been configured. Before public launch finish Phases 2–5, configure the owner-approved production origin, canonical/OG metadata, sitemap/robots and legal pages. Indexing is intentionally disabled on this incomplete build via metadata.

## Next phases
2. Word counter, case converter, JSON formatter, password generator.
3. Client-side QR generator and image compressor.
4. Instructions, FAQs, related links, content pages, SEO, accessibility audit.
5. Full acceptance checks, dependency review, GitHub/Vercel release preparation.
