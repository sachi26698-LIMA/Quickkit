import type { ToolKeywordCluster } from "../keyword-clusters";

/**
 * PDF cluster.
 *
 * Every PDF tool here processes locally, so the "without uploading" family is
 * factually available to all nine — but each claims a *different* one, because
 * two pages chasing the same phrasing compete instead of covering.
 *
 * `word-to-pdf` is the exception and is treated as such: it reaches a server
 * after consent. It therefore carries consent-accurate phrasing
 * ("without signing up", "no signup required") and no "without uploading".
 */
export const pdfKeywordClusters: ToolKeywordCluster[] = [
  {
    slug: "merge-pdf",
    primary: "merge pdf",
    secondary: [
      "combine pdf files",
      "merge pdf without uploading",
      "join pdf pages online",
      "merge pdf on mobile",
      "arrange pdf files before merging",
    ],
    groups: {
      alternativeName: [
        "pdf merger",
        "pdf joiner",
        "pdf combiner",
        "pdf binder",
      ],
      synonym: [
        "combine pdf",
        "join pdf files",
        "put pdfs together",
        "unite pdf documents",
      ],
      action: [
        "merge two pdfs into one",
        "combine multiple pdf files into one document",
        "join pdfs in a specific order",
        "arrange and merge pdf",
      ],
      longTail: [
        "merge pdf files free without watermark",
        "combine pdf files into one without losing quality",
        "join two pdf files with different page sizes",
        "merge pdf files in the order i choose",
      ],
      problem: [
        "combine scanned pdf and digital pdf together",
        "merge pdfs that are password protected",
        "too many separate pdfs to send",
      ],
      question: [
        "how to merge pdf files",
        "how do i combine two pdfs into one",
        "can i merge pdf files for free",
      ],
      qualifier: ["merge pdf online free", "free pdf merger no watermark"],
      india: ["pdf merge kaise kare", "pdf files ko ek kaise banaye"],
    },
    audience:
      "Anyone assembling reports, invoices, scanned pages or submissions",
  },
  {
    slug: "split-pdf",
    primary: "split pdf",
    secondary: [
      "extract pages from pdf",
      "pdf page range splitter",
      "separate pdf into individual pages",
      "split pdf without uploading",
      "split pdf on phone",
    ],
    groups: {
      alternativeName: ["pdf splitter", "pdf separator", "pdf page extractor"],
      synonym: [
        "divide pdf into parts",
        "cut pdf into sections",
        "break a pdf into separate files",
      ],
      action: [
        "split pdf into separate files",
        "extract one page from a pdf",
        "split pdf every 2 pages",
        "save selected pages of a pdf as a new file",
      ],
      longTail: [
        "extract specific pages from a large pdf",
        "split pdf into individual pages free",
        "split a pdf by page range and save each part",
      ],
      problem: [
        "need only page 3 of a 200 page pdf",
        "send one chapter instead of the whole pdf",
      ],
      question: [
        "how to split a pdf file",
        "how do i extract pages from a pdf",
        "can i split a pdf for free",
      ],
      qualifier: ["split pdf online free", "free pdf splitter no email"],
      india: ["pdf ko kaise split kare", "pdf se page kaise nikale"],
    },
    audience:
      "People pulling chapters, clauses, forms or single pages out of a PDF",
  },
  {
    slug: "compress-pdf",
    primary: "compress pdf",
    secondary: [
      "reduce pdf file size",
      "compress pdf to 100kb",
      "compress pdf for email attachment",
      "pdf compressor without uploading",
      "shrink scanned pdf",
    ],
    groups: {
      alternativeName: ["pdf compressor", "pdf size reducer", "pdf shrinker"],
      synonym: [
        "make pdf smaller",
        "lower pdf file size",
        "optimise pdf size",
        "resize pdf file size",
      ],
      action: [
        "compress pdf to a target size",
        "compress pdf in bulk",
        "shrink a scanned pdf that is too large",
      ],
      longTail: [
        "compress pdf to 200kb without losing quality",
        "reduce pdf size for upload form",
        "compress a pdf under 500kb for a government portal",
      ],
      problem: [
        "pdf too large to attach to an email",
        "upload portal rejects my pdf for being too big",
        "scanned pdf is 40mb and i need it smaller",
      ],
      question: [
        "how to reduce pdf file size",
        "why is my pdf so large",
        "does compressing a pdf reduce quality",
      ],
      qualifier: ["compress pdf online free", "free pdf compressor no limit"],
      india: ["pdf ka size kaise kam kare", "pdf file chhoti kaise kare"],
    },
    audience: "Anyone hitting an upload limit on email, a portal or a form",
  },
  {
    slug: "pdf-to-image",
    primary: "pdf to image",
    secondary: [
      "pdf to jpg converter",
      "pdf to png high resolution",
      "convert pdf pages to images",
      "pdf to image without uploading",
      "pdf to image 300 dpi",
    ],
    groups: {
      alternativeName: ["pdf to jpg", "pdf to png", "pdf page to picture"],
      synonym: [
        "save pdf page as image",
        "turn pdf into pictures",
        "export pdf pages as jpg or png",
      ],
      action: [
        "convert every page of a pdf to jpg",
        "render a pdf at 300 dpi",
        "save one pdf page as a png",
      ],
      longTail: [
        "convert pdf to high resolution image for printing",
        "pdf to jpg 600 dpi",
        "convert a pdf page to an image for a slide deck",
      ],
      problem: [
        "need a pdf page as a picture for a presentation",
        "pdf will not open so i need it as images",
      ],
      question: [
        "how to convert pdf to image",
        "how do i save a pdf page as a jpg",
        "what dpi should i use for pdf to image",
      ],
      qualifier: ["pdf to image online free", "free pdf to jpg no watermark"],
      india: [
        "pdf se photo kaise banaye",
        "pdf ko image me kaise convert kare",
      ],
    },
    audience: "People moving PDF pages into decks, docs and design tools",
  },
  {
    slug: "images-to-pdf",
    primary: "images to pdf",
    secondary: [
      "jpg to pdf converter",
      "png to pdf",
      "photos to pdf online",
      "combine images into one pdf",
      "image to pdf on mobile",
    ],
    groups: {
      alternativeName: ["jpg to pdf", "png to pdf", "photo to pdf"],
      synonym: [
        "turn pictures into a pdf",
        "make a pdf from photos",
        "convert images into one document",
        "picture to pdf document",
      ],
      action: [
        "combine several photos into one pdf",
        "convert jpg to pdf a4",
        "turn phone photos into a printable pdf",
      ],
      longTail: [
        "convert multiple jpg images into one pdf free",
        "make a pdf from phone photos in the right order",
        "combine images into a pdf with a4 page size",
      ],
      problem: [
        "submit documents as one pdf instead of separate photos",
        "scanner app produces images but the form wants a pdf",
      ],
      question: [
        "how to convert images to pdf",
        "how do i put multiple photos in one pdf",
        "can i make a pdf from pictures",
      ],
      qualifier: ["images to pdf online free", "free jpg to pdf converter"],
      india: ["photo se pdf kaise banaye", "mobile se pdf kaise banaye"],
    },
    audience: "People submitting photos of documents as a single PDF",
  },
  {
    slug: "pdf-lock-unlock",
    primary: "pdf lock & unlock",
    secondary: [
      "encrypt pdf with password",
      "unlock pdf remove password",
      "aes 256 pdf encryption",
      "restrict pdf printing copying",
      "pdf password remover free",
    ],
    groups: {
      alternativeName: [
        "pdf password protector",
        "pdf encryptor",
        "pdf unlocker",
      ],
      synonym: [
        "put a password on a pdf",
        "add password protection to a pdf",
        "remove security from a pdf",
        "password protect pdf file",
      ],
      action: [
        "encrypt a pdf with aes 256",
        "add an open password to a pdf",
        "block printing and copying on a pdf",
        "remove a password from a pdf you own",
      ],
      longTail: [
        "encrypt pdf with a password that cannot be opened",
        "restrict pdf so it cannot be copied or printed",
        "unlock a pdf with the password you already know",
      ],
      problem: [
        "forgot which password protects my own pdf",
        "contract must not be printable or copyable",
      ],
      question: [
        "how to password protect a pdf",
        "how do i remove a password from a pdf",
        "is aes 256 encryption safe for documents",
      ],
      qualifier: [
        "password protect pdf online free",
        "free pdf encryption tool",
      ],
      india: ["pdf me password kaise lagaye", "pdf ka password kaise hataye"],
    },
    audience: "People sending confidential documents or opening their own",
  },
  {
    slug: "pdf-studio",
    primary: "pdf studio",
    secondary: [
      "rotate pdf pages",
      "reorder pdf pages",
      "delete pages from pdf",
      "add page numbers to pdf",
      "pdf editor in browser",
    ],
    groups: {
      alternativeName: [
        "pdf page organizer",
        "pdf page editor",
        "pdf workspace",
      ],
      synonym: [
        "organise pdf pages",
        "manage pdf pages",
        "edit pdf pages online",
        "change pdf page order",
      ],
      action: [
        "rotate a scanned pdf that is sideways",
        "delete a blank page from a pdf",
        "add page numbers to a pdf",
        "add a watermark to a pdf",
      ],
      longTail: [
        "rotate and reorder pdf pages in one pass",
        "delete the blank last page of a pdf",
        "add page numbers to a pdf without adding a watermark",
      ],
      problem: [
        "scanned pdf pages are upside down",
        "blank pages appear in the middle of a pdf",
      ],
      question: [
        "how to rotate pages in a pdf",
        "how do i delete pages from a pdf",
        "how to add page numbers to a pdf",
      ],
      qualifier: [
        "pdf editor online free",
        "edit pdf pages without installing",
      ],
      india: ["pdf ka page rotate kaise kare", "pdf pages kaise hataye"],
    },
    audience: "People fixing page-level problems without a desktop suite",
  },
  {
    slug: "word-to-pdf",
    primary: "word to pdf",
    secondary: [
      "docx to pdf converter",
      "convert word document to pdf online",
      "word to pdf free without email",
      "word to pdf keep formatting",
      "word to pdf on mobile",
    ],
    groups: {
      // This tool reaches a server after explicit consent, so every keyword
      // below is about not needing an account — never about staying offline.
      alternativeName: [
        "docx to pdf",
        "word document to pdf",
        "word to pdf converter",
      ],
      synonym: [
        "save a word document as pdf",
        "export docx as pdf",
        "turn a word file into a pdf",
      ],
      action: [
        "convert a docx file to pdf with page preview",
        "convert word to pdf and check every page first",
        "convert docx to pdf without an account",
      ],
      longTail: [
        "convert word to pdf and keep headings lists and tables",
        "convert docx to pdf with a real page preview",
        "word to pdf with per page controls",
      ],
      problem: [
        "word to pdf shifts the page breaks",
        "docx to pdf loses my tables and images",
      ],
      question: [
        "how to convert word to pdf",
        "how do i save a docx as a pdf",
        "why does word to pdf change the layout",
      ],
      qualifier: [
        "word to pdf online free",
        "free docx to pdf no signup required",
      ],
      india: [
        "word file ko pdf me kaise convert kare",
        "docx se pdf kaise banaye",
      ],
    },
    audience: "People submitting CVs, proposals and assignments as PDF",
  },
  {
    slug: "pdf-to-word",
    primary: "pdf to word",
    secondary: [
      "pdf to docx converter",
      "convert pdf to editable word",
      "scanned pdf to word ocr",
      "pdf to word without email",
      "pdf to word on phone",
    ],
    groups: {
      alternativeName: ["pdf to docx", "pdf to doc", "pdf to word converter"],
      synonym: [
        "turn a pdf into a word document",
        "make a pdf editable in word",
        "convert pdf into editable text",
      ],
      action: [
        "convert a pdf to an editable docx on your device",
        "run ocr on a scanned pdf into word",
        "convert only pages 2 to 5 of a pdf to word",
      ],
      longTail: [
        "convert pdf to word and keep headings and tables",
        "convert a scanned pdf to editable word with ocr",
        "pdf to word that keeps the layout",
      ],
      problem: [
        "received a pdf but need to edit the text",
        "scanned pdf cannot be edited because it is an image",
      ],
      question: [
        "how to convert pdf to word",
        "can i edit text in a pdf",
        "how do i convert a scanned pdf to word",
      ],
      qualifier: ["pdf to word online free", "free pdf to docx converter"],
      india: [
        "pdf ko word me kaise convert kare",
        "pdf se word file kaise banaye",
      ],
    },
    audience: "People who received a PDF and now need to edit it",
  },
];
