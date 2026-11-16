import { cookies } from "next/headers";
import ToolDownloadFeedback from "@/components/tool-download-feedback";
import ToolMaintenanceGate, {
  type ToolMaintenanceNotice,
} from "@/components/tool-maintenance-gate";
import { verifyAdminSession } from "@/lib/supabase/admin-auth";
import { SUPABASE_COOKIE_OPTIONS } from "@/lib/supabase/config";
import { getPublicCatalog } from "@/lib/supabase/public-catalog";

export default async function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { tools } = await getPublicCatalog();
  // Tools an administrator has switched off, with the note for visitors.
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
      {notices.length ? (
        <ToolMaintenanceGate
          notices={notices}
          adminPreview={await isSignedInAdministrator()}
        />
      ) : null}
      <ToolDownloadFeedback />
    </>
  );
}

/**
 * Lets the site owner look at a switched-off tool. Only consulted while at
 * least one tool is off, and only for a browser that carries a session cookie,
 * so ordinary visitors never cause an authentication request.
 */
async function isSignedInAdministrator(): Promise<boolean> {
  try {
    const jar = await cookies();
    if (
      !jar
        .getAll()
        .some((cookie) => cookie.name.startsWith(SUPABASE_COOKIE_OPTIONS.name))
    )
      return false;
    return (await verifyAdminSession()).status === "authorized";
  } catch {
    return false;
  }
}
