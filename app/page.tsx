import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Heart,
  Check,
  Sparkles,
  LockKeyhole,
} from "lucide-react";
import Catalog from "@/components/catalog";
import HeroArt from "@/components/hero-art";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Free browser tools for everyday tasks",
  "Merge and split PDFs, count words, convert text, format JSON, create passwords, generate QR codes and compress images locally in your browser.",
  "/",
);
export default function Home() {
  return (
    <div className="home">
      <div className="container">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="hero-label">
              <Sparkles size={13} /> YOUR EVERYDAY TOOLKIT
            </div>
            <h1 id="hero-title">
              Small tasks.
              <br />
              <span>Quick solutions.</span>
            </h1>
            <p className="hero-description">
              Handy tools for the things you do every day.
              <br className="desktop-break" /> No clutter, no complicated setup
              — just pick a tool
              <br className="desktop-break" /> and get it done.
            </p>
            <div className="hero-actions">
              <Link className="primary" href="#tools">
                Explore the toolkit <ArrowRight size={17} />
              </Link>
              <Link className="secondary" href="/about">
                A simpler way to work
              </Link>
            </div>
            <div className="hero-benefits">
              <span>
                <Check size={14} /> Free to use
              </span>
              <span>
                <Check size={14} /> No sign-up
              </span>
              <span>
                <Check size={14} /> On your device
              </span>
            </div>
          </div>
          <HeroArt />
        </section>
        <Catalog />
        <section className="trust-panel" aria-labelledby="trust-title">
          <div className="trust-art">
            <ShieldCheck size={35} />
            <LockKeyhole size={17} />
          </div>
          <div>
            <span className="eyebrow">
              YOUR FILES. YOUR TEXT. YOUR BUSINESS.
            </span>
            <h2 id="trust-title">A little more private. A lot less hassle.</h2>
            <p>
              Your PDFs, text, passwords, QR content and images stay in your
              browser.
              <br className="desktop-break" /> No tool-input uploads, accounts
              or tracking analytics.
            </p>
          </div>
          <Link href="/privacy" className="text-link">
            Our privacy approach <ArrowRight size={16} />
          </Link>
        </section>
        <section className="principles" aria-label="Our approach">
          <div>
            <Zap size={21} />
            <h3>Right to the point</h3>
            <p>Open a tool. Get a result. Get on with your day.</p>
          </div>
          <div>
            <ShieldCheck size={21} />
            <h3>Local by design</h3>
            <p>The useful work happens on your device.</p>
          </div>
          <div>
            <Heart size={21} />
            <h3>A little more human</h3>
            <p>Clear instructions. No unnecessary complexity.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
