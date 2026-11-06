import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
  type Node as XmlNode,
} from "@xmldom/xmldom";
import { minify as minifyCssWithCsso } from "csso";
import { minify as minifyJavaScriptWithTerser } from "terser";
import initHtmlMinifier, {
  minify as minifyHtmlWithWasm,
} from "minify-html-wasm";

export const MAX_DEVELOPER_TEXT_LENGTH = 1_000_000;
export const MAX_MARKUP_FILE_BYTES = 1_000_000;

export const SAMPLE_HTML = `<!doctype html>\n<html>\n<head><title>QUICKKIT</title></head>\n<body><main><h1>Hello, world!</h1><p>Local tools, <strong>no uploads</strong>.</p></main></body>\n</html>`;
export const SAMPLE_CSS = `/* Card styles */\n.card {\n  color: #ffffff;\n  background-color: rgb(67, 56, 202);\n  margin: 0px 0px 16px 0px;\n}`;
export const SAMPLE_JAVASCRIPT = `function greet(name) {\n  const message = \`Hello, \${name}!\`;\n  return message;\n}\nconsole.log(greet("QUICKKIT"));`;
export const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>\n<catalog><tool id="json"><name>JSON Formatter</name><local>true</local></tool><tool id="hash"><name>Hash Generator</name><local>true</local></tool></catalog>`;

export function assertDeveloperInput(
  input: string,
  label = "Input",
  maxLength = MAX_DEVELOPER_TEXT_LENGTH,
): void {
  if (!input.trim()) throw new Error(`Enter ${label.toLowerCase()} first.`);
  if (input.length > maxLength) {
    throw new Error(
      `${label} is too large. Keep it below ${maxLength.toLocaleString()} characters.`,
    );
  }
}

export function utf8Size(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export type SizeStats = {
  beforeBytes: number;
  afterBytes: number;
  savedBytes: number;
  savedPercent: number;
};

export function compareSizes(before: string, after: string): SizeStats {
  const beforeBytes = utf8Size(before);
  const afterBytes = utf8Size(after);
  const savedBytes = beforeBytes - afterBytes;
  return {
    beforeBytes,
    afterBytes,
    savedBytes,
    savedPercent: beforeBytes ? (savedBytes / beforeBytes) * 100 : 0,
  };
}

function assertBalancedCss(source: string): void {
  const stack: { character: string; position: number }[] = [];
  let quote = "";
  let comment = false;
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    if (comment) {
      if (current === "*" && next === "/") {
        comment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (current === "\\") {
        index += 1;
        continue;
      }
      if (current === quote) quote = "";
      continue;
    }
    if (current === "/" && next === "*") {
      comment = true;
      index += 1;
      continue;
    }
    if (current === "'" || current === '"') {
      quote = current;
      continue;
    }
    if (current === "\\") {
      index += 1;
      continue;
    }
    if (current === "{" || current === "(" || current === "[") {
      stack.push({ character: current, position: index });
      continue;
    }
    if (current === "}" || current === ")" || current === "]") {
      const opening = stack.pop();
      const expected = current === "}" ? "{" : current === ")" ? "(" : "[";
      if (!opening || opening.character !== expected) {
        const before = source.slice(0, index);
        throw new Error(
          `Unmatched '${current}' in CSS at line ${before.split("\n").length}, column ${index - before.lastIndexOf("\n")}.`,
        );
      }
    }
  }
  if (quote) throw new Error("CSS contains an unclosed string literal.");
  if (comment) throw new Error("CSS contains an unclosed comment.");
  const opening = stack.at(-1);
  if (opening) {
    const before = source.slice(0, opening.position);
    throw new Error(
      `Unclosed '${opening.character}' in CSS at line ${before.split("\n").length}, column ${opening.position - before.lastIndexOf("\n")}.`,
    );
  }
}

export function minifyCss(source: string): string {
  assertDeveloperInput(source, "CSS");
  try {
    assertBalancedCss(source);
    const result = minifyCssWithCsso(source, {
      restructure: false,
      comments: "first-exclamation",
    });
    return result.css;
  } catch (error) {
    throw new Error(formatParserError(error, "Could not parse this CSS."));
  }
}

export async function minifyJavaScript(source: string): Promise<string> {
  assertDeveloperInput(source, "JavaScript");
  try {
    const result = await minifyJavaScriptWithTerser(source, {
      ecma: 2020,
      compress: { passes: 1 },
      mangle: true,
      format: { comments: /^!/ },
      sourceMap: false,
      module: false,
      toplevel: false,
    });
    return result.code ?? "";
  } catch (error) {
    throw new Error(
      formatParserError(error, "Could not parse this JavaScript."),
    );
  }
}

export async function formatHtml(
  source: string,
  options: { indent?: 2 | 4 | "\t" } = {},
): Promise<string> {
  assertDeveloperInput(source, "HTML");
  try {
    const [prettier, htmlPlugin, babelPlugin, estreePlugin, cssPlugin] =
      await Promise.all([
        import("prettier/standalone"),
        import("prettier/plugins/html"),
        import("prettier/plugins/babel"),
        import("prettier/plugins/estree"),
        import("prettier/plugins/postcss"),
      ]);
    return await prettier.format(source, {
      parser: "html",
      plugins: [htmlPlugin, babelPlugin, estreePlugin, cssPlugin],
      printWidth: 100,
      tabWidth: options.indent === 4 ? 4 : 2,
      useTabs: options.indent === "\t",
      singleAttributePerLine: false,
      htmlWhitespaceSensitivity: "css",
      endOfLine: "lf",
    });
  } catch (error) {
    throw new Error(formatParserError(error, "Could not format this HTML."));
  }
}

/**
 * The WASM asset is copied into `public` by the prepare:html-minifier script.
 * Loading it from this origin keeps processing offline and avoids an unsafe
 * Node-only minifier dependency in the browser bundle.
 */
let htmlMinifierReady: Promise<void> | null = null;

export function initializeHtmlMinifier(
  input?: Parameters<typeof initHtmlMinifier>[0],
): Promise<void> {
  if (!htmlMinifierReady) {
    if (!input && typeof window === "undefined") {
      return Promise.reject(
        new Error("The local HTML minifier is available in a browser only."),
      );
    }
    const wasmInput =
      input ?? new URL("/html-minifier/index_bg.wasm", window.location.href);
    htmlMinifierReady = initHtmlMinifier(wasmInput)
      .then(() => undefined)
      .catch((error: unknown) => {
        htmlMinifierReady = null;
        throw new Error(
          formatParserError(error, "Could not load the local HTML minifier."),
        );
      });
  }
  return htmlMinifierReady;
}

/**
 * The HTML5-aware WASM parser removes safe layout whitespace and comments.
 * Embedded JavaScript and CSS minification are explicitly disabled; markup is
 * returned as inert text and is never inserted into the live document.
 */
export async function minifyHtml(source: string): Promise<string> {
  assertDeveloperInput(source, "HTML");
  await initializeHtmlMinifier();
  try {
    const bytes = minifyHtmlWithWasm(new TextEncoder().encode(source), {
      keep_closing_tags: true,
      keep_html_and_head_opening_tags: true,
      keep_spaces_between_attributes: true,
      keep_comments: false,
      minify_css: false,
      minify_js: false,
      remove_bangs: false,
      remove_processing_instructions: false,
    });
    return new TextDecoder().decode(bytes);
  } catch (error) {
    throw new Error(formatParserError(error, "Could not minify this HTML."));
  }
}

function formatParserError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const location = error as Error & {
    line?: number;
    col?: number;
    column?: number;
    loc?: { line?: number; column?: number };
  };
  const line = location.line ?? location.loc?.line;
  const column = location.col ?? location.column ?? location.loc?.column;
  const message = error.message.trim() || fallback;
  if (line && column) return `${message} (line ${line}, column ${column})`;
  if (line) return `${message} (line ${line})`;
  return message;
}

const serializer = new XMLSerializer();
const XML_NODE_LIMIT = 50_000;
const XML_DEPTH_LIMIT = 128;

function firstTagEnd(source: string): number {
  let quote = "";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === quote) quote = "";
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === ">") {
      return index;
    }
  }
  return -1;
}

function xmlIndent(depth: number, indent: 2 | 4 | "\t"): string {
  return indent === "\t" ? "\t".repeat(depth) : " ".repeat(indent * depth);
}

function isXmlLayoutWhitespace(node: XmlNode): boolean {
  const value = node.nodeValue ?? "";
  return node.nodeType === 3 && !value.trim() && /[\r\n]/u.test(value);
}

function xmlHasMeaningfulText(node: XmlNode): boolean {
  const value = node.nodeValue ?? "";
  return (
    node.nodeType === 3 &&
    value.length > 0 &&
    (Boolean(value.trim()) || !/[\r\n]/u.test(value))
  );
}

function xmlHasPreserveSpace(element: XmlElement, inherited: boolean): boolean {
  const own = element.getAttribute("xml:space");
  if (own === "preserve") return true;
  if (own === "default") return false;
  return inherited;
}

function writeXmlNode(
  node: XmlNode,
  depth: number,
  indent: 2 | 4 | "\t",
  compact: boolean,
  inheritedPreserve = false,
): string {
  if (depth > XML_DEPTH_LIMIT) {
    throw new Error(
      `XML is too deeply nested. Use at most ${XML_DEPTH_LIMIT} levels.`,
    );
  }

  if (node.nodeType === 9 || node.nodeType === 11) {
    const children = Array.from(node.childNodes).filter(
      (child) => !isXmlLayoutWhitespace(child),
    );
    const lines = children
      .map((child) =>
        writeXmlNode(child, depth, indent, compact, inheritedPreserve),
      )
      .filter(Boolean);
    return compact ? lines.join("") : lines.join("\n");
  }

  if (node.nodeType !== 1) return serializer.serializeToString(node);

  const element = node as XmlElement;
  const preserve = xmlHasPreserveSpace(element, inheritedPreserve);
  const children = Array.from(element.childNodes);
  if (preserve || children.some(xmlHasMeaningfulText)) {
    return serializer.serializeToString(element);
  }

  const meaningfulChildren = children.filter(
    (child) => !isXmlLayoutWhitespace(child),
  );
  if (meaningfulChildren.length === 0)
    return serializer.serializeToString(element);

  const serialized = serializer.serializeToString(element);
  const tagEnd = firstTagEnd(serialized);
  if (tagEnd < 0) throw new Error("Could not serialize an XML element safely.");
  const openTag = serialized.slice(0, tagEnd + 1);
  if (/\/\s*>$/u.test(openTag)) return openTag;
  const closeTag = `</${element.nodeName}>`;
  const content = meaningfulChildren.map((child) =>
    writeXmlNode(child, depth + 1, indent, compact, preserve),
  );
  if (compact) return `${openTag}${content.join("")}${closeTag}`;
  return `${openTag}\n${content.map((line) => `${xmlIndent(depth + 1, indent)}${line}`).join("\n")}\n${xmlIndent(depth, indent)}${closeTag}`;
}

export function formatXml(
  source: string,
  options: { compact?: boolean; indent?: 2 | 4 | "\t" } = {},
): string {
  assertDeveloperInput(source, "XML");
  if (/<!\s*DOCTYPE\b/iu.test(source)) {
    throw new Error(
      "DOCTYPE declarations are not supported. This prevents external entity and entity-expansion risks.",
    );
  }
  if (source.length > MAX_DEVELOPER_TEXT_LENGTH) {
    throw new Error("XML is too large. Keep it below 1,000,000 characters.");
  }

  let nodeCount = 0;
  const parser = new DOMParser({
    locator: true,
    onError(level, message) {
      if (level === "warning") return;
      throw new Error(message);
    },
  });
  const document = parser.parseFromString(source, "application/xml");
  const visit = (node: XmlNode, depth: number) => {
    nodeCount += 1;
    if (nodeCount > XML_NODE_LIMIT) {
      throw new Error(
        `XML is too complex. Keep it below ${XML_NODE_LIMIT.toLocaleString()} nodes.`,
      );
    }
    if (depth > XML_DEPTH_LIMIT) {
      throw new Error(
        `XML is too deeply nested. Use at most ${XML_DEPTH_LIMIT} levels.`,
      );
    }
    for (const child of Array.from(node.childNodes)) visit(child, depth + 1);
  };
  visit(document, 0);
  return writeXmlNode(
    document,
    0,
    options.indent ?? 2,
    options.compact ?? false,
  );
}
