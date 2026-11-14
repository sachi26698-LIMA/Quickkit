# Security & Privacy setup and continuation

> **Later focus-mode checkpoint:** This document records the preceding phase and is superseded for current tool counts and test results by `SECURITY_PRIVACY_TOOL_INVENTORY.md` and `SECURITY_PRIVACY_CONTINUATION.md`.

Use Node 26.x per `package.json` and `.nvmrc`, then `npm ci`. Run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test -- --maxWorkers=1`, `npm run build`, `npm audit --audit-level=moderate` and `npm audit --omit=dev --audit-level=moderate`. Install Playwright browsers and OS dependencies on a supported host (`npx playwright install --with-deps`) and run `npm run test:e2e`; then exercise batch generation, copy, reset and downloaded plaintext locally in Chromium, Firefox, and WebKit. Do not use real credentials for tests.

Existing `SITE_URL` and `LAUNCH_APPROVED` gates in `.env.example` remain unchanged. Do not set launch flags without approval. No Supabase setup, schema, admin controls, or migrations have been added. Project ID `oevjmxcoyibkonousdoh` is not sufficient to connect: the owner must supply the existing architecture and grant appropriately scoped read-only inspection via an approved secure mechanism; never paste secrets into chat or expose service-role keys to browsers. Review live schema, grants and RLS before designing additive migrations. Do not create a new project or apply migrations based on guesses.

Current changes use the existing browser-local generators. Downloading passwords saves plaintext; protect and remove exported files appropriately. Hash files are limited to 100 MiB. Missing tools and security controls are listed in `SECURITY_PRIVACY_TOOL_INVENTORY.md`; this is not a completed production toolkit.
