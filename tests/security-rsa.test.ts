import { describe, expect, it } from "vitest";
import {
  generateRsaKeys,
  rsaEncrypt,
  rsaDecrypt,
  verifyRsaSignature,
} from "../lib/tools/security/rsa";

describe("RSA Web Crypto operations", () => {
  it("generates RSA-OAEP keys and round-trips Unicode, enforcing size and key use", async () => {
    const keys = await generateRsaKeys(2048);
    const cipher = await rsaEncrypt("hello 🔐", keys.publicKey);
    expect(await rsaDecrypt(cipher, keys.privateKey)).toBe("hello 🔐");
    await expect(rsaEncrypt("x".repeat(191), keys.publicKey)).rejects.toThrow(
      "190 UTF-8 bytes",
    );
    await expect(rsaEncrypt("", keys.publicKey)).rejects.toThrow("non-empty");
    await expect(rsaEncrypt("hello", keys.privateKey)).rejects.toThrow(
      "public JWK",
    );
    await expect(rsaDecrypt(cipher, keys.publicKey)).rejects.toThrow(
      "private JWK",
    );
    const other = await generateRsaKeys(2048);
    await expect(rsaDecrypt(cipher, other.privateKey)).rejects.toThrow(
      "Decryption failed",
    );
    await expect(
      rsaDecrypt(cipher.slice(2), keys.privateKey),
    ).rejects.toThrow();
    await expect(generateRsaKeys(1024)).rejects.toThrow();
  });
  it("verifies a real RSASSA-PKCS1-v1_5 signature without claiming trust", async () => {
    const pair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"],
    );
    const message = "signed ગુજરાતી";
    const sig = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      pair.privateKey,
      new TextEncoder().encode(message),
    );
    const hex = Array.from(new Uint8Array(sig), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    const key = JSON.stringify(
      await crypto.subtle.exportKey("jwk", pair.publicKey),
    );
    expect(await verifyRsaSignature(message, hex, key)).toContain(
      "SIGNATURE VALID",
    );
    expect(await verifyRsaSignature(`${message}!`, hex, key)).toContain(
      "SIGNATURE INVALID",
    );
    await expect(verifyRsaSignature(message, "00", key)).rejects.toThrow(
      "key size",
    );
    const privateKey = JSON.stringify(
      await crypto.subtle.exportKey("jwk", pair.privateKey),
    );
    await expect(verifyRsaSignature(message, hex, privateKey)).rejects.toThrow(
      "public JWK",
    );
  });
});

it("generates dedicated RS256 keys and interoperates with Node signatures", async () => {
  const { generateRsaSigningKeys, signRsaMessage } =
    await import("../lib/tools/security/rsa");
  const { createPublicKey, createPrivateKey, verify, sign } =
    await import("node:crypto");
  const pair = await generateRsaSigningKeys(2048);
  const pub = JSON.parse(pair.publicKey),
    priv = JSON.parse(pair.privateKey);
  expect(pub.key_ops).toEqual(["verify"]);
  expect(priv.key_ops).toEqual(["sign"]);
  const message = "Independent verification 🔐";
  const signature = await signRsaMessage(message, pair.privateKey);
  expect(
    verify(
      "sha256",
      Buffer.from(message),
      createPublicKey({ key: pub, format: "jwk" }),
      Buffer.from(signature, "hex"),
    ),
  ).toBe(true);
  const nodeSignature = sign(
    "sha256",
    Buffer.from(message),
    createPrivateKey({ key: priv, format: "jwk" }),
  ).toString("hex");
  expect(
    await verifyRsaSignature(message, nodeSignature, pair.publicKey),
  ).toContain("SIGNATURE VALID");
  expect(
    await verifyRsaSignature(message + "!", signature, pair.publicKey),
  ).toContain("SIGNATURE INVALID");
  await expect(signRsaMessage(message, pair.publicKey)).rejects.toThrow(
    "private JWK",
  );
  await expect(
    signRsaMessage("x".repeat(1_000_001), pair.privateKey),
  ).rejects.toThrow("1,000,000");
  const oaep = await generateRsaKeys(2048);
  await expect(signRsaMessage(message, oaep.privateKey)).rejects.toThrow(
    "separate signing key",
  );
});
