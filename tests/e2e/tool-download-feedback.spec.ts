import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const key = "quickkit-tool-feedback-v1";
const promptKey = "quickkit-tool-feedback-prompted-v1";
const DAY_MS = 24 * 60 * 60 * 1000;

type SentRating = {
  tool: string;
  rating: number;
  tags: string[];
  comment: string;
  consent: boolean;
};

/** Ratings the page sent to QUICKKIT during the current test. */
let sent: SentRating[] = [];

// The rating is stored by a private server route. Answer it here so these
// journeys do not depend on a configured database; individual tests override
// the route to exercise an unreachable server.
test.beforeEach(async ({ page }) => {
  sent = [];
  await page.route("**/api/tool-feedback", async (route) => {
    sent.push(route.request().postDataJSON() as SentRating);
    await route.fulfill({ status: 201, json: { ok: true } });
  });
});

/** Moves every recorded invitation into the past, as if time had gone by. */
async function ageInvitations(page: Page, ms: number) {
  await page.evaluate(
    ({ promptKey, ms }) => {
      const log = JSON.parse(localStorage.getItem(promptKey) ?? "{}");
      for (const slug of Object.keys(log)) log[slug] -= ms;
      localStorage.setItem(promptKey, JSON.stringify(log));
    },
    { promptKey, ms },
  );
}

/** Long enough for the delayed invitation to have appeared if it was going to. */
async function expectNoInvitation(page: Page) {
  await page.waitForTimeout(850);
  await expect(page.locator("dialog[data-feedback-tool][open]")).toHaveCount(0);
}

async function download(
  page: Page,
  kind: "direct" | "programmatic" = "programmatic",
  cancel = false,
) {
  await page
    .locator("dialog[data-feedback-ready=true]")
    .waitFor({ state: "attached" });
  await page.evaluate(
    ({ kind, cancel }) => {
      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(
        new Blob(["download feedback test"], { type: "text/plain" }),
      );
      anchor.download = "quickkit-test.txt";
      if (cancel)
        anchor.addEventListener("click", (event) => event.preventDefault());
      if (kind === "direct") {
        anchor.textContent = "Test direct download";
        // Simulate a nested preview dialog that stops bubbling.
        anchor.addEventListener("click", (event) => event.stopPropagation());
        document.body.append(anchor);
      } else {
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
      }
    },
    { kind, cancel },
  );
  if (kind === "direct")
    await page.getByRole("link", { name: "Test direct download" }).click();
}

for (const width of [320, 390, 1440]) {
  test(`download → stars → optional details → emotion at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/tools/case-converter");
    const modal = page.getByRole("dialog", { name: "How did it feel?" });
    await expect(modal).not.toBeVisible();
    await page.getByLabel("Original text").fill("A little quickkit magic");
    await page.getByRole("button", { name: "UPPERCASE", exact: true }).click();
    await expect(modal).not.toBeVisible();
    const file = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download .txt", exact: true })
      .click();
    expect((await file).suggestedFilename()).toBe(
      "quickkit-converted-text.txt",
    );
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("checkbox")).toHaveCount(0);
    await modal.getByRole("radio", { name: "5 stars — Loved it!" }).check();
    await expect(modal.getByText("What made it great?")).toBeVisible();
    await modal.getByLabel("Easy to use", { exact: true }).check();
    await modal.getByLabel("Anything else?").fill("Really smooth, thank you!");
    const box = await modal.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    const a11y = await new AxeBuilder({ page })
      .include("[data-tool-feedback]")
      .analyze();
    expect(
      a11y.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      ),
    ).toEqual([]);
    await modal.getByRole("button", { name: "Send my feedback" }).click();
    await expect(
      page.getByRole("heading", { name: "You made our day!" }),
    ).toBeVisible();
    // The dialog is now named after its thank-you heading, so look page-wide.
    await expect(
      page.getByText("Your rating was sent to the QUICKKIT team."),
    ).toBeVisible();
    expect(sent).toEqual([
      {
        tool: "case-converter",
        rating: 5,
        tags: ["Easy to use"],
        comment: "Really smooth, thank you!",
        consent: true,
      },
    ]);
    await expect(
      page.locator('[data-mood="love"][data-celebrate="true"]'),
    ).toBeVisible();
    const saved = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      key,
    );
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      tool: "case-converter",
      rating: 5,
      tags: ["Easy to use"],
      comment: "Really smooth, thank you!",
    });
    await page.getByRole("button", { name: "Keep creating" }).click();
    await expect(modal).not.toBeVisible();
    // The same tool does not ask again on the next download…
    await download(page);
    await expectNoInvitation(page);
    await ageInvitations(page, DAY_MS - 60_000);
    await download(page);
    await expectNoInvitation(page);
    // …until 24 hours have passed, when it starts from a clean form.
    await ageInvitations(page, 2 * 60_000);
    await download(page);
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("radio", { checked: true })).toHaveCount(0);
    await expect(modal.getByRole("checkbox")).toHaveCount(0);
    expect(sent).toHaveLength(1);
  });
}

test("direct downloads, keyboard rating and honest low-rating thank-you", async ({
  page,
}) => {
  await page.goto("/tools/word-to-pdf"); // Stand-alone page, not ToolShell.
  await download(page, "direct");
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  const firstStar = modal.getByRole("radio", {
    name: "1 star — Disappointing",
  });
  await firstStar.focus();
  await firstStar.press("Space");
  await firstStar.press("ArrowRight");
  await expect(
    modal.getByRole("radio", { name: "2 stars — Could be better" }),
  ).toBeChecked();
  await expect(modal.getByText("What could be better?")).toBeVisible();
  await modal.getByRole("checkbox", { name: "Result quality" }).check();
  await modal.getByRole("button", { name: "Send my feedback" }).click();
  await expect(
    modal.getByRole("heading", { name: "Your experience matters." }),
  ).toBeVisible();
  expect(sent).toEqual([
    {
      tool: "word-to-pdf",
      rating: 2,
      tags: ["Result quality"],
      comment: "",
      consent: true,
    },
  ]);
  await expect(modal.locator('[data-mood="care"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    "hidden",
  );
});

test("cancelled downloads never prompt or use up the day's invitation; each tool asks once per 24 hours", async ({
  page,
}) => {
  await page.goto("/tools/word-counter");
  await download(page, "programmatic", true);
  await expectNoInvitation(page);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), promptKey),
  ).toBeNull();

  await download(page);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Maybe later" }).click();
  const invited = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    promptKey,
  );
  expect(Object.keys(invited)).toEqual(["word-counter"]);
  expect(Math.abs(Date.now() - invited["word-counter"])).toBeLessThan(60_000);

  // Dismissed without answering: still no second invitation today, in this
  // page or after a reload, however many files are downloaded.
  await download(page);
  await expectNoInvitation(page);
  await page.reload();
  await download(page);
  await download(page);
  await expectNoInvitation(page);
  // Nothing was rated, so nothing was stored or sent.
  expect(
    await page.evaluate((key) => localStorage.getItem(key), key),
  ).toBeNull();
  expect(sent).toEqual([]);

  // A different tool has its own once-a-day invitation.
  await page.goto("/tools/json-formatter");
  await download(page);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Maybe later" }).click();
  await download(page);
  await expectNoInvitation(page);

  // A day later the first tool may ask again.
  await page.goto("/tools/word-counter");
  await ageInvitations(page, DAY_MS + 1_000);
  await download(page);
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("an unreachable server never pretends the rating was sent, and a retry delivers it once", async ({
  page,
}) => {
  let reachable = false;
  await page.route("**/api/tool-feedback", async (route) => {
    if (!reachable) return route.fulfill({ status: 503, json: { ok: false } });
    sent.push(route.request().postDataJSON() as SentRating);
    await route.fulfill({ status: 201, json: { ok: true } });
  });
  await page.goto("/tools/word-counter");
  await download(page);
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  await modal.getByRole("radio", { name: "4 stars — Really good" }).check();
  await modal.getByRole("button", { name: "Send my feedback" }).click();
  await expect(modal.getByRole("alert")).toContainText("couldn’t send");
  await expect(modal.locator("[data-feedback-sent]")).toHaveCount(0);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), key),
  ).toBeNull();
  // The form keeps the visitor's answer so they can simply try again.
  await expect(
    modal.getByRole("radio", { name: "4 stars — Really good" }),
  ).toBeChecked();
  reachable = true;
  await modal.getByRole("button", { name: "Send my feedback" }).click();
  await expect(
    modal.getByText("Your rating was sent to the QUICKKIT team."),
  ).toBeVisible();
  expect(sent).toHaveLength(1);
  expect(sent[0]).toMatchObject({ tool: "word-counter", rating: 4 });
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  expect(saved).toHaveLength(1);
});

test("a delivered rating is confirmed even when browser storage is blocked", async ({
  page,
}) => {
  await page.goto("/tools/word-counter");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Storage blocked");
    };
  });
  await download(page);
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  await modal.getByRole("radio", { name: "3 stars — It was okay" }).check();
  await modal.getByRole("button", { name: "Send my feedback" }).click();
  await expect(
    modal.getByText("Your rating was sent to the QUICKKIT team."),
  ).toBeVisible();
  await expect(modal.getByRole("alert")).toHaveCount(0);
  expect(sent).toHaveLength(1);
  await modal.getByRole("button", { name: "Close feedback" }).click();
  await expect(modal).not.toBeVisible();
  // Without storage the tab still remembers it has already asked.
  await download(page);
  await expectNoInvitation(page);
});

test("reduced motion keeps feedback usable without animated emotion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/tools/word-counter");
  await download(page);
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  expect(
    await modal
      .locator("[data-mood]")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await modal.getByRole("radio", { name: "4 stars — Really good" }).check();
  await modal.getByRole("button", { name: "Send my feedback" }).click();
  await expect(
    modal.getByRole("heading", { name: "You made our day!" }),
  ).toBeVisible();
});

test("pending invitation is cancelled on navigation; modal traps and restores focus", async ({
  page,
}) => {
  await page.goto("/tools/case-converter");
  await download(page);
  await page.goto("/tools");
  await page.waitForTimeout(850);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/tools/case-converter");
  await page.getByLabel("Original text").fill("Focus stays friendly");
  await page.getByRole("button", { name: "UPPERCASE", exact: true }).click();
  const button = page.getByRole("button", {
    name: "Download .txt",
    exact: true,
  });
  await button.focus();
  await button.press("Enter");
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  await expect(
    modal.getByRole("button", { name: "Close feedback" }),
  ).toBeFocused();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    expect(
      // Native dialogs may briefly give focus to browser chrome at wraparound,
      // but never to the inert background page.
      await modal.evaluate(
        (el) =>
          document.activeElement === document.body ||
          el.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(button).toBeFocused();
});

test("every tool uses its own palette on the glass emotion, stars and feedback controls", async ({
  page,
}) => {
  // Long walk: one download + feedback round trip per tool.
  test.setTimeout(420_000);
  const { tools } = await import("../../lib/catalog");
  const { toolTheme } = await import("../../lib/tool-theme");
  // Guard against a truncated catalog; the loop below covers each tool.
  expect(tools.length).toBeGreaterThanOrEqual(49);
  const surfaces = new Set<string>();
  for (const tool of tools) {
    const theme = toolTheme(tool.slug, tool.category);
    await page.goto(`/tools/${tool.slug}`);
    await download(page);
    const modal = page.locator(`dialog[data-feedback-tool="${tool.slug}"]`);
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute(
      "data-feedback-style",
      "laptop-feed-v5",
    );
    const visuals = await modal.evaluate((el) => {
      const css = getComputedStyle(el);
      const face = el.querySelector<HTMLElement>("[data-mood]")!;
      return {
        primary: css.getPropertyValue("--t-rgb").trim(),
        secondary: css.getPropertyValue("--t2-rgb").trim(),
        deep: css.getPropertyValue("--t-deep").trim(),
        surface: getComputedStyle(el.querySelector("[data-tool-feedback]")!)
          .backgroundImage,
        face: getComputedStyle(face).backgroundImage,
        glass: getComputedStyle(face).backdropFilter,
        depth: getComputedStyle(face).boxShadow,
      };
    });
    expect(visuals.primary, tool.slug).toBe(theme.rgb);
    expect(visuals.secondary, tool.slug).toBe(theme.rgb2);
    expect(visuals.deep, tool.slug).toBe(theme.deep);
    expect(visuals.face, tool.slug).toContain(theme.rgb.replaceAll(" ", ", "));
    expect(visuals.glass, tool.slug).toContain("blur(9px)");
    expect(visuals.depth, tool.slug).toContain("inset");
    surfaces.add(visuals.surface);
    await modal.getByRole("radio", { name: "4 stars — Really good" }).check();
    await expect(modal.locator('label[data-active="true"]').first()).toHaveCSS(
      "color",
      `rgb(${theme.rgb.replaceAll(" ", ", ")})`,
    );
    if (
      [
        "split-pdf",
        "bmi-calculator",
        "url-encoder-decoder",
        "time-converter",
      ].includes(tool.slug)
    ) {
      const a11y = await new AxeBuilder({ page })
        .include("[data-tool-feedback]")
        .analyze();
      expect(
        a11y.violations.filter(
          (v) => v.impact === "critical" || v.impact === "serious",
        ),
        tool.slug,
      ).toEqual([]);
    }
    await modal.getByRole("button", { name: "Close feedback" }).click();
  }
  // Every tool's glass surface must be its own, not a shared fallback.
  expect(surfaces.size).toBe(tools.length);
});

test("layered aurora glass reacts differently to every star and celebrates after saving", async ({
  page,
}) => {
  await page.goto("/tools/case-converter");
  await download(page);
  const modal = page.locator("dialog[data-feedback-tool]");
  await expect(modal).toBeVisible();
  const expected = ["sad", "unsure", "okay", "happy", "love"];
  const animations = new Set<string>();
  for (let index = 0; index < 5; index++) {
    await modal.getByRole("radio").nth(index).check();
    await page.mouse.move(1, 1);
    const face = modal.locator("[data-mood]");
    await expect(face).toHaveAttribute("data-reaction", expected[index]);
    const layers = await face.evaluate((el) => {
      const css = getComputedStyle(el);
      return {
        animation: css.animationName,
        layers: [...el.querySelectorAll('[class*="_colourLayer"]')].map(
          (layer) => getComputedStyle(layer).backgroundImage,
        ),
        glass: css.backdropFilter,
        pose: css.transform,
      };
    });
    expect(layers.glass).toContain("blur(9px)");
    expect(layers.pose).toContain("matrix3d");
    expect(layers.layers).toHaveLength(3);
    expect(new Set(layers.layers).size).toBe(3);
    animations.add(layers.animation);
  }
  expect(animations.size).toBe(5);
  await modal.getByRole("button", { name: "Send my feedback" }).click();
  await expect(modal.locator("[data-mood]")).toHaveAttribute(
    "data-celebrate",
    "true",
  );
  expect(
    await modal
      .locator("[data-mood]")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toContain("delight");
  const particles = modal.locator('[class*="_reactionBits"] svg');
  await expect(particles).toHaveCount(3);
  expect(
    await particles
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toContain("reactionPop");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await modal
      .locator("[data-mood]")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  expect(
    await particles
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});

test("crying tears fall, sad sighs, smiling blinks and happy laughter keep animating", async ({
  page,
}) => {
  await page.goto("/tools/word-counter");
  await download(page);
  const modal = page.locator("dialog[data-feedback-tool]");
  await expect(modal).toBeVisible();
  const moods = ["crying", "sad", "smiling", "happy", "love"];
  const loops = ["moodSob", "moodSigh", "moodNod", "moodLaugh", "moodLove"];
  for (let index = 0; index < moods.length; index++) {
    await modal.getByRole("radio").nth(index).check();
    await page.mouse.move(1, 1);
    const face = modal.locator("[data-expression]");
    await expect(face).toHaveAttribute("data-expression", moods[index]);
    const motion = await face.evaluate((el) => ({
      names: getComputedStyle(el).animationName,
      iterations: getComputedStyle(el).animationIterationCount,
    }));
    expect(motion.names).toContain(loops[index]);
    expect(motion.iterations.split(", ")).toEqual(["infinite", "infinite"]);
    if (index === 0) {
      const tears = face.locator('[class*="_tear"]');
      await expect(tears).toHaveCount(2);
      await expect(tears.first()).toBeVisible();
      const falling = await tears.first().evaluate(async (el) => {
        const animation = el.getAnimations()[0];
        animation.pause();
        await animation.ready;
        animation.currentTime = 350;
        const first = new DOMMatrixReadOnly(getComputedStyle(el).transform).m42;
        animation.currentTime = 1250;
        const last = new DOMMatrixReadOnly(getComputedStyle(el).transform).m42;
        return {
          delta: last - first,
          name: getComputedStyle(el).animationName,
        };
      });
      expect(falling.name).toContain("tearFall");
      expect(falling.delta).toBeGreaterThan(12);
    }
    if (index === 2) {
      expect(
        await face
          .locator('[class*="_eyeLeft"]')
          .evaluate((el) => getComputedStyle(el).animationName),
      ).toContain("softBlink");
    }
    if (index === 3) {
      expect(
        await face
          .locator('[class*="_mouth"]')
          .evaluate((el) => getComputedStyle(el).animationName),
      ).toContain("happyMouth");
    }
  }
  await modal.getByRole("radio").first().check();
  await page.mouse.move(1, 1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const face = modal.locator("[data-expression]");
  await expect(face).toHaveCSS("animation-name", "none");
  await expect(face.locator('[class*="_tear"]').first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(face.locator('[class*="_tear"]').first()).toBeVisible();
  await modal.getByRole("button", { name: "Send my feedback" }).click();
  await expect(face.locator('[class*="_tear"]').first()).not.toBeVisible();
  await expect(
    modal.getByRole("heading", { name: "Your experience matters." }),
  ).toBeVisible();
});

for (const width of [390, 1440]) {
  test(`tool review appears in a themed 3D laptop card and stays read-only at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/tools/case-converter");
    await page.getByLabel("Original text").fill("Hello from the laptop");
    await page.getByRole("button", { name: "UPPERCASE", exact: true }).click();
    await page
      .getByRole("button", { name: "Download .txt", exact: true })
      .click();
    const modal = page.locator("dialog[data-feedback-tool]");
    await expect(modal).toBeVisible();
    await modal.getByRole("radio").nth(4).check();
    await modal.getByLabel("Anything else?").fill("My text looks perfect!");
    await modal.getByRole("button", { name: "Send my feedback" }).click();
    await expect(
      modal.getByText("Your rating was sent to the QUICKKIT team."),
    ).toBeVisible();
    await modal.getByRole("button", { name: "Keep creating" }).click();
    await page.goto("/");
    const review = page.locator('[data-laptop-tool-review="case-converter"]');
    await expect(review).toBeVisible();
    await expect(
      review.getByText("Case Converter", { exact: true }),
    ).toBeVisible();
    await expect(review.getByText("My text looks perfect!")).toBeVisible();
    await expect(
      review.getByRole("img", { name: "5 out of 5 stars" }),
    ).toBeVisible();
    expect(
      await review.evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--t-rgb").trim(),
      ),
    ).toBe("192 38 211");
    await page.reload();
    await expect(review).toBeVisible();
    const trigger = page
      .getByRole("group", { name: "QUICKKIT laptop preview" })
      .getByRole("button", { name: "Share feedback" });
    await trigger.hover({ force: true });
    await trigger.click();
    const manager = page.getByRole("dialog", { name: "Share your experience" });
    await expect(
      manager.getByRole("region", { name: "Saved tool reviews" }),
    ).toBeVisible();
    await expect(
      manager.getByRole("button", { name: /delete|remove/i }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(review).toBeVisible();
    await page.reload();
    await expect(review).toBeVisible();
  });
}
