import type { ReactNode } from "react";
import ToolShell, { type ToolContent } from "@/components/tool-shell";
import ToolReferenceSection from "@/components/tool-reference-section";
import { TOOL_SEO_CONTENT, TOOL_SEO_METADATA } from "@/lib/tool-seo-content";

const pageContent: Record<string, ToolContent> = {
  "json-validator": {
    steps: [
      "Paste JSON, load the sample, or open a local .json file.",
      "Choose Validate JSON. A valid value is shown as a normalized preview; invalid input includes the parser message and nearest line and column.",
      "Copy or download the valid preview, then clear or reset the workspace when finished.",
    ],
    faqs: [
      {
        q: "What does valid JSON allow?",
        a: "JSON requires double-quoted keys and strings, commas between values, matching brackets and JSON literals. Comments, trailing commas, undefined and NaN are not allowed.",
      },
      {
        q: "Does validation run code or upload my input?",
        a: "No. The validator uses JSON.parse in your browser. It never evaluates input as JavaScript and QUICKKIT does not receive the data.",
      },
      {
        q: "Are error locations exact?",
        a: "The browser parser's position is mapped to a one-based line and column when available, with a short escaped excerpt to help locate the issue.",
      },
    ],
  },
  "html-formatter": {
    steps: [
      "Paste HTML, load the sample, or open a local .html file.",
      "Choose Format HTML for readable indentation or Minify HTML for compact markup. Indentation applies to the formatted result.",
      "Review the highlighted output and real UTF-8 size comparison, then copy or download it.",
    ],
    faqs: [
      {
        q: "Are embedded scripts executed?",
        a: "No. The input is parsed and returned as inert text. HTML formatting and minification never insert the result into the document or execute script text.",
      },
      {
        q: "Will minification alter inline JavaScript or CSS?",
        a: "No. Embedded JavaScript and CSS minification are explicitly disabled. The tool only compacts markup and preserves meaningful text whitespace.",
      },
      {
        q: "Does it process files remotely?",
        a: "No. Files are read locally in your browser and are not uploaded or saved by QUICKKIT.",
      },
    ],
  },
  "css-minifier": {
    steps: [
      "Paste CSS, load the sample, or open a local .css file.",
      "Choose Minify CSS to parse and compress the stylesheet. Syntax errors are reported instead of being removed with unsafe text substitutions.",
      "Compare original and compressed UTF-8 bytes, then copy or download the result.",
    ],
    faqs: [
      {
        q: "Does it use regular expressions to remove spaces?",
        a: "No. A CSS syntax parser handles tokens, comments and whitespace. Structure-rewriting optimizations are disabled to reduce semantic risk.",
      },
      {
        q: "Are license comments kept?",
        a: "The minifier keeps the first /*! license-style comment and removes ordinary comments.",
      },
      {
        q: "Is my stylesheet uploaded?",
        a: "No. Parsing and minification run locally in the browser.",
      },
    ],
  },
  "javascript-minifier": {
    steps: [
      "Paste JavaScript, load the sample, or open a local .js file.",
      "Choose Minify JavaScript. Terser parses and transforms the source without executing it; invalid syntax is reported.",
      "Review size statistics and highlighted output, then copy or download the minified source.",
    ],
    faqs: [
      {
        q: "Does the tool execute JavaScript?",
        a: "Never. It uses a parser and AST minifier only. QUICKKIT does not use eval, Function, a script element or a remote execution service.",
      },
      {
        q: "Can minification change behavior?",
        a: "Any minifier can expose assumptions in unusual code, so review critical output. This tool uses one conservative compression pass and does not enable top-level mangling.",
      },
      {
        q: "Are my files sent to a server?",
        a: "No. Files are read in the browser and are not uploaded.",
      },
    ],
  },
  "base64-encoder-decoder": {
    steps: [
      "Choose Encode or Decode. For encoding, type Unicode text or select a file; for decoding, paste Base64 and choose UTF-8 text or binary file.",
      "Choose the matching action. Invalid characters, padding and invalid UTF-8 are reported clearly.",
      "Copy text output or download the Base64 text or decoded bytes. Clear removes the current data; Reset also restores defaults.",
    ],
    faqs: [
      {
        q: "Does text use UTF-8?",
        a: "Yes. Unicode is encoded as UTF-8 bytes before Base64 conversion and decoded with strict UTF-8 validation.",
      },
      {
        q: "Can I encode a non-text file?",
        a: "Yes. File bytes are read locally and Base64-encoded without a text conversion. Decoding can save the bytes as a binary file.",
      },
      {
        q: "Is there a size limit?",
        a: "Text and encoded content are capped to keep memory use predictable. Selected files are limited to 10 MB; nothing leaves the browser.",
      },
    ],
  },
  "url-encoder-decoder": {
    steps: [
      "Choose Encode or Decode, then select Component or Full URL mode.",
      "Enter a complete URL or a query parameter value and run the action. Component mode escapes reserved characters; full URL mode preserves URL separators.",
      "Copy or download the result. Invalid percent escapes are shown as errors rather than silently changed.",
    ],
    faqs: [
      {
        q: "Which mode should I use for a query value?",
        a: "Use Component mode for an individual parameter value such as a search term. It encodes ? & = and other reserved characters inside that value.",
      },
      {
        q: "What does Full URL mode preserve?",
        a: "It uses encodeURI/decodeURI, retaining URL structure such as : / ? & = # while escaping spaces, Unicode and other characters that require encoding.",
      },
      {
        q: "Does this make a request to the URL?",
        a: "No. The tool only transforms the text. It never opens, fetches or submits the supplied URL.",
      },
    ],
  },
  "uuid-generator": {
    steps: [
      "Choose a batch quantity between 1 and 2,000.",
      "Choose Generate UUIDs. Values use the browser's secure random generator and each batch is checked for duplicates.",
      "Copy or download the newline-separated UUID v4 values. Use Reset to return to the default quantity.",
    ],
    faqs: [
      {
        q: "Are these UUID v4 values?",
        a: "Yes. The version and variant bits are set according to UUID v4, and the random bytes come from crypto.getRandomValues.",
      },
      {
        q: "Can one batch contain duplicates?",
        a: "The generator checks uniqueness with a Set and retries any collision before showing the batch.",
      },
      {
        q: "Are identifiers sent anywhere?",
        a: "No. Generation occurs in the browser; QUICKKIT does not collect the generated values.",
      },
    ],
  },
  "regex-tester": {
    steps: [
      "Enter a regular expression, choose flags and type or paste test text.",
      "Review highlighted matches, match indexes and capture groups. Add replacement text to see a live replacement preview.",
      "Copy or download the replacement result. Invalid patterns and expressions that exceed the worker time limit produce an error message.",
    ],
    faqs: [
      {
        q: "Can a pattern execute JavaScript?",
        a: "No. The pattern is passed only to the browser's RegExp constructor in a dedicated worker. No eval or Function constructor is used.",
      },
      {
        q: "Can a slow pattern freeze the page?",
        a: "The matcher runs in a disposable worker that is terminated after a short time limit. Pattern and sample lengths are also capped.",
      },
      {
        q: "What flags are supported?",
        a: "The tester supports g, i, m, s and u. Replacement strings follow the browser's String.replace conventions, including $1 and $&lt;name&gt;.",
      },
    ],
  },
  "hash-generator": {
    steps: [
      "Choose MD5, SHA-1, SHA-256, SHA-384 or SHA-512, then select Text or File as the input source.",
      "Type UTF-8 text or choose a file. Empty text and empty files are valid hash inputs.",
      "Choose Generate hash, then copy or download the lowercase hexadecimal digest.",
    ],
    faqs: [
      {
        q: "Are MD5 and SHA-1 secure?",
        a: "They are legacy algorithms provided for compatibility. Do not use them for security-sensitive signatures, password storage or collision-resistant integrity checks; prefer SHA-256 or SHA-512.",
      },
      {
        q: "How are files processed?",
        a: "Files are read and hashed in 1 MiB chunks entirely in the browser, up to the documented 100 MB limit.",
      },
      {
        q: "Does QUICKKIT store or upload input?",
        a: "No. Text and file bytes remain local; only the digest is shown in the workspace.",
      },
    ],
  },
  "xml-formatter": {
    steps: [
      "Paste XML, load the sample or open a local .xml file.",
      "Choose Format XML for readable indentation or Minify XML to remove layout whitespace safely.",
      "Review the syntax-highlighted result and size comparison, then copy or download the XML.",
    ],
    faqs: [
      {
        q: "Why are DTD declarations rejected?",
        a: "Rejecting DOCTYPE avoids external entity access and entity-expansion attacks. Built-in XML entities and normal namespaces are supported.",
      },
      {
        q: "Does minification remove text content?",
        a: 'No. Mixed text content and xml:space="preserve" sections are retained. Only layout whitespace between element-only children is removed.',
      },
      {
        q: "Is XML processed locally?",
        a: "Yes. XML parsing and formatting happen in the browser and no source is uploaded.",
      },
    ],
  },
};

const pageEnhancements: Record<
  keyof typeof pageContent,
  { step: string; faq: { q: string; a: string } }
> = {
  "json-validator": {
    step: "For a large file, validate it first, then use the reported key count, depth, and UTF-8 size to decide whether to inspect or reformat it.",
    faq: {
      q: "Can the root value be an array or a string?",
      a: "Yes. JSON allows an object, array, string, number, boolean, or null at the root. The validator reports the root type rather than requiring an object.",
    },
  },
  "xml-formatter": {
    step: 'If the result is for an XML consumer that depends on whitespace, keep significant text inside mixed-content elements and use xml:space="preserve" where needed.',
    faq: {
      q: "Are namespaces removed or renamed?",
      a: "No. The parser and serializer preserve namespace declarations and qualified element names; the formatter changes layout whitespace, not namespace intent.",
    },
  },
  "html-formatter": {
    step: "Compare the UTF-8 byte totals before using the result, especially when the page contains whitespace-sensitive text or inline templates.",
    faq: {
      q: "Does HTML minification compress embedded CSS or JavaScript?",
      a: "No. The local minifier has CSS and JavaScript minification disabled, so embedded style and script contents are not rewritten by this action.",
    },
  },
  "css-minifier": {
    step: "Keep the original stylesheet alongside the minified copy and run your own browser or application checks before replacing production CSS.",
    faq: {
      q: "Why might the output not be the smallest possible CSS?",
      a: "The tool disables CSSO structure-rewriting optimizations to reduce semantic risk. It removes safe syntax overhead but does not try every transformation that might change cascade behavior.",
    },
  },
  "javascript-minifier": {
    step: "Keep the original source and run your existing tests against the minified file before deploying it.",
    faq: {
      q: "Are top-level variable names changed?",
      a: "No. Local names may be mangled, but top-level mangling is disabled so exported or externally referenced top-level identifiers are not renamed by that option.",
    },
  },
  "base64-encoder-decoder": {
    step: "For a decoded download, choose a filename and verify the file type in the receiving application; Base64 itself does not carry a reliable file extension.",
    faq: {
      q: "Is Base64 encryption or a privacy feature?",
      a: "No. Base64 is a reversible text representation of bytes, not encryption or access control. Anyone with the encoded string can decode it.",
    },
  },
  "url-encoder-decoder": {
    step: "After encoding one parameter value, append it to the URL yourself; use Full URL mode only when the input is an entire URL and its separators should remain structural.",
    faq: {
      q: "Why does Component mode encode ampersands?",
      a: "An ampersand separates query parameters in a URL. Encoding it inside one component keeps it as part of that value instead of starting another parameter.",
    },
  },
  "uuid-generator": {
    step: "Copy the generated identifiers into your application or data file promptly; the workspace does not provide a persistent history.",
    faq: {
      q: "Can UUID v4 guarantee no collision anywhere?",
      a: "No random identifier scheme can promise that. UUID v4 makes collisions extremely unlikely, and this tool additionally checks duplicates within the current batch.",
    },
  },
  "regex-tester": {
    step: "Try a small representative sample first, then increase the sample up to the 20,000-character limit; timeouts indicate the pattern needs a safer structure.",
    faq: {
      q: "Does the tester support every JavaScript regex flag?",
      a: "It supports g, i, m, s, and u. Flags outside that set, including sticky and indices, are not offered in this tester.",
    },
  },
  "hash-generator": {
    step: "Compare the displayed digest with a trusted expected value; matching hashes are useful for checking bytes, but they do not prove who created a file.",
    faq: {
      q: "Can I use a hash as a password-storage method?",
      a: "No. This tool computes general-purpose digests, not password hashes. Password storage needs a dedicated slow, salted password-hashing scheme such as Argon2id, scrypt, or bcrypt.",
    },
  },
};

export default function DeveloperToolPage({
  slug,
  children,
}: {
  slug: keyof typeof pageContent;
  children: ReactNode;
}) {
  const entry = TOOL_SEO_CONTENT[slug];
  const metadata = TOOL_SEO_METADATA[slug];
  const content = pageContent[slug];
  const enhancement = pageEnhancements[slug];
  return (
    <ToolShell
      slug={slug}
      content={{
        steps: [...content.steps, enhancement.step],
        faqs: [...content.faqs, enhancement.faq],
      }}
      headingDescription={metadata.description}
      stepsHeading={entry.stepsHeading}
      faqsHeading={entry.faqsHeading}
      relatedHeading={entry.relatedHeading}
      referenceSection={<ToolReferenceSection slug={slug} entry={entry} />}
    >
      {children}
    </ToolShell>
  );
}
