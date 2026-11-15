import { NextResponse, type NextRequest } from "next/server";
import {
  parseContactSubmission,
  SubmissionError,
} from "@/lib/supabase/public-submission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await parseContactSubmission(request);
    return NextResponse.json(
      { ok: true },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const status =
      error instanceof SubmissionError
        ? {
            invalid: 400,
            forbidden: 403,
            rate_limited: 429,
            unavailable: 503,
          }[error.code]
        : 503;
    return NextResponse.json(
      {
        ok: false,
        error:
          status === 400
            ? "Check the fields and consent, then try again."
            : status === 403
              ? "This request could not be accepted."
              : status === 429
                ? "Too many messages were sent. Please wait and try again later."
                : "The contact service is temporarily unavailable. Your message was not saved; please use the published email address instead.",
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
