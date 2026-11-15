import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { verifyAdminSession } from "@/lib/supabase/admin-auth";
import { getAdminInboxBadges } from "@/lib/supabase/admin-data";

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
  const initialBadges = await getAdminInboxBadges();
  return (
    <AdminShell email={auth.admin.email} initialBadges={initialBadges}>
      {children}
    </AdminShell>
  );
}
