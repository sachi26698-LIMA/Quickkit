import { localToolCount, totalTools } from "@/lib/catalog-counts";
import VisitorTracking from "./visitor-tracking";
import Link from "next/link";
import { Heart, ShieldCheck } from "lucide-react";
import Brand from "@/components/brand";
import SocialGlyph from "@/components/social-icons";
import { footerGroups, footerLinkOnHome } from "@/lib/legal";
import { socials, socialsVisible } from "@/lib/site";

/**
 * Footer navigation is generated from `lib/legal.ts`, which is also the source
 * for the sitemap page and the XML sitemap. One list means no duplicate links,
 * no dead `#` hrefs and no route that exists but is unreachable.
 *
 * Every link is always in the document — the homepage only *hides* the
 * secondary ones (see `footerHomeLinks`), so crawlers, screen readers and the
 * "all policies" route keep the full set while the landing page stays short.
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
              {localToolCount} of {totalTools} tools run entirely on your
              device. No sign-up, no accounts.
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
              <Link
                key={href}
                href={href}
                data-home-link={footerLinkOnHome(href) ? undefined : "hidden"}
              >
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
      {/* Opt-in visitor counting only: the consent control lives on /cookies
          now, and this mount sends an occasional anonymous ping once the
          visitor has switched it on there. It renders nothing. */}
      <VisitorTracking />
    </footer>
  );
}
