import Link from "next/link";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";

export function TrustSection() {
  return (
    <section className="container pb-14 sm:pb-16" aria-labelledby="trust-title">
      <div className="relative overflow-hidden rounded-panel border border-lavender-200 bg-gradient-to-br from-lavender-100 via-white to-mint-soft p-6 shadow-soft sm:p-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full blur-2xl"
          style={{
            background:
              "radial-gradient(circle, rgba(167,139,250,0.30), transparent 70%)",
          }}
        />
        <div className="relative grid items-center gap-5 lg:grid-cols-[auto_1fr_auto] lg:gap-7">
          <IconTile tone="brand" size="lg" className="hidden sm:grid">
            <ShieldCheck strokeWidth={1.8} />
          </IconTile>

          <div>
            <span className="eyebrow">
              <LockKeyhole className="size-3.5" aria-hidden="true" />
              Your work stays yours
            </span>
            <h2
              id="trust-title"
              className="mt-3 text-2xl font-extrabold tracking-[-0.03em] text-ink sm:text-3xl"
            >
              A little more private. A lot less hassle.
            </h2>
            <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-muted sm:text-[15px]">
              Text, passwords, QR content and images are processed in your
              browser. QUICKKIT does not upload, store or log your tool inputs —
              there is no account, no tracking analytics and no ad SDK.
            </p>
          </div>

          <Link
            href="/privacy"
            className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-xl border border-lavender-200 bg-white/90 px-4 text-sm font-semibold whitespace-nowrap text-brand-700 transition hover:border-brand-300 hover:bg-white"
          >
            Our privacy approach
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default TrustSection;
