import AdminResourceTable from "@/components/admin/admin-resource-table";
import { PageHeading } from "@/components/admin/admin-page";
export default function AdminSubmissionsPage() {
  return (
    <>
      <PageHeading
        kicker="Inbox"
        title="Contact submissions"
        description="Private visitor messages. Status and internal notes are only available to authorized administrators."
      />
      <AdminResourceTable kind="submissions" />
    </>
  );
}
