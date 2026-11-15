import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import type { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "./admin";
import { hasSameOrigin } from "./request-origin";

export type SubmissionErrorCode =
  "invalid" | "forbidden" | "rate_limited" | "unavailable";

export class SubmissionError extends Error {
  constructor(readonly code: SubmissionErrorCode) {
    super(code);
    this.name = "SubmissionError";
  }
}

const MAX_BODY_BYTES = 16_384;
const CONTACT_FIELDS = new Set([
  "name",
  "email",
  "subject",
  "message",
  "consent",
]);
const FEEDBACK_FIELDS = new Set(["name", "message", "consent"]);

function cleanText(value: unknown, maximum: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
  if (!cleaned || cleaned.length > maximum) return null;
  return cleaned;
}

async function readJson(
  request: NextRequest,
  allowedFields: ReadonlySet<string>,
): Promise<Record<string, unknown>> {
  if (!hasSameOrigin(request)) throw new SubmissionError("forbidden");

  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json") throw new SubmissionError("invalid");

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const announced = Number(contentLength);
    if (
      !Number.isSafeInteger(announced) ||
      announced < 0 ||
      announced > MAX_BODY_BYTES
    ) {
      throw new SubmissionError("invalid");
    }
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    throw new SubmissionError("invalid");
  }
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES)
    throw new SubmissionError("invalid");

  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("bad body");
    const body = value as Record<string, unknown>;
    if (Object.keys(body).some((key) => !allowedFields.has(key)))
      throw new Error("unexpected field");
    return body;
  } catch {
    throw new SubmissionError("invalid");
  }
}

function getIngressAddress(request: NextRequest): string {
  // Vercel's edge supplies x-real-ip. The final X-Forwarded-For entry is a
  // fallback for local/compatible deployments; verify this trust boundary on
  // the target host. The raw address is never sent to Supabase or logged.
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp && isIP(realIp)) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  const forwardedIp = forwarded?.split(",").at(-1)?.trim();
  if (forwardedIp && isIP(forwardedIp)) return forwardedIp;

  throw new SubmissionError("unavailable");
}

async function enforceRateLimit(
  request: NextRequest,
  scope: "contact" | "feedback",
): Promise<void> {
  const client = getSupabaseAdminClient();
  const secret = process.env.SUPABASE_SUBMISSION_HMAC_SECRET?.trim();
  if (!client || !secret || Buffer.byteLength(secret, "utf8") < 32)
    throw new SubmissionError("unavailable");

  const bucketHash = createHmac("sha256", secret)
    .update(getIngressAddress(request).slice(0, 255))
    .digest("hex");
  const { data, error } = await client.rpc(
    "quickkit_consume_submission_limit",
    { p_scope: scope, p_bucket_hash: bucketHash },
  );
  if (error || typeof data !== "boolean")
    throw new SubmissionError("unavailable");
  if (!data) throw new SubmissionError("rate_limited");
}

export async function parseContactSubmission(request: NextRequest) {
  const body = await readJson(request, CONTACT_FIELDS);
  const name = cleanText(body.name, 100);
  const email = cleanText(body.email, 254)?.toLowerCase();
  const subject = cleanText(body.subject, 150);
  const message = cleanText(body.message, 5000);
  if (
    !name ||
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !subject ||
    !message ||
    message.length < 10 ||
    body.consent !== true
  ) {
    throw new SubmissionError("invalid");
  }

  await enforceRateLimit(request, "contact");
  const client = getSupabaseAdminClient();
  if (!client) throw new SubmissionError("unavailable");
  const { error } = await client.from("quickkit_contact_submissions").insert({
    name,
    email,
    subject,
    message,
  });
  if (error) throw new SubmissionError("unavailable");
}

export async function parseFeedbackSubmission(request: NextRequest) {
  const body = await readJson(request, FEEDBACK_FIELDS);
  const message = cleanText(body.message, 180);
  const name = body.name === undefined ? null : cleanText(body.name, 35);
  if (
    !message ||
    (body.name !== undefined && body.name !== "" && !name) ||
    body.consent !== true
  ) {
    throw new SubmissionError("invalid");
  }

  await enforceRateLimit(request, "feedback");
  const client = getSupabaseAdminClient();
  if (!client) throw new SubmissionError("unavailable");
  const { error } = await client
    .from("quickkit_feedback_submissions")
    .insert({ name, message });
  if (error) throw new SubmissionError("unavailable");
}
