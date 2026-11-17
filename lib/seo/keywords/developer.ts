import type { ToolKeywordCluster } from "../keyword-clusters";

/**
 * Developer cluster.
 *
 * No `india` group here by design. Hinglish phrasings for "json formatter" or
 * "minify css" are not how that audience actually searches — inventing them
 * would add noise, not reach. That is a deliberate omission, not an oversight.
 *
 * The two JSON tools are the pair most at risk of overlap, so the formatter
 * owns beautify/minify terms and the validator owns parse-error/diagnostics
 * terms. `hash-generator` lives in both the developer and security categories
 * with one canonical URL, so its cluster is written once, here.
 */
export const developerKeywordClusters: ToolKeywordCluster[] = [
  {
    slug: "json-formatter",
    primary: "json formatter",
    secondary: [
      "json beautifier online",
      "check json syntax",
      "minify json",
      "sort json keys",
      "format json without upload",
    ],
    groups: {
      alternativeName: [
        "json beautifier",
        "json pretty printer",
        "json editor",
      ],
      synonym: [
        "make json readable",
        "pretty print a json response",
        "indent json with spaces",
      ],
      action: [
        "format a messy json response",
        "minify json before sending it",
        "sort json keys alphabetically",
      ],
      longTail: [
        "beautify a minified json api response",
        "format json with 2 space indentation",
        "sort the keys of a json object recursively",
      ],
      problem: [
        "api response arrives as one unreadable line",
        "json keys are in a random order and hard to compare",
      ],
      question: [
        "how to format json",
        "how do i beautify json online",
        "can i sort json keys",
      ],
      qualifier: [
        "json formatter online free",
        "json beautifier without uploading",
      ],
    },
    audience: "Developers reading an API response or config file",
  },
  {
    slug: "json-validator",
    primary: "json validator",
    secondary: [
      "check json syntax online",
      "json parse error location",
      "validate json file",
      "json lint online",
      "missing comma json",
    ],
    groups: {
      alternativeName: ["json lint", "json checker", "json syntax checker"],
      synonym: [
        "find the error in a json file",
        "confirm json is valid",
        "debug a json parse failure",
      ],
      action: [
        "find the line and column of a json error",
        "validate a json file before deploying it",
        "check the root type and key count of json",
      ],
      longTail: [
        "find the exact line and column of a json syntax error",
        "check why a json file fails to parse",
        "validate json without executing any code",
      ],
      problem: [
        "json.parse throws but the error does not say where",
        "a trailing comma or missing bracket is breaking the build",
      ],
      question: [
        "why is my json invalid",
        "how do i find the error in a json file",
        "what causes an unexpected token in json",
      ],
      qualifier: ["json validator online free", "validate json file online"],
    },
    audience:
      "Developers debugging a parse failure, usually at the worst moment",
  },
  {
    slug: "xml-formatter",
    primary: "xml formatter",
    secondary: [
      "xml beautifier online",
      "pretty print xml",
      "minify xml",
      "xml validation tool",
      "format xml soap response",
    ],
    groups: {
      alternativeName: ["xml beautifier", "xml pretty printer"],
      synonym: [
        "indent an xml document",
        "make xml readable",
        "tidy up xml markup",
      ],
      action: [
        "pretty print a soap response",
        "minify xml before transfer",
        "format xml with tabs or spaces",
      ],
      longTail: [
        "pretty print a raw soap envelope",
        "format an xml config file for reading",
        "minify xml while keeping text content intact",
      ],
      problem: [
        "soap response is one long line",
        "xml mixed content loses its spacing when formatted",
      ],
      question: [
        "how to format xml",
        "how do i pretty print xml",
        "why is doctype rejected in xml formatters",
      ],
      qualifier: ["xml formatter online free", "xml beautifier no upload"],
    },
    audience: "Developers reading SOAP responses, configs and feeds",
  },
  {
    slug: "html-formatter",
    primary: "html formatter",
    secondary: [
      "html beautifier online",
      "minify html",
      "format html code",
      "html pretty print",
      "reduce html file size",
    ],
    groups: {
      alternativeName: ["html beautifier", "html pretty printer"],
      synonym: ["indent html markup", "make html readable", "tidy html source"],
      action: [
        "beautify a pasted html snippet",
        "minify html and compare byte sizes",
        "format html without touching embedded javascript",
      ],
      longTail: [
        "beautify html while leaving embedded css and javascript alone",
        "minify html and see exact utf-8 byte savings",
        "format a messy html email template",
      ],
      problem: [
        "minifier broke the inline script in my html",
        "html template is a single unreadable line",
      ],
      question: [
        "how to format html code",
        "how do i minify html",
        "does minifying html break javascript",
      ],
      qualifier: [
        "html formatter online free",
        "html beautifier without upload",
      ],
    },
    audience: "Developers tidying markup, often inside email templates",
  },
  {
    slug: "css-minifier",
    primary: "css minifier",
    secondary: [
      "minify css online",
      "css compressor",
      "reduce css file size",
      "css optimizer free",
      "minify css without breaking it",
    ],
    groups: {
      alternativeName: ["css compressor", "css optimizer", "css minify tool"],
      synonym: [
        "compress a stylesheet",
        "squeeze whitespace out of css",
        "shrink a css file",
      ],
      action: [
        "minify a stylesheet and compare before and after bytes",
        "keep the first licence comment while minifying",
        "compress css with a syntax-aware parser",
      ],
      longTail: [
        "minify css and see exactly how many bytes were saved",
        "minify css while preserving the licence header",
        "compress a stylesheet without a build step",
      ],
      problem: [
        "naive css minifier broke a calc or media query",
        "need the licence comment kept but the file smaller",
      ],
      question: [
        "how to minify css",
        "how much does minifying css save",
        "what is the safest way to minify css",
      ],
      qualifier: ["css minifier online free", "minify css no upload"],
    },
    audience: "Developers shaving bytes without a build pipeline",
  },
  {
    slug: "javascript-minifier",
    primary: "javascript minifier",
    secondary: [
      "minify js online",
      "js compressor",
      "reduce javascript size",
      "terser minifier online",
      "uglify javascript alternative",
    ],
    groups: {
      alternativeName: [
        "js minifier",
        "javascript compressor",
        "js minify tool",
      ],
      synonym: [
        "compress a javascript file",
        "shrink a bundle",
        "strip whitespace from js",
      ],
      action: [
        "minify a javascript file with terser",
        "read a readable javascript syntax error",
        "compare js size before and after minifying",
      ],
      longTail: [
        "minify javascript with terser and see byte savings",
        "minify js without running it",
        "read a minifier syntax error in plain language",
      ],
      problem: [
        "no build step but the js file is too large",
        "minifier reports an error that is not readable",
      ],
      question: [
        "how to minify javascript",
        "is it safe to minify javascript online",
        "what is the difference between uglify and terser",
      ],
      qualifier: ["javascript minifier online free", "minify js no upload"],
    },
    audience: "Developers without a bundler, or debugging one",
  },
  {
    slug: "base64-encoder-decoder",
    primary: "base64 encoder",
    secondary: [
      "base64 decode online",
      "base64 to text",
      "encode file to base64",
      "base64 image decoder",
      "base64url converter",
    ],
    groups: {
      alternativeName: ["base64 converter", "base64 tool", "base64 translator"],
      synonym: [
        "convert text to base64",
        "turn a string back from base64",
        "encode binary as text",
      ],
      action: [
        "encode a file to base64",
        "decode a base64 string into an image",
        "convert base64url to standard base64",
      ],
      longTail: [
        "decode a base64 data url image back to a file",
        "encode a small file to base64 without uploading it",
        "convert base64url tokens that use dashes and underscores",
      ],
      problem: [
        "base64 string will not decode because of wrong padding",
        "unicode text turns into mojibake after decoding",
      ],
      question: [
        "how to decode base64",
        "how do i encode an image in base64",
        "why does base64url use dashes instead of plus",
      ],
      qualifier: ["base64 encoder online free", "base64 decode no upload"],
    },
    audience: "Developers moving binary data through text-only channels",
  },
  {
    slug: "url-encoder-decoder",
    primary: "url encoder",
    secondary: [
      "url decode online",
      "percent encoding converter",
      "encode query string",
      "decode url parameter",
      "urlencode unicode",
    ],
    groups: {
      alternativeName: ["urlencode tool", "percent encoder", "uri encoder"],
      synonym: [
        "escape special characters in a url",
        "turn %20 back into a space",
        "encode a value for a query parameter",
      ],
      action: [
        "encode a query string value",
        "decode a url that is full of percent signs",
        "encode unicode characters for a url",
      ],
      longTail: [
        "encode a single query parameter without encoding the whole url",
        "decode a percent-encoded url with unicode characters",
        "fix a url where the ampersand was not encoded",
      ],
      problem: [
        "query parameter broke because it contained an ampersand",
        "url is unreadable because everything is percent-encoded",
      ],
      question: [
        "how to encode a url",
        "how do i decode percent encoding",
        "what is the difference between encodeURI and encodeURIComponent",
      ],
      qualifier: ["url encoder online free", "url decode without upload"],
    },
    audience: "Developers building or debugging query strings",
  },
  {
    slug: "uuid-generator",
    primary: "uuid generator",
    secondary: [
      "guid generator",
      "uuid v4 online",
      "generate bulk uuid",
      "random uuid for database",
      "uuid without upload",
    ],
    groups: {
      alternativeName: ["guid generator", "uuid maker", "uuid v4 generator"],
      synonym: [
        "create a unique identifier",
        "make a random id",
        "produce a version 4 uuid",
      ],
      action: [
        "generate 100 uuids at once",
        "generate a cryptographically random uuid v4",
        "download a list of uuids as a file",
      ],
      longTail: [
        "generate a batch of uuid v4 values with duplicate checking",
        "create 2000 uuids and download them as a list",
        "generate random ids for database seed rows",
      ],
      problem: [
        "need many unique ids for test fixtures",
        "want to be sure a generated id is cryptographically random",
      ],
      question: [
        "how to generate a uuid",
        "what is the difference between uuid v4 and guid",
        "are generated uuids really unique",
      ],
      qualifier: ["uuid generator online free", "bulk uuid generator free"],
    },
    audience: "Developers seeding databases and generating test fixtures",
  },
  {
    slug: "regex-tester",
    primary: "regex tester",
    secondary: [
      "regex101 alternative",
      "test regular expression online",
      "javascript regex tester",
      "regex replace preview",
      "named capture group tester",
    ],
    groups: {
      alternativeName: [
        "regex tester tool",
        "regular expression tester",
        "regex debugger",
      ],
      synonym: [
        "try out a regular expression",
        "check what a regex matches",
        "debug a pattern against sample text",
      ],
      action: [
        "test a regex against sample text with flags",
        "preview a regex replacement before applying it",
        "inspect named capture groups in a match",
      ],
      longTail: [
        "test a javascript regex with global and multiline flags",
        "preview the output of a regex replace operation",
        "test a regex that might run forever without freezing the browser",
      ],
      problem: [
        "regex works on one string but not another",
        "a runaway pattern freezes the tab",
      ],
      question: [
        "how to test a regular expression",
        "how do i see what a regex captures",
        "why is my regex so slow",
      ],
      qualifier: ["regex tester online free", "test regex without uploading"],
    },
    audience: "Developers writing patterns they cannot afford to get wrong",
  },
  {
    slug: "hash-generator",
    primary: "hash generator",
    secondary: [
      "sha256 generator online",
      "md5 hash calculator",
      "checksum verifier",
      "hash a file in browser",
      "sha512 online tool",
    ],
    groups: {
      alternativeName: ["checksum tool", "hash calculator", "digest generator"],
      synonym: [
        "compute a file checksum",
        "get the sha1 of a string",
        "verify a downloaded file hash",
      ],
      action: [
        "hash a file with sha-256 on your device",
        "compare two checksums to verify a download",
        "generate md5 and sha512 digests side by side",
      ],
      longTail: [
        "verify a downloaded file matches its published sha256 checksum",
        "hash a file locally without uploading it anywhere",
        "compare several checksums in one batch",
      ],
      problem: [
        "downloaded file may be corrupted and needs verifying",
        "vendor published a checksum but not sure it matches",
      ],
      question: [
        "how to check a file checksum",
        "what is the difference between md5 and sha256",
        "is md5 still safe to use",
      ],
      qualifier: ["hash generator online free", "sha256 checksum tool free"],
    },
    audience:
      "Developers verifying downloads, and anyone checking a published checksum",
  },
];
