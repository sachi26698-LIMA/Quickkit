import ToolShell from "@/components/tool-shell";
import PasswordGenerator from "@/components/tools/password-generator";
import { pageMetadata } from "@/lib/seo";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";
import ToolReferenceSection from "@/components/tool-reference-section";
import { TOOL_SEO_CONTENT } from "@/lib/tool-seo-content";
export const metadata = pageMetadata(
  TOOL_SEO_METADATA["password-generator"].title,
  TOOL_SEO_METADATA["password-generator"].description,
  "/tools/password-generator",
);
export default function Page() {
  return (
    <ToolShell
      slug="password-generator"
      headingDescription={TOOL_SEO_METADATA["password-generator"].description}
      stepsHeading="How to generate a strong random password"
      faqsHeading="Password generator questions, answered"
      relatedHeading="More ways to protect accounts and files"
      referenceSection={
        <ToolReferenceSection
          slug="password-generator"
          entry={TOOL_SEO_CONTENT["password-generator"]}
        />
      }
      content={{
        steps: [
          "Choose a length from 8 to 64 characters.",
          "Select at least one character set and optionally exclude look-alike characters.",
          "Check the strength meter (100+ bits is excellent), generate, and copy your password into a password manager.",
          "Save the copied password directly into a password manager and avoid reusing it across accounts.",
        ],
        faqs: [
          {
            q: "How is randomness generated?",
            a: "The tool uses crypto.getRandomValues, rejection sampling to avoid modulo bias, and a secure shuffle. Every selected character set contributes at least one character.",
          },
          {
            q: "Are generated passwords saved?",
            a: "No. Passwords stay in this page’s memory and are not sent to a server or analytics. Copying places the password on your device clipboard, which other applications may access.",
          },
          {
            q: "Is a generated password enough to secure an account?",
            a: "No password guarantees account security. Prefer longer unique passwords, use a password manager and enable multi-factor authentication where available.",
          },
          {
            q: "What does the entropy number mean?",
            a: "It estimates the number of random bits from the selected length and character pool. It does not account for how you store, reuse, or expose the password.",
          },
        ],
      }}
    >
      <PasswordGenerator />
    </ToolShell>
  );
}
