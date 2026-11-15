import { describe, expect, it } from "vitest";
import {
  defaultPasswordOptions,
  generatePasswordBatch,
} from "../lib/tools/password";
import { hashBytes, hashText } from "../lib/tools/developer-data";

describe("security tool extensions", () => {
  it("generates a bounded batch with the selected character classes", () => {
    const batch = generatePasswordBatch(defaultPasswordOptions, 50);
    expect(batch).toHaveLength(50);
    for (const password of batch) {
      expect(password).toHaveLength(20);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[0-9]/);
      expect(password).toMatch(/[!@#$%^&*()\-_=+\[\]{};:,.?]/);
    }
  });
  it.each([0, 51, 1.5, NaN])("rejects invalid batch size %s", (count) => {
    expect(() =>
      generatePasswordBatch(defaultPasswordOptions, count),
    ).toThrow();
  });
  it("hashes empty and Unicode bytes consistently with SHA-384", async () => {
    expect(await hashText("", "SHA-384")).toBe(
      "38b060a751ac96384cd9327eb1b1e36a21fdb71114be07434c0cc7bf63f6e1da274edebfe76f65fbd51ad2f14898b95b",
    );
    expect(await hashText("ગુજરાતી 🔐", "SHA-384")).toBe(
      await hashBytes(new TextEncoder().encode("ગુજરાતી 🔐"), "SHA-384"),
    );
  });
});
