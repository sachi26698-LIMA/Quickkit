import ToolShell from "@/components/tool-shell";
import ConsolidatedWorkspace from "@/components/tools/security/consolidated-workspace";
import {
  getPublicToolShellData,
  publicToolMetadata,
} from "@/lib/supabase/public-catalog";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";

export async function generateMetadata() {
  return publicToolMetadata(
    "password-generator",
    TOOL_SEO_METADATA["password-generator"].title,
    TOOL_SEO_METADATA["password-generator"].description,
  );
}

export default async function Page() {
  const publicData = await getPublicToolShellData("password-generator");
  return (
    <ToolShell
      publicData={publicData}
      slug="password-generator"
      privacyNotice="Password generation runs locally in your browser. Never share a generated password."
      content={{
        steps: [
          "Choose a password operation and length.",
          "Choose which character sets to include and optionally exclude look-alike characters.",
          "Generate one or more passwords using browser cryptography, then review them locally.",
          "Copy only into a trusted password manager and avoid reusing passwords.",
        ],
        faqs: [
          {
            q: "Are generated passwords sent to a server?",
            a: "No. Generation runs in your browser; copying transfers it only to the clipboard you control.",
          },
          {
            q: "Does a strong password guarantee account security?",
            a: "No. Use unique passwords, a password manager and multi-factor authentication where available.",
          },
          {
            q: "How is randomness generated?",
            a: "The generator uses the browser's cryptographic random number API with unbiased selection from the chosen character sets.",
          },
          {
            q: "What does the entropy estimate mean?",
            a: "It estimates the search space from the selected length and character pool; it cannot account for reuse, storage or later exposure.",
          },
        ],
      }}
    >
      <ConsolidatedWorkspace slug="password-generator" />
    </ToolShell>
  );
}
