import { NextResponse, type NextRequest } from "next/server";
import { authorizeFontAdmin } from "@/lib/fonts/admin-auth";
import { inspectFontBuffer } from "@/lib/fonts/inspect";
import { stageImport } from "@/lib/fonts/admin-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 16 * 1024 * 1024;
const ALLOWED = /\.(woff2|woff|ttf|otf)$/i;

/**
 * Verifies an uploaded font binary against real Devanagari text. With
 * `stage=true` the verified binary is also placed in the local publish queue
 * (never automatically public).
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeFontAdmin(request);
  if (!auth.ok) return auth.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Send the font as multipart form data." },
      { status: 400 },
    );
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "No font file was attached." },
      { status: 400 },
    );
  }
  if (!ALLOWED.test(file.name)) {
    return NextResponse.json(
      { ok: false, error: "Use a .woff2, .woff, .ttf or .otf file." },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Font files must be 16 MB or smaller." },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const report = inspectFontBuffer(buffer, file.name);
  let staged = null;
  let stageError: string | null = null;
  if (form.get("stage") === "true" && report.status !== "fail") {
    try {
      staged = await stageImport(buffer, file.name, report);
    } catch {
      stageError =
        "The font verified, but this deployment could not stage the binary. Download the report and import it through the pipeline.";
    }
  }

  return NextResponse.json(
    { ok: true, report, staged, stageError },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
