import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { MAX_FILE, sizes, type Settings } from "./settings";
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
function parse(xml: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error("Document contains unsupported XML declarations.");
  return new DOMParser({
    onError: () => {
      throw new Error("Corrupted DOCX XML.");
    },
  }).parseFromString(xml, "application/xml");
}
/** Central-directory filter runs BEFORE allocation/decompression. No extraction to filesystem. */
export function prepareDocx(bytes: Uint8Array, s: Settings): Uint8Array {
  if (bytes.length > MAX_FILE || bytes[0] !== 0x50 || bytes[1] !== 0x4b)
    throw new Error(
      "Use a valid DOCX ZIP package, no larger than 20 MiB. Legacy DOC and encrypted files are unsupported.",
    );
  let expanded = 0,
    entries = 0;
  const files = unzipSync(bytes, {
    filter: (file) => {
      expanded += file.originalSize;
      entries++;
      if (
        expanded > 100 * 1024 * 1024 ||
        entries > 2000 ||
        file.originalSize > 40 * 1024 * 1024
      )
        throw new Error("DOCX expands beyond the safe processing limit.");
      if (
        file.name.includes("..") ||
        file.name.startsWith("/") ||
        /vbaProject|embeddings\//i.test(file.name)
      )
        throw new Error(
          "Macros and embedded executable/OLE objects are unsupported.",
        );
      return true;
    },
  });
  if (
    !files["[Content_Types].xml"] ||
    !files["word/document.xml"] ||
    !files["_rels/.rels"]
  )
    throw new Error(
      "Unsupported or corrupted DOCX: required document parts are missing.",
    );
  for (const [name, data] of Object.entries(files)) {
    if (!/\.xml$|\.rels$/i.test(name)) continue;
    const doc = parse(strFromU8(data));
    if (/\.rels$/i.test(name)) {
      const rels = doc.getElementsByTagNameNS("*", "Relationship");
      for (let i = 0; i < rels.length; i++) {
        const rel = rels.item(i)!;
        if (rel.getAttribute("TargetMode") === "External") {
          const target = rel.getAttribute("Target") || "";
          if (
            !rel.getAttribute("Type")?.endsWith("/hyperlink") ||
            !/^(https?:|mailto:)/i.test(target)
          )
            throw new Error(
              "External document resources and unsafe links are unsupported. Embed linked images before converting.",
            );
        }
      }
    }
  }
  const doc = parse(strFromU8(files["word/document.xml"]));
  if (
    doc.documentElement?.namespaceURI !== W ||
    doc.documentElement.localName !== "document"
  )
    throw new Error("Unsupported Word document format.");
  if (doc.getElementsByTagNameNS(W, "altChunk").length)
    throw new Error("Embedded HTML content is unsupported.");
  const sections = doc.getElementsByTagNameNS(W, "sectPr");
  if (!sections.length && (s.paper !== "Original" || s.margins)) {
    const body = doc.getElementsByTagNameNS(W, "body").item(0);
    if (!body) throw new Error("Corrupted DOCX: missing document body.");
    body.appendChild(doc.createElementNS(W, "w:sectPr"));
  }
  for (let i = 0; i < sections.length; i++) {
    const section = sections.item(i)!;
    function element(local: string) {
      let node = section.getElementsByTagNameNS(W, local).item(0);
      if (!node) {
        node = doc.createElementNS(W, `w:${local}`);
        section.appendChild(node);
      }
      return node;
    }
    if (s.paper !== "Original" && s.layoutScope === "all") {
      const [width, height] =
        s.paper === "Custom" ? [s.width, s.height] : sizes[s.paper];
      const page = element("pgSz");
      page.setAttributeNS(
        W,
        "w:w",
        String(Math.round(((s.landscape ? height : width) * 1440) / 25.4)),
      );
      page.setAttributeNS(
        W,
        "w:h",
        String(Math.round(((s.landscape ? width : height) * 1440) / 25.4)),
      );
      page.setAttributeNS(
        W,
        "w:orient",
        s.landscape ? "landscape" : "portrait",
      );
    }
    if (s.margins && s.layoutScope === "all") {
      const margins = element("pgMar");
      for (const edge of ["top", "right", "bottom", "left"] as const)
        margins.setAttributeNS(
          W,
          `w:${edge}`,
          String(Math.round((s[edge] * 1440) / 25.4)),
        );
    }
  }
  files["word/document.xml"] = strToU8(
    new XMLSerializer().serializeToString(doc),
  );
  return zipSync(files);
}
