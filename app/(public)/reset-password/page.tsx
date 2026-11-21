import RecoveryForm from "@/components/admin/recovery-form";
export const metadata = {
  title: "Reset administrator password",
  description: "Recover access to the QUICKKIT administrator account.",
  robots: { index: false, follow: false },
};
export default function ResetPasswordPage() {
  return <RecoveryForm />;
}
