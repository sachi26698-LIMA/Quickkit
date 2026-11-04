import {
  PDFDocument,
  degrees,
  rgb,
  PDFArray,
  PDFName,
  PDFNumber,
  PDFDict,
  type PDFFont,
  type PDFImage,
} from "@cantoo/pdf-lib";
import {
  orderedPages,
  decodeWatermark,
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
  onProgress?: (completed: number, total: number) => void,
) {
  const s = validateSettings(input);
  signal?.throwIfAborted();
  if (source.length > 50 * 1024 * 1024)
    throw new Error("Source PDF exceeds 50 MiB.");
  const original = await PDFDocument.load(source);
  const count = original.getPageCount();
  if (!count || count > 100)
    throw new Error(
      "This document exceeds the provisional 100-page limit. 1,000-page support is not stress-tested or enabled.",
    );
  const plan = s.visualPlan;
  if (plan && plan.sourceCount !== count)
    throw new Error(
      "Native pagination changed. Reset the visual page plan before editing this new source.",
    );
  const indices = plan
    ? plan.pages.map((p) => p.source)
    : orderedPages(s, count);
  const unchanged =
    indices.length === count && indices.every((p, i) => p === i);
  const pdf = unchanged ? original : await PDFDocument.create();
  if (!unchanged) {
    // One copier shares immutable font/image streams; copying per occurrence can
    // expand a single 50 MiB page into gigabytes when duplicated many times.
    const copies = await pdf.copyPages(
      original,
      indices.filter((i): i is number => i !== null),
    );
    let copied = 0;
    for (const index of indices) {
      signal?.throwIfAborted();
      if (index === null)
        pdf.addPage([
          original.getPage(0).getWidth(),
          original.getPage(0).getHeight(),
        ]);
      else pdf.addPage(copies[copied++]);
    }
    if (original.getTitle()) pdf.setTitle(original.getTitle()!);
    if (original.getAuthor()) pdf.setAuthor(original.getAuthor()!);
    if (original.getSubject()) pdf.setSubject(original.getSubject()!);
    if (original.getKeywords()) pdf.setKeywords([original.getKeywords()!]);
  }
  const overlaySet = new Set(
    s.overlayPages.trim() ? selectedPages(s.overlayPages, count) : indices,
  );
  const layoutSet = new Set(
    s.layoutScope === "selected" && s.layoutPages.trim()
      ? selectedPages(s.layoutPages, count)
      : indices,
  );
  const numbered = new Set(selectedPages(s.numberingPages, indices.length));
  const watermarked = new Set(selectedPages(s.watermarkPages, indices.length));
  onProgress?.(0, indices.length);
  const fonts = new Map<Settings["font"], PDFFont>();
  let image: PDFImage | undefined;
  for (const [index, page] of pdf.getPages().entries()) {
    signal?.throwIfAborted();
    const item = plan?.pages[index],
      overrides = item?.overrides || {};
    // The batch copier returns distinct page dictionaries, but arrays and
    // resource dictionaries can be shared. Clone mutable containers, not assets.
    const contents = page.node.Contents();
    if (contents instanceof PDFArray)
      page.node.set(PDFName.of("Contents"), contents.clone(pdf.context));
    const resources = page.node.Resources();
    if (resources) {
      const own = resources.clone(pdf.context);
      for (const key of ["Font", "XObject", "ExtGState"]) {
        const dict = own.lookupMaybe(PDFName.of(key), PDFDict);
        if (dict) own.set(PDFName.of(key), dict.clone(pdf.context));
      }
      page.node.set(PDFName.of("Resources"), own);
    }
    if (!unchanged) {
      const annots = page.node.Annots();
      if (annots) {
        const own = pdf.context.obj([]);
        for (let i = 0; i < annots.size(); i++) {
          const originalAnnot = annots.lookup(i);
          if (!(originalAnnot instanceof PDFDict)) {
            own.push(annots.get(i));
            continue;
          }
          const annot = originalAnnot.clone(pdf.context);
          for (const key of [
            "RD",
            "CL",
            "Vertices",
            "QuadPoints",
            "L",
            "Rect",
            "InkList",
          ]) {
            const list = annot.lookup(PDFName.of(key));
            if (list instanceof PDFArray) {
              const copy = list.clone(pdf.context);
              if (key === "InkList")
                for (let j = 0; j < list.size(); j++) {
                  const nested = list.lookup(j);
                  if (nested instanceof PDFArray)
                    copy.set(j, nested.clone(pdf.context));
                }
              annot.set(PDFName.of(key), copy);
            }
          }
          annot.set(PDFName.of("P"), page.ref);
          own.push(pdf.context.register(annot));
        }
        page.node.set(PDFName.of("Annots"), own);
      }
    }

    const v = { ...s, ...overrides };
    const geometryOverride = [
      "paper",
      "landscape",
      "width",
      "height",
      "margins",
      "top",
      "right",
      "bottom",
      "left",
    ].some((k) => k in overrides);
    const font =
      v.header || v.footer || v.numbering || v.watermarkText
        ? fonts.get(v.font) || (await pdf.embedFont(v.font))
        : undefined;
    if (font) fonts.set(v.font, font);
    if (
      (geometryOverride ||
        (s.layoutScope === "selected" && layoutSet.has(indices[index]))) &&
      (v.paper !== "Original" || v.margins)
    ) {
      // Post-pagination geometry, explicitly not selective Word reflow.
      const before = page.getSize();
      const mm =
        v.paper === "Original"
          ? [(before.width * 25.4) / 72, (before.height * 25.4) / 72]
          : v.paper === "Custom"
            ? [v.width, v.height]
            : sizes[v.paper];
      const w =
        ((v.paper !== "Original" && v.landscape ? mm[1] : mm[0]) * 72) / 25.4;
      const h =
        ((v.paper !== "Original" && v.landscape ? mm[0] : mm[1]) * 72) / 25.4;
      const l = v.margins ? (v.left * 72) / 25.4 : 0,
        r = v.margins ? (v.right * 72) / 25.4 : 0;
      const t = v.margins ? (v.top * 72) / 25.4 : 0,
        b = v.margins ? (v.bottom * 72) / 25.4 : 0;
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
    const rotation =
      (((page.getRotation().angle + s.rotation + (item?.rotation || 0)) % 360) +
        360) %
      360;
    if (![0, 90, 180, 270].includes(rotation))
      throw new Error("Unsupported source PDF page rotation.");
    const viewWidth = rotation % 180 ? height : width,
      viewHeight = rotation % 180 ? width : height;
    // Overlay controls use the displayed sheet, including native + visual rotation.
    const point = (x: number, y: number) =>
      rotation === 90
        ? { x: width - y, y: x }
        : rotation === 180
          ? { x: width - x, y: height - y }
          : rotation === 270
            ? { x: y, y: height - x }
            : { x, y };

    if (v.backgroundEnabled) {
      // Prepend a real PDF stream, behind existing content. Opaque source backgrounds remain opaque.
      const c = color(v.backgroundColor);
      const stream = pdf.context.flateStream(
        `q ${c.red} ${c.green} ${c.blue} rg 0 0 ${width} ${height} re f Q\n`,
      );
      page.node.normalize();
      const contents = page.node.Contents();
      if (contents instanceof PDFArray)
        contents.insert(0, pdf.context.register(stream));
    }
    if (font) {
      const draw = (text: string, y: number) => {
        if (!text) return;
        const textWidth = font.widthOfTextAtSize(text, v.fontSize);
        if (textWidth > viewWidth - 36)
          throw new Error(
            "Header/footer is too wide for the selected page and font size.",
          );
        const x =
          v.align === "left"
            ? 18
            : v.align === "right"
              ? viewWidth - textWidth - 18
              : (viewWidth - textWidth) / 2;
        page.drawText(text, {
          ...point(x, y),
          rotate: degrees(rotation),
          font,
          size: v.fontSize,
          color: color(v.color),
        });
      };
      if (overlaySet.has(indices[index]) || "header" in overrides)
        draw(v.header, viewHeight - 22);
      if (overlaySet.has(indices[index]) || "footer" in overrides)
        draw(v.footer, 18);
      if (
        v.numbering &&
        (overlaySet.has(indices[index]) || "numbering" in overrides) &&
        (numbered.has(index) || "numbering" in overrides) &&
        !(v.skipFirstNumber && index === 0)
      )
        draw(
          v.numberFormat.replace(
            /\{(n|total|section)\}/g,
            (_, token: string) =>
              token === "section"
                ? item?.section || "Main"
                : pageNumber(
                    token === "total"
                      ? indices.length
                      : v.startNumber + index - (v.skipFirstNumber ? 1 : 0),
                    v.numberStyle,
                  ),
          ),
          v.position === "top" ? viewHeight - 40 : 36,
        );
    }
    if (
      font &&
      v.watermarkText &&
      (watermarked.has(index) || "watermarkText" in overrides)
    ) {
      const angle = (v.watermarkAngle * Math.PI) / 180,
        unitWidth = font.widthOfTextAtSize(v.watermarkText, 1),
        c = Math.abs(Math.cos(angle)),
        sn = Math.abs(Math.sin(angle));
      const size = Math.min(
        v.watermarkSize,
        (0.8 * viewWidth) / (unitWidth * c + sn),
        (0.8 * viewHeight) / (unitWidth * sn + c),
      );
      const tw = font.widthOfTextAtSize(v.watermarkText, size);
      page.drawText(v.watermarkText, {
        font,
        size,
        ...point(
          viewWidth / 2 -
            (tw / 2) * Math.cos(angle) +
            (size / 2) * Math.sin(angle),
          viewHeight / 2 -
            (tw / 2) * Math.sin(angle) -
            (size / 2) * Math.cos(angle),
        ),
        rotate: degrees(v.watermarkAngle + rotation),
        opacity: v.watermarkOpacity,
        color: color(v.watermarkColor),
      });
    }
    if (
      v.imageWatermarkEnabled &&
      (watermarked.has(index) || "imageWatermarkEnabled" in overrides)
    ) {
      if (!image) {
        const asset = decodeWatermark(s.imageWatermark)!;
        image =
          asset.type === "image/png"
            ? await pdf.embedPng(asset.bytes)
            : await pdf.embedJpg(asset.bytes);
      }
      const scale = Math.min(
        (viewWidth * v.imageWatermarkWidth) / 100 / image.width,
        (viewHeight * 0.8) / image.height,
      );
      const iw = image.width * scale,
        ih = image.height * scale;
      page.drawImage(image, {
        ...point((viewWidth - iw) / 2, (viewHeight - ih) / 2),
        rotate: degrees(rotation),
        width: iw,
        height: ih,
        opacity: v.imageWatermarkOpacity,
      });
    }
    if (page.getRotation().angle !== rotation)
      page.setRotation(degrees(rotation));
    onProgress?.(index + 1, indices.length);
    if (index % 4 === 3) await new Promise((resolve) => setTimeout(resolve, 0));
  }
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

/** Copy already-rendered final pages; do not reapply overlays or reset their numbers. */
export async function extractPdfPages(
  source: Uint8Array,
  indices: number[],
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  if (source.length > 50 * 1024 * 1024) throw new Error("PDF exceeds 50 MiB.");
  const original = await PDFDocument.load(source),
    count = original.getPageCount();
  if (
    !count ||
    count > 100 ||
    !indices.length ||
    indices.length > 100 ||
    new Set(indices).size !== indices.length ||
    indices.some((i) => !Number.isInteger(i) || i < 0 || i >= count)
  )
    throw new Error("Choose existing output pages to extract.");
  const pdf = await PDFDocument.create();
  if (original.getTitle()) pdf.setTitle(original.getTitle()!);
  if (original.getAuthor()) pdf.setAuthor(original.getAuthor()!);
  for (const page of await pdf.copyPages(original, indices)) {
    signal?.throwIfAborted();
    pdf.addPage(page);
  }
  const bytes = await pdf.save();
  signal?.throwIfAborted();
  if (bytes.length > 50 * 1024 * 1024)
    throw new Error("Selected PDF exceeds 50 MiB.");
  return bytes;
}
