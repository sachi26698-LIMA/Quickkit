import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminSession, type AdminIdentity } from "./admin-auth";
import { getMasterAdminServiceClient } from "./master-admin";
import type { Json } from "./database.types";
import { hasSameOrigin } from "./request-origin";

export type AuthorizedAdmin = {
  admin: AdminIdentity;
  db: NonNullable<ReturnType<typeof getMasterAdminServiceClient>>;
};

export async function authorizeAdminApi(): Promise<
  { ok: true; context: AuthorizedAdmin } | { ok: false; response: NextResponse }
> {
  const result = await verifyAdminSession();
  if (result.status === "unauthenticated")
    return {
      ok: false,
      response: apiError(401, "Sign in as an authorized administrator."),
    };
  if (result.status === "forbidden")
    return {
      ok: false,
      response: apiError(403, "Administrator access is not permitted."),
    };
  if (result.status === "allowlist_not_configured")
    return {
      ok: false,
      response: apiError(
        503,
        "Administrator email allowlist is not configured.",
      ),
    };
  if (result.status === "supabase_not_configured")
    return {
      ok: false,
      response: apiError(503, "Supabase authentication is not configured."),
    };
  if (result.status !== "authorized")
    return {
      ok: false,
      response: apiError(503, "Administrator authentication is unavailable."),
    };
  const db = getMasterAdminServiceClient();
  if (!db)
    return {
      ok: false,
      response: apiError(
        503,
        "Administrator data services are not configured.",
      ),
    };
  return { ok: true, context: { admin: result.admin, db } };
}

export function apiError(status: number, message: string) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function noStoreJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
  });
}

export function assertSameOrigin(request: NextRequest): boolean {
  return hasSameOrigin(request);
}

export async function parseJsonObject(
  request: Request,
): Promise<Record<string, unknown> | null> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("application/json")
  )
    return null;
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length < 0 || length > 32_768)
      return null;
  }
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 32_768) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const parsed: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return null;
    return parsed as Record<string, unknown>;
  } catch {
    try {
      await reader.cancel();
    } catch {
      // The stream may already be closed or errored.
    }
    return null;
  }
}

export function normalizeText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length <= max ? normalized : null;
}

export async function auditAdminAction(
  context: AuthorizedAdmin,
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, unknown> = {},
) {
  // Only allowlisted, non-sensitive metadata is accepted. Never pass form bodies,
  // submission text, passwords, tokens, or secret values to this function.
  const { error } = await context.db.from("quickkit_admin_activity").insert({
    actor_id: context.admin.id,
    actor_email: context.admin.email,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: details as Json,
  });
  return !error;
}
