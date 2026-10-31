import { BadgeCheck, Gauge, LockKeyhole, type LucideIcon } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { SectionHeading } from "@/components/ui/section-heading";

const principles: {
  icon: LucideIcon;
  tone: "purple" | "mint" | "blue";
  title: string;
  copy: string;
}[] = [
  {
    icon: Gauge,
    tone: "purple",
    title: "Right to the point",
    copy: "Open a tool, get your result, get on with your day. No setup wizard, no account, no detour.",
  },
  {
    icon: LockKeyhole,
    tone: "mint",
    title: "Local by design",
    copy: "Counting, converting, encoding and compressing all happen inside your browser tab.",
  },
  {
    icon: BadgeCheck,
    tone: "blue",
    title: "Honest about limits",
    copy: "Reading time is an estimate, casing varies by language, and image output depends on your browser. We say so.",
  },
];

export function PrinciplesSection() {
  return (
    <section
      className="container pb-16 sm:pb-20"
      aria-labelledby="principles-title"
    >
      <SectionHeading
        id="principles-title"
        eyebrow="Why QUICKKIT"
        title="Small on purpose. Useful by design."
        description="A focused toolkit beats a crowded sidebar. Every tool here does one everyday job well."
        align="center"
      />

      <div className="mt-9 grid gap-3 sm:mt-11 sm:grid-cols-3 sm:gap-4">
        {principles.map(({ icon: Icon, tone, title, copy }) => (
          <article
            key={title}
            className="rounded-card border border-line bg-white p-5 shadow-[0_1px_2px_rgb(23_27_46_/_0.03)] transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card sm:p-6"
          >
            <IconTile tone={tone}>
              <Icon strokeWidth={1.8} />
            </IconTile>
            <h3 className="mt-4 text-base font-bold tracking-[-0.01em] text-ink">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default PrinciplesSection;
