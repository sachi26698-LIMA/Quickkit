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
import AdUnit from "@/components/ad-unit";
import CategoryGrid from "@/components/category-grid";
import HeroArt from "@/components/hero-art";
import HeroSearch from "@/components/hero-search";
import Reveal from "@/components/reveal";
import { pageMetadata } from "@/lib/seo";
import { toolBySlug, tools } from "@/lib/catalog";

export const metadata = pageMetadata(
  "Free browser tools for everyday tasks",
  "Free tools that run on your device: merge, split, compress, lock and unlock PDFs, convert PDF to Word, compress images, make QR codes, format JSON and more.",
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
        {/* The page's real headline: what the site is and what it covers. It
            names the four tool families the site actually ships, so the most
            linked-to URL on the domain says something concrete. */}
        <div className="hero-intro">
          <h1 className="hero-headline">
            Free online tools for PDFs, images, text and code
          </h1>
          <p className="hero-lede">
            {tools.length} browser tools for the jobs that interrupt a working
            day. No account, no install — and most files never leave your
            device.
          </p>
        </div>
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
                  prefetch={false}
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
        {/* 1 of 3 — below the introduction, above the toolkit. Never inside the
            hero's search controls, and never above the fold's content. */}
        <AdUnit placement="home-after-hero" format="horizontal" />
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

        {/* 2 of 3 — between the category grid and the "Why QUICKKIT?" section:
            mid-page, in the natural pause between two blocks of content. */}
        <AdUnit placement="home-mid-content" format="auto" />

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

        <section className="home-section" aria-labelledby="what-title">
          <Reveal>
            <div className="section-heading">
              <div>
                <span className="eyebrow">What you can do here</span>
                <h2 id="what-title">Small jobs, done in your browser</h2>
                <p>
                  An honest description of what each family of tools does — and
                  where the limits are.
                </p>
              </div>
              <Link href="/tools" className="section-link">
                Browse all tools <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>

            <div className="home-copy">
              <p>
                QUICKKIT is {tools.length} free browser tools for the file, text
                and number jobs that interrupt a working day: merging a PDF
                before a meeting, shrinking a photo to fit an upload limit,
                checking a JSON file, splitting a bill, fixing the case of a
                heading. Nothing here needs an account, an install or a
                subscription, and there are no per-day quotas.
              </p>
              <p>
                <strong>Documents.</strong> Merge files and choose pages, split
                by range, compress, and lock or unlock with AES-256. PDF to Word
                writes an editable DOCX, PDF to Image renders pages at 72–600
                DPI, Images to PDF builds a document from photos, and{" "}
                <Link href="/category/pdf-tools">PDF Studio</Link> covers
                page-level editing. Most PDF tools take files up to 50 MB and
                100 MB per batch, which keeps memory predictable on a phone, and
                a PDF that cannot be handled safely — signed, XFA, damaged — is
                named with a next step instead of being silently skipped.
              </p>
              <p>
                <strong>Images.</strong> Compress to an exact KB or MB target,
                resize by pixels or a social preset, crop to fixed ratios or a
                circle, and convert between JPEG, PNG, WebP, AVIF, GIF, BMP and
                TIFF. <Link href="/tools/image-to-text">Image to Text</Link>{" "}
                reads text out of photos, receipts and screenshots with OCR in
                English, Hindi, Gujarati, Marathi, Bengali, Tamil, Telugu and
                Urdu.
              </p>
              <p>
                <strong>Text, code and QR.</strong> Format and validate JSON,
                HTML and XML, minify CSS and JavaScript, encode Base64 and URLs,
                generate UUIDs, hashes and passwords with browser cryptography,
                and test regular expressions. QR codes can carry a link, Wi-Fi
                credentials, a contact card or an event, export as PNG, SVG, PDF
                or a CSV batch, and be scanned from a camera, a screenshot or a
                folder of images.
              </p>
              <p>
                <strong>Numbers.</strong>{" "}
                <Link href="/category/calculators">Calculators</Link> cover GST
                with the CGST/SGST split, EMI and loan schedules, percentages,
                discounts and tax, BMI, exact age and date differences, unit and
                temperature conversion and time arithmetic.
              </p>
              <p>
                <strong>Where your files go.</strong> Most tools read and write
                the file inside this tab, so it is never uploaded. Word to PDF
                is the exception: it converts on a server and asks for consent
                before anything is sent, which is stated on the tool itself and
                in the <Link href="/file-handling">file handling policy</Link>.
                To find something quickly, type in the search box or press
                Ctrl/⌘ + K, browse a category, or tap the heart to keep a tool
                in this browser.
              </p>
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

        {/* 3 of 3 — the page's last block, below the closing call to action and
            above the footer. */}
        <AdUnit placement="home-bottom" format="auto" />
      </div>
    </div>
  );
}
