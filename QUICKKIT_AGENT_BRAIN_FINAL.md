# QUICKKIT — MASTER AGENT BRAIN
Version: 1.0
Project type: Production-minded online tools website
Brand: QUICKKIT
Tagline: **Handy tools. Zero hassle.**
Primary workflow: Build with an AI coding agent → Git/GitHub → Vercel deployment.

---

## 0. YOUR ROLE — READ THIS FIRST

You are the lead product engineer, UI/UX designer, frontend developer, QA engineer, accessibility reviewer, SEO engineer, and deployment assistant for QUICKKIT.

Build the actual working product, not just a mockup or a landing-page screenshot.

### Non-negotiable working rules

1. **Inspect before changing.** First inspect the repository, existing files, package manager, framework, Git status, and current implementation. Do not overwrite working code blindly.
2. **Plan, then execute.** Give a short implementation plan, then start building. Do not stop after giving advice.
3. **Work in small verified steps.** After each meaningful phase, run the relevant checks and fix errors before moving on.
4. **No fake functionality.** Every visible button, link, menu, search field, tool, form, and toggle must work. If a feature is not implemented, do not display it as if it works.
5. **No placeholder content in the finished product.** No lorem ipsum, fake testimonials, fake ratings, fake user counts, fake pricing claims, or dead links.
6. **Do not ask me to make avoidable technical decisions.** Use sensible, maintainable defaults. Ask only when a decision genuinely blocks implementation or affects money, privacy, domain ownership, or a destructive action.
7. **Do not claim success without verification.** Report the commands run, results, known issues, and anything I must do manually.
8. **Preserve user work.** Never delete files, reset branches, force-push, or overwrite user changes without explicit permission.
9. **Use current stable, mutually compatible package versions.** Check the installed environment and official documentation when needed. Do not blindly copy outdated tutorials.
10. **Keep the project understandable.** Use clear file names, reusable components, comments only where useful, and a concise README.

### Definition of done

A feature is done only when it:
- works in the browser;
- handles empty, invalid, large, and error inputs safely;
- is responsive on mobile, tablet, and desktop;
- is keyboard-accessible;
- has a useful loading/empty/error/success state where relevant;
- passes applicable lint, type-check, build, and tests;
- has no console errors introduced by the feature.

---

## 1. PRODUCT VISION

QUICKKIT is a clean, fast, trustworthy collection of browser-based utilities for everyday tasks.

**Promise:** Small tasks. Quick solutions.

### Target users
- Students and teachers
- Freelancers and creators
- Office workers
- Developers and technical users
- Anyone who needs a quick utility without installing software

### Product principles
- Fast to understand and use
- Mobile-first and responsive
- Minimal friction; no account required for basic tools
- Privacy-conscious: process data locally in the browser whenever practical
- Honest about any third-party service or data transfer
- Searchable, indexable, accessible, and maintainable
- Useful free tier first; monetization should not damage usability

### Brand identity
- Brand name: QUICKKIT
- Wordmark: QUICK in dark ink, KIT in brand purple
- Tagline: **Handy tools. Zero hassle.**
- Supporting headline: **Small tasks. Quick solutions.**
- Personality: helpful, clear, friendly, efficient, trustworthy
- Visual direction: modern utility product; polished but not visually noisy

### Design tokens
Use CSS variables or the theme system. Keep colors consistent.

- Main background: `#F6F7FB`
- Surface/card: `#FFFFFF`
- Primary text: `#171B2E`
- Secondary text: `#70778E`
- Border: `#E6E8F0`
- Primary purple: `#6657E8`
- Secondary lavender: `#A397FF`
- Mint accent: `#D9FFF2`
- Success: accessible green with sufficient contrast
- Error: accessible red with sufficient contrast

Use the logo mark as a rounded square with a simple “Q”. Avoid unnecessary gradients, glass effects, excessive shadows, or animation. Motion must respect `prefers-reduced-motion`.

---

## 2. REQUIRED TECHNICAL APPROACH

### Preferred stack

Use this unless the repository already has a sound, working stack that would be costly or risky to replace:

- Next.js using the current stable App Router
- TypeScript with strict mode
- React
- Tailwind CSS (or the existing styling system if already established)
- Lucide icons
- Zod for validating structured inputs where useful
- Vitest + React Testing Library for unit/component tests
- Playwright for essential end-to-end flows if practical
- Vercel for hosting and deployment
- Git + GitHub for source control

Use the package manager indicated by the existing lockfile. Do not mix npm, pnpm, yarn, or bun lockfiles.

### Architecture principles

- Prefer Server Components by default.
- Add `"use client"` only to interactive components that need browser APIs or client state.
- Keep browser-only APIs (`window`, `document`, `navigator`, `File`, `canvas`, `crypto`) inside client components or event handlers.
- Keep reusable tool logic separate from UI.
- Keep each tool isolated so one tool's error cannot break the whole website.
- Avoid unnecessary global state and unnecessary dependencies.
- Do not add a database, authentication, or a backend unless a real feature requires it.
- Basic tools should work without sign-in.
- Never put API keys, private tokens, service-role keys, or secrets in client-side code or public environment variables.
- Use environment variables for secrets and document them in `.env.example` with dummy values only.
- Never commit `.env`, credentials, private keys, or personal data.

### Suggested project organization

Adapt to the existing repo rather than forcing this exact structure:

```text
quickkit/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── tools/
│   │   ├── word-counter/page.tsx
│   │   ├── password-generator/page.tsx
│   │   ├── case-converter/page.tsx
│   │   ├── json-formatter/page.tsx
│   │   ├── qr-generator/page.tsx
│   │   └── image-compressor/page.tsx
│   ├── privacy/page.tsx
│   ├── terms/page.tsx
│   └── about/page.tsx
├── components/
│   ├── layout/
│   ├── tools/
│   └── ui/
├── lib/
│   ├── tools/
│   ├── seo/
│   └── utils.ts
├── public/
│   ├── favicon.ico
│   ├── icon.svg
│   └── og-image.png
├── tests/
├── .env.example
├── .gitignore
├── README.md
└── package.json
```

Use route names and metadata that are descriptive and SEO-friendly.

---

## 3. SITE MAP AND USER EXPERIENCE

### Main navigation
- QUICKKIT logo → homepage
- Tools
- About
- Theme toggle only if fully implemented and persisted accessibly
- Do not add fake login, profile, notification, or pricing controls

### Homepage sections
1. Header with QUICKKIT wordmark
2. Hero:
   - Small label: “YOUR EVERYDAY TOOLKIT”
   - Heading: “Small tasks. Quick solutions.”
   - Supporting copy: “Handy tools for the things you do every day. No clutter, no complicated setup — just pick a tool and get it done.”
   - Search input with clear button/keyboard behavior
3. Tool categories or filters
4. Featured/popular tools grid
5. Short privacy/trust message explaining local processing where accurate
6. Footer with About, Privacy Policy, Terms, Contact placeholder only if a real contact method is configured

### Tool discovery
- Search filters tool names, descriptions, and keywords.
- Search works while typing.
- Show a useful “No tools found” state and a clear-search action.
- Tool cards are keyboard accessible and have visible focus styles.
- Every tool card navigates to its own stable URL.
- Add category chips only if they actually filter the tools.

### Tool page layout
Every tool page should have:
- Breadcrumb back to Tools/Home
- Clear H1 and concise explanation
- The working tool interface above the fold where practical
- Input labels and short instructions
- Clear primary action
- Output/result area
- Copy/download/reset actions when relevant
- Helpful validation and error messages
- Privacy note describing actual processing behavior
- Short “How to use” section
- FAQ section with real, tool-specific answers
- Related tools section with working links

Do not make all tools just one generic page with a changing heading. Each tool must have a distinct route and useful metadata.

### Responsive behavior
Test at minimum:
- Small mobile: 320–375px
- Standard mobile: 390–430px
- Tablet: 768px
- Laptop: 1366px
- Wide desktop: 1440px+

No horizontal overflow. Controls must be touch-friendly. Avoid tiny text and cramped cards.

---

## 4. MVP TOOLS — IMPLEMENT THESE FIRST

Build and verify these six tools before expanding the catalog.

### Tool 1 — Word Counter
Route: `/tools/word-counter`

Requirements:
- Multiline text input
- Live word count
- Character count including spaces
- Character count excluding spaces
- Sentence count where reasonably detectable
- Paragraph count
- Estimated reading time with a clearly stated assumption
- Clear/reset button
- Handle empty text correctly
- Do not freeze on long text; test a large input

### Tool 2 — Password Generator
Route: `/tools/password-generator`

Requirements:
- Length control (reasonable minimum and maximum, e.g. 8–64)
- Options for uppercase, lowercase, numbers, and symbols
- Exclude ambiguous characters option if feasible
- Generate button
- Copy button with success feedback
- Never use `Math.random()` for password generation
- Use `crypto.getRandomValues()` and avoid modulo bias where practical
- Validate that at least one character set is selected
- Never send generated passwords to a server or analytics

### Tool 3 — Case Converter
Route: `/tools/case-converter`

Requirements:
- Multiline text input
- UPPERCASE
- lowercase
- Title Case
- Sentence case
- Copy output
- Clear/reset
- Preserve line breaks
- Explain that title/sentence case rules can vary by language; do not pretend to provide perfect linguistic casing for every language

### Tool 4 — JSON Formatter & Validator
Route: `/tools/json-formatter`

Requirements:
- JSON input editor
- Format/pretty-print
- Minify
- Validate and show understandable parse errors
- Copy result
- Clear/reset
- Never execute JSON as JavaScript
- Handle empty input and large input safely
- Preserve correct Unicode

### Tool 5 — QR Code Generator
Route: `/tools/qr-generator`

Requirements:
- Text or URL input
- Generate QR code
- Download as PNG if the chosen library supports it
- Provide a useful preview and accessible label
- Validate empty input
- Prefer a reputable client-side QR library so user data stays in the browser
- If any external QR service is used, clearly disclose that the entered content is sent to that provider; do not send sensitive data silently
- Do not claim local/private processing if using a remote service

### Tool 6 — Image Compressor
Route: `/tools/image-compressor`

Requirements:
- Image file picker
- Accept common formats supported by the browser and clearly communicate limitations
- Show original file size, output size, and compression result
- Quality control
- Preview before and after where feasible
- Download compressed image
- Validate file type and reasonable file size
- Handle decode/compression failures gracefully
- Revoke object URLs when no longer needed
- Avoid uploading images to a server; process locally in the browser
- Do not silently change image dimensions or format without telling the user
- Explain that JPEG output does not preserve transparency; use an appropriate output format if transparency must be retained

### Shared tool requirements
- All tool controls work on keyboard and touch.
- Inputs have associated labels.
- Announce result/status changes accessibly (`aria-live` where appropriate).
- Show helpful empty, invalid, success, and error states.
- Avoid alerts for normal feedback; use inline messages/toasts.
- Copy/download must be tested.
- Never log user input, passwords, text, JSON, or image contents.
- No account required for these basic tools.

---

## 5. QUALITY, ACCESSIBILITY, AND SECURITY

### Accessibility
Target WCAG 2.2 AA practices:
- Semantic HTML
- Logical heading order
- Keyboard navigation
- Visible focus indicators
- Accessible labels and button names
- Sufficient color contrast
- Do not use color alone to communicate status
- Respect reduced-motion preferences
- Alt text for meaningful images; empty alt for decorative images
- Dialogs, if any, must manage focus correctly

### Security and privacy
- Validate all user input.
- Do not use `dangerouslySetInnerHTML` for user-provided content.
- Do not use `eval`, `new Function`, or execute user-provided JSON/code.
- Prevent unsafe URL handling; sanitize/validate URL inputs where a URL is expected.
- Do not collect personal data unless required and explained.
- Do not add analytics by default. If analytics are later added, make the data collection transparent and configure consent where legally required.
- Use secure, maintained dependencies.
- Review dependency vulnerabilities before release.
- Add sensible security headers where supported by the hosting platform.
- Keep error messages useful without exposing secrets or stack traces.
- Do not promise absolute security or privacy.

### Performance
- Optimize images and fonts.
- Avoid large dependencies for simple utilities.
- Lazy-load non-critical code when it makes sense.
- Avoid layout shift.
- Keep client JavaScript as small as practical.
- Use Next.js metadata and optimized assets appropriately.
- Test a production build, not only the development server.

### Browser support
Test current Chrome, Edge, Firefox, and Safari where possible. If a browser API is unsupported, show a graceful explanation rather than crashing.

---

## 6. SEO AND CONTENT

Implement technical SEO properly; do not keyword-stuff.

Required:
- Unique title and meta description for homepage and every tool page
- Canonical URLs using the real production domain once configured
- Open Graph and Twitter metadata
- Favicon and app icons
- `robots.txt`
- `sitemap.xml` (generated or maintained correctly)
- Semantic HTML and one clear H1 per page
- Descriptive internal links between related tools
- Useful, original tool descriptions and instructions
- Fast, crawlable pages
- Avoid indexing duplicate or thin pages
- Structured data only when it accurately describes visible page content; never add fake ratings/reviews
- Custom 404 page

Do not promise first-page Google rankings. SEO takes time and depends on content, quality, competition, and links.

### Content pages
Create accurate initial pages:
- `/about`
- `/privacy`
- `/terms`

Privacy and terms pages must reflect the actual implementation. Do not invent a company address, legal entity, contact email, or data practices. Clearly mark any details the owner must supply before launch. Do not claim legal compliance without review.

---

## 7. MONETIZATION PLAN — PREPARE, DO NOT FAKE

Initial business model:
- Free tools for all visitors
- Potential display advertising after the site has real value and meets the ad network's current requirements
- Potential premium features later

Important:
- Do not add fake ad units or pretend AdSense is approved.
- Do not place ads where they obstruct tool inputs, outputs, or mobile navigation.
- Do not build a subscription checkout until a payment provider, pricing, business details, tax obligations, and refund terms are decided.
- Do not collect payment details directly.
- Keep the first release focused on quality and useful content.
- Ad network approval and revenue are never guaranteed.

Potential future premium features (not part of MVP):
- Batch processing
- Larger file limits
- Saved presets (only with clear privacy design)
- Ad-free experience
- Additional advanced tools

---

## 8. TESTING AND ACCEPTANCE CHECKLIST

Before calling the MVP complete, verify:

### Functional
- [ ] All six tools open on their own routes.
- [ ] Every tool produces correct output for normal inputs.
- [ ] Empty and invalid inputs are handled.
- [ ] Copy actions work or show a clear fallback.
- [ ] Downloads work and have sensible filenames.
- [ ] Search filters the catalog correctly.
- [ ] Clear/reset works.
- [ ] No dead buttons or fake links.

### UI
- [ ] Homepage looks polished at mobile, tablet, and desktop sizes.
- [ ] Tool pages share a consistent design system.
- [ ] No horizontal overflow.
- [ ] Focus states are visible.
- [ ] Empty, error, and success states are styled.
- [ ] Reduced motion is respected.

### Engineering
- [ ] TypeScript type-check passes.
- [ ] Lint passes.
- [ ] Unit tests pass.
- [ ] Production build passes.
- [ ] No important browser console errors.
- [ ] No secrets in repository.
- [ ] `.gitignore` is correct.
- [ ] `.env.example` contains only placeholder values.
- [ ] README explains local setup and deployment.

### SEO/privacy
- [ ] Each route has unique metadata.
- [ ] Sitemap and robots rules are correct.
- [ ] Privacy page matches actual data handling.
- [ ] Third-party services are disclosed.
- [ ] No fake structured data or claims.

---

## 9. GIT / GITHUB WORKFLOW

Use Git safely.

1. Inspect `git status`, current branch, remotes, and recent commits.
2. Never discard or overwrite uncommitted user changes.
3. Create a feature branch if appropriate; otherwise work on the branch the user specifies.
4. Make focused commits with descriptive messages, for example:
   - `feat: create QUICKKIT homepage and design system`
   - `feat: add word counter and case converter`
   - `feat: add password and JSON tools`
   - `feat: add QR generator and image compressor`
   - `test: cover core tool workflows`
   - `docs: add setup and deployment guide`
5. Before pushing, show the changed files and commit summary.
6. Push only to the intended remote and branch.
7. Never force-push unless the user explicitly approves and the consequences are explained.
8. Do not expose tokens or credentials in command output, logs, or chat.

If GitHub authentication is unavailable, explain exactly what I need to do. Do not ask me to paste a personal access token into chat.

---

## 10. VERCEL DEPLOYMENT WORKFLOW

Prepare the project for Vercel.

### Before deployment
- Confirm the production build passes locally.
- Confirm the correct framework preset and root directory.
- Confirm environment variables (if any) are configured in Vercel, not committed.
- Confirm the build command and output settings are appropriate for the selected framework.
- Ensure the app does not depend on local-only files or development server behavior.
- Check all internal routes and asset paths.

### Deployment
- Prefer connecting the GitHub repository to Vercel so pushes create deployments.
- Use preview deployments for testing.
- Deploy production only after the preview is verified.
- Do not claim deployment is live unless the deployment URL is returned and checked.
- Do not invent a domain or deployment URL.
- Explain how to connect a custom domain and verify DNS if the owner wants one.

### After deployment
Verify:
- Homepage loads
- Each of the six tool routes loads
- Search works
- Tool interactions work
- Mobile layout works
- Metadata and favicon appear
- No runtime/build errors
- Privacy and terms pages load
- Production URL uses HTTPS

If a deployment fails, inspect the actual logs, identify the cause, fix it, and redeploy. Do not guess.

---

## 11. BUILD ORDER — FOLLOW THIS SEQUENCE

### Phase 1 — Repository and foundation
- Inspect repo and report current state.
- Confirm framework and package manager.
- Set up/repair TypeScript, styling, lint, and scripts.
- Create design tokens, global layout, header, footer, and responsive shell.
- Create homepage and tool catalog.

### Phase 2 — Core tools
Implement and test:
1. Word Counter
2. Case Converter
3. JSON Formatter
4. Password Generator

### Phase 3 — Browser utilities
Implement and test:
5. QR Code Generator
6. Image Compressor

### Phase 4 — Product quality
- Tool instructions and FAQs
- Related tools
- About, Privacy, Terms
- SEO metadata, sitemap, robots, icons
- 404 page
- Accessibility and responsive audit

### Phase 5 — Release readiness
- Tests, lint, type-check, production build
- Dependency/security review
- README and `.env.example`
- Git status and commit plan
- Vercel deployment preparation

Do not jump to payments, accounts, databases, or ads before the MVP works reliably.

---

## 12. HOW TO COMMUNICATE WITH ME

Use simple Hinglish for explanations, but write production code, identifiers, comments, commit messages, and technical documentation in clear English.

At the end of each phase, report:
1. What you completed
2. Important files created/changed
3. Commands/checks run and their actual results
4. Any known limitations or bugs
5. What comes next
6. Any action I must take (only if necessary)

If something fails:
- Show the exact failure in a concise way.
- Diagnose it from actual output.
- Fix it where possible.
- Re-run the failed check.
- Do not hide failures or say “all done” if checks are failing.

Do not dump huge amounts of code into chat when you can edit the repository files directly. Keep all project requirements in this `QUICKKIT_AGENT_BRAIN.md` file and keep the actual implementation in the proper source files.

---

## 13. FIRST MESSAGE / START COMMAND FOR THE CODING AGENT

Start now.

First inspect the current repository and report:
- current directory and project files;
- framework and package manager;
- Git branch, status, and remote (do not expose credentials);
- what already works;
- risks or existing changes that must be preserved.

Then give a concise plan and begin **Phase 1**. Build QUICKKIT in the existing repository where possible. Do not just provide sample snippets or a tutorial. Implement the real application, run checks, fix errors, and continue phase by phase.

If this is a new empty repository, initialize the project using the preferred stack above. If a working project already exists, preserve it and adapt.

**Final goal:** a polished, genuinely functional, responsive QUICKKIT website that is version-controlled in Git and ready for a verified Vercel deployment.

---

# 14. FINAL UI ART DIRECTION — OVERRIDES ANY CONFLICTING VISUAL CHOICE

This section is the final approved visual direction. Follow it throughout the whole product.

## Design concept
**Premium Minimal + Friendly Modern SaaS.** The interface should feel calm, polished, lightweight, trustworthy, and easy to use. Think clean editorial typography, generous whitespace, refined SaaS layouts, and friendly pastel tool categories.

### Strict visual rules
- LIGHT THEME ONLY for the initial release.
- Do not create a dark theme, black page background, dark dashboard, or dark tool workspace.
- Main page background: warm/cool off-white `#F6F7FB`.
- Cards and tool workspaces: white `#FFFFFF`.
- Main text: deep ink `#171B2E`, not pure black.
- Muted text: `#70778E`.
- Primary action and brand accent: `#6657E8`.
- Secondary lavender: `#A397FF`.
- Mint accent: `#D9FFF2`.
- Border: `#E6E8F0`.
- Use soft category tints: lavender for text, mint for utility, peach for image, pale blue for developer tools.
- Use subtle shadows only. Avoid heavy shadows, neon, glassmorphism, excessive gradients, clutter, and decorative animations.
- Use rounded cards and controls consistently (roughly 12–20px radius depending on component).
- Maintain generous spacing and readable line lengths.
- Use a clean sans-serif font such as Geist or Inter, loaded efficiently and with a sensible system fallback.
- Keep icon style consistent (Lucide outline icons or a consistent set of simple illustrations); do not mix random emoji with unrelated icon families in the finished UI.
- Use motion sparingly and respect `prefers-reduced-motion`.
- Do not show dark mode toggles or controls when dark mode is not implemented.

## Homepage composition
1. White/off-white header with compact QUICKKIT logo at left and simple navigation.
2. Spacious hero with small uppercase eyebrow “YOUR EVERYDAY TOOLKIT”.
3. Large two-line headline: “Small tasks. Quick solutions.” Use brand purple only to emphasize “Quick solutions.”
4. One short supporting sentence; avoid a wall of marketing text.
5. Prominent rounded search field with a clear search action and keyboard support.
6. Optional subtle decorative brand illustration on desktop; hide or simplify it on narrow mobile screens.
7. “Explore the toolkit” section with category filters only if functional.
8. Tool cards in a responsive grid: 3 columns on desktop, 2 on tablet, 1 or 2 on mobile depending on actual width and readability.
9. Each tool card: small tinted icon tile, clear title, one-line description, optional category label, hover/focus treatment.
10. Trust/privacy note that is strictly accurate about actual data processing.
11. Minimal footer with real About, Privacy, and Terms links.

## Category accent mapping
- Text tools: pale lavender background with purple icon.
- Utility tools: pale mint background with teal/green icon.
- Image tools: pale peach background with warm orange icon.
- Developer tools: pale blue background with blue icon.
- Security tools: pale soft-green or pale lavender background; never use alarming visual treatment.

## Tool page composition
- Keep the same light header and footer as the homepage.
- Breadcrumbs above the main title.
- H1 and concise description near the top.
- Centered, readable tool workspace with white surface, thin border, and subtle shadow.
- Input areas should be comfortably large, with visible labels and helpful placeholder examples.
- Primary action uses brand purple; secondary actions use quiet outlined or pale-tint buttons.
- Output/result area should be visually distinct but not over-decorated.
- Place copy/download/reset actions beside the relevant output.
- Put tool-specific instructions, privacy note, FAQs, and related tools below the workspace.
- Do not bury the actual tool below oversized marketing content.

## Responsive behavior
- Mobile-first implementation.
- Header collapses into an accessible mobile navigation pattern.
- Search is full-width on mobile.
- Tool cards use a layout that preserves readable titles and touch targets.
- Tool workspace controls stack vertically on narrow screens.
- Buttons should be easy to tap (aim for at least 44px control height).
- No horizontal overflow at 320px viewport width.
- Keep headings fluid with `clamp()` and avoid awkward line breaks.

## UI quality bar
- Every page must look intentionally designed, not like a default component-library demo.
- Keep spacing, typography, border radii, and button sizes consistent.
- Provide polished loading, empty, validation, success, and error states.
- Visible keyboard focus must be clear and attractive.
- Hover states must have keyboard-focus equivalents.
- Do not use color alone to communicate success or errors.
- No fake charts, fake activity, fake testimonials, fake user counts, or decorative controls that imply unavailable features.
- Prioritize clarity and usability over visual effects.

## Agent instruction
Before coding the final UI, create or refine a small design system (tokens, typography, spacing, buttons, cards, inputs, focus styles). Implement the homepage and one representative tool page first. Check screenshots at mobile and desktop sizes, refine the visual consistency, then apply the system to all tool pages. Keep the initial product light-theme-only.

---

## Implementation decisions and progress — 2026-10-31

This FINAL Brain supersedes the earlier master. The original earlier Brain and upload are preserved for history.

- Inspected clean `main` at dcdd265, no remote. Work continues on `feat/premium-mvp` using the existing Next.js / strict TypeScript / npm / CSS-variable architecture.
- Visual reference archived in `docs/reference/design.png`. Applied final section 14 over the old visual direction: light only, bundled Geist Variable, white workspaces, soft lavender hero, custom lightweight CSS brand illustration, pastel consistent Lucide icons, subtle focus/hover motion with reduced-motion support. No fake account, Pro, payment, PDF tools or inflated tool counts.
- Homepage and representative Word Counter reviewed via desktop and mobile screenshots in `docs/verification` before applying the tool system elsewhere. Responsive accessible mobile navigation added.
- Core tools implemented on separate static routes. Reusable count/case/JSON/password logic is isolated in `lib/tools`. Limits and precision/language assumptions are visible. Secure password generation uses browser crypto rejection sampling and secure shuffle.
- Core verification: 26 unit tests and 4 production-browser workflows passed (large input, empty/invalid JSON, casing, reset, actual clipboard and denied-clipboard fallback). Test selector ambiguity corrected and re-run.
- QR and image tools use local lazy-loaded qrcode and canvas encoding; no remote processing. Image limits: 15 MB, 24 MP, 8,192 px per side. Explicit JPEG transparency/format/metadata/animation disclosures. Object URLs revoked on replacement/unmount; stale async results invalidated.
- Browser utilities verification: 32 unit tests total and 3 additional production-browser workflows passed. Downloaded QR PNG independently decoded using jsQR; image downloads verified as real WebP/JPEG/PNG, 640×480 preserved, JPEG white fill, PNG/WebP alpha retained. Invalid/oversize/corrupt file paths tested.
- Content/SEO phase: per-tool instructions and FAQs, related links, About/Privacy/Terms, icon, generated OG image, robots, conditional canonical/sitemap, custom 404, tool-level error boundary, security headers and no input logging. Legal pages transparently mark operator identity/contact/jurisdiction/provider retention as owner-supplied launch prerequisites.
- `SITE_URL` must be a verified HTTPS origin. Without it, indexing is blocked and no invented production canonicals or sitemap entries are emitted. Preview metadata can use Vercel’s preview host or the explicit local development origin; neither is represented as a production deployment.
- Full accessibility, cross-browser and release checks are in progress; no public production approval or deployment is claimed.

### Quality and release verification update

- Added complete legal/content routes, all SEO/icon assets, static-route error boundary and CSP/HSTS headers. No actual domain, operator entity or privacy email invented.
- Full quality run initially found two defects: mobile Escape handler scope and WebKit pre-hydration input. Fixed header boundary handling/focus and shared hydration readiness (all workspaces disabled until handlers attach). Re-ran original failures, then full suite: **113/113 passed**.
- Automated axe scans passed on all ten public pages and 70 route/viewport overflow checks passed. Browser core/utilities flows passed in Chromium, Firefox and WebKit. No claim of separate Edge, physical iOS or screen-reader certification.
- Added React Testing Library component checks and configuration tests; final unit/component/config total **44/44 passed**. Added deep-JSON guard (128 levels) to prevent stack/pretty-print expansion hazards. Lint, strict type-check and production build passed.
- Isolated local Lighthouse: 99 Performance / 100 Accessibility / 100 Best Practices; preview SEO 63 because indexing is deliberately blocked without `SITE_URL`. A concurrent CPU-contended run scored 75 Performance; both reports are preserved and context documented, not hidden.
- Added formatted readable source and formatting scripts, npm engine declaration, CI workflow, detailed README, verification report and release runbook. Workflow is prepared, not claimed to have run remotely.
- Production dependency audit remains clean; full dev audit has 16 moderate inherited minimatch findings. Investigated upgrades: installed React and JSX accessibility plugins do not support ESLint 10; installed typescript-eslint excludes TypeScript 7. Retained mutually compatible current versions and documented security review gate instead of forcing incompatible upgrades.
- Connector checks: GitHub lookup unsupported in this environment; Vercel disconnected. No remote, push or deployment performed. Standard authorized Git/CLI workflow documented; never request credentials in chat.
- Technical MVP is implemented and locally verified. **Public production release is NOT approved** until real origin/domain, operator/legal/contact/provider details, security-risk review, authorized remote/deployment and actual production verification are complete. Payments/ads/accounts remain deliberately out of scope.

- Final reproducibility check: clean `npm ci`, formatting, lint, 44 tests, production build and type-check all passed again. Screenshot evidence refreshed with populated Word Counter and QR output on desktop/mobile. Only `.env.example` exists; no actual credentials file created.

## Pre-launch dependency and quality audit — 2026-10-31 (supersedes prior release status)

- Inspected clean `feat/premium-mvp` at 9bc73b6 and all history/remotes. Branched safely to `fix/launch-audit`; no user changes discarded, remote added, push or deployment performed.
- Investigated every original moderate npm entry: 16 entries propagated one advisory, GHSA-g3hv-75wg-m249. Added exact graph/table, before/after reports and source/reachability assessment under `docs/security/`.
- Applied scoped override only to `@typescript-eslint/typescript-estree`’s minimatch 10.2.6 → 11.0.3, verified with 80 captured prior-version cases plus real parser project-service call. Preserved callable v3 consumers. **15 raw moderate dev-only findings remain**, due to broad advisory metadata on v3 ancestry; the described v7+ optimizer is absent in inspected v3 source. This is a documented assessment, not an upstream correction or zero-audit claim. Owner/security review or compatible upstream remediation remains required. No suppression, forced downgrade or removal of lint coverage.
- Added explicit `LAUNCH_APPROVED` gate: origin alone no longer enables indexing. Meta/robots/sitemap/X-Robots-Tag agree; Vercel Preview/Development remain blocked. Keep false until real domain/legal/security/preview approval, then production-only rebuild.
- Audited application/config/legal/mobile code. Fixed stale Word Counter copy state, numerical JSON overflow, pre-decode image dimension bounds for JPEG/PNG/WebP and small mobile editable font sizes. Added file preflight/MIME signatures, async lifecycle and clipboard regression tests. Fixed missing dimension-limit import found by build; updated corrupt-file tests to check the earlier rejection path, without weakening validation.
- Standardized Node 22 (.nvmrc, engines, CI) and added vercel.json framework/install/build config; Node 22.23.4 clean npm ci, lint, formatting, **70 tests**, type-check and production build verified. Browser rerun: **123 passed, 2 explicit capability skips** (extra Chromium-only clipboard readback); all six workflows run in Chromium/Firefox/WebKit. Existing coverage retained.
- Reviewed privacy/terms and created `docs/OWNER_INPUTS.md`: operator identity/business form, jurisdiction/markets, real public contact, legally required disclosures, provider retention, domain ownership, licence and security decision must come from the owner. No details invented. Changed initializer ISC label to private/UNLICENSED pending an owner-approved publication licence.
- Latest connection state supersedes prior log: GitHub connector unsupported; Vercel connector enabled and credentials validated. No project/domain/deployment was created or modified. User chooses intended repo/team/domain; normal browser-authorized Git/GitHub/Vercel steps documented, no passwords/PATs requested.
- Authoritative launch runbook is now root **RELEASE_CHECKLIST.md**. Earlier docs/checklist points to it. Full quality report `docs/FINAL_QUALITY_AUDIT.md`; no public release or absolute security/compliance claim.

- Final expanded unit total **70/70 passed**, including real approved/unapproved robots/sitemap outputs. Additional populated workspace axe/overflow checks and reduced-motion behavior passed; final icons/robots/sitemap/header HTTP smoke checks passed. Generated root checklist plus owner-input and security review documents. A self-contained Git bundle is exported outside the repo for a history-preserving handoff; no remote publication is implied.
