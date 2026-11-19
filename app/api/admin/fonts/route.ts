import { NextResponse, type NextRequest } from "next/server";
import { authorizeFontAdmin } from "@/lib/fonts/admin-auth";
import {
  catalogue,
  readOverrides,
  type FontAdminStatus,
  type FontOverride,
  type FontOverridesFile,
} from "@/lib/fonts/catalogue";
import {
  FontStoreReadOnlyError,
  OVERRIDES_FILE,
  updateJsonFile,
} from "@/lib/fonts/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: FontAdminStatus[] = ["approved", "pending", "rejected"];
const LIMITS = { family: 80, category: 40, note: 300 };

function clean(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

export async function GET(request: NextRequest) {
  const auth = await authorizeFontAdmin(request);
  if (!auth.ok) return auth.response;
  return NextResponse.json(
    { ok: true, overrides: await readOverrides() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const auth = await authorizeFontAdmin(request);
  if (!auth.ok) return auth.response;

  let body: {
    action?: string;
    slug?: string;
    patch?: Record<string, unknown>;
    status?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON." },
      { status: 400 },
    );
  }

  const slug = typeof body.slug === "string" ? body.slug : "";
  if (!catalogue.fonts.some((font) => font.slug === slug)) {
    return NextResponse.json(
      { ok: false, error: "Unknown font family." },
      { status: 404 },
    );
  }

  try {
    if (body.action === "clear") {
      await updateJsonFile<FontOverridesFile>(
        OVERRIDES_FILE,
        { updatedAt: null, fonts: {} },
        (current) => {
          const fonts = { ...current.fonts };
          delete fonts[slug];
          return { updatedAt: new Date().toISOString(), fonts };
        },
      );
      return NextResponse.json({ ok: true });
    }

    const patch: FontOverride = {};
    if (body.action === "set-status") {
      if (!STATUSES.includes(body.status as FontAdminStatus)) {
        return NextResponse.json(
          { ok: false, error: "Unknown status." },
          { status: 400 },
        );
      }
      patch.status = body.status as FontAdminStatus;
    } else if (body.action === "update") {
      const input = body.patch ?? {};
      const family = clean(input.family, LIMITS.family);
      const category = clean(input.category, LIMITS.category);
      const note = clean(input.note, LIMITS.note);
      const tags = Array.isArray(input.tags)
        ? input.tags
            .filter((tag): tag is string => typeof tag === "string")
            .map((tag) => tag.trim().slice(0, 30))
            .filter(Boolean)
            .slice(0, 12)
        : undefined;
      if (family) patch.family = family;
      if (category) patch.category = category;
      if (note) patch.note = note;
      if (tags?.length) patch.tags = tags;
      if (!Object.keys(patch).length) {
        return NextResponse.json(
          { ok: false, error: "Nothing to update." },
          { status: 400 },
        );
      }
    } else {
      return NextResponse.json(
        { ok: false, error: "Unknown action." },
        { status: 400 },
      );
    }

    await updateJsonFile<FontOverridesFile>(
      OVERRIDES_FILE,
      { updatedAt: null, fonts: {} },
      (current) => ({
        updatedAt: new Date().toISOString(),
        fonts: {
          ...current.fonts,
          [slug]: {
            ...current.fonts[slug],
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        },
      }),
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof FontStoreReadOnlyError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This deployment is read-only for font admin changes. Export the change and commit it with the catalogue instead.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "The change could not be saved." },
      { status: 500 },
    );
  }
}
