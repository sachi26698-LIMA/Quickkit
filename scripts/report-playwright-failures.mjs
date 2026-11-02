import { readFile } from "node:fs/promises";

const reportPath = "test-results/e2e-results.json";
let report;

try {
  report = JSON.parse(await readFile(reportPath, "utf8"));
} catch {
  console.log(
    `::warning::Playwright failure details are unavailable at ${reportPath}.`,
  );
  process.exit(0);
}

const failures = [];

function visitSuite(suite, parentTitles = []) {
  const titles = suite.title ? [...parentTitles, suite.title] : parentTitles;

  for (const spec of suite.specs ?? []) {
    const fullTitle = [...titles, spec.title].filter(Boolean).join(" › ");
    for (const test of spec.tests ?? []) {
      const result = test.results?.at(-1);
      if (
        !result ||
        result.status === "passed" ||
        result.status === "skipped" ||
        result.status === test.expectedStatus
      ) {
        continue;
      }

      const error = (result.errors ?? [])
        .map((item) => item.message)
        .filter(Boolean)
        .join(" | ")
        .replace(/\u001b\[[0-9;]*m/g, "")
        .replace(/\s+/g, " ")
        .slice(0, 4000);
      failures.push(
        `[${test.projectName ?? "unknown project"}] ${fullTitle}: ${error || result.status}`,
      );
    }
  }

  for (const child of suite.suites ?? []) visitSuite(child, titles);
}

for (const suite of report.suites ?? []) visitSuite(suite);

if (failures.length === 0) {
  console.log(
    "::warning::Playwright exited unsuccessfully, but the JSON report contained no unexpected failed tests.",
  );
} else {
  for (const failure of failures.slice(0, 20)) {
    const escaped = failure
      .replaceAll("%", "%25")
      .replaceAll("\r", "%0D")
      .replaceAll("\n", "%0A");
    console.log(`::error title=Playwright test failure::${escaped}`);
  }
  if (failures.length > 20) {
    console.log(
      `::warning::${failures.length - 20} additional Playwright failures were omitted from annotations.`,
    );
  }
}
