/** DNS SAN pattern comparison only; does not validate certificate trust or server identity. */
export function compareCertificateDnsName(
  hostname: string,
  dnsNames: readonly string[],
): boolean {
  const raw = hostname.trim();
  if (!raw || raw.length > 253 || /[\s/:@\\?#]/.test(raw))
    throw new Error(
      "Enter a DNS hostname only, without scheme, path, port or credentials.",
    );
  let host: string;
  try {
    host = new URL(`https://${raw}`).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    throw new Error("Enter a valid DNS hostname.");
  }
  if (
    /^\d+(?:\.\d+){3}$/.test(host) ||
    !host ||
    host
      .split(".")
      .some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
  )
    throw new Error(
      "Enter a DNS hostname; IP address matching is not supported.",
    );
  return dnsNames.some((name) => {
    const pattern = name.toLowerCase().replace(/\.$/, "");
    if (!pattern.startsWith("*.")) return pattern === host;
    const suffix = pattern.slice(2);
    if (!suffix.includes(".") || suffix.includes("*")) return false;
    const labels = host.split(".");
    return (
      labels.length === suffix.split(".").length + 1 &&
      labels.slice(1).join(".") === suffix
    );
  });
}

/** Local certificate parsing only: this does not establish server identity or trust. */
export async function inspectCertificate(
  pem: string,
  now = Date.now(),
  hostname = "",
): Promise<string> {
  const input = pem.trim();
  if (
    input.length > 64_000 ||
    !/^-----BEGIN CERTIFICATE-----\r?\n[A-Za-z0-9+/=\r\n]+\r?\n-----END CERTIFICATE-----$/.test(
      input,
    )
  )
    throw new Error(
      "Paste one PEM-encoded public certificate, up to 64,000 characters. Do not paste private keys or certificate chains.",
    );
  try {
    await import("reflect-metadata");
    const {
      X509Certificate,
      SubjectAlternativeNameExtension,
      BasicConstraintsExtension,
      ExtendedKeyUsageExtension,
    } = await import("@peculiar/x509");
    const cert = new X509Certificate(input);
    const notBefore = cert.notBefore;
    const notAfter = cert.notAfter;
    if (
      !Number.isFinite(notBefore.getTime()) ||
      !Number.isFinite(notAfter.getTime())
    )
      throw new Error("Invalid certificate dates.");
    const san = cert.getExtension(SubjectAlternativeNameExtension);
    const basic = cert.getExtension(BasicConstraintsExtension);
    const eku = cert.getExtension(ExtendedKeyUsageExtension);
    const fingerprint = Array.from(
      new Uint8Array(await cert.getThumbprint("SHA-256")),
      (b) => b.toString(16).padStart(2, "0"),
    ).join(":");
    const dnsNames =
      san?.names.items.filter((n) => n.type === "dns").map((n) => n.value) ??
      [];
    const match = hostname
      ? compareCertificateDnsName(hostname, dnsNames)
      : null;
    const dateStatus =
      now < notBefore.getTime()
        ? "not yet valid"
        : now > notAfter.getTime()
          ? "expired"
          : "within validity period";
    return `UNVERIFIED CERTIFICATE DATA — no website was contacted\nSubject: ${cert.subject}\nIssuer: ${cert.issuer}\nSerial number: ${cert.serialNumber}\nNot before: ${notBefore.toISOString()}\nNot after: ${notAfter.toISOString()}\nDate status: ${dateStatus} (device clock)\nPublic key algorithm: ${JSON.stringify(cert.publicKey.algorithm)}\nSignature algorithm: ${JSON.stringify(cert.signatureAlgorithm)}\nCertificate authority flag: ${basic ? (basic.ca ? "true" : "false") : "not present"}\nExtended key usage OIDs: ${eku?.usages.join(", ") || "not present"}\nSubject alternative names: ${san?.names.items.map((n) => `${n.type}: ${n.value}`).join(", ") || "not present"}\nSHA-256 fingerprint: ${fingerprint}\nDNS SAN hostname comparison: ${match === null ? "not requested" : match ? "matches a DNS SAN" : "no matching DNS SAN"}\n\nParsing and DNS-name comparison are not certificate validation. The tool does not check signature chains, trust anchors, IP SANs, revocation, live server presentation or TLS configuration. Obtain the public certificate through a trusted channel and use a proper TLS verifier.`;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Enter a "))
      throw error;
    throw new Error(
      "Could not parse this certificate. Check that it is a valid, supported PEM X.509 certificate.",
    );
  }
}
