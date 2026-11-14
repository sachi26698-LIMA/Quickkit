import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hmac } from "../lib/tools/security/hmac";

describe("local HMAC", () => {
  it.each(["SHA-256", "SHA-384", "SHA-512"] as const)(
    "generates and verifies %s using Unicode data",
    async (hash) => {
      const key = "00112233445566778899aabbccddeeff";
      const msg = "Hello ગુજરાતી 🔐";
      const expected = createHmac(
        hash.toLowerCase().replace("-", ""),
        Buffer.from(key, "hex"),
      )
        .update(msg)
        .digest("hex");
      expect(await hmac(msg, key, "hex", hash)).toBe(expected);
      expect(await hmac(msg, key, "hex", hash, expected)).toContain(
        "HMAC MATCHES",
      );
      expect(await hmac(`${msg}!`, key, "hex", hash, expected)).toContain(
        "DOES NOT MATCH",
      );
    },
  );
  it("accepts empty messages, rejects weak or malformed keys and tags", async () => {
    expect(
      await hmac("", "this-is-a-long-key", "utf8", "SHA-256"),
    ).toHaveLength(64);
    await expect(hmac("x", "short", "utf8", "SHA-256")).rejects.toThrow("16");
    await expect(hmac("x", "abc", "hex", "SHA-256")).rejects.toThrow(
      "hexadecimal",
    );
    await expect(
      hmac("x", "this-is-a-long-key", "utf8", "SHA-256", "00"),
    ).rejects.toThrow("32 bytes");
    await expect(
      hmac("x".repeat(1_000_001), "this-is-a-long-key", "utf8", "SHA-256"),
    ).rejects.toThrow("exceeds");
  });
});

it.each([
  [
    "SHA-256",
    "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7",
  ],
  [
    "SHA-384",
    "afd03944d84895626b0825f4ab46907f15f9dadbe4101ec682aa034c7cebc59cfaea9ea9076ede7f4af152e8b2fa9cb6",
  ],
  [
    "SHA-512",
    "87aa7cdea5ef619d4ff0b4241a1d6cb02379f4e2ce4ec2787ad0b30545e17cdedaa833b7d6b8a702038b274eaea3f4e4be9d914eeb61f1702e696c203a126854",
  ],
] as const)("matches RFC 4231 test case 1 for %s", async (hash, tag) => {
  const key = "0b".repeat(20);
  expect(await hmac("Hi There", key, "hex", hash)).toBe(tag);
  expect(await hmac("Hi There", key, "hex", hash, tag)).toContain(
    "HMAC MATCHES",
  );
});
