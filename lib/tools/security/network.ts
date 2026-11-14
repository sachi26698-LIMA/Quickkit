import {
  reviewSpf,
  reviewDkim,
  reviewDmarc,
  inspectDkimPublicKey,
} from "./email";

/** DNS queries go only to this fixed public resolver; never fetch a user-supplied URL. */
const ENDPOINT = "https://cloudflare-dns.com/dns-query";
export const DNS_TYPES = [
  "A",
  "AAAA",
  "MX",
  "TXT",
  "NS",
  "CNAME",
  "CAA",
] as const;
export type DnsType = (typeof DNS_TYPES)[number];
export function validatePublicDomain(input: string) {
  const name = input.trim().replace(/\.$/, "").toLowerCase();
  if (name.length > 253 || !name.includes(".") || !/^[a-z0-9._-]+$/.test(name))
    throw new Error(
      "Enter a public ASCII domain name, not a URL, IP address or single-label name.",
    );
  const labels = name.split(".");
  if (
    labels.some(
      (label) =>
        !label ||
        label.length > 63 ||
        !/^[a-z0-9_](?:[a-z0-9_-]*[a-z0-9_])?$/.test(label),
    ) ||
    labels.at(-1)!.includes("_") ||
    labels.every((label) => /^\d+$/.test(label)) ||
    ["localhost", "local", "internal", "invalid", "test", "arpa"].includes(
      labels.at(-1)!,
    )
  )
    throw new Error(
      "Enter a public ASCII domain name; known local suffixes and IP addresses are not supported.",
    );
  return name;
}
type DnsAnswer = { type: number; TTL: number; data: string; name: string };
type DnsResult = { status: number; ad: boolean; answers: DnsAnswer[] };

async function boundedText(
  response: Response,
  limit: number,
  label = "Resolver",
): Promise<string> {
  const announced = Number(response.headers.get("content-length"));
  if (announced > limit) throw new Error(`${label} response is too large.`);
  if (!response.body)
    throw new Error(`Invalid ${label.toLowerCase()} response.`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let total = 0,
    output = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new Error(`${label} response is too large.`);
      }
      output += decoder.decode(value, { stream: true });
    }
    return output + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
async function queryDns(
  domain: string,
  type: DnsType,
  signal?: AbortSignal,
): Promise<DnsResult> {
  const name = validatePublicDomain(domain);
  if (!DNS_TYPES.includes(type))
    throw new Error("Unsupported DNS record type.");
  const url = new URL(ENDPOINT);
  url.searchParams.set("name", name);
  url.searchParams.set("type", type);
  url.searchParams.set("do", "true");
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/dns-json" },
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Resolver returned an HTTP error.");
    const text = await boundedText(response, 100_000);
    const data: unknown = JSON.parse(text);
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new Error("Invalid resolver response.");
    const result = data as {
      Status?: unknown;
      AD?: unknown;
      TC?: unknown;
      Answer?: unknown;
    };
    if (
      !Number.isInteger(result.Status) ||
      (result.Status as number) < 0 ||
      (result.Status as number) > 4095 ||
      (result.TC !== undefined && typeof result.TC !== "boolean") ||
      (result.AD !== undefined && typeof result.AD !== "boolean") ||
      (result.Answer !== undefined && !Array.isArray(result.Answer))
    )
      throw new Error("Invalid resolver response.");
    if (result.TC === true)
      throw new Error(
        "Resolver response was truncated; retry or use another resolver.",
      );
    const source = (result.Answer ?? []) as unknown[];
    if (source.length > 100)
      throw new Error("Resolver returned too many answers.");
    const answers = source.map((item) => {
      if (!item || typeof item !== "object")
        throw new Error("Invalid resolver response.");
      const a = item as {
        name?: unknown;
        type?: unknown;
        TTL?: unknown;
        data?: unknown;
      };
      if (
        typeof a.data !== "string" ||
        a.data.length > 16_384 ||
        !Number.isInteger(a.type) ||
        !Number.isInteger(a.TTL) ||
        (a.TTL as number) < 0 ||
        (a.TTL as number) > 0xffffffff ||
        (a.name !== undefined && typeof a.name !== "string")
      )
        throw new Error("Invalid resolver response.");
      return {
        type: a.type as number,
        TTL: a.TTL as number,
        data: a.data,
        name: (a.name as string | undefined) ?? "",
      };
    });
    return { status: result.Status as number, ad: result.AD === true, answers };
  } catch (error) {
    if (signal?.aborted) throw new Error("DNS query canceled.");
    if (error instanceof Error && error.name === "AbortError")
      throw new Error("DNS query timed out.");
    if (
      error instanceof Error &&
      (error.message.startsWith("Resolver") ||
        error.message.startsWith("Invalid resolver"))
    )
      throw error;
    throw new Error(
      "Unable to query the public DNS resolver. Check your connection or browser restrictions.",
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
function dnsSummary(name: string, type: DnsType, result: DnsResult) {
  return `Resolver: Cloudflare DNS over HTTPS\nQuery: ${name} (${type})\nDNS response status: ${result.status} (0 means NOERROR; 3 means NXDOMAIN)\nAuthenticated Data flag: ${result.ad ? "set — resolver reports successful DNSSEC validation" : "not set — this alone cannot distinguish unsigned, insecure or unvalidated data"}`;
}
export async function lookupDns(
  domain: string,
  type: DnsType,
  signal?: AbortSignal,
) {
  const name = validatePublicDomain(domain);
  const result = await queryDns(name, type, signal);
  const answers = result.answers.map(
    (a) => `Type ${a.type}, TTL ${a.TTL}: ${a.data.slice(0, 4000)}`,
  );
  return `${dnsSummary(name, type, result)}\n\n${answers.length ? answers.join("\n") : "No answer records returned."}\n\nResults reflect this public resolver, not private DNS or proof of domain ownership. The resolver receives your query and IP address.`;
}

/** A bounded, sequential batch to the same fixed resolver, validated completely before sending any query. */
export async function lookupDnsBatch(
  input: string,
  type: DnsType,
  signal?: AbortSignal,
): Promise<string> {
  if (input.length > 3000) throw new Error("Batch input is too long.");
  if (!DNS_TYPES.includes(type))
    throw new Error("Unsupported DNS record type.");
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 1 || lines.length > 10)
    throw new Error("Enter 1–10 public domain names, one per line.");
  const domains = lines.map(validatePublicDomain);
  if (new Set(domains).size !== domains.length)
    throw new Error("Remove duplicate domain names from the batch.");
  const reports: string[] = [];
  for (const domain of domains) {
    if (signal?.aborted) throw new Error("DNS batch canceled.");
    try {
      reports.push(await lookupDns(domain, type, signal));
    } catch (error) {
      if (signal?.aborted) throw new Error("DNS batch canceled.");
      reports.push(
        `Query: ${domain} (${type})\nLookup failed: ${error instanceof Error ? error.message : "Unknown error."}`,
      );
    }
  }
  return `DNS batch report: ${domains.length} sequential queries\n\n${reports.join("\n\n---\n\n")}\n\nEach result is resolver-reported, not independent DNSSEC validation. Failures are not evidence that a domain does not exist.`;
}

/** Join DNS presentation-format TXT character strings without treating different records as one. */
export function parseTxtPresentation(data: string): string {
  if (!data.startsWith('"')) {
    if (!/^[\x20-\x7e]*$/.test(data) || data.includes('"'))
      throw new Error("Invalid TXT presentation format.");
    return data;
  }
  let result = "",
    i = 0;
  while (i < data.length) {
    while (data[i] === " ") i++;
    if (i >= data.length) break;
    if (data[i++] !== '"') throw new Error("Invalid TXT presentation format.");
    let closed = false;
    while (i < data.length) {
      let c = data[i++];
      if (c === '"') {
        closed = true;
        break;
      }
      if (c === "\\") {
        if (i >= data.length) throw new Error("Invalid TXT escape.");
        if (/^\d{3}/.test(data.slice(i, i + 3))) {
          const code = Number(data.slice(i, i + 3));
          i += 3;
          if (code < 32 || code > 126)
            throw new Error("TXT record contains unsupported non-ASCII data.");
          c = String.fromCharCode(code);
        } else c = data[i++];
      }
      if (c.charCodeAt(0) < 32 || c.charCodeAt(0) > 126)
        throw new Error("TXT record contains unsupported non-ASCII data.");
      result += c;
    }
    if (!closed || (i < data.length && data[i] !== " "))
      throw new Error("Invalid TXT presentation format.");
  }
  return result;
}
export type EmailDnsKind = "spf" | "dkim" | "dmarc";
export async function lookupEmailRecord(
  domain: string,
  kind: EmailDnsKind,
  selector = "",
) {
  const base = validatePublicDomain(domain);
  if (base.includes("_"))
    throw new Error("Enter the base domain without underscores.");
  if (kind !== "spf" && kind !== "dkim" && kind !== "dmarc")
    throw new Error("Unsupported email record type.");
  const sel = selector.trim().toLowerCase();
  if (kind === "dkim" && !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(sel))
    throw new Error(
      "Enter a DKIM selector as one DNS label (letters, digits and internal hyphens).",
    );
  const name =
    kind === "spf"
      ? base
      : kind === "dmarc"
        ? `_dmarc.${base}`
        : `${sel}._domainkey.${base}`;
  const result = await queryDns(name, "TXT");
  if (result.status !== 0 && result.status !== 3)
    throw new Error(
      `Resolver returned DNS status ${result.status}; email record presence is inconclusive.`,
    );
  if (result.status === 3 && result.answers.length)
    throw new Error("Invalid resolver response: NXDOMAIN included answers.");
  const txt = result.answers
    .filter((a) => a.type === 16)
    .map((a) => parseTxtPresentation(a.data));
  const selected = txt.filter((value) =>
    kind === "spf"
      ? /^v=spf1(?:\s|$)/i.test(value)
      : kind === "dmarc"
        ? /^v=DMARC1\s*;/i.test(value)
        : /(?:^|;)\s*p\s*=/i.test(value),
  );
  let detail: string;
  if (!selected.length)
    detail =
      "No matching record was returned for this exact name. This does not establish the effective policy of subdomains or other selectors.";
  else if (selected.length > 1)
    detail = `Multiple matching records (${selected.length}) returned; this may invalidate the configuration. Review DNS records manually.`;
  else {
    try {
      detail = (
        kind === "spf" ? reviewSpf : kind === "dkim" ? reviewDkim : reviewDmarc
      )(selected[0]);
      if (kind === "dkim")
        detail += `\n\n${await inspectDkimPublicKey(selected[0])}`;
    } catch (e) {
      detail = `Record review error: ${e instanceof Error ? e.message : "Invalid record."}`;
    }
  }
  return `${dnsSummary(name, "TXT", result)}\nMatching ${kind.toUpperCase()} TXT records: ${selected.length}\n\n${detail}\n\nThe resolver receives your query and IP address. The resolver AD flag is not independent DNSSEC validation. This checks retrieved text only: no email authentication, recursive SPF evaluation, DKIM signature verification or DMARC alignment is performed.`;
}

/** Validate an IP echo response without accepting URLs, zones or malformed IPs. */
function ipVersion(ip: string): "IPv4" | "IPv6" | null {
  if (/^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(ip))
    return ip.split(".").every((part) => Number(part) <= 255) ? "IPv4" : null;
  if (!ip.includes(":") || !/^[a-f0-9:.]+$/i.test(ip)) return null;
  try {
    const parsed = new URL(`https://[${ip}]/`);
    return parsed.hostname.startsWith("[") && parsed.hostname.endsWith("]")
      ? "IPv6"
      : null;
  } catch {
    return null;
  }
}

/** Explicit user-initiated request to a fixed IP echo service. */
export async function lookupPublicIp(family: "ipv4" | "any" = "ipv4") {
  if (family !== "ipv4" && family !== "any")
    throw new Error("Choose a supported IP lookup mode.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(
      family === "ipv4"
        ? "https://api.ipify.org?format=json"
        : "https://api64.ipify.org?format=json",
      {
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        referrerPolicy: "no-referrer",
        signal: controller.signal,
      },
    );
    if (!response.ok) throw new Error("IP service returned an HTTP error.");
    const text = await boundedText(response, 1000, "IP service");
    const value: unknown = JSON.parse(text);
    const ip =
      value && typeof value === "object" && "ip" in value
        ? (value as { ip: unknown }).ip
        : undefined;
    const version = typeof ip === "string" ? ipVersion(ip) : null;
    if (!version || (family === "ipv4" && version !== "IPv4"))
      throw new Error("Invalid IP service response.");
    return `Public ${version} observed by ipify: ${ip}\n\nThis is the address seen by the external service, which may be a VPN, proxy or shared network. ${family === "any" ? "The dual-stack endpoint can return either IPv4 or IPv6; it does not prove both are available." : "Only IPv4 was requested."} The address is reported by ipify; routability and geographic location are not independently checked. ipify receives your IP address.`;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError")
      throw new Error("IP lookup timed out.");
    if (
      error instanceof Error &&
      (error.message.startsWith("IP service") ||
        error.message.startsWith("Invalid IP"))
    )
      throw error;
    throw new Error(
      "Unable to reach the public IP service. Check your connection or browser restrictions.",
    );
  } finally {
    clearTimeout(timer);
  }
}
