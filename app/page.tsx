import Link from "next/link";
import {
  ArrowRight,
  Check,
  LayoutGrid,
  MonitorSmartphone,
  Rocket,
  ShieldCheck,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import BenefitsStrip from "@/components/benefits-strip";
import CategoryGrid from "@/components/category-grid";
import HeroArt from "@/components/hero-art";
import HeroSearch from "@/components/hero-search";
import Reveal from "@/components/reveal";
import { toolBySlug } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Free browser tools for everyday tasks",
  "Merge PDFs, count words, convert text, format JSON, create passwords, generate QR codes and compress images locally in your browser.",
  "/",
);

const popularSlugs = [
  "merge-pdf",
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
      <div className="container">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="hero-label">
              <Sparkles size={13} aria-hidden="true" /> YOUR ALL-IN-ONE TOOLKIT
            </div>
            <h1 id="hero-title">
              Small tasks.
              <br />
              <span>Quick solutions.</span>
            </h1>
            <p className="hero-description">
              Free, easy and privacy-friendly tools for your everyday digital
              needs — no sign-up, nothing to install, and everything runs right
              in your browser.
            </p>
            <HeroSearch />
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
              <Link className="secondary" href="#categories">
                <LayoutGrid size={16} aria-hidden="true" /> Browse Categories
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
          <HeroArt />
        </section>

        <Reveal>
          <BenefitsStrip />
        </Reveal>

        <section
          id="categories"
          className="home-section"
          aria-labelledby="categories-title"
        >
          <Reveal>
            <div className="section-heading">
              <div>
                <span className="eyebrow">BROWSE THE TOOLKIT</span>
                <h2 id="categories-title">Explore by Category</h2>
                <p>
                  Find the right tool for your task, all organized in one place.
                </p>
              </div>
              <Link href="/tools" className="section-link">
                View all tools <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <CategoryGrid />
          </Reveal>
        </section>

        <section className="home-section" aria-labelledby="why-title">
          <Reveal>
            <div className="section-heading">
              <div>
                <span className="eyebrow">THE QUICKKIT WAY</span>
                <h2 id="why-title">Why QUICKKIT?</h2>
                <p>
                  A simpler, safer and faster way to get things done online.
                </p>
              </div>
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
            <div className="privacy-band">
              <span className="privacy-band-icon">
                <ShieldCheck size={27} aria-hidden="true" />
              </span>
              <div>
                <strong>Your files. Your text. Your business.</strong>
                <p>
                  PDFs, text, passwords, QR content and images are processed on
                  your device. No tool-input uploads, accounts or tracking
                  analytics.
                </p>
              </div>
              <Link href="/privacy" className="text-link">
                Our privacy approach <ArrowRight size={16} aria-hidden="true" />
              </Link>
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
              Everything you need to create, convert, calculate and manage your
              digital tasks — all in one beautiful place. Fast, free and
              privacy-friendly.
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
