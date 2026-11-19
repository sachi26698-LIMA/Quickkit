import { describe, expect, it } from "vitest";
import {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  jobPostingSchema,
  localBusinessSchema,
  organizationSchema,
  productSchema,
  validateJsonLd,
  websiteSchema,
} from "@/lib/tools/seo/schema";
import {
  altText,
  buildContentBrief,
  buildTopicClusters,
  descriptionSuggestions,
  headlineSuggestions,
  suggestInternalLinks,
  titleSuggestions,
} from "@/lib/tools/seo/text-kit";

/** Parse the JSON a schema builder produced, so a test can assert on it. */
function jsonOf(result: { json: string }) {
  return JSON.parse(result.json) as Record<string, unknown>;
}

describe("schema builders", () => {
  it("builds an Organization schema with the type and the name", () => {
    const result = organizationSchema({
      name: "Acme Pvt Ltd",
      url: "https://acme.example",
    });
    const parsed = jsonOf(result);
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(parsed["@type"]).toBe("Organization");
    expect(parsed.name).toBe("Acme Pvt Ltd");
  });

  it("reports an error when the organization has no name", () => {
    const result = organizationSchema({
      name: "",
      url: "https://acme.example",
    });
    expect(result.issues.some((issue) => issue.severity === "error")).toBe(
      true,
    );
  });

  it("builds an Article schema with the author and the dates", () => {
    const result = articleSchema({
      headline: "How to reduce payroll errors",
      url: "https://acme.example/blog/payroll-errors",
      authorName: "Ravi Kumar",
      publisherName: "Acme",
      datePublished: "2026-03-01",
    });
    const parsed = jsonOf(result);
    expect(parsed["@type"]).toBe("Article");
    expect(parsed.headline).toBe("How to reduce payroll errors");
    expect(parsed.author).toBeTruthy();
  });

  it("builds a FAQ schema from questions and answers", () => {
    const result = faqSchema([
      {
        question: "What is PF?",
        answer: "Provident Fund, the retirement savings scheme.",
      },
      {
        question: "What is ESI?",
        answer: "Employee State Insurance, for low-wage workers.",
      },
    ]);
    const parsed = jsonOf(result);
    expect(parsed["@type"]).toBe("FAQPage");
  });

  it("builds a Product schema with an offer", () => {
    const result = productSchema({
      name: "Salary Slip Generator",
      description: "Make a payslip.",
      price: 0,
      currency: "INR",
      url: "https://acme.example/tools/salary-slip-generator",
    });
    const parsed = jsonOf(result);
    expect(parsed["@type"]).toBe("Product");
  });

  it("builds a LocalBusiness schema with an address", () => {
    const result = localBusinessSchema({
      name: "Acme Store",
      url: "https://acme.example",
      address: {
        street: "1 Main St",
        city: "Bengaluru",
        region: "Karnataka",
        country: "IN",
      },
    });
    const parsed = jsonOf(result);
    expect(parsed["@type"]).toBe("LocalBusiness");
  });

  it("builds a JobPosting schema with the dates", () => {
    const result = jobPostingSchema({
      title: "Backend Engineer",
      description: "Build and run services.",
      datePosted: "2026-03-01",
      hiringOrganizationName: "Acme",
      jobLocationCity: "Bengaluru",
      jobLocationCountry: "IN",
      validThrough: "2026-04-01",
    });
    const parsed = jsonOf(result);
    expect(parsed["@type"]).toBe("JobPosting");
  });

  it("builds a BreadcrumbList schema with its items", () => {
    const result = breadcrumbSchema([
      { name: "Home", url: "https://acme.example/" },
      { name: "Tools", url: "https://acme.example/tools" },
    ]);
    const parsed = jsonOf(result);
    expect(parsed["@type"]).toBe("BreadcrumbList");
  });

  it("builds a Website schema", () => {
    const result = websiteSchema({ name: "Acme", url: "https://acme.example" });
    expect(jsonOf(result)["@type"]).toBe("WebSite");
  });

  it("produces JSON that parses for every builder", () => {
    const results = [
      organizationSchema({ name: "Acme", url: "https://acme.example" }),
      websiteSchema({ name: "Acme", url: "https://acme.example" }),
      articleSchema({
        headline: "H",
        url: "https://acme.example/a",
        authorName: "A",
        publisherName: "P",
        datePublished: "2026-03-01",
      }),
      faqSchema([{ question: "Q", answer: "A long enough answer." }]),
      productSchema({
        name: "P",
        price: 1,
        currency: "INR",
        url: "https://acme.example/p",
      }),
      localBusinessSchema({
        name: "L",
        url: "https://acme.example",
        address: { city: "Bengaluru", region: "KA", country: "IN" },
      }),
      jobPostingSchema({
        title: "T",
        description: "D",
        datePosted: "2026-03-01",
        hiringOrganizationName: "O",
        jobLocationCity: "Bengaluru",
        jobLocationCountry: "IN",
        validThrough: "2026-04-01",
      }),
      breadcrumbSchema([{ name: "Home", url: "https://acme.example/" }]),
    ];
    for (const result of results) {
      expect(() => JSON.parse(result.json)).not.toThrow();
      expect(result.json).toContain("https://schema.org");
    }
  });
});

describe("validateJsonLd", () => {
  it("accepts a valid document", () => {
    const result = validateJsonLd(
      '{"@context":"https://schema.org","@type":"Organization","name":"Acme"}',
    );
    expect(result.ok).toBe(true);
    expect(result.types).toContain("Organization");
  });

  it("rejects invalid JSON with a readable message", () => {
    const result = validateJsonLd("{ not json");
    expect(result.ok).toBe(false);
    expect(result.issues[0].message.length).toBeGreaterThan(0);
  });

  it("rejects an empty document", () => {
    expect(validateJsonLd("").ok).toBe(false);
  });

  it("flags a document with no @type", () => {
    const result = validateJsonLd('{"name":"Acme"}');
    expect(result.ok).toBe(false);
  });

  it("flags a document with the wrong @context", () => {
    const result = validateJsonLd(
      '{"@context":"http://example.com","@type":"Organization"}',
    );
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe("text kit", () => {
  it("suggests titles within the character budget", () => {
    const result = titleSuggestions({
      keyword: "salary slip generator",
      modifier: "how-to",
    });
    expect(result.length).toBeGreaterThan(0);
    for (const suggestion of result) {
      expect(suggestion.text.length).toBe(suggestion.length);
      expect(suggestion.note.length).toBeGreaterThan(0);
    }
  });

  it("suggests descriptions within the character budget", () => {
    const result = descriptionSuggestions({
      keyword: "salary slip generator",
      benefit: "create a payslip for an employee in under a minute",
    });
    for (const suggestion of result) {
      expect(suggestion.text.length).toBe(suggestion.length);
    }
  });

  it("suggests headlines", () => {
    const result = headlineSuggestions({
      subject: "payroll errors",
      angle: "how-to",
    });
    expect(result.length).toBeGreaterThan(0);
  });

  it("builds a content brief from the facts given", () => {
    const brief = buildContentBrief({
      topic: "PF calculator",
      intent: "informational",
      audience: "Indian employees",
    });
    expect(brief.markdown.length).toBeGreaterThan(0);
    expect(brief.sections).toBeGreaterThan(0);
    expect(brief.issues).toEqual([]);
  });

  it("flags a brief that is too short to answer the question", () => {
    const brief = buildContentBrief({
      topic: "PF calculator",
      intent: "informational",
      audience: "Indian employees",
      targetWords: 150,
    });
    expect(brief.issues.length).toBeGreaterThan(0);
  });

  it("flags a brief with no named audience", () => {
    const brief = buildContentBrief({
      topic: "PF calculator",
      intent: "informational",
      audience: "",
    });
    expect(brief.issues.length).toBeGreaterThan(0);
  });

  it("suggests alt text from an image description", () => {
    const result = altText({
      subject: "A chart showing monthly salary breakdown",
    });
    expect(result.value.length).toBeGreaterThan(0);
    expect(result.note.length).toBeGreaterThan(0);
  });

  it("suggests internal links from real anchors", () => {
    const result = suggestInternalLinks([
      {
        url: "/tools/merge-pdf",
        keyword: "merge pdf",
        text: "You can also compress pdf for email.",
      },
      {
        url: "/tools/compress-pdf",
        keyword: "compress pdf",
        text: "Compress pdf for email.",
      },
    ]);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].to).toBe("/tools/compress-pdf");
    expect(result[0].reason.length).toBeGreaterThan(0);
  });

  it("builds topic clusters from a pillar and its supports", () => {
    const clusters = buildTopicClusters([
      { url: "/tools/salary-calculator", keyword: "salary calculator" },
      { url: "/tools/pf-calculator", keyword: "pf calculator" },
      { url: "/tools/esi-calculator", keyword: "esi calculator" },
    ]);
    expect(clusters.clusters.length + clusters.orphans.length).toBeGreaterThan(
      0,
    );
  });
});
