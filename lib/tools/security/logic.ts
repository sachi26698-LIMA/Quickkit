import { base64ToBytes, bytesToBase64 } from "../developer-data";
import { parseUniqueJsonObject } from "./json-object";

export const MAX_SECURITY_FILE_BYTES = 25 * 1024 * 1024;
export const PBKDF2_ITERATIONS = 600_000;
// The encoded envelope must fit back into the decrypt input.
export const MAX_TEXT_BYTES = 1_000_000;
export const MAX_TEXT_ENVELOPE_CHARS = 1_333_400;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const magic = encoder.encode("QKENC1");
const words =
  `acorn amber anchor apple apron arch arrow ash atlas autumn badge bamboo basin beach beacon berry birch bird bloom blue bolt book breeze brick brook brush cabin cactus candle canyon cedar chalk cherry cloud clover coast comet coral crane creek crown crystal dawn delta dune eagle earth echo elm ember fern field finch flame flint forest frost garden glass globe gold grape green harbor hazel hill honey iris island ivy jade jasmine lake lantern leaf lemon linen lotus maple meadow melon mint moon moss mountain oak ocean olive opal orchid otter pearl pebble pine planet plum pond poppy quartz rain raven reef ridge river robin rose ruby sage sand seagull shell shore sky snow solar sparrow spring star stone storm sugar summer sun sunset swan thyme tiger timber topaz trail tree tulip valley velvet violet wave willow wind winter wolf wood yarn yellow zebra`.split(
    " ",
  );

export function secureIndex(max: number): number {
  if (!Number.isInteger(max) || max < 1 || max > 65536)
    throw new Error("Invalid random selection size.");
  if (!globalThis.crypto?.getRandomValues)
    throw new Error(
      "Secure randomness requires a current browser and a secure context.",
    );
  const limit = Math.floor(0x100000000 / max) * max;
  const value = new Uint32Array(1);
  do {
    crypto.getRandomValues(value);
  } while (value[0] >= limit);
  return value[0] % max;
}
export function randomString(alphabet: string, length: number): string {
  const symbols = Array.from(alphabet);
  if (
    symbols.length < 2 ||
    symbols.length > 256 ||
    new Set(symbols).size !== symbols.length
  )
    throw new Error("Use 2–256 distinct characters in the alphabet.");
  if (!Number.isInteger(length) || length < 1 || length > 512)
    throw new Error("Choose a length from 1 to 512.");
  return Array.from(
    { length },
    () => symbols[secureIndex(symbols.length)],
  ).join("");
}
export function passphrase(
  count: number,
  separator: string,
  capitalize: boolean,
) {
  if (!Number.isInteger(count) || count < 4 || count > 20)
    throw new Error("Choose 4–20 words.");
  if (separator.length > 10)
    throw new Error("Separator must be at most 10 characters.");
  const phrase = Array.from({ length: count }, () => {
    const w = words[secureIndex(words.length)];
    return capitalize ? w[0].toUpperCase() + w.slice(1) : w;
  }).join(separator);
  return phrase;
}
export function assessPassword(value: string) {
  if (!value) throw new Error("Enter a password first.");
  if (value.length > 10000) throw new Error("Password is too long to assess.");
  const length = Array.from(value).length;
  const warnings: string[] = [];
  if (length < 16)
    warnings.push("Use at least 16 characters when the service allows it.");
  if (
    /(password|passw0rd|qwerty|letmein|welcome|admin|123456|iloveyou)/i.test(
      value,
    )
  )
    warnings.push("Avoid common words and predictable sequences.");
  if (/(.)\1{2,}|(.{2,32})\2{2,}|(?:0123|1234|2345|abcd|qwer)/iu.test(value))
    warnings.push(
      "Avoid repeated characters or repeated segments and sequential patterns.",
    );
  const hasRiskPattern = warnings.some((warning) =>
    /common words|repeated characters/.test(warning),
  );
  if (!warnings.length)
    warnings.push(
      "Use a unique password and a password manager; enable multi-factor authentication.",
    );
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) =>
    r.test(value),
  ).length;
  const score = Math.min(
    4,
    Math.max(
      0,
      Math.floor(length / 8) +
        (classes >= 3 ? 1 : 0) -
        (warnings.length > 1 ? 2 : 0),
    ),
  );
  const adjustedScore = hasRiskPattern ? Math.min(score, 1) : score;
  return `Heuristic score: ${adjustedScore}/4 (not a guarantee).\nLength: ${length} Unicode code points.\n${warnings.map((w) => `• ${w}`).join("\n")}\nThis limited offline check cannot detect every pattern or breached password. An entropy formula does not establish the strength of a human-chosen password.`;
}
export type PasswordPolicyRequirements = {
  uppercase: boolean;
  lowercase: boolean;
  digit: boolean;
  symbol: boolean;
};

/** Generate a policy and optionally check only the explicit local requirements. */
export function passwordPolicy(
  minimum: number,
  requirements: PasswordPolicyRequirements,
  sample = "",
) {
  if (!Number.isInteger(minimum) || minimum < 8 || minimum > 128)
    throw new Error("Choose a minimum length from 8 to 128.");
  if (sample.length > 10_000)
    throw new Error("Sample password is too long to check.");
  const classes = [
    { key: "uppercase", label: "uppercase letter", pattern: /\p{Lu}/u },
    { key: "lowercase", label: "lowercase letter", pattern: /\p{Ll}/u },
    { key: "digit", label: "decimal digit", pattern: /\p{Nd}/u },
    {
      key: "symbol",
      label: "non-letter, non-number character",
      pattern: /[^\p{L}\p{N}]/u,
    },
  ] as const;
  const selected = classes.filter((c) => requirements[c.key]);
  const extra = selected.length
    ? `\n• Optional composition rules selected: ${selected.map((c) => c.label).join(", ")}. Composition rules may harm usability; review current guidance before requiring them.`
    : "";
  const missing = selected
    .filter((c) => !c.pattern.test(sample))
    .map((c) => c.label);
  const check = sample
    ? `\n\nLocal sample check: ${Array.from(sample).length >= minimum ? "meets" : "does not meet"} the minimum length.${selected.length ? (missing.length ? ` Missing selected requirements: ${missing.join(", ")}.` : " Meets the selected composition requirements.") : ""} Length counts Unicode code points, which may differ from a service's rules. This is not blocklist screening or full policy compliance.`
    : "";
  return `Password policy draft\n\n• Require at least ${minimum} characters and allow long passphrases and password managers.${extra}\n• Screen new passwords against a reputable compromised-password blocklist without disclosing plaintext.\n• Do not require arbitrary periodic changes; change passwords when compromise is suspected.\n• Enable multi-factor authentication where available.\n• Rate-limit sign-in attempts and store passwords using a modern password hashing scheme such as Argon2id.\n• Review this draft against current standards and your organization’s requirements.${check}`;
}

export function entropy(length: number, pool: number) {
  if (
    !Number.isInteger(length) ||
    length < 1 ||
    length > 10000 ||
    !Number.isInteger(pool) ||
    pool < 2 ||
    pool > 1000000
  )
    throw new Error("Use length 1–10,000 and alphabet size 2–1,000,000.");
  return `${(length * Math.log2(pool)).toFixed(2)} bits, assuming independent uniform random selection from ${pool} symbols. This is not a strength estimate for a human-chosen password.`;
}
export function bytesToUrl(bytes: Uint8Array) {
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
export function urlToBytes(value: string) {
  if (
    !/^[A-Za-z0-9_-]+={0,2}$/.test(value) ||
    /=/.test(value.slice(0, -2)) ||
    value.replace(/=+$/, "").length % 4 === 1
  )
    throw new Error("Enter valid Base64URL data.");
  return base64ToBytes(value.replace(/-/g, "+").replace(/_/g, "/"));
}
export function base64url(value: string, decode: boolean) {
  if (!value || value.length > 1_000_000)
    throw new Error("Enter input up to 1,000,000 characters.");
  try {
    return decode
      ? decoder.decode(urlToBytes(value))
      : bytesToUrl(encoder.encode(value));
  } catch {
    throw new Error("Invalid Base64URL or UTF-8 input.");
  }
}
function cryptoApi() {
  if (!globalThis.crypto?.subtle || !globalThis.crypto.getRandomValues)
    throw new Error(
      "Web Crypto is unavailable. Use a current browser over HTTPS.",
    );
  return crypto;
}
async function derive(password: string, salt: Uint8Array<ArrayBuffer>) {
  if (!password || encoder.encode(password).length > 4096)
    throw new Error("Enter an encryption password up to 4096 UTF-8 bytes.");
  const c = cryptoApi();
  const material = await c.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return c.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function encryptBytes(
  bytes: Uint8Array<ArrayBuffer>,
  password: string,
): Promise<Uint8Array<ArrayBuffer>> {
  if (bytes.length > MAX_SECURITY_FILE_BYTES)
    throw new Error("Input exceeds the 25 MiB limit.");
  const c = cryptoApi();
  const salt = c.getRandomValues(new Uint8Array(16));
  const iv = c.getRandomValues(new Uint8Array(12));
  const header = new Uint8Array(magic.length + salt.length + iv.length);
  header.set(magic);
  header.set(salt, magic.length);
  header.set(iv, magic.length + salt.length);
  const key = await derive(password, salt);
  const ciphertext = new Uint8Array(
    await c.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: header, tagLength: 128 },
      key,
      bytes,
    ),
  );
  const result = new Uint8Array(header.length + ciphertext.length);
  result.set(header);
  result.set(ciphertext, header.length);
  return result;
}
export async function decryptBytes(
  bytes: Uint8Array<ArrayBuffer>,
  password: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const headerLength = magic.length + 16 + 12;
  if (
    bytes.length < headerLength + 16 ||
    bytes.length > MAX_SECURITY_FILE_BYTES + headerLength + 16 ||
    !magic.every((b, i) => bytes[i] === b)
  )
    throw new Error("Invalid or unsupported encrypted data.");
  const header = bytes.slice(0, headerLength);
  const salt = bytes.slice(magic.length, magic.length + 16);
  const iv = bytes.slice(magic.length + 16, headerLength);
  const key = await derive(password, salt);
  try {
    return new Uint8Array(
      await cryptoApi().subtle.decrypt(
        { name: "AES-GCM", iv, additionalData: header, tagLength: 128 },
        key,
        bytes.slice(headerLength),
      ),
    );
  } catch {
    throw new Error("Unable to decrypt: incorrect password or corrupted data.");
  }
}
export async function textCrypto(
  text: string,
  password: string,
  decrypt: boolean,
) {
  if (!text) throw new Error("Enter text first.");
  if (decrypt && text.length > MAX_TEXT_ENVELOPE_CHARS)
    throw new Error("Encrypted text is too large; use the file tool instead.");
  if (decrypt) {
    try {
      return decoder.decode(
        await decryptBytes(new Uint8Array(urlToBytes(text)), password),
      );
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Unable to decrypt"))
        throw e;
      throw new Error("Unable to decrypt: invalid data, password, or UTF-8.");
    }
  }
  const bytes = encoder.encode(text);
  if (bytes.length > MAX_TEXT_BYTES)
    throw new Error(
      "Text exceeds 1,000,000 UTF-8 bytes; use the file tool instead.",
    );
  return bytesToUrl(await encryptBytes(bytes, password));
}
export function generateKey() {
  return Array.from(cryptoApi().getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export function compareHashes(a: string, b: string) {
  const x = a.trim().toLowerCase(),
    y = b.trim().toLowerCase();
  if (
    !/^[a-f0-9]+$/.test(x) ||
    !/^[a-f0-9]+$/.test(y) ||
    x.length % 2 ||
    y.length % 2 ||
    x.length > 1024 ||
    y.length > 1024
  )
    throw new Error(
      "Enter two even-length hexadecimal digests (up to 1024 characters each).",
    );
  const lengths = `First digest: ${x.length / 2} bytes. Second digest: ${y.length / 2} bytes.`;
  const note =
    "A digest length does not identify its algorithm; compare outputs of the same algorithm. MD5 and SHA-1 are legacy and unsuitable for collision-resistant integrity. A match does not establish authenticity unless the reference digest is trusted. This comparison is not a password or MAC verification API.";
  return `${x === y ? "The hexadecimal digests match." : "The digests do not match."}\n${lengths}${x.length !== y.length ? " Different lengths cannot represent equal digests." : ""}\n${note}`;
}
export function decodeJwt(token: string, now = Date.now()) {
  if (token.length > 100_000) throw new Error("Token is too large.");
  const parts = token.trim().split(".");
  if (
    parts.length !== 3 ||
    !parts[0] ||
    !parts[1] ||
    (parts[2] && !/^[\w-]+$/.test(parts[2]))
  )
    throw new Error("Enter a compact three-part JWT.");
  let header: Record<string, unknown>, claims: Record<string, unknown>;
  try {
    header = parseUniqueJsonObject(decoder.decode(urlToBytes(parts[0])));
    claims = parseUniqueJsonObject(decoder.decode(urlToBytes(parts[1])));
  } catch {
    throw new Error(
      "JWT header and payload must be Base64URL-encoded UTF-8 JSON objects without duplicate members (maximum nesting 64).",
    );
  }
  let expiry = "No expiration claim.";
  if (claims.exp !== undefined) {
    if (
      typeof claims.exp !== "number" ||
      !Number.isFinite(claims.exp) ||
      !Number.isFinite(new Date(claims.exp * 1000).getTime())
    )
      expiry = "Invalid exp claim; NumericDate seconds expected.";
    else
      expiry = `${claims.exp * 1000 <= now ? "Expired" : "Not expired"} at ${new Date(claims.exp * 1000).toISOString()} (device clock).`;
  }
  return `UNVERIFIED: decoding does not verify the signature or authenticate claims.\n${expiry}\n\nHeader:\n${JSON.stringify(header, null, 2)}\n\nClaims:\n${JSON.stringify(claims, null, 2)}`;
}
export async function signJwt(payload: string, secret: string) {
  let claims: Record<string, unknown>;
  try {
    claims = parseUniqueJsonObject(payload);
  } catch {
    throw new Error(
      "Enter a valid JSON claims object without duplicate members (maximum nesting 64).",
    );
  }
  const raw = encoder.encode(secret);
  if (raw.length < 32 || raw.length > 4096)
    throw new Error("Use a test key of 32–4096 UTF-8 bytes.");
  const c = cryptoApi();
  const head = bytesToUrl(
    encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })),
  );
  const body = bytesToUrl(encoder.encode(JSON.stringify(claims)));
  const input = `${head}.${body}`;
  const key = await c.subtle.importKey(
    "raw",
    raw,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return `${input}.${bytesToUrl(new Uint8Array(await c.subtle.sign("HMAC", key, encoder.encode(input))))}`;
}
const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const phone = /(?<!\w)\+?\d[\d ().-]{7,}\d(?!\w)/g;
/** Luhn identifies plausible card-number patterns, not actual account validity. */
function luhn(digits: string) {
  let sum = 0;
  for (let i = digits.length - 1, position = 0; i >= 0; i--, position++) {
    let value = Number(digits[i]);
    if (position % 2 === 1) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
  }
  return sum % 10 === 0 && !/^(\d)\1+$/.test(digits);
}
const possibleCard = /(?<![\d])(?:\d[ -]?){12,18}\d(?![\d])/g;
export function sensitiveInfo(text: string, mask: boolean) {
  if (!text || text.length > 1_000_000)
    throw new Error("Enter text up to 1,000,000 characters.");
  let cards = 0;
  const withoutCards = text.replace(possibleCard, (match) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19 || !luhn(digits)) return match;
    cards++;
    return "[CARD]";
  });
  if (mask)
    return withoutCards.replace(email, "[EMAIL]").replace(phone, "[PHONE]");
  const emails = withoutCards.match(email)?.length ?? 0,
    phones = withoutCards.match(phone)?.length ?? 0;
  return `Potential email addresses: ${emails}\nPotential phone-like strings: ${phones}\nPotential payment card numbers (Luhn-valid): ${cards}\nThese patterns can miss sensitive data and can produce false positives; a checksum does not confirm an active card. Review manually before sharing.`;
}
/** Static request-header analysis. Never include values or user-supplied names in the report. */
export function analyzeHeaders(text: string) {
  if (!text.trim() || text.length > 100_000)
    throw new Error("Enter request headers up to 100,000 characters.");
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
  const fields = new Map<string, string[]>();
  for (const line of lines) {
    const i = line.indexOf(":");
    if (
      i < 1 ||
      !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(line.slice(0, i)) ||
      /[\x00-\x08\x0a-\x1f\x7f]/.test(line.slice(i + 1))
    )
      throw new Error(
        "Each header must be in Name: value format without control characters or folded lines.",
      );
    const name = line.slice(0, i).toLowerCase();
    fields.set(name, [...(fields.get(name) ?? []), line.slice(i + 1).trim()]);
  }
  if (!fields.size) throw new Error("No request headers found.");
  const findings: string[] = [];
  const auth = fields.get("authorization") ?? [];
  if (auth.length)
    findings.push(
      "MEDIUM: Authorization is present: avoid sharing this header or logging credentials. Use an authenticated HTTPS connection.",
    );
  else
    findings.push(
      "INFO: No Authorization header detected; other credential headers may still be present.",
    );
  if (auth.some((value) => /^basic(?:\s|$)/i.test(value)))
    findings.push(
      "HIGH: Basic credentials are only encoded, not encrypted. Use verified HTTPS and avoid storing or logging them.",
    );
  if (auth.length > 1)
    findings.push(
      "HIGH: Multiple Authorization fields can be handled inconsistently. Send one intended credential.",
    );
  if (fields.has("proxy-authorization"))
    findings.push(
      "HIGH: Proxy-Authorization contains proxy credentials; do not disclose it to an origin or log it.",
    );
  if (
    [...fields.keys()].some((name) =>
      /^(?:x-api-key|api-key|x-auth-token|x-access-token)$/.test(name),
    )
  )
    findings.push(
      "MEDIUM: A common API-key or token header is present. Keep its value confidential and restrict its scope.",
    );
  if (fields.has("cookie"))
    findings.push(
      "MEDIUM: Cookie is present: treat its contents as sensitive and use appropriate cookie protections.",
    );
  if (fields.has("transfer-encoding") && fields.has("content-length"))
    findings.push(
      "HIGH: Both Transfer-Encoding and Content-Length are present. Intermediaries can disagree about message framing; reject ambiguous requests and review the proxy chain.",
    );
  const lengths = fields.get("content-length") ?? [];
  if (lengths.length > 1 || lengths.some((value) => !/^\d+$/.test(value)))
    findings.push(
      "HIGH: Duplicate or invalid Content-Length requires rejection or normalization by the HTTP stack.",
    );
  if ((fields.get("host")?.length ?? 0) > 1)
    findings.push(
      "HIGH: Multiple Host fields may cause routing ambiguity; reject the request.",
    );
  if (
    fields.has("forwarded") ||
    fields.has("x-forwarded-for") ||
    fields.has("x-forwarded-host") ||
    fields.has("x-forwarded-proto")
  )
    findings.push(
      "MEDIUM: Forwarded headers are present. Trust them only when a configured proxy strips untrusted client values.",
    );
  if ((fields.get("referer") ?? []).some((value) => /[?#]/.test(value)))
    findings.push(
      "MEDIUM: Referer includes a query or fragment; review whether sensitive data could be exposed. Values are not included here.",
    );
  return `Parsed ${lines.length} header lines.\n\nStatic findings and remediation:\n${findings.map((finding) => `• ${finding}`).join("\n")}\n\nOnly supplied request headers were reviewed locally. No header values or custom header names are included in this report. This cannot confirm HTTPS, server configuration, intermediary behavior or token validity.`;
}
