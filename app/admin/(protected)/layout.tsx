import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { verifyAdminSession } from "@/lib/supabase/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await verifyAdminSession();
  if (auth.status !== "authorized")
    redirect(
      auth.status === "forbidden"
        ? "/admin/login?reason=forbidden"
        : "/admin/login",
    );
  return <AdminShell email={auth.admin.email}>{children}</AdminShell>;
}
