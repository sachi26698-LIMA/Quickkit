# Word to PDF Studio V2 — operator setup and capability boundaries

**4 November 2026. Not production-approved.** The existing native engine remains opt-in. Read [the original isolation checklist](WORD_TO_PDF_OPERATIONS.md) before enabling anything. No merge, deployment or host provisioning is part of V2.

## Enable only on an isolated persistent Linux Node host

Install a patched LibreOffice Writer build and legally deployable fonts using your trusted OS source. Record exact versions. Set `WORD_TO_PDF_ENABLED=true` and, if necessary, `WORD_TO_PDF_SOFFICE=/absolute/path/to/libreoffice`, then restart the Node server. The default is disabled. Vercel's default serverless host is not a supported native-engine deployment. No conversion-service API key is used.

`GET /api/word-to-pdf` checks operator opt-in and executable permission, **not** native rendering fidelity, installed fonts or sandbox health. Do not enable based only on its `available` flag.

Mandatory controls remain: unprivileged isolated container, no sensitive inherited environment/secrets, blocked outbound network including cloud metadata, read-only root, quotas for RAM/CPU/processes/temp storage, HTTPS, proxy body/rate limits and no request-body/metadata-header logging or temp backups. The native parser is not a security boundary. Run crash-expiry cleanup for orphaned `quickkit-word-*` directories. The server concurrency gate is one active request **per process**, not cluster-wide.

## V2 data flow

1. Selecting, replacing, renaming or reordering files never uploads bytes.
2. User upload consent plus Convert or a native Refresh authorizes a same-origin request.
3. Native page-size/margins in **All pages** mode, quality/compression/resolution/tagging changes need a new conversion. They mark output stale and disable downloads. Refresh explicitly re-uploads the active DOCX. Separate “Automatically re-upload active DOCX…” consent permits a 1,000 ms debounced refresh of a previously converted active file. It defaults off, is disabled without upload consent/engine availability, and turns off on consent revocation or clearing files. No auto-conversion of newly selected documents.
4. The V2 client requests `X-Quickkit-Base: true`. The endpoint returns the real native PDF before local edits; legacy requests still receive final processed PDFs. The response uses the existing bounded NDJSON transport, no third-party host.
5. One retained native base per file supports repeatable **local** edits. Headers, footers, numbering, background, rotation, metadata, source-page include/exclude/order and selected-page PDF geometry regenerate after a 400 ms debounce. Browser PDF transformations are serialized; superseded tasks are aborted/discarded. No native re-upload is needed for these edits.
6. Server final export and browser live updates use `process-pdf.ts`. Preview is built from the same byte array downloaded by individual/ZIP export. A complete settings fingerprint plus native-settings key gates export; stale/invalid output is not downloadable. ZIP contains only synchronized successes plus a completion report; JSON reports identify errors and stale entries.

Settings are URI-encoded in a request header to support Unicode metadata. Configure proxies not to log `X-Quickkit-Settings`; metadata may be private. App request headers remain bounded to 8 KiB. Do not put document content into URLs.

## Limits / memory

Existing server limits: 10 files / 20 MiB each / 80 MiB input queue, 100 MiB expanded ZIP / 2,000 entries / 40 MiB per entry, 120-second native deadline and 150-second total request deadline, 50 MiB per PDF, provisional 100 rendered pages. Page count is known only after rendering, so host quotas are essential. No 1,000-page support or performance claim.

V2 retains both native and edited PDFs, so the **combined retained PDF byte budget is 120 MiB**, not the former 100 MiB edited-output-only budget. Preview/parse/ZIP operations can temporarily duplicate buffers beyond retained bytes; this is not a peak-RSS guarantee. Browser transforms and queue thumbnails are serialized. Search reads pages sequentially and cancels superseded tasks. Main/compare canvases use a per-canvas 8-million-pixel bound through the additive PDF preview option; page thumbnails are lazy. Original DOCX HTML comparison is limited to 5 MiB to constrain DOM memory; native conversion accepts the original 20 MiB limit. Verify actual desktop/mobile memory and cancellation on the deployment host before release.

PDF handles are destroyed on replacement/unmount; object URLs and pending thumbnail results are revoked, fetches are aborted on unmount, and search tasks are destroyed on changes/cancel. Clearing files removes retained PDFs and per-file settings/history; global settings remain until Reset or tab closure. No localStorage/IndexedDB retention is introduced. Fullscreen is an accessible **full-viewport workspace mode**, using CSS rather than permission-dependent browser Fullscreen API requests; it works inside embedded previews and exits with Escape.

## Honest capability boundaries

- **All pages** size/margins reflow native DOCX sections. **Selected pages** scales already-paginated PDF content into new dimensions/margins; this is not selective Word reflow. Links with unusual quadrilaterals/structure can require review.
- Page ranges, order, selective layout and overlay ranges use source-PDF page numbers after native pagination. Numbering follows final output order. First-page numbering can be omitted; the next page starts at the chosen value. Arabic and Roman (up to 3,999 including the page count) are supported.
- Custom header/footer/number styling is shared. Overlays are basic Latin only and can overlap source content; reserve space. Document text itself is not restricted to Latin. Empty metadata fields preserve native metadata, not redact it.
- Native text export is used without forced rasterization. Forced text outlines, arbitrary text replacement and a font-substitution editor are **not supported**; the UI shows the fixed text mode read-only. Font embedding is automatic where engine availability/licensing permits, not a guaranteed user-controlled operation. Tagged native PDF is best-effort; page copies/geometry changes can degrade tags, outlines and links. No PDF/UA certification.
- Original DOCX comparison renders the actual validated package locally with docx-preview; it is labelled approximate and is not a Microsoft Word reference PDF. Before/after shows the native PDF versus edited export. Search reads a PDF text layer, with no OCR, substring matching by page and no word-location highlighting.
- Background streams sit behind content. Opaque Word backgrounds or images are not made transparent. PDF image/transparency/font fidelity remains native-engine dependent.
- Automatic High/Print presets request lossless **image encoding**, not lossless document conversion. Explicit JPEG settings override that choice. Print is not PDF/X, CMYK, bleed or press certification.
- **No numeric pre-conversion file-size estimate** is provided: input DOCX size does not predict rendered PDF size reliably. The interface explicitly says this and reports actual bytes after conversion.

## Release gate

Native DOCX visual/reference testing (complex tables, charts, transparency, fonts/scripts, headers/footers, mixed page sizes), isolated-host security/fault retention, font licensing/embedding, link/tag fidelity, long-document memory stress and cross-browser/assistive-technology review remain required. Do not turn on or advertise production conversion based on the labelled mocked-transport screenshots/tests. See [V2 QA](WORD_TO_PDF_V2_QA.md).
