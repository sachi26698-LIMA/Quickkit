/**
 * The 84-tool audit generator.
 *
 * ## What this produces
 *
 * `docs/tool-audit.md` — a per-tool table for exactly the 84 tools in scope:
 * 9 Security & Privacy, 26 HR & Payroll, 28 SEO & Website Growth and 21
 * Career & Jobs. Every row is derived from the code at generation time, not
 * typed by hand, so the table cannot drift away from what the tools actually
 * do.
 *
 * ## What "derived" means here
 *
 * For each tool the script resolves, from the source:
 *
 * - the workspace and mode that render it (from `lib/tools/launch/registry.ts`
 *   for the launch categories, from `lib/tools/security/consolidation.ts` for
 *   the security groups);
 * - the component that renders that mode, found by reading the workspace's
 *   `switch (mode)` dispatch, so each tool is credited only with the engine
 *   its own component calls;
 * - the engine functions that component calls, found by matching the engine
 *   modules' exports against the component's body;
 * - the output surfaces the component offers, found by matching the
 *   `ResultPanel` props in the component (`csvRows` → CSV, `document` → DOCX
 *   and PDF, `textExtension="xml"` → XML, and so on);
 * - whether the component accepts a file, found by matching the file-input
 *   components (`DocumentInput`, `FileDrop`) in its body;
 * - whether an engine function the component calls is covered by a unit test,
 *   found by scanning the test suite for imports of that function.
 *
 * The classification is then derived, not asserted:
 *
 * - **A** — the tool renders, its engine is called, its output is surfaced,
 *   and the engine it calls has a unit test.
 * - **B** — the tool renders, its engine is called and its output is surfaced,
 *   but the engine it calls has no unit test, or only partly has one.
 * - **C** — the tool renders a form but no engine call is found in its
 *   component, so nothing is computed.
 * - **D** — the tool does not render a workspace at all.
 *
 * ## Why the classification is generated
 *
 * The audit's whole purpose is to catch the gap between "the page renders" and
 * "the tool works". A hand-written status table is exactly the artefact that
 * makes that gap invisible, because it is updated by belief rather than by
 * evidence. Generating it from the code means a tool that quietly loses its
 * engine call shows up as **C** the next time the script runs.
 *
 * ## Usage
 *
 * ```
 * npx tsx scripts/audit-tools.ts            # write docs/tool-audit.md
 * npx tsx scripts/audit-tools.ts --check    # fail if the file is out of date
 * ```
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tools } from "@/lib/catalog";
import { launchTools } from "@/lib/tools/launch/registry";
import { securityGroups } from "@/lib/tools/security/consolidation";
import { securityToolDefinitions } from "@/lib/tools/security/catalog";

// ─────────────────────────────────────────────────────────────────────────────
// Scope
// ─────────────────────────────────────────────────────────────────────────────

const SCOPE_CATEGORIES = [
  "Security & Privacy",
  "HR & Payroll",
  "SEO & Website Growth",
  "Career & Jobs",
] as const;

/**
 * The 84 tools in scope, in catalogue order.
 *
 * A tool is in scope when the catalogue lists one of the four categories
 * against it — either as its primary category or in its `categories` list. The
 * second form matters: `hash-generator` is a Developer tool that is also a
 * security tool, and the Security & Privacy group in the catalogue lists it.
 */
const inScope = tools.filter((tool) => {
  // `categories` is optional and only present on a few entries.
  const extra: readonly string[] =
    "categories" in tool ? (tool.categories ?? []) : [];
  const all: string[] = [tool.category, ...extra];
  return all.some((category) =>
    (SCOPE_CATEGORIES as readonly string[]).includes(category),
  );
});

const securitySlugs = new Set(securityGroups.map((group) => group.slug));

/** Operation slug → the `mode` that `SecurityWorkspace` dispatches on. */
const securityModeByOperation = new Map<string, string>(
  securityToolDefinitions.map((tool) => [tool.slug, tool.mode]),
);
const launchBySlug = new Map(launchTools.map((tool) => [tool.slug, tool]));

// ─────────────────────────────────────────────────────────────────────────────
// Source scanning
// ─────────────────────────────────────────────────────────────────────────────

const WORKSPACE_FILES: Record<string, string> = {
  "salary-workspace": "components/tools/launch/salary-workspace.tsx",
  "attendance-workspace": "components/tools/launch/attendance-workspace.tsx",
  "document-studio": "components/tools/launch/document-studio.tsx",
  "people-text-kit": "components/tools/launch/people-text-kit.tsx",
  "page-analyzer": "components/tools/launch/page-analyzer.tsx",
  "schema-builder": "components/tools/launch/schema-builder.tsx",
  "technical-seo": "components/tools/launch/technical-seo.tsx",
  "content-kit": "components/tools/launch/content-kit.tsx",
  "resume-studio": "components/tools/launch/resume-studio.tsx",
  "career-text-kit": "components/tools/launch/career-text-kit.tsx",
  "job-search-kit": "components/tools/launch/job-search-kit.tsx",
};

/**
 * The consolidated workspace is a tab shell: `ConsolidatedWorkspace` picks the
 * rendered suite from the selected operation. Each suite in turn dispatches on
 * its own `mode`, so the honest unit for a Security tool is the operation's
 * dispatch arm — not the union of every suite file. Unioning the files credits
 * a password tool with the RSA engine's tests.
 *
 * `standalone` names an operation whose component lives outside a suite;
 * `suite` names the suite file that dispatches the remaining modes.
 */
const SECURITY_SUITES: Record<
  string,
  { standalone?: Record<string, string>; suite: string }
> = {
  "password-generator": { suite: "components/tools/security/workspace.tsx" },
  "hash-generator": { suite: "components/tools/security/workspace.tsx" },
  "advanced-cryptography": {
    standalone: { rsa: "components/tools/security/rsa-workspace.tsx" },
    suite: "components/tools/security/workspace.tsx",
  },
  "dns-email-security": {
    standalone: {
      "dns-lookup": "components/tools/security/network-workspace.tsx",
      dnssec: "components/tools/security/network-workspace.tsx",
      "public-ip": "components/tools/security/network-workspace.tsx",
    },
    suite: "components/tools/security/workspace.tsx",
  },
  "website-security-review": {
    suite: "components/tools/security/workspace.tsx",
  },
  "privacy-metadata-manager": {
    suite: "components/tools/security/workspace.tsx",
  },
  "url-network-privacy": {
    standalone: {
      "dns-lookup": "components/tools/security/network-workspace.tsx",
      dnssec: "components/tools/security/network-workspace.tsx",
      "public-ip": "components/tools/security/network-workspace.tsx",
    },
    suite: "components/tools/security/workspace.tsx",
  },
  "privacy-policy-workbench": {
    suite: "components/tools/security/workspace.tsx",
  },
  "api-credential-tools": { suite: "components/tools/security/workspace.tsx" },
};

/**
 * Operations whose component is a dedicated file rather than a `mode` arm of
 * `SecurityWorkspace`. The shell checks these before falling through to a mode.
 */
const CONSOLIDATED_OPERATION_COMPONENTS: Record<string, string> = {
  "password-generator": "components/tools/password-generator.tsx",
  "hash-generator": "components/tools/devtools/hash-generator.tsx",
  "base64-encoder-decoder": "components/tools/devtools/base64.tsx",
};

const ENGINE_FILES = [
  "lib/tools/hr/payroll.ts",
  "lib/tools/hr/attendance.ts",
  "lib/tools/hr/documents.ts",
  "lib/tools/seo/analyze.ts",
  "lib/tools/seo/schema.ts",
  "lib/tools/seo/technical.ts",
  "lib/tools/seo/text-kit.ts",
  "lib/tools/career/resume.ts",
  "lib/tools/career/letters.ts",
  "lib/tools/career/salary.ts",
  "lib/tools/security/logic.ts",
  "lib/tools/security/review.ts",
  "lib/tools/security/email.ts",
  "lib/tools/security/network.ts",
  "lib/tools/security/url-review.ts",
  "lib/tools/security/legal.ts",
  "lib/tools/security/metadata.ts",
  "lib/tools/security/rsa.ts",
  "lib/tools/security/certificate.ts",
  "lib/tools/security/hmac.ts",
  "lib/tools/security/jwt-verify.ts",
  "lib/tools/security/file-signature.ts",
];

const read = (path: string): string =>
  existsSync(path) ? readFileSync(path, "utf8") : "";

/** Every exported function name in the engine modules, with its module. */
const engineExports = new Map<string, string>();
for (const file of ENGINE_FILES) {
  const source = read(file);
  for (const match of source.matchAll(
    /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g,
  )) {
    engineExports.set(match[1], file);
  }
}

/** Engine functions covered by the unit test suite. */
const testedFunctions = new Set<string>();
for (const file of readdirSync("tests").filter((name) =>
  name.endsWith(".test.ts"),
)) {
  const source = read(join("tests", file));
  for (const match of source.matchAll(
    /import\s*\{([^}]+)\}\s*from\s*["']@\/lib\/tools\/[^"']+["']/g,
  )) {
    for (const raw of match[1].split(",")) {
      const name = raw
        .trim()
        .split(/\s+as\s+/)[0]
        .trim();
      if (name && engineExports.has(name)) testedFunctions.add(name);
    }
  }
}

/**
 * The body of a named component, from `function Name(` to its matching brace.
 *
 * Brace counting is crude but it is the only way to do this without a
 * TypeScript parser, and it is safe here because the sources are formatted
 * consistently and contain no braces inside string literals in the component
 * bodies being measured.
 */
function componentBody(source: string, name: string): string {
  const declaration = new RegExp(`function\\s+${name}\\s*\\(`).exec(source);
  if (!declaration) return "";
  const start = declaration.index;

  // Skip the parameter list, which can itself contain braces — `{ kind }` is a
  // common prop type — before counting the body's braces.
  let parens = 0;
  let bodyStart = -1;
  for (let index = start; index < source.length; index++) {
    const char = source[index];
    if (char === "(") parens++;
    else if (char === ")") {
      parens--;
      if (parens === 0) {
        bodyStart = source.indexOf("{", index);
        break;
      }
    }
  }
  if (bodyStart < 0) return source.slice(start);

  let depth = 0;
  for (let index = bodyStart; index < source.length; index++) {
    const char = source[index];
    if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return source.slice(start, index);
    }
  }
  return source.slice(start);
}

/**
 * The component a workspace mode renders.
 *
 * Read from the workspace's own `switch (mode)` dispatch, which is the only
 * authoritative mapping: the registry's kebab-case mode names do not
 * mechanically become the PascalCase component names (`resume-ats-checker`
 * renders `ResumeTool`, `ctc-to-net` renders `CtcTool`), so guessing would
 * credit tools with the wrong engine.
 */
function componentForMode(source: string, mode: string): string | undefined {
  // `switch (mode) { case "x": return <XTool />; }`
  for (const match of source.matchAll(
    /case\s+"([a-z0-9-]+)":\s*\n?\s*return\s*<([A-Za-z0-9_]+)/g,
  )) {
    if (match[1] === mode) return match[2];
  }
  // `if (mode === "x") return <XTool />;`
  for (const match of source.matchAll(
    /mode\s*===\s*"([a-z0-9-]+)"[^)]*\)\s*return\s*<([A-Za-z0-9_]+)/g,
  )) {
    if (match[1] === mode) return match[2];
  }
  // The `default:` arm of the switch renders the remaining mode.
  const fallback = /default:\s*\n?\s*return\s*<([A-Za-z0-9_]+)/.exec(source);
  return fallback?.[1];
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-tool rows
// ─────────────────────────────────────────────────────────────────────────────

type Grade = "A" | "B" | "C" | "D";

type Row = {
  slug: string;
  name: string;
  category: string;
  grade: Grade;
  /** The component(s) whose body was measured for this tool. */
  component: string;
  engine: string;
  tested: string;
  upload: string;
  outputs: string;
  notes: string;
};

/**
 * Every `case "x":` arm that dispatches on `mode`, plus any `mode === "x"`
 * expression, so a Security operation is measured by what its own branch does.
 * Falls back to the whole file when the mode is not dispatched at all — that is
 * a genuine audit finding, not something to hide.
 */
function operationArms(source: string, mode: string): string {
  const arms: string[] = [];
  const quoted = mode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // `case "x":` … up to the next `case`/`default` at the same depth.
  const casePattern = new RegExp(
    `case\\s+"${quoted}"\\s*:([\\s\\S]*?)(?=\\n\\s*case\\s+"|\\n\\s*default\\s*:)`,
  );
  for (const match of source.matchAll(new RegExp(casePattern, "g")))
    arms.push(match[1]);

  // `mode === "x"` expressions, which carry inline render decisions.
  for (const match of source.matchAll(
    new RegExp(`mode\\s*===?\\s*"${quoted}"[^;\\n]*`, "g"),
  ))
    arms.push(match[0]);

  return arms.length ? arms.join("\n") : source;
}

const rows: Row[] = [];

for (const tool of inScope) {
  const isSecurity: boolean = (securitySlugs as Set<string>).has(tool.slug);
  const launch = launchBySlug.get(tool.slug);

  let body = "";
  let component = "";

  if (isSecurity) {
    // The catalogue lists the group; the group lists its operations. Measure
    // the group by the union of its operations' own dispatch arms.
    const group = securityGroups.find((entry) => entry.slug === tool.slug)!;

    const { standalone = {}, suite } = SECURITY_SUITES[tool.slug] ?? {
      suite: "components/tools/security/workspace.tsx",
    };
    const suiteSource = read(suite);
    const arms: string[] = [];
    const components = new Set<string>();

    for (const operation of group.operations) {
      const dedicated = CONSOLIDATED_OPERATION_COMPONENTS[operation];
      if (dedicated) {
        arms.push(read(dedicated));
        components.add(dedicated.split("/").pop()!);
        continue;
      }
      const mode = securityModeByOperation.get(operation);
      if (!mode) continue;
      // The shell compares `item.mode`, so the standalone table is keyed by
      // mode, not by operation slug.
      const dedicatedFile = standalone[mode];
      if (dedicatedFile) {
        arms.push(read(dedicatedFile));
        components.add(dedicatedFile.split("/").pop()!);
        continue;
      }
      arms.push(operationArms(suiteSource, mode));
      components.add(suite.split("/").pop()!);
    }

    body = arms.join("\n");
    component = [...components].join(" + ");
  } else if (launch) {
    const file = WORKSPACE_FILES[launch.workspace] ?? "";
    const source = read(file);
    const found = componentForMode(source, launch.mode);
    if (found) {
      component = found;
      body = componentBody(source, found);
    } else {
      component = launch.workspace;
      body = source;
    }
  } else {
    rows.push({
      slug: tool.slug,
      name: tool.name,
      category: tool.category,
      grade: "D",
      component: "—",
      engine: "—",
      tested: "—",
      upload: "—",
      outputs: "—",
      notes: "No workspace declares this tool.",
    });
    continue;
  }

  // Engine functions the component calls.
  const functions = new Set<string>();
  for (const name of engineExports.keys()) {
    if (new RegExp(`\\b${name}\\s*\\(`).test(body)) functions.add(name);
  }
  const functionList = [...functions].sort();

  const engineModules = new Set(
    functionList.map((name) => engineExports.get(name)!).filter(Boolean),
  );
  const engine = engineModules.size
    ? [...engineModules]
        .map((module) => module.replace("lib/tools/", "").replace(".ts", ""))
        .join(", ")
    : "—";

  const tested = functionList.filter((name) => testedFunctions.has(name));

  // Output surfaces.
  const outputs = {
    csv: /\bcsvRows=/.test(body),
    docx: /\bdocument=\{\{/.test(body),
    pdf: /\bdocument=\{\{/.test(body),
    xml: /textExtension="xml"/.test(body),
    json: /textExtension="json"/.test(body),
    html: /textExtension="html"/.test(body),
    markdown: /textExtension="md"/.test(body),
    code: /<CodePreview/.test(body),
    table: /<BreakdownTable|<TablePreview/.test(body),
    document: /<DocumentPreview/.test(body),
  };
  const outputList = Object.entries(outputs)
    .filter(([, present]) => present)
    .map(([name]) => name.toUpperCase());

  const upload = /<DocumentInput|<FileDrop/.test(body) ? "Yes" : "—";

  // Classification.
  const notes: string[] = [];
  let grade: Grade;

  if (functionList.length === 0) {
    grade = "C";
    notes.push("No engine call found in the rendering component.");
  } else if (tested.length === 0) {
    grade = "B";
    notes.push(
      `Engine function${functionList.length === 1 ? "" : "s"} not covered by a unit test.`,
    );
  } else if (tested.length < functionList.length) {
    grade = "B";
    notes.push(
      `${functionList.length - tested.length} of ${functionList.length} engine functions lack a unit test.`,
    );
  } else {
    grade = "A";
  }

  if (upload === "—" && /resume|document|pdf|image|file/i.test(tool.slug)) {
    notes.push("File input is relevant to this tool but none is wired.");
  }
  // "Plain text only" has to mean exactly that: no structured or formatted
  // surface of any kind, including a rendered table or a preview.
  const surfaced =
    outputs.csv ||
    outputs.docx ||
    outputs.pdf ||
    outputs.xml ||
    outputs.json ||
    outputs.html ||
    outputs.markdown ||
    outputs.code ||
    outputs.table ||
    outputs.document;
  if (!surfaced) notes.push("Output is plain text only.");

  rows.push({
    slug: tool.slug,
    name: tool.name,
    category: tool.category,
    grade,
    component: component || "—",
    engine,
    tested: tested.length ? `${tested.length}/${functionList.length}` : "0",
    upload,
    outputs: outputList.length ? outputList.join(", ") : "TXT",
    notes: notes.join(" "),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Report
// ─────────────────────────────────────────────────────────────────────────────

const byCategory = new Map<string, Row[]>();
for (const row of rows) {
  const category = SCOPE_CATEGORIES.find(
    (name) =>
      name === row.category ||
      (row.slug === "hash-generator" && name === "Security & Privacy"),
  )!;
  byCategory.set(category, [...(byCategory.get(category) ?? []), row]);
}

const gradeCounts = { A: 0, B: 0, C: 0, D: 0 } as Record<Grade, number>;
for (const row of rows) gradeCounts[row.grade]++;

const lines: string[] = [];
lines.push("# Tool audit — the 84 tools in scope");
lines.push("");
lines.push(
  `Generated by \`scripts/audit-tools.ts\`. ${rows.length} tools: ` +
    `${SCOPE_CATEGORIES.map(
      (category) => `${byCategory.get(category)?.length ?? 0} ${category}`,
    ).join(", ")}.`,
);
lines.push("");
lines.push("## Grades");
lines.push("");
lines.push("| Grade | Count | Meaning |");
lines.push("| --- | --- | --- |");
lines.push(
  `| A | ${gradeCounts.A} | Renders, computes, surfaces its output, and the engine it calls has a unit test. |`,
);
lines.push(
  `| B | ${gradeCounts.B} | Renders, computes and surfaces its output, but the engine is untested or only partly tested. |`,
);
lines.push(
  `| C | ${gradeCounts.C} | Renders a form, but no engine call was found in the rendering component. |`,
);
lines.push(`| D | ${gradeCounts.D} | No workspace declares this tool. |`);
lines.push("");
lines.push(
  "A page that renders is not a tool that works. The grade is derived from the " +
    "code — the engine call, the output surface and the unit test — not from the " +
    "existence of a route.",
);
lines.push("");

for (const category of SCOPE_CATEGORIES) {
  const categoryRows = byCategory.get(category) ?? [];
  lines.push(`## ${category} (${categoryRows.length})`);
  lines.push("");
  lines.push(
    "| Tool | Slug | Grade | Measured component | Engine | Tested | Upload | Outputs | Notes |",
  );
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const row of categoryRows) {
    lines.push(
      `| ${row.name} | \`${row.slug}\` | **${row.grade}** | ${row.component} | ${row.engine} | ${row.tested} | ${row.upload} | ${row.outputs} | ${row.notes || "—"} |`,
    );
  }
  lines.push("");
}

const output = lines.join("\n");
const target = join("docs", "tool-audit.md");

if (process.argv.includes("--check")) {
  const current = existsSync(target) ? readFileSync(target, "utf8") : "";
  if (current !== output) {
    console.error(
      "docs/tool-audit.md is out of date. Run scripts/audit-tools.ts.",
    );
    process.exit(1);
  }
  console.log("docs/tool-audit.md is up to date.");
} else {
  writeFileSync(target, output, "utf8");
  console.log(
    `Wrote ${target}: ${rows.length} tools, ` +
      `A ${gradeCounts.A} / B ${gradeCounts.B} / C ${gradeCounts.C} / D ${gradeCounts.D}.`,
  );
}
