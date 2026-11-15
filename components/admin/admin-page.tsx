import { AlertTriangle, Info } from "lucide-react";
import styles from "./admin.module.css";

export function PageHeading({
  title,
  description,
  kicker = "QUICKKIT CONTROL CENTER",
  action,
}: {
  title: string;
  description: string;
  kicker?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={styles["admin-page-head"]}>
      <div>
        <span className={styles["admin-kicker"]}>{kicker}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action ? (
        <div className={styles["admin-page-head-action"]}>{action}</div>
      ) : null}
    </div>
  );
}

export function AdminNotice({
  children,
  warning = false,
}: {
  children: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <div
      className={`${styles["admin-state"]} ${warning ? styles["admin-state--warn"] : styles["admin-state--info"]}`}
      role="status"
    >
      <span className={styles["admin-state-icon"]} aria-hidden="true">
        {warning ? <AlertTriangle size={16} /> : <Info size={16} />}
      </span>
      <div className={styles["admin-state-copy"]}>{children}</div>
    </div>
  );
}
