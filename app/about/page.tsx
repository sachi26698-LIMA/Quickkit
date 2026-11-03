import Link from "next/link";
import {
  ArrowRight,
  MonitorSmartphone,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import PageHero from "@/components/page-hero";
import CategoryIcon from "@/components/category-icon";
import { categoryMeta, toolsByCategory } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "About Us — small tasks, thoughtfully solved",
  "QUICKKIT is a free, privacy-friendly digital toolkit: everyday browser tools with no accounts, no uploads and no clutter.",
  "/about",
);

const principles = [
  {
    Icon: ShieldCheck,
    title: "Private by design",
    text: "Tools run locally in your browser. Your files, text and passwords are never uploaded — because the most secure server is the one that never receives your data.",
  },
  {
    Icon: Sparkles,
    title: "Simple on purpose",
    text: "One job per tool, clear instructions, instant results. No setup wizards, no accounts, no learning curve standing between you and done.",
  },
  {
    Icon: Rocket,
    title: "Fast & lightweight",
    text: "Everything happens on your device, so results are effectively instant — and the site stays snappy even on modest hardware and connections.",
  },
  {
    Icon: MonitorSmartphone,
    title: "Everywhere you are",
    text: "Desktop, tablet or phone, QUICKKIT adapts to your screen and works the same way — handy help whenever a small task interrupts bigger work.",
  },
];

export default function Page() {
  return (
    <div className="home inner-page">
      <div className="container">
        <PageHero
          eyebrow="ABOUT QUICKKIT"
          title="Useful tools."
          titleAccent="Less busywork."
          lede="QUICKKIT is your everyday digital toolkit — a growing collection of free, privacy-friendly browser tools for the small tasks that interrupt your day."
        />

        <div className="prose about-intro">
          <h2>Our mission</h2>
          <p>
            Combining, splitting or compressing PDFs before a deadline. Counting
            words in an application. Turning a link into a QR code for a
            classroom poster. These tiny jobs shouldn’t need expensive software,
            a sign-up flow, or uploading your files to a stranger’s server.
            QUICKKIT exists so they don’t: open a tool, get your result, get on
            with your day.
          </p>
          <h2>How QUICKKIT helps</h2>
          <p>
            Each workspace focuses on one job with clear inputs, honest guidance
            about its limits, and results you can copy or download immediately.
            Reading time is an estimate, JSON uses JavaScript number precision,
            image output depends on browser support — we say so beside the tools
            rather than hiding it.
          </p>
        </div>

        <section
          className="home-section about-cats"
          aria-labelledby="about-cats-title"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">What’s inside</span>
              <h2 id="about-cats-title">One toolkit, eight categories</h2>
              <p>Organized the way you think about the task.</p>
            </div>
            <Link href="/tools" className="section-link">
              Browse all tools <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <div className="more-categories-row about-cat-row">
            {categoryMeta.map((meta) => {
              const count = toolsByCategory(meta.name).length;
              return (
                <Link
                  key={meta.slug}
                  className="more-category-chip"
                  href={`/category/${meta.slug}`}
                >
                  <span className={`dropdown-icon ${meta.tint}`}>
                    <CategoryIcon meta={meta} size={16} />
                  </span>
                  {meta.name}
                  <span className="more-category-count">
                    {count ? `${count}` : "Soon"}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section
          className="home-section"
          aria-labelledby="about-principles-title"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">How we work</span>
              <h2 id="about-principles-title">The QUICKKIT principles</h2>
            </div>
          </div>
          <div className="why-grid">
            {principles.map(({ Icon, title, text }) => (
              <div className="why-card" key={title}>
                <span className="why-icon">
                  <Icon size={24} aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
          <div className="prose about-outro">
            <h2>Where we are, honestly</h2>
            <p>
              QUICKKIT is growing category by category. Today’s tools cover
              PDFs, images, QR codes, text, data and passwords; Calculators and
              AI Tools are on the roadmap and marked “Coming soon” until they’re
              genuinely ready. Everything currently live is free — no ads, paid
              plans or payment forms in this release. New to QUICKKIT? Start
              with the <Link href="/tools">toolkit</Link>, check the{" "}
              <Link href="/help">Help Center</Link>, or read how seriously we
              take your data in the <Link href="/privacy">Privacy Policy</Link>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
