/** Only implemented, browser-local workspaces belong here. */
export const securityToolDefinitions = [
  {
    slug: "password-strength-checker",
    name: "Password Strength Checker",
    description:
      "Check a password locally for common patterns and get practical suggestions.",
    mode: "strength",
    example: "Example-password-123",
  },
  {
    slug: "passphrase-generator",
    name: "Passphrase Generator",
    description:
      "Generate a random passphrase from a local word list using secure randomness.",
    mode: "passphrase",
    example: "",
  },
  {
    slug: "password-entropy-calculator",
    name: "Password Entropy Calculator",
    description:
      "Estimate the upper bound for a random password from length and alphabet size.",
    mode: "entropy",
    example: "",
  },
  {
    slug: "password-policy-generator",
    name: "Password Policy Generator",
    description:
      "Draft a practical password policy with configurable minimum length.",
    mode: "policy",
    example: "",
  },
  {
    slug: "secure-random-string-generator",
    name: "Secure Random String Generator",
    description:
      "Create unbiased random strings from a custom character alphabet.",
    mode: "random",
    example: "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789",
  },
  {
    slug: "text-encryption",
    name: "AES-GCM Text Encryption & Decryption",
    description:
      "Encrypt or decrypt text locally with a password and authenticated AES-GCM.",
    mode: "text-crypto",
    example: "A private note",
  },
  {
    slug: "file-encryption",
    name: "File Encryption & Decryption",
    description:
      "Encrypt or decrypt a file locally with password-derived AES-GCM.",
    mode: "file-crypto",
    example: "",
  },
  {
    slug: "encryption-key-generator",
    name: "Encryption Key Generator",
    description:
      "Generate a random 256-bit encryption key in hexadecimal using Web Crypto.",
    mode: "key",
    example: "",
  },
  {
    slug: "base64url-converter",
    name: "URL-safe Base64 Converter",
    description: "Encode UTF-8 text as Base64URL or decode it locally.",
    mode: "base64url",
    example: "Hello, world!",
  },
  {
    slug: "rsa-cryptography",
    name: "RSA Encryption & Signature Verification",
    description:
      "Generate RSA-OAEP keys, encrypt short text or verify RS256 signatures locally.",
    mode: "rsa",
    example: "",
  },
  {
    slug: "hmac-generator-verifier",
    name: "HMAC Generator & Verifier",
    description:
      "Generate or verify HMAC-SHA-256, SHA-384 or SHA-512 locally with a user-supplied key.",
    mode: "hmac",
    example: "Example message",
  },
  {
    slug: "hash-comparison",
    name: "Hash Comparison Tool",
    description:
      "Compare two hexadecimal digests without uploading either value.",
    mode: "compare",
    example: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  },
  {
    slug: "jwt-decoder",
    name: "JWT Decoder & Claims Inspector",
    description:
      "Decode JWT claims or verify an HS256 or RS256 signature locally with a user-supplied key.",
    mode: "jwt-decode",
    example: "",
  },
  {
    slug: "jwt-generator",
    name: "JWT Test Token Generator",
    description: "Sign a test JWT locally with a user-provided HS256 key.",
    mode: "jwt-sign",
    example: '{"sub":"test-user","exp":2000000000}',
  },
  {
    slug: "api-key-format-validator",
    name: "API Key Format Validator",
    description:
      "Check a supplied key against a chosen format without checking whether it is valid.",
    mode: "api-key",
    example: "test_key_1234567890",
  },
  {
    slug: "api-request-header-analyzer",
    name: "API Request Header Analyzer",
    description:
      "Review pasted request headers locally for common credential and transport risks.",
    mode: "headers",
    example: "Accept: application/json\nAuthorization: Bearer example",
  },
  {
    slug: "bearer-token-formatter",
    name: "Bearer Token Formatter",
    description: "Format a token as a Bearer authorization header locally.",
    mode: "bearer",
    example: "example-token",
  },
  {
    slug: "sensitive-information-detector",
    name: "Sensitive Information Detector",
    description:
      "Find common email, phone and Luhn-valid payment card patterns locally for manual review.",
    mode: "detect",
    example: "Contact alex@example.com or +1 212 555 0199.",
  },
  {
    slug: "personal-information-masker",
    name: "Personal Information Masker",
    description:
      "Mask detected email addresses, phone-like strings and Luhn-valid card patterns in local text.",
    mode: "mask",
    example: "Contact alex@example.com or +1 212 555 0199.",
  },
  {
    slug: "text-redaction",
    name: "Text Redaction Utility",
    description:
      "Replace exact occurrences of a selected phrase in text locally.",
    mode: "redact",
    example: "Account owner: Example Person",
  },
  {
    slug: "security-headers-analyzer",
    name: "HTTP Security Headers Analyzer",
    description:
      "Review pasted HTTP response security headers locally, without contacting a website.",
    mode: "response-headers",
    example:
      "HTTP/1.1 200 OK\nContent-Security-Policy: default-src 'self'\nStrict-Transport-Security: max-age=31536000",
  },
  {
    slug: "csp-generator",
    name: "Content Security Policy Generator",
    description:
      "Build a configurable starter CSP to adapt and test on your own website.",
    mode: "csp-generate",
    example: "",
  },
  {
    slug: "csp-analyzer",
    name: "CSP Analyzer",
    description:
      "Review a pasted Content Security Policy for common weaknesses locally.",
    mode: "csp-analyze",
    example: "default-src 'self'; script-src 'self' 'unsafe-inline'",
  },
  {
    slug: "certificate-inspector",
    name: "X.509 Certificate Inspector (PEM)",
    description:
      "Inspect a pasted public certificate locally; does not contact a website or validate trust.",
    mode: "certificate-inspect",
    example: "",
  },
  {
    slug: "url-safety-review",
    name: "URL Safety Pattern Review",
    description:
      "Review URL syntax and selected suspicious patterns locally without contacting the destination.",
    mode: "url-review",
    example: "https://example.com/path",
  },
  {
    slug: "cookie-security-analyzer",
    name: "Cookie Security Analyzer",
    description:
      "Inspect pasted Set-Cookie headers for Secure, HttpOnly and SameSite attributes.",
    mode: "cookies",
    example: "Set-Cookie: session=example; Secure; HttpOnly; SameSite=Lax",
  },
  {
    slug: "hsts-checker",
    name: "HSTS Configuration Checker",
    description:
      "Review a pasted Strict-Transport-Security header and its directives.",
    mode: "hsts",
    example: "max-age=31536000; includeSubDomains",
  },
  {
    slug: "permissions-policy-generator",
    name: "Permissions Policy Generator",
    description: "Build a Permissions-Policy header with per-feature controls.",
    mode: "permissions-policy",
    example: "",
  },
  {
    slug: "referrer-policy-generator",
    name: "Referrer Policy Generator",
    description:
      "Choose a Referrer-Policy header and understand its disclosure tradeoffs.",
    mode: "referrer-policy",
    example: "",
  },
  {
    slug: "x-frame-options-checker",
    name: "X-Frame-Options Checker",
    description: "Interpret a pasted X-Frame-Options response header locally.",
    mode: "frame",
    example: "SAMEORIGIN",
  },
  {
    slug: "robots-security-review",
    name: "Robots.txt Security Review",
    description:
      "Review pasted robots.txt content and learn why disallowed paths are not protected.",
    mode: "robots",
    example: "User-agent: *\nDisallow: /private/",
  },
  {
    slug: "security-txt-generator",
    name: "Security.txt Generator",
    description:
      "Create a security.txt draft with a contact and an expiration date.",
    mode: "security-txt",
    example: "mailto:security@example.com",
  },
  {
    slug: "browser-privacy-checker",
    name: "Browser Privacy Checker",
    description:
      "Inspect a few browser-exposed privacy signals and learn what websites cannot see.",
    mode: "browser-privacy",
    example: "",
  },
  {
    slug: "browser-permission-checker",
    name: "Browser Permission Checker",
    description:
      "Check permission states exposed by your browser without requesting access.",
    mode: "browser-permissions",
    example: "",
  },
  {
    slug: "third-party-cookie-information",
    name: "Third-party Cookie Information",
    description:
      "Understand third-party cookie restrictions and how to check browser settings.",
    mode: "third-party-cookies",
    example: "",
  },
  {
    slug: "tracking-protection-guide",
    name: "Tracking Protection Guide",
    description: "Get practical steps for limiting tracking in your browser.",
    mode: "tracking-guide",
    example: "",
  },
  {
    slug: "fingerprinting-education",
    name: "Browser Fingerprinting Education",
    description:
      "Learn how fingerprinting works without collecting a fingerprint.",
    mode: "fingerprint-guide",
    example: "",
  },
  {
    slug: "privacy-settings-checklist",
    name: "Privacy Settings Checklist",
    description:
      "Generate a browser privacy settings checklist for manual review.",
    mode: "privacy-checklist",
    example: "",
  },
  {
    slug: "privacy-policy-generator",
    name: "Privacy Policy Generator",
    description:
      "Draft a privacy policy template from your supplied facts for legal review.",
    mode: "privacy-policy",
    example:
      '{"organization":"Example Ltd","contact":"privacy@example.com","data":"Account email addresses","purpose":"Account administration; contractual necessity","sharing":"Email provider; no international transfer","retention":"Until account closure plus 30 days","rights":"Email us to request access or deletion"}',
  },
  {
    slug: "cookie-policy-generator",
    name: "Cookie Policy Generator",
    description:
      "Draft a cookie policy template from your supplied facts for legal review.",
    mode: "cookie-policy",
    example:
      '{"organization":"Example Ltd","contact":"privacy@example.com","cookies":"session cookie, essential, 1 day","choices":"Use the cookie settings link to change choices","sharing":"No third-party cookies are used"}',
  },
  {
    slug: "gdpr-checklist",
    name: "GDPR Compliance Checklist",
    description:
      "Generate a GDPR review checklist; it does not determine legal compliance.",
    mode: "gdpr",
    example: "",
  },
  {
    slug: "data-retention-policy-generator",
    name: "Data Retention Policy Generator",
    description:
      "Draft a retention policy template for your organization and legal review.",
    mode: "retention-policy",
    example:
      '{"organization":"Example Ltd","contact":"privacy@example.com","data":"Customer records","retention":"30 days after closure","deletion":"Delete from active systems; backups expire after 90 days","responsibilities":"Privacy team reviews annually"}',
  },
  {
    slug: "consent-notice-generator",
    name: "Consent Notice Generator",
    description:
      "Draft a consent notice template with your supplied processing details.",
    mode: "consent-notice",
    example:
      '{"organization":"Example Ltd","contact":"privacy@example.com","purpose":"Send optional newsletters to your email address","sharing":"Our email delivery provider","choices":"Unsubscribe using the link in each email","consequences":"You will not receive optional newsletters"}',
  },
  {
    slug: "data-processing-agreement-generator",
    name: "Data Processing Agreement Draft Generator",
    description: "Draft a data processing agreement outline for legal review.",
    mode: "dpa",
    example:
      '{"organization":"Example Ltd","contact":"privacy@example.com","parties":"Example Ltd (controller) and Example Processor (processor)","processing":"Account support; one year; names and email addresses of customers","instructions":"Only documented instructions; staff bound by confidentiality","security":"Encryption and access controls; notify incidents promptly","sharing":"Approved subprocessors; no international transfer","termination":"Assist with requests and audits; return or delete data at termination"}',
  },
  {
    slug: "image-metadata-inspector",
    name: "Image EXIF & Metadata Inspector",
    description:
      "Inspect selected EXIF and image metadata markers locally across supported files.",
    mode: "image-metadata",
    example: "",
  },
  {
    slug: "image-metadata-remover",
    name: "Image Metadata Remover",
    description:
      "Re-encode a JPEG, PNG or WebP image as a PNG without copying source metadata.",
    mode: "image-clean",
    example: "",
  },
  {
    slug: "pdf-metadata-viewer",
    name: "PDF Metadata Viewer",
    description:
      "Inspect common PDF properties or remove document-level Info and XMP locally; not full sanitization.",
    mode: "pdf-metadata",
    example: "",
  },
  {
    slug: "email-header-analyzer",
    name: "Email Header Analyzer",
    description:
      "Review pasted email headers locally; authentication results are unverified.",
    mode: "email-headers",
    example:
      "Received: from mail.example by example.net\nAuthentication-Results: example.net; spf=pass; dkim=pass",
  },
  {
    slug: "spf-record-checker",
    name: "SPF Record Checker",
    description:
      "Review the syntax and common risks of a pasted SPF TXT record.",
    mode: "spf",
    example: "v=spf1 include:example.com -all",
  },
  {
    slug: "dkim-configuration-checker",
    name: "DKIM Configuration Checker",
    description: "Review a pasted DKIM TXT record for a public-key tag.",
    mode: "dkim",
    example: "v=DKIM1; k=rsa; p=EXAMPLE",
  },
  {
    slug: "dmarc-record-checker",
    name: "DMARC Record Checker",
    description:
      "Review the policy in a pasted DMARC TXT record without network lookups.",
    mode: "dmarc",
    example: "v=DMARC1; p=reject; rua=mailto:reports@example.com",
  },
  {
    slug: "file-privacy-checker",
    name: "File Privacy Checker",
    description:
      "Inspect file signature hints and supported document or image metadata locally before sharing.",
    mode: "file-privacy",
    example: "",
  },
  {
    slug: "website-privacy-config-review",
    name: "Website Privacy Configuration Review",
    description:
      "Review pasted public response headers for selected privacy-related settings.",
    mode: "website-privacy",
    example:
      "Referrer-Policy: strict-origin-when-cross-origin\nPermissions-Policy: camera=(), microphone=()",
  },
  {
    slug: "document-metadata-inspector",
    name: "Document Metadata Inspector",
    description:
      "Read common PDF and DOCX document properties locally without uploading files.",
    mode: "document-metadata",
    example: "",
  },
  {
    slug: "dns-lookup",
    name: "DNS Lookup & Records Checker",
    description:
      "Query public DNS records through Cloudflare with your explicit consent.",
    mode: "dns-lookup",
    example: "",
  },
  {
    slug: "dnssec-status-checker",
    name: "DNSSEC Status Checker",
    description:
      "Check the public resolver's DNSSEC authenticated-data flag for a DNS answer.",
    mode: "dnssec",
    example: "",
  },
  {
    slug: "public-ip-information",
    name: "Public IP Information Checker",
    description:
      "Check the public IPv4 or dual-stack IP address observed by ipify after giving consent.",
    mode: "public-ip",
    example: "",
  },
] as const;
export type SecurityMode = (typeof securityToolDefinitions)[number]["mode"];
export const securityToolBySlug = (slug: string) =>
  securityToolDefinitions.find((item) => item.slug === slug);
