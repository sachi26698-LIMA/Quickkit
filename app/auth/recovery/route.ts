import { NextRequest, NextResponse } from "next/server";
import { isAllowedAdminEmail } from "@/lib/supabase/admin-auth";
import { getRequestOrigin } from "@/lib/supabase/request-origin";
import {
  createRecoveryClient,
  makeRecoveryProof,
  recoveryOrigin,
  RECOVERY_PROOF_COOKIE,
  RECOVERY_COOKIE_OPTIONS,
} from "@/lib/supabase/recovery";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const origin = recoveryOrigin();
  if (!origin || getRequestOrigin(request) !== origin) {
    return new NextResponse("Recovery is temporarily unavailable.", {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  }
  const destination = new URL("/reset-password", origin);
  const fail = () => {
    destination.searchParams.set("error", "invalid");
    const response = NextResponse.redirect(destination, {
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
    response.cookies.set(RECOVERY_PROOF_COOKIE, "", {
      ...RECOVERY_COOKIE_OPTIONS,
      name: RECOVERY_PROOF_COOKIE,
      maxAge: 0,
    });
    return response;
  };
  const code = new URL(request.url).searchParams.get("code");
  if (!code || code.length > 4096) return fail();
  try {
    const client = await createRecoveryClient();
    if (!client) return fail();
    let recoveryEvent = false;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") recoveryEvent = true;
    });
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    subscription.unsubscribe();
    if (error || !recoveryEvent || !data.session?.access_token) return fail();
    const verified = await client.auth.getUser();
    if (
      verified.error ||
      !verified.data.user ||
      verified.data.user.id !== data.session.user.id ||
      !isAllowedAdminEmail(verified.data.user.email)
    ) {
      await client.auth.signOut({ scope: "local" });
      return fail();
    }
    const proof = makeRecoveryProof(
      data.session.access_token,
      verified.data.user.id,
    );
    const response = NextResponse.redirect(destination, {
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
    response.cookies.set(RECOVERY_PROOF_COOKIE, proof, {
      ...RECOVERY_COOKIE_OPTIONS,
      name: RECOVERY_PROOF_COOKIE,
    });
    return response;
  } catch {
    return fail();
  }
}
