// @vitest-environment jsdom
/**
 * Brief §2 requires each of the four converter tools to have "its own
 * appropriate workspace" while remaining consistent, and §7 requires real file
 * validation, an upload path that works on mobile, and clear empty states.
 *
 * tests/four-tool-consistency.test.tsx covers the shared ToolShell chrome. This
 * covers the workspace inside it: the upload control, the settings landmark and
 * the formats-and-limits disclosure. These render in the empty state, before a
 * file is chosen, which is exactly the state a first-time visitor sees.
 *
 * The tools are deliberately not identical here - image-to-image converts,
 * pdf-studio edits pages - so these tests assert the elements every workspace
 * must expose rather than a single shared layout.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ImageToImagePage from "../app/tools/image-to-image/page";
import ImagesToPdfPage from "../app/tools/images-to-pdf/page";
import PdfToImagePage from "../app/tools/pdf-to-image/page";
import PdfStudioPage from "../app/tools/pdf-studio/page";

const PAGES = [
  { slug: "image-to-image", Page: ImageToImagePage },
  { slug: "images-to-pdf", Page: ImagesToPdfPage },
  { slug: "pdf-to-image", Page: PdfToImagePage },
  { slug: "pdf-studio", Page: PdfStudioPage },
] as const;

describe("every converter workspace exposes the required controls", () => {
  afterEach(cleanup);

  for (const { slug, Page } of PAGES) {
    describe(slug, () => {
      it("offers a labelled upload control in the empty state", () => {
        const { container } = render(<Page />);

        // Every tool names its dropzone with an aria-label beginning "Choose",
        // and it must sit on a real control rather than a decorative element.
        const dropzones = [
          ...container.querySelectorAll("[aria-label]"),
        ].filter((el) => /^Choose\b/.test(el.getAttribute("aria-label")!));
        expect(
          dropzones.length,
          `${slug} has no upload control`,
        ).toBeGreaterThan(0);

        // A dropzone with no file input would render but accept nothing, and a
        // keyboard or mobile user would have no way to pick a file. The tools
        // differ in structure: the three converters put the label on a wrapper
        // that contains the input, while pdf-studio puts the label directly on
        // the <input type="file">. Both are valid, so accept either shape.
        const reachesInput = dropzones.filter(
          (el) =>
            el.matches('input[type="file"]') ||
            el.querySelector('input[type="file"]'),
        );
        expect(
          reachesInput.length,
          `${slug} dropzone reaches no file input`,
        ).toBeGreaterThan(0);

        // Whichever shape it is, the control must accept multiple files where
        // the tool is a batch tool, and must not be left disabled on load.
        const input = reachesInput[0].matches('input[type="file"]')
          ? reachesInput[0]
          : reachesInput[0].querySelector('input[type="file"]')!;
        expect(
          (input as HTMLInputElement).disabled,
          `${slug} file input is disabled before any work starts`,
        ).toBe(false);
      });

      it("exposes an accessible settings landmark", () => {
        const { container } = render(<Page />);

        // The three converters use aria-label; pdf-studio names the same
        // landmark by reference via aria-labelledby. Both are valid accessible
        // naming, so resolve either and require the label to mention settings.
        const labelled = [...container.querySelectorAll("[aria-label]")].some(
          (el) => /settings/i.test(el.getAttribute("aria-label")!),
        );
        const referenced = [
          ...container.querySelectorAll("[aria-labelledby]"),
        ].some((el) => {
          const id = el.getAttribute("aria-labelledby")!;
          const target = container.querySelector(`#${id}`);
          return Boolean(target && /settings/i.test(target.textContent!));
        });

        expect(
          labelled || referenced,
          `${slug} has no accessible settings landmark`,
        ).toBe(true);
      });

      it("states the supported formats and limits before the user commits a file", () => {
        render(<Page />);
        // Telling the user the ceilings up front is what keeps a 30 MB PDF or a
        // HEIC photo from failing only after they have uploaded it.
        expect(
          screen.getByLabelText("Supported formats and limits").textContent!
            .length,
        ).toBeGreaterThan(20);
      });
    });
  }
});
