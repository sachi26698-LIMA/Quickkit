import AdminResourceTable from "@/components/admin/admin-resource-table";
import { PageHeading } from "@/components/admin/admin-page";
export default function AdminActivityPage() {
  return (
    <>
      <PageHeading
        title="Admin activity"
        description="Append-only audit events for administrator changes. Sensitive form content, passwords and tokens are excluded."
      />
      <AdminResourceTable kind="activity" />
    </>
  );
}
