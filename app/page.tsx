import Link from "next/link";
import {
  ArrowRight,
  Check,
  MonitorSmartphone,
  Rocket,
  ShieldCheck,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import CategoryGrid from "@/components/category-grid";
import HeroArt from "@/components/hero-art";
import HeroSearch from "@/components/hero-search";
import Reveal from "@/components/reveal";
import { pageMetadata } from "@/lib/seo";
import { toolBySlug } from "@/lib/catalog";

export const metadata = pageMetadata(
  "Free browser tools for everyday tasks",
  "Free browser tools that run entirely on your device: merge, split, compress, lock and unlock PDFs, convert PDF to Word, compress images, generate QR codes, format JSON and more.",
  "/",
);

const popularSlugs = [
  "merge-pdf",
  "pdf-lock-unlock",
  "image-compressor",
  "qr-generator",
  "word-counter",
];

const reasons: { Icon: LucideIcon; title: string; text: string }[] = [
  {
    Icon: ShieldCheck,
    title: "Privacy Focused",
    text: "Your files and data stay on your device. Tools run locally in your browser — nothing is uploaded.",
  },
  {
    Icon: Sparkles,
    title: "Easy to Use",
    text: "Clean, intuitive and beginner-friendly tools. Open a tool, get a result, get on with your day.",
  },
  {
    Icon: Rocket,
    title: "Fast & Lightweight",
    text: "Instant results directly in your browser. No installs, no accounts, no waiting around.",
  },
  {
    Icon: MonitorSmartphone,
    title: "All Devices",
    text: "Works smoothly on desktop, tablet and mobile — wherever you need a quick hand.",
  },
];

export default function Home() {
  return (
    <div className="home">
      <section className="hero" aria-label="QUICKKIT tools">
        <h1 className="sr-only">QUICKKIT tools</h1>
        <div className="hero-search-zone">
          <HeroSearch />
        </div>
        <HeroArt />
        <div className="hero-copy">
          <div className="popular-row">
            <span className="popular-label">Popular:</span>
            {popularSlugs.map((slug) => {
              const tool = toolBySlug(slug)!;
              return (
                <Link
                  key={slug}
                  className="popular-chip"
                  href={`/tools/${tool.slug}`}
                >
                  {tool.name}
                </Link>
              );
            })}
          </div>
          <div className="hero-actions">
            <Link className="primary" href="/tools">
              Explore All Tools <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className="hero-benefits">
            <span>
              <Check size={14} aria-hidden="true" /> Free to use
            </span>
            <span>
              <Check size={14} aria-hidden="true" /> No sign-up
            </span>
            <span>
              <Check size={14} aria-hidden="true" /> On your device
            </span>
          </div>
        </div>
      </section>
      <div className="container">
        <section
          id="categories"
          className="home-section"
          aria-labelledby="categories-title"
        >
          <Reveal>
            <div className="section-heading">
              <div>
                <span className="eyebrow">Browse the toolkit</span>
                <h2 id="categories-title">Explore by Category</h2>
                <p>
                  Find the right tool for your task, all organized in one place.
                </p>
              </div>
            </div>
            <CategoryGrid />
          </Reveal>
        </section>

        <section className="home-section" aria-labelledby="why-title">
          <Reveal>
            <div className="section-heading">
              <div>
                <span className="eyebrow">The QUICKKIT way</span>
                <h2 id="why-title">Why QUICKKIT?</h2>
                <p>
                  A simpler, safer and faster way to get things done online.
                </p>
              </div>
              <Link href="/privacy" className="section-link">
                Our privacy approach <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <div className="why-grid">
              {reasons.map(({ Icon, title, text }) => (
                <div className="why-card" key={title}>
                  <span className="why-icon">
                    <Icon size={24} aria-hidden="true" />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        <Reveal>
          <section className="cta-banner" aria-labelledby="cta-title">
            <span className="cta-ring" aria-hidden="true" />
            <span className="cta-shape shape-one" aria-hidden="true" />
            <span className="cta-shape shape-two" aria-hidden="true" />
            <span className="cta-shape shape-three" aria-hidden="true" />
            <Zap
              className="cta-zap"
              size={64}
              fill="currentColor"
              aria-hidden="true"
            />
            <h2 id="cta-title">Your Digital Life, Made Simpler.</h2>
            <p>
              Create, convert and manage everyday files in one place — fast,
              free and privacy-friendly.
            </p>
            <Link className="cta-button" href="/tools">
              Explore Your Toolkit <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
