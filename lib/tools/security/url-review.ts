/** Static indicators only. The URL is never requested and cannot be deemed safe. */
export function analyzeUrl(text: string) {
  if (!text.trim() || text.length > 8192 || /[\r\n\t]/.test(text))
    throw new Error(
      "Enter one HTTP(S) URL up to 8,192 characters without line breaks or tabs.",
    );
  let url: URL;
  try {
    url = new URL(text.trim());
  } catch {
    throw new Error("Enter a valid absolute HTTP(S) URL.");
  }
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Only HTTP and HTTPS URLs are supported.");
  const host = url.hostname;
  const flags: string[] = [];
  if (url.protocol === "http:")
    flags.push("HIGH: HTTP does not encrypt the connection.");
  if (url.username || url.password)
    flags.push(
      "HIGH: URL contains user information; it can disguise the actual host and expose credentials.",
    );
  if (host.startsWith("[") || /^\d+(?:\.\d+){3}$/.test(host))
    flags.push(
      "MEDIUM: Host is an IP address; verify it through a trusted source.",
    );
  if (host.split(".").some((label) => label.startsWith("xn--")))
    flags.push(
      "MEDIUM: Host contains an internationalized (punycode) label; check for lookalike characters.",
    );
  if (url.port) flags.push("INFO: A non-default port is specified.");
  if (text.includes("%"))
    flags.push(
      "INFO: URL contains percent encoding; inspect its destination carefully.",
    );
  if (url.search || url.hash)
    flags.push(
      "INFO: Query or fragment may contain sensitive data; it is omitted from this report.",
    );
  return `Host: ${host}\nProtocol: ${url.protocol.slice(0, -1)}\n${flags.length ? flags.join("\n") : "No listed indicators detected."}\n\nThis is a limited offline syntax review, not a reputation check, phishing detector or live connection. No URL, query or credentials are sent by this tool. No indicators does not mean the destination is safe.`;
}

/** Bounded offline batch; never echoes invalid raw input, paths, credentials or query values. */
export function analyzeUrlBatch(input: string) {
  if (input.length > 50_000)
    throw new Error("URL batch exceeds 50,000 characters.");
  const urls = input
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
  if (urls.length < 1 || urls.length > 25)
    throw new Error("Enter 1–25 URLs, one per line.");
  const reports = urls.map((url, index) => {
    try {
      return `URL ${index + 1}\n${analyzeUrl(url)}`;
    } catch (error) {
      return `URL ${index + 1}\nUnable to review: ${error instanceof Error ? error.message : "Invalid input."}`;
    }
  });
  return `OFFLINE URL BATCH — ${urls.length} entries\n\n${reports.join("\n\n---\n\n")}\n\nNo destinations were contacted. Errors do not establish whether a destination exists or is safe.`;
}
