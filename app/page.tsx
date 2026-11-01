import Link from "next/link";
import {
  ArrowRight,
  LayoutGrid,
  MonitorSmartphone,
  Rocket,
  ShieldCheck,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Catalog from "@/components/catalog";
import HeroArt from "@/components/hero-art";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Free browser tools for everyday tasks",
  "Merge PDFs, count words, convert text, format JSON, create passwords, generate QR codes and compress images locally in your browser.",
  "/",
);

const reasons: { Icon: LucideIcon; title: string; text: string }[] = [
  {
    Icon: ShieldCheck,
    title: "Privacy focused",
    text: "Your files and data stay on your device. Tools run locally in your browser — nothing is uploaded.",
  },
  {
    Icon: Sparkles,
    title: "Easy to use",
    text: "Clean, intuitive and beginner-friendly. Open a tool, get a result, get on with your day.",
  },
  {
    Icon: Rocket,
    title: "Fast & lightweight",
    text: "Instant results right in your browser. No installs, no accounts, no waiting around.",
  },
  {
    Icon: MonitorSmartphone,
    title: "All devices",
    text: "Works smoothly on desktop, tablet and mobile — wherever you need a quick hand.",
  },
];

export default function Home() {
  return (
    <div className="home">
      <div className="container">
        <Catalog
          intro={
            <>
              <div className="hero-label">
                <Sparkles size={13} aria-hidden="true" /> YOUR ALL-IN-ONE
                TOOLKIT
              </div>
              <h1 id="hero-title">
                Small tasks.
                <br />
                <span>Quick solutions.</span>
              </h1>
              <p className="hero-description">
                Free, easy and privacy-friendly tools for your everyday digital
                needs — no sign-up, nothing to install, and everything runs
                right in your browser.
              </p>
            </>
          }
          art={<HeroArt />}
        />
        <section className="home-section" aria-labelledby="why-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE QUICKKIT WAY</span>
              <h2 id="why-title">Why QUICKKIT?</h2>
              <p>A simpler, safer and faster way to get things done online.</p>
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
        </section>
        <section className="cta-banner" aria-labelledby="cta-title">
          <LayoutGrid
            className="cta-decor cta-decor-grid"
            size={170}
            aria-hidden="true"
          />
          <Zap
            className="cta-decor cta-decor-zap"
            size={195}
            aria-hidden="true"
          />
          <h2 id="cta-title">Handy tools, ready when you are</h2>
          <p>
            Everything you need for PDFs, images, text, QR codes and more —
            free, private, and all in one place.
          </p>
          <Link className="cta-button" href="#tools">
            Explore All Tools <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </div>
  );
}
