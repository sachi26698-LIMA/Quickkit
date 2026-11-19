// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  decryptBytes,
  encryptBytes,
  signJwt,
  textCrypto,
} from "@/lib/tools/security/logic";
import { inspectCertificate } from "@/lib/tools/security/certificate";
import { cleanPdfDocumentMetadata } from "@/lib/tools/security/metadata";
import { inr } from "@/lib/tools/hr/payroll";

const SECRET = "a-test-key-of-at-least-32-bytes-long!";

/** Split a compact JWT and decode one segment. */
function segment(token: string, index: 0 | 1): unknown {
  const part = token.split(".")[index];
  const padded = part.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(padded + "=".repeat((4 - (padded.length % 4)) % 4)));
}

describe("JWT signing", () => {
  it("produces a three-part compact token", async () => {
    const token = await signJwt('{"sub":"1"}', SECRET);
    expect(token.split(".")).toHaveLength(3);
  });

  it("carries the claims it was given", async () => {
    const token = await signJwt('{"sub":"42","role":"admin"}', SECRET);
    expect(segment(token, 1)).toMatchObject({ sub: "42", role: "admin" });
  });

  it("declares HS256 in the header", async () => {
    const token = await signJwt('{"sub":"1"}', SECRET);
    expect(segment(token, 0)).toMatchObject({ alg: "HS256", typ: "JWT" });
  });

  it("adds no claims the caller did not ask for", async () => {
    const token = await signJwt('{"sub":"1"}', SECRET);
    expect(Object.keys(segment(token, 1) as object).sort()).toEqual(["sub"]);
  });

  it("refuses claims that are not a JSON object", async () => {
    await expect(signJwt("[]", SECRET)).rejects.toThrow(/JSON claims object/);
    await expect(signJwt("not json", SECRET)).rejects.toThrow();
  });

  it("refuses a key that is too short", async () => {
    await expect(signJwt('{"sub":"1"}', "short")).rejects.toThrow(/32–4096/);
  });

  it("rejects duplicate members rather than picking one", async () => {
    await expect(signJwt('{"sub":"1","sub":"2"}', SECRET)).rejects.toThrow();
  });
});

describe("certificate inspection", () => {
  it("refuses text that is not a PEM certificate", async () => {
    await expect(inspectCertificate("not a certificate")).rejects.toThrow(
      /PEM-encoded public certificate/,
    );
  });

  it("refuses a PEM with a corrupted body", async () => {
    await expect(
      inspectCertificate(
        "-----BEGIN CERTIFICATE-----\nnotbase64!!\n-----END CERTIFICATE-----",
      ),
    ).rejects.toThrow();
  });

  it("refuses a PEM that is too large", async () => {
    await expect(
      inspectCertificate(
        `-----BEGIN CERTIFICATE-----\n${"A".repeat(70_000)}\n-----END CERTIFICATE-----`,
      ),
    ).rejects.toThrow();
  });
});

describe("PDF metadata cleaning", () => {
  it("refuses a file that is not a PDF", async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4, 5])], "x.pdf", {
      type: "application/pdf",
    });
    await expect(cleanPdfDocumentMetadata(file)).rejects.toThrow(
      /PDF signature/,
    );
  });

  it("refuses a PDF larger than the limit", async () => {
    const file = new File([new Uint8Array(16 * 1024 * 1024)], "big.pdf", {
      type: "application/pdf",
    });
    await expect(cleanPdfDocumentMetadata(file)).rejects.toThrow(/15 MiB/);
  });
});

describe("Indian currency formatting", () => {
  it("uses the ₹ symbol", () => {
    expect(inr(1200000)).toContain("₹");
  });

  it("groups in the Indian lakh/crore style", () => {
    expect(inr(1200000)).toBe("₹12,00,000");
  });

  it("honours the requested decimals", () => {
    expect(inr(1234.5, 2)).toBe("₹1,234.50");
  });

  it("rounds to whole rupees by default", () => {
    expect(inr(1234.6)).toBe("₹1,235");
  });
});

describe("AES-GCM text and file encryption", () => {
  const PASSWORD = "correct horse battery staple";

  it("round-trips text through encryption and decryption", async () => {
    const cipher = await textCrypto("hello ₹ — ✓", PASSWORD, false);
    expect(await textCrypto(cipher, PASSWORD, true)).toBe("hello ₹ — ✓");
  }, 60_000);

  it("produces a different ciphertext for the same input", async () => {
    const first = await textCrypto("hello", PASSWORD, false);
    const second = await textCrypto("hello", PASSWORD, false);
    expect(first).not.toBe(second);
  }, 60_000);

  it("refuses to decrypt with the wrong password", async () => {
    const cipher = await textCrypto("hello", PASSWORD, false);
    await expect(
      textCrypto(cipher, "a different password entirely", true),
    ).rejects.toThrow();
  }, 60_000);

  it("refuses empty text", async () => {
    await expect(textCrypto("", PASSWORD, false)).rejects.toThrow();
  });

  it("round-trips bytes through file encryption", async () => {
    const bytes = new TextEncoder().encode(
      "file contents ₹",
    ) as Uint8Array<ArrayBuffer>;
    const sealed = await encryptBytes(bytes, PASSWORD);
    const opened = await decryptBytes(sealed, PASSWORD);
    expect(new TextDecoder().decode(opened)).toBe("file contents ₹");
  }, 60_000);

  it("refuses data that is not this tool's container", async () => {
    const junk = new Uint8Array(64) as Uint8Array<ArrayBuffer>;
    await expect(decryptBytes(junk, PASSWORD)).rejects.toThrow(
      /Invalid or unsupported encrypted data/,
    );
  });

  it("detects tampering with the ciphertext", async () => {
    const bytes = new TextEncoder().encode(
      "payload",
    ) as Uint8Array<ArrayBuffer>;
    const sealed = await encryptBytes(bytes, PASSWORD);
    sealed[sealed.length - 1] ^= 0xff;
    await expect(decryptBytes(sealed, PASSWORD)).rejects.toThrow();
  }, 60_000);
});
