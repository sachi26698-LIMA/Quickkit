import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  Heart,
  LayoutGrid,
  Mail,
  Search,
  ShieldCheck,
} from "lucide-react";
import AdUnit from "@/components/ad-unit";
import JsonLd from "@/components/json-ld";
import PageHero from "@/components/page-hero";
import { breadcrumbStructuredData, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Help Center — Tool Guides, Privacy & Support",
  "Get help using QUICKKIT's online tools: how browser-local processing works, the Word to PDF server exception, supported browsers, limits and saved tools.",
  "/help",
);

const faqs = [
  {
    q: "Is QUICKKIT really free?",
    a: "Yes. Every tool currently on QUICKKIT is free to use — no accounts, no subscriptions and no payment forms. If that ever changes, we will say so clearly before anything else changes.",
  },
  {
    q: "Do I need to create an account or install anything?",
    a: "No. QUICKKIT works in your web browser with no account and nothing to install. Open a tool, run your task, and close the tab.",
  },
  {
    q: "Are my files and text uploaded to a server?",
    a: "Many tools process PDFs, images, OCR, text, hashes, passwords and QR content locally without uploading files. Word to PDF sends DOCX bytes to our server conversion engine only with explicit consent, using temporary job files that are deleted afterward. Public DNS and IP tools contact external services only with your consent. See the Privacy Policy and File Handling Policy for full details.",
  },
  {
    q: "How do I save a tool for later?",
    a: "Tap the heart icon on any tool card. Saved tools appear under the heart in the top navigation. The list is stored only in this browser (local storage) — it isn't synced or sent anywhere, and clearing your browser data clears it.",
  },
  {
    q: "Which devices and browsers work?",
    a: "Any modern browser on desktop, tablet or mobile — Chrome, Edge, Firefox, Safari and others. Some outputs (for example image formats) depend on what your browser supports; the tools explain any limits next to the result.",
  },
  {
    q: "Why is AI Tools marked “Coming soon”?",
    a: "Seven categories — including all 12 Calculators, PDF Tools, Image Tools, Text & Writing, QR & Barcode, Developer Tools and Security & Privacy — are live today. AI Tools is a roadmap category that stays marked “Coming soon” until its processing and privacy model is ready.",
  },
  {
    q: "Can I use QUICKKIT for work documents?",
    a: "Yes — many people do, partly because files stay on their own device. Still verify important results (for example, review a merged PDF and keep your originals), and follow your organisation's policies for handling documents.",
  },
  {
    q: "A tool gave an unexpected result. What should I check?",
    a: "Each tool page has a short walkthrough and “good to know” notes covering common limits (number precision in JSON, reading-time estimates, PDF features that don't survive merging). If something still looks wrong, contact us with the tool name and what happened — please don't attach private files.",
  },
];

const guides = [
  {
    Icon: Search,
    title: "Find the right tool",
    text: "Use search on the homepage or the All Tools page — try words like “merge”, “resize” or “password”. Press Ctrl/⌘ + K anywhere to jump to search.",
  },
  {
    Icon: LayoutGrid,
    title: "Browse by category",
    text: "Eight categories organize the toolkit, from PDF Tools to Security & Privacy. Open one from the homepage or the Categories menu.",
  },
  {
    Icon: Heart,
    title: "Save your favourites",
    text: "The heart on any tool card pins it to your Saved page for one-tap access next time — stored locally in your browser.",
  },
  {
    Icon: ShieldCheck,
    title: "Stay private by design",
    text: "Most tools keep inputs on your device. Word to PDF requires explicit consent to server processing. Read the Privacy Policy for processing and hosting details.",
  },
];

export default function HelpPage() {
  return (
    <div className="home inner-page">
      <div className="container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/" prefetch={false}>
            Home
          </Link>{" "}
          <ChevronRight size={13} aria-hidden="true" />{" "}
          <span aria-current="page">Help Center</span>
        </nav>
        <JsonLd
          data={breadcrumbStructuredData([
            { name: "Home", path: "/" },
            { name: "Help Center", path: "/help" },
          ])}
        />
        <PageHero
          eyebrow="HELP CENTER"
          title="How can we"
          titleAccent="help?"
          lede="Quick guides and honest answers about using QUICKKIT — no jargon, no dark patterns."
        />

        <div className="why-grid help-guides">
          {guides.map(({ Icon, title, text }) => (
            <div className="why-card" key={title}>
              <span className="why-icon">
                <Icon size={24} aria-hidden="true" />
              </span>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          ))}
        </div>

        {/* 1 of 2 — after the quick guides, before the FAQ list. */}
        <AdUnit placement="help-after-guides" format="auto" />

        <section id="faq" className="faq-section" aria-labelledby="faq-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Good to know</span>
              <h2 id="faq-title">Frequently asked questions</h2>
            </div>
          </div>
          <div className="faq-list">
            {faqs.map(({ q, a }) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 2 of 2 — after the FAQ, the end of the page's content. The
            "still stuck?" contact band below it stays untouched. */}
        <AdUnit placement="help-bottom" format="auto" />

        <div className="privacy-band help-cta">
          <span className="privacy-band-icon">
            <Mail size={26} aria-hidden="true" />
          </span>
          <div>
            <strong>Still stuck?</strong>
            <p>
              Send us a message and a human will get back to you — usually
              within 2–3 working days.
            </p>
          </div>
          <Link href="/contact" className="text-link">
            Contact us <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
