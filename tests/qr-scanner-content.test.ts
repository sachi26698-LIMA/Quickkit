/**
 * Content recognition and security inspection, tested as parsers.
 *
 * The point of these tests is the *negative* space as much as the positive one:
 * a plain sentence must not be reported as a URL, a random string must not
 * become a Wi-Fi network, and an unknown scheme must not be described as safe.
 */
import { describe, expect, it } from "vitest";
import { recognize, formatIcalDate } from "../lib/tools/qr-scanner/content";
import {
  inspectPayload,
  registrableDomain,
} from "../lib/tools/qr-scanner/security";

describe("content recognition", () => {
  it("recognises a website URL and never offers an automatic open", () => {
    const result = recognize("https://quickkit.example/tools");
    expect(result.type).toBe("url");
    expect(result.primary).toBe("https://quickkit.example/tools");
    expect(result.actions.map((action) => action.id)).not.toContain("open-url");
  });

  it("treats plain prose as text, not as a link", () => {
    const result = recognize("Remember to water the plants on Tuesday.");
    expect(result.type).toBe("text");
    expect(result.fields.some((field) => field.label === "Scheme")).toBe(false);
  });

  it("parses a Wi-Fi payload including escapes and marks it sensitive", () => {
    const result = recognize(
      "WIFI:S:The \\; Cafe;T:WPA;P:pa\\;ss:word;H:true;;",
    );
    expect(result.type).toBe("wifi");
    expect(result.sensitive).toBe(true);
    expect(
      result.fields.find((field) => field.label === "Network name (SSID)")
        ?.value,
    ).toBe("The ; Cafe");
    expect(
      result.fields.find((field) => field.label === "Password")?.value,
    ).toBe("pa;ss:word");
    expect(
      result.fields.find((field) => field.label === "Hidden network")?.value,
    ).toBe("Yes");
  });

  it("rejects a Wi-Fi payload with no network name", () => {
    expect(recognize("WIFI:T:WPA;P:secret;;").type).not.toBe("wifi");
  });

  it("parses a vCard contact with multiple phones", () => {
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:Lovelace;Ada;;;",
      "FN:Ada Lovelace",
      "ORG:Analytical Engines",
      "TEL;TYPE=WORK:+44 20 7946 0000",
      "TEL;TYPE=CELL:+44 7700 900123",
      "EMAIL:ada@example.org",
      "URL:https://example.org",
      "END:VCARD",
    ].join("\r\n");
    const result = recognize(vcard);
    expect(result.type).toBe("vcard");
    expect(result.summary).toContain("Ada Lovelace");
    expect(
      result.fields.filter((field) => field.label.startsWith("Phone")),
    ).toHaveLength(2);
    expect(
      result.fields.find((field) => field.label === "Organisation")?.value,
    ).toBe("Analytical Engines");
    // FN and N describe the same person; only one "Name" row may exist.
    expect(
      result.fields.filter((field) => field.label === "Name"),
    ).toHaveLength(1);
  });

  it("parses a MECARD contact", () => {
    const result = recognize(
      "MECARD:N:Doe,John;TEL:+15551234567;EMAIL:j@d.example;;",
    );
    expect(result.type).toBe("mecard");
    expect(result.summary).toContain("John Doe");
  });

  it("parses an email with subject and body", () => {
    const result = recognize(
      "mailto:hello@example.com?subject=Hello%20there&body=Short%20note",
    );
    expect(result.type).toBe("email");
    expect(result.primary).toBe("hello@example.com");
    expect(
      result.fields.find((field) => field.label === "Subject")?.value,
    ).toBe("Hello there");
  });

  it("parses a bare email address", () => {
    expect(recognize("someone@example.co.uk").type).toBe("email");
  });

  it("parses phone numbers but not arbitrary digit strings", () => {
    expect(recognize("tel:+1 (555) 123-4567").type).toBe("phone");
    expect(recognize("+91 98765 43210").type).toBe("phone");
    // Seven digits is a barcode, not a phone number — and it is text, not an
    // invented "unknown URI".
    expect(recognize("1234567").type).toBe("text");
  });

  it("parses SMS with a message body", () => {
    const result = recognize("sms:+15551234567?body=Meet%20me%20at%206");
    expect(result.type).toBe("sms");
    expect(
      result.fields.find((field) => field.label === "Message")?.value,
    ).toBe("Meet me at 6");
  });

  it("parses WhatsApp links including wa.me", () => {
    const result = recognize("https://wa.me/15551234567?text=Hello");
    expect(result.type).toBe("whatsapp");
    expect(
      result.fields.find((field) => field.label === "Phone number")?.value,
    ).toBe("+15551234567");
  });

  it("parses a geo URI and validates coordinate ranges", () => {
    const result = recognize("geo:51.5007,-0.1246?q=Big%20Ben");
    expect(result.type).toBe("geo");
    expect(result.primary).toBe("51.5007,-0.1246");
    expect(result.actions.some((action) => action.id === "open-maps")).toBe(
      true,
    );
    // Out of range latitude is not a location.
    expect(recognize("geo:999.1,20.2").type).not.toBe("geo");
  });

  it("parses a calendar event and formats its date honestly", () => {
    const ics = [
      "BEGIN:VEVENT",
      "SUMMARY:Design review",
      "DTSTART:20261104T140000Z",
      "DTEND:20261104T150000Z",
      "LOCATION:Room 4",
      "END:VEVENT",
    ].join("\r\n");
    const result = recognize(ics);
    expect(result.type).toBe("event");
    expect(result.summary).toContain("Design review");
    expect(result.fields.find((field) => field.label === "Starts")?.value).toBe(
      "4 Nov 2026, 14:00 UTC",
    );
  });

  it("leaves an unparseable iCal date as the raw text", () => {
    expect(formatIcalDate("not-a-date")).toBe("not-a-date");
  });

  it("recognises social profiles and names the network", () => {
    const instagram = recognize("https://www.instagram.com/quickkit.app");
    expect(instagram.type).toBe("social");
    expect(instagram.summary).toContain("Instagram");
    const youtube = recognize("https://youtu.be/dQw4w9WgXcQ");
    expect(youtube.type).toBe("social");
  });

  it("recognises app store links", () => {
    const result = recognize(
      "https://play.google.com/store/apps/details?id=com.example.app",
    );
    expect(result.type).toBe("app");
    expect(result.fields.find((field) => field.label === "App ID")?.value).toBe(
      "com.example.app",
    );
  });

  it("parses a UPI payment request", () => {
    const result = recognize(
      "upi://pay?pa=merchant@bank&pn=Corner%20Shop&am=250.00&cu=INR&tn=Order%20123",
    );
    expect(result.type).toBe("payment");
    expect(
      result.fields.find((field) => field.label === "Payee address (VPA)")
        ?.value,
    ).toBe("merchant@bank");
    expect(result.fields.find((field) => field.label === "Amount")?.value).toBe(
      "250.00",
    );
    expect(result.fields.find((field) => field.label === "Note")?.value).toBe(
      "Order 123",
    );
  });

  it("parses bitcoin and ethereum addresses", () => {
    const bitcoin = recognize(
      "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.5",
    );
    expect(bitcoin.type).toBe("crypto");
    expect(
      bitcoin.fields.find((field) => field.label === "Amount")?.value,
    ).toBe("0.5");
    const ethereum = recognize("0x52908400098527886E0F7030069857D2E4169EE7");
    expect(ethereum.type).toBe("crypto");
  });

  it("validates GTIN check digits rather than trusting the length", () => {
    const valid = recognize("4006381333931");
    expect(valid.type).toBe("product");
    expect(
      valid.fields.find((field) => field.label === "Check digit")?.value,
    ).toBe("Valid");
    const invalid = recognize("4006381333932");
    expect(
      invalid.fields.find((field) => field.label === "Check digit")?.value,
    ).toBe("Invalid");
  });

  it("falls back to an honest unknown label for a custom scheme", () => {
    const result = recognize("myapp://open?target=settings");
    expect(result.type).toBe("unknown");
    expect(result.fields.find((field) => field.label === "Scheme")?.value).toBe(
      "myapp",
    );
  });

  it("never throws on hostile or malformed payloads", () => {
    for (const payload of [
      "",
      "   ",
      "\u0000\u0001\u0002",
      "WIFI:S:",
      "BEGIN:VCARD",
      "mailto:",
      "geo:,",
      "a".repeat(5000),
    ])
      expect(() => recognize(payload)).not.toThrow();
  });
});

describe("security inspection", () => {
  it("flags plain HTTP as a caution, without calling it safe", () => {
    const result = inspectPayload("http://example.com/login", "url");
    expect(result.level).toBe("caution");
    expect(result.findings.map((finding) => finding.title)).toContain(
      "Not encrypted (HTTP)",
    );
  });

  it("does not describe an HTTPS link as verified or safe", () => {
    const result = inspectPayload("https://example.com", "url");
    expect(result.headline).toBe("No obvious warning found");
    expect(result.headline.toLowerCase()).not.toContain("safe");
  });

  it("treats javascript: and data: as high risk and never as a web URL", () => {
    for (const payload of [
      "javascript:alert(document.cookie)",
      "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
      "file:///etc/passwd",
    ]) {
      const result = inspectPayload(payload, "unknown");
      expect(result.level, payload).toBe("high");
      expect(result.url, payload).toBeNull();
    }
  });

  it("flags a raw IP address", () => {
    const result = inspectPayload("http://192.168.0.10/admin", "url");
    expect(
      result.findings.some((finding) => finding.title.includes("Raw IP")),
    ).toBe(true);
  });

  it("flags embedded credentials as high risk", () => {
    const result = inspectPayload("https://user:pass@example.com/", "url");
    expect(result.level).toBe("high");
  });

  it("flags a known URL shortener", () => {
    const result = inspectPayload("https://bit.ly/3xyzabc", "url");
    expect(
      result.findings.some((finding) => finding.title === "Shortened link"),
    ).toBe(true);
  });

  it("flags punycode hosts", () => {
    const result = inspectPayload("https://xn--pypal-4ve.com/login", "url");
    expect(
      result.findings.some((finding) => finding.title.includes("Punycode")),
    ).toBe(true);
  });

  it("detects a lookalike brand domain", () => {
    const result = inspectPayload("https://paypa1.com/verify", "url");
    expect(result.level).toBe("high");
    expect(
      result.findings.some((finding) => finding.title.includes("PayPal")),
    ).toBe(true);
  });

  it("does not flag the real brand domain as impersonation", () => {
    const result = inspectPayload("https://www.paypal.com/signin", "url");
    expect(
      result.findings.some((finding) =>
        finding.title.includes("impersonation"),
      ),
    ).toBe(false);
  });

  it("flags a brand name pushed into a subdomain", () => {
    const result = inspectPayload(
      "https://paypal.com.secure-login.example/",
      "url",
    );
    expect(result.level).toBe("high");
  });

  it("does not call a recognised scheme unrecognised", () => {
    // The parser understands WIFI: and UPI:, so the security pass must not add a
    // generic "unknown scheme" warning on top of that.
    for (const [payload, type] of [
      ["WIFI:S:Home;T:WPA;P:x;;", "wifi"],
      ["upi://pay?pa=a@b&am=1", "payment"],
      ["MECARD:N:Doe,John;;", "mecard"],
    ] as const) {
      const titles = inspectPayload(payload, type).findings.map((f) => f.title);
      expect(titles, payload).not.toContain("Unrecognised URI scheme");
    }
    // A genuinely custom scheme still gets the warning.
    expect(
      inspectPayload("myapp://open", "unknown").findings.map((f) => f.title),
    ).toContain("Unrecognised URI scheme");
  });

  it("warns about Wi-Fi credentials and payment payloads", () => {
    expect(
      inspectPayload("WIFI:S:Home;T:WPA;P:x;;", "wifi").findings.length,
    ).toBeGreaterThan(0);
    expect(
      inspectPayload("upi://pay?pa=a@b&am=1", "payment").findings.some(
        (finding) => finding.title.includes("Money"),
      ),
    ).toBe(true);
  });

  it("reports unknown schemes as unverifiable rather than safe", () => {
    const result = inspectPayload("myapp://do-something", "unknown");
    expect(["caution", "unverified"]).toContain(result.level);
  });

  it("resolves registrable domains for multi-part suffixes", () => {
    expect(registrableDomain("shop.example.co.uk")).toBe("example.co.uk");
    expect(registrableDomain("example.com")).toBe("example.com");
    expect(registrableDomain("a.b.example.com")).toBe("example.com");
  });

  it("never returns a url for a non-web scheme", () => {
    expect(inspectPayload("tel:+15551234567", "phone").url).toBeNull();
    expect(inspectPayload("mailto:a@b.example", "email").url).toBeNull();
  });
});
