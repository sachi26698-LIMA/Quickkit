import { describe, expect, it } from "vitest";
import {
  QR_CONTENT_TYPES,
  buildPayload,
  contentTypeDef,
  defaultValuesFor,
  escapeWifi,
  foldLine,
  isKnownContentType,
  redactForDisplay,
  sensitiveKeysFor,
} from "@/lib/tools/qr/payload";
import { QrUserError } from "@/lib/tools/qr/types";
import { renderQr } from "@/lib/tools/qr/render";

/** Realistic input per type — the exact payload a scanner must read back. */
const CASES: Record<
  string,
  { values: Record<string, string | boolean>; payload: string }
> = {
  url: {
    values: { url: "example.com/a?b=1&c=2#frag" },
    payload: "https://example.com/a?b=1&c=2#frag",
  },
  text: {
    values: { text: "Line one\nLine two \u{1F600}" },
    payload: "Line one\nLine two \u{1F600}",
  },
  email: {
    values: {
      to: "a@b.com",
      cc: "c@d.com",
      subject: "Hi & bye",
      body: "Line1\nLine2",
    },
    payload:
      "mailto:a@b.com?cc=c%40d.com&subject=Hi%20%26%20bye&body=Line1%0ALine2",
  },
  phone: {
    values: { phone: "+91 (722) 999-1234" },
    payload: "tel:+917229991234",
  },
  sms: {
    values: { phone: "07700 900123", message: "Running 5 mins late" },
    payload: "SMSTO:07700900123:Running 5 mins late",
  },
  whatsapp: {
    values: { phone: "+91 98765 43210", message: "Hello, is this available?" },
    payload:
      "https://wa.me/919876543210?text=Hello%2C%20is%20this%20available%3F",
  },
  wifi: {
    values: {
      ssid: "Café;Wi:Fi\\net",
      password: "p@ss;w:ord",
      encryption: "WPA",
      hidden: true,
    },
    payload: "WIFI:T:WPA;S:Café\\;Wi\\:Fi\\\\net;P:p@ss\\;w\\:ord;H:true;;",
  },
  vcard: {
    values: {
      firstName: "Ada",
      lastName: "Lovelace",
      org: "Analytical Engines, Ltd.",
      title: "Chief Note-keeper",
      mobile: "+44 7700 900123",
      email: "ada@example.com",
      website: "example.com/ada",
      street: "12 Key St",
      city: "London",
      postal: "N1 9AA",
      country: "GB",
      note: "Doors of perception",
    },
    payload:
      "BEGIN:VCARD\r\nVERSION:3.0\r\nN:Lovelace;Ada;;;\r\nFN:Ada Lovelace\r\n" +
      "ORG:Analytical Engines\\, Ltd.\r\nTITLE:Chief Note-keeper\r\n" +
      "TEL;TYPE=CELL,VOICE:+447700900123\r\nEMAIL;TYPE=INTERNET:ada@example.com\r\n" +
      "URL:https://example.com/ada\r\nADR;TYPE=WORK:;;12 Key St;London;;N1 9AA;GB\r\n" +
      "NOTE:Doors of perception\r\nEND:VCARD",
  },
  location: {
    values: {
      latitude: "51.5007",
      longitude: "-0.1246",
      format: "geo",
      label: "Big Ben",
      zoom: "17",
    },
    payload: "geo:51.5007,-0.1246?q=Big%20Ben%4051.5007%2C-0.1246",
  },
  app: {
    values: { store: "android", packageName: "com.example.app" },
    payload: "https://play.google.com/store/apps/details?id=com.example.app",
  },
  instagram: {
    values: { username: "@quickkit.tools" },
    payload: "https://www.instagram.com/quickkit.tools/",
  },
  facebook: {
    values: { page: "quickkit.tools" },
    payload: "https://www.facebook.com/quickkit.tools",
  },
  youtube: {
    values: { channel: "@quickkit" },
    payload: "https://www.youtube.com/@quickkit",
  },
  spotify: {
    values: { url: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M" },
    payload: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
  },
  gmaps: {
    values: { mode: "place", place: "Gateway of India, Mumbai" },
    payload:
      "https://www.google.com/maps/search/?api=1&query=Gateway%20of%20India%2C%20Mumbai",
  },
  greview: {
    values: { placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4" },
    payload:
      "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4",
  },
  business: {
    values: { company: "Aurora Cafe", website: "auroracafe.example.com" },
    payload:
      "BEGIN:VCARD\r\nVERSION:3.0\r\nN:Aurora Cafe;;;;\r\nFN:Aurora Cafe\r\n" +
      "ORG:Aurora Cafe\r\nURL:https://auroracafe.example.com/\r\nEND:VCARD",
  },
  product: {
    values: { url: "https://store.example.com/product/123" },
    payload: "https://store.example.com/product/123",
  },
  booking: {
    values: { url: "https://calendly.com/quickkit/consult" },
    payload: "https://calendly.com/quickkit/consult",
  },
  ticket: {
    values: { url: "https://tickets.example.com/event/launch" },
    payload: "https://tickets.example.com/event/launch",
  },
  document: {
    values: { url: "https://example.com/menu.pdf" },
    payload: "https://example.com/menu.pdf",
  },
  gallery: {
    values: { url: "https://photos.example.com/album" },
    payload: "https://photos.example.com/album",
  },
  video: {
    values: { url: "https://youtu.be/dQw4w9WgXcQ" },
    payload: "https://youtu.be/dQw4w9WgXcQ",
  },
  socials: {
    values: { url: "https://linktr.ee/quickkit" },
    payload: "https://linktr.ee/quickkit",
  },
  landing: {
    values: { url: "https://quickkit.tools/links" },
    payload: "https://quickkit.tools/links",
  },
};

describe("payload builders — one case per content type", () => {
  for (const [id, testCase] of Object.entries(CASES))
    it(`${id} produces the standard payload`, () =>
      expect(buildPayload(id as never, testCase.values)).toBe(
        testCase.payload,
      ));

  it("covers every content type in the tool", () => {
    expect(Object.keys(CASES).sort()).toEqual(
      QR_CONTENT_TYPES.map((type) => type.id)
        .filter((id) => !["social", "event"].includes(id))
        .sort(),
    );
  });

  it("builds a calendar event with padded, half-open day ranges", () => {
    const allDay = buildPayload("event", {
      title: "One day",
      allDay: true,
      date: "2026-01-09",
      timezone: "local",
    });
    expect(allDay).toContain("DTSTART;VALUE=DATE:20260109");
    // DTEND is exclusive, so a single day ends on the next calendar day.
    expect(allDay).toContain("DTEND;VALUE=DATE:20260110");
    const timed = buildPayload("event", {
      title: "Standup",
      allDay: false,
      startDate: "2026-01-09T09:05",
      endDate: "2026-01-09T09:20",
      timezone: "utc",
    });
    expect(timed).toContain("DTSTART:20260109T090500Z");
    expect(timed).toContain("DTEND:20260109T092000Z");
    expect(() =>
      buildPayload("event", { title: "x", allDay: true, date: "2026-02-30" }),
    ).toThrow(/real date/);
  });

  it("turns pasted profile paths into canonical URLs", () => {
    expect(
      buildPayload("social", { platform: "linkedin", username: "in/adasw" }),
    ).toBe("https://www.linkedin.com/in/adasw/");
    expect(
      buildPayload("social", {
        platform: "linkedinCompany",
        username: "company/analytical-engines-llc",
      }),
    ).toBe("https://www.linkedin.com/company/analytical-engines-llc/");
    expect(
      buildPayload("social", {
        platform: "facebook",
        username: "pages/London/12345",
      }),
    ).toBe("https://www.facebook.com/12345");
    expect(
      buildPayload("social", { platform: "instagram", username: "@adasw/" }),
    ).toBe("https://www.instagram.com/adasw/");
    expect(
      buildPayload("social", { platform: "youtube", username: "@quickkit" }),
    ).toBe("https://www.youtube.com/@quickkit");
    expect(
      buildPayload("social", {
        platform: "custom",
        username: "https://bandcamp.com/quickkit",
      }),
    ).toBe("https://bandcamp.com/quickkit");
    // A bare host would be ambiguous for "any other profile", so it is refused.
    expect(() =>
      buildPayload("social", {
        platform: "custom",
        username: "bandcamp.com/quickkit",
      }),
    ).toThrow(/full https/);
    expect(() =>
      buildPayload("social", { platform: "telegram", username: "ab" }),
    ).toThrow(/at least 5/);
  });

  it("supports each app store and rejects nonsense ids", () => {
    expect(buildPayload("app", { store: "ios", appId: "1234567890" })).toBe(
      "https://apps.apple.com/app/id1234567890",
    );
    expect(
      buildPayload("app", { store: "amazon", packageName: "com.example.app" }),
    ).toBe("amzn://apps/android?p=com.example.app");
    expect(() =>
      buildPayload("app", { store: "ios", appId: "not-a-number" }),
    ).toThrow();
    expect(() =>
      buildPayload("app", { store: "android", packageName: "has space" }),
    ).toThrow();
  });
});

describe("payload validation and escaping", () => {
  it("escapes every Wi-Fi metacharacter and nothing else", () => {
    expect(escapeWifi('a;b:c,d"e\\f')).toBe('a\\;b\\:c\\,d\\"e\\\\f');
    expect(escapeWifi("plain")).toBe("plain");
  });

  it("folds long vCard lines at 75 octets with a leading space", () => {
    const folded = foldLine(`NOTE:${"x".repeat(200)}`);
    for (const line of folded.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
      expect(line.startsWith(" ")).toBe(folded.split("\r\n").indexOf(line) > 0);
    }
    expect(folded.replace(/\r\n /g, "")).toBe(`NOTE:${"x".repeat(200)}`);
  });

  it("rejects an empty or malformed value with the field it belongs to", () => {
    expect(() => buildPayload("url", { url: "   " })).toThrow(/required/i);
    expect(() => buildPayload("url", { url: "ftp://example.com" })).toThrow(
      /http/i,
    );
    expect(() => buildPayload("email", { to: "nope" })).toThrow(/email/i);
    expect(() => buildPayload("phone", { phone: "abc" })).toThrow();
    expect(() =>
      buildPayload("location", { latitude: "95", longitude: "0" }),
    ).toThrow(/latitude/i);
    expect(() =>
      buildPayload("wifi", { ssid: "net", password: "x".repeat(121) }),
    ).toThrow(/120 characters/);
    try {
      buildPayload("email", { to: "nope" });
    } catch (error) {
      expect(error).toBeInstanceOf(QrUserError);
      expect((error as QrUserError).field).toBe("to");
    }
  });

  it("refuses a password-free secured network instead of encoding a dud", () => {
    expect(() =>
      buildPayload("wifi", { ssid: "net", password: "", encryption: "WPA" }),
    ).toThrow(/Open network/);
    expect(
      buildPayload("wifi", { ssid: "net", password: "", encryption: "nopass" }),
    ).toBe("WIFI:T:nopass;S:net;P:;;");
  });

  it("dots out the Wi-Fi password for display, even when it is escaped", () => {
    const values = {
      ssid: "Studio",
      password: "p@ss;w:ord",
      encryption: "WPA",
    };
    const payload = buildPayload("wifi", values);
    const shown = redactForDisplay(payload, "wifi", values);
    expect(payload).toContain("p@ss\\;w\\:ord");
    expect(shown).not.toContain("p@ss");
    expect(shown).toContain("WIFI:T:WPA;S:Studio;P:");
    expect(shown).toContain(";;");
    // An SSID that itself looks like a tag must not confuse the masking.
    const tricky = buildPayload("wifi", {
      ssid: "P:notsecret",
      password: "hunter2",
      encryption: "WPA",
    });
    const maskedTricky = redactForDisplay(tricky, "wifi", {
      ssid: "P:notsecret",
      password: "hunter2",
      encryption: "WPA",
    });
    // The escaped SSID survives, the password does not.
    expect(maskedTricky).toContain("S:P\\:notsecret;P:\u2022");
    expect(maskedTricky).not.toContain("hunter2");
    expect(sensitiveKeysFor("wifi")).toEqual(["password"]);
  });
});

describe("content type registry", () => {
  it("has twenty-seven types, each with fields and a builder", () => {
    expect(QR_CONTENT_TYPES).toHaveLength(27);
    for (const type of QR_CONTENT_TYPES) {
      expect(type.fields.length).toBeGreaterThan(0);
      expect(typeof type.build).toBe("function");
      expect(type.blurb.length).toBeGreaterThan(8);
      expect(isKnownContentType(type.id)).toBe(true);
      // Every declared field must be reachable by the builder's defaults.
      for (const field of type.fields)
        expect(defaultValuesFor(type.id)[field.key]).not.toBeUndefined();
      expect(contentTypeDef(type.id).label).toBe(type.label);
    }
    expect(isKnownContentType("bitcoin-address")).toBe(false);
  });
});

describe("every content type renders and decodes", () => {
  for (const type of QR_CONTENT_TYPES) {
    const sample =
      CASES[type.id]?.values ??
      // Types without a fixed case above still get their defaults filled in.
      Object.fromEntries(
        type.fields.map((field) => {
          if (field.key === "username") return [field.key, "quickkitdemo"];
          if (field.key === "title") return [field.key, "Demo"];
          if (field.key === "startDate") return [field.key, "2026-03-05T10:00"];
          if (field.key === "date") return [field.key, "2026-03-05"];
          if (field.key === "appId") return [field.key, "123456789"];
          if (field.key === "packageName")
            return [field.key, "com.example.app"];
          if (field.key === "firstName") return [field.key, "Ada"];
          if (field.key === "phone") return [field.key, "+15551234567"];
          if (field.key === "to") return [field.key, "ada@example.com"];
          if (field.key === "url") return [field.key, "example.com"];
          if (field.key === "text") return [field.key, "Demo payload"];
          if (field.key === "latitude") return [field.key, "51.5"];
          if (field.key === "longitude") return [field.key, "-0.12"];
          if (field.key === "ssid") return [field.key, "DemoNet"];
          if (field.key === "password") return [field.key, "demo-password"];
          return [
            field.key,
            field.type === "checkbox" ? (field.defaultValue ?? false) : "",
          ];
        }),
      );
    let payload: string;
    try {
      payload = buildPayload(type.id, sample);
    } catch {
      payload = buildPayload(type.id, {
        ...defaultValuesFor(type.id),
        ...sample,
      });
    }
    it(`${type.id}: the rendered PNG decodes back to the payload`, async () => {
      const output = await renderQr({
        payload,
        design: { size: 256, margin: 4 },
        artifacts: { png: true },
        verify: true,
      });
      expect(output.verification?.ok).toBe(true);
      expect(output.verification?.decoded).toBe(payload);
    }, 30_000);
  }
});

describe("V3 destination types validate their inputs", () => {
  it("Google Maps builds coordinates, place and pasted-link variants", () => {
    expect(
      buildPayload("gmaps", {
        mode: "coords",
        latitude: "19.076",
        longitude: "72.8777",
      }),
    ).toBe("https://www.google.com/maps/search/?api=1&query=19.076%2C72.8777");
    expect(() =>
      buildPayload("gmaps", {
        mode: "coords",
        latitude: "999",
        longitude: "0",
      }),
    ).toThrow(/Latitude/);
    expect(() =>
      buildPayload("gmaps", {
        mode: "url",
        url: "https://evil.example.com/maps",
      }),
    ).toThrow(/Google Maps link/);
    expect(
      buildPayload("gmaps", {
        mode: "url",
        url: "https://maps.app.goo.gl/abc123",
      }),
    ).toBe("https://maps.app.goo.gl/abc123");
  });

  it("Google Review needs a Place ID or a Google review link", () => {
    expect(() => buildPayload("greview", {})).toThrow(/Place ID or paste/);
    expect(() => buildPayload("greview", { placeId: "bad id!" })).toThrow(
      /Place ID/,
    );
    expect(() =>
      buildPayload("greview", { url: "https://evil.example.com/review" }),
    ).toThrow(/Google review link/);
    expect(
      buildPayload("greview", { url: "https://g.page/aurora/review" }),
    ).toBe("https://g.page/aurora/review");
  });

  it("Spotify accepts music links and rejects non-content Spotify paths", () => {
    expect(
      buildPayload("spotify", { url: "https://open.spotify.com/track/abc" }),
    ).toBe("https://open.spotify.com/track/abc");
    expect(() =>
      buildPayload("spotify", { url: "https://open.spotify.com/search/abc" }),
    ).toThrow(/track, album, playlist/);
    // A non-Spotify https music page is allowed through.
    expect(
      buildPayload("spotify", { url: "https://music.example.com/album/1" }),
    ).toBe("https://music.example.com/album/1");
  });

  it("Instagram, Facebook and YouTube normalize handles and URLs", () => {
    expect(buildPayload("instagram", { username: "@ada" })).toBe(
      "https://www.instagram.com/ada/",
    );
    expect(
      buildPayload("facebook", { page: "https://www.facebook.com/ada" }),
    ).toBe("https://www.facebook.com/ada");
    expect(
      buildPayload("youtube", { channel: "UC1234567890123456789012" }),
    ).toBe("https://www.youtube.com/channel/UC1234567890123456789012");
  });

  it("Business card requires a name and website and escapes vCard text", () => {
    expect(() => buildPayload("business", { website: "x.com" })).toThrow(
      /Business name/,
    );
    expect(() => buildPayload("business", { company: "X" })).toThrow(/Website/);
    const card = buildPayload("business", {
      company: "Café, Aurora",
      website: "aurora.example.com",
      phone: "+91 98765 43210",
      email: "hi@aurora.example.com",
    });
    expect(card).toContain("ORG:Café\\, Aurora");
    expect(card).toContain("TEL;TYPE=WORK,VOICE:+919876543210");
    expect(card).toContain("EMAIL;TYPE=WORK:hi@aurora.example.com");
    expect(card.startsWith("BEGIN:VCARD")).toBe(true);
    expect(card.endsWith("END:VCARD")).toBe(true);
  });

  it("destination-link types refuse dangerous schemes", () => {
    for (const id of [
      "product",
      "booking",
      "ticket",
      "document",
      "gallery",
      "video",
      "socials",
      "landing",
    ] as const) {
      expect(() => buildPayload(id, { url: "javascript:alert(1)" })).toThrow();
      expect(buildPayload(id, { url: "example.com/page" })).toBe(
        "https://example.com/page",
      );
    }
  });
});
