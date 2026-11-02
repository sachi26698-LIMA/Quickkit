import ToolShell from "@/components/tool-shell";
import PasswordGenerator from "@/components/tools/password-generator";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Password Generator — secure random passwords",
  "Create 8–64 character passwords using browser cryptography, with a live entropy strength meter. Choose character sets, exclude ambiguous characters and copy locally.",
  "/tools/password-generator",
);
export default function Page() {
  return (
    <ToolShell
      slug="password-generator"
      content={{
        steps: [
          "Choose a length from 8 to 64 characters.",
          "Select at least one character set and optionally exclude look-alike characters.",
          "Check the strength meter (100+ bits is excellent), generate, and copy your password into a password manager.",
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
        ],
      }}
    >
      <PasswordGenerator />
    </ToolShell>
  );
}
