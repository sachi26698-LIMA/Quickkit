import { launchToolPage } from "@/components/tools/launch/launch-tool-page";
import { launchToolBySlug } from "@/lib/tools/launch/registry";
import { resolvedToolMetadata } from "@/lib/supabase/tool-seo";

/**
 * Route for one launched tool.
 *
 * There is no per-tool copy in this file on purpose. The H1, the intro, the
 * step list, the FAQs, the reference section, the privacy sentence and the
 * curated internal links all come from the tool's single declaration in
 * `lib/tools/launch/registry.ts`, and `launch-tool-page.tsx` renders them. The
 * only thing this file states is which declaration it renders — so a tool's H1
 * cannot drift from the H1 its metadata was written for.
 *
 * `generateMetadata` resolves through `resolvedToolMetadata` (the registry
 * helper) so an administrator's override in Supabase still wins, and the
 * shipped search record is the default.
 */
export async function generateMetadata() {
  const tool = launchToolBySlug("gratuity-calculator")!;
  return resolvedToolMetadata(tool.slug, tool.seoTitle, tool.seoDescription);
}

export default launchToolPage("gratuity-calculator");
