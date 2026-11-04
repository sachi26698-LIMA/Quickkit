import {
  PDFDocument,
  degrees,
  rgb,
  PDFArray,
  PDFName,
  PDFNumber,
} from "@cantoo/pdf-lib";
import {
  orderedPages,
  pageNumber,
  selectedPages,
  sizes,
  validateSettings,
  type Settings,
} from "./settings";
const color = (hex: string) =>
  rgb(
    ...([1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [
      number,
      number,
      number,
    ]),
  );
/** Single pipeline for server final export and browser live preview. Never mutate retained native bytes. */
export async function processPdf(
  source: Uint8Array,
  input: Settings,
  signal?: AbortSignal,
) {
  const s = validateSettings(input);
  signal?.throwIfAborted();
  const original = await PDFDocument.load(source);
  const count = original.getPageCount();
  if (!count || count > 100)
    throw new Error(
      "This document exceeds the provisional 100-page limit. 1,000-page support is not stress-tested or enabled.",
    );
  const indices = orderedPages(s, count);
  const unchanged =
    indices.length === count && indices.every((p, i) => p === i);
  const pdf = unchanged ? original : await PDFDocument.create();
  if (!unchanged)
    for (const page of await pdf.copyPages(original, indices))
      pdf.addPage(page);
  const overlaySet = new Set(
    s.overlayPages.trim() ? selectedPages(s.overlayPages, count) : indices,
  );
  const layoutSet = new Set(
    s.layoutScope === "selected" && s.layoutPages.trim()
      ? selectedPages(s.layoutPages, count)
      : indices,
  );
  const font =
    s.header || s.footer || s.numbering
      ? await pdf.embedFont(s.font)
      : undefined;
  pdf.getPages().forEach((page, index) => {
    signal?.throwIfAborted();
    if (
      s.layoutScope === "selected" &&
      layoutSet.has(indices[index]) &&
      (s.paper !== "Original" || s.margins)
    ) {
      // Post-pagination geometry, explicitly not selective Word reflow.
      const before = page.getSize();
      const mm =
        s.paper === "Original"
          ? [(before.width * 25.4) / 72, (before.height * 25.4) / 72]
          : s.paper === "Custom"
            ? [s.width, s.height]
            : sizes[s.paper];
      const w =
        ((s.paper !== "Original" && s.landscape ? mm[1] : mm[0]) * 72) / 25.4;
      const h =
        ((s.paper !== "Original" && s.landscape ? mm[0] : mm[1]) * 72) / 25.4;
      const l = s.margins ? (s.left * 72) / 25.4 : 0,
        r = s.margins ? (s.right * 72) / 25.4 : 0;
      const t = s.margins ? (s.top * 72) / 25.4 : 0,
        b = s.margins ? (s.bottom * 72) / 25.4 : 0;
      if (w - l - r < 20 || h - t - b < 20)
        throw new Error("Margins leave no usable page area.");
      const scale = Math.min(
        (w - l - r) / before.width,
        (h - t - b) / before.height,
      );
      const dx = l + (w - l - r - before.width * scale) / 2,
        dy = b + (h - t - b - before.height * scale) / 2;
      page.setSize(w, h);
      page.setCropBox(0, 0, w, h);
      page.scaleContent(scale, scale);
      page.scaleAnnotations(scale, scale);
      page.translateContent(dx, dy);
      const annots = page.node.Annots();
      for (let i = 0; annots && i < annots.size(); i++) {
        const annot = pdf.context.lookup(annots.get(i));
        if (annot && "lookup" in annot && typeof annot.lookup === "function") {
          const rect = annot.lookup(PDFName.of("Rect"), PDFArray);
          if (rect instanceof PDFArray && rect.size() === 4)
            for (let k = 0; k < 4; k++)
              rect.set(
                k,
                PDFNumber.of(
                  rect.lookup(k, PDFNumber).asNumber() +
                    (k % 2 === 0 ? dx : dy),
                ),
              );
        }
      }
    }
    const { width, height } = page.getSize();
    if (s.backgroundEnabled) {
      // Prepend a real PDF stream, behind existing content. Opaque source backgrounds remain opaque.
      const c = color(s.backgroundColor);
      const stream = pdf.context.flateStream(
        `q ${c.red} ${c.green} ${c.blue} rg 0 0 ${width} ${height} re f Q\n`,
      );
      page.node.normalize();
      const contents = page.node.Contents();
      if (contents instanceof PDFArray)
        contents.insert(0, pdf.context.register(stream));
    }
    if (font && overlaySet.has(indices[index])) {
      const draw = (text: string, y: number) => {
        if (!text) return;
        const textWidth = font.widthOfTextAtSize(text, s.fontSize);
        if (textWidth > width - 36)
          throw new Error(
            "Header/footer is too wide for the selected page and font size.",
          );
        const x =
          s.align === "left"
            ? 18
            : s.align === "right"
              ? width - textWidth - 18
              : (width - textWidth) / 2;
        page.drawText(text, {
          x,
          y,
          font,
          size: s.fontSize,
          color: color(s.color),
        });
      };
      draw(s.header, height - 22);
      draw(s.footer, 18);
      if (s.numbering && !(s.skipFirstNumber && index === 0))
        draw(
          pageNumber(
            s.startNumber + index - (s.skipFirstNumber ? 1 : 0),
            s.numberStyle,
          ),
          s.position === "top" ? height - 40 : 36,
        );
    }
    if (s.rotation)
      page.setRotation(degrees((page.getRotation().angle + s.rotation) % 360));
  });
  // Empty fields leave native metadata unchanged; non-empty values explicitly override it.
  if (s.title) pdf.setTitle(s.title);
  if (s.author) pdf.setAuthor(s.author);
  if (s.subject) pdf.setSubject(s.subject);
  if (s.keywords)
    pdf.setKeywords(
      s.keywords
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    );
  const bytes = await pdf.save();
  signal?.throwIfAborted();
  if (bytes.length > 50 * 1024 * 1024)
    throw new Error("Final PDF exceeds the 50 MiB output limit.");
  return { bytes, pages: pdf.getPageCount(), sourcePages: count, indices };
}
