import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { categoryMeta, tools, toolsByCategory } from "@/lib/catalog";
import { footerGroups, legalPages } from "@/lib/legal";
import JsonLd from "@/components/json-ld";
import { breadcrumbStructuredData, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "HTML Sitemap — All Tools, Categories & Policies",
  "Explore the complete HTML sitemap for QUICKKIT: direct links to all 42 online tools, 7 active tool categories, help guides, legal terms and trust policies.",
  "/sitemap",
);

const legalGroupLabel: Record<string, string> = {
  company: "Company & information",
  legal: "Legal",
  trust: "Trust & security",
};

const companyLinks = [
  { href: "/", label: "Home" },
  { href: "/tools", label: "All Tools" },
  { href: "/saved", label: "Saved Tools" },
  { href: "/help", label: "Help Center" },
  { href: "/sitemap", label: "Sitemap (this page)" },
  ...legalPages
    .filter((page) => page.group === "company")
    .map((page) => ({ href: page.href, label: page.title })),
];

const legalLinks = legalPages
  .filter((page) => page.group === "legal")
  .map((page) => ({ href: page.href, label: page.title }));

const trustLinks = legalPages
  .filter((page) => page.group === "trust")
  .map((page) => ({ href: page.href, label: page.title }));

const nofollowHrefs = new Set<string>([
  "/saved",
  ...categoryMeta
    .filter((c) => toolsByCategory(c.name).length === 0)
    .map((c) => `/category/${c.slug}`),
]);

const groups: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Explore",
    links: [
      { href: "/", label: "Home" },
      { href: "/tools", label: "All Tools" },
      { href: "/saved", label: "Saved Tools" },
      { href: "/help", label: "Help Center" },
      { href: "/#categories", label: "Categories (homepage section)" },
    ],
  },
  {
    title: "Categories",
    links: categoryMeta.map((c) => ({
      href: `/category/${c.slug}`,
      label: c.name,
    })),
  },
  {
    title: "Tools",
    links: tools.map((t) => ({ href: `/tools/${t.slug}`, label: t.name })),
  },
  {
    title: legalGroupLabel.company,
    links: companyLinks.filter(
      (link) =>
        link.href !== "/" && link.href !== "/saved" && link.href !== "/tools",
    ),
  },
  { title: legalGroupLabel.legal, links: legalLinks },
  { title: legalGroupLabel.trust, links: trustLinks },
];

export default function SitemapPage() {
  const legalCount = legalPages.length + 3; // + home, help, sitemap

  return (
    <div className="home inner-page legal-page">
      <div className="container">
        <nav className="breadcrumbs legal-breadcrumbs" aria-label="Breadcrumb">
          <ol>
            <li>
              <Link href="/" prefetch={false}>
                Home
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight size={12} />
            </li>
            <li aria-current="page">Sitemap</li>
          </ol>
        </nav>
        <JsonLd
          data={breadcrumbStructuredData([
            { name: "Home", path: "/" },
            { name: "Sitemap", path: "/sitemap" },
          ])}
        />

        <header className="legal-hero">
          <span className="eyebrow">Find everything</span>
          <h1>Site Map</h1>
          <p className="legal-intro">
            Every page on QUICKKIT in one place: {tools.length} tools,{" "}
            {categoryMeta.length} categories, {legalCount} information and
            policy pages. Each policy page has its own address — nothing is
            buried inside another document.
          </p>
        </header>

        <div className="sitemap-grid">
          {groups.map(({ title, links }) => (
            <section key={title} aria-labelledby={`sm-${slug(title)}`}>
              <h2 id={`sm-${slug(title)}`}>{title}</h2>
              <ul>
                {links.map(({ href, label }) => (
                  <li key={href + label}>
                    <Link
                      href={href}
                      rel={nofollowHrefs.has(href) ? "nofollow" : undefined}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section
          className="legal-section sitemap-notes"
          aria-labelledby="sm-notes"
        >
          <h2 id="sm-notes">About this map</h2>
          <p>
            The tool, category and policy groups above are generated from the
            same records the site uses to build its navigation and footer, so a
            link cannot point at a page that does not exist, and a page cannot
            exist without being listed here.
          </p>
          <p>
            A machine-readable version is published at <code>/sitemap.xml</code>
            . It lists the public tool, category and policy pages and
            deliberately omits the routes nobody should land on from a search
            result: the browser-local saved-tools page, the QR card viewer,
            empty categories that have no tools yet, and the conversion API
            endpoints (which <code>/robots.txt</code> keeps closed while
            crawlable utility shells emit explicit <code>noindex</code>{" "}
            directives).
          </p>
          <p>
            The four footer groups mirror these the other way round:{" "}
            {footerGroups.map((group) => group.heading).join(", ")}.
          </p>
        </section>
      </div>
    </div>
  );
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
