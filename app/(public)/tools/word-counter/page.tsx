import { getPublicToolShellData } from "@/lib/supabase/public-catalog";
import { publicToolMetadata } from "@/lib/supabase/public-catalog";
import ToolShell from "@/components/tool-shell";
import WordCounter from "@/components/tools/word-counter";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";
import ToolReferenceSection from "@/components/tool-reference-section";
import { TOOL_SEO_CONTENT } from "@/lib/tool-seo-content";
export async function generateMetadata() {
  return publicToolMetadata(
    "word-counter",
    TOOL_SEO_METADATA["word-counter"].title,
    TOOL_SEO_METADATA["word-counter"].description,
  );
}
export default async function Page() {
  const publicData = await getPublicToolShellData("word-counter");
  return (
    <ToolShell
      publicData={publicData}
      slug="word-counter"
      headingDescription={TOOL_SEO_METADATA["word-counter"].description}
      stepsHeading="How to count words and check your goal"
      faqsHeading="Word counter questions, answered"
      relatedHeading="More ways to work with text"
      referenceSection={
        <ToolReferenceSection
          slug="word-counter"
          entry={TOOL_SEO_CONTENT["word-counter"]}
        />
      }
      content={{
        steps: [
          "Type or paste text into the editor.",
          "See word, character, sentence and paragraph counts update instantly.",
          "Optionally set a word goal, review your most-used words, then copy or download your text.",
          "Use the counts as drafting estimates: reading and speaking times are based on fixed words-per-minute assumptions.",
        ],
        faqs: [
          {
            q: "How are words and paragraphs counted?",
            a: "Words are whitespace-separated tokens containing a letter or number. Blank lines separate paragraphs. Languages without spaces may need a dedicated language-specific counter.",
          },
          {
            q: "How accurate is the reading time?",
            a: "It assumes 200 words per minute and rounds up to the next second. Technical content, language and reading style can change the actual time.",
          },
          {
            q: "Does QUICKKIT save my writing?",
            a: "No. The text lives in this page’s memory and is not uploaded by the tool. Navigating away or refreshing clears it.",
          },
          {
            q: "How are reading and speaking times estimated?",
            a: "Reading assumes 200 words per minute and speaking assumes 150 words per minute; actual pace varies by person, text, and language.",
          },
        ],
      }}
    >
      <WordCounter />
    </ToolShell>
  );
}
