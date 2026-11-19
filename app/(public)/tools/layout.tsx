import ToolDownloadFeedback from "@/components/tool-download-feedback";
import ToolMaintenanceGate, {
  type ToolMaintenanceNotice,
} from "@/components/tool-maintenance-gate";
import { getPublicCatalog } from "@/lib/supabase/public-catalog";

export const revalidate = 300;

export default async function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { tools } = await getPublicCatalog();
  // Tools an administrator has switched off, with the note for visitors.
  // Keeping request-time cookie reads out of this layout ensures `/tools` and
  // all `/tools/*` routes stay statically prerendered / ISR-cached even while
  // one or more tools carry a maintenance notice. Signed-in administrators
  // unlock preview client-side inside `ToolMaintenanceGate` only when viewing
  // a switched-off tool.
  const notices: ToolMaintenanceNotice[] = tools.flatMap((tool) =>
    tool.maintenance
      ? [
          {
            slug: tool.slug,
            name: tool.name,
            reason: tool.maintenance.reason,
            since: tool.maintenance.since,
          },
        ]
      : [],
  );
  return (
    <>
      {children}
      {notices.length ? <ToolMaintenanceGate notices={notices} /> : null}
      <ToolDownloadFeedback />
    </>
  );
}
