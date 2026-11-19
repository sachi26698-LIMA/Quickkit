/**
 * JSON-LD structured-data builders.
 *
 * Every builder returns a plain object that is valid JSON and follows the
 * schema.org vocabulary. The value of this tool is that it produces markup that
 * **parses and validates**, not that it promises rich results: Google decides
 * eligibility, and most types here (Organization, WebSite, BreadcrumbList) never
 * produce a visual rich result at all. The UI says that plainly.
 *
 * Required-property validation is included because a silent missing field is the
 * single most common reason valid-looking JSON-LD is rejected: it is reported as
 * a finding with the property name, not silently omitted.
 */

export type Issue = { severity: "error" | "warning"; message: string };

export type SchemaResult = {
  json: string;
  issues: Issue[];
  /** Type names present, for the summary. */
  types: string[];
};

const clean = (value: unknown): unknown => {
  if (value === null || value === undefined || value === "") return undefined;
  if (Array.isArray(value)) {
    const items = value.map(clean).filter((item) => item !== undefined);
    return items.length > 0 ? items : undefined;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const result = clean(val);
      if (result !== undefined) out[key] = result;
    }
    return out;
  }
  return value;
};

function toJson(data: Record<string, unknown>, issues: Issue[]): SchemaResult {
  const cleaned = clean(data) as Record<string, unknown>;
  const types: string[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === "object") {
      const record = node as Record<string, unknown>;
      if (typeof record["@type"] === "string") types.push(record["@type"]);
      for (const value of Object.values(record)) walk(value);
    }
  };
  walk(cleaned);
  return {
    json: JSON.stringify(cleaned, null, 2),
    issues,
    types: [...new Set(types)],
  };
}

const isUrl = (value: string): boolean =>
  /^https?:\/\/[^\s]+$/i.test(value.trim());

function requireUrl(value: string, field: string, issues: Issue[]) {
  if (!value.trim()) {
    issues.push({
      severity: "error",
      message: `${field} is required and is empty.`,
    });
  } else if (!isUrl(value)) {
    issues.push({
      severity: "error",
      message: `${field} must be an absolute URL including https:// — "${value}" is not.`,
    });
  }
}

export type OrganizationInput = {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  email?: string;
  phone?: string;
  sameAs?: string[];
  address?: {
    street?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
};

export function organizationSchema(input: OrganizationInput): SchemaResult {
  const issues: Issue[] = [];
  if (!input.name.trim()) {
    issues.push({
      severity: "error",
      message: "Organization name is required.",
    });
  }
  requireUrl(input.url, "url", issues);
  if (input.logo && !isUrl(input.logo)) {
    issues.push({
      severity: "warning",
      message:
        "logo should be an absolute URL; relative paths are not resolvable by crawlers.",
    });
  }
  for (const profile of input.sameAs ?? []) {
    if (!isUrl(profile)) {
      issues.push({
        severity: "warning",
        message: `sameAs entry "${profile}" is not an absolute URL and will be ignored by consumers.`,
      });
    }
  }

  return toJson(
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: input.name,
      url: input.url,
      logo: input.logo,
      description: input.description,
      email: input.email,
      telephone: input.phone,
      sameAs: input.sameAs,
      address: input.address
        ? {
            "@type": "PostalAddress",
            streetAddress: input.address.street,
            addressLocality: input.address.city,
            addressRegion: input.address.region,
            postalCode: input.address.postalCode,
            addressCountry: input.address.country,
          }
        : undefined,
    },
    issues,
  );
}

export function websiteSchema(input: {
  name: string;
  url: string;
  searchUrlTemplate?: string;
}): SchemaResult {
  const issues: Issue[] = [];
  if (!input.name.trim())
    issues.push({ severity: "error", message: "Site name is required." });
  requireUrl(input.url, "url", issues);
  if (
    input.searchUrlTemplate &&
    !input.searchUrlTemplate.includes("{search_term_string}")
  ) {
    issues.push({
      severity: "warning",
      message:
        "A SearchAction target must contain {search_term_string} exactly; without it the action is invalid.",
    });
  }
  return toJson(
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: input.name,
      url: input.url,
      potentialAction: input.searchUrlTemplate
        ? {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: input.searchUrlTemplate,
            },
            "query-input": "required name=search_term_string",
          }
        : undefined,
    },
    issues,
  );
}

export function breadcrumbSchema(
  items: { name: string; url: string }[],
): SchemaResult {
  const issues: Issue[] = [];
  const valid = items.filter((item) => item.name.trim());
  if (valid.length < 2) {
    issues.push({
      severity: "error",
      message: "A BreadcrumbList needs at least two items to describe a path.",
    });
  }
  valid.forEach((item, index) =>
    requireUrl(item.url, `Item ${index + 1} url`, issues),
  );
  return toJson(
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: valid.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    },
    issues,
  );
}

export function articleSchema(input: {
  headline: string;
  description?: string;
  url: string;
  image?: string;
  authorName: string;
  publisherName: string;
  publisherLogo?: string;
  datePublished: string;
  dateModified?: string;
}): SchemaResult {
  const issues: Issue[] = [];
  if (!input.headline.trim()) {
    issues.push({
      severity: "error",
      message: "headline is required for Article.",
    });
  } else if (input.headline.length > 110) {
    issues.push({
      severity: "warning",
      message: `headline is ${input.headline.length} characters; schema.org guidance is about 110 or fewer.`,
    });
  }
  requireUrl(input.url, "url", issues);
  if (!input.authorName.trim()) {
    issues.push({
      severity: "error",
      message: "author.name is required for Article.",
    });
  }
  if (!/^\d{4}-\d{2}-\d{2}/.test(input.datePublished)) {
    issues.push({
      severity: "error",
      message: "datePublished must be an ISO 8601 date such as 2026-01-31.",
    });
  }
  return toJson(
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: input.headline,
      description: input.description,
      url: input.url,
      image: input.image,
      datePublished: input.datePublished,
      dateModified: input.dateModified || input.datePublished,
      author: { "@type": "Person", name: input.authorName },
      publisher: {
        "@type": "Organization",
        name: input.publisherName,
        logo: input.publisherLogo
          ? { "@type": "ImageObject", url: input.publisherLogo }
          : undefined,
      },
    },
    issues,
  );
}

export function faqSchema(
  items: { question: string; answer: string }[],
): SchemaResult {
  const issues: Issue[] = [];
  const valid = items.filter(
    (item) => item.question.trim() && item.answer.trim(),
  );
  if (valid.length === 0) {
    issues.push({
      severity: "error",
      message: "Add at least one question and answer.",
    });
  }
  valid.forEach((item, index) => {
    if (item.answer.trim().length < 20) {
      issues.push({
        severity: "warning",
        message: `Answer ${index + 1} is very short; a one-word answer is unlikely to be useful to a reader.`,
      });
    }
  });
  return toJson(
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: valid.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
    issues,
  );
}

export function productSchema(input: {
  name: string;
  description?: string;
  image?: string;
  sku?: string;
  brand?: string;
  price: number;
  currency: string;
  availability?: "in-stock" | "out-of-stock" | "preorder";
  url: string;
  ratingValue?: number;
  reviewCount?: number;
}): SchemaResult {
  const issues: Issue[] = [];
  if (!input.name.trim())
    issues.push({ severity: "error", message: "Product name is required." });
  requireUrl(input.url, "url", issues);
  if (input.price <= 0) {
    issues.push({
      severity: "warning",
      message:
        "Price is zero or negative; offers.price must be greater than zero for a Product.",
    });
  }
  if (!/^[A-Z]{3}$/.test(input.currency)) {
    issues.push({
      severity: "error",
      message:
        "priceCurrency must be a three-letter ISO 4217 code such as INR or USD.",
    });
  }
  if (input.ratingValue !== undefined) {
    if (input.ratingValue < 1 || input.ratingValue > 5) {
      issues.push({
        severity: "error",
        message: "ratingValue must be between 1 and 5 on schema.org's scale.",
      });
    }
    if (!input.reviewCount || input.reviewCount < 1) {
      issues.push({
        severity: "error",
        message:
          "AggregateRating without a real reviewCount is invalid. Do not publish a rating you have not collected — it is a policy violation, not just an error.",
      });
    }
  }
  const availability =
    input.availability === "out-of-stock"
      ? "https://schema.org/OutOfStock"
      : input.availability === "preorder"
        ? "https://schema.org/PreOrder"
        : "https://schema.org/InStock";

  return toJson(
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: input.name,
      description: input.description,
      image: input.image,
      sku: input.sku,
      brand: input.brand ? { "@type": "Brand", name: input.brand } : undefined,
      url: input.url,
      offers: {
        "@type": "Offer",
        price: input.price,
        priceCurrency: input.currency,
        availability,
        url: input.url,
      },
      aggregateRating:
        input.ratingValue !== undefined && input.reviewCount
          ? {
              "@type": "AggregateRating",
              ratingValue: input.ratingValue,
              reviewCount: input.reviewCount,
            }
          : undefined,
    },
    issues,
  );
}

export function localBusinessSchema(input: {
  name: string;
  url: string;
  telephone?: string;
  priceRange?: string;
  address: {
    street?: string;
    city: string;
    region: string;
    postalCode?: string;
    country: string;
  };
  openingHours?: { days: string[]; opens: string; closes: string }[];
  geo?: { latitude: number; longitude: number };
}): SchemaResult {
  const issues: Issue[] = [];
  if (!input.name.trim())
    issues.push({ severity: "error", message: "Business name is required." });
  requireUrl(input.url, "url", issues);
  if (!input.address.city.trim()) {
    issues.push({
      severity: "error",
      message: "addressLocality (city) is required for LocalBusiness.",
    });
  }
  if (!input.address.country.trim()) {
    issues.push({
      severity: "error",
      message: "addressCountry is required for LocalBusiness.",
    });
  }
  for (const hours of input.openingHours ?? []) {
    if (
      !/^\d{2}:\d{2}$/.test(hours.opens) ||
      !/^\d{2}:\d{2}$/.test(hours.closes)
    ) {
      issues.push({
        severity: "warning",
        message: "openingHours times should be 24-hour HH:MM, e.g. 09:00.",
      });
    }
  }
  return toJson(
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: input.name,
      url: input.url,
      telephone: input.telephone,
      priceRange: input.priceRange,
      address: {
        "@type": "PostalAddress",
        streetAddress: input.address.street,
        addressLocality: input.address.city,
        addressRegion: input.address.region,
        postalCode: input.address.postalCode,
        addressCountry: input.address.country,
      },
      openingHoursSpecification: (input.openingHours ?? []).map((hours) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: hours.days,
        opens: hours.opens,
        closes: hours.closes,
      })),
      geo: input.geo
        ? {
            "@type": "GeoCoordinates",
            latitude: input.geo.latitude,
            longitude: input.geo.longitude,
          }
        : undefined,
    },
    issues,
  );
}

export function jobPostingSchema(input: {
  title: string;
  description: string;
  datePosted: string;
  employmentType?: string;
  hiringOrganizationName: string;
  hiringOrganizationUrl?: string;
  jobLocationCity: string;
  jobLocationRegion?: string;
  jobLocationCountry: string;
  baseSalaryMin?: number;
  baseSalaryMax?: number;
  currency?: string;
  unit?: "MONTH" | "YEAR" | "HOUR";
  validThrough?: string;
  remote?: boolean;
}): SchemaResult {
  const issues: Issue[] = [];
  if (!input.title.trim())
    issues.push({ severity: "error", message: "Job title is required." });
  if (!input.description.trim() || input.description.trim().length < 50) {
    issues.push({
      severity: "error",
      message:
        "JobPosting description is required and must be substantial; Google's guidelines require the full description, not a summary.",
    });
  }
  if (!/^\d{4}-\d{2}-\d{2}/.test(input.datePosted)) {
    issues.push({
      severity: "error",
      message: "datePosted must be an ISO 8601 date.",
    });
  }
  if (!input.hiringOrganizationName.trim()) {
    issues.push({
      severity: "error",
      message: "hiringOrganization.name is required.",
    });
  }
  if (!input.jobLocationCity.trim()) {
    issues.push({
      severity: "error",
      message: "jobLocation addressLocality is required.",
    });
  }
  if (
    input.baseSalaryMin !== undefined &&
    input.baseSalaryMax !== undefined &&
    input.baseSalaryMax < input.baseSalaryMin
  ) {
    issues.push({
      severity: "error",
      message: "baseSalary max is lower than min; this fails validation.",
    });
  }

  return toJson(
    {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: input.title,
      description: input.description,
      datePosted: input.datePosted,
      validThrough: input.validThrough,
      employmentType: input.employmentType,
      hiringOrganization: {
        "@type": "Organization",
        name: input.hiringOrganizationName,
        sameAs: input.hiringOrganizationUrl,
      },
      jobLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressLocality: input.jobLocationCity,
          addressRegion: input.jobLocationRegion,
          addressCountry: input.jobLocationCountry,
        },
      },
      jobLocationType: input.remote ? "TELECOMMUTE" : undefined,
      baseSalary:
        input.baseSalaryMin !== undefined
          ? {
              "@type": "MonetaryAmount",
              currency: input.currency ?? "INR",
              value: {
                "@type": "QuantitativeValue",
                minValue: input.baseSalaryMin,
                maxValue: input.baseSalaryMax ?? input.baseSalaryMin,
                unitText: input.unit ?? "MONTH",
              },
            }
          : undefined,
    },
    issues,
  );
}

/** Validate existing JSON-LD pasted by the user. */
export function validateJsonLd(text: string): {
  ok: boolean;
  issues: Issue[];
  types: string[];
  formatted: string | null;
} {
  const issues: Issue[] = [];
  if (!text.trim()) {
    return {
      ok: false,
      issues: [{ severity: "error", message: "Paste JSON-LD to validate." }],
      types: [],
      formatted: null,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          severity: "error",
          message: `Not valid JSON: ${error instanceof Error ? error.message : "parse failed"}. Trailing commas and unquoted keys are the usual cause.`,
        },
      ],
      types: [],
      formatted: null,
    };
  }

  const nodes = Array.isArray(parsed) ? parsed : [parsed];
  const types: string[] = [];
  nodes.forEach((node, index) => {
    if (!node || typeof node !== "object") {
      issues.push({
        severity: "error",
        message: `Item ${index + 1} is not a JSON object.`,
      });
      return;
    }
    const record = node as Record<string, unknown>;
    if (typeof record["@type"] !== "string") {
      issues.push({
        severity: "error",
        message: `Item ${index + 1} has no "@type".`,
      });
    } else {
      types.push(record["@type"]);
    }
    if (record["@context"] === undefined) {
      issues.push({
        severity: "warning",
        message: `Item ${index + 1} has no "@context"; schema.org consumers need "https://schema.org".`,
      });
    } else if (
      record["@context"] !== "https://schema.org" &&
      record["@context"] !== "http://schema.org" &&
      record["@context"] !== "https://schema.org/"
    ) {
      issues.push({
        severity: "warning",
        message: `Item ${index + 1} uses @context "${String(record["@context"])}"; the schema.org context is the interoperable one.`,
      });
    }
  });

  if (!issues.some((issue) => issue.severity === "error")) {
    issues.push({
      severity: "warning",
      message:
        "Syntax is valid. This checks structure only — it cannot confirm Google will show a rich result, which depends on content quality and policy.",
    });
  }

  return {
    ok: !issues.some((issue) => issue.severity === "error"),
    issues,
    types,
    formatted: JSON.stringify(parsed, null, 2),
  };
}
