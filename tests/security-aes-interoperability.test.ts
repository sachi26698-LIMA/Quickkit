import { createCipheriv, createDecipheriv, pbkdf2Sync } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  decryptBytes,
  encryptBytes,
  PBKDF2_ITERATIONS,
} from "../lib/tools/security/logic";

describe("QKENC1 AES-GCM independent implementation interoperability", () => {
  it("decrypts a deterministic Node-generated PBKDF2/AES-256-GCM envelope and rejects tampering", async () => {
    const header = Buffer.concat([
      Buffer.from("QKENC1"),
      Buffer.alloc(16, 0x01),
      Buffer.alloc(12, 0x02),
    ]);
    const key = pbkdf2Sync(
      "correct horse",
      header.subarray(6, 22),
      PBKDF2_ITERATIONS,
      32,
      "sha256",
    );
    const cipher = createCipheriv("aes-256-gcm", key, header.subarray(22, 34));
    cipher.setAAD(header);
    const plain = Buffer.from("independent envelope 雪");
    const envelope = Uint8Array.from(
      Buffer.concat([
        header,
        cipher.update(plain),
        cipher.final(),
        cipher.getAuthTag(),
      ]),
    );
    expect(Buffer.from(await decryptBytes(envelope, "correct horse"))).toEqual(
      plain,
    );
    for (const offset of [6, 22, 34, envelope.length - 1]) {
      const damaged = envelope.slice();
      damaged[offset] ^= 1;
      await expect(decryptBytes(damaged, "correct horse")).rejects.toThrow();
    }
  });
  it("Node independently decrypts a real Web Crypto-generated QKENC1 envelope", async () => {
    const bytes = new TextEncoder().encode("plaintext\n🔐");
    const envelope = Buffer.from(await encryptBytes(bytes, "other password"));
    expect(envelope.subarray(0, 6).toString()).toBe("QKENC1");
    const header = envelope.subarray(0, 34);
    const key = pbkdf2Sync(
      "other password",
      header.subarray(6, 22),
      PBKDF2_ITERATIONS,
      32,
      "sha256",
    );
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      header.subarray(22, 34),
    );
    decipher.setAAD(header);
    decipher.setAuthTag(envelope.subarray(-16));
    expect(
      Buffer.concat([
        decipher.update(envelope.subarray(34, -16)),
        decipher.final(),
      ]),
    ).toEqual(Buffer.from(bytes));
  });
});
