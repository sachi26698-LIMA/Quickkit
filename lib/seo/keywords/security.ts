import type { ToolKeywordCluster } from "../keyword-clusters";

/**
 * Security & privacy cluster.
 *
 * The highest-risk cluster for false claims, so the phrasing is constrained by
 * what each tool actually does:
 *
 * - `dns-email-security` sends DNS queries to Cloudflare after consent, so it
 *   carries no "offline" or "no network" phrasing.
 * - `url-network-privacy` performs an optional consented IP lookup, so it is
 *   not described as fully offline either.
 * - `website-security-review` explains configuration and inspects a pasted
 *   certificate; it does **not** scan a live site, so no keyword claims a scan.
 * - `privacy-policy-workbench` drafts documents for review — no keyword claims
 *   legal compliance or certification.
 *
 * No `india` group: privacy tooling is not searched in Hinglish, and inventing
 * it would be noise. `hash-generator` is documented in the developer file
 * because that is where its single canonical record lives.
 */
export const securityKeywordClusters: ToolKeywordCluster[] = [
  {
    slug: "password-generator",
    primary: "password generator",
    secondary: [
      "strong random password generator",
      "passphrase generator",
      "password strength checker",
      "password policy generator",
      "16 character password",
    ],
    groups: {
      alternativeName: ["random password maker", "password creator"],
      synonym: [
        "make up a strong password",
        "create a random passphrase",
        "generate a password with symbols",
      ],
      action: [
        "generate a 16 character random password",
        "build a memorable multi-word passphrase",
        "check how strong a password is",
      ],
      longTail: [
        "generate a strong password using the browsers secure random source",
        "create a passphrase that is long but still typeable",
        "check password entropy before using it",
      ],
      problem: [
        "every password chosen by hand is guessable",
        "a policy demands a length and symbol mix that is hard to invent",
      ],
      question: [
        "how do i make a strong password",
        "what makes a password strong",
        "is a passphrase better than a password",
      ],
      qualifier: [
        "password generator online free",
        "random password generator no signup",
      ],
    },
    audience: "Anyone creating an account or drafting a password policy",
  },
  {
    slug: "advanced-cryptography",
    primary: "encrypt text & files online",
    secondary: [
      "aes 256 encryption online",
      "rsa key pair generator",
      "jwt decoder",
      "hmac generator",
      "encrypt file in browser",
    ],
    groups: {
      alternativeName: [
        "encryption tool",
        "cryptography toolkit",
        "crypto utilities",
      ],
      synonym: [
        "encrypt a message with a password",
        "generate an rsa key pair",
        "verify an hmac signature",
      ],
      action: [
        "encrypt text with aes-256-gcm",
        "generate an rsa-oaep key pair",
        "inspect a jwt payload or sign a test token",
      ],
      longTail: [
        "encrypt a file with aes 256 gcm using the web crypto api",
        "generate an rsa key pair without sending the keys anywhere",
        "verify an hmac digest for a webhook payload",
      ],
      problem: [
        "need to encrypt something without a desktop tool",
        "a jwt will not verify and the payload needs inspecting",
      ],
      question: [
        "how does aes 256 encryption work",
        "how do i decode a jwt",
        "what is the difference between hashing and encryption",
      ],
      qualifier: [
        "aes 256 encryption online free",
        "encrypt text in browser free",
      ],
    },
    audience: "Developers handling keys, tokens and webhook signatures",
  },
  {
    slug: "dns-email-security",
    primary: "spf, dkim & dmarc checker",
    secondary: [
      "email header analyzer",
      "dmarc record lookup",
      "dnssec status checker",
      "why is my email going to spam",
      "spf record generator",
    ],
    groups: {
      alternativeName: [
        "dmarc checker",
        "spf checker",
        "email authentication checker",
      ],
      synonym: [
        "check an spf record for problems",
        "read an email header to see what failed",
        "review dmarc policy settings",
      ],
      action: [
        "check whether spf dkim and dmarc are configured correctly",
        "analyse a raw email header",
        "look up a dmarc record",
      ],
      longTail: [
        "find out why legitimate emails are landing in spam",
        "analyse raw email headers to see which authentication failed",
        "check whether a domain publishes dnssec",
      ],
      problem: [
        "email authentication is set up but mail still fails",
        "a dmarc policy is present but the alignment looks wrong",
      ],
      question: [
        "why is my email going to spam",
        "how do i check spf and dkim",
        "what should a dmarc record contain",
      ],
      qualifier: [
        "dns email security checker online",
        "spf dmarc checker free",
      ],
    },
    audience:
      "Anyone running a domain whose mail is being rejected or filtered",
  },
  {
    slug: "website-security-review",
    primary: "security headers checker",
    secondary: [
      "csp generator",
      "hsts checker",
      "cookie flags secure httponly",
      "x frame options check",
      "permissions policy generator",
    ],
    groups: {
      alternativeName: [
        "security header analyser",
        "csp builder",
        "header review tool",
      ],
      synonym: [
        "review the security headers of a site",
        "build a content security policy",
        "check that cookies are secure and httponly",
      ],
      action: [
        "paste response headers and review them for gaps",
        "generate a content security policy",
        "inspect a pem certificate offline",
      ],
      longTail: [
        "review pasted security headers for missing protections",
        "generate a content security policy for a site",
        "check whether hsts and referrer policy are configured well",
      ],
      problem: [
        "headers are present but a policy is too permissive",
        "unsure which security headers are missing",
      ],
      question: [
        "what security headers should a site send",
        "how do i write a content security policy",
        "what does httponly do on a cookie",
      ],
      qualifier: ["security headers checker online", "csp generator free"],
    },
    audience:
      "Developers auditing configuration they have already pasted in, not scanning someone else's site",
  },
  {
    slug: "privacy-metadata-manager",
    primary: "remove exif data",
    secondary: [
      "photo metadata viewer",
      "strip gps from photo",
      "browser privacy checker",
      "fingerprinting explained",
      "privacy settings checklist",
    ],
    groups: {
      alternativeName: ["exif viewer", "metadata remover", "exif cleaner"],
      synonym: [
        "see what metadata a photo carries",
        "delete location data from a picture",
        "clean hidden tags from a file",
      ],
      action: [
        "inspect exif gps and xmp data in your own files",
        "clean supported file metadata before sharing",
        "review browser privacy settings and permissions",
      ],
      longTail: [
        "check whether a photo carries gps coordinates before posting it",
        "inspect exif and icc data in an image you own",
        "review tracker and permission settings in a browser",
      ],
      problem: [
        "photos are revealing where they were taken",
        "unsure what a file carries besides its visible content",
      ],
      question: [
        "how do i remove exif data from a photo",
        "does a photo contain my location",
        "what is browser fingerprinting",
      ],
      qualifier: ["exif remover online free", "photo metadata viewer free"],
    },
    audience: "People sharing photos who want to know what travels with them",
  },
  {
    slug: "url-network-privacy",
    primary: "url privacy checker",
    // Truthfulness correction (Phase 5). `analyzeUrl` in
    // lib/tools/security/url-review.ts parses a URL's syntax and never requests
    // it — the doc comment there is explicit that the destination "is never
    // requested". Two consequences the earlier wording got wrong:
    //   • redirect hops cannot be observed, because observing them means
    //     following the link. "redirect checker" / "redirect hops" removed.
    //   • nothing is stripped from a link. The tool *reports* that tracking
    //     parameters are present; it does not remove them. "remove tracking
    //     parameters" removed, and the wording now says "reveals"/"points out".
    // The fingerprinting tab is educational and stores no identifier, so
    // "browser fingerprint test" was also a promise the page cannot keep.
    secondary: [
      "what does this url contain",
      "url inspector",
      "what is my public ip",
      "browser privacy check",
    ],
    groups: {
      alternativeName: [
        "link privacy analyser",
        "url inspector",
        "link safety checker",
      ],
      synonym: [
        "break a link into its parts",
        "see which parameters a link carries",
        "read a link without opening it",
      ],
      action: [
        "spot tracking parameters in a link",
        "break a url into scheme host path and query",
        "review what a page can learn about the browser",
      ],
      longTail: [
        "find tracking parameters hiding in a shared link",
        "read the parts of a link without visiting the site",
        "review browser fingerprinting signals for a page",
      ],
      problem: [
        "a shared link carries tracking parameters worth pointing out",
        "unsure what a link contains before forwarding it",
      ],
      question: [
        "what does this url contain",
        "how do i read the tracking parameters in a link",
        "what can a website learn about my browser",
      ],
      qualifier: ["url privacy checker free", "link tracking analyser online"],
    },
    audience: "People checking a link before opening or forwarding it",
  },
  {
    slug: "privacy-policy-workbench",
    primary: "privacy policy generator",
    secondary: [
      "cookie policy template",
      "gdpr checklist",
      "data retention policy template",
      "consent notice generator",
      "data processing agreement template",
    ],
    groups: {
      alternativeName: ["privacy policy builder", "policy drafting tool"],
      synonym: [
        "draft a privacy policy for a website",
        "create a cookie notice",
        "write down how long data is kept",
      ],
      action: [
        "draft a privacy policy from actual data practices",
        "generate a consent notice",
        "build a data retention schedule",
      ],
      longTail: [
        "draft a privacy policy describing the data actually collected",
        "create a data retention schedule for each data type",
        "produce a cookie policy draft ready for legal review",
      ],
      problem: [
        "a site collects data but has no written policy",
        "unsure how long data should be retained and where that is recorded",
      ],
      question: [
        "what should a privacy policy include",
        "do i need a cookie policy",
        "what is a data retention policy",
      ],
      qualifier: [
        "privacy policy generator free",
        "free cookie policy template",
      ],
    },
    audience:
      "Small site owners who need a draft to take to a qualified legal reviewer",
  },
  {
    slug: "api-credential-tools",
    primary: "api key validator",
    secondary: [
      "bearer token formatter",
      "api request header analyzer",
      "is my api key exposed",
      "jwt vs api key",
      "check authorization header",
    ],
    groups: {
      alternativeName: [
        "api key checker",
        "token inspector",
        "header reviewer",
      ],
      synonym: [
        "check the shape of an api key",
        "format a bearer token for a header",
        "review pasted request headers",
      ],
      action: [
        "check an api key against documented formats",
        "format a bearer token correctly",
        "review pasted headers for a missing authorization",
      ],
      longTail: [
        "check whether an api key matches a documented provider format",
        "review pasted request headers for leaked secrets",
        "format a bearer token without mangling it",
      ],
      problem: [
        "an api call fails with 401 and the header may be malformed",
        "unsure whether a string is even an api key",
      ],
      question: [
        "what does a bearer token look like",
        "how do i check an authorization header",
        "what is the difference between a jwt and an api key",
      ],
      qualifier: ["api key checker online free", "bearer token formatter free"],
    },
    audience: "Developers debugging a 401 before assuming the key is wrong",
  },
];
