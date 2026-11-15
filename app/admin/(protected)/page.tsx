import { AdminOverviewLive } from "@/components/admin/admin-overview-live";
import { PageHeading } from "@/components/admin/admin-page";
import { getOverviewSnapshot } from "@/lib/supabase/admin-data";

export default async function AdminOverviewPage() {
  const snapshot = await getOverviewSnapshot();
  return (
    <>
      <PageHeading
        title="Good to see you."
        description="An executive view of verified QUICKKIT catalog and inbox data. Metrics without a configured source remain explicitly unavailable."
      />
      <AdminOverviewLive initialSnapshot={snapshot} />
    </>
  );
}
