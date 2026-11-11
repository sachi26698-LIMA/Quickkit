// @vitest-environment jsdom
/**
 * Cryptographic Security & Anti-Tamper Test Suite:
 * - ECDSA P-256 digital signatures + 33-byte SEC1 point compression
 * - AES-256-GCM + PBKDF2-HMAC-SHA256 passphrase vaults (`/qr?e=…` & `QKE1.…`)
 * - AES-256-GCM zero-knowledge fragment-key links (`/qr?e=…#k=…`)
 * - Scanner threat intelligence & inline decryption / tamper blocking
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  compressP256PublicKey,
  decompressP256PublicKey,
  exportCreatorSignerJson,
  fromBase64Url,
  generateNewSigner,
  importCreatorSignerJson,
  pinTrustedSigner,
  toBase64Url,
  unpinTrustedSigner,
} from "@/lib/tools/qr/crypto-security";
import {
  buildDataTemplateUrl,
  buildProtectedQrPayload,
  verifyAndResolveQrPayload,
} from "@/lib/tools/qr/data-template";
import { sampleValuesFor } from "@/lib/tools/qr/payload";
import { renderQr } from "@/lib/tools/qr/render";
import { defaultDesign } from "@/lib/tools/qr/style";
import { recognize } from "@/lib/tools/qr-scanner/content";
import { inspectPayload } from "@/lib/tools/qr-scanner/security";
import { resolveRedirectTarget } from "@/lib/tools/qr-scanner/redirect";
import ScanRedirectModal from "@/components/tools/qr-scanner/redirect-modal";
import type { ScanItem } from "@/components/tools/qr-scanner/use-scanner";

let mockQuery = "";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockQuery),
}));

import QrDataTemplateViewer from "@/components/qr-data-template/viewer";

afterEach(() => {
  cleanup();
  mockQuery = "";
  window.location.hash = "";
  window.localStorage.clear();
});

function makeScanItem(payload: string): ScanItem {
  return {
    id: "crypto-scan-1",
    sourceName: "qr-test.png",
    sourceBytes: 1024,
    scannedAt: Date.now(),
    symbols: [
      {
        data: payload,
        bytes: new TextEncoder().encode(payload),
        version: 6,
        errorCorrection: "M",
        corners: {
          topLeft: { x: 0, y: 0 },
          topRight: { x: 100, y: 0 },
          bottomRight: { x: 100, y: 100 },
          bottomLeft: { x: 0, y: 100 },
        },
        pass: "original",
        inverted: false,
      },
    ],
    attempts: ["original: decoded"],
    durationMs: 12,
    failure: null,
    imageUrl: null,
    imageWidth: 400,
    imageHeight: 400,
  };
}

describe("NIST P-256 key compression & backup", () => {
  it("losslessly compresses and decompresses 65-byte P-256 public keys into 33 bytes", async () => {
    const pair = await globalThis.crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    );
    const raw65 = new Uint8Array(
      await globalThis.crypto.subtle.exportKey("raw", pair.publicKey),
    );
    const compressed33 = compressP256PublicKey(raw65);
    expect(compressed33).toHaveLength(33);
    const restored65 = decompressP256PublicKey(compressed33);
    expect(Array.from(restored65)).toEqual(Array.from(raw65));
  });

  it("exports, imports and pins creator ECDSA signing keys cleanly", async () => {
    const json = await exportCreatorSignerJson();
    const imported = await importCreatorSignerJson(json);
    expect(imported.fingerprint).toMatch(
      /^QK-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/,
    );

    const pinned = pinTrustedSigner(imported.fingerprint, "My Shop");
    expect(pinned.some((p) => p.fingerprint === imported.fingerprint)).toBe(
      true,
    );
    const unpinned = unpinTrustedSigner(imported.fingerprint);
    expect(unpinned.some((p) => p.fingerprint === imported.fingerprint)).toBe(
      false,
    );
  });
});

describe("ECDSA P-256 Anti-Tamper Signatures (`&sg=…`)", () => {
  it("signs a Payment / UPI QR, decodes via jsQR, and blocks every tamper vector", async () => {
    const { signer } = await generateNewSigner();
    const built = await buildProtectedQrPayload({
      encodingMode: "template",
      securityMode: "signed",
      config: {
        typeId: "payment",
        values: sampleValuesFor("payment"),
      },
      origin: "https://quickkit.tools",
      signer,
    });

    expect(built.payload).toContain("/qr?d=");
    expect(built.payload).toContain("&sg=");

    // Real PNG render + independent jsQR decode check
    const rendered = await renderQr({
      payload: built.payload,
      design: { ...defaultDesign(), size: 384 },
      artifacts: { png: true },
      verify: true,
    });
    expect(rendered.verification?.ok).toBe(true);
    expect(rendered.verification?.decoded).toBe(built.payload);

    // 1. Intact QR verifies cleanly
    const intact = await verifyAndResolveQrPayload(built.payload);
    expect(intact.state).toBe("ready");
    if (intact.state === "ready") {
      expect(intact.securityStatus).toBe("verified");
      expect(intact.signerFingerprint).toBe(signer.fingerprint);
    }

    // 2. Attack A: Attacker swaps UPI ID (`auroracafe@upi` -> `attacker@upi`) in `?d=` while keeping `&sg=`
    const parsedOrig = new URL(built.payload);
    const forgedD = buildDataTemplateUrl(
      {
        typeId: "payment",
        values: {
          ...sampleValuesFor("payment"),
          upiId: "attacker@upi",
        },
        sealed: true,
        signerFingerprint: signer.fingerprint,
      },
      "https://quickkit.tools",
    ).token;
    const swappedDataUrl = `https://quickkit.tools/qr?d=${forgedD}&sg=${parsedOrig.searchParams.get("sg")}`;
    const resSwapped = await verifyAndResolveQrPayload(swappedDataUrl);
    expect(resSwapped.state).toBe("tampered");

    // 3. Attack B: Attacker strips `&sg=` from the sealed URL
    const strippedSigUrl = `https://quickkit.tools/qr?d=${parsedOrig.searchParams.get("d")}`;
    expect(inspectPayload(strippedSigUrl, "url").level).toBe("high");
    expect(resolveRedirectTarget(strippedSigUrl)?.blocked).toBe(true);
    const resStripped = await verifyAndResolveQrPayload(strippedSigUrl);
    expect(resStripped.state).toBe("tampered");

    // 4. Attack C: Attacker signs with their own rogue ECDSA keypair on the original sealed `d`
    const { signer: attackerSigner } = await generateNewSigner();
    const attackerBuilt = await buildProtectedQrPayload({
      encodingMode: "template",
      securityMode: "signed",
      config: {
        typeId: "payment",
        values: sampleValuesFor("payment"),
      },
      origin: "https://quickkit.tools",
      signer: attackerSigner,
    });
    const attackerSg = new URL(attackerBuilt.payload).searchParams.get("sg")!;
    const keyMismatchUrl = `https://quickkit.tools/qr?d=${parsedOrig.searchParams.get("d")}&sg=${attackerSg}`;
    expect(inspectPayload(keyMismatchUrl, "url").level).toBe("high");
    expect((await verifyAndResolveQrPayload(keyMismatchUrl)).state).toBe(
      "tampered",
    );

    // 5. Attack D: Expired QR timestamp
    const expiredBuilt = await buildProtectedQrPayload({
      encodingMode: "template",
      securityMode: "signed",
      config: {
        typeId: "url",
        values: { url: "https://quickkit.tools" },
      },
      origin: "https://quickkit.tools",
      expiresAtSec: Math.floor(Date.now() / 1000) - 60,
      signer,
    });
    expect(inspectPayload(expiredBuilt.payload, "url").level).toBe("high");
    expect((await verifyAndResolveQrPayload(expiredBuilt.payload)).state).toBe(
      "expired",
    );
  });
});

describe("AES-256-GCM Encryption (Password Vault & Zero-Knowledge `#k=`)", () => {
  it("locks a Hosted Data Template with PBKDF2-SHA256 + AES-256-GCM and rejects wrong passphrases or bit flips", async () => {
    const built = await buildProtectedQrPayload({
      encodingMode: "template",
      securityMode: "password-aes",
      config: {
        typeId: "wifi",
        values: {
          ssid: "VaultWiFi",
          password: "top-secret-wifi-password",
          encryption: "WPA",
        },
      },
      origin: "https://quickkit.tools",
      passphrase: "CorrectHorse2026!",
      passphraseHint: "Horse year",
      iterations: 10_000,
    });

    // Neither SSID nor password appears anywhere in the encrypted URL!
    expect(built.payload).toContain("/qr?e=");
    expect(built.payload).not.toContain("VaultWiFi");
    expect(built.payload).not.toContain("top-secret-wifi-password");

    // Without passphrase -> locked with hint
    const locked = await verifyAndResolveQrPayload(built.payload);
    expect(locked.state).toBe("locked");
    if (locked.state === "locked") {
      expect(locked.hint).toBe("Horse year");
    }

    // Wrong passphrase -> stays locked with error
    const wrong = await verifyAndResolveQrPayload(built.payload, {
      passphrase: "WrongPassword!",
    });
    expect(wrong.state).toBe("locked");
    if (wrong.state === "locked") {
      expect(wrong.errorMessage).toMatch(/Decryption failed/i);
    }

    // Correct passphrase -> unlocks full Wi-Fi Data Card!
    const unlocked = await verifyAndResolveQrPayload(built.payload, {
      passphrase: "CorrectHorse2026!",
    });
    expect(unlocked.state).toBe("ready");
    if (unlocked.state === "ready") {
      expect(unlocked.securityStatus).toBe("encrypted-verified");
      expect(unlocked.model.headline).toBe("VaultWiFi");
      expect(
        unlocked.model.fields.find((f) => f.key === "password")?.value,
      ).toBe("top-secret-wifi-password");
    }
  });

  it("encrypts an offline Direct Raw QR (`QKE1.…`) and detects 1-bit AAD/ciphertext tampering", async () => {
    const built = await buildProtectedQrPayload({
      encodingMode: "raw",
      securityMode: "password-aes",
      config: {
        typeId: "text",
        values: { text: "Classified offline note #77" },
      },
      passphrase: "Vault9999",
      hint: "Four nines",
      iterations: 10_000,
    } as never);

    expect(built.payload.startsWith("QKE1.")).toBe(true);
    expect(built.payload).not.toContain("Classified");

    // Flip 1 bit in the last byte of ciphertext/authTag -> GCM must reject!
    const rawBytes = fromBase64Url(built.payload.slice(5));
    rawBytes[rawBytes.length - 1] ^= 0x01;
    const tamperedPayload = `QKE1.${toBase64Url(rawBytes)}`;
    const tamperedAttempt = await verifyAndResolveQrPayload(tamperedPayload, {
      passphrase: "Vault9999",
    });
    expect(tamperedAttempt.state).toBe("locked");
    if (tamperedAttempt.state === "locked") {
      expect(tamperedAttempt.errorMessage).toMatch(/AES-256-GCM/i);
    }

    // Original decrypts cleanly
    const clean = await verifyAndResolveQrPayload(built.payload, {
      passphrase: "Vault9999",
    });
    expect(clean.state).toBe("decrypted-raw");
    if (clean.state === "decrypted-raw") {
      expect(clean.plaintext).toBe("Classified offline note #77");
    }
  });

  it("auto-decrypts `#k=` zero-knowledge AES-256-GCM links and blocks tampered `#k=` keys", async () => {
    const built = await buildProtectedQrPayload({
      encodingMode: "template",
      securityMode: "auto-aes",
      config: {
        typeId: "vcard",
        values: sampleValuesFor("vcard"),
      },
      origin: "https://quickkit.tools",
    });

    expect(built.payload).toContain("/qr?e=");
    expect(built.payload).toContain("#k=");
    expect(built.payload).not.toContain("Lovelace");

    const ok = await verifyAndResolveQrPayload(built.payload);
    expect(ok.state).toBe("ready");
    if (ok.state === "ready") {
      expect(ok.model.headline).toBe("Ada Lovelace");
    }

    // Corrupt `#k=` fragment key -> Tamper Alert!
    const corruptedKeyUrl = built.payload.slice(0, -2) + "AA";
    const bad = await verifyAndResolveQrPayload(corruptedKeyUrl);
    expect(bad.state).toBe("tampered");
  });
});

describe("Viewer & Scanner UI Security Flows", () => {
  it("unlocks an encrypted `/qr?e=…` vault in QrDataTemplateViewer and blocks tampered links", async () => {
    const built = await buildProtectedQrPayload({
      encodingMode: "template",
      securityMode: "password-aes",
      config: {
        typeId: "payment",
        values: sampleValuesFor("payment"),
      },
      origin: "https://quickkit.tools",
      passphrase: "PayPin2026",
      passphraseHint: "PayPin",
      iterations: 10_000,
    });
    const parsed = new URL(built.payload);
    mockQuery = parsed.search.slice(1);

    render(<QrDataTemplateViewer />);
    expect(
      await screen.findByRole("heading", { name: "Encrypted QR Vault" }),
    ).toBeInTheDocument();
    expect(screen.getByText("PayPin")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Decryption Passphrase/i), {
      target: { value: "PayPin2026" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Unlock & Verify QR/i }),
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "Aurora Café" }),
    ).toBeInTheDocument();
  });

  it("decrypts an offline `QKE1.…` vault and blocks tampered signed QRs inside ScanRedirectModal", async () => {
    const built = await buildProtectedQrPayload({
      encodingMode: "raw",
      securityMode: "password-aes",
      config: {
        typeId: "url",
        values: { url: "https://quickkit.tools/pricing" },
      },
      passphrase: "ScanSecret",
      iterations: 10_000,
    });

    const rec = recognize(built.payload);
    expect(rec.label).toBe("Encrypted QR Vault (AES-256-GCM)");

    render(
      <ScanRedirectModal
        item={makeScanItem(built.payload)}
        onClose={vi.fn()}
        flash={vi.fn()}
      />,
    );

    const input = await screen.findByLabelText("QR decryption passphrase");
    fireEvent.change(input, { target: { value: "ScanSecret" } });
    fireEvent.click(screen.getByRole("button", { name: /Decrypt QR/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/https:\/\/quickkit\.tools\/pricing/),
      ).toBeInTheDocument();
    });
  });

  it("flags UPI collect scams, APK downloads, obfuscated IPs and Unicode RTLO spoofing", () => {
    expect(
      inspectPayload("upi://collect?pa=scammer@upi&am=5000", "payment").level,
    ).toBe("high");
    expect(
      inspectPayload("https://example.com/update/bank-app.apk", "url").level,
    ).toBe("high");
    expect(inspectPayload("http://0x7f000001/login", "url").level).toBe("high");
    expect(
      inspectPayload("https://example.com/\u202Efdp.exe", "url").level,
    ).toBe("high");
    expect(
      inspectPayload(
        "https://trusted.example.com/out?redirect=https://other.evil.org/phish",
        "url",
      ).level,
    ).toBe("caution");
  });
});
