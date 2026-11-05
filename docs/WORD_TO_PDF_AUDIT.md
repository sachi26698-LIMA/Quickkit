# Word to PDF — feasibility audit (4 November 2026)

## Repository inspection
Next.js App Router / React / TypeScript; existing PDF tools are client-side. `@cantoo/pdf-lib` supplies PDF editing, `pdfjs-dist` supplies canvas previews, and shared `download.ts` / `zip.ts` supply export. PDF-to-Word has its own sequential batch orchestration, not a generic shared batch engine. Reuse the existing preview/download/ZIP primitives; do not change existing conversion engines.

## Engine selection
- docx-preview (already installed): HTML preview, not an authoritative Word pagination or PDF engine. Browser printing has browser-dependent layout, cannot provide controlled PDF bytes, and cannot honestly meet this request.
- Mammoth / HTML + PDF: semantic extraction loses complex layout, section headers, floating objects and pagination. Rejected.
- LibreOffice native: established DOCX import and native PDF export; handles tables, links, images, headers and sections, subject to font availability and Office compatibility differences. Selected as an **opt-in, self-hosted server engine**.
- LibreOffice WASM / commercial browser SDKs: no audited, installed, production-supported local WASM conversion engine in this project. Commercial SDKs require separate licensing/security review. Not silently introduced.
- Hosted conversion APIs: rejected to avoid third-party disclosure and secrets.

## Privacy / deployment boundary
No DOCX bytes are sent until the user explicitly consents and starts conversion. Native LibreOffice must be installed by the operator and enabled using WORD_TO_PDF_ENABLED=true. It is not installed in this sandbox. Default is unavailable, not a fake browser conversion. This requires a persistent Node host, not a default Vercel serverless deployment. The endpoint fails closed when unconfigured. Inputs and intermediate outputs use an isolated temporary directory removed after every request. No third-party conversion service is used.

Production enablement requires a low-privilege, network-disabled container, read-only root, bounded tmpfs, CPU/RAM/process quotas, request rate limits and trusted reverse-proxy body limits. Native document parsers are not a security boundary. The app-level concurrency gate is process-local; use a single replica or an external queue. Do not enable on an unrestricted general-purpose host. Infrastructure isolation cannot be provided by a Next.js route alone.

## Capability boundaries
No lossless claim. Missing/unlicensed fonts may substitute; Word charts, floating objects, fields, tracked changes and complex sections require visual review. Image preservation uses native export without intentional downsampling in high/print presets, not a guarantee. Print preset is not certified PDF/X, CMYK, bleed or press approval. Fonts embed only as supported by LibreOffice and font licensing. Custom header/footer/numbering are PDF overlays, not Word reflow; allow adequate margins. Original page dimensions/margins are preserved by default; overrides apply to every section. Selected pages refer to the converted pagination.

Conservative limits: 10 DOCX files, 20 MiB each, 80 MiB total queue, 100 MiB expanded DOCX, 2,000 ZIP entries, one conversion per server process, 120 seconds per native conversion, 100 converted pages, 50 MiB PDF output. **1,000-page support is disabled pending native-engine stress tests.** Progress is real workflow stages, not invented page percentages; native LibreOffice does not expose reliable per-page conversion progress.
