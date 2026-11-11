// @vitest-environment jsdom
/**
 * Universal QR Data Templates, Original Shareable Links, `/qr` Viewer &
 * QR Code Scanner interoperability.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  QR_CONTENT_TYPES,
  hasDirectWebLink,
  redactForDisplay,
  sampleValuesFor,
} from "@/lib/tools/qr/payload";
import {
  QR_DATA_TEMPLATES,
  buildDataTemplateModel,
  buildDataTemplateUrl,
  decodeDataTemplate,
  isQuickkitDataTemplateUrl,
} from "@/lib/tools/qr/data-template";
import { renderQr } from "@/lib/tools/qr/render";
import { defaultDesign } from "@/lib/tools/qr/style";
import { recognize } from "@/lib/tools/qr-scanner/content";
import { resolveRedirectTarget } from "@/lib/tools/qr-scanner/redirect";
import QrDataTemplateCard from "@/components/qr-data-template/card";

let mockQuery = "";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockQuery),
}));

import QrDataTemplateViewer from "@/components/qr-data-template/viewer";

afterEach(() => {
  cleanup();
  mockQuery = "";
  window.location.hash = "";
});

describe("Universal QR Data Templates — all 28 QR types", () => {
  it("encodes and decodes an original Data Template link for every content type", () => {
    expect(QR_CONTENT_TYPES).toHaveLength(28);
    for (const type of QR_CONTENT_TYPES) {
      const values = sampleValuesFor(type.id);
      const encoded = buildDataTemplateUrl(
        { typeId: type.id, values },
        "https://quickkit.tools",
      );
      expect(encoded.url.startsWith("https://quickkit.tools/qr?d=")).toBe(true);
      expect(isQuickkitDataTemplateUrl(encoded.url)).toBe(true);

      const decoded = decodeDataTemplate(encoded.url);
      expect(decoded.ok, `${type.id} decode`).toBe(true);
      if (!decoded.ok) continue;
      expect(decoded.config.typeId).toBe(type.id);
      expect(decoded.model.headline.length).toBeGreaterThan(0);
      expect(decoded.model.fields.length).toBeGreaterThan(0);
      expect(decoded.model.actions.length).toBeGreaterThan(0);
    }
  });

  it("renders every content type's Data Template link into a PNG that jsQR decodes back losslessly", async () => {
    for (const type of QR_CONTENT_TYPES) {
      const encoded = buildDataTemplateUrl(
        { typeId: type.id, values: sampleValuesFor(type.id) },
        "https://quickkit.tools",
      );
      const rendered = await renderQr({
        payload: encoded.url,
        design: { ...defaultDesign(), size: 384 },
        artifacts: { png: true },
        verify: true,
      });
      expect(
        rendered.verification?.ok,
        `${type.id}: ${rendered.verification?.message}`,
      ).toBe(true);
      expect(rendered.verification?.decoded).toBe(encoded.url);
    }
  }, 60_000);

  it("identifies non-link QR types accurately so they receive hosted Data Cards", () => {
    for (const nonLink of [
      "payment",
      "text",
      "email",
      "phone",
      "sms",
      "wifi",
      "vcard",
      "event",
      "business",
    ] as const) {
      expect(hasDirectWebLink(nonLink)).toBe(false);
    }
    expect(hasDirectWebLink("url")).toBe(true);
    expect(hasDirectWebLink("instagram")).toBe(true);
  });

  it("keeps Wi-Fi passwords in the #s= URL fragment, never in ?d=, and redacts on screen", () => {
    const encoded = buildDataTemplateUrl(
      {
        typeId: "wifi",
        values: {
          ssid: "SecretCafe",
          password: "my-super-secret-wifi-key",
          encryption: "WPA",
          hidden: true,
        },
      },
      "https://quickkit.tools",
    );
    const parsed = new URL(encoded.url);
    expect(parsed.search).not.toContain("my-super-secret-wifi-key");
    expect(parsed.hash.startsWith("#s=")).toBe(true);

    const onScreen = redactForDisplay(encoded.url, "wifi", {
      ssid: "SecretCafe",
      password: "my-super-secret-wifi-key",
    });
    expect(onScreen).toContain("#s=••••••••");
    expect(onScreen).not.toContain("my-super-secret-wifi-key");

    // Full URL with #s= restores the password; stripped #s= still renders SSID safely.
    const full = decodeDataTemplate(encoded.url);
    expect(full.ok).toBe(true);
    if (full.ok) {
      expect(full.model.fields.find((f) => f.key === "password")?.value).toBe(
        "my-super-secret-wifi-key",
      );
    }

    const stripped = decodeDataTemplate(
      `${parsed.origin}${parsed.pathname}${parsed.search}`,
    );
    expect(stripped.ok).toBe(true);
    if (stripped.ok) {
      expect(stripped.model.headline).toBe("SecretCafe");
      expect(
        stripped.model.fields.find((f) => f.key === "password"),
      ).toBeUndefined();
    }
  });

  it("builds a rich Payment / UPI Data Template with UPI deep-link and fallback link", () => {
    const model = buildDataTemplateModel({
      typeId: "payment",
      theme: "emerald",
      values: {
        method: "upi",
        payeeName: "Aurora Café",
        upiId: "auroracafe@upi",
        paymentUrl: "https://razorpay.me/auroracafe",
        amount: "349.5",
        currency: "INR",
        note: "Table 7",
      },
    });
    expect(model.badge).toBe("Payment / UPI");
    expect(model.headline).toBe("Aurora Café");
    expect(model.highlight?.kind).toBe("payment");
    const upiAction = model.actions.find((a) => a.id === "pay-upi");
    expect(upiAction?.href).toBe(
      "upi://pay?pa=auroracafe%40upi&pn=Aurora%20Caf%C3%A9&am=349.50&cu=INR&tn=Table%207",
    );
    const linkAction = model.actions.find((a) => a.id === "pay-link");
    expect(linkAction?.href).toBe("https://razorpay.me/auroracafe");
  });

  it("rejects malformed or tampered tokens cleanly without throwing", () => {
    expect(decodeDataTemplate("").ok).toBe(false);
    expect(decodeDataTemplate("https://quickkit.tools/other").ok).toBe(false);
    expect(decodeDataTemplate("https://quickkit.tools/qr?d=not-valid").ok).toBe(
      false,
    );
  });
});

describe("`/qr` Data Template Viewer & Scanner recognition", () => {
  it("renders every theme and interactive password reveal on `/qr?d=…`", () => {
    for (const theme of QR_DATA_TEMPLATES) {
      const model = buildDataTemplateModel({
        typeId: "vcard",
        theme: theme.id,
        values: sampleValuesFor("vcard"),
      });
      const { unmount } = render(<QrDataTemplateCard model={model} />);
      expect(
        document.querySelector(`[data-qr-template-theme="${theme.id}"]`),
      ).not.toBeNull();
      expect(
        screen.getByRole("heading", { level: 1, name: "Ada Lovelace" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Save Contact \(\.vcf\)/ }),
      ).toBeInTheDocument();
      unmount();
    }

    const wifiEncoded = buildDataTemplateUrl(
      {
        typeId: "wifi",
        values: {
          ssid: "GuestNet",
          password: "guest-password-99",
          encryption: "WPA",
        },
      },
      "https://quickkit.tools",
    );
    const parsed = new URL(wifiEncoded.url);
    mockQuery = parsed.search.slice(1);
    window.location.hash = parsed.hash;

    render(<QrDataTemplateViewer />);
    expect(
      screen.getByRole("heading", { level: 1, name: "GuestNet" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("guest-password-99")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getAllByText("guest-password-99").length).toBeGreaterThan(0);
  });

  it("shows a helpful empty state when `/qr` is opened with no query token", () => {
    mockQuery = "";
    render(<QrDataTemplateViewer />);
    expect(
      screen.getByRole("heading", { level: 1, name: "QUICKKIT QR Data Card" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Create a QR Code/ }),
    ).toHaveAttribute("href", "/tools/qr-generator");
  });

  it("is recognised natively by QUICKKIT QR Code Scanner with clickable Open Data Template redirect", () => {
    const paymentLink = buildDataTemplateUrl(
      {
        typeId: "payment",
        values: sampleValuesFor("payment"),
      },
      "https://quickkit.tools",
    ).url;
    const rec = recognize(paymentLink);
    expect(rec.label).toBe("Data Template · Payment / UPI");
    expect(rec.summary).toContain("Aurora Café");
    expect(rec.fields.some((f) => f.value === "auroracafe@upi")).toBe(true);

    const redirect = resolveRedirectTarget(paymentLink, rec);
    expect(redirect).not.toBeNull();
    expect(redirect?.href).toBe(paymentLink);
    expect(redirect?.actionLabel).toBe("Open Data Template");
    expect(redirect?.blocked).toBe(false);
  });
});
