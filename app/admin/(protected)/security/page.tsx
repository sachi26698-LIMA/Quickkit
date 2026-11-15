import SecurityOverview from "@/components/admin/security-overview";
import { PageHeading } from "@/components/admin/admin-page";
export default function AdminSecurityPage() {
  return (
    <>
      <PageHeading
        kicker="Governance"
        title="Security center"
        description="Current administrator session, service readiness and security boundaries. Sensitive values are never displayed."
      />
      <SecurityOverview />
    </>
  );
}
