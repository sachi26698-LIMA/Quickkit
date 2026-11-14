export function analyzeEmailHeaders(text: string) {
  if (!text.trim() || text.length > 100_000)
    throw new Error("Paste email headers up to 100,000 characters.");
  const lines = text
    .replace(/\r?\n[ \t]+/g, " ")
    .split(/\r?\n/)
    .filter(Boolean);
  const fields = new Map<string, string[]>();
  for (const line of lines) {
    const i = line.indexOf(":");
    if (i <= 0 || !/^[\x21-\x39\x3b-\x7e]+$/.test(line.slice(0, i)))
      throw new Error(
        "Invalid email header line. Paste headers only, not the message body.",
      );
    const name = line.slice(0, i).toLowerCase();
    fields.set(name, [...(fields.get(name) ?? []), line.slice(i + 1).trim()]);
  }
  const auth = fields.get("authentication-results") ?? [];
  return `Received headers: ${fields.get("received")?.length ?? 0}\nAuthentication-Results headers: ${auth.length}\n${auth.length ? auth.map((a, i) => `Reported result ${i + 1}: ${a.slice(0, 2000)}`).join("\n") : "No Authentication-Results supplied."}\n\nHeader fields can be forged; trust only results added by your own mail provider. This tool does not verify SPF, DKIM, DMARC, sender identity or routing.`;
}
function record(text: string, label: string) {
  const value = text.trim().replace(/^"|"$/g, "");
  if (!value || value.length > 100_000 || /[\r\n]/.test(value))
    throw new Error(
      `Enter a single ${label} TXT record up to 100,000 characters.`,
    );
  return value;
}
function tagMap(value: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of value.split(";")) {
    if (!part.trim()) continue;
    const match = part.trim().match(/^([A-Za-z][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match)
      throw new Error(
        "Invalid tag format; use tag=value separated by semicolons.",
      );
    const key = match[1].toLowerCase();
    if (out.has(key)) throw new Error(`Duplicate ${key} tag is invalid.`);
    out.set(key, match[2].trim());
  }
  return out;
}
export function reviewSpf(text: string) {
  const value = record(text, "SPF");
  if (!/^v=spf1(?:\s|$)/i.test(value))
    throw new Error("Enter an SPF TXT record beginning with v=spf1.");
  const terms = value.split(/\s+/).slice(1);
  const all = terms.filter((t) => /^[+?~\-]?all$/i.test(t));
  const lookups = terms.filter(
    (t) =>
      /^[+?~\-]?(?:a|mx|include|exists|ptr)(?:[:/]|$)/i.test(t) ||
      /^redirect=/i.test(t),
  ).length;
  const findings: string[] = [];
  if (all.some((t) => /^\+?all$/i.test(t)))
    findings.push("HIGH Warning: +all allows any sender.");
  if (all.length > 1)
    findings.push(
      "Warning: multiple all mechanisms are unusual; later terms may be unreachable.",
    );
  if (all.length && terms.indexOf(all[0]) < terms.length - 1)
    findings.push("MEDIUM: Terms after all may be unreachable.");
  if (terms.some((t) => /^[+?~\-]?ptr(?:[:/]|$)/i.test(t)))
    findings.push("MEDIUM: Avoid ptr; it is slow and unreliable.");
  if (lookups > 10)
    findings.push(
      "HIGH: The direct record contains more than 10 lookup-triggering terms; an evaluation path may exceed the SPF limit, depending on which terms are reached. Nested lookups also count.",
    );
  const redirects = terms.filter((term) => /^redirect=/i.test(term));
  const explanations = terms.filter((term) => /^exp=/i.test(term));
  if (redirects.length > 1 || explanations.length > 1)
    findings.push(
      "HIGH: Duplicate redirect or exp modifiers are invalid; publish at most one of each.",
    );
  if (redirects.some((term) => !term.slice(term.indexOf("=") + 1)))
    findings.push("HIGH: redirect requires a non-empty domain specification.");
  if (redirects.length && all.length)
    findings.push(
      "INFO: An all mechanism causes the redirect modifier to be ignored.",
    );
  const mechanisms = new Set([
    "all",
    "include",
    "a",
    "mx",
    "ptr",
    "ip4",
    "ip6",
    "exists",
  ]);
  for (const term of terms) {
    if (/^[A-Za-z][A-Za-z0-9_.-]*=/.test(term)) continue; // unknown modifiers are ignored by SPF
    const match = term.match(/^[+?~\-]?([A-Za-z0-9]+)(.*)$/);
    if (!match || !mechanisms.has(match[1].toLowerCase())) {
      findings.push(
        "HIGH: An unrecognized or malformed mechanism is present; this can produce a permanent SPF error.",
      );
      continue;
    }
    const name = match[1].toLowerCase(),
      rest = match[2];
    if (
      (name === "all" && rest) ||
      (["include", "exists", "ip4", "ip6"].includes(name) &&
        (!rest.startsWith(":") || rest.length === 1))
    )
      findings.push(
        `HIGH: An ${name} mechanism has a missing or invalid argument.`,
      );
  }
  if (!all.length && !terms.some((t) => /^redirect=/i.test(t)))
    findings.push("MEDIUM: No all or redirect terminator found.");
  return `SPF mechanisms: ${terms.length}\nAll mechanism: ${all.length ? all.join(", ") : "not present"}\nDirect DNS-lookup mechanisms: ${lookups}\n${findings.join("\n")}\nThe direct term count is not a count of lookups actually performed: mechanisms short-circuit and redirect may be ignored. Nested includes, macros, redirects, DNS record multiplicity, void lookups and actual authorization were not checked. The total DNS lookup count may be higher.`;
}
export function reviewDmarc(text: string) {
  const value = record(text, "DMARC");
  if (!/^v=DMARC1\s*;/i.test(value))
    throw new Error("Enter a DMARC TXT record beginning with v=DMARC1;.");
  const tags = tagMap(value);
  const policy = tags.get("p")?.toLowerCase();
  if (!policy || !["none", "quarantine", "reject"].includes(policy))
    throw new Error("DMARC requires p=none, p=quarantine, or p=reject.");
  const findings: string[] = [];
  const order = [...tags.keys()];
  if (
    tags.get("v")?.toUpperCase() !== "DMARC1" ||
    order[0] !== "v" ||
    order[1] !== "p"
  )
    findings.push(
      "HIGH: v=DMARC1 must be first and p must immediately follow it; check the published record.",
    );
  const pct = tags.get("pct");
  if (pct !== undefined && (!/^\d+$/.test(pct) || Number(pct) > 100))
    findings.push("HIGH: pct must be an integer from 0 to 100.");
  else if (pct !== undefined && Number(pct) < 100)
    findings.push(
      "MEDIUM: pct is below 100; receivers may not enforce policy for all messages.",
    );
  for (const key of ["adkim", "aspf"])
    if (tags.has(key) && !["r", "s"].includes(tags.get(key)!.toLowerCase()))
      findings.push(`HIGH: ${key} must be r or s.`);
  if (
    tags.has("sp") &&
    !["none", "quarantine", "reject"].includes(tags.get("sp")!.toLowerCase())
  )
    findings.push("HIGH: sp must be none, quarantine or reject.");
  if (!tags.has("rua"))
    findings.push(
      "INFO: Consider aggregate reports with rua where appropriate.",
    );
  return `DMARC policy: ${policy}. ${policy === "none" ? "Monitoring policy does not request rejection or quarantine." : "Enforcement depends on receiving servers and alignment."}\n${findings.join("\n")}\nPasted-record review only; DNS presence, external reporting authorization, alignment and effective policy were not verified.`;
}
export function reviewDkim(text: string) {
  const value = record(text, "DKIM");
  const tags = tagMap(value);
  if (!tags.has("p"))
    throw new Error("DKIM record must contain a p= public key tag.");
  const raw = tags.get("p")!.replace(/\s/g, "");
  const type = (tags.get("k") ?? "rsa").toLowerCase();
  const findings: string[] = [];
  if (tags.has("v") && tags.get("v")!.toUpperCase() !== "DKIM1")
    findings.push("HIGH: Unrecognized DKIM version.");
  if (!["rsa", "ed25519"].includes(type))
    findings.push("HIGH: Unrecognized DKIM key type.");
  if (
    raw &&
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      raw,
    )
  )
    findings.push("HIGH: Public key is not valid padded Base64.");
  return `Public key tag: ${raw ? "present" : "empty (key revoked)"}.\nKey type: ${type}\n${findings.join("\n")}\nThese tag-only findings do not verify selector DNS, signatures or domain ownership; a separate key-structure check may follow.`;
}

/** Inspect a DKIM public key locally; no message signature, DNS or ownership verification. */
export async function inspectDkimPublicKey(text: string): Promise<string> {
  const tags = tagMap(record(text, "DKIM"));
  const value = tags.get("p")?.replace(/\s/g, "");
  if (value === undefined)
    throw new Error("DKIM record must contain a p= public key tag.");
  if (!value)
    return "Key is revoked (empty p=); no cryptographic key was imported.";
  if (
    value.length > 20_000 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      value,
    )
  )
    return "Key structure: invalid Base64 or exceeds the size limit.";
  if (!globalThis.crypto?.subtle)
    return "Key structure: could not be checked because Web Crypto is unavailable.";
  const bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  const type = (tags.get("k") ?? "rsa").toLowerCase();
  if (type === "ed25519") {
    if (bytes.length !== 32)
      return "Key structure: Ed25519 public key must be 32 bytes.";
    try {
      await crypto.subtle.importKey("raw", bytes, { name: "Ed25519" }, false, [
        "verify",
      ]);
      return "Key structure: a 32-byte Ed25519 public key was imported. This does not verify a message signature.";
    } catch {
      return "Key structure: Ed25519 import unavailable or rejected by this browser; no signature was verified.";
    }
  }
  if (type !== "rsa")
    return "Key structure: unsupported DKIM key type; no key imported.";
  // DKIM RSA keys may be DER RSAPublicKey (PKCS#1). Web Crypto requires an
  // SPKI wrapper. Try SPKI first, then wrap PKCS#1 without changing its bytes.
  function length(n: number): number[] {
    if (n < 128) return [n];
    if (n <= 255) return [0x81, n];
    return [0x82, n >> 8, n & 255];
  }
  const algorithm = [
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01,
    0x01, 0x05, 0x00,
  ];
  const bitString = [0x03, ...length(bytes.length + 1), 0, ...bytes];
  const body = new Uint8Array([...algorithm, ...bitString]);
  const wrapped = new Uint8Array([0x30, ...length(body.length), ...body]);
  for (const candidate of [bytes, wrapped]) {
    try {
      const key = await crypto.subtle.importKey(
        "spki",
        candidate,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"],
      );
      const bits = (key.algorithm as RsaKeyAlgorithm).modulusLength;
      return `Key structure: RSA public key imported; modulus ${bits} bits.${bits < 1024 ? " HIGH: Fewer than 1024 bits is below the DKIM minimum." : bits < 2048 ? " Consider upgrading to 2048 bits where supported." : ""} This does not verify a message signature.`;
    } catch {
      /* Try the other representation. */
    }
  }
  return "Key structure: RSA DER key is malformed or unsupported by this browser; no signature was verified.";
}
