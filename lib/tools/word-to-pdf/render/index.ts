import { parseDocxPackage } from "./ooxml";
import { renderDocxModel, type RenderProgress } from "./render";

export type BuiltinResult = {
  bytes: Uint8Array;
  pages: number;
  warnings: string[];
};

export type BuiltinOptions = {
  signal?: AbortSignal;
  maxPages?: number;
  onStage?: (progress: RenderProgress) => void;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
  };
};

/**
 * Genuine DOCX -> PDF conversion with the bundled renderer.
 *
 * Layout is computed from the OOXML itself (styles, numbering, tables, images,
 * sections, headers/footers). It is a real converter, not a mock: the bytes it
 * returns are the document that QUICKKIT previews and exports. Fidelity differs
 * from Microsoft Word/LibreOffice for advanced features, which is why every
 * result carries human-readable warnings.
 */
export async function convertDocxWithBuiltinEngine(
  bytes: Uint8Array,
  options: BuiltinOptions = {},
): Promise<BuiltinResult> {
  const { signal, maxPages = 1000, onStage, metadata } = options;
  signal?.throwIfAborted();
  onStage?.({ stage: "Reading DOCX package" });
  const model = parseDocxPackage(bytes);
  signal?.throwIfAborted();
  const paragraphs = model.sections.reduce(
    (sum, section) =>
      sum +
      section.blocks.reduce(
        (count, block) => count + (block.kind === "paragraph" ? 1 : 0),
        0,
      ),
    0,
  );
  onStage?.({
    stage: `Laying out ${paragraphs.toLocaleString("en-US")} paragraphs`,
  });
  const result = await renderDocxModel(model, {
    maxPages,
    onStage,
    signal,
    metadata,
  });
  signal?.throwIfAborted();
  if (
    result.bytes.length < 8 ||
    String.fromCharCode(...result.bytes.subarray(0, 5)) !== "%PDF-"
  )
    throw new Error("The renderer did not produce a valid PDF.");
  if (result.pages < 1)
    throw new Error("The renderer did not produce any pages.");
  return result;
}

export type { RenderProgress };
