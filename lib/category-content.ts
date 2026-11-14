// ─────────────────────────────────────────────────────────────────────────────
// Category page copy.
//
// Each category page used to be a heading, a grid of tool cards and nothing to
// read, which is thin for a page that is supposed to be a hub. These entries
// give each category its own explanation — what the tools in it actually do,
// how they fit together, where the limits are, and what happens to the files.
//
// Rules this file follows, and that tests/category-content.test.tsx enforces:
//   • one entry per published category, 300–500 words each;
//   • no two categories may share a sentence or a paragraph;
//   • every claim must be true of the shipped tools (limits, formats, outputs),
//     because a hub page that exaggerates is worse than an empty one.
// Nothing here is keyword-stuffed: the words are the ones a person would use to
// explain the category to someone who has never opened it.
// ─────────────────────────────────────────────────────────────────────────────

export type CategoryCopy = {
  /** The section heading (an H2 — the page's only H1 is the category name). */
  heading: string;
  /** One-sentence answer that opens the section. */
  intro: string;
  /** The body, one entry per paragraph. */
  paragraphs: string[];
};

export const categoryContent: Record<string, CategoryCopy> = {
  "pdf-tools": {
    heading: "Working with PDFs privately in your browser",
    intro:
      "Nine tools cover the whole document loop: combining, splitting, compressing, protecting, converting to Word or images, converting images back to PDF, and a studio for page-level edits.",
    paragraphs: [
      "Most PDF jobs are small and urgent — three reports have to become one file before a meeting, or a scan is too large to email. They are also the jobs people are least willing to hand to a stranger's server, which is why each tool here reads and writes the file inside the browser tab. The merge tool opens every file, reports anything it cannot handle safely (a signed document, an XFA form, a damaged or password-protected file), and re-opens the finished PDF to check it before offering the download. Nothing is silently dropped to make a merge look successful.",
      "The tools are designed to be used in sequence. Merge combines files and lets you choose pages with ranges such as 1–3 or 5; Split does the opposite, cutting one document into ranges, single pages, every N pages or one file per page; PDF Studio is for page-level work, where pages are rotated, reordered or removed by hand. Compress belongs at the end, after the structure is settled, because it re-encodes the images inside the document and leaner images cannot be made sharper again by merging afterwards.",
      "Conversion runs in both directions. PDF to Word produces an editable DOCX and shows the original and the converted document side by side, so you can see exactly what moved; scanned files can go through on-device OCR first. PDF to Image renders pages as JPG, PNG or WebP from 72 to 600 DPI, which is the range that matters between a quick preview and print. Images to PDF goes the other way, placing one photo per page on A4, A3, A5, Letter or a custom size, with margins and fit controls. PDF Lock & Unlock covers AES-256 and AES-128 encryption, separate open and permissions passwords, and removing a password you already know.",
      "Two practical limits are worth knowing before you start: most of these tools take files up to 50 MB each and 100 MB per batch, so memory use stays predictable on a phone, and a password you enter for an encrypted file lives only in memory for the length of the operation. Closing the tab clears the queue, the passwords and the preview images. Word to PDF is the one exception in the whole toolkit — it converts on a server, says so on the page, and asks for consent before any file is sent.",
    ],
  },
  "image-tools": {
    heading: "Getting an image to the size you actually need",
    intro:
      "Four tools handle the difference between the image you have and the image a site, form or print job will accept: weight, dimensions, framing and format.",
    paragraphs: [
      "The compressor is for weight. It can work to a quality level you choose, or to an exact target such as 200 KB, searching the quality levels to find the highest setting that still fits your limit. If the target cannot be reached at any quality it says so and offers the smallest file it can produce instead of quietly missing the number. The resizer is for dimensions: exact pixels, a percentage, a longest side, or a social preset, with rotation and cropping along the way. The cropper is for framing — freeform, fixed ratios, square or circle crops, with presets for the common social formats. The converter changes format between JPEG, PNG, WebP, AVIF, GIF, BMP and TIFF.",
      "They are separate tools, not one crowded screen, because the order matters. Resize first when the dimensions are wrong, crop first when the framing is wrong, convert when the format is wrong, and compress last — compressing an image you are about to resize wastes quality twice. Every comparison you see is real byte counts from your own files, not an estimate: an already-optimised image can grow when it is re-encoded, and the tool labels that rather than pretending the output is smaller.",
      "Formats behave differently and the tools respect it. JPEG cannot store transparency, so transparent areas are filled with a background colour you choose; PNG, WebP and AVIF keep the alpha channel. PNG compression is lossless, so its size depends on the pixels rather than on a quality slider — a busy screenshot will stay large no matter how far the slider moves. AVIF and WebP usually produce the smallest files for photographs, while PNG remains the right answer for flat graphics and screenshots that need to stay crisp.",
      "Batches are limited to 20 images and around 200 megapixels in total, and one image at a time is processed at full quality rather than being downscaled behind your back. Everything — decode, re-encode, crop, ZIP packaging — happens in the tab: the images are never uploaded, there is no storage, and closing the page discards the queue and the previews.",
    ],
  },
  "qr-barcode": {
    heading: "QR codes you can check before you print them",
    intro:
      "Three tools share this category: one builds QR codes, one reads them back, and one does the same for the linear barcodes on retail and shipping labels.",
    paragraphs: [
      "The generator covers twenty-eight content types people actually need — links, plain text, email, Wi-Fi credentials, vCard contacts, calendar events, Payment / UPI links, structured Data Templates, social profiles and app store listings — with optional ECDSA anti-tamper signing and AES-256-GCM password-encrypted QR vaults. Colours, module shapes, labelled frames, a centre logo and the error-correction level are all yours to set, and the level rises when a logo covers part of the code instead of being left where a cheap scanner would fail.",
      "Verification is the point. Before you download anything, the tool decodes the code it has just drawn and shows what the result really contains, so a mistyped URL or an invisible character is caught on screen instead of at the printer. The barcode studio applies the same discipline to the linear world: eleven symbologies, from Code 128 and Code 39 through EAN-13, EAN-8, UPC-A, UPC-E and ITF-14 to Codabar, MSI, Pharmacode and GS1-128, each encoded from its published tables with character-set, length and check-digit rules enforced. A missing EAN check digit is calculated and named; a wrong one is refused rather than overwritten. GS1-128 is parsed application identifier by application identifier, so a bad field length or a broken GTIN check never reaches a print run.",
      "The scanner reads codes from a camera, a photo, a screenshot or a folder of images, and decodes every code in a picture rather than only the first. Results are shown as what they are — a link, Wi-Fi credentials, a payment string, a phone number — and a link is flagged when it points at a shortened or unusual destination. The barcode studio carries its own reader: rear camera by default, opened only when you press Start, with duplicate reads folded away so a shelf of labels does not become the same label twenty times. MSI and Pharmacode are generation-only, because the bundled reader has no support for either.",
      "Bulk work is file-shaped rather than server-shaped: a CSV of up to a thousand rows becomes a ZIP of SVG or PNG files or a print-ready PDF sheet of millimetre-sized labels, and every row reports ready, duplicate or invalid with the reason. There are no dynamic QR codes or scan analytics here — a dynamic code depends on a redirect service that can change someone else's printed code, and scan tracking needs a server that records every tap. Everything runs locally; the scanner is the only page allowed to ask for your camera, and only when you press the button that needs it.",
    ],
  },
  "text-writing": {
    heading: "Counting, casing and reading text you did not type",
    intro:
      "Three tools for the rules that sit around writing: how long it is, how it is capitalised, and how to get text out of a picture.",
    paragraphs: [
      "The word counter is the one people open most often, usually against a limit — an essay of 500 words, a meta description of 155 characters, a talk that has to fill ten minutes. It counts words, characters, sentences and paragraphs as you type, shows reading and speaking time as estimates based on ordinary reading rates rather than as a promise, tracks how often keywords repeat, and can hold a word goal while you write. It never sends the text anywhere; the counter and the text are both in the tab.",
      "The case converter exists because retyping a heading is slower than converting it. It handles ten styles — UPPERCASE, lowercase, Title Case, Sentence case, camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE and the alternating one — without collapsing your line breaks, which is what most quick scripts do. Select all and convert, or paste and copy the result back where it came from.",
      "Image to Text covers the case where the words are not text yet: a photo of a printed page, a screenshot of an error message, a receipt, a scanned PDF, a slide someone shared. The OCR engine runs on your device in eight languages — English, Hindi, Gujarati, Marathi, Bengali, Tamil, Telugu and Urdu — with six extraction modes, confidence highlighting, and a side-by-side editor so the recognised text can be corrected before it is exported as TXT, DOCX, PDF, CSV or JSON.",
      "Accuracy depends on the source: a straight, well-lit scan reads almost perfectly, a photograph at an angle with small print does not, and the confidence highlighting shows exactly which words the engine was unsure about instead of presenting a guess as fact. All three tools process locally, which is the reason it is safe to drop in a contract, a prescription or an internal document.",
    ],
  },
  "developer-tools": {
    heading: "Code and data tools that never send your input anywhere",
    intro:
      "Eleven small tools for the checks developers make all day: is this valid, what is wrong with it, how big is it, and what does this string actually encode?",
    paragraphs: [
      "Formatting and validation come first. The JSON formatter indents with two spaces, four spaces or a tab, sorts keys if you want them sorted, collapses deep structures into a tree, and validates with the exact line and column of the first error — the missing comma or the stray bracket, not a shrug. The JSON validator is the same engine with the workspace aimed at diagnosis. HTML and XML have their own formatters and minifiers, and each reports a real syntax error instead of mangling the input until it parses.",
      "The minifiers are the ones that usually go wrong elsewhere. CSS is compressed by a real CSS parser that keeps the first license comment and refuses to make structure-rewriting guesses; JavaScript goes through Terser, which parses and transforms without ever executing the code. Both show the real before and after byte counts, which is often the first evidence that a bundle is bigger than expected.",
      "The string tools cover the small questions. Base64 encodes UTF-8 text or a file to text and decodes it back to text or a downloadable binary, with strict validation of padding and UTF-8. The URL encoder distinguishes a whole URL from a single query value, which is the difference between a working link and a broken one. UUIDs are version 4 from the browser's cryptographic random source, checked for duplicates inside a batch; hashes run MD5, SHA-1, SHA-256 and SHA-512 in 1 MiB chunks, up to 100 MB, and state plainly that MD5 and SHA-1 are legacy algorithms. The regex tester highlights matches, groups and replacements inside a worker that is terminated if a pattern runs too long.",
      "None of it makes a network request: no code is executed, no input is stored, and the worker that runs a regular expression cannot reach the page it came from. That is why these pages are safe to use on a production payload or a private key that should never leave the machine it is on.",
    ],
  },
  calculators: {
    heading: "Numbers with the working shown",
    intro:
      "Twelve calculators for the arithmetic people redo most often, each one built to reject meaningless input instead of printing a confident answer.",
    paragraphs: [
      "The money calculators matter most in India, where prices are usually quoted with GST and salaries with a take-home figure. The GST calculator adds or removes GST and splits the result into CGST and SGST for intra-state supply, or IGST for inter-state, so an invoice can be checked line by line rather than trusted. The EMI and loan calculators go further than a monthly figure: they show total interest, the principal-to-interest split and a month-by-month amortisation schedule, which is what makes two offers comparable. The discount calculator handles sequential discounts and tax together, and the percentage calculator covers increases, decreases and the reverse case where you know the final number but not the original.",
      "The rest are everyday measurements. BMI puts the number in context with a healthy-weight range for a given height and says clearly that it is a screening indicator, not a diagnosis. The age calculator gives exact years, months and days on any date, which is the format forms and applications ask for. The date difference calculator counts calendar days or business days between two dates, or adds and subtracts a number of days from a date. The scientific calculator handles trigonometry, powers and constants; the unit converter covers length, mass, area, volume, speed, energy and data; temperature converts between Celsius, Fahrenheit and Kelvin with absolute-zero validation; and the time converter adds and subtracts durations against a real date.",
      "The percentage, discount and GST tools show the expression they evaluated; the loan tools add total interest, the principal-to-interest split and a month-by-month amortisation schedule; and every calculator refuses input that is not meaningful — a temperature below absolute zero, a division by zero, an end date before a start date — instead of printing a confident wrong answer. None of the calculators stores anything you type, and none of them asks who you are.",
      "They are aids, not advice: a GST figure still has to match the rate that applies to your supply, an EMI is only as good as the rate you enter, and BMI is not a medical opinion. Used that way — quickly, locally, with the working visible — they replace a spreadsheet tab and a mental arithmetic check.",
    ],
  },
  "security-privacy": {
    heading: "Practical security tools on your device",
    intro:
      "Use local tools for passwords, encrypted text and files, checksums, metadata and reviewing supplied security information. DNS lookups contact a public resolver only with your consent. Read each tool’s limitations before relying on its result.",
    paragraphs: [
      "This generator uses the platform’s cryptographic random number generator and processes passwords in the browser. The pool-size indicator describes an unconstrained upper bound, not the actual entropy of this generator. Copying or downloading a password places it on your device; protect or delete any plaintext file after importing passwords into your password manager.",
      "The options are deliberately narrow. You choose a length from 8 to 64 characters, which character sets to include (lowercase, uppercase, digits, symbols) and whether to exclude characters that are easy to confuse — l and 1, O and 0. That is enough control to satisfy a site that insists on a symbol without producing a password you cannot retype from a phone screen.",
      "The pool-size indicator illustrates what length buys. Every extra character multiplies the number of possibilities by the size of the alphabet, so a 16-character password from a full set is not slightly stronger than an 8-character one, it is billions of times stronger. A long password made of ordinary words beats a short one with a symbol swapped for an @, and the tool shows the number growing as you drag the slider, which makes that lesson visible rather than theoretical.",
      "What this page cannot do: it cannot tell you whether a password has already appeared in a breach, because that check requires a network lookup against a service that would learn something about your candidate. It also cannot protect you from reusing the same password on ten sites. Generate one long random password per account, let a password manager remember them, and use PDF Lock & Unlock (AES-256) or Hash Generator (SHA-256 / SHA-512) alongside it when you need to protect documents or verify file integrity locally.",
    ],
  },
};
