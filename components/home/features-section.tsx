import { BadgeCheck, Gauge, LockKeyhole, type LucideIcon } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { SectionHeading } from "@/components/ui/section-heading";

const features: {
  icon: LucideIcon;
  tone: "purple" | "mint" | "blue";
  title: string;
  copy: string;
}[] = [
  {
    icon: Gauge,
    tone: "purple",
    title: "Right to the point",
    copy: "Open a tool, get your result, get on with your day. No setup wizard and no account standing in the way.",
  },
  {
    icon: LockKeyhole,
    tone: "mint",
    title: "Local by design",
    copy: "Counting, converting, encoding and compressing run inside your browser tab — not on our servers.",
  },
  {
    icon: BadgeCheck,
    tone: "blue",
    title: "Honest about limits",
    copy: "Reading time is an estimate, casing varies by language, and image output depends on your browser. We say so.",
  },
];

export function FeaturesSection() {
  return (
    <section className="section container" aria-labelledby="features-title">
      <SectionHeading
        id="features-title"
        eyebrow="Why QUICKKIT"
        title="Small on purpose. Useful by design."
        description="A focused toolkit beats a crowded sidebar. Each tool does one everyday job, properly."
        align="center"
      />

      <div className="mt-8 grid gap-3 sm:mt-11 sm:grid-cols-3 sm:gap-4">
        {features.map(({ icon: Icon, tone, title, copy }) => (
          <article
            key={title}
            className="group relative overflow-hidden rounded-card border border-line bg-white p-5 shadow-[0_1px_2px_rgb(20_23_42_/_0.03)] transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-card sm:p-7"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-16 -right-12 size-36 rounded-full bg-lavender-100/70 blur-2xl transition-opacity duration-300 group-hover:opacity-100 sm:opacity-0"
            />
            <IconTile tone={tone} size="lg">
              <Icon strokeWidth={1.9} />
            </IconTile>
            <h3 className="t-h3 relative mt-5">{title}</h3>
            <p className="t-body relative mt-2 text-[0.9375rem]">{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default FeaturesSection;
