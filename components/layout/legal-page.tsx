import { ShieldAlert, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type LegalSection = {
  id: string;
  title: string;
  body: React.ReactNode;
};

export type LegalPoint = {
  icon: LucideIcon;
  title: string;
  copy: string;
};

/**
 * Shared shell for the long-form legal pages (privacy, terms). Mirrors the
 * About page hero band and typography so policy pages feel part of the same
 * product instead of a leftover template.
 */
export function LegalPage({
  icon: Icon,
  eyebrow,
  title,
  highlight,
  lead,
  updated,
  scope,
  notice,
  points,
  sections,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  highlight?: string;
  lead: string;
  updated: string;
  scope: string;
  notice: { title: string; body: React.ReactNode };
  points: LegalPoint[];
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-full">
      <section
        className="relative isolate overflow-hidden border-b border-line-soft"
        aria-labelledby="legal-title"
        style={{
          background:
            "linear-gradient(180deg, #ffffff 0%, #fbf9ff 46%, #f6f2ff 100%)",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(44% 44% at 88% 6%, rgba(167,139,250,0.26), transparent 70%), radial-gradient(38% 40% at 2% 84%, rgba(217,255,242,0.7), transparent 72%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-grid-soft [mask-image:linear-gradient(to_bottom,black,transparent)] opacity-30"
        />

        <div className="container grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-20">
          <div>
            <Badge>
              <Icon
                className="size-3.5 text-brand-500"
                aria-hidden="true"
                strokeWidth={2.2}
              />
              {eyebrow}
            </Badge>
            <h1 id="legal-title" className="t-display mt-5">
              {title}
              {highlight ? (
                <>
                  {" "}
                  <span className="text-gradient-brand">{highlight}</span>
                </>
              ) : null}
            </h1>
            <p className="t-lead mt-5 max-w-2xl text-[1rem] sm:text-[1.0625rem]">
              {lead}
            </p>
            <dl className="mt-7 flex flex-wrap gap-2.5">
              {[
                { label: "Last updated", value: updated },
                { label: "Covers", value: scope },
              ].map((meta) => (
                <div
                  key={meta.label}
                  className="inline-flex items-center gap-2 rounded-pill border border-white bg-white/80 px-3.5 py-2 text-[0.8125rem] shadow-[0_2px_10px_rgb(73_52_145_/_0.07)] backdrop-blur"
                >
                  <dt className="font-semibold text-muted">{meta.label}</dt>
                  <dd className="font-bold text-ink">{meta.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="lg:pl-4">
            <div className="rounded-panel border border-white bg-white/80 p-5 shadow-[0_18px_40px_-28px_rgb(73_52_145_/_0.45)] backdrop-blur sm:p-6">
              <p className="eyebrow">At a glance</p>
              <ul className="mt-4 space-y-3.5">
                {points.map(({ icon: PointIcon, title: pointTitle, copy }) => (
                  <li key={pointTitle} className="flex gap-3">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-lavender-200 bg-lavender-50 text-brand-600">
                      <PointIcon
                        className="size-4"
                        aria-hidden="true"
                        strokeWidth={2.1}
                      />
                    </span>
                    <span>
                      <span className="block text-[0.875rem] font-bold text-ink">
                        {pointTitle}
                      </span>
                      <span className="mt-0.5 block text-[0.8125rem] leading-5 text-muted">
                        {copy}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section container" aria-labelledby="legal-title">
        <div className="grid gap-8 lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-14">
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="rounded-card border border-line bg-white/80 p-5 shadow-[0_1px_2px_rgb(20_23_42_/_0.03)] lg:sticky lg:top-24">
              <p className="eyebrow">On this page</p>
              <ol className="mt-4 space-y-1">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="block rounded-lg px-2 py-1.5 text-[0.8125rem] leading-5 font-medium text-muted transition hover:bg-lavender-50 hover:text-brand-700"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>

          <div className="min-w-0">
            <aside className="max-w-[44rem] rounded-panel border border-brand-100 bg-lavender-50 p-5 sm:p-6">
              <p className="flex items-start gap-2.5 text-[0.9375rem] font-bold text-ink">
                <ShieldAlert
                  className="mt-0.5 size-4 shrink-0 text-brand-600"
                  aria-hidden="true"
                  strokeWidth={2.2}
                />
                {notice.title}
              </p>
              <p className="t-body mt-2 text-[0.875rem] sm:text-[0.9375rem]">
                {notice.body}
              </p>
            </aside>

            <div className="mt-10 max-w-[44rem] space-y-8 sm:mt-12 sm:space-y-9">
              {sections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-28 border-t border-line-soft pt-7 first:border-t-0 first:pt-0"
                >
                  <h2 className="t-h3">{section.title}</h2>
                  <div className="mt-2.5 space-y-3 text-[0.9375rem] leading-7 text-muted sm:text-base">
                    {section.body}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LegalPage;
