import {
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFRawStream,
  StandardFonts,
  decodePDFRawStream,
  degrees,
} from "@cantoo/pdf-lib";

export async function createSimplePdf(
  labels: string[],
  options: { size?: [number, number]; title?: string } = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  if (options.title) doc.setTitle(options.title);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  labels.forEach((label, index) => {
    const page = doc.addPage(options.size ?? [320, 420]);
    if (index % 2 === 1) page.setRotation(degrees(90));
    page.drawText(label, { font, size: 16, x: 28, y: 350 });
  });
  return doc.save({ useObjectStreams: false });
}

export async function createLinkedPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const first = doc.addPage([320, 420]);
  const omitted = doc.addPage([320, 420]);
  const third = doc.addPage([320, 420]);
  first.drawText("LINK-SELECTED-1", { font, size: 15, x: 28, y: 360 });
  omitted.drawText("LINK-OMITTED-SECRET", { font, size: 15, x: 28, y: 360 });
  third.drawText("LINK-SELECTED-3", { font, size: 15, x: 28, y: 360 });

  const addLink = (targetRef: typeof first.ref, y: number) => {
    const link = doc.context.obj({
      Border: [0, 0, 0],
      Dest: [targetRef, "XYZ", null, null, null],
      Rect: [28, y, 190, y + 22],
      Subtype: "Link",
      Type: "Annot",
    });
    first.node.addAnnot(doc.context.register(link));
  };
  addLink(omitted.ref, 305);
  addLink(third.ref, 265);
  return doc.save({ useObjectStreams: false });
}

export async function createFormPdf(
  options: { hiddenWidget?: boolean; missingAppearance?: boolean } = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([340, 440]);
  page.drawText("FORM-PAGE", { font, size: 16, x: 28, y: 385 });
  const form = doc.getForm();
  const name = form.createTextField("applicant.name");
  name.setText("FORM-VALUE-KEEP");
  name.addToPage(page, { height: 28, width: 230, x: 28, y: 320 });
  const agree = form.createCheckBox("agree");
  agree.check();
  agree.addToPage(page, { height: 18, width: 18, x: 28, y: 278 });
  form.updateFieldAppearances(font);

  if (options.hiddenWidget) {
    const widget = name.acroField.getWidgets()[0];
    widget.dict.set(PDFName.of("F"), PDFNumber.of(2));
  }
  if (options.missingAppearance) {
    const widget = name.acroField.getWidgets()[0];
    widget.dict.delete(PDFName.of("AP"));
  }
  return doc.save({ useObjectStreams: false });
}

export async function createEncryptedPdf(
  userPassword = "correct horse",
): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc
    .addPage([320, 420])
    .drawText("ENCRYPTED-SELECTED", { font, size: 15, x: 28, y: 350 });
  doc
    .addPage([320, 420])
    .drawText("ENCRYPTED-SECOND", { font, size: 15, x: 28, y: 350 });
  doc.encrypt({
    ownerPassword: "owner horse",
    permissions: { printing: "highResolution" },
    userPassword,
  });
  return doc.save({ useObjectStreams: false });
}

export async function createSignedLikePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc
    .addPage([320, 420])
    .drawText("SIGNED-LIKE", { font, size: 16, x: 28, y: 350 });
  const form = doc.getForm();
  const signatureValue = doc.context.obj({
    ByteRange: [0, 0, 0, 0],
    Contents: PDFHexString.of("00"),
    Filter: "Adobe.PPKLite",
    SubFilter: "adbe.pkcs7.detached",
    Type: "Sig",
  });
  const field = doc.context.obj({
    FT: "Sig",
    Kids: [],
    T: PDFHexString.fromText("Signature1"),
    V: signatureValue,
  });
  form.acroForm.addField(doc.context.register(field));
  return doc.save({ useObjectStreams: false });
}

export async function createXfaLikePdf(): Promise<Uint8Array> {
  const bytes = await createSimplePdf(["XFA-LIKE"]);
  const doc = await PDFDocument.load(bytes, {
    preserveXFA: true,
    updateMetadata: false,
  });
  const form = doc.getForm();
  form.acroForm.dict.set(PDFName.of("XFA"), PDFHexString.fromText("<xfa/>"));
  return doc.save({ useObjectStreams: false });
}

function decodeHexStrings(text: string): string {
  return text.replace(/<([\da-fA-F\s]+)>/g, (_match, hex: string) => {
    const compact = hex.replace(/\s/g, "");
    if (compact.length % 2 !== 0) return _match;
    let result = "";
    for (let index = 0; index < compact.length; index += 2) {
      result += String.fromCharCode(
        Number.parseInt(compact.slice(index, index + 2), 16),
      );
    }
    return result;
  });
}

function streamText(stream: unknown): string {
  if (!(stream instanceof PDFRawStream)) return "";
  try {
    return Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1");
  } catch {
    return "";
  }
}

export async function pageMarkerText(bytes: Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  return doc.getPages().map((page) => {
    const contents = page.node.Contents();
    const streams: unknown[] = [];
    if (contents) {
      if ("size" in contents) {
        for (let index = 0; index < contents.size(); index += 1) {
          streams.push(doc.context.lookup(contents.get(index)));
        }
      } else {
        streams.push(contents);
      }
    }
    return decodeHexStrings(streams.map(streamText).join("\n"));
  });
}

export async function allStreamText(bytes: Uint8Array): Promise<string> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  return decodeHexStrings(
    doc.context
      .enumerateIndirectObjects()
      .map(([, object]) => streamText(object))
      .join("\n"),
  );
}
