import Link from "next/link";
import { Heart, ShieldCheck } from "lucide-react";
import Brand from "@/components/brand";
import SocialGlyph from "@/components/social-icons";
import { footerGroups } from "@/lib/legal";
import { socials, socialsVisible } from "@/lib/site";

/**
 * Footer navigation is generated from `lib/legal.ts`, which is also the source
 * for the sitemap page and the XML sitemap. One list means no duplicate links,
 * no dead `#` hrefs and no route that exists but is unreachable.
 */
export default function Footer({
  siteName = "QUICKKIT",
  tagline = "Small tasks. Quick solutions.",
  contactEmail,
  socialLinks = [],
  extraLinks = [],
}: {
  siteName?: string;
  tagline?: string;
  contactEmail?: string;
  socialLinks?: { label: string; href: string }[];
  extraLinks?: { label: string; href: string }[];
}) {
  return (
    <footer className="site-footer">
      <div className="container footer-top footer-top--wide">
        <div className="footer-brand-col">
          <Brand name={siteName} />
          <p className="footer-tagline">{tagline}</p>
          <p>
            Your everyday digital toolkit. Simple, fast and privacy-friendly.
          </p>
          {/* Hidden until the URLs in `socials` are confirmed to be the
              operator's real profiles — see `socialsVisible` in lib/site.ts. */}
          {socialsVisible || socialLinks.length > 0 ? (
            <div
              className="footer-socials"
              role="group"
              aria-label={`${siteName} on social media`}
            >
              {socialsVisible
                ? socials.map(({ label, href, icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`QUICKKIT on ${label} (opens in new tab)`}
                    >
                      <SocialGlyph icon={icon} />
                    </a>
                  ))
                : null}
              {socialLinks.map(({ label, href }) => (
                <a key={href} href={href} target="_blank" rel="noreferrer">
                  {label}
                </a>
              ))}
            </div>
          ) : null}
          {contactEmail ? (
            <p>
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </p>
          ) : null}
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
        {extraLinks.length ? (
          <nav aria-label="Additional links">
            <h2>More</h2>
            {extraLinks.map(({ label, href }) => (
              <a key={href} href={href} target="_blank" rel="noreferrer">
                {label}
              </a>
            ))}
          </nav>
        ) : null}
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
        <span>
          © {new Date().getFullYear()} {siteName}. All rights reserved.
        </span>
        <span className="footer-built">
          Built with <Heart size={12} fill="currentColor" aria-hidden="true" />
          <span className="sr-only">love</span> for a simpler digital life.
        </span>
      </div>
    </footer>
  );
}
