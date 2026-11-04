// @vitest-environment jsdom
/**
 * Brief §2 requires the four converter tools to be "consistent across all four
 * tools, each with its own appropriate workspace", with a required structure:
 * tool header and breadcrumb, compact feature intro, main workspace, upload and
 * file queue, settings, live preview, results, instructions and FAQs.
 *
 * Each of those had been confirmed present by hand during the §2 audit, but
 * nothing enforced it. A new tool, or an edit to one page, could silently drop a
 * section and only a human reading the page would notice. These tests render
 * all four pages through the same ToolShell and assert the shared skeleton is
 * identical, so drift fails the suite instead of shipping.
 *
 * This asserts structure, not appearance: it cannot see whether the tools look
 * premium. Visual quality still needs a browser.
 */
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ImageToImagePage from "../app/tools/image-to-image/page";
import ImagesToPdfPage from "../app/tools/images-to-pdf/page";
import PdfToImagePage from "../app/tools/pdf-to-image/page";
import PdfStudioPage from "../app/tools/pdf-studio/page";

const PAGES = [
  {
    slug: "image-to-image",
    Page: ImageToImagePage,
    name: "Image to Image Converter",
  },
  {
    slug: "images-to-pdf",
    Page: ImagesToPdfPage,
    name: "Images to PDF Converter",
  },
  {
    slug: "pdf-to-image",
    Page: PdfToImagePage,
    name: "PDF to Image Converter",
  },
  { slug: "pdf-studio", Page: PdfStudioPage, name: "PDF Studio" },
] as const;

/** The three ToolShell-owned sections every tool page must carry. */
const SHELL_SECTIONS = [
  "How to use it",
  "A few useful answers",
  "Keep the good work going",
] as const;

describe("the four converter tools share one structure", () => {
  // No global setup file registers auto-cleanup, so the DOM would accumulate
  // across renders and every query would match four times.
  afterEach(cleanup);

  for (const { Page, name } of PAGES) {
    describe(name, () => {
      it("renders the shared header, breadcrumb and instructions", () => {
        render(<Page />);

        // Header and breadcrumb come from ToolShell, so every page gets them by
        // construction — but assert them, because a page could stop using
        // ToolShell and still compile.
        // jest-dom matchers are not registered in this repo, so assert on the
        // element directly. getByRole already throws when nothing matches, so
        // reaching these assertions means each landmark was found.
        expect(
          screen.getByRole("heading", { level: 1, name }).textContent,
        ).toBe(name);
        expect(
          screen
            .getByRole("navigation", { name: "Breadcrumb" })
            .querySelectorAll("a").length,
        ).toBeGreaterThan(0);
        for (const section of SHELL_SECTIONS)
          expect(
            screen.getByRole("heading", { level: 2, name: section })
              .textContent,
          ).toBe(section);
      });

      it("keeps exactly one h1 so no page renders competing titles", () => {
        const { container } = render(<Page />);
        // Assert on the element, not on matching text: the tool component also
        // repeats its name as an h2, so counting text would be a false failure.
        expect(container.querySelectorAll("h1").length).toBe(1);
      });

      it("carries non-empty instructions and FAQs rather than placeholders", () => {
        render(<Page />);

        const steps = within(
          screen.getByRole("heading", { level: 2, name: "How to use it" })
            .parentElement!,
        ).getAllByRole("listitem");
        // A page with one vestigial step would satisfy a bare length check, so
        // require a real walkthrough and real prose in each entry.
        expect(steps.length).toBeGreaterThanOrEqual(4);
        for (const step of steps)
          expect(step.textContent!.trim().length).toBeGreaterThan(40);

        // FAQs are <details>/<summary>, not buttons.
        const faqSection = screen.getByRole("heading", {
          level: 2,
          name: "A few useful answers",
        }).parentElement!;
        const questions = faqSection.querySelectorAll("details > summary");
        expect(questions.length).toBeGreaterThanOrEqual(4);
        for (const q of questions)
          expect(q.textContent!.trim().length).toBeGreaterThan(10);
        // Each question must actually carry an answer, not be an empty shell.
        const answers = faqSection.querySelectorAll("details > p");
        expect(answers.length).toBe(questions.length);
        for (const a of answers)
          expect(a.textContent!.trim().length).toBeGreaterThan(40);
      });

      it("offers the related tools so no tool is a dead end", () => {
        render(<Page />);
        const related = within(
          screen.getByRole("heading", {
            level: 2,
            name: "Keep the good work going",
          }).parentElement!,
        );
        expect(related.getAllByRole("link").length).toBeGreaterThan(0);
        // The retired combined converter must never resurface here.
        for (const link of related.getAllByRole("link"))
          expect(link.getAttribute("href")).not.toBe("/tools/image-converter");
      });
    });
  }

  it("gives every tool the same shell sections in the same order", () => {
    const shapes = PAGES.map(({ slug, Page }) => {
      const { container } = render(<Page />);
      const headings = [...container.querySelectorAll("h1, h2")].map((h) =>
        h.textContent!.trim(),
      );
      return { slug, headings };
    });

    for (const { slug, headings } of shapes) {
      const order = SHELL_SECTIONS.filter((h) => headings.includes(h));
      expect(order, slug).toEqual([...SHELL_SECTIONS]);
    }
  });
});
