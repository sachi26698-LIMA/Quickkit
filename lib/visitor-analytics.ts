import { createClient, type Client } from "@libsql/client";
import { createHash } from "node:crypto";

export type VisitorStats = {
  online: number;
  visitors: number;
  averageSeconds: number;
  since: string;
};
let client: Client | undefined;
let ready: Promise<unknown> | undefined;

export function analyticsDatabase() {
  const url = process.env.ANALYTICS_DATABASE_URL;
  if (!url || (process.env.VERCEL && url.startsWith("file:")))
    throw new Error("Persistent analytics database is not configured");
  if (!client) {
    client = createClient({
      url,
      authToken: process.env.ANALYTICS_DATABASE_TOKEN,
    });
    ready = client.batch(
      [
        `CREATE TABLE IF NOT EXISTS analytics_totals (id INTEGER PRIMARY KEY CHECK(id=1), visitors INTEGER NOT NULL DEFAULT 0, visits INTEGER NOT NULL DEFAULT 0, active_ms INTEGER NOT NULL DEFAULT 0, since TEXT NOT NULL)`,
        `INSERT OR IGNORE INTO analytics_totals(id,since) VALUES(1,datetime('now'))`,
        `CREATE TABLE IF NOT EXISTS analytics_visitors (id TEXT PRIMARY KEY)`,
        `CREATE TABLE IF NOT EXISTS analytics_sessions (id TEXT PRIMARY KEY, visitor TEXT NOT NULL, last_seen INTEGER NOT NULL, reported_ms INTEGER NOT NULL DEFAULT 0, credited_ms INTEGER NOT NULL DEFAULT 0)`,
        `CREATE INDEX IF NOT EXISTS analytics_last_seen ON analytics_sessions(last_seen)`,
      ],
      "write",
    );
  }
  return { client, ready: ready! };
}
const hash = (id: string) => createHash("sha256").update(id).digest("hex");

/** Visible-tab time, server-capped; no URL, IP, user agent or file data stored. */
export async function recordVisit(
  visitorId: string,
  sessionId: string,
  activeMs: number,
  now = Date.now(),
) {
  const { client, ready } = analyticsDatabase();
  await ready;
  const tx = await client.transaction("write");
  try {
    const visitor = hash(visitorId),
      session = hash(sessionId);
    const inserted = await tx.execute({
      sql: "INSERT OR IGNORE INTO analytics_visitors(id) VALUES(?)",
      args: [visitor],
    });
    const previous = await tx.execute({
      sql: "SELECT * FROM analytics_sessions WHERE id=?",
      args: [session],
    });
    const row = previous.rows[0];
    if (row && row.visitor !== visitor)
      throw new Error("Session identity mismatch");
    // Do not credit hidden-tab gaps, repeated payloads, or a fabricated initial duration.
    const delta = row
      ? Math.max(
          0,
          Math.min(
            activeMs - Number(row.reported_ms),
            now - Number(row.last_seen),
            30000,
          ),
        )
      : 0;
    await tx.execute({
      sql: `INSERT INTO analytics_sessions(id,visitor,last_seen,reported_ms,credited_ms) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET last_seen=excluded.last_seen,reported_ms=MAX(reported_ms,excluded.reported_ms),credited_ms=credited_ms+excluded.credited_ms`,
      args: [session, visitor, now, activeMs, delta],
    });
    await tx.execute({
      sql: "UPDATE analytics_totals SET visitors=visitors+?,visits=visits+?,active_ms=active_ms+? WHERE id=1",
      args: [inserted.rowsAffected, row ? 0 : 1, delta],
    });
    await tx.execute({
      sql: "DELETE FROM analytics_sessions WHERE last_seen < ?",
      args: [now - 86400000],
    });
    await tx.commit();
  } finally {
    tx.close();
  }
}

export async function readVisitorStats(
  now = Date.now(),
): Promise<VisitorStats> {
  const { client, ready } = analyticsDatabase();
  await ready;
  const results = await client.batch(
    [
      {
        sql: "SELECT COUNT(DISTINCT visitor) AS online FROM analytics_sessions WHERE last_seen >= ?",
        args: [now - 45000],
      },
      "SELECT * FROM analytics_totals WHERE id=1",
    ],
    "read",
  );
  const row = results[1].rows[0];
  return {
    online: Number(results[0].rows[0].online),
    visitors: Number(row.visitors),
    averageSeconds: Number(row.visits)
      ? Math.round(Number(row.active_ms) / Number(row.visits) / 1000)
      : 0,
    since: String(row.since),
  };
}
