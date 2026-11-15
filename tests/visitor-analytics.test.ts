import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

let directory: string;
let analytics: typeof import("../lib/visitor-analytics");
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "quickkit-stats-"));
  vi.stubEnv("ANALYTICS_DATABASE_URL", `file:${join(directory, "stats.db")}`);
  vi.stubEnv("VERCEL", "");
  analytics = await import("../lib/visitor-analytics");
});
afterAll(async () => {
  analytics.analyticsDatabase().client.close();
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});
test("durable real counts, deduplication, active-time caps, expiry and identity binding", async () => {
  const t = Date.now();
  const a = randomUUID(),
    b = randomUUID(),
    s = randomUUID(),
    tab = randomUUID(),
    other = randomUUID();
  expect(await analytics.readVisitorStats(t)).toMatchObject({
    online: 0,
    visitors: 0,
    averageSeconds: 0,
  });
  await analytics.recordVisit(a, s, 0, t);
  await analytics.recordVisit(a, s, 20000, t + 20000);
  await analytics.recordVisit(a, s, 20000, t + 20000); // replay
  await analytics.recordVisit(a, tab, 0, t + 20000); // second tab, same browser
  expect(await analytics.readVisitorStats(t + 20000)).toMatchObject({
    online: 1,
    visitors: 1,
    averageSeconds: 10,
  });
  await analytics.recordVisit(b, other, 999999, t + 20000); // initial fabricated time ignored
  expect(await analytics.readVisitorStats(t + 20000)).toMatchObject({
    online: 2,
    visitors: 2,
    averageSeconds: 7,
  });
  await expect(analytics.recordVisit(b, s, 20000, t + 21000)).rejects.toThrow(
    "identity",
  );
  await analytics.recordVisit(a, s, 900000, t + 40000); // cannot credit > elapsed
  expect(await analytics.readVisitorStats(t + 40000)).toMatchObject({
    averageSeconds: 13,
  });
  expect(await analytics.readVisitorStats(t + 90000)).toMatchObject({
    online: 0,
    visitors: 2,
  });
  // Connection restart, as on another server instance: persistent totals survive.
  analytics.analyticsDatabase().client.close();
  vi.resetModules();
  analytics = await import("../lib/visitor-analytics");
  expect(await analytics.readVisitorStats(t + 90000)).toMatchObject({
    online: 0,
    visitors: 2,
    averageSeconds: 13,
  });
  await analytics.recordVisit(a, randomUUID(), 0, t + 86500000);
  const rows = await analytics
    .analyticsDatabase()
    .client.execute("SELECT * FROM analytics_sessions");
  expect(rows.rows).toHaveLength(1);
  expect(await analytics.readVisitorStats(t + 86500000)).toMatchObject({
    online: 1,
    visitors: 2,
    averageSeconds: 10,
  });
});
