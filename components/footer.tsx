import Link from "next/link";
import { Heart, ShieldCheck } from "lucide-react";
import Brand from "@/components/brand";
import SocialGlyph from "@/components/social-icons";
import { footerGroups } from "@/lib/legal";
import { socials } from "@/lib/site";

/**
 * Footer navigation is generated from `lib/legal.ts`, which is also the source
 * for the sitemap page and the XML sitemap. One list means no duplicate links,
 * no dead `#` hrefs and no route that exists but is unreachable.
 */
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-top footer-top--wide">
        <div className="footer-brand-col">
          <Brand />
          <p className="footer-tagline">Small tasks. Quick solutions.</p>
          <p>
            Your everyday digital toolkit. Simple, fast and privacy-friendly.
          </p>
          <div
            className="footer-socials"
            role="group"
            aria-label="QUICKKIT on social media"
          >
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
              Most tools run on your device. Word to PDF asks before upload. No
              sign-up or tracking analytics.
            </span>
          </p>
        </div>
        {footerGroups.map((group) => (
          <nav key={group.id} aria-label={group.heading}>
            <h2>{group.heading}</h2>
            {group.links.map(({ href, label }) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} QUICKKIT. All rights reserved.</span>
        <span className="footer-built">
          Built with <Heart size={12} fill="currentColor" aria-hidden="true" />
          <span className="sr-only">love</span> for a simpler digital life.
        </span>
      </div>
    </footer>
  );
}
