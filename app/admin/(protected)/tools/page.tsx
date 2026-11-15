import AdminResourceTable from "@/components/admin/admin-resource-table";
import { AdminNotice, PageHeading } from "@/components/admin/admin-page";
import { readToolCatalog } from "@/lib/supabase/admin-data";

export default async function AdminToolsPage() {
  const catalog = await readToolCatalog();
  return (
    <>
      <PageHeading
        kicker="Catalog"
        title="Tool management"
        description="Manage metadata overlays for the existing catalog. Slugs and tool implementations cannot be changed here."
      />
      {!catalog.configured ? (
        <AdminNotice warning>
          Catalog changes are unavailable until server-side Supabase access is
          configured and the existing admin tables respond. The shipped tool
          catalog remains the safe public fallback.
        </AdminNotice>
      ) : null}
      <AdminResourceTable kind="tools" />
    </>
  );
}
