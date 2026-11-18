import type { ToolKeywordCluster } from "../keyword-clusters";

/**
 * Text & writing cluster.
 *
 * `image-to-text` carries the strongest genuine Indian-language intent on the
 * site — the tool really does read Hindi, Gujarati, Marathi, Bengali, Tamil,
 * Telugu and Urdu on the device, so those phrasings are accurate, not filler.
 */
export const textKeywordClusters: ToolKeywordCluster[] = [
  {
    slug: "word-counter",
    primary: "word counter",
    secondary: [
      "character counter",
      "count words in essay",
      "reading time calculator",
      "word count for twitter bio",
      "keyword density checker",
    ],
    groups: {
      alternativeName: [
        "word count tool",
        "character count tool",
        "text counter",
      ],
      synonym: [
        "count the words in my text",
        "check how many characters a sentence has",
        "measure text length",
      ],
      action: [
        "count words and characters as you type",
        "check word count against a limit",
        "track repeated keywords in a draft",
      ],
      longTail: [
        "count words and characters for a college essay",
        "check word count and reading time together",
        "count characters for a form with a limit",
      ],
      problem: [
        "assignment has a 3000 word limit and i need to check",
        "bio is capped at 160 characters",
      ],
      question: [
        "how many words is this text",
        "how do i count characters in a paragraph",
        "how long does this take to read",
      ],
      qualifier: [
        "word counter online free",
        "character counter without signing up",
      ],
      india: ["word count kaise kare", "essay me kitne words hai"],
    },
    audience: "Students, writers and applicants checking a length limit",
  },
  {
    slug: "case-converter",
    primary: "case converter",
    secondary: [
      "uppercase to lowercase converter",
      "title case converter",
      "camelcase converter",
      "sentence case tool",
      "convert text case without retyping",
    ],
    groups: {
      alternativeName: ["text case changer", "letter case converter"],
      synonym: [
        "change text to capital letters",
        "fix text that is in all caps",
        "switch between upper and lower case",
      ],
      action: [
        "convert a paragraph to title case",
        "turn shouted text into sentence case",
        "convert a heading to camelcase or kebab-case",
      ],
      longTail: [
        "convert caps lock text to normal case",
        "convert headings to title case all at once",
        "convert text to snake case for a variable name",
      ],
      problem: [
        "accidentally typed a paragraph in caps lock",
        "pasted text is all uppercase and needs correcting",
      ],
      question: [
        "how to change text to lowercase",
        "how do i convert text to title case",
        "what is the difference between camelcase and snake case",
      ],
      qualifier: ["case converter online free", "convert text case online"],
      india: [
        "capital letter ko small kaise kare",
        "text ka case kaise change kare",
      ],
    },
    audience:
      "Anyone fixing casing in headings, code identifiers or pasted text",
  },
  {
    slug: "image-to-text",
    primary: "image to text",
    secondary: [
      "ocr online free",
      "hindi image to text",
      "screenshot to text",
      "scanned pdf to editable text",
      "handwriting to text ocr",
      "gujarati ocr",
    ],
    groups: {
      alternativeName: [
        "ocr tool",
        "photo to text converter",
        "picture to text",
      ],
      synonym: [
        "extract text from a picture",
        "copy text out of an image",
        "read the words in a photo",
      ],
      action: [
        "extract text from a screenshot",
        "run ocr on a scanned pdf on your device",
        "pull text out of a photographed notice",
      ],
      longTail: [
        "extract text from a picture taken on a phone",
        "convert a scanned receipt to editable text",
        "read hindi text from a photo without uploading it",
      ],
      problem: [
        "text in a screenshot cannot be selected",
        "scanned document is an image so i cannot edit it",
      ],
      question: [
        "how to copy text from an image",
        "how do i extract text from a screenshot",
        "can ocr read hindi and regional languages",
      ],
      qualifier: ["image to text online free", "free ocr no uploading"],
      india: [
        "photo se text kaise nikale",
        "hindi photo ko text me kaise badle",
        "gujarati image to text",
      ],
    },
    audience:
      "People pulling text out of screenshots, notices, receipts and scans, often in Indian languages",
  },
];
