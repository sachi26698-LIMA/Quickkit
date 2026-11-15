import {
  Bot,
  ExternalLink,
  FileCode2,
  Globe,
  SearchCheck,
  Share2,
} from "lucide-react";
import AdminResourceTable from "@/components/admin/admin-resource-table";
import { PageHeading } from "@/components/admin/admin-page";
import styles from "@/components/admin/admin.module.css";
import { siteOrigin } from "@/lib/seo";
import { indexingEnabled } from "@/lib/launch";

export default function AdminSeoPage() {
  return (
    <>
      <PageHeading
        title="SEO control center"
        description="Inspect supported catalog metadata and site-level crawl configuration. Search-engine indexing or Search Console verification is never inferred."
      />
      <div className={styles["admin-seo-cards"]}>
        <article className={styles["admin-card"]}>
          <div className={styles["admin-security-card-head"]}>
            <span
              className={`${styles["admin-panel-badge"]} ${styles["admin-panel-badge--violet"]}`}
              aria-hidden="true"
            >
              <Globe size={15} />
            </span>
            <h3>Canonical origin</h3>
          </div>
          <p className={styles["admin-card-value"]}>
            {siteOrigin ?? "Not configured"}
          </p>
          <small className={styles["admin-card-note"]}>
            Derived from server-side SITE_URL configuration.
          </small>
        </article>

        <article className={styles["admin-card"]}>
          <div className={styles["admin-security-card-head"]}>
            <span
              className={`${styles["admin-panel-badge"]} ${indexingEnabled ? styles["admin-panel-badge--teal"] : styles["admin-panel-badge--rose"]}`}
              aria-hidden="true"
            >
              <SearchCheck size={15} />
            </span>
            <h3>Indexing gate</h3>
          </div>
          <p className={styles["admin-card-value"]}>
            {indexingEnabled
              ? "Enabled by current site configuration"
              : "Noindex / fail-closed"}
          </p>
          <small className={styles["admin-card-note"]}>
            Controlled by LAUNCH_APPROVED and verified origin.
          </small>
        </article>

        <article className={styles["admin-card"]}>
          <div className={styles["admin-security-card-head"]}>
            <span
              className={`${styles["admin-panel-badge"]} ${styles["admin-panel-badge--teal"]}`}
              aria-hidden="true"
            >
              <FileCode2 size={15} />
            </span>
            <h3>Sitemap</h3>
          </div>
          <p className={styles["admin-card-value"]}>
            {siteOrigin ? `${siteOrigin}/sitemap.xml` : "URL not configured"}
          </p>
          <small className={styles["admin-card-note"]}>
            Next.js route generated; no last-generation timestamp is
            instrumented.
          </small>
        </article>

        <article className={styles["admin-card"]}>
          <div className={styles["admin-security-card-head"]}>
            <span
              className={`${styles["admin-panel-badge"]} ${styles["admin-panel-badge--rose"]}`}
              aria-hidden="true"
            >
              <Share2 size={15} />
            </span>
            <h3>Open Graph preview</h3>
          </div>
          <p className={styles["admin-card-value"]}>
            Title &amp; description inventory
          </p>
          <small className={styles["admin-card-note"]}>
            Per-page Open Graph overrides are not stored by the current backend.
          </small>
        </article>

        <article className={styles["admin-card"]}>
          <div className={styles["admin-security-card-head"]}>
            <span
              className={`${styles["admin-panel-badge"]} ${styles["admin-panel-badge--violet"]}`}
              aria-hidden="true"
            >
              <Bot size={15} />
            </span>
            <h3>Robots</h3>
          </div>
          <p className={styles["admin-card-value"]}>
            <a
              className={styles["admin-link"]}
              href="/robots.txt"
              target="_blank"
              rel="noreferrer"
            >
              Open /robots.txt <ExternalLink size={12} aria-hidden="true" />
            </a>
          </p>
          <small className={styles["admin-card-note"]}>
            Deployment reachability is not independently verified here.
          </small>
        </article>
      </div>

      <section className={styles["admin-section"]}>
        <div className={styles["admin-section-head"]}>
          <h3>Catalog SEO inventory</h3>
          <p>
            Catalog titles and descriptions are editable through the tool and
            category editors. Canonical metadata is derived from the configured
            site origin.
          </p>
        </div>
        <AdminResourceTable kind="seo" />
      </section>
    </>
  );
}
