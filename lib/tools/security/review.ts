/** Defensive review of user-supplied public response data. Never fetches URLs. */
export function parseResponseHeaders(input: string) {
  if (!input.trim() || input.length > 100_000)
    throw new Error("Paste response headers up to 100,000 characters.");
  const entries = new Map<string, string[]>();
  for (const line of input.split(/\r?\n/)) {
    if (!line.trim() || /^HTTP\/\S+\s+\d{3}/i.test(line)) continue;
    const pos = line.indexOf(":");
    if (pos < 1 || !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(line.slice(0, pos)))
      throw new Error("Use one Name: value response header per line.");
    const name = line.slice(0, pos).toLowerCase();
    entries.set(name, [
      ...(entries.get(name) ?? []),
      line.slice(pos + 1).trim(),
    ]);
  }
  if (!entries.size) throw new Error("No response headers found.");
  return entries;
}
export function reviewHsts(value: string) {
  const parts = value.split(";").map((x) => x.trim().toLowerCase());
  const age = parts.find((x) => /^max-age\s*=/.test(x));
  const match = age?.match(/^max-age\s*=\s*(\d+)$/);
  if (!match || parts.filter((x) => /^max-age\s*=/.test(x)).length !== 1)
    return "HSTS missing or invalid max-age, or contains duplicate max-age directives.";
  return `HSTS max-age: ${match[1]} seconds${Number(match[1]) === 0 ? " (disables HSTS)" : ""}. includeSubDomains: ${parts.includes("includesubdomains") ? "present" : "absent"}; preload: ${parts.includes("preload") ? "present" : "absent"}. HSTS is effective only when received over HTTPS; preload requires additional conditions and enrollment.`;
}
export function reviewCsp(value: string) {
  if (!value.trim() || value.length > 100_000)
    throw new Error("Enter a CSP header value up to 100,000 characters.");
  const directives = value
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);
  const names = directives.map((p) => p.split(/\s+/)[0].toLowerCase());
  const findings = [
    !names.includes("default-src")
      ? "No default-src fallback found."
      : "default-src is present.",
    !names.includes("frame-ancestors")
      ? "No frame-ancestors directive found."
      : "frame-ancestors is present.",
  ];
  if (/['"]unsafe-inline['"]/i.test(value))
    findings.push(
      "'unsafe-inline' can weaken script/style protections; consider nonces or hashes.",
    );
  if (/['"]unsafe-eval['"]/i.test(value))
    findings.push("'unsafe-eval' weakens script protection.");
  if (new Set(names).size !== names.length)
    findings.push(
      "Duplicate directives found; browsers generally use the first occurrence.",
    );
  if (/(?:^|\s)\*(?:\s|;|$)/.test(value))
    findings.push("Wildcard source detected; review whether it is necessary.");
  return `${findings.join("\n")}\nThis is a limited static review, not a complete CSP parser or guarantee. Test policies in report-only mode before enforcement.`;
}
export function reviewCookies(input: string) {
  if (!input.trim() || input.length > 100_000)
    throw new Error("Paste Set-Cookie header values up to 100,000 characters.");
  const lines = input.split(/\r?\n/).filter((line) => line.trim());
  return (
    lines
      .map((line, index) => {
        const value = line.replace(/^set-cookie\s*:\s*/i, "");
        const first = value.split(";")[0];
        const separator = first.indexOf("=");
        const name = first.slice(0, separator);
        if (separator < 1 || !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name))
          throw new Error(
            `Line ${index + 1} is not a valid Set-Cookie name/value pair.`,
          );
        const attributes = value
          .split(";")
          .slice(1)
          .map((x) => x.trim())
          .filter(Boolean);
        const parsed = attributes.map((attribute) => {
          const i = attribute.indexOf("=");
          return {
            name: (i < 0 ? attribute : attribute.slice(0, i))
              .trim()
              .toLowerCase(),
            value: i < 0 ? null : attribute.slice(i + 1).trim(),
          };
        });
        const attrs = (name: string) => parsed.filter((a) => a.name === name);
        const flag = (name: string) =>
          attrs(name).some((a) => a.value === null);
        const sameValues = attrs("samesite");
        const sameRaw = sameValues[0]?.value?.toLowerCase();
        const same =
          sameRaw && ["strict", "lax", "none"].includes(sameRaw)
            ? sameRaw
            : sameValues.length
              ? "invalid"
              : "not specified";
        const secure = flag("secure"),
          httpOnly = flag("httponly");
        const findings: string[] = [];
        if (same === "invalid")
          findings.push("Invalid SameSite attribute; browser handling varies.");
        if (same === "none" && !secure)
          findings.push("SameSite=None requires Secure.");
        if (
          name.startsWith("__Host-") &&
          (!secure ||
            !attrs("path").some((a) => a.value === "/") ||
            attrs("domain").length)
        )
          findings.push("__Host- requires Secure, Path=/ and no Domain.");
        if (name.startsWith("__Secure-") && !secure)
          findings.push("__Secure- requires Secure.");
        if (flag("partitioned") && !secure)
          findings.push("Partitioned requires Secure.");
        if (
          [
            "secure",
            "httponly",
            "partitioned",
            "samesite",
            "domain",
            "path",
            "max-age",
            "expires",
          ].some((n) => attrs(n).length > 1)
        )
          findings.push(
            "Duplicate cookie attributes may be interpreted differently; review the original header.",
          );
        if (
          ["secure", "httponly", "partitioned"].some((n) =>
            attrs(n).some((a) => a.value !== null),
          )
        )
          findings.push(
            "Flag attributes should not have values; browser handling varies.",
          );
        if (
          attrs("max-age").some(
            (a) => a.value === null || !/^-?\d+$/.test(a.value),
          )
        )
          findings.push("Invalid Max-Age value.");
        return `Cookie ${index + 1}: Secure ${secure ? "present" : "absent"}; HttpOnly ${httpOnly ? "present" : "absent"}; SameSite ${same}. ${findings.join(" ")}`;
      })
      .join("\n") +
    "\nAssess each cookie's purpose; not every cookie should be HttpOnly. Cookie names, values and unrecognized attribute values are not included in this report. This is a limited static review, not a browser acceptance test."
  );
}
export function reviewHeaders(input: string) {
  const h = parseResponseHeaders(input);
  const status = (name: string) => (h.has(name) ? "present" : "missing");
  const findings: string[] = [];
  const csp = h.get("content-security-policy") ?? [];
  const reportOnly = h.get("content-security-policy-report-only") ?? [];
  const xcto = h.get("x-content-type-options") ?? [];
  const hsts = h.get("strict-transport-security") ?? [];
  const frames = h.get("x-frame-options") ?? [];
  const referrers = h.get("referrer-policy") ?? [];
  if (!csp.length)
    findings.push(
      reportOnly.length
        ? "HIGH: Only a report-only CSP was supplied; it does not enforce a policy. Consider an enforced CSP after testing."
        : "HIGH: No enforced Content-Security-Policy was supplied; consider a tested, application-specific policy.",
    );
  else if (csp.length > 1)
    findings.push(
      "INFO: Multiple enforced CSP headers are combined restrictively by browsers; test their intersection.",
    );
  if (!hsts.length)
    findings.push(
      "MEDIUM: No HSTS header supplied; consider it after HTTPS is deployed and verified.",
    );
  else if (hsts.length > 1)
    findings.push(
      "HIGH: Multiple HSTS header fields supplied; browsers process only the first field, so remove ambiguity.",
    );
  if (
    !xcto.length ||
    xcto.length !== 1 ||
    xcto[0].trim().toLowerCase() !== "nosniff"
  )
    findings.push(
      "MEDIUM: Set a single X-Content-Type-Options: nosniff header and serve correct content types.",
    );
  if (
    !frames.length &&
    !csp.some((value) => /(?:^|;)\s*frame-ancestors(?:\s|;|$)/i.test(value))
  )
    findings.push(
      "MEDIUM: No framing control detected; consider CSP frame-ancestors and a compatible X-Frame-Options policy.",
    );
  if (frames.length > 1)
    findings.push(
      "MEDIUM: Multiple X-Frame-Options fields can be interpreted inconsistently; use one valid policy.",
    );
  else if (
    frames.length === 1 &&
    !/^(deny|sameorigin)$/i.test(frames[0].trim())
  )
    findings.push(
      "MEDIUM: X-Frame-Options is unrecognized or obsolete; use DENY or SAMEORIGIN where appropriate.",
    );
  if (!referrers.length)
    findings.push(
      "INFO: No Referrer-Policy supplied; review browser defaults and data exposure.",
    );
  else if (referrers.length > 1)
    findings.push(
      "INFO: Multiple Referrer-Policy fields supplied; verify the effective policy in target browsers.",
    );
  if (!h.has("permissions-policy"))
    findings.push(
      "INFO: Consider restricting unused browser features with Permissions-Policy.",
    );
  return [
    `Content-Security-Policy: ${status("content-security-policy")}`,
    `Strict-Transport-Security: ${status("strict-transport-security")}`,
    `X-Content-Type-Options: ${status("x-content-type-options")}`,
    `Referrer-Policy: ${status("referrer-policy")}`,
    `Permissions-Policy: ${status("permissions-policy")}`,
    `X-Frame-Options: ${status("x-frame-options")}`,
    h.has("access-control-allow-origin")
      ? reviewCors(h)
      : "CORS: no Access-Control-Allow-Origin header supplied.",
    hsts.length ? reviewHsts(hsts[0]) : "",
    "\nActionable findings (static, partial):",
    findings.length
      ? findings.map((finding) => `• ${finding}`).join("\n")
      : "• No listed findings detected; inspect values and test the actual application.",
    "\nPresence alone does not prove a secure configuration. This tool reviews only the pasted headers; no site was contacted. No cookie or authorization values are included in this report.",
  ]
    .filter(Boolean)
    .join("\n");
}
export function reviewCors(headers: Map<string, string[]>) {
  const origins = headers.get("access-control-allow-origin") ?? [];
  const credentials = headers.get("access-control-allow-credentials") ?? [];
  const origin = origins[0]?.trim();
  const findings: string[] = [];
  if (origins.length !== 1)
    findings.push(
      "HIGH: Multiple Access-Control-Allow-Origin values are invalid.",
    );
  if (origin === "null")
    findings.push(
      "HIGH: Allowing the null origin can expose responses to sandboxed or opaque origins.",
    );
  if (origin === "*" && credentials.some((c) => c.toLowerCase() === "true"))
    findings.push(
      "HIGH: Wildcard ACAO with credentials is rejected by browsers; do not rely on it for authenticated cross-origin responses.",
    );
  if (
    origin &&
    origin !== "*" &&
    origin !== "null" &&
    !headers.get("vary")?.some((v) =>
      v
        .toLowerCase()
        .split(",")
        .map((x) => x.trim())
        .includes("origin"),
    )
  )
    findings.push(
      "MEDIUM: If ACAO varies by request Origin, include Vary: Origin for correct caching.",
    );
  return `CORS: ${origins.length ? "Access-Control-Allow-Origin supplied" : "not supplied"}. ${findings.join(" ")} Review the actual allowed origins and server-side authorization; CORS is not access control. Pasted headers cannot establish reflected-origin behavior.`;
}
export function reviewFrameOptions(input: string) {
  const value = input.trim().toUpperCase();
  if (!value) throw new Error("Enter an X-Frame-Options header value.");
  return value === "DENY"
    ? "DENY blocks framing in supporting browsers."
    : value === "SAMEORIGIN"
      ? "SAMEORIGIN permits same-origin framing in supporting browsers."
      : "Unrecognized or obsolete X-Frame-Options value. Prefer DENY or SAMEORIGIN and use CSP frame-ancestors for a modern policy.";
}
export function reviewRobots(input: string) {
  if (!input.trim() || input.length > 100_000)
    throw new Error("Paste robots.txt text up to 100,000 characters.");
  const exposed = input
    .split(/\r?\n/)
    .filter((line) => /^\s*disallow\s*:/i.test(line));
  return `${exposed.length} Disallow directives found. robots.txt is public and is not access control; do not rely on it to protect sensitive paths. Review paths manually and enforce authorization on the server. This does not test whether any path is accessible.`;
}
/** Validate a calendar date without Date.parse silently normalizing invalid days. */
function validCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return (
    day <=
    [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
  );
}

/** Supported RFC 3339 timestamps: leap-second notation is not parsed. */
function validExpiryTimestamp(value: string): boolean {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-](\d{2}):(\d{2}))$/.exec(
      value,
    );
  if (!match) return false;
  const [, y, m, d, h, min, sec, , tzH, tzM] = match;
  return (
    validCalendarDate(+y, +m, +d) &&
    +h <= 23 &&
    +min <= 59 &&
    +sec <= 59 &&
    (!tzH || (+tzH <= 23 && +tzM <= 59)) &&
    Number.isFinite(Date.parse(value))
  );
}

export function securityTxt(contact: string, expires: string) {
  const value = contact.trim();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Contact must be a mailto: or HTTPS URL.");
  }
  if (
    (url.protocol !== "https:" && url.protocol !== "mailto:") ||
    /[\r\n]/.test(value) ||
    (url.protocol === "https:" && (url.username || url.password)) ||
    !url.pathname
  )
    throw new Error(
      "Contact must be a valid mailto: or HTTPS URL without credentials or line breaks.",
    );
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(expires);
  const date = new Date(expires);
  if (
    !dateParts ||
    !validCalendarDate(+dateParts[1], +dateParts[2], +dateParts[3]) ||
    !Number.isFinite(date.getTime()) ||
    date.getTime() <= Date.now()
  )
    throw new Error("Choose a future expiration date.");
  return `Contact: ${value}\nExpires: ${date.toISOString()}\n\n# Publish at /.well-known/security.txt and update before expiry.\n# Consider adding a verified canonical URL, policy URL and preferred languages.`;
}

/** Construct policies from a bounded allowlist rather than interpolating raw directives. */
export function generateCsp(
  frame: "none" | "self",
  allowDataImages: boolean,
  connectOrigin: string,
) {
  if (frame !== "none" && frame !== "self")
    throw new Error("Choose a supported framing policy.");
  let connect = "'self'";
  if (connectOrigin.trim()) {
    const raw = connectOrigin.trim();
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new Error("Connect origin must be an HTTPS origin.");
    }
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      /[\s;,*]/.test(raw)
    )
      throw new Error(
        "Connect origin must be an HTTPS origin without credentials, path, query or fragment.",
      );
    connect += ` ${url.origin}`;
  }
  return `Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors '${frame}'; form-action 'self'; img-src 'self'${allowDataImages ? " data:" : ""}; connect-src ${connect}\n\nStarter policy. Review script and style requirements, test with Content-Security-Policy-Report-Only, and check third-party dependencies before enforcing. This does not guarantee protection.`;
}
export function generatePermissionsPolicy(
  settings: Record<string, "none" | "self">,
) {
  const features = ["camera", "microphone", "geolocation", "payment"];
  if (features.some((feature) => !["none", "self"].includes(settings[feature])))
    throw new Error("Select a supported policy for each feature.");
  return `Permissions-Policy: ${features.map((feature) => `${feature}=(${settings[feature] === "self" ? "self" : ""})`).join(", ")}\n\nBrowser support and feature names vary. Test the policy and explicitly delegate only required capabilities.`;
}
export function validateSecurityTxt(input: string, now = Date.now()) {
  if (!input.trim() || input.length > 100_000)
    throw new Error("Paste security.txt content up to 100,000 characters.");
  const fields = new Map<string, string[]>();
  for (const line of input.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const match = line.match(/^([A-Za-z][A-Za-z0-9-]*):\s*(.+)$/);
    if (!match)
      throw new Error(
        "Invalid security.txt field; use Field: value, one per line.",
      );
    const key = match[1].toLowerCase();
    fields.set(key, [...(fields.get(key) ?? []), match[2].trim()]);
  }
  const findings: string[] = [];
  const contacts = fields.get("contact") ?? [];
  if (!contacts.length) findings.push("HIGH: Add at least one Contact URI.");
  for (const contact of contacts) {
    try {
      const u = new URL(contact);
      if (
        !["https:", "mailto:", "tel:"].includes(u.protocol) ||
        u.username ||
        u.password ||
        !u.pathname
      )
        throw new Error();
    } catch {
      findings.push(
        "HIGH: Contact is not a supported HTTPS, mailto or tel URI.",
      );
    }
  }
  const expiry = fields.get("expires") ?? [];
  if (expiry.length !== 1)
    findings.push("HIGH: Include exactly one Expires field.");
  else if (!validExpiryTimestamp(expiry[0]))
    findings.push(
      "HIGH: Expires must be a valid supported RFC 3339 timestamp with timezone (leap seconds are not supported).",
    );
  else if (Date.parse(expiry[0]) <= now)
    findings.push("HIGH: Expires is in the past; update the file.");
  if (!fields.has("canonical"))
    findings.push("INFO: Consider a Canonical URI when publishing the file.");
  return `security.txt static review\n${findings.length ? findings.join("\n") : "Required Contact and Expires fields appear present."}\n\nOnly pasted content was reviewed. Publication location, transport security, URI reachability, signatures and complete RFC compliance were not verified.`;
}
