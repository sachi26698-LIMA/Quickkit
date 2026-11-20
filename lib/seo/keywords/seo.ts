import type { ToolKeywordCluster } from "../keyword-clusters";

/**
 * SEO & website-growth cluster.
 *
 * The most claim-sensitive category in the catalogue, so the phrasing is
 * constrained by what a browser can actually do:
 *
 * - No keyword promises search volume, keyword difficulty, backlink counts or a
 *   predicted ranking. Those need a paid data feed, and `lib/seo/analyze.ts`
 *   does not have one.
 * - `serp-preview` measures pixel width against the published truncation
 *   points; it does not query Google. "preview", "estimate" and "check" are
 *   used; "guaranteed", "score" and "rank" are not.
 * - `duplicate-content-checker` compares two texts you supply. It does not
 *   crawl the web, so nothing says "plagiarism".
 * - `keyword-cannibalisation-checker` works on a URL list you paste.
 * - The schema builders emit JSON-LD and the validator parses it. None claims
 *   that Google will show a rich result.
 * - The technical group generates and parses files; it does not fetch them.
 *
 * The `india` group stays small: this audience searches in English, but
 * Hinglish phrasing genuinely appears for jobs and small business SEO.
 */
export const seoKeywordClusters: ToolKeywordCluster[] = [
  {
    slug: "serp-preview",
    primary: "serp preview",
    secondary: [
      "title tag pixel width checker",
      "meta description truncation preview",
      "google snippet preview",
      "pixel width versus character count",
      "serp title length estimate",
    ],
    groups: {
      alternativeName: ["snippet preview tool", "search result preview"],
      synonym: [
        "how a result looks in google",
        "rendered title and description preview",
        "snippet width estimate",
      ],
      action: [
        "preview a title and description in a serp",
        "measure title pixel width",
        "see where a description gets cut off",
      ],
      longTail: [
        "title pixel width versus sixty characters",
        "why my title is truncated in google",
        "meta description preview with pixel counter",
        "serp snippet preview for desktop and mobile",
      ],
      problem: [
        "title truncated in search results",
        "description cut off mid sentence",
        "character count says fine but the snippet still truncates",
      ],
      question: [
        "how many characters fit in a title tag",
        "why is pixel width used instead of characters",
        "how long should a meta description be",
      ],
      qualifier: [
        "free serp preview tool",
        "snippet preview no signup",
        "browser serp checker",
      ],
      india: ["serp preview india google", "title tag length check india"],
    },
  },
  {
    slug: "keyword-density-checker",
    primary: "keyword density checker",
    secondary: [
      "keyword placement in title and headings",
      "keyword occurrences in page text",
      "first paragraph keyword check",
      "repeated phrase finder",
      "keyword use without stuffing",
    ],
    groups: {
      alternativeName: ["keyword count tool", "density analyser"],
      synonym: [
        "how often a keyword appears",
        "keyword frequency in body copy",
        "term occurrence report",
      ],
      action: [
        "count keyword occurrences in a page",
        "check keyword placement across headings",
        "find phrases repeated too often",
      ],
      longTail: [
        "keyword density for a 1000 word article",
        "how many times should a keyword appear",
        "keyword in first paragraph and h1 check",
        "repeated three word phrase finder",
      ],
      problem: [
        "keyword stuffing hurting readability",
        "not sure if a keyword appears enough",
        "copy repeats the same phrase constantly",
      ],
      question: [
        "what is a good keyword density",
        "does keyword density still matter",
        "where should a keyword appear on a page",
      ],
      qualifier: [
        "free keyword density checker",
        "keyword counter no signup",
        "browser density tool",
      ],
      india: ["keyword density kaise check kare", "seo keyword count india"],
    },
  },
  {
    slug: "readability-checker",
    primary: "readability checker",
    secondary: [
      "flesch reading ease score",
      "flesch kincaid grade level",
      "sentence length analysis",
      "hard to read paragraph finder",
      "readability for web copy",
    ],
    groups: {
      alternativeName: ["reading ease tool", "text readability score"],
      synonym: [
        "how easy a text is to read",
        "grade level of a piece of writing",
        "sentence complexity report",
      ],
      action: [
        "score a text for reading ease",
        "find sentences that are too long",
        "check the grade level of my copy",
      ],
      longTail: [
        "flesch reading ease of 60 means what",
        "sentence length for web readability",
        "readability score for a blog post",
        "average syllables per word calculation",
      ],
      problem: [
        "readers drop off before the point",
        "paragraphs too dense to skim",
        "copy written for experts, not customers",
      ],
      question: [
        "what is a good flesch reading ease score",
        "does readability affect seo",
        "are readability formulas valid for hindi",
      ],
      qualifier: [
        "free readability checker",
        "flesch score calculator online",
        "browser readability tool",
      ],
      india: [
        "readability score kaise check kare",
        "english copy readability india",
      ],
    },
  },
  {
    slug: "on-page-audit",
    primary: "on page audit",
    secondary: [
      "heading structure checker",
      "h1 and h2 order analysis",
      "alt attribute audit",
      "pasted html page analysis",
      "landmark elements check",
    ],
    groups: {
      alternativeName: ["page structure audit", "html structure checker"],
      synonym: [
        "review of a page's markup structure",
        "heading hierarchy check",
        "on page markup review",
      ],
      action: [
        "audit heading order in pasted html",
        "check alt attributes across a page",
        "review the landmark structure of a page",
      ],
      longTail: [
        "heading order check for pasted html",
        "find images missing alt attributes",
        "h1 count and heading skipping check",
        "page structure audit without a crawler",
      ],
      problem: [
        "headings skip from h1 to h4",
        "images without alt text on a live page",
        "structure fine on desktop, broken in the template",
      ],
      question: [
        "how many h1 tags should a page have",
        "should heading levels ever be skipped",
        "what counts as an on page audit",
      ],
      qualifier: [
        "free on page audit tool",
        "heading structure checker online",
        "browser html auditor",
      ],
      india: ["on page audit kaise kare", "page structure check india"],
    },
  },
  {
    slug: "duplicate-content-checker",
    primary: "duplicate content checker",
    secondary: [
      "compare two pages for similarity",
      "near duplicate copy detection",
      "text similarity percentage",
      "shared sentences between two drafts",
      "duplicate before publishing",
    ],
    groups: {
      alternativeName: ["text similarity tool", "copy comparison checker"],
      synonym: [
        "how similar two pieces of text are",
        "overlap between two drafts",
        "near duplicate paragraph detection",
      ],
      action: [
        "compare two texts for similarity",
        "find shared sentences between drafts",
        "check a rewrite for duplication",
      ],
      longTail: [
        "compare two blog drafts for similarity",
        "how much of a rewrite is actually new",
        "duplicate content between two product pages",
        "sentence overlap percentage between two texts",
      ],
      problem: [
        "a rewrite is basically the original",
        "two pages targeting the same topic",
        "not sure if a paraphrase is close enough",
      ],
      question: [
        "how is duplicate content detected",
        "how much similarity is too much",
        "does this check against the whole web",
      ],
      qualifier: [
        "free duplicate content checker",
        "text comparison tool no signup",
        "browser similarity checker",
      ],
      india: ["duplicate content kaise check kare", "copy similarity india"],
    },
  },
  {
    slug: "keyword-cannibalisation-checker",
    primary: "keyword cannibalisation checker",
    secondary: [
      "two pages targeting one keyword",
      "url list overlap analysis",
      "cannibalisation across own pages",
      "internal competition between pages",
      "consolidate competing urls",
    ],
    groups: {
      alternativeName: ["cannibalisation finder", "url overlap checker"],
      synonym: [
        "pages competing with each other",
        "internal keyword overlap report",
        "self competition between urls",
      ],
      action: [
        "find urls targeting the same keyword",
        "check a url list for overlap",
        "decide which competing page to keep",
      ],
      longTail: [
        "two blog posts target the same keyword",
        "cannibalisation check across a url list",
        "which page should i consolidate",
        "keyword overlap between product and blog pages",
      ],
      problem: [
        "two pages swapping positions in the serp",
        "one page never ranks because another covers it",
        "site structure grew without a keyword map",
      ],
      question: [
        "what is keyword cannibalisation",
        "how do i fix cannibalisation",
        "can two pages target the same keyword",
      ],
      qualifier: [
        "free cannibalisation checker",
        "keyword overlap tool no signup",
        "browser cannibalisation audit",
      ],
      india: ["keyword cannibalisation kya hai", "seo cannibalisation india"],
    },
  },
  {
    slug: "organization-schema-generator",
    primary: "organization schema generator",
    secondary: [
      "organization json ld markup",
      "logo and social profiles markup",
      "company structured data",
      "sameas entity links",
      "organization schema for a small business",
    ],
    groups: {
      alternativeName: ["organisation schema builder", "company markup tool"],
      synonym: [
        "structured data for a company",
        "json ld describing an organisation",
        "entity markup for a business",
      ],
      action: [
        "generate organization json ld",
        "add logo and sameas to organization schema",
        "mark up a company entity",
      ],
      longTail: [
        "organization schema with logo and sameas",
        "json ld for a small business website",
        "organization schema without a knowledge panel",
        "structured data for a company brand",
      ],
      problem: [
        "hand written json ld fails validation",
        "knowledge panel shows the wrong logo",
        "not sure which fields organization schema needs",
      ],
      question: [
        "what is organization schema",
        "is organization schema required",
        "how do i test organization structured data",
      ],
      qualifier: [
        "free organization schema generator",
        "json ld builder no signup",
        "browser schema tool",
      ],
      india: ["organization schema kaise banaye", "json ld india company"],
    },
  },
  {
    slug: "article-schema-generator",
    primary: "article schema generator",
    secondary: [
      "article json ld markup",
      "author and published date markup",
      "blogposting structured data",
      "headline and image fields",
      "article schema for a blog",
    ],
    groups: {
      alternativeName: ["blogposting schema builder", "article markup tool"],
      synonym: [
        "structured data for an article",
        "json ld for a blog post",
        "editorial markup for publishers",
      ],
      action: [
        "generate article json ld",
        "add author and dates to article schema",
        "mark up a blog post",
      ],
      longTail: [
        "article schema with author and datepublished",
        "json ld for a blog post with an image",
        "blogposting versus article schema",
        "article structured data for a news site",
      ],
      problem: [
        "article snippet missing the date",
        "author not showing in the rich result",
        "schema valid but still not eligible",
      ],
      question: [
        "what fields does article schema need",
        "is article or blogposting better",
        "do i need article schema for every post",
      ],
      qualifier: [
        "free article schema generator",
        "article markup tool online",
        "browser article schema builder",
      ],
      india: ["article schema kaise banaye", "blog structured data india"],
    },
  },
  {
    slug: "faq-schema-generator",
    primary: "faq schema generator",
    secondary: [
      "faqpage json ld markup",
      "question and answer structured data",
      "faq schema answer length",
      "faq markup for a help page",
      "accordion faq structured data",
    ],
    groups: {
      alternativeName: ["faqpage schema builder", "q and a markup tool"],
      synonym: [
        "structured data for frequently asked questions",
        "json ld for a faq block",
        "question answer markup",
      ],
      action: [
        "generate faqpage json ld",
        "add question and answer pairs to schema",
        "mark up an faq section",
      ],
      longTail: [
        "faqpage schema with five questions",
        "json ld for an accordion faq",
        "how long should a faq schema answer be",
        "faq structured data for a product page",
      ],
      problem: [
        "faq rich result stopped appearing",
        "answers too short to be useful",
        "faq schema on a page that repeats the questions",
      ],
      question: [
        "what is faq schema",
        "does faq schema still show rich results",
        "how many questions should faq schema have",
      ],
      qualifier: [
        "free faq schema generator",
        "faqpage markup tool no signup",
        "browser faq schema builder",
      ],
      india: ["faq schema kaise banaye", "faq structured data india"],
    },
  },
  {
    slug: "product-schema-generator",
    primary: "product schema generator",
    secondary: [
      "product json ld with offer",
      "price and currency markup",
      "availability structured data",
      "product markup for a store",
      "offer price valid from",
    ],
    groups: {
      alternativeName: ["product markup builder", "offer schema tool"],
      synonym: [
        "structured data for a product page",
        "json ld describing a product",
        "sku and price markup",
      ],
      action: [
        "generate product json ld",
        "add an offer with price and currency",
        "mark up product availability",
      ],
      longTail: [
        "product schema with offer price and currency",
        "json ld for a product without reviews",
        "product structured data for a small store",
        "pricevaliduntil in product schema",
      ],
      problem: [
        "price missing from the rich result",
        "product snippet flagged as invalid",
        "currency format rejected by the validator",
      ],
      question: [
        "what does product schema require",
        "do i need reviews for product schema",
        "is product schema worth it without rich results",
      ],
      qualifier: [
        "free product schema generator",
        "offer markup tool online",
        "browser product schema builder",
      ],
      india: [
        "product schema kaise banaye",
        "product structured data india store",
      ],
    },
  },
  {
    slug: "local-business-schema-generator",
    primary: "local business schema generator",
    secondary: [
      "localbusiness json ld markup",
      "address and opening hours markup",
      "nap consistency structured data",
      "localbusiness subtype choice",
      "store location markup",
    ],
    groups: {
      alternativeName: ["localbusiness schema builder", "shop markup tool"],
      synonym: [
        "structured data for a physical location",
        "json ld for a store address",
        "local entity markup",
      ],
      action: [
        "generate localbusiness json ld",
        "add address and opening hours",
        "mark up a store location",
      ],
      longTail: [
        "localbusiness schema with opening hours",
        "json ld for a shop with an address",
        "which localbusiness subtype should i use",
        "local schema without a google business profile",
      ],
      problem: [
        "address differs between site and listing",
        "opening hours missing from the markup",
        "generic organization schema used for a shop",
      ],
      question: [
        "what is localbusiness schema",
        "which localbusiness type is right",
        "does local schema need a phone number",
      ],
      qualifier: [
        "free local business schema generator",
        "localbusiness markup tool",
        "browser local schema builder",
      ],
      india: ["local business schema kaise banaye", "dukan ka schema india"],
    },
  },
  {
    slug: "job-posting-schema-generator",
    primary: "job posting schema generator",
    secondary: [
      "jobposting json ld markup",
      "hiring organization and salary markup",
      "valid through date for a job",
      "base salary structured data",
      "job listing structured data",
    ],
    groups: {
      alternativeName: ["jobposting schema builder", "vacancy markup tool"],
      synonym: [
        "structured data for a vacancy",
        "json ld describing a role",
        "job advertisement markup",
      ],
      action: [
        "generate jobposting json ld",
        "add salary and valid through to a posting",
        "mark up a job listing",
      ],
      longTail: [
        "jobposting schema with base salary",
        "json ld for a job without a salary",
        "validthrough date in job posting schema",
        "job structured data for a careers page",
      ],
      problem: [
        "job listing not appearing in job search",
        "expired vacancy still marked up",
        "salary missing so the posting is ineligible",
      ],
      question: [
        "what does jobposting schema require",
        "is job posting schema still supported",
        "how do i mark a job as remote",
      ],
      qualifier: [
        "free job posting schema generator",
        "jobposting markup tool online",
        "browser job schema builder",
      ],
      india: [
        "job posting schema kaise banaye",
        "naukri structured data india",
      ],
    },
  },
  {
    slug: "breadcrumb-schema-generator",
    primary: "breadcrumb schema generator",
    secondary: [
      "breadcrumblist json ld markup",
      "breadcrumb position and item markup",
      "absolute url breadcrumb check",
      "breadcrumb trail structured data",
      "navigation path markup",
    ],
    groups: {
      alternativeName: ["breadcrumblist schema builder", "trail markup tool"],
      synonym: [
        "structured data for a navigation path",
        "json ld describing a breadcrumb",
        "hierarchy markup for a page",
      ],
      action: [
        "generate breadcrumblist json ld",
        "add position and item to each level",
        "mark up a breadcrumb trail",
      ],
      longTail: [
        "breadcrumblist schema with three levels",
        "json ld for a product breadcrumb",
        "breadcrumb position starting at one",
        "breadcrumb markup with absolute urls",
      ],
      problem: [
        "breadcrumb rich result shows the wrong path",
        "relative urls rejected in the markup",
        "position values out of order",
      ],
      question: [
        "what is breadcrumblist schema",
        "does the last breadcrumb need a url",
        "should position start at one",
      ],
      qualifier: [
        "free breadcrumb schema generator",
        "breadcrumblist markup tool online",
        "browser breadcrumb builder",
      ],
      india: [
        "breadcrumb schema kaise banaye",
        "breadcrumb structured data india",
      ],
    },
  },
  {
    slug: "json-ld-validator",
    primary: "json-ld validator",
    secondary: [
      "structured data parse checker",
      "json ld type and field check",
      "syntax error in json ld",
      "schema markup before publishing",
      "paste and validate json ld",
    ],
    groups: {
      alternativeName: ["schema validator", "structured data checker"],
      synonym: [
        "check whether markup parses",
        "json ld syntax review",
        "validate pasted structured data",
      ],
      action: [
        "validate a json ld block",
        "find the field a schema is missing",
        "check markup before publishing",
      ],
      longTail: [
        "json ld missing at type error",
        "validate schema markup before publishing",
        "why is my json ld invalid",
        "check structured data without a crawler",
      ],
      problem: [
        "rich result disappeared after a deploy",
        "schema looks valid but is not",
        "a template emits broken json ld",
      ],
      question: [
        "how do i validate json ld",
        "what does missing at type mean",
        "is json ld the same as json",
      ],
      qualifier: [
        "free json ld validator",
        "schema checker no signup",
        "browser structured data validator",
      ],
      india: ["json ld validate kaise kare", "schema markup check india"],
    },
  },
  {
    slug: "robots-txt-generator",
    primary: "robots.txt generator",
    secondary: [
      "robots txt disallow rules",
      "crawl directive syntax checker",
      "user agent and sitemap lines",
      "robots txt before deploy",
      "block a directory from crawlers",
    ],
    groups: {
      alternativeName: ["robots file builder", "crawl rule generator"],
      synonym: [
        "compose crawl directives",
        "crawler instruction file",
        "allow and disallow rules",
      ],
      action: [
        "generate a robots txt file",
        "add disallow rules for a directory",
        "check robots syntax before deploying",
      ],
      longTail: [
        "robots txt disallow all except homepage",
        "robots txt with sitemap line",
        "which robots directive blocks a whole site",
        "robots txt wildcard and end anchor syntax",
      ],
      problem: [
        "robots txt blocking the whole site",
        "wildcard syntax not doing what was intended",
        "staging rules deployed to production",
      ],
      question: [
        "what is the correct robots txt syntax",
        "does robots txt stop a page being indexed",
        "should robots txt include the sitemap",
      ],
      qualifier: [
        "free robots txt generator",
        "robots file builder no signup",
        "browser crawl rule tool",
      ],
      india: ["robots txt kaise banaye", "robots file india website"],
    },
  },
  {
    slug: "sitemap-generator",
    primary: "sitemap generator",
    secondary: [
      "xml sitemap builder",
      "sitemap with lastmod dates",
      "urlset and url entry syntax",
      "fifty thousand url limit",
      "sitemap before upload",
    ],
    groups: {
      alternativeName: ["sitemap xml builder", "url list to sitemap tool"],
      synonym: [
        "xml file listing pages for crawlers",
        "url set for search engines",
        "sitemap from a list of urls",
      ],
      action: [
        "generate a sitemap xml file",
        "add lastmod dates to urls",
        "build a sitemap from a url list",
      ],
      longTail: [
        "sitemap xml with lastmod for every url",
        "sitemap for a site with fifty urls",
        "sitemap file size and url limit",
        "sitemap without a plugin or crawler",
      ],
      problem: [
        "sitemap rejected in search console",
        "missing lastmod on every entry",
        "sitemap lists urls that redirect",
      ],
      question: [
        "how many urls can a sitemap hold",
        "does a sitemap need lastmod",
        "should a sitemap include every page",
      ],
      qualifier: [
        "free sitemap generator",
        "xml sitemap builder no signup",
        "browser sitemap tool",
      ],
      india: ["sitemap kaise banaye", "sitemap xml india website"],
    },
  },
  {
    slug: "canonical-checker",
    primary: "canonical checker",
    secondary: [
      "rel canonical self reference check",
      "canonical url mismatch",
      "duplicate url in the index",
      "canonical versus redirect",
      "one canonical per page",
    ],
    groups: {
      alternativeName: ["canonical url checker", "rel canonical tool"],
      synonym: [
        "check the canonical tag a page declares",
        "self referencing canonical test",
        "canonical target review",
      ],
      action: [
        "check a canonical url for self reference",
        "find a canonical pointing elsewhere",
        "compare canonical and live url",
      ],
      longTail: [
        "canonical tag pointing to another page",
        "self referencing canonical with a trailing slash",
        "canonical mismatch after a url change",
        "why the wrong url ranks",
      ],
      problem: [
        "wrong url ranking in search",
        "canonical points at a redirected url",
        "trailing slash differences split a page",
      ],
      question: [
        "what should a canonical tag point at",
        "is a self referencing canonical necessary",
        "canonical or a redirect which one",
      ],
      qualifier: [
        "free canonical checker",
        "rel canonical tool online",
        "browser canonical review",
      ],
      india: ["canonical url kaise check kare", "canonical tag india seo"],
    },
  },
  {
    slug: "hreflang-checker",
    primary: "hreflang checker",
    secondary: [
      "hreflang reciprocity check",
      "x default and self reference",
      "iso language and region tags",
      "multi language cluster validation",
      "hreflang annotations across pages",
    ],
    groups: {
      alternativeName: ["hreflang validator", "language tag checker"],
      synonym: [
        "check a multi language cluster",
        "language and region annotation review",
        "alternate language url check",
      ],
      action: [
        "validate an hreflang cluster",
        "check reciprocity between language versions",
        "add an x default fallback",
      ],
      longTail: [
        "hreflang missing return link",
        "x default for an english site with hindi pages",
        "hreflang annotation on every page",
        "hreflang cluster void because one page is missing it",
      ],
      problem: [
        "language versions not swapping in the serp",
        "one page in the cluster lacks the annotations",
        "wrong region code stopping the swap",
      ],
      question: [
        "what does hreflang do",
        "is hreflang required for a bilingual site",
        "what is x default in hreflang",
      ],
      qualifier: [
        "free hreflang checker",
        "language cluster validator online",
        "browser hreflang tool",
      ],
      india: ["hreflang kaise lagaye", "hindi english website hreflang"],
    },
  },
  {
    slug: "redirect-checker",
    primary: "redirect checker",
    secondary: [
      "redirect chain and loop check",
      "301 versus 302 status",
      "redirect rule order",
      "permanent redirect for a moved page",
      "redirect map review",
    ],
    groups: {
      alternativeName: ["redirect chain checker", "status code analyser"],
      synonym: [
        "trace a url through redirect rules",
        "permanent and temporary redirect review",
        "redirect rule testing",
      ],
      action: [
        "check a redirect chain for loops",
        "resolve redirect rules to a final url",
        "find redirects that should be permanent",
      ],
      longTail: [
        "redirect chain through three hops",
        "301 for a moved page versus 302",
        "redirect loop in nginx rules",
        "redirect map before a site migration",
      ],
      problem: [
        "redirect loop in the browser",
        "chain of redirects slowing every request",
        "temporary redirect where permanent was meant",
      ],
      question: [
        "when should i use 301 or 302",
        "does a redirect chain affect ranking",
        "can a redirect loop be fixed with rule order",
      ],
      qualifier: [
        "free redirect checker",
        "redirect chain tool no signup",
        "browser redirect analyser",
      ],
      india: ["redirect kaise check kare", "301 redirect india website"],
    },
  },
  {
    slug: "robots-txt-validator",
    primary: "robots.txt validator",
    secondary: [
      "robots txt parse check",
      "ignored lines in robots file",
      "crawl rule debugging",
      "user agent group grouping",
      "robots file before publishing",
    ],
    groups: {
      alternativeName: ["robots file checker", "crawl rule debugger"],
      synonym: [
        "see how a robots file parses",
        "crawler instruction review",
        "rule by rule breakdown",
      ],
      action: [
        "validate a robots txt file",
        "see which lines a crawler ignores",
        "break a robots file into groups",
      ],
      longTail: [
        "robots txt lines ignored by google",
        "parse a robots file group by group",
        "why a disallow rule has no effect",
        "robots file with a bad user agent line",
      ],
      problem: [
        "rule in robots file has no effect",
        "whole site blocked by one line",
        "different crawlers read the file differently",
      ],
      question: [
        "how do crawlers read robots txt",
        "what makes a robots line invalid",
        "does case matter in robots txt",
      ],
      qualifier: [
        "free robots txt validator",
        "robots file parser online",
        "browser crawl rule checker",
      ],
      india: ["robots txt check kaise kare", "robots file validate india"],
    },
  },
  {
    slug: "sitemap-validator",
    primary: "sitemap validator",
    secondary: [
      "sitemap schema namespace check",
      "sitemap absolute url requirement",
      "duplicate url entries in a sitemap",
      "urlset versus sitemap index",
      "sitemap before submission",
    ],
    groups: {
      alternativeName: ["xml sitemap checker", "sitemap parse tool"],
      synonym: [
        "validate a sitemap xml file",
        "sitemap structure review",
        "check sitemap entries",
      ],
      action: [
        "validate a pasted sitemap",
        "check whether a file is a urlset or an index",
        "find duplicate urls in a sitemap",
      ],
      longTail: [
        "sitemap missing schema namespace",
        "relative urls in a sitemap rejected",
        "sitemap index versus urlset confusion",
        "duplicate url entries in one sitemap",
      ],
      problem: [
        "sitemap rejected when submitted",
        "entries silently ignored",
        "index file points at missing sitemaps",
      ],
      question: [
        "what makes a sitemap valid",
        "do sitemap urls need to be absolute",
        "what is a sitemap index",
      ],
      qualifier: [
        "free sitemap validator",
        "xml sitemap checker no signup",
        "browser sitemap review",
      ],
      india: ["sitemap validate kaise kare", "sitemap error india seo"],
    },
  },
  {
    slug: "title-generator",
    primary: "title generator",
    secondary: [
      "seo title within pixel budget",
      "title tag draft variants",
      "keyword forward title",
      "title length before truncation",
      "page title ideas for a post",
    ],
    groups: {
      alternativeName: ["seo title tool", "headline title builder"],
      synonym: [
        "draft a page title",
        "search title ideas",
        "title tag variants",
      ],
      action: [
        "generate title tag drafts",
        "fit a title inside the pixel budget",
        "write titles with the keyword first",
      ],
      longTail: [
        "title tag under sixty characters",
        "title variants for one page",
        "how to write a title tag that is not truncated",
        "title with the keyword at the start",
      ],
      problem: [
        "every title looks the same across the site",
        "title truncated on mobile",
        "no idea what to call a page",
      ],
      question: [
        "how long should a title tag be",
        "should the keyword come first in a title",
        "does the title tag affect ranking",
      ],
      qualifier: [
        "free title tag generator",
        "seo title tool no signup",
        "browser title builder",
      ],
      india: ["title tag kaise likhe", "seo title india website"],
    },
  },
  {
    slug: "meta-description-generator",
    primary: "meta description generator",
    secondary: [
      "meta description within snippet budget",
      "description draft variants",
      "call to action in a description",
      "description before truncation",
      "snippet copy for a page",
    ],
    groups: {
      alternativeName: ["search description tool", "snippet writer"],
      synonym: [
        "draft the description under a result",
        "snippet copy for a page",
        "description variants for a url",
      ],
      action: [
        "generate meta description drafts",
        "fit a description inside the snippet budget",
        "add a call to action to a description",
      ],
      longTail: [
        "meta description under one hundred sixty characters",
        "description variants for a product page",
        "how to write a meta description that gets clicks",
        "description that does not repeat the title",
      ],
      problem: [
        "google rewrites every description",
        "description clipped before the point",
        "snippet reads like a keyword list",
      ],
      question: [
        "meta description length that avoids truncation",
        "does the meta description affect ranking",
        "should every page have a description",
      ],
      qualifier: [
        "free meta description generator",
        "snippet writer no signup",
        "browser description tool",
      ],
      india: ["meta description kaise likhe", "description tag india seo"],
    },
  },
  {
    slug: "content-brief-generator",
    primary: "content brief generator",
    secondary: [
      "brief with headings and questions",
      "writer instructions for a post",
      "topic coverage checklist",
      "outline before drafting",
      "brief with internal link targets",
    ],
    groups: {
      alternativeName: ["article brief maker", "content plan tool"],
      synonym: [
        "instructions for a writer",
        "structure plan for an article",
        "coverage checklist before drafting",
      ],
      action: [
        "build a content brief from a topic",
        "generate an outline with headings",
        "list questions a post should answer",
      ],
      longTail: [
        "content brief with headings and questions",
        "brief for a writer including internal links",
        "outline before writing a blog post",
        "topic coverage checklist for a page",
      ],
      problem: [
        "writers produce posts that miss the point",
        "every draft drifts in a different direction",
        "no internal links in new content",
      ],
      question: [
        "what goes into a content brief",
        "how long should a content brief be",
        "should a brief include target keywords",
      ],
      qualifier: [
        "free content brief generator",
        "article brief tool no signup",
        "browser brief builder",
      ],
      india: ["content brief kaise banaye", "blog outline india"],
    },
  },
  {
    slug: "headline-generator",
    primary: "headline generator",
    secondary: [
      "headline by angle",
      "title variants by intent",
      "headline that the article can prove",
      "h1 options for a post",
      "headline click versus accuracy",
    ],
    groups: {
      alternativeName: ["headline maker", "h1 ideas tool"],
      synonym: [
        "on page heading ideas",
        "article title options",
        "heading variants by angle",
      ],
      action: [
        "generate headline variants",
        "write a headline by angle",
        "get h1 options for an article",
      ],
      longTail: [
        "headline variants for one article",
        "h1 that matches search intent",
        "headline ideas without clickbait",
        "different angles for the same topic",
      ],
      problem: [
        "headline overpromises what the post delivers",
        "every headline on the blog sounds identical",
        "h1 and title tag say different things",
      ],
      question: [
        "what makes a good headline",
        "should the h1 match the title tag",
        "how many words should a headline be",
      ],
      qualifier: [
        "free headline generator",
        "h1 ideas tool no signup",
        "browser headline builder",
      ],
      india: ["headline kaise likhe", "blog headline ideas india"],
    },
  },
  {
    slug: "alt-text-generator",
    primary: "alt text generator",
    secondary: [
      "accessible image description",
      "decorative image empty alt",
      "functional image alt text",
      "alt attribute by image role",
      "image description for screen readers",
    ],
    groups: {
      alternativeName: ["image alt writer", "alt attribute tool"],
      synonym: [
        "description of an image for accessibility",
        "alt string for an img tag",
        "screen reader image text",
      ],
      action: [
        "generate alt text for an image",
        "decide the alt for a decorative image",
        "write alt for a functional icon",
      ],
      longTail: [
        "alt text for a chart or graph",
        "empty alt attribute for decorative images",
        "alt text for an image that is also a link",
        "image description length for accessibility",
      ],
      problem: [
        "alt text repeats the caption",
        "every image alt starts with image of",
        "decorative images announced by screen readers",
      ],
      question: [
        "what should alt text contain",
        "when should alt be empty",
        "does alt text affect seo",
      ],
      qualifier: [
        "free alt text generator",
        "image description tool no signup",
        "browser alt writer",
      ],
      india: ["alt text kaise likhe", "image alt accessibility india"],
    },
  },
  {
    slug: "internal-link-suggestions",
    primary: "internal link suggestions",
    secondary: [
      "anchor text for an internal link",
      "pages that should link to each other",
      "orphan paragraph linking",
      "contextual link opportunities",
      "internal linking without a crawler",
    ],
    groups: {
      alternativeName: ["internal linking tool", "link opportunity finder"],
      synonym: [
        "candidate links between two pages",
        "anchor text proposals",
        "where a page should be linked from",
      ],
      action: [
        "suggest internal links between pages",
        "find a page that mentions a topic without linking",
        "propose anchor text",
      ],
      longTail: [
        "two pages mention the same topic but do not link",
        "anchor text options for an internal link",
        "internal links to add to an old post",
        "linking from a paragraph to a deep page",
      ],
      problem: [
        "new pages get no internal links",
        "anchor text always the same phrase",
        "blog and product sections never link",
      ],
      question: [
        "how many internal links should a page have",
        "does internal linking help seo",
        "what anchor text should an internal link use",
      ],
      qualifier: [
        "free internal link suggestions",
        "link opportunity tool no signup",
        "browser internal linking tool",
      ],
      india: ["internal linking kaise kare", "internal links india seo"],
    },
  },
  {
    slug: "topic-cluster-builder",
    primary: "topic cluster builder",
    secondary: [
      "shared keyword grouping",
      "pillar and supporting pages",
      "orphan page detection",
      "cluster by keyword overlap",
      "content hub structure",
    ],
    groups: {
      alternativeName: ["cluster planner", "content grouping tool"],
      synonym: [
        "group pages by topic",
        "hub and spoke page structure",
        "which pages belong together",
      ],
      action: [
        "build topic clusters from keywords",
        "find pages nothing links to",
        "group urls by shared keywords",
      ],
      longTail: [
        "pillar page and supporting posts structure",
        "orphan pages nothing links to",
        "cluster urls by shared keywords",
        "content hub plan for a small site",
      ],
      problem: [
        "no structure between blog posts",
        "pages written that nothing links to",
        "topics overlap with no obvious hub",
      ],
      question: [
        "what is a topic cluster",
        "how many pages should a cluster have",
        "does clustering help ranking",
      ],
      qualifier: [
        "free topic cluster builder",
        "content grouping tool no signup",
        "browser cluster planner",
      ],
      india: ["topic cluster kaise banaye", "content hub india seo"],
    },
  },
];
