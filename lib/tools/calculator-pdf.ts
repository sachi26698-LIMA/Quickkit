/** Local report generator for bounded ASCII-only calculator summaries. */
export async function calculatorPdf(title: string, lines: string[]) {
  if (
    !title ||
    title.length > 120 ||
    lines.length > 1500 ||
    [title, ...lines].some((s) => s.length > 10000 || /[^\x20-\x7e]/.test(s))
  )
    throw new Error(
      "This PDF report contains unsupported text or is too long.",
    );
  const { PDFDocument, StandardFonts, rgb } = await import("@cantoo/pdf-lib");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([595, 842]);
  let y = 790;
  page.drawText(title, {
    x: 42,
    y,
    size: 17,
    font: bold,
    color: rgb(0.23, 0.11, 0.31),
  });
  y -= 32;
  for (const line of lines) {
    const words = line.split(/\s+/);
    let text = "";
    for (const word of words) {
      if (font.widthOfTextAtSize(word, 10) > 505)
        throw new Error("A report field is too long to fit on a page.");
      const next = text ? `${text} ${word}` : word;
      if (font.widthOfTextAtSize(next, 10) > 505) {
        if (y < 50) {
          page = doc.addPage([595, 842]);
          y = 790;
        }
        page.drawText(text, { x: 42, y, size: 10, font });
        y -= 17;
        text = word;
      } else text = next;
    }
    if (y < 50) {
      page = doc.addPage([595, 842]);
      y = 790;
    }
    if (text) page.drawText(text, { x: 42, y, size: 10, font });
    y -= 20;
  }
  return doc.save();
}
