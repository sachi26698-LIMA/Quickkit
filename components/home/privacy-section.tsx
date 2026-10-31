import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileText,
  ImageIcon,
  LockKeyhole,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";

const guarantees = [
  "Text and JSON stay in the tab",
  "Passwords never leave the device",
  "QR content is encoded locally",
  "Images are compressed in-browser",
];

/** Privacy-first split section with a layered decorative illustration. */
export function PrivacySection() {
  return (
    <section
      className="container pb-10 sm:pb-14 lg:pb-20"
      aria-labelledby="privacy-title"
    >
      <div className="relative overflow-hidden rounded-panel border border-lavender-200 bg-white shadow-card">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 90% at 6% 0%, rgba(239,255,249,0.95), transparent 62%), radial-gradient(55% 85% at 96% 100%, rgba(242,237,255,0.95), transparent 65%)",
          }}
        />
        <div className="relative grid gap-8 p-5 sm:p-9 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14 lg:p-12">
          {/* Illustration */}
          <div
            aria-hidden="true"
            className="relative mx-auto w-full max-w-[15rem] min-[380px]:max-w-[17rem] sm:max-w-sm lg:max-w-none"
          >
            <div className="absolute inset-6 rounded-[2.5rem] bg-gradient-to-br from-mint-100 via-white to-lavender-100 blur-2xl" />
            <div className="relative rounded-[1.75rem] border border-white bg-white/80 p-5 shadow-float ring-1 ring-lavender-200/70 backdrop-blur">
              <div className="flex items-center gap-3">
                <IconTile tone="mint" size="lg">
                  <ShieldCheck strokeWidth={1.9} />
                </IconTile>
                <div>
                  <p className="text-sm font-bold text-ink">Local processing</p>
                  <p className="text-xs text-muted">Nothing sent to a server</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { icon: FileText, label: "Word Counter" },
                  { icon: QrCode, label: "QR Generator" },
                  { icon: ImageIcon, label: "Image Compressor" },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2.5 rounded-xl border border-line-soft bg-white px-3 py-2"
                  >
                    <Icon className="size-3.5 text-brand-500" />
                    <span className="text-xs font-semibold text-ink-soft">
                      {label}
                    </span>
                    <span className="ml-auto flex items-center gap-1 rounded-pill bg-mint-soft px-1.5 py-0.5 text-[10px] font-bold text-mint-ink">
                      <Check className="size-2.5" strokeWidth={3} />
                      local
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <span className="absolute -right-2 -bottom-3 flex items-center gap-1.5 rounded-pill border border-mint-200 bg-white px-3 py-1.5 text-[11px] font-bold text-mint-ink shadow-tile sm:-right-4">
              <LockKeyhole className="size-3" />0 uploads
            </span>
          </div>

          {/* Copy */}
          <div>
            <span className="eyebrow">
              <LockKeyhole className="size-3.5" aria-hidden="true" />
              Your work stays yours
            </span>
            <h2 id="privacy-title" className="t-h2 mt-3">
              A little more private.
              <br className="hidden sm:block" /> A lot less hassle.
            </h2>
            <p className="t-body mt-4 max-w-xl text-[0.9375rem] sm:text-base">
              Your text, passwords, QR content and images are processed in your
              browser. QUICKKIT does not upload, store or log tool inputs — and
              there is no account, tracking analytics or ad SDK.
            </p>

            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {guarantees.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-[0.875rem] leading-snug font-medium text-ink-soft sm:text-[0.9375rem]"
                >
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-mint-soft text-mint-ink ring-1 ring-mint-200">
                    <Check
                      className="size-3"
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <Link href="/privacy" className="text-link mt-7">
              Our privacy approach
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PrivacySection;
