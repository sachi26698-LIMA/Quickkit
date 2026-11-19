import { NextResponse, type NextRequest } from "next/server";
import { authorizeFontAdmin } from "@/lib/fonts/admin-auth";
import {
  readImportQueue,
  removeStagedImport,
  setStagedStatus,
} from "@/lib/fonts/admin-queue";
import { FontStoreReadOnlyError } from "@/lib/fonts/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authorizeFontAdmin(request);
  if (!auth.ok) return auth.response;
  const queue = await readImportQueue();
  return NextResponse.json(
    { ok: true, ...queue },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const auth = await authorizeFontAdmin(request);
  if (!auth.ok) return auth.response;
  let body: { id?: string; status?: string; remove?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON." },
      { status: 400 },
    );
  }
  if (typeof body.id !== "string") {
    return NextResponse.json(
      { ok: false, error: "Missing import id." },
      { status: 400 },
    );
  }

  try {
    if (body.remove) {
      const removed = await removeStagedImport(body.id);
      return NextResponse.json(
        { ok: removed },
        { status: removed ? 200 : 404 },
      );
    }
    if (!["approved", "rejected", "pending"].includes(body.status ?? "")) {
      return NextResponse.json(
        { ok: false, error: "Unknown status." },
        { status: 400 },
      );
    }
    const item = await setStagedStatus(
      body.id,
      body.status as "approved" | "rejected" | "pending",
    );
    if (!item) {
      return NextResponse.json(
        { ok: false, error: "Import not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    if (error instanceof FontStoreReadOnlyError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This deployment is read-only for the font queue. Export the queue and commit it instead.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "The import queue could not be updated." },
      { status: 500 },
    );
  }
}
