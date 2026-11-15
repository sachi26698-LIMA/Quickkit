import { NextResponse, type NextRequest } from "next/server";
import { isAllowedAdminEmail } from "@/lib/supabase/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeAdminNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//"))
    return "/admin";
  try {
    const parsed = new URL(value, "https://quickkit.invalid");
    if (!parsed.pathname.startsWith("/admin")) return "/admin";
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/admin";
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return NextResponse.redirect(new URL("/admin/login", url.origin));
  const code = url.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error)
      return NextResponse.redirect(
        new URL("/admin/login?reason=invalid-link", url.origin),
      );
  }
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || !isAllowedAdminEmail(data.user.email)) {
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.redirect(
      new URL("/admin/login?reason=forbidden", url.origin),
    );
  }
  const target = safeAdminNext(url.searchParams.get("next"));
  return NextResponse.redirect(new URL(target, url.origin));
}
