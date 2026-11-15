import AdminSiteSettings from "@/components/admin/admin-site-settings";
import { PageHeading } from "@/components/admin/admin-page";
export default function AdminSiteSettingsPage() {
  return (
    <>
      <PageHeading
        kicker="Configuration"
        title="Site settings"
        description="Edit the explicitly supported public settings. Secret values and arbitrary environment variables are never available in this panel."
      />
      <AdminSiteSettings />
    </>
  );
}
