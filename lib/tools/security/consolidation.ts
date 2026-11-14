import { securityToolDefinitions } from "./catalog";

/** Operations reference their existing, independently tested implementations. */
export const securityGroups = [
  {
    slug: "password-generator",
    name: "Ultimate Password Security",
    description:
      "Generate passwords and passphrases, review strength and entropy, and build a password policy locally.",
    operations: [
      "password-generator",
      "password-strength-checker",
      "passphrase-generator",
      "password-entropy-calculator",
      "password-policy-generator",
      "secure-random-string-generator",
    ],
  },
  {
    slug: "hash-generator",
    name: "Ultimate Hash & File Integrity",
    description:
      "Hash text and files, verify batch checksums, compare digests and inspect file signature hints locally.",
    operations: ["hash-generator", "hash-comparison", "file-privacy-checker"],
  },
  {
    slug: "advanced-cryptography",
    name: "Ultimate Encryption & Cryptography",
    description:
      "Local AES-GCM, RSA, HMAC, JWT, key generation and Base64 tools with clear limits.",
    operations: [
      "text-encryption",
      "file-encryption",
      "encryption-key-generator",
      "rsa-cryptography",
      "hmac-generator-verifier",
      "jwt-decoder",
      "jwt-generator",
      "base64url-converter",
      "base64-encoder-decoder",
    ],
  },
  {
    slug: "dns-email-security",
    name: "Ultimate DNS & Email Security",
    description:
      "Review DNS, email headers, SPF, DKIM and DMARC; optional DNS queries require consent.",
    operations: [
      "dns-lookup",
      "dnssec-status-checker",
      "email-header-analyzer",
      "spf-record-checker",
      "dkim-configuration-checker",
      "dmarc-record-checker",
    ],
  },
  {
    slug: "website-security-review",
    name: "Ultimate Website Security Review",
    description:
      "Review pasted headers and policies or inspect a PEM certificate offline; no live website scan.",
    operations: [
      "security-headers-analyzer",
      "csp-generator",
      "csp-analyzer",
      "certificate-inspector",
      "cookie-security-analyzer",
      "hsts-checker",
      "permissions-policy-generator",
      "referrer-policy-generator",
      "x-frame-options-checker",
      "robots-security-review",
      "security-txt-generator",
      "website-privacy-config-review",
    ],
  },
  {
    slug: "privacy-metadata-manager",
    name: "Ultimate Privacy & Metadata Manager",
    description:
      "Inspect selected file metadata, clean supported files and review or redact text locally.",
    operations: [
      "image-metadata-inspector",
      "image-metadata-remover",
      "pdf-metadata-viewer",
      "document-metadata-inspector",
      "sensitive-information-detector",
      "personal-information-masker",
      "text-redaction",
    ],
  },
  {
    slug: "url-network-privacy",
    name: "Ultimate URL, IP & Browser Privacy",
    description:
      "Review URL patterns and browser privacy; optional public-IP lookup requires consent.",
    operations: [
      "url-safety-review",
      "public-ip-information",
      "browser-privacy-checker",
      "browser-permission-checker",
      "third-party-cookie-information",
      "tracking-protection-guide",
      "fingerprinting-education",
      "privacy-settings-checklist",
    ],
  },
  {
    slug: "privacy-policy-workbench",
    name: "Privacy Policy & Compliance Workbench",
    description:
      "Create privacy, cookie and retention drafts and compliance checklists for qualified legal review.",
    operations: [
      "privacy-policy-generator",
      "cookie-policy-generator",
      "gdpr-checklist",
      "data-retention-policy-generator",
      "consent-notice-generator",
      "data-processing-agreement-generator",
    ],
  },
  {
    slug: "api-credential-tools",
    name: "API Credential & Request Review",
    description:
      "Locally format bearer tokens and review API key formats and pasted request headers.",
    operations: [
      "api-key-format-validator",
      "api-request-header-analyzer",
      "bearer-token-formatter",
    ],
  },
] as const;

export type SecurityGroupSlug = (typeof securityGroups)[number]["slug"];
export const securityGroupBySlug = (slug: string) =>
  securityGroups.find((g) => g.slug === slug);
export const legacySecurityRedirects = securityGroups.flatMap((group) =>
  group.operations
    .filter((operation) =>
      securityToolDefinitions.some((tool) => tool.slug === operation),
    )
    .map((operation) => ({
      source: `/tools/${operation}`,
      destination: `/tools/${group.slug}?operation=${operation}`,
      permanent: true as const,
    })),
);
export const legacySecurityFavorites: Record<string, string> =
  Object.fromEntries(
    legacySecurityRedirects.map(({ source, destination }) => [
      source.slice("/tools/".length),
      destination.split("?")[0].slice("/tools/".length),
    ]),
  );
export function securityGroupKeywords(slug: string): string {
  const group = securityGroupBySlug(slug);
  return group
    ? group.operations
        .map(
          (operation) =>
            securityToolDefinitions.find((item) => item.slug === operation)
              ?.name ?? operation.replaceAll("-", " "),
        )
        .join(" ")
        .toLowerCase()
    : "";
}

/** Point precise searches for a single old operation to the matching tab. */
export function operationForSearch(
  slug: string,
  query: string,
): string | undefined {
  const group = securityGroupBySlug(slug);
  const normalized = query.trim().toLowerCase();
  if (!group || normalized.length < 3) return undefined;
  const matching = group.operations.filter((operation) =>
    securityToolDefinitions
      .find((tool) => tool.slug === operation)
      ?.name.toLowerCase()
      .includes(normalized),
  );
  return matching.length === 1 ? matching[0] : undefined;
}
