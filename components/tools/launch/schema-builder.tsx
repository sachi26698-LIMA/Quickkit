"use client";

import { useState } from "react";
import {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  localBusinessSchema,
  organizationSchema,
  productSchema,
  validateJsonLd,
  jobPostingSchema,
  type SchemaResult,
} from "@/lib/tools/seo/schema";
import {
  Disclosure,
  EmptyState,
  Field,
  FieldGrid,
  Notice,
  ResultPanel,
  SelectField,
  Stat,
  StatRow,
  parseNumber,
} from "@/components/tools/launch/ui";

type Mode =
  | "organization-schema"
  | "article-schema"
  | "faq-schema"
  | "product-schema"
  | "local-business-schema"
  | "job-posting-schema"
  | "breadcrumb-schema"
  | "json-ld-validator";

export default function SchemaBuilder({ mode }: { mode: Mode }) {
  switch (mode) {
    case "article-schema":
      return <ArticleTool />;
    case "faq-schema":
      return <FaqTool />;
    case "product-schema":
      return <ProductTool />;
    case "local-business-schema":
      return <LocalBusinessTool />;
    case "job-posting-schema":
      return <JobPostingTool />;
    case "breadcrumb-schema":
      return <BreadcrumbTool />;
    case "json-ld-validator":
      return <ValidatorTool />;
    default:
      return <OrganizationTool />;
  }
}

/** Shared result view: the JSON plus the issue list, in one place. */
function SchemaOutput({
  result,
  filename,
  onReset,
  children,
}: {
  result: SchemaResult;
  filename: string;
  onReset: () => void;
  children?: React.ReactNode;
}) {
  const errors = result.issues.filter((issue) => issue.severity === "error");
  const warnings = result.issues.filter(
    (issue) => issue.severity === "warning",
  );

  return (
    <ResultPanel
      title="Generated JSON-LD"
      show
      text={result.json}
      filename={filename}
      onReset={onReset}
    >
      <StatRow>
        <Stat
          label="Types"
          value={result.types.join(", ") || "—"}
          detail="schema.org @type values"
          emphasis
        />
        <Stat
          label="Errors"
          value={String(errors.length)}
          detail="Must be zero to publish"
        />
        <Stat
          label="Warnings"
          value={String(warnings.length)}
          detail="Worth fixing"
        />
      </StatRow>

      {errors.length > 0 ? (
        <Notice tone="error">
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {errors.map((issue) => (
              <li key={issue.message}>{issue.message}</li>
            ))}
          </ul>
        </Notice>
      ) : null}
      {warnings.length > 0 ? (
        <Notice tone="warning">
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {warnings.map((issue) => (
              <li key={issue.message}>{issue.message}</li>
            ))}
          </ul>
        </Notice>
      ) : null}

      {children}

      <div className="qw-mono" aria-label="Generated JSON-LD">
        {result.json}
      </div>

      <Disclosure summary="How to add this to your page">
        <p>
          Paste the block inside a{" "}
          <code>&lt;script type=&quot;application/ld+json&quot;&gt;</code>{" "}
          element in the page&apos;s <code>&lt;head&gt;</code> or{" "}
          <code>&lt;body&gt;</code>.
        </p>
        <p className="qw-mono" style={{ margin: 0 }}>
          {`<script type="application/ld+json">\n${result.json}\n</script>`}
        </p>
        <p>
          Validate it with Google&apos;s Rich Results Test and the Schema Markup
          Validator before shipping. A block that parses here can still fail
          those, because they check Google-specific requirements this tool does
          not.
        </p>
      </Disclosure>
    </ResultPanel>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function OrganizationTool() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [logo, setLogo] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sameAs, setSameAs] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("IN");

  const result = organizationSchema({
    name,
    url,
    logo,
    description,
    email,
    phone,
    sameAs: sameAs
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
    address: { street, city, region, postalCode, country },
  });

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Organization details</h2>
        <p className="qw-section-note">
          Organization markup describes the company behind the site. It helps
          knowledge panels and it never produces a rich result on its own —
          worth doing, not worth expecting a visual change from.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Organization name"
            value={name}
            onChange={setName}
            placeholder="Acme Pvt Ltd"
          />
          <Field
            label="Website URL"
            value={url}
            onChange={setUrl}
            placeholder="https://example.com"
            hint="Must be absolute with https://."
          />
          <Field
            label="Logo URL"
            value={logo}
            onChange={setLogo}
            placeholder="https://example.com/logo.png"
          />
          <Field label="Email" value={email} onChange={setEmail} />
          <Field label="Phone" value={phone} onChange={setPhone} />
        </FieldGrid>
        <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
          <Field
            label="Description"
            value={description}
            onChange={setDescription}
            multiline
            rows={3}
          />
          <Field
            label="Social profiles (one URL per line)"
            value={sameAs}
            onChange={setSameAs}
            multiline
            rows={4}
            placeholder={
              "https://www.linkedin.com/company/acme\nhttps://twitter.com/acme"
            }
          />
        </div>
        <div style={{ marginTop: 14 }}>
          <FieldGrid columns={2}>
            <Field label="Street" value={street} onChange={setStreet} />
            <Field label="City" value={city} onChange={setCity} />
            <Field label="Region / state" value={region} onChange={setRegion} />
            <Field
              label="Postal code"
              value={postalCode}
              onChange={setPostalCode}
            />
            <Field
              label="Country"
              value={country}
              onChange={setCountry}
              placeholder="IN"
            />
          </FieldGrid>
        </div>
      </div>
      {!name.trim() && !url.trim() ? (
        <EmptyState>
          Add the organization name and an absolute URL to generate valid
          markup.
        </EmptyState>
      ) : (
        <SchemaOutput
          result={result}
          filename="organization-json-ld"
          onReset={() => {
            setName("");
            setUrl("");
            setLogo("");
            setDescription("");
            setEmail("");
            setPhone("");
            setSameAs("");
          }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ArticleTool() {
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [image, setImage] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [publisherName, setPublisherName] = useState("");
  const [datePublished, setDatePublished] = useState("");
  const [dateModified, setDateModified] = useState("");

  const result = articleSchema({
    headline,
    description,
    url,
    image,
    authorName,
    publisherName,
    datePublished,
    dateModified,
  });

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Article details</h2>
        <p className="qw-section-note">
          Article markup needs a real headline, a real author and an ISO date. A
          modified date that changes on every request is ignored; one that
          changes when the article changes is respected.
        </p>
        <FieldGrid columns={2}>
          <Field
            label="Headline"
            value={headline}
            onChange={setHeadline}
            hint="About 110 characters or fewer."
          />
          <Field
            label="Page URL"
            value={url}
            onChange={setUrl}
            placeholder="https://example.com/blog/post"
          />
          <Field
            label="Author name"
            value={authorName}
            onChange={setAuthorName}
          />
          <Field
            label="Publisher name"
            value={publisherName}
            onChange={setPublisherName}
          />
          <Field
            label="Date published"
            value={datePublished}
            onChange={setDatePublished}
            placeholder="2026-03-01"
          />
          <Field
            label="Date modified"
            value={dateModified}
            onChange={setDateModified}
            placeholder="2026-03-15"
          />
          <Field label="Image URL" value={image} onChange={setImage} />
        </FieldGrid>
        <div style={{ marginTop: 14 }}>
          <Field
            label="Description"
            value={description}
            onChange={setDescription}
            multiline
            rows={3}
          />
        </div>
      </div>
      {!headline.trim() ? (
        <EmptyState>Add a headline to generate the markup.</EmptyState>
      ) : (
        <SchemaOutput
          result={result}
          filename="article-json-ld"
          onReset={() => {
            setHeadline("");
            setUrl("");
            setAuthorName("");
            setDatePublished("");
          }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

type FaqRow = { question: string; answer: string };

function FaqTool() {
  const [rows, setRows] = useState<FaqRow[]>([
    { question: "", answer: "" },
    { question: "", answer: "" },
  ]);

  const result = faqSchema(rows);

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Questions and answers</h2>
        <p className="qw-section-note">
          FAQ markup must mirror questions that are actually visible on the
          page. Marking up questions a reader cannot see is a policy violation,
          not a shortcut.
        </p>
        <div style={{ display: "grid", gap: 14 }}>
          {rows.map((row, index) => (
            <div
              key={index}
              style={{
                display: "grid",
                gap: 9,
                padding: 13,
                border: "1px solid #ece7f5",
                borderRadius: 11,
              }}
            >
              <Field
                label={`Question ${index + 1}`}
                value={row.question}
                onChange={(value) =>
                  setRows(
                    rows.map((item, position) =>
                      position === index ? { ...item, question: value } : item,
                    ),
                  )
                }
              />
              <Field
                label={`Answer ${index + 1}`}
                value={row.answer}
                onChange={(value) =>
                  setRows(
                    rows.map((item, position) =>
                      position === index ? { ...item, answer: value } : item,
                    ),
                  )
                }
                multiline
                rows={3}
              />
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setRows(rows.filter((_, position) => position !== index))
                }
                disabled={rows.length <= 1}
                style={{ justifySelf: "start" }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="secondary"
          style={{ marginTop: 12 }}
          onClick={() => setRows([...rows, { question: "", answer: "" }])}
        >
          Add question
        </button>
      </div>
      {rows.every((row) => !row.question.trim()) ? (
        <EmptyState>Add at least one question and answer.</EmptyState>
      ) : (
        <SchemaOutput
          result={result}
          filename="faq-json-ld"
          onReset={() => setRows([{ question: "", answer: "" }])}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ProductTool() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [image, setImage] = useState("");
  const [sku, setSku] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [availability, setAvailability] = useState("in-stock");

  const result = productSchema({
    name,
    description,
    url,
    image,
    sku,
    brand,
    price: parseNumber(price) ?? 0,
    currency,
    availability: availability as "in-stock" | "out-of-stock" | "preorder",
  });

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Product details</h2>
        <p className="qw-section-note">
          Ratings are deliberately not offered as a field. An aggregate rating
          needs real collected reviews with a real count; markup for a rating
          you have not collected is a policy violation, and this builder refuses
          to produce one without a count.
        </p>
        <FieldGrid columns={2}>
          <Field label="Product name" value={name} onChange={setName} />
          <Field
            label="Page URL"
            value={url}
            onChange={setUrl}
            placeholder="https://example.com/product"
          />
          <Field label="SKU" value={sku} onChange={setSku} />
          <Field label="Brand" value={brand} onChange={setBrand} />
          <Field
            label="Price"
            value={price}
            onChange={setPrice}
            inputMode="decimal"
          />
          <Field
            label="Currency"
            value={currency}
            onChange={setCurrency}
            placeholder="INR"
            hint="Three-letter ISO 4217 code."
          />
          <SelectField
            label="Availability"
            value={availability}
            onChange={setAvailability}
            options={[
              { value: "in-stock", label: "In stock" },
              { value: "out-of-stock", label: "Out of stock" },
              { value: "preorder", label: "Pre-order" },
            ]}
          />
          <Field label="Image URL" value={image} onChange={setImage} />
        </FieldGrid>
        <div style={{ marginTop: 14 }}>
          <Field
            label="Description"
            value={description}
            onChange={setDescription}
            multiline
            rows={3}
          />
        </div>
      </div>
      {!name.trim() ? (
        <EmptyState>Add a product name to generate the markup.</EmptyState>
      ) : (
        <SchemaOutput
          result={result}
          filename="product-json-ld"
          onReset={() => {
            setName("");
            setUrl("");
            setPrice("");
          }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function LocalBusinessTool() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("IN");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [opens, setOpens] = useState("09:00");
  const [closes, setCloses] = useState("18:00");
  const [useHours, setUseHours] = useState(false);

  const result = localBusinessSchema({
    name,
    url,
    telephone: phone,
    priceRange,
    address: { street, city, region, postalCode, country },
    openingHours: useHours
      ? [
          {
            days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            opens,
            closes,
          },
        ]
      : [],
    geo:
      parseNumber(latitude) !== null && parseNumber(longitude) !== null
        ? {
            latitude: parseNumber(latitude)!,
            longitude: parseNumber(longitude)!,
          }
        : undefined,
  });

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Business details</h2>
        <p className="qw-section-note">
          LocalBusiness markup pairs with a Google Business Profile; it does not
          replace one. City and country are required, because a local entity
          without a location is not valid markup.
        </p>
        <FieldGrid columns={2}>
          <Field label="Business name" value={name} onChange={setName} />
          <Field
            label="Website URL"
            value={url}
            onChange={setUrl}
            placeholder="https://example.com"
          />
          <Field label="Phone" value={phone} onChange={setPhone} />
          <Field
            label="Price range"
            value={priceRange}
            onChange={setPriceRange}
            placeholder="₹₹"
          />
          <Field label="Street" value={street} onChange={setStreet} />
          <Field label="City" value={city} onChange={setCity} />
          <Field label="Region / state" value={region} onChange={setRegion} />
          <Field
            label="Postal code"
            value={postalCode}
            onChange={setPostalCode}
          />
          <Field label="Country" value={country} onChange={setCountry} />
          <Field
            label="Latitude"
            value={latitude}
            onChange={setLatitude}
            inputMode="decimal"
          />
          <Field
            label="Longitude"
            value={longitude}
            onChange={setLongitude}
            inputMode="decimal"
          />
        </FieldGrid>
        <div style={{ marginTop: 14 }}>
          <SelectField
            label="Opening hours"
            value={useHours ? "yes" : "no"}
            onChange={(value) => setUseHours(value === "yes")}
            options={[
              { value: "no", label: "Not stated" },
              { value: "yes", label: "Monday to Friday" },
            ]}
          />
          {useHours ? (
            <div style={{ marginTop: 12 }}>
              <FieldGrid columns={2}>
                <Field
                  label="Opens"
                  value={opens}
                  onChange={setOpens}
                  placeholder="09:00"
                />
                <Field
                  label="Closes"
                  value={closes}
                  onChange={setCloses}
                  placeholder="18:00"
                />
              </FieldGrid>
            </div>
          ) : null}
        </div>
      </div>
      {!name.trim() ? (
        <EmptyState>Add the business name to generate the markup.</EmptyState>
      ) : (
        <SchemaOutput
          result={result}
          filename="local-business-json-ld"
          onReset={() => {
            setName("");
            setUrl("");
            setCity("");
          }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function JobPostingTool() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [datePosted, setDatePosted] = useState("");
  const [validThrough, setValidThrough] = useState("");
  const [employmentType, setEmploymentType] = useState("FULL_TIME");
  const [orgName, setOrgName] = useState("");
  const [orgUrl, setOrgUrl] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("IN");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [unit, setUnit] = useState("MONTH");
  const [remote, setRemote] = useState(false);

  const result = jobPostingSchema({
    title,
    description,
    datePosted,
    validThrough: validThrough || undefined,
    employmentType,
    hiringOrganizationName: orgName,
    hiringOrganizationUrl: orgUrl,
    jobLocationCity: city,
    jobLocationRegion: region,
    jobLocationCountry: country,
    baseSalaryMin: parseNumber(salaryMin) ?? undefined,
    baseSalaryMax: parseNumber(salaryMax) ?? undefined,
    currency,
    unit: unit as "MONTH" | "YEAR" | "HOUR",
    remote,
  });

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Job posting details</h2>
        <p className="qw-section-note">
          JobPosting is the most heavily validated type on Google. A missing
          company, city or full description makes the posting ineligible, and an
          expired validThrough date removes it silently.
        </p>
        <FieldGrid columns={2}>
          <Field label="Job title" value={title} onChange={setTitle} />
          <Field
            label="Hiring organization"
            value={orgName}
            onChange={setOrgName}
          />
          <Field label="Organization URL" value={orgUrl} onChange={setOrgUrl} />
          <Field
            label="Date posted"
            value={datePosted}
            onChange={setDatePosted}
            placeholder="2026-03-01"
          />
          <Field
            label="Valid through"
            value={validThrough}
            onChange={setValidThrough}
            placeholder="2026-05-01"
          />
          <SelectField
            label="Employment type"
            value={employmentType}
            onChange={setEmploymentType}
            options={[
              { value: "FULL_TIME", label: "Full time" },
              { value: "PART_TIME", label: "Part time" },
              { value: "CONTRACTOR", label: "Contractor" },
              { value: "TEMPORARY", label: "Temporary" },
              { value: "INTERN", label: "Intern" },
            ]}
          />
          <Field label="City" value={city} onChange={setCity} />
          <Field label="Region" value={region} onChange={setRegion} />
          <Field label="Country" value={country} onChange={setCountry} />
          <Field
            label="Salary minimum"
            value={salaryMin}
            onChange={setSalaryMin}
            inputMode="decimal"
          />
          <Field
            label="Salary maximum"
            value={salaryMax}
            onChange={setSalaryMax}
            inputMode="decimal"
          />
          <Field label="Currency" value={currency} onChange={setCurrency} />
          <SelectField
            label="Salary unit"
            value={unit}
            onChange={setUnit}
            options={[
              { value: "MONTH", label: "Per month" },
              { value: "YEAR", label: "Per year" },
              { value: "HOUR", label: "Per hour" },
            ]}
          />
        </FieldGrid>
        <div style={{ marginTop: 14 }}>
          <Field
            label="Full job description"
            value={description}
            onChange={setDescription}
            multiline
            rows={8}
            hint="Paste the whole description. Google requires the actual text, not a summary or a link."
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <SelectField
            label="Remote"
            value={remote ? "yes" : "no"}
            onChange={(value) => setRemote(value === "yes")}
            options={[
              { value: "no", label: "On site" },
              { value: "yes", label: "Telecommute allowed" },
            ]}
          />
        </div>
      </div>
      {!title.trim() ? (
        <EmptyState>
          Add a job title and description to generate the markup.
        </EmptyState>
      ) : (
        <SchemaOutput
          result={result}
          filename="job-posting-json-ld"
          onReset={() => {
            setTitle("");
            setDescription("");
            setOrgName("");
            setCity("");
          }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function BreadcrumbTool() {
  const [rows, setRows] = useState<{ name: string; url: string }[]>([
    { name: "Home", url: "" },
    { name: "", url: "" },
  ]);

  const result = breadcrumbSchema(rows);

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Breadcrumb path</h2>
        <p className="qw-section-note">
          Order matters: the first item is the root. Every item needs an
          absolute URL, and a list without two items is not a path.
        </p>
        <div style={{ display: "grid", gap: 9 }}>
          {rows.map((row, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: 9,
                alignItems: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: "0 1 150px", minWidth: 120 }}>
                <label className="qw-sr-only" htmlFor={`crumb-name-${index}`}>
                  Name {index + 1}
                </label>
                <input
                  id={`crumb-name-${index}`}
                  className="qw-input"
                  value={row.name}
                  placeholder="Name"
                  onChange={(event) =>
                    setRows(
                      rows.map((item, position) =>
                        position === index
                          ? { ...item, name: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </div>
              <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                <label className="qw-sr-only" htmlFor={`crumb-url-${index}`}>
                  URL {index + 1}
                </label>
                <input
                  id={`crumb-url-${index}`}
                  className="qw-input"
                  value={row.url}
                  placeholder="https://example.com/section"
                  onChange={(event) =>
                    setRows(
                      rows.map((item, position) =>
                        position === index
                          ? { ...item, url: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </div>
              <button
                type="button"
                className="secondary"
                aria-label={`Remove item ${index + 1}`}
                onClick={() =>
                  setRows(rows.filter((_, position) => position !== index))
                }
                disabled={rows.length <= 1}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="secondary"
          style={{ marginTop: 12 }}
          onClick={() => setRows([...rows, { name: "", url: "" }])}
        >
          Add level
        </button>
      </div>
      {rows.every((row) => !row.name.trim()) ? (
        <EmptyState>
          Add the breadcrumb levels to generate the markup.
        </EmptyState>
      ) : (
        <SchemaOutput
          result={result}
          filename="breadcrumb-json-ld"
          onReset={() => setRows([{ name: "Home", url: "" }])}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ValidatorTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ReturnType<
    typeof validateJsonLd
  > | null>(null);

  return (
    <>
      <div className="qw-workspace-panel">
        <h2 className="qw-section-title">Paste JSON-LD to check</h2>
        <p className="qw-section-note">
          This checks whether the block is valid JSON with an @type and a known
          @context. It cannot tell you whether Google will show a rich result —
          that depends on content, policy and the specific type.
        </p>
        <Field
          label="JSON-LD"
          value={input}
          onChange={setInput}
          multiline
          rows={12}
          placeholder={
            '{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "Acme"\n}'
          }
        />
        <div
          className="qw-actions"
          style={{ borderTop: "none", paddingTop: 12 }}
        >
          <button
            type="button"
            className="secondary"
            onClick={() => setResult(validateJsonLd(input))}
          >
            Validate
          </button>
        </div>
      </div>

      {result ? (
        <ResultPanel
          title={result.ok ? "Valid structure" : "Invalid"}
          show
          text={[
            result.ok ? "Valid JSON-LD structure." : "Invalid JSON-LD.",
            `Types: ${result.types.join(", ") || "none"}`,
            "",
            ...result.issues.map(
              (issue) => `[${issue.severity}] ${issue.message}`,
            ),
          ].join("\n")}
          filename="json-ld-check"
        >
          <StatRow>
            <Stat
              label="Syntax"
              value={result.ok ? "Valid" : "Invalid"}
              detail="JSON parse and required keys"
              emphasis
            />
            <Stat
              label="Types found"
              value={String(result.types.length)}
              detail={result.types.join(", ") || "none"}
            />
          </StatRow>
          {result.issues.map((issue, index) => (
            <Notice
              key={index}
              tone={issue.severity === "error" ? "error" : "warning"}
            >
              {issue.message}
            </Notice>
          ))}
          {result.formatted ? (
            <div className="qw-mono">{result.formatted}</div>
          ) : null}
        </ResultPanel>
      ) : (
        <EmptyState>
          Paste a block and press validate. Nothing is sent anywhere.
        </EmptyState>
      )}
    </>
  );
}
