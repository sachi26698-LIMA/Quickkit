import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { inspectDkimPublicKey } from "../lib/tools/security/email";
describe("local DKIM public-key inspection", () => {
  it("imports both PKCS1 and SPKI RSA public keys and reports real modulus size", async () => {
    const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    for (const format of ["pkcs1", "spki"] as const) {
      const key = publicKey
        .export({ format: "der", type: format })
        .toString("base64");
      const result = await inspectDkimPublicKey(`v=DKIM1; k=rsa; p=${key}`);
      expect(result).toContain("modulus 2048 bits");
      expect(result).toContain("does not verify a message signature");
    }
  });
  it("does not claim verification for malformed, unsupported, revoked or weak keys", async () => {
    expect(await inspectDkimPublicKey("v=DKIM1; p=")).toContain("revoked");
    expect(await inspectDkimPublicKey("v=DKIM1; p=!!!!")).toContain(
      "invalid Base64",
    );
    expect(await inspectDkimPublicKey("v=DKIM1; k=ed25519; p=YWJj")).toContain(
      "must be 32 bytes",
    );
    expect(await inspectDkimPublicKey("v=DKIM1; k=bad; p=YWJj")).toContain(
      "unsupported",
    );
    const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 1024 });
    expect(
      await inspectDkimPublicKey(
        `p=${publicKey.export({ format: "der", type: "pkcs1" }).toString("base64")}`,
      ),
    ).toContain("Consider upgrading");
  });
});
