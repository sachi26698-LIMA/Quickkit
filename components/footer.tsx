import Link from "next/link";
import { Heart, ShieldCheck } from "lucide-react";
import Brand from "@/components/brand";
import SocialGlyph from "@/components/social-icons";
import { metaByCategory } from "@/lib/catalog";
import { socials } from "@/lib/site";

const toolLinks = [
  "PDF Tools",
  "Image Tools",
  "QR & Barcode",
  "Text & Writing",
  "Developer Tools",
  "Calculators",
] as const;
const moreLinks = ["Security & Privacy", "AI Tools", "Calculators"] as const;

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-top">
        <div className="footer-brand-col">
          <Brand />
          <p className="footer-tagline">Small tasks. Quick solutions.</p>
          <p>
            Your everyday digital toolkit. Simple, fast and privacy-friendly.
          </p>
          <div className="footer-socials" aria-label="QUICKKIT on social media">
            {socials.map(({ label, href, icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={`QUICKKIT on ${label} (opens in new tab)`}
              >
                <SocialGlyph icon={icon} />
              </a>
            ))}
          </div>
          <p className="footer-promise-line">
            <ShieldCheck size={19} aria-hidden="true" />
            <span>
              <strong>Your work stays yours.</strong>
              <br />
              Tools run on your device. No sign-up, no tracking analytics.
            </span>
          </p>
        </div>
        <div>
          <h2>Tools</h2>
          <Link href="/tools">All Tools</Link>
          {toolLinks.map((name) => (
            <Link key={name} href={`/category/${metaByCategory(name).slug}`}>
              {name}
            </Link>
          ))}
        </div>
        <div>
          <h2>Company</h2>
          <Link href="/about">About Us</Link>
          <Link href="/contact">Contact Us</Link>
          <Link href="/help">Help Center</Link>
          <Link href="/help#faq">Help &amp; FAQ</Link>
        </div>
        <div>
          <h2>Legal</h2>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Use</Link>
          <Link href="/cookies">Cookie Policy</Link>
        </div>
        <div>
          <h2>More</h2>
          {moreLinks.map((name) => (
            <Link key={name} href={`/category/${metaByCategory(name).slug}`}>
              {name}
            </Link>
          ))}
          <Link href="/help#faq">FAQ</Link>
          <Link href="/sitemap">Sitemap</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} QUICKKIT. All rights reserved.</span>
        <span className="footer-legal-links">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Use</Link>
          <Link href="/cookies">Cookie Policy</Link>
        </span>
        <span className="footer-built">
          Built with <Heart size={12} fill="currentColor" aria-hidden="true" />
          <span className="sr-only">love</span> for a simpler digital life.
        </span>
      </div>
    </footer>
  );
}
