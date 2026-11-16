import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ insert }));
  const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
  return { insert, from, rpc };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => ({ from: mocks.from, rpc: mocks.rpc }),
}));

import { POST } from "@/app/api/feedback/route";

function post(body: unknown) {
  return new NextRequest("http://localhost:3000/api/feedback", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
      "x-real-ip": "203.0.113.4",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://quickkit-test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "server-only-test-key");
  vi.stubEnv("SUPABASE_SUBMISSION_HMAC_SECRET", "h".repeat(32));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  mocks.insert.mockResolvedValue({ error: null });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
});

describe("POST /api/feedback with a star rating", () => {
  it("stores the rating, its options, the name and the message", async () => {
    const response = await POST(
      post({
        name: "Asha",
        message: "Everything I needed in one place.",
        rating: 5,
        tags: ["Easy to use", "Useful tools"],
        consent: true,
      }),
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.from).toHaveBeenCalledWith("quickkit_feedback_submissions");
    expect(mocks.insert).toHaveBeenCalledWith({
      name: "Asha",
      message: "Everything I needed in one place.",
      rating: 5,
      tags: ["Easy to use", "Useful tools"],
    });
  });

  it("accepts a rating on its own, without a name or a message", async () => {
    for (const body of [
      { rating: 4, consent: true },
      { name: "", message: "", rating: 4, tags: [], consent: true },
      { message: "   ", rating: 4, consent: true },
    ]) {
      mocks.insert.mockClear();
      const response = await POST(post(body));
      expect(response.status).toBe(201);
      expect(mocks.insert).toHaveBeenCalledWith({
        name: null,
        message: "",
        rating: 4,
        tags: [],
      });
    }
  });

  it("writes a plain message exactly as before, naming no rating column", async () => {
    const response = await POST(
      post({ name: "Asha", message: "Please add shortcuts.", consent: true }),
    );
    expect(response.status).toBe(201);
    expect(mocks.insert).toHaveBeenCalledWith({
      name: "Asha",
      message: "Please add shortcuts.",
    });
    const written = mocks.insert.mock.calls[0][0];
    expect("rating" in written).toBe(false);
    expect("tags" in written).toBe(false);
  });

  it("stores the tool chosen under About, with or without a rating", async () => {
    await POST(
      post({ message: "Merging was quick.", tool: "merge-pdf", consent: true }),
    );
    expect(mocks.insert).toHaveBeenLastCalledWith({
      name: null,
      message: "Merging was quick.",
      tool_slug: "merge-pdf",
    });
    const response = await POST(
      post({ rating: 2, tags: ["Too slow"], tool: "split-pdf", consent: true }),
    );
    expect(response.status).toBe(201);
    expect(mocks.insert).toHaveBeenLastCalledWith({
      name: null,
      message: "",
      rating: 2,
      tags: ["Too slow"],
      tool_slug: "split-pdf",
    });
  });

  it("treats an empty About as QUICKKIT overall and names no tool column", async () => {
    const response = await POST(
      post({ message: "Nice site.", tool: "", consent: true }),
    );
    expect(response.status).toBe(201);
    expect(mocks.insert).toHaveBeenCalledWith({
      name: null,
      message: "Nice site.",
    });
  });

  it.each([
    ["a tool that does not exist", "not-a-real-tool"],
    ["a tool that is not text", 7],
    ["a tool with markup", "<script>"],
    ["a null tool", null],
  ])("rejects %s without touching the database", async (_label, tool) => {
    const response = await POST(
      post({ message: "Hello.", rating: 5, tool, consent: true }),
    );
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("stores each chosen option once", async () => {
    const response = await POST(
      post({ rating: 2, tags: ["Too slow", "Too slow"], consent: true }),
    );
    expect(response.status).toBe(201);
    expect(mocks.insert.mock.calls[0][0].tags).toEqual(["Too slow"]);
  });

  it("uses the shared message limiter, once per submission", async () => {
    await POST(post({ rating: 5, consent: true }));
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "quickkit_consume_submission_limit",
      expect.objectContaining({
        p_scope: "feedback",
        p_bucket_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
  });

  it.each([
    ["nothing to say", { consent: true }],
    ["empty message and no rating", { message: "", consent: true }],
    ["rating of zero", { rating: 0, consent: true }],
    ["rating above five", { rating: 6, message: "Hi there", consent: true }],
    ["fractional rating", { rating: 4.5, consent: true }],
    ["rating as text", { rating: "5", consent: true }],
    ["rating as a boolean", { rating: true, consent: true }],
    [
      "options without a rating",
      { message: "Hi", tags: ["Too slow"], consent: true },
    ],
    ["an unknown option", { rating: 5, tags: ["Free money"], consent: true }],
    [
      "an improvement option on five stars",
      { rating: 5, tags: ["Too slow"], consent: true },
    ],
    [
      "a praise option on one star",
      { rating: 1, tags: ["Easy to use"], consent: true },
    ],
    [
      "options that are not a list",
      { rating: 5, tags: "Easy to use", consent: true },
    ],
    [
      "more options than allowed",
      {
        rating: 5,
        tags: [
          "Easy to use",
          "Useful tools",
          "Fast & smooth",
          "Beautiful design",
          "Easy to use",
        ],
        consent: true,
      },
    ],
    ["a message that is not text", { rating: 5, message: 42, consent: true }],
    [
      "a message over 180 characters",
      { rating: 5, message: "m".repeat(181), consent: true },
    ],
    [
      "a name over 35 characters",
      { rating: 5, name: "n".repeat(36), consent: true },
    ],
    ["missing consent", { rating: 5 }],
    ["consent that is not exactly true", { rating: 5, consent: "true" }],
    ["an unexpected field", { rating: 5, consent: true, status: "resolved" }],
    [
      "an attempt to set admin notes",
      { rating: 5, consent: true, internal_notes: "x" },
    ],
  ])("rejects %s without touching the database", async (_label, body) => {
    const response = await POST(post(body));
    expect(response.status).toBe(400);
    expect((await response.json()).ok).toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("says the feedback was not sent when the database refuses the row", async () => {
    // What happens if the rating migration has not been applied yet.
    mocks.insert.mockResolvedValueOnce({
      error: { code: "PGRST204", message: "column not found" },
    });
    const response = await POST(post({ rating: 5, consent: true }));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/not sent/i);
    expect(JSON.stringify(body)).not.toMatch(/PGRST|column/i);
  });

  it("refuses a rating from another origin", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/feedback", {
        method: "POST",
        headers: {
          origin: "https://attacker.example",
          "content-type": "application/json",
          "x-real-ip": "203.0.113.4",
        },
        body: JSON.stringify({ rating: 5, consent: true }),
      }),
    );
    expect(response.status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

describe("homepage rating migration", () => {
  const raw = readFileSync(
    new URL(
      "../supabase/migrations/202611160002_quickkit_feedback_rating.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const sql = raw.replace(/--.*$/gm, "").replace(/\s+/g, " ").trim();
  const statements = sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  it("runs as one transaction", () => {
    expect(statements[0]).toBe("begin");
    expect(statements.at(-1)).toBe("commit");
  });

  it("adds a nullable 1–5 rating and a bounded list of options", () => {
    expect(sql).toMatch(
      /add column rating smallint null check \(rating is null or rating between 1 and 5\)/i,
    );
    expect(sql).toMatch(
      /add column tags text\[\] not null default '\{\}'::text\[\] check \(cardinality\(tags\) <= 4\)/i,
    );
  });

  it("adds an optional tool slug with a shape check", () => {
    expect(sql).toMatch(/add column tool_slug text null/);
    expect(sql).toMatch(
      /tool_slug is null\s+or \(tool_slug ~ '\^\[a-z0-9\]\+\(-\[a-z0-9\]\+\)\*\$'/,
    );
    expect(sql).toMatch(/char_length\(tool_slug\) <= 100/);
  });

  it("lets the message be empty only when a rating is present", () => {
    expect(sql).toMatch(
      /drop constraint quickkit_feedback_submissions_message_check/i,
    );
    expect(sql).toMatch(
      /add constraint quickkit_feedback_submissions_message_check check \( char_length\(message\) <= 180 and \(char_length\(message\) >= 1 or rating is not null\) \)/i,
    );
    expect(sql).toMatch(
      /check \(rating is not null or cardinality\(tags\) = 0\)/i,
    );
  });

  it("touches only the feedback table and removes no data", () => {
    for (const statement of statements) {
      expect(statement).not.toMatch(
        /^(?:drop table|drop column|truncate|delete|update|drop policy|drop function|disable)\b/i,
      );
      expect(statement).not.toMatch(/drop column|disable row level security/i);
    }
    const tables = [...sql.matchAll(/public\.(quickkit_[a-z_]+)/g)].map(
      (match) => match[1],
    );
    expect(new Set(tables)).toEqual(new Set(["quickkit_feedback_submissions"]));
  });

  it("grants only the server role, and only INSERT on the three new columns", () => {
    const grants = statements.filter((statement) =>
      /^grant\b/i.test(statement),
    );
    expect(grants).toEqual([
      "grant insert (rating, tags, tool_slug) on public.quickkit_feedback_submissions to service_role",
    ]);
    expect(sql).not.toMatch(/\bto (?:anon|authenticated|public)\b/i);
  });
});
