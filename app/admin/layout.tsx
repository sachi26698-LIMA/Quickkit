import type { Metadata } from "next";
import styles from "@/components/admin/admin.module.css";
import "./admin.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
  title: {
    default: "Master Admin | QUICKKIT",
    template: "%s | QUICKKIT Admin",
  },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={styles["admin-root"]}>{children}</div>;
}
