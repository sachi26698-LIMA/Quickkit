import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Gauge,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AboutVisual } from "@/components/about/about-visual";
import { PrivacySection } from "@/components/home/privacy-section";
import { CtaSection } from "@/components/home/cta-section";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { SectionHeading } from "@/components/ui/section-heading";
import { ToolCard } from "@/components/tools/tool-card";
import { tools, toolCategories } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "About — small tasks, thoughtfully solved",
  "Learn why QUICKKIT keeps everyday browser utilities simple, local and accessible without accounts or tracking analytics.",
  "/about",
);

const stats = [
  { value: `${tools.length}`, label: "Focused tools" },
  { value: `${toolCategories.length}`, label: "Categories" },
  { value: "0", label: "Uploads" },
  { value: "0", label: "Accounts" },
];

const philosophy = [
  {
    icon: Gauge,
    tone: "purple" as const,
    title: "One job, done properly",
    copy: "Each tool answers a single, specific question — how many words, is this JSON valid, how big is this image — without a dashboard around it.",
  },
  {
    icon: LockKeyhole,
    tone: "mint" as const,
    title: "Your device does the work",
    copy: "Counting, converting, encoding and compressing happen in the browser tab. There is no upload step to trust, because there is no upload.",
  },
  {
    icon: Compass,
    tone: "blue" as const,
    title: "Limits stated plainly",
    copy: "Estimates are labelled as estimates, casing rules are described as approximate, and image output depends on your browser. No silent surprises.",
  },
];

const limits = [
  {
    title: "Reading time is an estimate",
    copy: "Based on 200 words per minute and rounded to the next second. Technical writing and language change the real figure.",
  },
  {
    title: "Casing varies by language",
    copy: "Case conversion follows English-oriented rules. Scripts without case, or languages with different title rules, need human review.",
  },
  {
    title: "Browsers differ",
    copy: "Image compression uses your browser’s encoder. Output size, format support and metadata handling can differ between browsers.",
  },
];

export default function Page() {
  return (
    <>
      {/* Hero */}
      <section
        className="relative isolate overflow-hidden border-b border-line-soft"
        aria-labelledby="about-title"
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
              "radial-gradient(44% 44% at 88% 6%, rgba(167,139,250,0.28), transparent 70%), radial-gradient(38% 40% at 2% 84%, rgba(217,255,242,0.75), transparent 72%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-grid-soft [mask-image:linear-gradient(to_bottom,black,transparent)] opacity-30"
        />

        <div className="container grid items-center gap-12 py-14 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:py-20">
          <div>
            <Badge>
              <Sparkles
                className="size-3.5 text-brand-500"
                aria-hidden="true"
              />
              About QUICKKIT
            </Badge>
            <h1 id="about-title" className="t-display mt-5">
              Useful tools.
              <br />
              <span className="text-gradient-brand">Less busywork.</span>
            </h1>
            <p className="t-lead mt-5 max-w-xl text-[1rem] sm:text-[1.0625rem]">
              QUICKKIT is a small collection of browser utilities for the tasks
              that interrupt your day: counting words, fixing text case,
              checking JSON, making a password, sharing a QR code and lightening
              an image.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href="/tools" size="lg">
                Explore the toolkit
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/privacy" variant="secondary" size="lg">
                <ShieldCheck
                  className="size-4 text-brand-600"
                  aria-hidden="true"
                />
                How we handle data
              </ButtonLink>
            </div>

            <dl className="mt-9 grid max-w-lg grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white bg-white/75 px-3 py-3 text-center shadow-[0_1px_2px_rgb(20_23_42_/_0.03)] backdrop-blur"
                >
                  <dd className="text-xl font-extrabold tracking-tight text-brand-700 sm:text-2xl">
                    {stat.value}
                  </dd>
                  <dt className="mt-0.5 text-[0.75rem] font-medium text-muted sm:text-[0.8125rem]">
                    {stat.label}
                  </dt>
                </div>
              ))}
            </dl>
          </div>

          <div className="lg:pl-6">
            <AboutVisual />
          </div>
        </div>
      </section>

      {/* Mission & vision */}
      <section className="section container" aria-labelledby="mission-title">
        <SectionHeading
          id="mission-title"
          eyebrow="Mission & vision"
          title="Make the small stuff feel effortless."
          description="QUICKKIT exists for the two-minute job that should not need an account, an installation or a tutorial."
        />

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <article className="relative overflow-hidden rounded-panel border border-lavender-200 bg-gradient-to-br from-lavender-100 via-white to-white p-6 shadow-soft sm:p-8">
            <IconTile tone="brand" size="lg">
              <Compass strokeWidth={1.9} />
            </IconTile>
            <h3 className="t-h3 mt-5">Our mission</h3>
            <p className="t-body mt-2 text-[0.9375rem]">
              Give people fast, dependable utilities that work the moment the
              page loads. Every tool is free to use, keyboard accessible and
              usable on a phone — no sign-up, no upload, no detour.
            </p>
          </article>

          <article className="relative overflow-hidden rounded-panel border border-mint-200 bg-gradient-to-br from-mint-soft via-white to-white p-6 shadow-soft sm:p-8">
            <IconTile tone="mint" size="lg">
              <Sparkles strokeWidth={1.9} />
            </IconTile>
            <h3 className="t-h3 mt-5">Our vision</h3>
            <p className="t-body mt-2 text-[0.9375rem]">
              A toolkit that grows slowly and deliberately: each addition earns
              its place through accuracy, accessibility and real usefulness
              rather than a longer feature list.
            </p>
          </article>
        </div>
      </section>

      {/* Philosophy */}
      <section
        className="border-y border-line-soft bg-lavender-25"
        aria-labelledby="philosophy-title"
      >
        <div className="section container">
          <SectionHeading
            id="philosophy-title"
            eyebrow="Product philosophy"
            title="How we decide what ships."
            description="Three rules keep the kit small, honest and pleasant to use."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {philosophy.map(({ icon: Icon, tone, title, copy }) => (
              <article
                key={title}
                className="group relative rounded-card border border-line bg-white p-6 shadow-[0_1px_2px_rgb(20_23_42_/_0.03)] transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-card"
              >
                <IconTile tone={tone}>
                  <Icon strokeWidth={1.9} />
                </IconTile>
                <h3 className="mt-5 text-[1.0625rem] font-bold tracking-[-0.02em] text-ink">
                  {title}
                </h3>
                <p className="t-body mt-2 text-[0.9375rem]">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* What's inside */}
      <section className="section container" aria-labelledby="inside-title">
        <SectionHeading
          id="inside-title"
          eyebrow="What’s inside"
          title="Six tools in one clean kit."
          description="Everything currently available, with links straight to each workspace."
          action={
            <Link href="/tools" className="text-link">
              Browse all tools
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          }
        />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>

      <PrivacySection />

      {/* Guardrails */}
      <section
        className="border-y border-line-soft bg-canvas-soft"
        aria-labelledby="limits-title"
      >
        <div className="section container">
          <SectionHeading
            id="limits-title"
            eyebrow="Honest by default"
            title="What these tools don’t claim."
            description="Useful output, clearly bounded. Verify anything that matters."
          />
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {limits.map((limit) => (
              <article
                key={limit.title}
                className="rounded-card border border-line bg-white p-5 shadow-[0_1px_2px_rgb(20_23_42_/_0.03)] sm:p-6"
              >
                <h3 className="text-[0.9375rem] font-bold text-ink">
                  {limit.title}
                </h3>
                <p className="t-body mt-1.5 text-[0.875rem]">{limit.copy}</p>
              </article>
            ))}
          </div>

          <p className="t-body mt-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.875rem]">
            <ShieldCheck
              className="size-4 shrink-0 text-mint-deep"
              aria-hidden="true"
            />
            Operator and legal details are documented on the{" "}
            <Link
              href="/privacy"
              className="font-semibold text-brand-700 underline decoration-brand-200 underline-offset-4 hover:decoration-brand-500"
            >
              privacy
            </Link>{" "}
            and{" "}
            <Link
              href="/terms"
              className="font-semibold text-brand-700 underline decoration-brand-200 underline-offset-4 hover:decoration-brand-500"
            >
              terms
            </Link>{" "}
            pages.
          </p>
        </div>
      </section>

      <div className="pt-14 sm:pt-18 lg:pt-24">
        <CtaSection />
      </div>
    </>
  );
}
