import AdminResourceTable from "@/components/admin/admin-resource-table";
import { AdminNotice, PageHeading } from "@/components/admin/admin-page";
import { readCategoryCatalog } from "@/lib/supabase/admin-data";

export default async function AdminCategoriesPage() {
  const catalog = await readCategoryCatalog();
  return (
    <>
      <PageHeading
        title="Categories"
        description="Manage existing category records and ordering. Tool totals are derived from the current source catalog; categories cannot be duplicated here."
      />
      {!catalog.configured ? (
        <AdminNotice warning>
          Category changes are unavailable until server-side Supabase access is
          configured and the existing category table responds.
        </AdminNotice>
      ) : null}
      <AdminResourceTable kind="categories" />
    </>
  );
}
