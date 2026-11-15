import styles from "./admin.module.css";

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={styles["admin-page-head"]}>
      <div>
        <span className={styles["admin-kicker"]}>QUICKKIT CONTROL ROOM</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
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
      className={`${styles["admin-state"]} ${warning ? styles["admin-state--warn"] : ""}`}
      role="status"
    >
      {children}
    </div>
  );
}
