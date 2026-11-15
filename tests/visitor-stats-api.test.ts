import { beforeEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("../lib/visitor-analytics", () => ({
  readVisitorStats: vi.fn(),
  recordVisit: vi.fn(),
}));
import { GET, POST } from "../app/api/visitor-stats/route";
import { readVisitorStats, recordVisit } from "../lib/visitor-analytics";
const url = "http://localhost:3000/api/visitor-stats";
const valid = {
  visitorId: "ac6ca42c-9244-43b2-8ce3-fec7c7f28936",
  sessionId: "4030ce4c-75d0-4f34-a069-69e09eb1f014",
  activeMs: 20000,
};
beforeEach(() => vi.resetAllMocks());
const request = (data: unknown) =>
  new NextRequest(url, {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      host: "localhost:3000",
      "content-type": "application/json",
    },
    body: JSON.stringify(data),
  });

test.each([
  null,
  [],
  "bad",
  3,
  {},
  { ...valid, activeMs: -1 },
  { ...valid, activeMs: 1.5 },
  { ...valid, visitorId: { toString: null } },
  { ...valid, sessionId: { toString: 2 } },
  { ...valid, visitorId: [valid.visitorId] },
])("rejects malformed telemetry safely: %j", async (body) => {
  expect((await POST(request(body))).status).toBe(400);
  expect(recordVisit).not.toHaveBeenCalled();
});
test("a valid heartbeat is persisted, never caller-supplied totals", async () => {
  const response = await POST(request({ ...valid, visitors: 999999 }));
  expect(response.status).toBe(204);
  expect(recordVisit).toHaveBeenCalledWith(
    valid.visitorId,
    valid.sessionId,
    valid.activeMs,
  );
});
test("database errors fail closed with no-store", async () => {
  vi.mocked(readVisitorStats).mockRejectedValue(
    new Error("private DB details"),
  );
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ available: false });
  expect(response.headers.get("cache-control")).toBe("no-store");
});
test("chunked oversized bodies are stopped before fully buffering", async () => {
  let cancelled = false;
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("a".repeat(513)));
    },
    cancel() {
      cancelled = true;
    },
  });
  const req = new NextRequest(url, {
    method: "POST",
    headers: { origin: "http://localhost:3000", host: "localhost:3000" },
    body,
    duplex: "half",
  } as ConstructorParameters<typeof NextRequest>[1]);
  expect((await POST(req)).status).toBe(413);
  expect(cancelled).toBe(true);
});
