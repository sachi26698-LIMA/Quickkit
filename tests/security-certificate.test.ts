import "reflect-metadata";
import { describe, expect, it } from "vitest";
import {
  X509CertificateGenerator,
  SubjectAlternativeNameExtension,
} from "@peculiar/x509";
import { inspectCertificate } from "../lib/tools/security/certificate";

describe("offline certificate inspector", () => {
  it("extracts real X.509 fields without claiming trust or live connection", async () => {
    const keys = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    );
    const cert = await X509CertificateGenerator.createSelfSigned({
      name: "CN=example.com",
      keys,
      signingAlgorithm: { name: "ECDSA", hash: "SHA-256" },
      notBefore: new Date("2024-01-01T00:00:00Z"),
      notAfter: new Date("2025-01-01T00:00:00Z"),
      extensions: [
        new SubjectAlternativeNameExtension([
          { type: "dns", value: "example.com" },
        ]),
      ],
    });
    const report = await inspectCertificate(
      cert.toString("pem"),
      Date.parse("2026-01-01T00:00:00Z"),
    );
    expect(report).toContain("CN=example.com");
    expect(report).toContain("expired");
    expect(report).toContain("example.com");
    expect(report).toMatch(
      /SHA-256 fingerprint: (?:[0-9a-f]{2}:){31}[0-9a-f]{2}/,
    );
    expect(report).toContain("no website was contacted");
    expect(report).toContain("not certificate validation");
  });
  it("rejects private keys, malformed or multiple certificates", async () => {
    for (const value of [
      "-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----",
      "-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----",
      "",
      "x".repeat(64_001),
    ])
      await expect(inspectCertificate(value)).rejects.toThrow();
  });
});

describe("DNS SAN name comparison", () => {
  it("checks exact and single-label wildcards without CN fallback", async () => {
    const { compareCertificateDnsName } =
      await import("../lib/tools/security/certificate");
    expect(compareCertificateDnsName("EXAMPLE.COM.", ["example.com"])).toBe(
      true,
    );
    expect(compareCertificateDnsName("a.example.com", ["*.example.com"])).toBe(
      true,
    );
    expect(
      compareCertificateDnsName("a.b.example.com", ["*.example.com"]),
    ).toBe(false);
    expect(compareCertificateDnsName("example.com", ["*.example.com"])).toBe(
      false,
    );
    expect(
      compareCertificateDnsName("bücher.example", ["xn--bcher-kva.example"]),
    ).toBe(true);
    expect(compareCertificateDnsName("example.com", [])).toBe(false);
    for (const bad of [
      "https://example.com",
      "a.example.com:443",
      "user@example.com",
      "127.0.0.1",
    ])
      expect(() => compareCertificateDnsName(bad, [])).toThrow();
  });
  it("reports name comparison without claiming certificate trust", async () => {
    const keys = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    );
    const cert = await X509CertificateGenerator.createSelfSigned({
      name: "CN=not-used.example",
      keys,
      signingAlgorithm: { name: "ECDSA", hash: "SHA-256" },
      extensions: [
        new SubjectAlternativeNameExtension([
          { type: "dns", value: "*.example.com" },
        ]),
      ],
    });
    const result = await inspectCertificate(
      cert.toString("pem"),
      Date.now(),
      "a.example.com",
    );
    expect(result).toContain("matches a DNS SAN");
    expect(result).toContain("not certificate validation");
    expect(
      await inspectCertificate(
        cert.toString("pem"),
        Date.now(),
        "not-used.example",
      ),
    ).toContain("no matching DNS SAN");
  });
});
