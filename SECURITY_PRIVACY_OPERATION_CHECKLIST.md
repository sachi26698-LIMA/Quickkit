# Nine security workbenches — operation-level implementation checklist

This is an engineering checklist, not an independent security audit. Status **partial** means a genuine implemented core with material limitations or pending acceptance; **external** means an optional external lookup exists but has not been independently verified from this restricted sandbox; **unsupported** means the requested capability is absent. The same status does not mean all operations have the same maturity. Existing legacy slugs identify operations, not new routes. All 60 operations below are retained.

## Password security (`password-generator`)
| Operation | Current processing / acceptance gap |
|---|---|
| password-generator | Partial — CSPRNG generation and configurable settings; not breached-password screening. |
| password-strength-checker | Partial — offline pattern heuristic including repeated segments; not a breach or comprehensive guessability check. |
| passphrase-generator | Partial — random selection from compact local dictionary; entropy depends on actual dictionary. |
| password-entropy-calculator | Partial — random-uniform upper bound only, not human password strength. |
| password-policy-generator | Partial — local sample check and editable policy draft; no external blocklist. |
| secure-random-string-generator | Partial — rejection-sampled custom alphabet; secret export must remain explicit. |

## Hash and file integrity (`hash-generator`)
| Operation | Current processing / acceptance gap |
|---|---|
| hash-generator | Partial — text/files, multiple hashes, batches and manifest comparison; legacy algorithms labeled and trusted checksum needed for authenticity. |
| hash-comparison | Partial — local hex comparison and length/caveat report; no independent source authenticity. |
| file-privacy-checker | Partial — bounded signature and selected metadata hints, not malware detection or exhaustive sanitization. |

## Encryption and cryptography (`advanced-cryptography`)
| Operation | Current processing / acceptance gap |
|---|---|
| text-encryption | Partial — local PBKDF2/AES-GCM authenticated envelope; password strength and key recovery remain user responsibilities. |
| file-encryption | Partial — local AES-GCM, 25 MiB cap, corrupt/wrong key rejected; large streaming encryption unsupported. |
| encryption-key-generator | Partial — random 256-bit hex, safe handling remains user responsibility. |
| rsa-cryptography | Partial — OAEP encryption/decryption and separately generated RS256 signing/verification keys; no trust/key ownership check. |
| hmac-generator-verifier | Partial — local SHA-256/384/512 and independent vectors; no key ownership guarantee. |
| jwt-decoder | Partial — local decode and optional HS256/RS256 verification, issuer/audience/time checks; not application authorization. |
| jwt-generator | Partial — HS256 test tokens with supplied key; no production identity service. |
| base64url-converter | Partial — local UTF-8/Base64URL; encoding is not encryption. |
| base64-encoder-decoder | Partial — reused text/file converter; independent Developer Tools route retained for compatibility. |

## DNS and email (`dns-email-security`)
| Operation | Current processing / acceptance gap |
|---|---|
| dns-lookup | External — consent-gated fixed Cloudflare DoH, selected types and 10-name batch, mocked tests; live egress/CORS unverified. |
| dnssec-status-checker | External — resolver-reported AD flag only, not independent chain validation; live egress unverified. |
| email-header-analyzer | Partial — parses supplied headers, authentication results untrusted, no sender verification. |
| spf-record-checker | Partial — static review or opt-in resolver TXT lookup; no recursive authorization evaluation, live egress unverified. |
| dkim-configuration-checker | Partial — static tags/public-key structure or selector lookup; no message-signature verification, live egress unverified. |
| dmarc-record-checker | Partial — static tags or exact-domain TXT lookup; no organizational fallback, alignment or live verification. |

## Website security (`website-security-review`)
| Operation | Current processing / acceptance gap |
|---|---|
| security-headers-analyzer | Partial — actionable static findings from pasted response headers; no live site check. |
| csp-generator | Partial — configurable starter with allowlisted origin; application-specific policy and testing required. |
| csp-analyzer | Partial — static indicators, not complete CSP parsing or effective-policy testing. |
| certificate-inspector | Partial — parses PEM, dates, fingerprint and DNS SAN offline; no live TLS, trust chain or revocation. |
| cookie-security-analyzer | Partial — pasted Set-Cookie attributes, no browser acceptance or complete cookie audit. |
| hsts-checker | Partial — pasted directives, does not verify HTTPS delivery or preload enrollment. |
| permissions-policy-generator | Partial — four selectable features, browser support varies. |
| referrer-policy-generator | Partial — policy selection and explanation; no live effective policy. |
| x-frame-options-checker | Partial — pasted value interpretation, no effective framing test. |
| robots-security-review | Partial — static count and access-control caveat; no URL access tests. |
| security-txt-generator | Partial — generation/static checks, no live reachability, publication or signature validation. |
| website-privacy-config-review | Partial — supplied header review, no external scan. |
| live HTTPS/TLS inspection | Unsupported — requires reviewed DNS-pinned public-only transport, redirect validation and reliable shared rate/abuse controls; no unsafe proxy added. |

## Privacy and metadata (`privacy-metadata-manager`)
| Operation | Current processing / acceptance gap |
|---|---|
| image-metadata-inspector | Partial — selected metadata markers/dimensions, not all image formats/hidden data. |
| image-metadata-remover | Partial — browser PNG re-encoding; may alter image features, no guarantee about all sensitive visible content. |
| pdf-metadata-viewer | Partial — selected metadata and shallow indicators; cleaning document/page references does not guarantee complete removal and may invalidate signatures. |
| document-metadata-inspector | Partial — PDF and DOCX selected properties plus shallow package indicators, not comprehensive content inspection. |
| sensitive-information-detector | Partial — heuristic email, phone and Luhn card patterns; false negatives/positives. |
| personal-information-masker | Partial — same heuristics; manually review before release. |
| text-redaction | Partial — exact-match local replacement, not PDF/image redaction. |

## URL, IP and browser privacy (`url-network-privacy`)
| Operation | Current processing / acceptance gap |
|---|---|
| url-safety-review | Partial — offline syntax flags and 25-entry local batch/export; not a phishing/reputation check. |
| public-ip-information | External — consent-gated fixed ipify IPv4/dual-stack lookup, mocked tests; live egress unverified. |
| browser-privacy-checker | Partial — exposed browser signals only, cannot inspect hidden settings. |
| browser-permission-checker | Partial — supported Permissions API states only; no prompting or hidden setting access. |
| third-party-cookie-information | Partial — education, no false cookie-blocking detection. |
| tracking-protection-guide | Partial — education, not verification of browser configuration. |
| fingerprinting-education | Partial — education without collecting a fingerprint. |
| privacy-settings-checklist | Partial — manual self-assessment, not verified browser settings. |

## Privacy policy and compliance (`privacy-policy-workbench`)
| Operation | Current processing / acceptance gap |
|---|---|
| privacy-policy-generator | Partial — user-fact draft only; qualified legal review required. |
| cookie-policy-generator | Partial — user-fact draft only; qualified legal review required. |
| gdpr-checklist | Partial — manual guidance, not compliance determination. |
| data-retention-policy-generator | Partial — user-fact draft only; qualified legal review required. |
| consent-notice-generator | Partial — user-fact draft only; qualified legal review required. |
| data-processing-agreement-generator | Partial — user-fact draft only; qualified legal review required. |

## API credentials (`api-credential-tools`)
| Operation | Current processing / acceptance gap |
|---|---|
| api-key-format-validator | Partial — syntactic validation only, no provider validity/ownership check. |
| api-request-header-analyzer | Partial — pasted-header credential, framing and proxy findings without echoing values; never confirms TLS/server configuration. |
| bearer-token-formatter | Partial — local format only, does not verify token or send a request. |

## Work queue and evidence

- [ ] Expand processing and test security-sensitive edge cases in each applicable operation without falsely presenting limited checks as complete.
- [ ] Public TLS service: obtain owner-approved infrastructure, isolation, trusted client identity and distributed abuse controls before exposing it; add public-address classification, DNS pinning, deadlines, redirect/response limits and adversarial tests before deployment.
- [ ] Validate real external resolver/IP calls and CORS in an authorized environment with permitted egress. DNSSEC AD is not independent validation; SPF/DKIM/DMARC record presence is not message authentication.
- [x] Rerun full Chromium after legal test isolation: 987 passed, 3 screenshot-only skipped / 990; all three passed in a separate `CAPTURE_SHOTS=1` run after fixing one missing navigation. Firefox/WebKit remain untested and their browser-specific skips are not represented by the Chromium result.
- [ ] Run focused unit and real browser tests, full checks and document exact results. Do not treat an HTTP 200, mocked response, or one screenshot as complete operation acceptance.
