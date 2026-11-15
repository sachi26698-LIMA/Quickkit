import AdminResourceTable from "@/components/admin/admin-resource-table";
import { PageHeading } from "@/components/admin/admin-page";
import styles from "@/components/admin/admin.module.css";
import { siteOrigin } from "@/lib/seo";
import { indexingEnabled } from "@/lib/launch";
export default function AdminSeoPage() {
  return (
    <>
      <PageHeading
        title="SEO control panel"
        description="Inspect supported catalog metadata and site-level crawl settings. No indexing or Search Console verification is inferred."
      />
      <div className={styles["admin-detail-grid"]}>
        <div className={styles["admin-card"]}>
          <strong>Canonical origin</strong>
          <p>{siteOrigin ?? "Not configured"}</p>
        </div>
        <div className={styles["admin-card"]}>
          <strong>Indexing gate</strong>
          <p>
            {indexingEnabled
              ? "Enabled by current site configuration"
              : "Noindex / fail-closed"}
          </p>
        </div>
        <div className={styles["admin-card"]}>
          <strong>Sitemap</strong>
          <p>
            {siteOrigin ? `${siteOrigin}/sitemap.xml` : "URL not configured"} ·
            Next.js route generated; no last-generation timestamp is
            instrumented.
          </p>
        </div>
        <div className={styles["admin-card"]}>
          <strong>Open Graph preview</strong>
          <p>
            Per-page Open Graph overrides are not stored by the current backend.
            The inventory below previews title and description only.
          </p>
        </div>
        <div className={styles["admin-card"]}>
          <strong>Robots</strong>
          <p>
            <a
              className={styles["admin-link"]}
              href="/robots.txt"
              target="_blank"
              rel="noreferrer"
            >
              Open /robots.txt
            </a>{" "}
            · deployment reachability is not independently verified here.
          </p>
        </div>
      </div>
      <div className={styles["admin-section"]}>
        <h3>Catalog SEO inventory</h3>
        <p>
          Catalog titles/descriptions are editable through the tool and category
          editors. Canonical metadata is derived from the configured site
          origin.
        </p>
        <AdminResourceTable kind="seo" />
      </div>
    </>
  );
}
