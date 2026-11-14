# Security & Privacy advanced upgrade report

### Latest password and integrity changes

The local strength heuristic detects repeated multi-character segments and caps its score for that pattern without echoing the password. Hash comparison reports lengths, differing lengths, legacy-algorithm limitations and trusted-reference caveats without returning digests. Focused unit tests and production Chromium passed; neither implies comprehensive breach detection or authenticated integrity. Full unit suite after these changes: **124 files / 1,889 passed**; build, typecheck, ESLint and Prettier passed.

## Current deep-upgrade checkpoint

The historical scope below predates consolidation; there are currently nine workbenches with 60 retained operation tabs, not 60 catalog workspaces. `SECURITY_PRIVACY_OPERATION_CHECKLIST.md` enumerates the exact state and limitations of each operation. Status remains **incomplete**.

Changes in this checkpoint: request-header analysis now flags Basic and repeated Authorization, proxy/API credentials, ambiguous Content-Length/Transfer-Encoding, duplicate Host, forwarded headers and referer query exposure without echoing values or custom header names; malformed controls/folded lines are rejected. SPF review distinguishes direct terms from actual evaluated DNS lookups, flags duplicate modifiers, ignored redirect and selected malformed mechanisms; DMARC flags tag ordering. URL pattern review can process up to 25 independent inputs locally, report per-entry errors, and export without query/credential values; it does not contact hosts or establish safety. Focused tests and browser tests passed; full Chromium: **987 passed, 3 screenshot-only skipped / 990**, with all three passing separately when capture was enabled. Full Vitest retry: **1,887 passed** after an intermittent QR timeout on the first run. No external DNS/IP response is claimed live.

Live TLS remains unsupported: before exposing any public checker an owner must authorize an isolated, egress-restricted service and reliable shared per-client/global rate limits. The transport must pin vetted DNS results per connection, reject private/reserved IPv4/IPv6 including mapped/transition addresses, disallow unsafe redirects or re-resolve/revalidate each hop, limit time/bytes/concurrency and undergo adversarial and independent review. Provide a permitted network environment to verify Cloudflare DNS/ipify and browser CORS. No production credentials or configuration were requested or changed.


2026-11-13 UTC · branch `arena/ca3f5bd0-quickkit` · **incomplete**

## Scope and status

The public catalog has **57 purpose-built Security & Privacy workspaces plus 3 reused password, hash and Base64 routes** (60 related routes total). All 60 returned HTTP 200 in the local dev environment; HTTP status is not functional or browser verification. The original inventory maps **72 requested capabilities**: 67 implemented with documented limitations, 4 with external verification blocked, and 1 not implemented (live HTTPS status). None are claimed fully implemented and individually tested against all acceptance criteria. The inventory also records the additional capabilities requested in this upgrade.

## Latest functional-acceptance work

Added Unicode-consistent password strength scoring and optional local policy composition checks, duplicate-member rejection for JWT/JWK parsing, optional IPv4/IPv6-capable ipify lookup with consent and bounded streaming, stricter cookie-attribute review, and shallow PDF attachment/annotation/form indicators. No live HTTPS/TLS backend or simulated live results were added. PDF cleaning remains limited; DNS/IP live operation and CORS remain unverified.

Tests now exercise processing on all 57 dedicated routes plus the 3 reused routes in Chromium. The **54 targeted security browser tests and 2 reused password/Base64 tests passed** against the local production build; network responses were mocked, and route coverage is not exhaustive acceptance of the 72 overlapping capabilities. Real browser file round trips, selected downloads and clipboard, JWT verification and certificate comparison were checked. AES-GCM interoperates with Node; HMAC includes RFC 4231. Full Vitest: **123 files / 1,873 tests passed**; build, lint, format, typecheck and audit pass, 0 vulnerabilities. The 72 statuses remain 0 fully accepted, 67 limited, 4 externally blocked and 1 unimplemented. See inventory, test report and continuation for exact evidence and unfinished work.

## Latest full Chromium result

Four-worker full run: **951 passed, 11 failed, 3 skipped / 965**. All 11 failures passed a serial retry, but this is not a clean full-suite pass. Four failures involved missing trace artifacts after an overlapping targeted Playwright run cleared the shared artifact directory; seven were timeouts or timing-sensitive. The separately added five per-algorithm hash tests passed, but were not included in the 965. See test report for detail.

## Earlier hydration and verification checkpoint

The homepage category grid now receives server-computed catalog counts instead of recomputing them in the client. Restarted development and verified the homepage, navigation, category and explorer in Chromium without captured hydration errors. Current catalog: 99 unique routes overall; Security & Privacy has 60 category entries (57 dedicated workspaces and 3 reused routes), distinct from the 72 overlapping requested capabilities. All 60 security routes rendered in Chromium; this is not individual functional acceptance. Stale fixed tool counts and inaccurate local-only exceptions in touched site descriptions were corrected.

Security.txt validation now rejects invalid normalized calendar dates, handles leap years/timezone validation, and clearly rejects unsupported leap seconds. It is still a static partial review, not a live security scan or full RFC conformance check.

At that checkpoint: **122 Vitest files / 1,859 tests passed**; production build, typecheck, lint, format, and dependency audit passed (0 vulnerabilities). Full Chromium: **903 passed, 8 failed, 3 skipped**, with all 8 failed cases subsequently passing serially (the password assertion was updated to require the accurate entropy upper-bound wording). The full suite was not rerun clean in one pass. Details and limitations in the test report. No external live checks or deployment.

## Latest completion-phase additions

- The offline certificate inspector optionally compares a user-supplied DNS hostname with DNS SAN entries using exact and single-label wildcard matching, with IDN input support. Generated-certificate, mismatch and invalid-input tests pass. It does not check a live server, IP SAN, CN fallback, certificate signature, chain, trust or revocation; a match is not proof of identity.
- DKIM pasted-record and opt-in TXT review now locally import RSA public keys in PKCS#1 or SPKI form, report modulus size and flag small keys; Ed25519 key length/import is checked when supported. Real generated RSA-key tests and invalid/revoked key cases pass. This is not DKIM message-signature verification, DNS authenticity or proof of key ownership.
- No arbitrary URL backend was introduced: a review found no shared rate limiter, while safe production operation requires public-address classification, pinned DNS, rebinding and redirect defenses, limits, deadlines, and distributed abuse controls. A safe live backend and authorized integration testing remain open.

## Earlier changes

- Added local `/tools/hmac-generator-verifier`: SHA-256/384/512, UTF-8 or hexadecimal shared keys, tag generation and `crypto.subtle.verify`. Known vectors, Unicode, invalid keys/tags and UI control tests pass. HMAC is not a digital signature.
- Added `/tools/rsa-cryptography`: RSA-OAEP SHA-256 2048/3072-bit key generation, short-text encryption/decryption, and RSASSA-PKCS1-v1_5 SHA-256 signature verification with supplied JWKs. Private key is unencrypted and hidden until explicitly revealed; separate download requires explicit action. Round-trip, tampering, wrong-key, size and UI tests pass. Key ownership and trust are not established. File encryption remains AES-GCM and is bounded to 25 MiB.
- Enhanced batch hashing: optional trusted JSON manifest verification reports matched, mismatched, absent and extra references; groups possible duplicates by size and digest. Unit tests cover vectors and failure cases. Digest matches do not prove authenticity or byte-for-byte equality.
- File Privacy Checker accepts arbitrary files for bounded magic-byte, extension and MIME hints and retains limited PDF/DOCX/image inspection. Unit tests cover spoofing and unknown files; this is not malware detection, full MIME validation or proof of privacy.
- Header review flags selected CORS risks; cookie review checks prefix and Partitioned requirements; HSTS catches duplicate max-age. Added `/tools/url-safety-review` for offline suspicious-pattern hints. These do not contact a site, evaluate actual origin reflection or establish URL safety.
- Existing DNS, metadata, JWT, passwords and compliance tools remain in place. See per-item inventory for features and constraints.

## Verification

- Prior Node 26 full Vitest: **121 files / 1,856 tests passed** after the offline certificate and DKIM improvements. An earlier full run exposed a catalog search-order regression from the new RSA name; renamed the display name and reran successfully without weakening tests.
- Production build, TypeScript, ESLint, Prettier and full dependency audit passed; audit reports **0 vulnerabilities**.
- In the preceding phase, Playwright tests for HMAC download/reset, narrow URL review and RSA key reveal could not launch. They have now passed in Chromium, as described above. External DNS/IP services cannot be reached from the sandbox allowlist; CORS and live results remain unverified.
- No push, merge or deployment performed.

## Outstanding

Live HTTPS and TLS verification needs a safely reviewed public-address-only DNS-pinned transport, redirect/rebinding protection, deadlines and reliable shared rate limiting. Browser APIs cannot directly inspect arbitrary remote TLS certificates. DNSSEC independent validation, recursive SPF, actual DKIM signature and DMARC alignment checks, comprehensive PDF sanitization, complete file-type detection, expanded local configuration features, and individual tool browser/mobile/clipboard/download/accessibility verification remain incomplete. See `SECURITY_PRIVACY_CONTINUATION.md` for next steps. Neither the offline certificate inspector nor pasted-data reviews should be presented as a live scan.
