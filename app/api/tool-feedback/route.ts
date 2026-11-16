import { NextResponse, type NextRequest } from "next/server";
import {
  parseToolFeedbackSubmission,
  SubmissionError,
} from "@/lib/supabase/public-submission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stores one star rating for a tool. See `parseToolFeedbackSubmission`. */
export async function POST(request: NextRequest) {
  try {
    await parseToolFeedbackSubmission(request);
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
            ? "Check the rating, then try again."
            : status === 403
              ? "This request could not be accepted."
              : status === 429
                ? "Too many ratings were sent. Please wait and try again later."
                : "The feedback service is temporarily unavailable. Your rating was not sent.",
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
