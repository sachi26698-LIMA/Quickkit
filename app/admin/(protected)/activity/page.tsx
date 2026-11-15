import AdminResourceTable from "@/components/admin/admin-resource-table";
import { PageHeading } from "@/components/admin/admin-page";
export default function AdminActivityPage() {
  return (
    <>
      <PageHeading
        title="Admin activity"
        description="Chronological audit events for recorded administrator changes. The current schema does not retain failed request events or per-event success flags; sensitive form content, passwords and tokens are excluded."
      />
      <AdminResourceTable kind="activity" />
    </>
  );
}
