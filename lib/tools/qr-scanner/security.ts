/**
 * Static security inspection of a decoded payload.
 *
 * What this is: a local, rule-based look at the payload's structure — scheme,
 * host, encoding, embedded credentials, known shorteners, lookalike patterns.
 *
 * What this is *not*: a malware scanner, a phishing-database lookup, or a
 * reputation service. Nothing is sent anywhere, so nothing here can know
 * whether a domain is currently hosting a scam. The wording of every finding is
 * chosen so it cannot be read as a clean bill of health: the best available
 * verdict is "no obvious warning found", never "safe".
 */
import { inspectQrPayloadSecuritySync } from "../qr/data-template";
import type { ContentTypeId } from "./content";

export type RiskLevel = "clear" | "caution" | "high" | "unverified";

export type Finding = {
  level: Exclude<RiskLevel, "clear">;
  title: string;
  detail: string;
};

export type Inspection = {
  level: RiskLevel;
  headline: string;
  findings: Finding[];
  /** Host that would be opened, when the payload is a URL. */
  host: string | null;
  scheme: string | null;
  /** Normalised URL when one could be parsed, for the confirm-then-open flow. */
  url: string | null;
};

/** Schemes that are safe to hand to a browser after confirmation. */
const WEB_SCHEMES = new Set(["http:", "https:"]);
/** Schemes that trigger an app or a call — never auto-opened. */
const APP_SCHEMES = new Set([
  "tel:",
  "sms:",
  "mailto:",
  "geo:",
  "bitcoin:",
  "ethereum:",
  "litecoin:",
  "dogecoin:",
  "solana:",
  "upi:",
  "whatsapp:",
  "market:",
  "itms-apps:",
]);
/**
 * Schemes that can run code or reach the filesystem. Browsers mostly refuse
 * these, and this tool refuses them first.
 */
const DANGEROUS_SCHEMES = new Set([
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
  "blob:",
  "filesystem:",
  "about:",
  "chrome:",
  "chrome-extension:",
  "moz-extension:",
  "ms-msdt:",
  "search-ms:",
  "ms-excel:",
  "ms-word:",
  "ms-powerpoint:",
  "shell:",
  "jar:",
  "view-source:",
  "intent:",
  "android-app:",
]);

/**
 * Schemes that a recognised content type already explains. Reporting
 * "unrecognised URI scheme" for `WIFI:` or `UPI:` would be a false alarm about a
 * payload the parser has understood perfectly.
 */
const EXPLAINED_BY_CONTENT: Partial<Record<string, ContentTypeId[]>> = {
  "wifi:": ["wifi"],
  "mecard:": ["mecard", "vcard"],
  "upi:": ["payment"],
  "sms:": ["sms"],
  "smsto:": ["sms"],
  "tel:": ["phone"],
  "mailto:": ["email"],
  "geo:": ["geo"],
  "bitcoin:": ["crypto"],
  "ethereum:": ["crypto"],
  "litecoin:": ["crypto"],
  "dogecoin:": ["crypto"],
  "solana:": ["crypto"],
  "https:": ["url", "social", "app", "whatsapp"],
  "http:": ["url", "social", "app", "whatsapp"],
};

const SHORTENERS = new Set([
  "bit.ly",
  "bitly.com",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "rebrand.ly",
  "cutt.ly",
  "shorturl.at",
  "tiny.cc",
  "rb.gy",
  "s.id",
  "lnkd.in",
  "t.ly",
  "v.gd",
  "shorte.st",
  "adf.ly",
  "amzn.to",
  "youtu.be",
  "forms.gle",
  "wa.me",
]);

/**
 * Well-known brands, used for lookalike detection. The comparison is
 * deliberately conservative: it flags a *brand name inside a host that is not
 * the brand's real domain*, plus homoglyph substitutions and edit distances of
 * one, which are the shapes typosquatting actually takes.
 */
const BRANDS: { name: string; domains: string[] }[] = [
  { name: "Google", domains: ["google.com", "google.co.in", "google.co.uk"] },
  { name: "PayPal", domains: ["paypal.com", "paypal.me"] },
  { name: "Apple", domains: ["apple.com", "icloud.com"] },
  { name: "Microsoft", domains: ["microsoft.com", "live.com", "office.com"] },
  { name: "Amazon", domains: ["amazon.com", "amazon.in", "amazon.co.uk"] },
  { name: "Netflix", domains: ["netflix.com"] },
  { name: "Facebook", domains: ["facebook.com", "fb.com"] },
  { name: "Instagram", domains: ["instagram.com"] },
  { name: "WhatsApp", domains: ["whatsapp.com", "wa.me"] },
  { name: "GitHub", domains: ["github.com"] },
  { name: "LinkedIn", domains: ["linkedin.com"] },
  { name: "Dropbox", domains: ["dropbox.com"] },
  { name: "Steam", domains: ["steampowered.com", "steamcommunity.com"] },
  { name: "Binance", domains: ["binance.com"] },
  { name: "Coinbase", domains: ["coinbase.com"] },
  { name: "HDFC Bank", domains: ["hdfcbank.com"] },
  { name: "ICICI Bank", domains: ["icicibank.com"] },
  { name: "State Bank of India", domains: ["onlinesbi.sbi", "sbi.co.in"] },
  { name: "Paytm", domains: ["paytm.com"] },
  { name: "PhonePe", domains: ["phonepe.com"] },
  { name: "Google Pay", domains: ["pay.google.com"] },
];

/** Characters commonly substituted for Latin letters to fake a domain. */
const HOMOGLYPHS: Record<string, string> = {
  "0": "o",
  "1": "l",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "9": "g",
  а: "a",
  е: "e",
  о: "o",
  р: "p",
  с: "c",
  у: "y",
  х: "x",
  і: "i",
  ѕ: "s",
  ԁ: "d",
  ο: "o",
  α: "a",
  ν: "v",
};

const normalise = (value: string) =>
  value
    .toLocaleLowerCase()
    .split("")
    .map((character) => HOMOGLYPHS[character] ?? character)
    .join("");

/** Levenshtein distance, capped for speed — only small distances matter here. */
function editDistance(a: string, b: string, cap = 3): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const previous = new Array<number>(b.length + 1);
  const current = new Array<number>(b.length + 1);
  for (let index = 0; index <= b.length; index += 1) previous[index] = index;
  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    let rowMin = current[0];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
      rowMin = Math.min(rowMin, current[j]);
    }
    if (rowMin > cap) return cap + 1;
    previous.splice(0, previous.length, ...current);
  }
  return previous[b.length];
}

/**
 * Registrable portion of a host, without a full public-suffix list. Handles the
 * common two-part suffixes (co.uk, com.au, …) so `paypal.co.uk` is not mistaken
 * for a bare `co.uk`.
 */
export function registrableDomain(host: string): string {
  const parts = host.toLocaleLowerCase().split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  const twoLevel = /^(co|com|org|net|gov|edu|ac|or|ne|go|nic)\.[a-z]{2}$/;
  const lastTwo = parts.slice(-2).join(".");
  if (twoLevel.test(lastTwo)) return parts.slice(-3).join(".");
  return lastTwo;
}

function decodeHost(host: string): string {
  try {
    return decodeURIComponent(host);
  } catch {
    return host;
  }
}

/** Inspect a decoded payload. Pure, synchronous and offline by construction. */
export function inspectPayload(
  payload: string,
  contentType: ContentTypeId,
): Inspection {
  const findings: Finding[] = [];
  const trimmed = payload.trim();
  const schemeMatch = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed);
  const scheme = schemeMatch ? `${schemeMatch[1].toLocaleLowerCase()}:` : null;

  let url: string | null = null;
  let host: string | null = null;

  if (scheme && DANGEROUS_SCHEMES.has(scheme)) {
    findings.push({
      level: "high",
      title: "Executable or local scheme",
      detail: `${scheme} can run code, open local files or hand control to another application. This scanner will not open it, and neither should you unless you fully trust whoever printed the code.`,
    });
  } else if (scheme && WEB_SCHEMES.has(scheme)) {
    try {
      const parsed = new URL(trimmed);
      url = parsed.href;
      host = parsed.hostname.toLocaleLowerCase();
    } catch {
      findings.push({
        level: "caution",
        title: "Malformed web address",
        detail:
          "The payload starts like a web address but cannot be parsed as a valid URL. Expect a broken or deliberately confusing destination.",
      });
    }
  } else if (scheme && APP_SCHEMES.has(scheme)) {
    findings.push({
      level: "caution",
      title: "Opens another application",
      detail: `${scheme} hands the payload to your phone or mail client rather than a website. Check the destination before confirming.`,
    });
  } else if (scheme) {
    const explained =
      EXPLAINED_BY_CONTENT[scheme]?.includes(contentType) ?? false;
    if (!explained)
      findings.push({
        level: "caution",
        title: "Unrecognised URI scheme",
        detail: `${scheme} is not a scheme this tool recognises. Some apps register custom schemes that can perform actions without a confirmation screen.`,
      });
  }

  if (host) {
    if (scheme === "http:") {
      findings.push({
        level: "caution",
        title: "Not encrypted (HTTP)",
        detail:
          "This address uses plain HTTP, so anything typed on that page — passwords, card numbers — travels in the clear and can be read or altered in transit.",
      });
    }
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      findings.push({
        level: "caution",
        title: "Raw IP address instead of a domain",
        detail:
          "Legitimate services almost always use a domain name. A bare IP address hides who owns the destination and cannot be checked against a certificate's name.",
      });
    }
    if (host.startsWith("[")) {
      findings.push({
        level: "caution",
        title: "IPv6 literal address",
        detail:
          "The link points at a raw IPv6 address rather than a named domain, which hides the destination's identity.",
      });
    }
    if (host.includes("xn--")) {
      let decoded = host;
      try {
        decoded = new URL(`http://${host}`).hostname;
      } catch {
        /* punycode that will not decode is itself suspicious */
      }
      findings.push({
        level: "caution",
        title: "Punycode / internationalised domain",
        detail: `The host encodes non-Latin characters (${decodeHost(decoded)}). This is legitimate for many sites, but it is also the standard trick for making one domain render exactly like another — read it character by character.`,
      });
    }
    if (host.split(".").length > 4) {
      findings.push({
        level: "caution",
        title: "Deeply nested subdomain",
        detail: `${host} has ${host.split(".").length} labels. Extra subdomains are a common way to push a fake brand name to the front of an address, e.g. paypal.com.security-check.example.`,
      });
    }
    if (host.includes("@")) {
      findings.push({
        level: "high",
        title: "Embedded credentials in the address",
        detail:
          "The address contains an @ sign before the real host, a classic disguise: everything before the @ is user information and is ignored by the browser, so the site you actually reach is the part after it.",
      });
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.username || parsed.password)
        findings.push({
          level: "high",
          title: "Username or password embedded in the URL",
          detail:
            "Credentials inside a link are sent to the site and are visible in history and logs. Real services never hand out links that carry a password this way.",
        });
      if (parsed.port && !["80", "443", ""].includes(parsed.port))
        findings.push({
          level: "caution",
          title: `Unusual port ${parsed.port}`,
          detail:
            "The link specifies a non-standard port. Ordinary public websites use 80 or 443.",
        });
    } catch {
      /* already reported as malformed */
    }

    const domain = registrableDomain(host);
    if (SHORTENERS.has(domain))
      findings.push({
        level: "caution",
        title: "Shortened link",
        detail: `${domain} redirects somewhere else, so the address bar tells you nothing until you arrive. Expand it with a link-preview service you trust, or open it in a browser you can close immediately.`,
      });

    for (const brand of BRANDS) {
      if (
        brand.domains.some(
          (candidate) => host === candidate || host.endsWith(`.${candidate}`),
        )
      )
        continue;
      const brandInHost = normalise(host).includes(
        normalise(brand.name.split(" ")[0]),
      );
      const closeTo = brand.domains.some((candidate) => {
        const candidateName = candidate.split(".")[0];
        const domainName = domain.split(".")[0];
        return (
          domainName !== candidateName &&
          Math.abs(domainName.length - candidateName.length) <= 2 &&
          editDistance(normalise(domainName), normalise(candidateName)) <= 1
        );
      });
      if (brandInHost || closeTo) {
        findings.push({
          level: "high",
          title: `Possible ${brand.name} impersonation`,
          detail: `The host ${host} is not ${brand.domains[0]} but is built to look like it. Genuine ${brand.name} pages live on ${brand.domains.join(" or ")} and use the same domain in the address bar.`,
        });
        break;
      }
    }

    if (/[^\x20-\x7e]/.test(host))
      findings.push({
        level: "caution",
        title: "Non-ASCII characters in the host",
        detail:
          "The hostname contains characters outside plain ASCII. That can be a legitimate international domain, or a homograph attack; the browser will show it in its punycode form (xn--…), which is what you should compare.",
      });

    const rawHost = (
      /^https?:\/\/(?:[^@/?#]+@)?([^:/?#]+)/i.exec(trimmed)?.[1] ?? host
    ).toLocaleLowerCase();
    if (
      /^0x[0-9a-f]+$/i.test(rawHost) ||
      /^\d{8,10}$/.test(rawHost) ||
      /^0\d+\./.test(rawHost)
    ) {
      findings.push({
        level: "high",
        title: "Obfuscated numeric IP address",
        detail:
          "The hostname encodes an IP address in hexadecimal, octal or integer form — a classic phishing technique used to hide the real server.",
      });
    }

    try {
      const parsedUrl = new URL(trimmed);
      const cleanPath = parsedUrl.pathname.toLocaleLowerCase();
      if (
        /\.(apk|exe|msi|scr|bat|cmd|ps1|vbs|hta|jar|dmg|pkg)$/i.test(cleanPath)
      ) {
        findings.push({
          level: "high",
          title: "Direct executable or app-package download",
          detail: `This QR link points directly to a downloadable binary (${cleanPath.split(".").pop()?.toUpperCase()}). Malware campaigns use QR codes to bypass app stores and email filters.`,
        });
      }

      const redirectParamKeys = [
        "redirect",
        "redirect_uri",
        "redirect_url",
        "return_to",
        "returnto",
        "next",
        "continue",
        "dest",
        "destination",
      ];
      for (const paramKey of redirectParamKeys) {
        const val =
          parsedUrl.searchParams.get(paramKey) ??
          parsedUrl.searchParams.get(paramKey.toUpperCase());
        if (val && /^https?:\/\//i.test(val.trim())) {
          try {
            const innerHost = new URL(val.trim()).hostname.toLocaleLowerCase();
            if (registrableDomain(innerHost) !== registrableDomain(host)) {
              findings.push({
                level: "caution",
                title: "Redirects through another parameter",
                detail: `Query parameter "${paramKey}" forwards to ${innerHost}, which differs from ${host}. Attackers abuse open redirects on trusted domains to disguise phishing destinations.`,
              });
              break;
            }
          } catch {
            /* ignore malformed inner param */
          }
        }
      }
    } catch {
      /* already handled */
    }
  }

  // Bidirectional / zero-width spoofing check across any payload.
  if (/[\u202a-\u202e\u2066-\u2069\u200b-\u200d\ufeff]/.test(trimmed)) {
    findings.push({
      level: "high",
      title: "Hidden directional or zero-width characters",
      detail:
        "This payload contains invisible Unicode direction-override or zero-width characters commonly used to disguise file extensions or spoof domains.",
    });
  }

  // UPI collect / mandate scam detection.
  if (/^upi:\/\/(collect|mandate)\b/i.test(trimmed)) {
    findings.push({
      level: "high",
      title: "UPI collect or recurring-mandate request",
      detail:
        "Scanning a QR code is never required to receive money. This URI initiates an outgoing collect or recurring mandate debit from your account.",
    });
  } else if (/^upi:\/\/pay\b/i.test(trimmed)) {
    try {
      const qIndex = trimmed.indexOf("?");
      const upiParams = new URLSearchParams(
        qIndex >= 0 ? trimmed.slice(qIndex + 1) : "",
      );
      if (upiParams.get("mode") === "02" || upiParams.get("purpose") === "14") {
        findings.push({
          level: "high",
          title: "UPI recurring mandate / autopay flag",
          detail:
            "This UPI URI sets mandate parameters that authorize recurring debits rather than a one-time payment.",
        });
      }
    } catch {
      /* ignore */
    }
  }

  // Cryptographic seal & tamper check for QUICKKIT Data Templates & Encrypted Vaults.
  const cryptoSync = inspectQrPayloadSecuritySync(trimmed);
  if (cryptoSync.kind === "tampered" || cryptoSync.kind === "expired") {
    findings.push({
      level: "high",
      title: cryptoSync.headline,
      detail: cryptoSync.detail,
    });
  }

  if (contentType === "wifi")
    findings.push({
      level: "caution",
      title: "Contains network credentials",
      detail:
        "This code carries a Wi-Fi network name and possibly its password. Anyone who photographed the code has those credentials — avoid saving it to shared history or sending it on.",
    });

  if (contentType === "payment" || contentType === "crypto")
    findings.push({
      level: "caution",
      title: "Money-changing payload",
      detail:
        "Payment codes are a favourite target for sticker swaps and altered addresses. Confirm the payee or wallet address against a source you trust before sending anything.",
    });

  if (!scheme && contentType === "unknown" && trimmed.length > 0) {
    const controlChars = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(
      trimmed,
    );
    const scriptish = /<\s*(script|iframe|object|embed)\b/i.test(trimmed);
    if (controlChars)
      findings.push({
        level: "caution",
        title: "Control characters present",
        detail:
          "The payload contains non-printable characters. That is normally a damaged or hand-crafted code rather than a real product.",
      });
    if (scriptish)
      findings.push({
        level: "high",
        title: "Markup that looks like executable content",
        detail:
          "The payload contains HTML script or frame markup. This tool never renders decoded content as HTML; treat a code that carries markup as hostile.",
      });
  }

  const level: RiskLevel = findings.some((finding) => finding.level === "high")
    ? "high"
    : findings.some((finding) => finding.level === "caution")
      ? "caution"
      : url || contentType === "text" || contentType === "unknown"
        ? "clear"
        : "unverified";

  const headline =
    level === "high"
      ? "High risk — treat this destination as unsafe"
      : level === "caution"
        ? "Caution — inspect before opening"
        : level === "unverified"
          ? "Unable to verify — no automatic check applies"
          : "No obvious warning found";

  return { level, headline, findings, host, scheme, url };
}
