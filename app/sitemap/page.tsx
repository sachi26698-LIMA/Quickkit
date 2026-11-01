import Link from "next/link";
import PageHero from "@/components/page-hero";
import { categoryMeta, tools } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Sitemap — every QUICKKIT page",
  "A complete map of QUICKKIT: all tools, categories, company pages and legal pages.",
  "/sitemap",
);

const groups: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Explore",
    links: [
      { href: "/", label: "Home" },
      { href: "/tools", label: "All Tools" },
      { href: "/saved", label: "Saved Tools" },
      { href: "/#categories", label: "Categories (homepage)" },
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
    title: "Company",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/contact", label: "Contact Us" },
      { href: "/help", label: "Help Center" },
      { href: "/help#faq", label: "Help & FAQ" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Use" },
      { href: "/cookies", label: "Cookie Policy" },
    ],
  },
];

export default function SitemapPage() {
  return (
    <div className="home inner-page">
      <div className="container">
        <PageHero
          eyebrow="FIND EVERYTHING"
          title="Site"
          titleAccent="Map"
          lede="Every page on QUICKKIT in one place — tools, categories, company and legal."
        />
        <div className="sitemap-grid">
          {groups.map(({ title, links }) => (
            <section key={title} aria-label={title}>
              <h2>{title}</h2>
              <ul>
                {links.map(({ href, label }) => (
                  <li key={href + label}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
