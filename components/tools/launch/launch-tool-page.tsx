import Link from "next/link";
import { notFound } from "next/navigation";
import ToolShell from "@/components/tool-shell";
import ToolWorkspace from "@/components/tools/launch/tool-workspace";
import { getPublicToolShellData } from "@/lib/supabase/public-catalog";
import { launchToolBySlug } from "@/lib/tools/launch/registry";

/**
 * The route shell shared by every launched tool.
 *
 * A route file for a new tool is now three lines:
 *
 *   export const generateMetadata = launchMetadata;
 *   export const generateStaticParams = launchStaticParams;
 *   export default LaunchToolPage;
 *
 * Everything that used to be re-typed per page — the H1, the intro, the step
 * list, the FAQs, the reference section, the privacy sentence and the JSON-LD —
 * is derived from the tool's single declaration in `registry.ts`. That is not a
 * convenience: the SEO audit fails when a page's rendered H1 disagrees with its
 * record, and it can only disagree here if the registry disagrees with itself.
 */

/**
 * Reference block: the formulas, rates and conventions the engine applied.
 *
 * Rendered as real prose lists rather than a single paragraph so a reader can
 * check one rule at a time, and so the page carries the reference content the
 * audit requires for a tool route.
 */
function LaunchReference({
  reference,
  caveat,
  jurisdiction,
}: {
  reference: { title: string; body: string }[];
  caveat?: string;
  jurisdiction?: string;
}) {
  return (
    <div className="qw-prose">
      {jurisdiction ? (
        <p>
          <strong>Applies to:</strong> {jurisdiction}.
        </p>
      ) : null}
      {reference.map((section) => (
        <div key={section.title} style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, margin: "0 0 6px", color: "#352a45" }}>
            {section.title}
          </h3>
          <p style={{ margin: 0 }}>{section.body}</p>
        </div>
      ))}
      {caveat ? (
        <p
          style={{
            marginTop: 12,
            padding: "11px 13px",
            border: "1px solid #f0dcae",
            background: "#fdf8ec",
            borderRadius: 10,
            color: "#6b5418",
          }}
        >
          <strong>Important:</strong> {caveat}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The rendered page for one launched tool.
 *
 * Split out from the default export because the launched tools have their own
 * static routes (`app/(public)/tools/<slug>/page.tsx`) while the calculator
 * dynamic route also renders launch tools. A static route receives no
 * `params.calculator`, so the slug has to be passed in explicitly — reading it
 * off `params` is what made every launch route resolve to `notFound()`.
 */
export async function LaunchToolScreen({ slug }: { slug: string }) {
  const tool = launchToolBySlug(slug);
  if (!tool) notFound();

  const publicData = await getPublicToolShellData(tool.slug);

  return (
    <ToolShell
      slug={tool.slug}
      publicData={publicData}
      headingDescription={tool.description}
      stepsHeading={`How to use the ${tool.name.toLowerCase()}`}
      faqsHeading={`${tool.name} questions, answered`}
      relatedHeading="Related tools"
      privacyNotice={
        "This tool runs entirely in your browser. Nothing you type or paste is uploaded, logged or stored, and the page makes no network request with your data. Copy or download the result before you leave — reloading clears it."
      }
      referenceSection={
        <LaunchReference
          reference={tool.reference}
          caveat={tool.caveat}
          jurisdiction={tool.jurisdiction}
        />
      }
      content={{
        steps: tool.steps,
        faqs: tool.faqs,
      }}
    >
      <ToolWorkspace tool={tool} />
      <p
        style={{
          marginTop: 18,
          fontSize: 12,
          color: "#6e6579",
          lineHeight: 1.7,
        }}
      >
        Looking for something else? Browse{" "}
        <Link href="/tools" style={{ textDecoration: "underline" }}>
          every QUICKKIT tool
        </Link>{" "}
        or return to the full reference on this page.
      </p>
    </ToolShell>
  );
}

/**
 * Build the default export for one launched tool's static route.
 *
 * `app/(public)/tools/<slug>/page.tsx` is then a single line that names its own
 * slug, so the file can never render a different tool than the one its route
 * resolves to.
 */
export function launchToolPage(slug: string) {
  return async function LaunchToolRoute() {
    return <LaunchToolScreen slug={slug} />;
  };
}

/** Default export for the `[calculator]` dynamic route, which does have params. */
export default async function LaunchToolPage({
  params,
}: {
  params: Promise<{ calculator: string }>;
}) {
  const { calculator } = await params;
  return <LaunchToolScreen slug={calculator} />;
}
