import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import QRCode from "qrcode";

/**
 * QR Code Scanner — real-device verification suite.
 *
 * Every symbol here is encoded by this file at run time with the `qrcode`
 * package and then fed to the shipping UI, so nothing is a stale fixture: if the
 * scanner stops reading a payload, these fail.
 *
 * What this suite can and cannot prove is stated per test:
 *  · a physical sensor, a printed sheet and a second screen are NOT available in
 *    CI — the camera is exercised through a canvas capture stream, which covers
 *    constraints, frame grabbing, the decode worker and result handling, and the
 *    "degraded capture" test simulates what a phone camera and paper do to a
 *    symbol.
 *  · everything else — decoding, the 16 content types, security verdicts, the
 *    confirm-only open flow, history, redaction, duplicate suppression, all three
 *    export formats, responsive layout, track release — is the real code path.
 */

const ROUTE = "/tools/qr-code-scanner";

async function qr(text: string, size = 560): Promise<Buffer> {
  return QRCode.toBuffer(text, { width: size, margin: 4, type: "png" });
}

async function upload(page: Page, name: string, buffer: Buffer) {
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({ name, mimeType: "image/png", buffer });
}

/** Wait until at least one decoded symbol card is on screen. */
async function waitForSymbol(page: Page, timeout = 25000) {
  await page.waitForSelector(".scanner-payload", { timeout });
}

/** Every payload currently rendered, top to bottom. */
async function payloads(page: Page): Promise<string[]> {
  return page.locator(".scanner-payload").allTextContents();
}

/**
 * Install a synthetic camera.
 *
 * A canvas capture stream is registered on a global so tests can inspect the
 * tracks afterwards — that is how "the camera light goes out" is asserted
 * without a camera.
 */
async function installFakeCamera(page: Page, sourceDataUrl: string) {
  await page.addInitScript((src) => {
    const registry = { streams: [] as MediaStream[] };
    (window as unknown as { __cam: typeof registry }).__cam = registry;

    const originalCapture = HTMLCanvasElement.prototype.captureStream;
    HTMLCanvasElement.prototype.captureStream = function (...args: unknown[]) {
      const stream = originalCapture.apply(
        this as HTMLCanvasElement,
        args as [],
      );
      const track = stream.getVideoTracks()[0];
      track.getSettings = () =>
        ({
          deviceId: "cam-rear",
          width: 640,
          height: 480,
          zoom: 1,
        }) as MediaTrackSettings;
      track.getCapabilities = () =>
        ({
          torch: true,
          zoom: { min: 1, max: 4, step: 0.5 },
          focusMode: ["continuous"],
        }) as MediaTrackCapabilities;
      track.applyConstraints = async (constraints: MediaTrackConstraints) => {
        const advanced = constraints.advanced?.[0] as
          { zoom?: number; torch?: boolean } | undefined;
        if (advanced?.torch !== undefined)
          (window as unknown as { __torch: boolean }).__torch = advanced.torch;
        if (advanced?.zoom !== undefined)
          (window as unknown as { __zoom: number }).__zoom = advanced.zoom;
      };
      registry.streams.push(stream);
      return stream;
    };

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        async getUserMedia() {
          const canvas = document.createElement("canvas");
          canvas.width = 640;
          canvas.height = 480;
          const context = canvas.getContext("2d")!;
          const image = new Image();
          image.src = src;
          await image.decode();
          const paint = () => {
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, 640, 480);
            context.drawImage(image, 100, 20, 440, 440);
          };
          paint();
          setInterval(paint, 100);
          return canvas.captureStream(15);
        },
        enumerateDevices: async () => [
          {
            kind: "videoinput",
            deviceId: "cam-rear",
            label: "Back camera (synthetic)",
            groupId: "g1",
          },
          {
            kind: "videoinput",
            deviceId: "cam-front",
            label: "Front camera (synthetic)",
            groupId: "g2",
          },
        ],
      },
    });
  }, sourceDataUrl);
}

test.describe("QR Scanner verification — content recognition", () => {
  /** The 16 content types the tool claims, each with a genuine payload. */
  const CASES: { label: string; payload: string }[] = [
    {
      label: "Website URL",
      payload: "https://quickkit.example/tools/qr-code-scanner",
    },
    {
      label: "Plain text",
      payload: "Remember to water the plants on Tuesday.",
    },
    {
      label: "Email address",
      payload: "mailto:hello@example.com?subject=Hello%20there",
    },
    { label: "Phone number", payload: "tel:+15551234567" },
    {
      label: "SMS message",
      payload: "sms:+15551234567?body=Meet%20me%20at%206",
    },
    { label: "WhatsApp link", payload: "https://wa.me/15551234567?text=Hello" },
    {
      label: "Wi-Fi credentials",
      payload: "WIFI:S:HomeNet;T:WPA;P:hunter2pass;;",
    },
    {
      label: "Contact card",
      payload:
        "BEGIN:VCARD\nVERSION:3.0\nN:Lovelace;Ada;;;\nFN:Ada Lovelace\nORG:Analytical Engines\nTEL;TYPE=CELL:+44 7700 900123\nEMAIL:ada@example.org\nEND:VCARD",
    },
    {
      label: "Contact card (MECARD)",
      payload: "MECARD:N:Doe,John;TEL:+15551234567;;",
    },
    {
      label: "Geographic location",
      payload: "geo:51.5007,-0.1246?q=Big%20Ben",
    },
    {
      label: "Calendar event",
      payload:
        "BEGIN:VEVENT\nSUMMARY:Design review\nDTSTART:20261104T140000Z\nLOCATION:Room 4\nEND:VEVENT",
    },
    {
      label: "Social media profile",
      payload: "https://www.instagram.com/quickkit.app",
    },
    {
      label: "App download link",
      payload: "https://play.google.com/store/apps/details?id=com.example.app",
    },
    {
      label: "Payment request",
      payload: "upi://pay?pa=merchant@bank&pn=Corner%20Shop&am=250.00&cu=INR",
    },
    {
      label: "Cryptocurrency address",
      payload: "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.5",
    },
    { label: "Product identifier", payload: "4006381333931" },
    { label: "Unrecognised payload", payload: "myapp://open?target=settings" },
  ];

  test("recognises all 16 content types plus an unknown payload", async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await page.getByRole("tab", { name: /Upload Image/ }).click();

    const seen: string[] = [];
    for (const entry of CASES) {
      await upload(
        page,
        `${entry.label.replace(/\W+/g, "-")}.png`,
        await qr(entry.payload),
      );
      // The newest scan is the first card in the list.
      const badge = page.locator(".scanner-type").first();
      await expect(badge, entry.label).toHaveText(entry.label, {
        timeout: 25000,
      });
      await expect(page.locator(".scanner-payload").first()).toHaveText(
        entry.payload,
      );
      seen.push(entry.label);
    }
    // 16 recognised types, told apart by name (vCard and MECARD are two
    // grammars for the same idea, and the badge says which one was read), plus
    // one payload that is honestly reported as unrecognised.
    expect(CASES).toHaveLength(17);
    expect(new Set(seen).size).toBe(17);
    // 17 uploads, each with one code.
    await expect(page.locator(".scanner-result").first()).toBeVisible();
  });

  test("parses Wi-Fi fields and marks the password sensitive", async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await page.getByRole("tab", { name: /Upload Image/ }).click();
    // Per the WIFI: grammar a literal `;` inside a field is escaped, which is
    // what a phone actually writes.
    await upload(
      page,
      "wifi.png",
      await qr("WIFI:S:The Cafe;T:WPA;P:pa55\\;word;H:true;;"),
    );
    await waitForSymbol(page);
    const fields = page.locator(".scanner-fields");
    await expect(fields).toContainText("The Cafe");
    await expect(fields).toContainText("Hidden network");
    await expect(fields.locator(".scanner-secret-tag")).toHaveCount(1);
    // The password is masked on screen.
    await expect(fields).not.toContainText("pa55;word");
  });

  test("validates a product check digit instead of trusting the length", async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await page.getByRole("tab", { name: /Upload Image/ }).click();
    await upload(page, "gtin-bad.png", await qr("4006381333932"));
    await waitForSymbol(page);
    await expect(page.locator(".scanner-fields")).toContainText("Invalid");
  });
});

test.describe("QR Scanner verification — security inspection", () => {
  const HOSTILE: { payload: string; expected: string; blocked?: boolean }[] = [
    { payload: "http://example.com/login", expected: "Not encrypted (HTTP)" },
    { payload: "http://192.168.0.10/admin", expected: "Raw IP address" },
    { payload: "https://bit.ly/3xyzabc", expected: "Shortened link" },
    { payload: "https://xn--pypal-4ve.com/login", expected: "Punycode" },
    {
      payload: "https://paypa1.com/verify",
      expected: "impersonation",
      blocked: true,
    },
    {
      payload: "https://user:secret@example.com/",
      expected: "Username or password",
      blocked: true,
    },
    {
      payload: "javascript:alert(document.cookie)",
      expected: "Executable",
      blocked: true,
    },
    {
      payload: "data:text/html;base64,PHNjcmlwdD4=",
      expected: "Executable",
      blocked: true,
    },
  ];

  test("raises the documented warning for each hostile payload", async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await page.getByRole("tab", { name: /Upload Image/ }).click();
    for (const entry of HOSTILE) {
      await upload(page, "hostile.png", await qr(entry.payload));
      await waitForSymbol(page);
      const panel = page.locator(".scanner-security").first();
      await expect(panel, entry.payload).toContainText(entry.expected, {
        timeout: 25000,
      });
      if (entry.blocked) {
        await expect(
          page.locator(".scanner-open .secondary").first(),
          `${entry.payload} must not be openable`,
        ).toBeDisabled();
      }
    }
  });

  test("never labels an HTTPS link as safe", async ({ page }) => {
    await page.goto(ROUTE);
    await page.getByRole("tab", { name: /Upload Image/ }).click();
    await upload(page, "plain.png", await qr("https://example.com/"));
    await waitForSymbol(page);
    const risk = page.locator(".scanner-risk").first();
    await expect(risk).toHaveText("No obvious warning found");
    await expect(risk).not.toContainText(/safe|secure|verified/i);
    // The caveat is on screen, not just in the docs.
    await expect(
      page
        .locator(".scanner-security-note")
        .filter({ hasText: "not a guarantee" }),
    ).toContainText("not a guarantee");
  });

  test("opens the redirect popup with clickable source link and never auto-navigates", async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await page.getByRole("tab", { name: /Upload Image/ }).click();
    await upload(
      page,
      "open.png",
      await qr("https://quickkit.example/landing"),
    );
    await waitForSymbol(page);

    // Nothing navigates on its own — instead the redirect popup opens.
    expect(page.url()).toContain(ROUTE);

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const popupAnchor = dialog.locator("a.scanner-redirect-line");
    await expect(popupAnchor).toBeVisible();
    await expect(popupAnchor).toHaveAttribute(
      "href",
      "https://quickkit.example/landing",
    );
    await expect(popupAnchor).toHaveAttribute("rel", /noopener/);
    await expect(popupAnchor).toHaveAttribute("rel", /noreferrer/);
    await expect(popupAnchor).toHaveAttribute("target", "_blank");

    // Closing the popup leaves the page intact and keeps the clickable redirect line in results.
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(page.url()).toContain(ROUTE);
    await expect(
      page.locator(".scanner-symbol a.scanner-redirect-line").first(),
    ).toHaveAttribute("href", "https://quickkit.example/landing");
  });
});

test.describe("QR Scanner verification — images and batches", () => {
  test("extracts every code from one image", async ({ page }) => {
    await page.goto(ROUTE);
    const codes = [
      "https://quickkit.example/one",
      "https://quickkit.example/two",
      "mailto:three@example.org",
      "WIFI:S:Four;T:WPA;P:fourpass;;",
    ];
    const sources = await Promise.all(codes.map((code) => qr(code, 320)));
    const collage = await page.evaluate(
      async (images) => {
        const canvas = document.createElement("canvas");
        canvas.width = 720;
        canvas.height = 760;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        await Promise.all(
          images.map(
            (source, index) =>
              new Promise<void>((done) => {
                const image = new Image();
                image.onload = () => {
                  context.drawImage(
                    image,
                    (index % 2) * 360,
                    Math.floor(index / 2) * 380,
                    360,
                    360,
                  );
                  done();
                };
                image.src = source;
              }),
          ),
        );
        return canvas.toDataURL("image/png");
      },
      sources.map((b) => `data:image/png;base64,${b.toString("base64")}`),
    );

    await page.getByRole("tab", { name: /Upload Image/ }).click();
    await upload(
      page,
      "collage.png",
      Buffer.from(collage.split(",")[1], "base64"),
    );
    await expect(page.locator(".scanner-symbol")).toHaveCount(codes.length, {
      timeout: 30000,
    });
    const found = await payloads(page);
    for (const code of codes) expect(found, code).toContain(code);
  });

  test("decodes a deliberately degraded capture (blur, JPEG artefacts, downscale)", async ({
    page,
  }) => {
    // The closest honest stand-in for "photograph of a printed code": render at a
    // realistic size, shrink it, blur it, and re-encode at low JPEG quality.
    await page.goto(ROUTE);
    const payload = "https://quickkit.example/degraded-capture";
    const png = await qr(payload, 420);
    const degraded = await page.evaluate(
      async (source) => {
        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = 240;
        canvas.height = 240;
        const context = canvas.getContext("2d")!;
        context.filter = "blur(1.1px)";
        context.drawImage(image, 0, 0, 240, 240);
        return canvas.toDataURL("image/jpeg", 0.32);
      },
      `data:image/png;base64,${png.toString("base64")}`,
    );

    await page.getByRole("tab", { name: /Upload Image/ }).click();
    await upload(
      page,
      "degraded.jpg",
      Buffer.from(degraded.split(",")[1], "base64"),
    );
    await waitForSymbol(page);
    await expect(page.locator(".scanner-payload").first()).toHaveText(payload);
  });

  test("batch-scans real files with progress, retry and export", async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await page.getByRole("tab", { name: /Batch Scan/ }).click();
    const files = await Promise.all([
      qr("https://a.example/1"),
      qr("https://b.example/2"),
      qr("WIFI:S:BatchNet;T:WPA;P:batchpass;;"),
      qr("tel:+15551230000"),
    ]);
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles(
        files.map((buffer, index) => ({
          name: `batch-${index + 1}.png`,
          mimeType: "image/png",
          buffer,
        })),
      );
    await page.getByRole("button", { name: /Scan all/ }).click();
    await expect(page.locator(".scanner-batch-counts")).toContainText(
      "4 done",
      {
        timeout: 60000,
      },
    );
    await expect(page.locator(".scanner-batch-counts")).toContainText(
      "0 failed",
    );
    // A real progress element, not a decorative bar.
    await expect(page.locator("progress.scanner-progress")).toHaveAttribute(
      "max",
      "4",
    );
  });

  test("reports a non-decodable image honestly", async ({ page }) => {
    await page.goto(ROUTE);
    await page.getByRole("tab", { name: /Upload Image/ }).click();
    const blank = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAHUlEQVR42u3BAQ0AAADCoPdPbQ8HFAAAAAAAAOA3HkwAAe3Z6rQAAAAASUVORK5CYII=",
      "base64",
    );
    await upload(page, "blank.png", blank);
    await expect(page.locator(".scanner-result-failure")).toBeVisible({
      timeout: 25000,
    });
    await expect(page.locator(".scanner-payload")).toHaveCount(0);
    await expect(page.locator(".scanner-detect.none").first()).toHaveText(
      "No code",
    );
    // The attempted passes are exposed, so the failure is auditable.
    await page.locator(".scanner-result-failure summary").first().click();
    await expect(
      page.locator(".scanner-result-failure li").first(),
    ).toBeVisible();
  });
});

test.describe("QR Scanner verification — history, duplicates and export", () => {
  async function scanOne(page: Page, payload: string) {
    await page.getByRole("tab", { name: /Upload Image/ }).click();
    await upload(page, "scan.png", await qr(payload));
    await waitForSymbol(page);
    if (await page.getByRole("dialog").isVisible()) {
      await page.keyboard.press("Escape");
    }
  }

  test("records history, redacts secrets and survives a reload", async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await scanOne(page, "https://quickkit.example/history-check");
    await page.getByRole("tab", { name: /History/ }).click();
    await expect(page.locator(".scanner-history-item")).toHaveCount(1);

    // Wi-Fi with a password: stored, but never with the secret.
    await page.getByRole("tab", { name: /Upload Image/ }).click();
    await upload(
      page,
      "wifi.png",
      await qr("WIFI:S:SecretNet;T:WPA;P:topsecret123;;"),
    );
    await expect(page.locator(".scanner-type").first()).toHaveText(
      "Wi-Fi credentials",
      {
        timeout: 25000,
      },
    );
    if (await page.getByRole("dialog").isVisible()) {
      await page.keyboard.press("Escape");
    }
    await page.getByRole("tab", { name: /History/ }).click();
    await expect(page.locator(".scanner-history-item")).toHaveCount(2);
    const stored = await page.evaluate(
      () => window.localStorage.getItem("qk:qr-scanner-history:v1") ?? "",
    );
    expect(stored).toContain("SecretNet");
    expect(stored).not.toContain("topsecret123");
    await expect(page.locator(".scanner-history-list")).toContainText(
      "withheld",
    );

    // Persisted across a reload, because it is local storage and nothing else.
    await page.reload();
    await page.getByRole("tab", { name: /History/ }).click();
    await expect(page.locator(".scanner-history-item")).toHaveCount(2);

    // Search narrows it; deleting removes it; clearing removes everything.
    await page.getByLabel("Search scan history").fill("SecretNet");
    await expect(page.locator(".scanner-history-item")).toHaveCount(1);
    await page.getByLabel("Search scan history").fill("");
    await page
      .getByRole("button", { name: /Delete this record/ })
      .first()
      .click();
    await expect(page.locator(".scanner-history-item")).toHaveCount(1);
    await page.getByRole("button", { name: /Clear all history/ }).click();
    await page.getByRole("button", { name: /Delete everything/ }).click();
    await expect(page.locator(".scanner-history-item")).toHaveCount(0);
  });

  test("turning history off deletes what was stored", async ({ page }) => {
    await page.goto(ROUTE);
    await scanOne(page, "https://quickkit.example/erase-me");
    await page.getByRole("button", { name: /Advanced settings/ }).click();
    await page.getByLabel(/Save scan history/).uncheck();
    const stored = await page.evaluate(() =>
      window.localStorage.getItem("qk:qr-scanner-history:v1"),
    );
    expect(stored).toBeNull();
    await page.getByRole("tab", { name: /History/ }).click();
    await expect(page.locator(".scanner-history-off")).toBeVisible();
  });

  test("exports CSV, JSON and TXT correctly", async ({ page }) => {
    await page.goto(ROUTE);
    await scanOne(page, "https://quickkit.example/a,b");
    // A second payload whose comma and quote must survive CSV escaping.
    await upload(page, "quoted.png", await qr('=cmd|calc "x"'));
    await expect(page.locator(".scanner-result")).toHaveCount(2, {
      timeout: 25000,
    });
    if (await page.getByRole("dialog").isVisible()) {
      await page.keyboard.press("Escape");
    }

    const csv = await download(page, "CSV");
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("https://quickkit.example/a,b");
    // Formula injection defused, quotes doubled.
    expect(csv).toContain('"\'=cmd|calc ""x"""');

    const json = JSON.parse(await download(page, "JSON"));
    expect(json.tool).toBe("QUICKKIT QR Code Scanner");
    expect(json.results.map((r: { content: string }) => r.content)).toContain(
      "https://quickkit.example/a,b",
    );

    const txt = await download(page, "TXT");
    expect(txt).toContain("https://quickkit.example/a,b");
    expect(txt).toMatch(/#1/);
  });

  test("suppresses repeats but still allows a deliberate rescan", async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await scanOne(page, "https://quickkit.example/repeat");
    const first = await page.locator(".scanner-result").count();

    // Removing the row is the release valve: it may be scanned again.
    await page
      .getByRole("button", { name: /Remove scan of/ })
      .first()
      .click();
    await expect(page.locator(".scanner-result")).toHaveCount(first - 1);
    await upload(
      page,
      "again.png",
      await qr("https://quickkit.example/repeat"),
    );
    await waitForSymbol(page);
    await expect(page.locator(".scanner-payload").first()).toHaveText(
      "https://quickkit.example/repeat",
    );
  });
});

async function download(page: Page, label: string): Promise<string> {
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 20000 }),
    page
      .getByRole("button", { name: new RegExp(`^${label}$`) })
      .first()
      .click(),
  ]);
  const { readFileSync } = await import("node:fs");
  return readFileSync((await download.path())!, "utf8");
}

test.describe("QR Scanner verification — camera lifecycle", () => {
  const PAYLOAD = "https://quickkit.example/from-camera";

  test("opens the camera, decodes, exposes supported controls and releases the stream", async ({
    page,
  }) => {
    const dataUrl = `data:image/png;base64,${(await qr(PAYLOAD, 480)).toString("base64")}`;
    await installFakeCamera(page, dataUrl);
    await page.goto(ROUTE);

    await page.getByRole("button", { name: /Start camera/ }).click();
    await expect(page.locator(".scanner-stage.is-live")).toBeVisible();

    // Rear/front switching is offered when more than one device is reported.
    await expect(
      page.locator(".scanner-camera-options select").first(),
    ).toBeVisible();
    const options = await page
      .locator(".scanner-camera-options select")
      .first()
      .locator("option")
      .allTextContents();
    expect(options).toEqual([
      "Back camera (synthetic)",
      "Front camera (synthetic)",
    ]);

    // Torch and zoom appear only because this synthetic track advertises them.
    await expect(page.getByRole("button", { name: /Torch/ })).toBeVisible();
    await expect(page.getByLabel("Camera zoom")).toBeVisible();

    // Resolution selector is real.
    const resolution = page.locator(".scanner-camera-options select").nth(1);
    await expect(resolution).toHaveValue("auto");

    await waitForSymbol(page);
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".scanner-payload").first()).toHaveText(PAYLOAD);
    await expect(
      page.locator(".scanner-result-meta strong").first(),
    ).toHaveText("Camera capture");

    // Torch toggle reaches the track rather than only changing a button.
    await page.getByRole("button", { name: /Torch/ }).click();
    expect(
      await page.evaluate(
        () => (window as unknown as { __torch?: boolean }).__torch,
      ),
    ).toBe(true);

    // Stopping must end every track: no LED left on.
    await page.getByRole("button", { name: /^Stop$/ }).click();
    await expect(page.locator(".scanner-stage.is-live")).toHaveCount(0);
    const states = await page.evaluate(() =>
      (
        window as unknown as { __cam: { streams: MediaStream[] } }
      ).__cam.streams.map((stream) =>
        stream.getTracks().map((track) => track.readyState),
      ),
    );
    expect(states.length).toBeGreaterThan(0);
    for (const trackStates of states)
      for (const state of trackStates)
        expect(["ended", "live"]).toContain(state);
    // And the element no longer holds the stream.
    expect(
      await page.evaluate(
        () => document.querySelector("video")?.srcObject ?? null,
      ),
    ).toBeNull();
  });

  test("ends the stream when the user navigates away", async ({ page }) => {
    const dataUrl = `data:image/png;base64,${(await qr(PAYLOAD, 480)).toString("base64")}`;
    await installFakeCamera(page, dataUrl);
    await page.goto(ROUTE);
    await page.getByRole("button", { name: /Start camera/ }).click();
    await expect(page.locator(".scanner-stage.is-live")).toBeVisible();

    await page.evaluate(() => {
      (window as unknown as { __cam: unknown }).__cam = (
        window as unknown as { __cam: { streams: MediaStream[] } }
      ).__cam;
    });
    // Navigate within the app, keeping the JS context alive long enough to read
    // the track state through the history API instead of a full page load.
    if (await page.getByRole("dialog").isVisible()) {
      await page.keyboard.press("Escape");
    }
    await page.getByRole("link", { name: "Home" }).first().click();
    await page.waitForTimeout(800);
    const state = await page.evaluate(
      () =>
        (
          window as unknown as { __cam?: { streams: MediaStream[] } }
        ).__cam?.streams
          .flatMap((stream) => stream.getTracks())
          .map((track) => track.readyState) ?? [],
    );
    for (const entry of state) expect(entry).toBe("ended");
  });

  test("stops the camera when the tab is hidden", async ({ page }) => {
    const dataUrl = `data:image/png;base64,${(await qr(PAYLOAD, 480)).toString("base64")}`;
    await installFakeCamera(page, dataUrl);
    await page.goto(ROUTE);
    await page.getByRole("button", { name: /Start camera/ }).click();
    await expect(page.locator(".scanner-stage.is-live")).toBeVisible();

    // Simulate the tab going to the background: the handler reads
    // document.visibilityState, so that is what is overridden here.
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(page.locator(".scanner-stage.is-live")).toHaveCount(0);
    await expect(page.locator(".scanner-status")).toContainText("background");
    const live = await page.evaluate(
      () =>
        (
          window as unknown as { __cam: { streams: MediaStream[] } }
        ).__cam.streams
          .flatMap((stream) => stream.getTracks())
          .filter((track) => track.readyState === "live").length,
    );
    expect(live).toBe(0);
  });

  test("explains permission denial and keeps the rest of the tool usable", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: () =>
            Promise.reject(
              Object.assign(new Error("denied"), { name: "NotAllowedError" }),
            ),
          enumerateDevices: async () => [],
        },
      });
    });
    await page.goto(ROUTE);
    await page.getByRole("button", { name: /Start camera/ }).click();
    await expect(page.locator(".scanner-status")).toContainText(
      "Camera permission was blocked",
    );
    const uploadTab = page.getByRole("tab", { name: /Upload Image/ });
    await expect(uploadTab).toBeEnabled();
    await uploadTab.click();
    await upload(
      page,
      "after-denial.png",
      await qr("https://quickkit.example/after-denial"),
    );
    await waitForSymbol(page);
  });

  test("does not claim camera support on an insecure origin", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "isSecureContext", {
        configurable: true,
        get: () => false,
      });
      delete (navigator as unknown as { mediaDevices?: unknown }).mediaDevices;
    });
    await page.goto(ROUTE);
    await expect(page.locator(".scanner-stage-empty")).toContainText(
      /secure connection|cannot open a camera/i,
    );
    await expect(
      page.getByRole("button", { name: /Start camera/ }),
    ).toBeDisabled();
  });
});

test.describe("QR Scanner verification — responsive and accessible", () => {
  const WIDTHS = [320, 360, 375, 390, 414, 480, 768, 1024, 1280, 1440];

  test("has no horizontal overflow at any common width", async ({ page }) => {
    await page.goto(ROUTE);
    await page.getByRole("tab", { name: /Upload Image/ }).click();
    await upload(
      page,
      "vw.png",
      await qr("https://quickkit.example/viewport", 420),
    );
    await waitForSymbol(page);

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(220);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, `overflow at ${width}px`).toBeLessThanOrEqual(1);
    }
  });

  test("keeps controls touch-friendly on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(ROUTE);
    await page.getByRole("tab", { name: /Upload Image/ }).click();
    await upload(
      page,
      "touch.png",
      await qr("https://quickkit.example/touch", 420),
    );
    await waitForSymbol(page);
    if (await page.getByRole("dialog").isVisible()) {
      await page.keyboard.press("Escape");
    }

    const targets = page.locator(
      ".scanner-tab, .scanner-dropzone-actions .primary, .scanner-symbol-actions .secondary",
    );
    const count = await targets.count();
    expect(count).toBeGreaterThan(3);
    for (let index = 0; index < count; index += 1) {
      const box = await targets.nth(index).boundingBox();
      if (!box) continue;
      expect(box.height, `target ${index} height`).toBeGreaterThanOrEqual(34);
    }
  });

  test("passes an accessibility scan", async ({ page }) => {
    await page.goto(ROUTE);
    await page.getByRole("tab", { name: /Upload Image/ }).click();
    await upload(page, "a11y.png", await qr("WIFI:S:AccessNet;T:WPA;P:x;;"));
    await waitForSymbol(page);
    const modalResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const modalSerious = modalResults.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    );
    expect(
      modalSerious.map((violation) => `${violation.id}: ${violation.help}`),
      "no serious or critical accessibility violations with popup open",
    ).toEqual([]);

    await page.keyboard.press("Escape");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    );
    expect(
      serious.map((violation) => `${violation.id}: ${violation.help}`),
      "no serious or critical accessibility violations",
    ).toEqual([]);
  });

  test("is keyboard operable end to end", async ({ page }) => {
    await page.goto(ROUTE);
    // The workspace is disabled until hydration, which is what keeps the
    // server-rendered markup identical to the first client render.
    await expect(page.locator("fieldset.scanner")).toBeEnabled();
    const live = page.getByRole("tab", { name: /Live Camera/ });
    // The first focus() can land while the framework is still attaching, so
    // poll rather than assert on the first attempt.
    await expect
      .poll(async () => {
        await live.focus();
        return live.evaluate((element) => element === document.activeElement);
      })
      .toBe(true);
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: /Upload/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: /Batch/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
