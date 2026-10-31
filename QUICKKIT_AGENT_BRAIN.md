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

## Implementation log — 2026-10-31 (Phase 1)

- Inspected `/home/user`: only uploaded Brain file, no source repository, lockfile, framework or Git history. Original upload preserved unchanged.
- Initialized `/home/user/quickkit` with `main` branch, Next.js 16.4.3 App Router, React 19.3.1, strict TypeScript, npm lockfile and Lucide.
- Styling decision: dependency-light plain CSS with the specified design tokens, instead of Tailwind. No additional styling framework required.
- Built global header/footer, responsive homepage, catalog, live keyword search, working category filters, Escape/clear behavior, empty results, skip navigation, focus styles and reduced-motion support.
- Tool cards are intentionally informational and explicitly marked “Planned · Phase 2/3”; stable interactive tool routes and card links will ship with the real implementations, not fake placeholder tool pages.
- About navigation currently links to the real homepage project section. Standalone About, Privacy and Terms pages remain Phase 4, and unimplemented footer links are not displayed.
- Basic metadata and icon provided; indexing intentionally disabled until MVP content and real production origin are ready.
- Verified lint, strict type-check, production build, 7 Vitest tests and 9 Chromium Playwright tests, including overflow at seven widths (320–1440px).
- Fixed initial tsconfig syntax errors and lint issues. Browser runner initially lacked libnspr4; installed Playwright Linux dependencies. Browser test exposed skip-link focus defect; added main tabIndex=-1 and verified the fix.
- Production audit: 0 vulnerabilities. Full audit: 16 moderate development-tool advisories rooted in minimatch; unsafe legacy downgrade rejected. Must revisit before release.
- No GitHub remote or deployment configured. No owner identity, company details, domain or contact invented. No cross-browser/full accessibility audit claimed.
- Phase 1 complete; Phase 2 next. MVP is NOT complete or production-release approved.
