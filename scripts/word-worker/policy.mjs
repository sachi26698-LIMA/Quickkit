export const limits = Object.freeze({
  input: 20 * 1024 * 1024,
  output: 50 * 1024 * 1024,
  deadlineMs: 120000,
});
export function exportFilter(options) {
  const keys = [
    "lossless",
    "jpegQuality",
    "reduceResolution",
    "maxDpi",
    "tagged",
  ];
  if (
    !options ||
    Object.keys(options).length !== keys.length ||
    keys.some((k) => !Object.hasOwn(options, k)) ||
    ["lossless", "reduceResolution", "tagged"].some(
      (k) => typeof options[k] !== "boolean",
    ) ||
    !Number.isInteger(options.jpegQuality) ||
    options.jpegQuality < 1 ||
    options.jpegQuality > 100 ||
    !Number.isInteger(options.maxDpi) ||
    options.maxDpi < 72 ||
    options.maxDpi > 600
  )
    throw new Error("Invalid export options");
  return JSON.stringify({
    UseLosslessCompression: {
      type: "boolean",
      value: String(options.lossless),
    },
    Quality: { type: "long", value: String(options.jpegQuality) },
    ReduceImageResolution: {
      type: "boolean",
      value: String(options.reduceResolution),
    },
    MaxImageResolution: { type: "long", value: String(options.maxDpi) },
    ExportBookmarks: { type: "boolean", value: "true" },
    ExportBookmarksToPDFDestination: { type: "boolean", value: "true" },
    ExportDocumentStructure: { type: "boolean", value: String(options.tagged) },
    UseTaggedPDF: { type: "boolean", value: String(options.tagged) },
    ExportNotesPages: { type: "boolean", value: "false" },
  });
}
export function jobArgs(image, name, filter) {
  if (
    !/^sha256:[a-f0-9]{64}$/.test(image) ||
    !/^quickkit-word-[a-f0-9-]{36}$/.test(name)
  )
    throw new Error("Invalid immutable job identity");
  if (filter.length > 2048) throw new Error("Oversized filter");
  return [
    "run",
    "--rm",
    "--pull=never",
    "--name",
    name,
    "--label=quickkit.word-worker=1",
    "--init",
    "-i",
    "--network=none",
    "--read-only",
    "--user=65532:65532",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges:true",
    "--cgroupns=private",
    "--memory=1g",
    "--memory-swap=1g",
    "--cpus=1",
    "--pids-limit=128",
    "--ulimit=nofile=256:256",
    "--ulimit=fsize=52428800:52428800",
    "--log-driver=none",
    "--tmpfs=/work:rw,noexec,nosuid,nodev,size=512m,uid=65532,gid=65532,mode=700",
    "--tmpfs=/tmp:rw,noexec,nosuid,nodev,size=128m,uid=65532,gid=65532,mode=700",
    image,
    filter,
  ];
}
