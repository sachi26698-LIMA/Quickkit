import ToolShell from "@/components/tool-shell";
import ConsolidatedWorkspace from "@/components/tools/security/consolidated-workspace";
import { securityGroupBySlug } from "@/lib/tools/security/consolidation";
import {
  getPublicToolShellData,
  publicToolMetadata,
} from "@/lib/supabase/public-catalog";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";

export async function generateMetadata() {
  return publicToolMetadata(
    "hash-generator",
    TOOL_SEO_METADATA["hash-generator"].title,
    TOOL_SEO_METADATA["hash-generator"].description,
  );
}

/**
 * This route is the consolidated Hash & File Integrity workspace, not a single
 * tool. It has to render the tabbed workspace because the group owns three
 * operations — hash-generator, hash-comparison and file-privacy-checker — and
 * the legacy URLs for the other two redirect here with `?operation=…`.
 *
 * Rendering the standalone <HashGenerator /> meant those redirects landed on a
 * page that ignored the parameter, leaving "Hash Comparison" and "File Privacy
 * Checker" with no reachable UI at all. `password-generator` already worked this
 * way; this page was simply never converted.
 */
export default async function Page() {
  const security = securityGroupBySlug("hash-generator");
  const publicData = await getPublicToolShellData("hash-generator");
  return (
    <ToolShell
      publicData={publicData}
      slug="hash-generator"
      privacyNotice="Hashing, checksum comparison and file signature checks run locally in your browser. Only files you choose are read, and nothing is uploaded."
      content={{
        steps: [
          "Choose an operation: hash and checksum, digest comparison, or file privacy checks.",
          "Paste text or drop a file into the selected operation.",
          "Run the operation — everything is computed in this tab.",
          "Copy the digest or read the findings, then switch tabs to start the next check.",
        ],
        faqs: [
          {
            q: "Are my files or hashes uploaded?",
            a: "No. Hashing, comparison and file inspection run in your browser. Nothing is sent to a server.",
          },
          {
            q: "Which digest algorithms are supported?",
            a: "The supported set is shown in the operation itself, using the browser's own crypto implementation rather than a bundled copy.",
          },
          {
            q: "Can I compare two digests without revealing them?",
            a: "Yes. The comparison operation runs locally and reports only whether the two values match.",
          },
          {
            q: "Can a hash prove a file is safe?",
            a: "No. A matching digest proves the file is byte-for-byte what you expected; it says nothing about whether that file is trustworthy.",
          },
        ],
      }}
    >
      <ConsolidatedWorkspace slug={security?.slug ?? "hash-generator"} />
    </ToolShell>
  );
}
