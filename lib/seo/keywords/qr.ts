import type { ToolKeywordCluster } from "../keyword-clusters";

/**
 * QR & barcode cluster.
 *
 * `qr-generator` and `qr-code-scanner` are the two high-intent pages here.
 * The generator's local, no-signup, non-expiring model is a real differentiator
 * against subscription QR SaaS, so "no watermark" and "never expires" phrasings
 * are accurate and claimed by it alone. The seven barcode/GS1 tools serve much
 * narrower technical intent and are kept deliberately separate from the QR
 * pages so a shopper looking for a QR maker never lands on a GS1 parser.
 */
export const qrKeywordClusters: ToolKeywordCluster[] = [
  {
    slug: "qr-generator",
    primary: "qr code generator",
    secondary: [
      "qr code generator with logo",
      "upi qr code generator",
      "wifi qr code",
      "vcard qr code",
      "qr code generator free no watermark",
      "bulk qr code csv",
    ],
    groups: {
      alternativeName: ["qr code maker", "qr code creator", "qr generator"],
      synonym: [
        "create a qr code for a link",
        "make a scannable square code",
        "generate a qr image",
      ],
      action: [
        "create a qr code for a website link",
        "make a upi payment qr code",
        "generate a wifi qr code for guests",
        "export a qr code as svg for printing",
      ],
      longTail: [
        "create a qr code that never expires without an account",
        "make a qr code with a logo in the centre",
        "generate qr codes for a whole csv in one go",
        "print a qr code as a vector svg so it stays sharp",
      ],
      problem: [
        "qr code points to a link but i need to confirm it scans first",
        "printed qr code is blurry because it was an image not a vector",
      ],
      question: [
        "how to create a qr code",
        "do free qr codes expire",
        "can i make a qr code with my logo",
      ],
      qualifier: [
        "free qr code generator no signup",
        "static qr code generator no expiry",
      ],
      india: [
        "upi qr code kaise banaye",
        "qr code kaise banaye",
        "dukaan ke liye qr code",
      ],
    },
    audience:
      "Shops, event organisers and marketers needing a static code that never expires",
  },
  {
    slug: "qr-code-scanner",
    primary: "qr code scanner",
    secondary: [
      "scan qr code from screenshot",
      "qr code reader online",
      "qr scanner without app",
      "scan qr code on laptop webcam",
      "check qr code link safety",
    ],
    groups: {
      alternativeName: ["qr code reader", "qr reader", "qr decoder"],
      synonym: [
        "read a qr code",
        "decode a qr image",
        "see what a qr code contains",
      ],
      action: [
        "scan a qr code with a laptop webcam",
        "decode every qr code in a folder of screenshots",
        "check where a qr code will take you before opening it",
      ],
      longTail: [
        "check where a qr code leads without opening the link",
        "scan several qr codes from images at once and export csv",
        "decode a qr code from a screenshot on a laptop",
      ],
      problem: [
        "no camera app available so a qr code cannot be scanned",
        "received a qr code in a chat and do not want to open it blindly",
      ],
      question: [
        "how to scan a qr code on a laptop",
        "how do i read a qr code from an image",
        "is it safe to open a qr code link",
      ],
      qualifier: [
        "qr code scanner online free",
        "scan qr without installing an app",
      ],
      india: ["qr code kaise scan kare", "qr code photo se kaise scan kare"],
    },
    audience: "People who have a QR image, not a phone camera pointed at paper",
  },
  {
    slug: "barcode-generator",
    primary: "barcode generator",
    secondary: [
      "ean 13 barcode generator",
      "code 128 barcode generator",
      "gs1 128 label generator",
      "barcode generator with check digit",
      "print barcode labels free",
    ],
    groups: {
      alternativeName: [
        "barcode maker",
        "barcode creator",
        "barcode printer tool",
      ],
      synonym: [
        "create a barcode image",
        "generate a product barcode",
        "make a scannable barcode",
      ],
      action: [
        "generate an ean-13 barcode with a valid check digit",
        "create code 128 barcodes for labels",
        "print barcodes at a true physical size",
      ],
      longTail: [
        "generate ean 13 barcodes with a verified check digit",
        "create a gs1 128 label for a product",
        "print barcode labels at the correct millimetre width",
      ],
      problem: [
        "hand typed check digit makes the barcode unscannable",
        "printed barcode is the wrong physical size to scan",
      ],
      question: [
        "how to generate a barcode",
        "what is the difference between ean 13 and code 128",
        "how do barcode check digits work",
      ],
      qualifier: [
        "barcode generator online free",
        "free barcode maker no signup",
      ],
      india: ["barcode kaise banaye", "product ka barcode kaise banaye"],
    },
    audience: "Small retailers and makers printing their own product labels",
  },
  {
    slug: "barcode-scanner",
    primary: "barcode scanner",
    secondary: [
      "scan barcode with phone camera",
      "barcode reader online free",
      "scan ean 13 from image",
      "barcode scanner without app",
      "check barcode number",
    ],
    groups: {
      alternativeName: ["barcode reader", "barcode decoder"],
      synonym: [
        "read a barcode value",
        "decode a barcode image",
        "get the number from a barcode",
      ],
      action: [
        "scan a barcode with a phone camera in the browser",
        "read an ean-13 barcode from a photo",
        "copy the barcode value to the clipboard",
      ],
      longTail: [
        "scan a barcode from a product photo without installing an app",
        "read a barcode value and keep a local history",
        "scan itf-14 and code 39 barcodes from an image",
      ],
      problem: [
        "need the number under a barcode but it is a curved package",
        "no barcode app on the device and it cannot be installed",
      ],
      question: [
        "how to scan a barcode with a phone",
        "how do i read a barcode from a picture",
        "which barcode formats are supported",
      ],
      qualifier: [
        "barcode scanner online free",
        "scan barcode without installing anything",
      ],
      india: ["barcode kaise scan kare", "barcode number kaise check kare"],
    },
    audience: "Shop staff and shoppers reading a code from a photo",
  },
  {
    slug: "batch-code-checker",
    primary: "batch code checker",
    secondary: [
      "cosmetic batch code decoder",
      "check product expiry by batch code",
      "lot code lookup",
      "is my skincare expired batch code",
      "batch code checker india",
    ],
    groups: {
      alternativeName: [
        "batch code decoder",
        "lot code checker",
        "batch number checker",
      ],
      synonym: [
        "decode a cosmetics batch number",
        "read the date hidden in a lot code",
        "work out when a product was made",
      ],
      action: [
        "decode a cosmetics batch code from a bottle",
        "check whether a lot code is still within its period after opening",
      ],
      longTail: [
        "decode a batch code when the manufacturer publishes a decoder",
        "check a skincare batch code against documented guidance",
        "tell the difference between a printed expiry date and a batch code",
      ],
      problem: [
        "cosmetics tube has a code but no printed expiry date",
        "cannot tell whether a batch code is a date or a factory code",
      ],
      question: [
        "how do i read a batch code",
        "what does a batch code mean on cosmetics",
        "is my skincare product expired",
      ],
      qualifier: [
        "batch code checker online free",
        "cosmetic batch code check free",
      ],
      india: [
        "cosmetic ka batch code kaise check kare",
        "product expiry kaise pata kare",
      ],
    },
    audience:
      "Shoppers checking cosmetics, where only documented decoders are used and undecodable codes are reported as undecodable",
  },
  {
    slug: "gs1-intelligence",
    primary: "gs1 intelligence",
    secondary: [
      "gs1 128 application identifier list",
      "gs1 element string parser",
      "gtin check digit calculator",
      "gs1 digital link builder",
      "fnc1 explained",
    ],
    groups: {
      alternativeName: [
        "gs1 parser",
        "gs1 barcode decoder",
        "application identifier lookup",
      ],
      synonym: [
        "break down a gs1 barcode",
        "read the parts of a gs1-128 symbol",
        "interpret a gs1 element string",
      ],
      action: [
        "parse a gs1 element string into its application identifiers",
        "verify a gtin check digit",
        "build a gs1 digital link url",
      ],
      longTail: [
        "look up what a gs1 application identifier means",
        "parse a gs1 hri string into readable fields",
        "validate a gtin check digit before printing a label",
      ],
      problem: [
        "gs1-128 barcode contains fields i cannot identify",
        "unsure which application identifier a two-digit prefix refers to",
      ],
      question: [
        "what is a gs1 application identifier",
        "what is fnc1 and why does it matter",
        "what is a gs1 digital link",
      ],
      qualifier: ["gs1 barcode parser online", "gs1 ai lookup free"],
    },
    audience:
      "Supply-chain, packaging and label developers working with GS1 standards",
  },
  {
    slug: "product-lookup",
    primary: "gtin product lookup",
    secondary: [
      "barcode number lookup product",
      "open food facts search by barcode",
      "check product ingredients by barcode",
      "ean 13 lookup",
      "barcode product database india",
    ],
    groups: {
      alternativeName: ["barcode lookup", "gtin lookup", "ean lookup"],
      synonym: [
        "find a product from its barcode number",
        "search a barcode in a public database",
        "identify a product by its gtin",
      ],
      action: [
        "look up a gtin in open food facts",
        "check ingredients and allergens from a barcode",
        "read nutrition for a scanned product",
      ],
      longTail: [
        "look up a product barcode with attribution and no hidden source",
        "check whether a barcode exists in open food facts",
        "find allergies information from an ean number",
      ],
      problem: [
        "barcode scans but no product name appears anywhere",
        "need ingredients but the label is in another language",
      ],
      question: [
        "can i look up a product by barcode",
        "where does product barcode data come from",
        "what if my barcode is not found",
      ],
      qualifier: ["barcode lookup online free", "free gtin search"],
      india: [
        "barcode se product kaise dhundhe",
        "product barcode check kaise kare",
      ],
    },
    audience:
      "Shoppers and researchers checking ingredients where a public open database has the record",
  },
  {
    slug: "batch-studio",
    primary: "batch barcode studio",
    secondary: [
      "csv to barcode labels",
      "batch barcode generator svg",
      "print barcode sheet pdf",
      "bulk qr code from csv",
      "barcode label generator spreadsheet",
    ],
    groups: {
      alternativeName: ["bulk barcode generator", "barcode batch tool"],
      synonym: [
        "generate many barcodes from a spreadsheet",
        "make barcode labels for a product list",
        "turn a csv into printable codes",
      ],
      action: [
        "upload a csv and get a zip of barcode symbols",
        "generate mixed symbologies from one csv column",
        "produce a per-row report alongside the labels",
      ],
      longTail: [
        "generate barcode labels for a whole csv without a script",
        "mix code 128 and ean 13 symbologies in one csv run",
        "get a row by row report of every barcode that failed",
      ],
      problem: [
        "typing 300 barcodes by hand is not viable",
        "some rows in a csv produce invalid barcodes and it is unclear which",
      ],
      question: [
        "how to generate barcodes in bulk",
        "can i make barcode labels from excel",
        "why did some csv rows fail to generate",
      ],
      qualifier: ["bulk barcode generator free", "csv to barcode free"],
      india: ["excel se barcode kaise banaye", "bulk barcode kaise banaye"],
    },
    audience: "Anyone labelling a product list rather than one item",
  },
  {
    slug: "barcode-developer",
    primary: "barcode developer tools",
    secondary: [
      "compare gtin numbers",
      "barcode print quality check",
      "quiet zone too small barcode",
      "barcode will not scan troubleshooting",
      "gs1 check digit mismatch",
    ],
    groups: {
      alternativeName: ["barcode debugging tools", "barcode qa tools"],
      synonym: [
        "diagnose a barcode that will not scan",
        "check barcode print quality",
        "find the difference between two barcode values",
      ],
      action: [
        "compare two barcode values character by character",
        "screen a photographed symbol for print faults",
        "check module width and contrast in a barcode photo",
      ],
      longTail: [
        "find out why a printed barcode will not scan",
        "check whether a barcode has an adequate quiet zone",
        "diff two gtin values to find a single wrong digit",
      ],
      problem: [
        "barcode prints but scanners reject it",
        "two gtin values look identical but only one scans",
      ],
      question: [
        "why will my barcode not scan",
        "what is a quiet zone in a barcode",
        "what causes a gs1 check digit mismatch",
      ],
      qualifier: [
        "barcode quality checker online",
        "barcode troubleshooting tool free",
      ],
    },
    audience:
      "Developers and print operators debugging a symbol that fails at the till",
  },
];
