import AdminResourceTable from "@/components/admin/admin-resource-table";
import { PageHeading } from "@/components/admin/admin-page";
export default function AdminFeedbackPage() {
  return (
    <>
      <PageHeading
        kicker="Inbox"
        title="Feedback inbox"
        description="Review consented feedback, classify it, add private notes, and resolve items."
      />
      <AdminResourceTable kind="feedback" />
    </>
  );
}
