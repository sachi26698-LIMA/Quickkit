/**
 * `npm run gsc:analyse -- <export.json>`
 *
 * Turns a real Search Console export into the Phase 3 action plan, and refuses
 * to run without one. There is deliberately no sample data and no fallback:
 * printing invented impressions would defeat the entire purpose of the report.
 *
 * Accepted shape (see docs/QUICKKIT_SEARCH_CONSOLE_DATA_REQUEST.md):
 *
 * {
 *   "siteUrl": "https://quickkit.live/",
 *   "current":  { "startDate": "...", "endDate": "...", "rows": [ ... ] },
 *   "previous": { ... },                 // optional
 *   "currentPages": { ... },             // optional
 *   "queryPagePairs": [ ... ]            // optional, needed for cannibalisation
 * }
 *
 * Each row: { key, clicks, impressions, ctr, position }
 */
import { readFileSync, existsSync } from "node:fs";
import { analyse, bucketByTool, THRESHOLDS } from "../lib/seo/gsc-analysis";
import type { GscInput } from "../lib/seo/gsc-analysis";
import { keywordClusters } from "../lib/seo/keyword-clusters";

const path = process.argv[2];

if (!path) {
  process.stderr.write(
    [
      "No export supplied.",
      "",
      "Search Console data cannot be fetched from this environment, so this",
      "command will not run without a real export. See:",
      "  docs/QUICKKIT_SEARCH_CONSOLE_DATA_REQUEST.md",
      "",
      "Usage: npm run gsc:analyse -- path/to/gsc-export.json",
      "",
    ].join("\n"),
  );
  process.exit(2);
}

if (!existsSync(path)) {
  process.stderr.write(`File not found: ${path}\n`);
  process.exit(2);
}

let input: GscInput;
try {
  input = JSON.parse(readFileSync(path, "utf8")) as GscInput;
} catch (error) {
  process.stderr.write(`Could not parse ${path}: ${String(error)}\n`);
  process.exit(2);
}

const problems: string[] = [];
if (!input.siteUrl) problems.push("missing `siteUrl`");
if (!input.current?.rows?.length)
  problems.push("`current.rows` is empty or missing");
for (const [index, row] of (input.current?.rows ?? []).entries()) {
  const missing = (
    ["key", "clicks", "impressions", "ctr", "position"] as const
  ).filter((field) => row[field] === undefined || row[field] === null);
  if (missing.length)
    problems.push(`current.rows[${index}] missing ${missing.join(", ")}`);
}
if (problems.length) {
  process.stderr.write(
    `Export is not usable:\n${problems.map((p) => `  - ${p}`).join("\n")}\n`,
  );
  process.exit(2);
}

const findings = analyse(input);
const clicks = input.current.rows.reduce((sum, row) => sum + row.clicks, 0);
const impressions = input.current.rows.reduce(
  (sum, row) => sum + row.impressions,
  0,
);
const toolsWithData = new Set(
  bucketByTool([
    ...(input.currentPages?.rows ?? []),
    ...input.current.rows,
  ]).byTool.keys(),
);

const lines: string[] = [];
lines.push("# Search Console analysis");
lines.push("");
lines.push(`Site: ${input.siteUrl}`);
lines.push(`Window: ${input.current.startDate} → ${input.current.endDate}`);
if (input.previous) {
  lines.push(
    `Compared with: ${input.previous.startDate} → ${input.previous.endDate}`,
  );
}
lines.push("");
lines.push("## Data coverage");
lines.push("");
lines.push(`- Rows analysed: **${input.current.rows.length}**`);
lines.push(`- Clicks: **${clicks.toLocaleString("en-GB")}**`);
lines.push(`- Impressions: **${impressions.toLocaleString("en-GB")}**`);
lines.push(
  `- Tools with at least one impression: **${toolsWithData.size} / ${keywordClusters.length}**`,
);
lines.push(
  `- Query→page pairs supplied: **${(input.queryPagePairs ?? []).length}**${input.queryPagePairs?.length ? "" : " (cannibalisation and intent-mismatch cannot be detected without these)"}`,
);
lines.push("");
lines.push("## Findings");
lines.push("");
if (!findings.length) {
  lines.push("No finding crossed the stated thresholds.");
} else {
  for (const finding of findings) {
    lines.push(`### ${finding.kind} — \`${finding.subject}\``);
    lines.push("");
    lines.push(`- **Basis:** ${finding.basis}`);
    lines.push(`- **Evidence:** ${finding.evidence}`);
    lines.push(`- **Reading:** ${finding.reading}`);
    lines.push(`- **Action:** ${finding.action}`);
    lines.push("");
  }
}
lines.push("## Thresholds used");
lines.push("");
lines.push("```json");
lines.push(JSON.stringify(THRESHOLDS, null, 2));
lines.push("```");

process.stdout.write(lines.join("\n") + "\n");
