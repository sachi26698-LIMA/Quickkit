# V4 evidence — actual unavailable state, NOT native success

4 November 2026. See `../../WORD_TO_PDF_V4_QA.md` and setup/fidelity/benchmark reports.

- `desktop-engine-unavailable.png`, `mobile-engine-unavailable.png`: actual final-build browser state at 1440×1000 and 390×844 viewport sizes (full-page captures). Synthetic `complex.docx` selected locally, explicit consent checked, Convert disabled, zero upload POSTs. Existing fixed page navigation/action bars remain in full-page screenshots. No converted/fake page content.
- `fixtures/complex.docx`: authored source with merged table, image, cache-only chart, custom-font request, header/footer/hyperlink/page breaks and mixed A4 portrait/Letter landscape sections. Package validation passed; no native visual validation.
- `fixtures/{100,500,1000}-pages.docx`: page-intent source inputs; explicit breaks validated but actual rendered counts unknown. These are not large-file support claims.
- `native-benchmark-blocked.json`: actual no-consent/no-upload CLI run (exit 2), null native/browser metrics, exact environment blocker added as audit context.
- `observed-app-health.json`: actual unmocked local final-build API response, unavailable and 100-page cap.
- `artifact-manifest.json`: SHA-256 and sizes of this archive's exact artifacts. Native PDF demo is null because none exists.

Do not relabel V3 authored/mock-native output as a genuine V4 conversion. No proprietary fonts, user files, secrets or simulated native timings are included. Operator regeneration can change DOCX metadata timestamps; retain exact source hashes with real native results. The V3 archive's exact committed bytes were preserved after regression tests regenerated those old test outputs.
