import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import {
  buildQrPayload,
  defaultQrFormValues,
  defaultQrOptions,
  parseBatchQrInput,
  qrByteLength,
  qrContrast,
  qrReadabilityGuidance,
  sanitizeQrFilename,
  validateQrOptions,
} from "../lib/tools/qr";

describe("QR content payloads", () => {
  it("keeps plain text and canonicalizes a website URL", () => {
    expect(
      buildQrPayload("text", { ...defaultQrFormValues, text: "  Hello!  " }),
    ).toBe("  Hello!  ");
    expect(
      buildQrPayload("url", {
        ...defaultQrFormValues,
        url: "example.com/path",
      }),
    ).toBe("https://example.com/path");
  });

  it("escapes Wi-Fi delimiters and supports open or hidden networks", () => {
    expect(
      buildQrPayload("wifi", {
        ...defaultQrFormValues,
        wifiSsid: "Studio;Guest",
        wifiPassword: "a,b:c",
        wifiHidden: true,
      }),
    ).toBe("WIFI:T:WPA;S:Studio\\;Guest;P:a\\,b\\:c;H:true;;");
    expect(
      buildQrPayload("wifi", {
        ...defaultQrFormValues,
        wifiSsid: "Public",
        wifiSecurity: "nopass",
      }),
    ).toBe("WIFI:T:nopass;S:Public;P:;;");
  });

  it("builds phone, email and SMS URIs", () => {
    expect(
      buildQrPayload("phone", {
        ...defaultQrFormValues,
        phone: "+1 (555) 123-4567",
      }),
    ).toBe("tel:+15551234567");
    expect(
      buildQrPayload("email", {
        ...defaultQrFormValues,
        emailAddress: "hello@example.com",
        emailSubject: "Quick hello",
        emailBody: "See you soon",
      }),
    ).toBe("mailto:hello@example.com?subject=Quick+hello&body=See+you+soon");
    expect(
      buildQrPayload("email", {
        ...defaultQrFormValues,
        emailAddress: "hello+offers@example.com",
      }),
    ).toBe("mailto:hello%2Boffers@example.com");
    expect(
      buildQrPayload("sms", {
        ...defaultQrFormValues,
        smsNumber: "+91 98765 43210",
        smsMessage: "On my way",
      }),
    ).toBe("SMSTO:+919876543210:On my way");
  });

  it("encodes a complete escaped vCard contact", () => {
    const payload = buildQrPayload("vcard", {
      ...defaultQrFormValues,
      firstName: "Asha",
      lastName: "Patel",
      contactOrganization: "Quickkit, Inc.",
      contactPhone: "+91 98765 43210",
      contactEmail: "asha@example.com",
      contactStreet: "1 Main; Street",
      contactCity: "Ahmedabad",
    });
    expect(payload).toContain("BEGIN:VCARD\r\nVERSION:3.0");
    expect(payload).toContain("N:Patel;Asha;;;");
    expect(payload).toContain("ORG:Quickkit\\, Inc.");
    expect(payload).toContain("TEL;TYPE=CELL:+919876543210");
    expect(payload).toContain("ADR;TYPE=WORK:;;1 Main\\; Street;Ahmedabad;;;");
    expect(payload.endsWith("END:VCARD")).toBe(true);
  });

  it("builds a WhatsApp link, validated geo coordinates, and UTC calendar event", () => {
    expect(
      buildQrPayload("whatsapp", {
        ...defaultQrFormValues,
        whatsappNumber: "+91 98765 43210",
        whatsappMessage: "Hello there",
      }),
    ).toBe("https://wa.me/919876543210?text=Hello%20there");
    expect(
      buildQrPayload("location", {
        ...defaultQrFormValues,
        latitude: "23.0225",
        longitude: "72.5714",
        locationLabel: "Ahmedabad center",
      }),
    ).toBe("geo:23.0225,72.5714?q=23.0225,72.5714(Ahmedabad%20center)");
    const event = buildQrPayload("event", {
      ...defaultQrFormValues,
      eventTitle: "Launch day",
      eventStart: "2026-10-29T09:30",
      eventEnd: "2026-10-29T10:30",
      eventLocation: "Studio, room 2",
    });
    expect(event).toContain("BEGIN:VCALENDAR\r\nVERSION:2.0");
    expect(event).toContain("BEGIN:VEVENT\r\nUID:quickkit-");
    expect(event).toContain("DTSTAMP:");
    expect(event).toContain("DTSTART:");
    expect(event).toContain("SUMMARY:Launch day");
    expect(event).toContain("LOCATION:Studio\\, room 2");
    expect(event.endsWith("END:VEVENT\r\nEND:VCALENDAR")).toBe(true);
  });

  it("creates a UPI payment intent without claiming to process payment", () => {
    const payload = buildQrPayload("upi", {
      ...defaultQrFormValues,
      upiId: "shop@bank",
      upiName: "Quickkit Store",
      upiAmount: "250",
      upiNote: "Order 123",
    });
    expect(payload).toBe(
      "upi://pay?pa=shop%40bank&cu=INR&pn=Quickkit+Store&am=250.00&tn=Order+123",
    );
  });

  it("rejects malformed URLs, contact data, coordinates, events and payment details", () => {
    expect(() =>
      buildQrPayload("url", {
        ...defaultQrFormValues,
        url: "javascript://example.com",
      }),
    ).toThrow("http or https");
    expect(() =>
      buildQrPayload("phone", { ...defaultQrFormValues, phone: "abc" }),
    ).toThrow("digits");
    expect(() =>
      buildQrPayload("email", { ...defaultQrFormValues, emailAddress: "nope" }),
    ).toThrow("valid email");
    expect(() =>
      buildQrPayload("email", {
        ...defaultQrFormValues,
        emailAddress: "first..last@example..com",
      }),
    ).toThrow("valid email");
    expect(() => buildQrPayload("vcard", defaultQrFormValues)).toThrow(
      "at least a first or last name",
    );
    expect(() =>
      buildQrPayload("location", {
        ...defaultQrFormValues,
        latitude: "91",
        longitude: "0",
      }),
    ).toThrow("Latitude");
    expect(() =>
      buildQrPayload("event", {
        ...defaultQrFormValues,
        eventTitle: "Meeting",
        eventStart: "2026-10-29T10:00",
        eventEnd: "2026-10-29T09:00",
      }),
    ).toThrow("end must be after");
    expect(() =>
      buildQrPayload("upi", { ...defaultQrFormValues, upiId: "not-a-vpa" }),
    ).toThrow("UPI ID");
  });
});

describe("QR design and batch safeguards", () => {
  it("measures multi-byte input and enforces a supported canvas, margin and contrast", () => {
    expect(qrByteLength("😀")).toBe(4);
    expect(() => validateQrOptions(defaultQrOptions)).not.toThrow();
    expect(() => validateQrOptions({ ...defaultQrOptions, margin: 3 })).toThrow(
      "margin",
    );
    expect(() =>
      validateQrOptions({ ...defaultQrOptions, foreground: "#eeeeee" }),
    ).toThrow("contrast");
  });

  it("validates gradient contrast and the available dot and finder styles", () => {
    const styledOptions = {
      ...defaultQrOptions,
      fillStyle: "gradient" as const,
      foreground: "#153d2a",
      gradientEnd: "#6657e8",
      dotStyle: "dots" as const,
      cornerStyle: "circle" as const,
    };
    expect(validateQrOptions(styledOptions)).toEqual(styledOptions);
    expect(qrContrast(styledOptions)).toBeGreaterThanOrEqual(3);
    expect(
      qrContrast({ ...styledOptions, gradientEnd: "#eeeeee" }),
    ).toBeLessThan(3);
    expect(() =>
      validateQrOptions({ ...styledOptions, gradientEnd: "#eeeeee" }),
    ).toThrow("both ends of a gradient");
    expect(() =>
      validateQrOptions({ ...defaultQrOptions, dotStyle: "triangle" as never }),
    ).toThrow("dot style");
    expect(() =>
      validateQrOptions({ ...defaultQrOptions, cornerStyle: "heart" as never }),
    ).toThrow("finder corner style");
  });

  it("parses named batch lines, fills safe defaults and de-duplicates filenames", () => {
    expect(
      parseBatchQrInput(
        "menu | https://example.com/menu\nhttps://example.com\nmenu.png | hello",
      ),
    ).toEqual([
      { filename: "menu", content: "https://example.com/menu" },
      { filename: "qr-02", content: "https://example.com" },
      { filename: "menu-2", content: "hello" },
    ]);
    expect(sanitizeQrFilename("../unsafe:name?.png")).toBe("-unsafe-name");
    expect(sanitizeQrFilename("CON")).toBe("qr-CON");
    expect(() => parseBatchQrInput(" \n ")).toThrow("at least one line");
    expect(() =>
      parseBatchQrInput(
        Array.from({ length: 51 }, (_, i) => `item-${i}`).join("\n"),
      ),
    ).toThrow("up to 50");
  });

  it("gives readable scan guidance based on decoder evidence", () => {
    expect(
      qrReadabilityGuidance({
        contrast: 12,
        modulePixels: 5,
        quietZone: 4,
        errorLevel: "H",
        hasLogo: true,
        decodeVerified: true,
      }),
    ).toContain("passed");
    expect(
      qrReadabilityGuidance({
        contrast: 3.5,
        modulePixels: 2,
        quietZone: 2,
        errorLevel: "M",
        hasLogo: true,
        decodeVerified: false,
      }),
    ).toContain("reduce the logo");
  });

  it("generates real color and size variants that jsQR can decode", async () => {
    const payload = "https://example.com/quickkit?test=real-scan";
    for (const [size, dark, light, level] of [
      [256, "#14213d", "#ffffff", "M"],
      [512, "#153d2a", "#dff5e8", "Q"],
      [1024, "#28144f", "#fff8ed", "H"],
    ] as const) {
      const bytes = await QRCode.toBuffer(payload, {
        width: size,
        margin: 6,
        errorCorrectionLevel: level,
        color: { dark, light },
      });
      const png = PNG.sync.read(bytes);
      expect(png.width).toBeGreaterThanOrEqual(size - 1);
      expect(png.width).toBeLessThanOrEqual(size);
      expect(png.height).toBe(png.width);
      expect(
        jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data,
      ).toBe(payload);
    }
  });
});
