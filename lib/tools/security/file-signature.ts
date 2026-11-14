/** Bounded magic-byte identification; a signature match does not validate a file. */
const types = [
  {
    name: "PDF",
    mime: "application/pdf",
    ext: ["pdf"],
    test: (b: Uint8Array) => ascii(b, 0, 5) === "%PDF-",
  },
  {
    name: "PNG",
    mime: "image/png",
    ext: ["png"],
    test: (b: Uint8Array) =>
      [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v),
  },
  {
    name: "JPEG",
    mime: "image/jpeg",
    ext: ["jpg", "jpeg"],
    test: (b: Uint8Array) => b[0] === 255 && b[1] === 216 && b[2] === 255,
  },
  {
    name: "WebP",
    mime: "image/webp",
    ext: ["webp"],
    test: (b: Uint8Array) =>
      ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP",
  },
  {
    name: "GIF",
    mime: "image/gif",
    ext: ["gif"],
    test: (b: Uint8Array) => ["GIF87a", "GIF89a"].includes(ascii(b, 0, 6)),
  },
  {
    name: "ZIP container",
    mime: "application/zip",
    ext: ["zip", "docx", "xlsx", "pptx", "odt", "ods", "odp", "epub", "jar"],
    test: (b: Uint8Array) =>
      b[0] === 0x50 &&
      b[1] === 0x4b &&
      ((b[2] === 3 && b[3] === 4) ||
        (b[2] === 5 && b[3] === 6) ||
        (b[2] === 7 && b[3] === 8)),
  },
  {
    name: "ELF executable",
    mime: "application/x-elf",
    ext: [],
    test: (b: Uint8Array) => b[0] === 0x7f && ascii(b, 1, 3) === "ELF",
  },
  {
    name: "DOS/PE-style executable",
    mime: "application/vnd.microsoft.portable-executable",
    ext: ["exe", "dll"],
    test: (b: Uint8Array) => ascii(b, 0, 2) === "MZ",
  },
] as const;
function ascii(b: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...b.subarray(start, start + length));
}
export async function inspectFileSignature(file: File) {
  if (!file.size)
    throw new Error("Choose a non-empty file for signature inspection.");
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const detected = types.find((item) => item.test(bytes));
  const extension = file.name.includes(".")
    ? file.name.split(".").at(-1)!.toLowerCase()
    : "";
  const knownExtension = types.find((item) =>
    (item.ext as readonly string[]).includes(extension),
  );
  const extensionStatus =
    detected && knownExtension
      ? detected === knownExtension
        ? "consistent with the detected container signature"
        : "does not match the detected signature"
      : "unknown or not checked";
  const mimeStatus = !file.type
    ? "not supplied"
    : detected
      ? file.type.toLowerCase() === detected.mime ||
        (detected.name === "ZIP container" &&
          [
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          ].includes(file.type.toLowerCase()))
        ? "compatible with the detected container"
        : "differs from the detected type"
      : "not checked against an unknown signature";
  return `Signature: ${detected?.name ?? "unrecognized"}\nSuggested MIME: ${detected?.mime ?? "unknown"}\nFile extension: ${extension || "none"} (${extensionStatus})\nBrowser-provided MIME: ${file.type || "not supplied"} (${mimeStatus})\n\nOnly the first 32 bytes were examined. Signatures, extensions and MIME labels can be forged; ZIP does not prove a valid DOCX, and a match does not establish file safety or rule out polyglots or malware.`;
}
