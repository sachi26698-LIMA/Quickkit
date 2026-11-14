import { describe, expect, it } from "vitest";
import { analyzeUrl } from "../lib/tools/security/url-review";
describe("offline URL pattern review", () => {
  it("highlights protocol, credentials, IP address and omits secret values", () => {
    const out = analyzeUrl(
      "http://user:secret@127.0.0.1:8080/path?token=hidden",
    );
    expect(out).toContain("HTTP does not encrypt");
    expect(out).toContain("user information");
    expect(out).toContain("IP address");
    expect(out).not.toContain("secret");
    expect(out).not.toContain("hidden");
    expect(out).toContain("not a reputation check");
  });
  it("handles IDN, ordinary URLs and invalid input safely", () => {
    expect(analyzeUrl("https://bücher.example/")).toContain("punycode");
    expect(analyzeUrl("https://example.com")).toContain("does not mean");
    for (const input of [
      "",
      "file:///etc/passwd",
      "not a url",
      "https://example.com\nhttps://evil.com",
      "a".repeat(8193),
    ])
      expect(() => analyzeUrl(input)).toThrow();
  });
});

it("reviews a bounded offline batch with independent errors and without echoing secrets", async () => {
  const { analyzeUrlBatch } = await import("../lib/tools/security/url-review");
  const report = analyzeUrlBatch(
    "http://user:secret@example.com/?token=hidden\nnot a url\nhttps://example.org/",
  );
  expect(report).toContain("3 entries");
  expect(report).toContain("URL 2\nUnable to review");
  expect(report).toContain("Host: example.org");
  expect(report).toContain("No destinations were contacted");
  expect(report).not.toContain("secret");
  expect(report).not.toContain("hidden");
  expect(report).not.toContain("not a url");
  expect(() =>
    analyzeUrlBatch(Array(26).fill("https://example.com").join("\n")),
  ).toThrow("1–25");
  expect(() => analyzeUrlBatch("x".repeat(50001))).toThrow("50,000");
});
