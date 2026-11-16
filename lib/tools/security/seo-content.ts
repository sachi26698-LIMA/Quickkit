import type { ToolSeoEntry } from "@/lib/tool-seo-content";

export type ConsolidatedSecuritySlug =
  | "advanced-cryptography"
  | "dns-email-security"
  | "website-security-review"
  | "privacy-metadata-manager"
  | "url-network-privacy"
  | "privacy-policy-workbench"
  | "api-credential-tools";

export type SecuritySuiteSeoEntry = ToolSeoEntry & {
  seoTitle: string;
  seoDescription: string;
  headingDescription: string;
  steps: string[];
  faqs: { q: string; a: string }[];
};

/**
 * Verified SEO metadata, specifications, worked examples, steps and FAQs for
 * the 7 consolidated Security & Privacy suites served by
 * `app/(public)/tools/[calculator]/page.tsx`.
 *
 * Kept separate from `TOOL_SEO_CONTENT` so the Phase 3 Batch C registry test
 * (`tests/tool-seo-batch-c.test.tsx`) retains its exact 31-key contract while
 * every consolidated security page receives rich, engine-verified SSR content.
 */
export const SECURITY_SUITE_SEO_CONTENT: Record<
  ConsolidatedSecuritySlug,
  SecuritySuiteSeoEntry
> = {
  "advanced-cryptography": {
    seoTitle: "Encryption & Cryptography — AES-GCM, RSA & JWT",
    seoDescription:
      "Encrypt text and files with AES-256-GCM, generate RSA-OAEP and RS256 keys, verify HMAC digests, and inspect or sign test JWTs locally in Web Crypto.",
    headingDescription:
      "Nine Web Crypto operations in one browser-local workspace: AES-256-GCM text and file encryption, 256-bit key generation, RSA-OAEP and RS256 JWK key pairs, HMAC verification, JWT inspection and Base64/Base64URL encoding.",
    stepsHeading: "How to run local encryption, signing, and token checks",
    faqsHeading: "Encryption & cryptography questions, answered",
    relatedHeading: "More ways to protect data and credentials",
    referenceHeading:
      "Encryption & Cryptography: algorithms, limits, and key rules",
    referenceIntro:
      "Every cryptographic primitive in this suite uses the browser's built-in Web Crypto API (`crypto.subtle` and `crypto.getRandomValues`). Plaintext, keys, passwords and files stay in page memory and are cleared when you switch tabs or leave the page.",
    specsTitle: "Encryption & Cryptography specifications",
    specs: [
      {
        label: "Symmetric encryption",
        detail:
          "AES-256-GCM with a fresh random salt, random IV, and PBKDF2-SHA-256 key derivation (600,000 iterations). Text input up to 1,000,000 UTF-8 bytes; file encryption up to 25 MiB in the QUICKKIT QKENC1 format.",
      },
      {
        label: "RSA operations",
        detail:
          "Generates 2048-bit or 3072-bit JWK key pairs, keeping RSA-OAEP (SHA-256) encryption keys separate from RSASSA-PKCS1-v1_5 (RS256) signing keys. Accepts public/private JWKs with 2048–8192-bit moduli up to 30,000 characters.",
      },
      {
        label: "HMAC digests",
        detail:
          "HMAC-SHA-256, HMAC-SHA-384, and HMAC-SHA-512 over messages up to 1,000,000 UTF-8 bytes using UTF-8 or hexadecimal keys between 16 and 4,096 bytes.",
      },
      {
        label: "JWT inspection & test signing",
        detail:
          "Decodes header and payload claims offline without trusting unverified tokens, verifies HS256 or RS256 signatures with a user-supplied key, and signs local HS256 test tokens.",
      },
      {
        label: "Key & Base64 utilities",
        detail:
          "Generates 256-bit hexadecimal keys via `crypto.getRandomValues`, converts UTF-8 text to URL-safe Base64URL, and encodes or decodes Base64 text and files up to 10 MB.",
      },
    ],
    examplesTitle: "Encryption & Cryptography examples",
    examples: [
      {
        scenario: "Password-encrypted note",
        input:
          "UTF-8 note and passphrase in AES-GCM Text Encryption & Decryption",
        output:
          "Authenticated QKENC1 envelope with random salt and IV, decryptable only with the same passphrase in this tool",
      },
      {
        scenario: "Webhook HMAC check",
        input: "JSON webhook body, 32-byte shared secret, and SHA-256 tag",
        output:
          "Constant-time Web Crypto verification reporting whether the hexadecimal tag matches",
      },
      {
        scenario: "JWT claim & signature review",
        input: "Three-part JWT string and public RS256 JWK",
        output:
          "Decoded JSON claims plus local cryptographic verification of the RS256 signature",
      },
    ],
    privacyNote:
      "Keys, passphrases, tokens and files are processed strictly in this browser tab. Keep backups of passwords and keys in a secure manager — lost encryption passwords cannot be recovered.",
    steps: [
      "Select the operation tab you need — AES-GCM text or file encryption, key generation, RSA JWK tools, HMAC, JWT decode/sign, or Base64/Base64URL.",
      "Provide your input and cryptographic key or passphrase locally. Use strong random keys (at least 16 bytes for HMAC, 2048+ bits for RSA) rather than short passwords.",
      "Run the operation in Web Crypto and inspect the output or verification status, noting format boundaries such as the non-interoperable QKENC1 envelope.",
      "Copy or download any needed output before switching tabs, as changing operations clears the active workspace from memory.",
    ],
    faqs: [
      {
        q: "Can another tool decrypt a QKENC1 AES-GCM file or text envelope?",
        a: "No. While the underlying cipher is standard Web Crypto AES-256-GCM with PBKDF2-SHA-256 (600,000 iterations), the QKENC1 header layout is specific to QUICKKIT and does not preserve original filenames inside encrypted files.",
      },
      {
        q: "Why does RSA key generation separate encryption and signing keys?",
        a: "Reusing one RSA key pair for both RSA-OAEP decryption and RSASSA-PKCS1-v1_5 signing weakens key hygiene. Generating dedicated JWK pairs enforces cryptographic key separation.",
      },
      {
        q: "Does decoding a JWT mean its claims are trustworthy?",
        a: "No. Base64URL decoding only reveals what the sender placed in the header and payload. Claims should only be trusted after verifying the signature against the expected algorithm and key, and checking expiration and audience rules.",
      },
      {
        q: "Are my secret keys or files uploaded anywhere?",
        a: "No. Every operation in this suite runs locally in your browser using Web Crypto. Nothing is transmitted to QUICKKIT or any external server.",
      },
    ],
  },

  "dns-email-security": {
    seoTitle: "DNS & Email Security — SPF, DKIM, DMARC & DNSSEC",
    seoDescription:
      "Review SPF, DKIM, DMARC and pasted email headers offline, or run optional consented Cloudflare DNS and DNSSEC lookups for public ASCII domains.",
    headingDescription:
      "Inspect email authentication records (SPF, DKIM, DMARC) and pasted message headers offline, or query public DNS records and DNSSEC status through Cloudflare DNS-over-HTTPS after explicit consent.",
    stepsHeading: "How to review email authentication and DNS records",
    faqsHeading: "DNS & email security questions, answered",
    relatedHeading: "Related network, header, and security tools",
    referenceHeading:
      "DNS & Email Security: offline parsers and consented DNS queries",
    referenceIntro:
      "Four operations in this workspace — Email Header Analyzer, SPF Record Checker, DKIM Configuration Checker, and DMARC Record Checker — parse pasted text entirely offline. Only DNS Lookup and DNSSEC Status Checker send a network query, and only to Cloudflare (`https://cloudflare-dns.com/dns-query`) when you explicitly submit a public domain.",
    specsTitle: "DNS & Email Security specifications",
    specs: [
      {
        label: "Supported DNS record types",
        detail:
          "A, AAAA, MX, TXT, NS, CNAME, and CAA via Cloudflare DNS-over-HTTPS (`do=true`), for validated public ASCII domain names up to 253 characters.",
      },
      {
        label: "Domain validation",
        detail:
          "Rejects URLs, IP addresses, single-label hosts, and reserved local suffixes (`localhost`, `local`, `internal`, `invalid`, `test`, `arpa`) before any query is sent.",
      },
      {
        label: "DNSSEC check",
        detail:
          "Requests DNSSEC data and inspects the public resolver's Authenticated Data (`ad`) flag and RCODE status without performing local trust-anchor chain validation.",
      },
      {
        label: "Offline SPF, DKIM & DMARC review",
        detail:
          "Reviews pasted `v=spf1` mechanisms and `all` qualifiers, `v=DKIM1` key tags (`k=`, `p=`), and `v=DMARC1` policies (`p=`, `sp=`, `pct=`, `rua=`, `ruf=`) without live DNS recursion.",
      },
      {
        label: "Email header analysis",
        detail:
          "Parses pasted `Received` hops and `Authentication-Results` lines locally, flagging that raw header text can be forged by upstream senders unless verified by your receiving mail server.",
      },
    ],
    examplesTitle: "DNS & Email Security examples",
    examples: [
      {
        scenario: "Strict SPF record review",
        input: "v=spf1 include:example.com -all",
        output:
          "Offline syntax breakdown confirming v=spf1 prefix, include mechanism, and hard-fail -all qualifier",
      },
      {
        scenario: "DMARC enforcement check",
        input: "v=DMARC1; p=reject; rua=mailto:reports@example.com",
        output:
          "Policy parsed locally showing reject enforcement and aggregate report URI",
      },
      {
        scenario: "Consented MX & TXT lookup",
        input: "example.com (MX or TXT) with resolver consent checked",
        output:
          "Answer records, TTL values, and resolver AD status returned from Cloudflare DNS",
      },
    ],
    privacyNote:
      "Pasted email headers and TXT records stay in your browser. Optional DNS and DNSSEC queries send the entered domain name and your IP address directly to Cloudflare after your consent.",
    steps: [
      "Choose an offline review tab (Email Headers, SPF, DKIM, or DMARC) or one of the two consented resolver tabs (DNS Lookup or DNSSEC Status Checker).",
      "For offline checks, paste the raw TXT record value or full email header block directly into the workspace.",
      "For live DNS or DNSSEC checks, enter a public ASCII domain name (such as example.com), choose the record type, and confirm consent to query Cloudflare.",
      "Review the parsed mechanisms, hops, or DNS answers before copying or exporting your notes.",
    ],
    faqs: [
      {
        q: "Do the SPF, DKIM, DMARC, and Email Header tabs make network requests?",
        a: "No. Those four tabs inspect only the text you paste into the browser. They do not query DNS or count recursive DNS lookups across `include:` chains.",
      },
      {
        q: "Where do live DNS and DNSSEC queries go?",
        a: "When you run DNS Lookup or DNSSEC Status Checker after giving consent, your browser queries Cloudflare's public DNS-over-HTTPS endpoint (`https://cloudflare-dns.com/dns-query`). Localhost and private suffixes are blocked.",
      },
      {
        q: "Does an Authentication-Results pass in pasted headers prove an email is authentic?",
        a: "Only if that header was added by your own trusted receiving mail server and older untrusted `Authentication-Results` headers were stripped. Pasted text alone cannot cryptographically re-verify a message body.",
      },
      {
        q: "Does the DNSSEC checker validate the root cryptographic chain in the browser?",
        a: "It reports the `ad` (Authenticated Data) flag and status returned by Cloudflare's validating resolver rather than walking root and TLD DS/DNSKEY signatures locally.",
      },
    ],
  },

  "website-security-review": {
    seoTitle: "Website Security Review — CSP, HSTS & TLS Headers",
    seoDescription:
      "Analyze pasted HTTP security headers, CSP, HSTS, cookies, X-Frame-Options and robots.txt, generate starter policies, or inspect PEM certificates offline.",
    headingDescription:
      "Twelve offline defensive review and policy-drafting utilities for HTTP response headers, Content-Security-Policy, HSTS, Set-Cookie attributes, Permissions-Policy, Referrer-Policy, X.509 PEM certificates and security.txt.",
    stepsHeading: "How to review HTTP headers, policies, and certificates",
    faqsHeading: "Website security review questions, answered",
    relatedHeading: "More security, privacy, and developer utilities",
    referenceHeading:
      "Website Security Review: 12 offline header, policy, and PEM tools",
    referenceIntro:
      "This suite never scans or connects to live websites. Every analyzer works on response headers, policy strings, `robots.txt` rules or PEM certificates that you paste locally, avoiding unauthorized active probing while highlighting common configuration gaps.",
    specsTitle: "Website Security Review specifications",
    specs: [
      {
        label: "Header & policy analyzers",
        detail:
          "Parses pasted HTTP response headers, CSP strings, `Set-Cookie` lines, `Strict-Transport-Security`, `X-Frame-Options`, `robots.txt` and privacy headers up to 100,000 characters.",
      },
      {
        label: "Policy generators",
        detail:
          "Builds starter `Content-Security-Policy`, `Permissions-Policy`, `Referrer-Policy` and RFC 9116 `security.txt` drafts with explicit contact and expiration fields.",
      },
      {
        label: "X.509 PEM Certificate Inspector",
        detail:
          "Parses single public `BEGIN CERTIFICATE` PEM blocks up to 64,000 characters with `@peculiar/x509`, showing Subject, Issuer, validity dates, SHA-256 thumbprint, Basic Constraints, EKU, and DNS SAN hostname matching.",
      },
      {
        label: "Cookie attribute checks",
        detail:
          "Evaluates `Secure`, `HttpOnly`, `SameSite` (`Strict`, `Lax`, `None`), and `__Host-` / `__Secure-` prefix requirements line by line.",
      },
      {
        label: "Execution boundary",
        detail:
          "100% browser-local static analysis. Never fetches user-supplied URLs, never validates CA trust chains, and never tests live server exploitability.",
      },
    ],
    examplesTitle: "Website Security Review examples",
    examples: [
      {
        scenario: "CSP weakness check",
        input: "default-src 'self'; script-src 'self' 'unsafe-inline'",
        output:
          "Confirms default-src, flags missing frame-ancestors, and warns that 'unsafe-inline' weakens script protection",
      },
      {
        scenario: "Session cookie review",
        input: "Set-Cookie: __Host-sid=abc; Secure; HttpOnly; Path=/; SameSite=Lax",
        output:
          "Reports Secure, HttpOnly, SameSite=Lax, and checks __Host- prefix requirements",
      },
      {
        scenario: "PEM certificate inspection",
        input: "Single PEM-encoded public X.509 certificate and optional DNS hostname",
        output:
          "Validity window, SHA-256 fingerprint, SAN DNS names, and whether the supplied hostname matches",
      },
    ],
    privacyNote:
      "All twelve operations run offline in this browser tab. Do not paste private TLS keys — the Certificate Inspector accepts public `CERTIFICATE` blocks only.",
    steps: [
      "Pick one of the twelve tabs — such as HTTP Security Headers Analyzer, CSP Generator/Analyzer, Certificate Inspector, Cookie Security Analyzer, HSTS Checker, or Security.txt Generator.",
      "Paste the raw header lines, policy value, `robots.txt` text, or public PEM certificate from your server configuration or browser developer tools.",
      "Review the static findings — such as missing `frame-ancestors`, `unsafe-inline` directives, missing `HttpOnly`/`Secure` cookie flags, or certificate SAN mismatches.",
      "Test generated CSP, HSTS, or Permissions-Policy headers in staging or report-only mode on your own application before enforcing them in production.",
    ],
    faqs: [
      {
        q: "Does this tool scan or send requests to my website?",
        a: "No. None of the twelve operations connect to external URLs or probe live servers. You paste headers, policies, or public certificates that you already have.",
      },
      {
        q: "Does the X.509 Certificate Inspector verify that a certificate is trusted by browsers?",
        a: "No. It parses a single PEM certificate's fields, dates, SHA-256 thumbprint, and DNS Subject Alternative Names offline. It does not check Certificate Authority chains, OCSP, or CRL revocation.",
      },
      {
        q: "Why does the Robots.txt Review warn about Disallow paths?",
        a: "Because `robots.txt` is a public crawling instruction, not access control. Listing `/admin/` or `/backup/` in `robots.txt` discloses those paths to anyone who reads the file unless they are protected by real authentication.",
      },
      {
        q: "Can I deploy a generated Content-Security-Policy immediately?",
        a: "Treat generated headers as a starting baseline. Always test a new policy with `Content-Security-Policy-Report-Only` first so legitimate scripts, styles, or frames are not accidentally blocked.",
      },
    ],
  },

  "privacy-metadata-manager": {
    seoTitle: "Privacy & Metadata — EXIF, PDF & Text Redaction",
    seoDescription:
      "Inspect image EXIF/GPS tags, strip image metadata to PNG, view or clear PDF/DOCX properties, and detect or redact sensitive text locally in your browser.",
    headingDescription:
      "Inspect JPEG, PNG and WebP metadata markers, re-encode clean PNG copies, read or clear top-level PDF and DOCX document properties, and scan or mask emails, phone numbers and card-like patterns locally.",
    stepsHeading: "How to inspect metadata and redact text locally",
    faqsHeading: "Privacy & metadata manager questions, answered",
    relatedHeading: "More image, PDF, and privacy tools",
    referenceHeading:
      "Privacy & Metadata Manager: supported formats, limits, and caveats",
    referenceIntro:
      "Files and text stay on your device across all seven operations. Because file formats can hide data in streams, revisions, or unsupported chunks, each tool states exactly which metadata fields it inspects or removes so you never mistake a quick cleanup for forensic sanitization.",
    specsTitle: "Privacy & Metadata Manager specifications",
    specs: [
      {
        label: "Image EXIF inspection & cleaning",
        detail:
          "Scans JPEG, PNG, and WebP files up to 15 MiB for EXIF, GPS, XMP, ICC, camera, orientation and capture-date markers. Cleaner re-encodes images up to 8,192 × 8,192 px (24 MP) onto a fresh HTML canvas exported as PNG.",
      },
      {
        label: "PDF metadata viewer & cleaner",
        detail:
          "Reads PDF files up to 15 MiB for Info dictionary fields, catalog/page XMP indicators, annotation counts and catalog EmbeddedFiles, and can clear top-level Info/XMP fields without full object-stream sanitization.",
      },
      {
        label: "DOCX & document properties",
        detail:
          "Reads common PDF and DOCX core/app metadata properties locally without uploading the document.",
      },
      {
        label: "PII pattern detection & masking",
        detail:
          "Scans pasted text locally for email addresses, phone-like digit sequences, and Luhn-valid payment card numbers, with optional masking or exact-phrase text redaction.",
      },
      {
        label: "Local processing",
        detail:
          "All file parsing, canvas re-encoding, PDF saving and text redaction execute in browser memory with zero network uploads.",
      },
    ],
    examplesTitle: "Privacy & Metadata Manager examples",
    examples: [
      {
        scenario: "Photo GPS check before sharing",
        input: "Smartphone JPEG opened in Image EXIF & Metadata Inspector",
        output:
          "Dimensions, EXIF/GPS presence flags, camera model, orientation, and capture timestamp",
      },
      {
        scenario: "Clean image export",
        input: "JPEG with EXIF camera tags in Image Metadata Remover",
        output:
          "Re-encoded PNG pixel copy containing no copied source EXIF or GPS segments",
      },
      {
        scenario: "Support log masking",
        input: "Contact alex@example.com or +1 212 555 0199.",
        output:
          "Detected email and phone patterns masked locally for manual review before sharing",
      },
    ],
    privacyNote:
      "Files and pasted text never leave this browser tab. Automated masking and top-level metadata removal are aids, not guarantees — always inspect the exported file or text yourself before publishing sensitive material.",
    steps: [
      "Choose an image, document, or text operation tab — EXIF Inspector, Image Metadata Remover, PDF Metadata Viewer, Document Metadata Inspector, Sensitive Information Detector, Masker, or Text Redaction.",
      "Select a supported local file (up to 15 MiB for PDF/EXIF inspection, up to 24 MP / 8,192 px per side for PNG re-encoding) or paste the text you want to review.",
      "Inspect the reported metadata fields or pattern matches, noting the explicit scope warnings on what each format parser covers.",
      "Download the re-encoded PNG, updated PDF, or masked text locally and verify the output before sharing.",
    ],
    faqs: [
      {
        q: "Does clearing PDF metadata completely sanitize a confidential PDF?",
        a: "No. Clearing the document Info dictionary and catalog XMP metadata does not remove visible text, hidden layers, incremental revision history, embedded fonts, comments, or custom objects. Use true redaction tools when content inside pages is sensitive.",
      },
      {
        q: "Why does Image Metadata Remover export a PNG?",
        a: "Drawing decoded pixels onto a fresh browser canvas and encoding a new PNG writes only pixel data, leaving behind source JPEG/WebP EXIF, GPS, and XMP segments. Note that file size may increase for photographs.",
      },
      {
        q: "Can Sensitive Information Detector catch every secret or personal detail?",
        a: "No. It checks only for common email shapes, phone-like digit runs, and Luhn-matching numbers. Names, street addresses, account IDs, and custom secrets require manual review or exact-phrase redaction.",
      },
      {
        q: "Are my photos, PDFs, or DOCX files uploaded to QUICKKIT?",
        a: "No. Every inspection, canvas re-encode, and text replacement happens inside your browser tab.",
      },
    ],
  },

  "url-network-privacy": {
    seoTitle: "URL, IP & Browser Privacy — Link & Signal Checks",
    seoDescription:
      "Inspect URLs for risky syntax offline, check browser privacy signals and permissions locally, or view your public IP via ipify only after explicit consent.",
    headingDescription:
      "Screen suspicious URLs offline without visiting them, inspect browser-exposed privacy signals and permission states, generate hardening checklists, or check your public IP address after explicit consent.",
    stepsHeading: "How to review URLs, browser signals, and public IP exposure",
    faqsHeading: "URL, IP & browser privacy questions, answered",
    relatedHeading: "Related security, DNS, and URL encoding tools",
    referenceHeading:
      "URL, IP & Browser Privacy: offline link checks and consented IP lookup",
    referenceIntro:
      "Seven of the eight tabs in this workspace run strictly offline inside your browser. URLs pasted into URL Safety Pattern Review are parsed with the standard URL parser and never fetched. Only Public IP Information Checker makes a network request — to `api.ipify.org` / `api64.ipify.org` — and only after you grant explicit consent.",
    specsTitle: "URL, IP & Browser Privacy specifications",
    specs: [
      {
        label: "Offline URL review",
        detail:
          "Reviews single HTTP(S) URLs up to 8,192 characters or batches of 1–25 URLs (up to 50,000 characters), flagging unencrypted `http:`, embedded `user:pass@` credentials, raw IP hosts, `xn--` punycode labels, custom ports and percent-encoding.",
      },
      {
        label: "Consented public IP lookup",
        detail:
          "Contacts `https://api.ipify.org` and `https://api64.ipify.org` only after user consent to display the client IP observed by an external service.",
      },
      {
        label: "Browser signal & permission checks",
        detail:
          "Reads standard client properties (`navigator` / Permissions API states) locally without triggering camera, microphone, geolocation or notification prompts.",
      },
      {
        label: "Privacy guides & checklists",
        detail:
          "Provides structured local checklists and plain-language explanations for third-party cookies, tracking protection, and browser fingerprinting without collecting a fingerprint.",
      },
    ],
    examplesTitle: "URL, IP & Browser Privacy examples",
    examples: [
      {
        scenario: "Deceptive userinfo URL",
        input: "http://trusted.example@198.51.100.7:8080/login",
        output:
          "Flags HIGH risk for unencrypted HTTP and embedded userinfo credentials, plus MEDIUM raw-IP host and INFO non-default port",
      },
      {
        scenario: "Internationalized domain check",
        input: "https://xn--pple-43d.com/account",
        output:
          "Flags MEDIUM punycode (`xn--`) host label offline so you can verify lookalike characters before visiting",
      },
      {
        scenario: "Permission state audit",
        input: "Run Browser Permission Checker locally",
        output:
          "Lists current granted, prompt, or denied states exposed by the browser without requesting new permissions",
      },
    ],
    privacyNote:
      "URLs pasted for review are never contacted or logged. Only the optional Public IP Information Checker contacts ipify after your explicit consent.",
    steps: [
      "Select URL Safety Pattern Review, Public IP Information Checker, Browser Privacy/Permission Checkers, or one of the browser hardening guides.",
      "To inspect a link safely, paste one HTTP(S) URL or a batch of up to 25 URLs — the tool parses syntax locally without visiting the destination.",
      "To check your external IP address, open Public IP Information Checker, read the disclosure, and confirm consent before querying ipify.",
      "Use the Browser Privacy, Permission, and Settings Checklist tabs to review what this browser exposes and tighten tracking protections.",
    ],
    faqs: [
      {
        q: "Does URL Safety Pattern Review visit the link or check blocklists?",
        a: "No. It performs offline syntax inspection only — checking scheme, embedded credentials, IP literals, punycode labels, ports, and encoding. A clean syntax report does not mean a website is trustworthy or free of phishing.",
      },
      {
        q: "When is my IP address shared with an external service?",
        a: "Only when you use the Public IP Information Checker tab and explicitly consent to contact `api.ipify.org` / `api64.ipify.org`. Every other tab in this workspace stays completely local.",
      },
      {
        q: "Will Browser Permission Checker trigger permission pop-ups?",
        a: "No. It queries read-only permission states via `navigator.permissions.query` where supported and never calls `getUserMedia`, geolocation, or notification request APIs.",
      },
      {
        q: "Does the Fingerprinting Education tab fingerprint my device?",
        a: "No. It explains the signals commonly combined for browser fingerprinting and how modern browsers mitigate them, without computing or storing an identifier.",
      },
    ],
  },

  "privacy-policy-workbench": {
    seoTitle: "Privacy Policy & GDPR Workbench — Policy Drafts",
    seoDescription:
      "Generate structured privacy policy, cookie policy, data retention, consent notice, DPA outlines and GDPR checklists locally for qualified legal review.",
    headingDescription:
      "Six browser-local drafting templates that turn your organization's actual data-handling facts into structured outlines for privacy notices, cookie disclosures, retention schedules, consent prompts, DPAs and GDPR readiness reviews.",
    stepsHeading: "How to draft privacy and compliance outlines locally",
    faqsHeading: "Privacy policy workbench questions, answered",
    relatedHeading: "Related privacy, redaction, and security tools",
    referenceHeading:
      "Privacy Policy Workbench: six structured drafting templates",
    referenceIntro:
      "Generic boilerplate policies fail when they invent practices you do not follow. Every generator in this workbench builds a structured markdown/text draft exclusively from the organization details, data categories, purposes, recipients and retention rules you supply, ready for review by qualified counsel.",
    specsTitle: "Privacy Policy Workbench specifications",
    specs: [
      {
        label: "Included templates",
        detail:
          "Privacy Policy Generator, Cookie Policy Generator, GDPR Compliance Checklist, Data Retention Policy Generator, Consent Notice Generator, and Data Processing Agreement (DPA) Draft Generator.",
      },
      {
        label: "Input format",
        detail:
          "Structured JSON fact objects (with one-click editable examples) specifying organization name, privacy contact, data categories, purposes, recipients/subprocessors, retention periods, and data-subject rights.",
      },
      {
        label: "No invented claims",
        detail:
          "Outputs assemble only the facts you enter plus explicit legal-review disclaimers — never fabricating certifications, jurisdictions, or regulatory approvals.",
      },
      {
        label: "Processing & confidentiality",
        detail:
          "100% client-side execution in browser memory; internal processing descriptions and subprocessor lists are never uploaded.",
      },
    ],
    examplesTitle: "Privacy Policy Workbench examples",
    examples: [
      {
        scenario: "Service privacy notice draft",
        input:
          "Organization, contact email, account data, contractual purpose, email provider recipient, and 30-day post-closure retention",
        output:
          "Structured five-section privacy notice draft mapping each supplied fact to its disclosure heading",
      },
      {
        scenario: "Controller–processor DPA outline",
        input:
          "Controller/processor names, support scope, documented instructions, encryption controls, subprocessors, and deletion on termination",
        output:
          "Structured DPA draft outline covering scope, instructions, security, transfers, and termination duties",
      },
      {
        scenario: "GDPR readiness review",
        input: "Open GDPR Compliance Checklist tab and generate checklist",
        output:
          "Actionable review list covering lawful basis, transparency, rights handling, processors, transfers, and retention",
      },
    ],
    privacyNote:
      "Drafts are assembled locally in this browser tab and are not legal advice. Have qualified legal counsel review and adapt any policy or agreement for your jurisdiction and actual operations.",
    steps: [
      "Choose the document or checklist tab you need — Privacy Policy, Cookie Policy, GDPR Checklist, Data Retention Policy, Consent Notice, or DPA Draft.",
      "Load the built-in example to see the expected JSON fields, then replace every placeholder with your organization's real data practices, vendors, and retention windows.",
      "Generate the draft locally and check that every statement matches how your product and infrastructure actually behave.",
      "Copy or download the draft for review and sign-off by qualified legal counsel before publishing.",
    ],
    faqs: [
      {
        q: "Does this workbench produce legally binding or compliant policies out of the box?",
        a: "No. It produces structured first-draft outlines from the facts you enter and checklists of common review topics. Legal requirements depend on your jurisdiction, sector, and actual data flows, so qualified legal review is essential.",
      },
      {
        q: "Why do the generators ask for JSON fields instead of generating automatic paragraphs?",
        a: "Because privacy disclosures must state what your service actually collects, shares, and retains. Supplying explicit fields prevents filler text from claiming practices or protections you do not have.",
      },
      {
        q: "Are my organization's internal vendor lists or drafts uploaded?",
        a: "No. Everything you type or generate stays in browser memory and is cleared when you switch tabs or close the page.",
      },
      {
        q: "Does completing the GDPR Checklist certify GDPR compliance?",
        a: "No. The checklist is an internal preparation aid highlighting core operational areas such as lawful basis, records of processing, vendor contracts, and rights workflows.",
      },
    ],
  },

  "api-credential-tools": {
    seoTitle: "API Credential Tools — Keys, Headers & Bearer",
    seoDescription:
      "Validate API key formats offline, inspect pasted HTTP request headers for credential exposure risks, and format Authorization Bearer tokens in your browser.",
    headingDescription:
      "Three local developer-security utilities for checking API key prefix/length patterns, auditing pasted HTTP request headers for transport or credential mistakes, and formatting Bearer authorization headers without sending secrets over the network.",
    stepsHeading: "How to check API keys, request headers, and Bearer tokens",
    faqsHeading: "API credential review questions, answered",
    relatedHeading: "More developer, token, and cryptography tools",
    referenceHeading:
      "API Credential & Request Review: local key, header, and token checks",
    referenceIntro:
      "Pasting live credentials or `Authorization` headers into server-backed debuggers risks leaking secrets into third-party logs. All three operations here run strictly inside your browser tab and never make network calls.",
    specsTitle: "API Credential & Request Review specifications",
    specs: [
      {
        label: "API Key Format Validator",
        detail:
          "Checks supplied strings locally against expected prefix, character-set, and length conventions without calling any provider API or testing whether a credential is active.",
      },
      {
        label: "API Request Header Analyzer",
        detail:
          "Parses pasted `Name: value` request headers locally to flag plaintext Basic auth, exposed bearer/API keys, insecure origins, or malformed header lines.",
      },
      {
        label: "Bearer Token Formatter",
        detail:
          "Normalizes raw token strings into clean `Authorization: Bearer <token>` headers while checking for stray whitespace, quotes, or duplicated `Bearer` prefixes.",
      },
      {
        label: "Secret handling",
        detail:
          "Zero network requests, zero server logs, and automatic workspace reset when switching tabs. Prefer placeholder or redacted tokens whenever testing structure.",
      },
    ],
    examplesTitle: "API Credential & Request Review examples",
    examples: [
      {
        scenario: "Authorization header formatting",
        input: "Raw token string in Bearer Token Formatter",
        output:
          "Clean `Authorization: Bearer …` header line with stray whitespace or duplicate prefixes flagged",
      },
      {
        scenario: "Request header audit",
        input: "Accept: application/json\\nAuthorization: Bearer example",
        output:
          "Local header breakdown highlighting credential-bearing headers that require HTTPS transport and log redaction",
      },
      {
        scenario: "Key shape check",
        input: "test_key_1234567890 in API Key Format Validator",
        output:
          "Local structural check reporting character set and length without contacting an external API",
      },
    ],
    privacyNote:
      "Inputs are processed only in browser memory and never uploaded. Even in local tools, prefer test or rotated credentials when debugging and clear your clipboard after copying secrets.",
    steps: [
      "Choose API Key Format Validator, API Request Header Analyzer, or Bearer Token Formatter.",
      "Paste a test token, key string, or `Name: value` HTTP request header block (use redacted or non-production values whenever possible).",
      "Inspect the local formatting output or header risk notes — such as duplicate `Bearer` prefixes, whitespace bugs, or headers that must never be logged.",
      "Copy the formatted result if needed; switching tabs or closing the page clears the workspace.",
    ],
    faqs: [
      {
        q: "Does API Key Format Validator check if a key is active or valid with the provider?",
        a: "No. It checks character structure and format conventions offline. It never contacts Stripe, AWS, GitHub, OpenAI, or any other third-party service.",
      },
      {
        q: "Are pasted Authorization headers sent to QUICKKIT?",
        a: "No. Parsing and formatting run entirely in JavaScript inside your current browser tab, with no network requests or persistent storage.",
      },
      {
        q: "Should I still use test tokens instead of production secrets?",
        a: "Yes. Even though QUICKKIT processes inputs locally, browser extensions, clipboard managers, or screen shares on your device can observe pasted text. Using non-production tokens is always safer.",
      },
      {
        q: "Where can I decode or verify a JWT bearer token?",
        a: "Open the Ultimate Encryption & Cryptography suite (`/tools/advanced-cryptography?operation=jwt-decoder`), which decodes JWT claims and verifies HS256 or RS256 signatures locally.",
      },
    ],
  },
};

export function isConsolidatedSecuritySlug(
  slug: string,
): slug is ConsolidatedSecuritySlug {
  return Object.hasOwn(SECURITY_SUITE_SEO_CONTENT, slug);
}
