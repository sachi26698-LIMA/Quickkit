import { AdminOverviewLive } from "@/components/admin/admin-overview-live";
import { getOverviewSnapshot } from "@/lib/supabase/admin-data";

export default async function AdminOverviewPage() {
  const snapshot = await getOverviewSnapshot();
  return <AdminOverviewLive initialSnapshot={snapshot} />;
}
