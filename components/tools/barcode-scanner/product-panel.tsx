"use client";
/**
 * The two panels a scan produces: what the symbol actually is, and — when the
 * value carries a GTIN — whatever the product database genuinely holds.
 *
 * Rules this file keeps:
 *  - Every field that the record does not carry is listed as missing, not
 *    silently omitted, so a short card cannot look like a complete record.
 *  - Nothing is invented: no manufacturer, no image, no ingredient list that the
 *    database did not return.
 *  - The attribution and the "not manufacturer-verified" statement travel with
 *    the data, including into the JSON and CSV exports.
 */
import { useCallback, useState } from "react";
import Image from "next/image";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  Loader2,
  RotateCcw,
  Share2,
  TriangleAlert,
} from "lucide-react";
import {
  classifyScan,
  identityLabel,
} from "@/lib/tools/barcode-scanner/identify";
import {
  PRODUCT_DATABASE,
  type LookupResult,
  type ProductRecord,
} from "@/lib/tools/barcode-scanner/product-lookup";
import {
  productToCsv,
  productToJson,
  productToText,
} from "@/lib/tools/barcode-scanner/product-export";
import { downloadText } from "@/lib/tools/download";
import styles from "./scanner.module.css";

/* ------------------------------- identity -------------------------------- */

function checkDigitLine(value: string): {
  tone: "ok" | "bad" | "na";
  text: string;
} {
  const identity = classifyScan(value);
  if (identity.kind === "gtin")
    return identity.checkDigitOk
      ? {
          tone: "ok",
          text: `Valid — the last digit (${identity.checkDigitFound}) matches the ${identity.format} check digit.`,
        }
      : {
          tone: "bad",
          text: `Invalid — the last digit is ${identity.checkDigitFound}; these digits require ${identity.checkDigitExpected ?? "a different digit"}.`,
        };
  if (identity.kind === "gs1")
    return identity.gtin
      ? {
          tone: "ok",
          text: `Valid — the AI (01) GTIN ${identity.gtin} carries a correct check digit.`,
        }
      : {
          tone: "na",
          text: "No validated GTIN in this carrier.",
        };
  if (identity.failedGtin)
    return {
      tone: "bad",
      text: `Invalid — this ${identity.failedGtin.format} ends in ${identity.failedGtin.checkDigitFound}; the preceding digits require ${identity.failedGtin.checkDigitExpected ?? "a different digit"}.`,
    };
  return {
    tone: "na",
    text: "Not applicable — this value has no GTIN check digit.",
  };
}

export function IdentityPanel({
  value,
  symbol,
}: {
  value: string;
  symbol: string;
}) {
  const identity = classifyScan(value);
  const check = checkDigitLine(value);
  return (
    <div className={styles.identity}>
      <dl className={styles.identityGrid}>
        <dt>Decoded number</dt>
        <dd className={styles.mono}>{value}</dd>
        <dt>Symbology</dt>
        <dd>{symbol}</dd>
        <dt>Identifier</dt>
        <dd>
          <strong>{identityLabel(identity)}</strong>
          {identity.kind === "gs1"
            ? ` — ${identity.fields.length} Application Identifier${identity.fields.length === 1 ? "" : "s"}`
            : identity.kind === "gtin"
              ? ` — ${identity.digits} digits, canonical form ${identity.canonical14 ?? "unavailable"}`
              : ""}
        </dd>
        <dt>Check digit</dt>
        <dd className={check.tone === "bad" ? styles.badText : undefined}>
          {check.text}
        </dd>
        <dt>Raw content</dt>
        <dd className={styles.mono}>{value}</dd>
      </dl>

      {identity.kind === "gs1" ? (
        <div className={styles.gs1Block}>
          <p className={styles.meta}>
            GS1{" "}
            {identity.form === "digital-link"
              ? "Digital Link"
              : "element string"}{" "}
            — <span className={styles.mono}>{identity.hri}</span>
          </p>
          <table className={styles.gs1Table}>
            <caption className={styles.srOnly}>
              Application Identifiers carried by this symbol
            </caption>
            <thead>
              <tr>
                <th scope="col">AI</th>
                <th scope="col">Meaning</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody>
              {identity.fields.map((field) => (
                <tr key={`${field.ai}-${field.value}`}>
                  <td className={styles.mono}>({field.ai})</td>
                  <td>{field.title}</td>
                  <td>
                    {field.date ? field.date.iso : field.value}
                    {field.date ? (
                      <span className={styles.meta}> · {field.date.human}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {identity.warnings.map((warning) => (
            <p key={warning} className={styles.meta}>
              <TriangleAlert size={12} aria-hidden /> {warning}
            </p>
          ))}
        </div>
      ) : null}

      {identity.kind === "text" ? (
        <p className={styles.meta}>{identity.reason}</p>
      ) : null}
    </div>
  );
}

/* -------------------------------- product -------------------------------- */

function Field({
  label,
  value,
}: {
  label: string;
  value: string | string[] | null;
}) {
  const text = Array.isArray(value) ? value.join(", ") : value;
  return (
    <>
      <dt>{label}</dt>
      <dd className={text ? undefined : styles.missingValue}>
        {text || "Not in this record"}
      </dd>
    </>
  );
}

function MissingList({ product }: { product: ProductRecord }) {
  if (!product.missing.length)
    return (
      <p className={styles.meta}>
        This record carries every field this tool displays.
      </p>
    );
  return (
    <div className={styles.missingBlock}>
      <strong>Not provided by this record</strong>
      <ul>
        {product.missing.map((field) => (
          <li key={field}>{field}</li>
        ))}
      </ul>
      <p className={styles.meta}>
        These are absent from {product.sourceName}, not hidden by QUICKKIT. No
        value is guessed to fill them.
      </p>
    </div>
  );
}

function ProductActions({ product }: { product: ProductRecord }) {
  const [copied, setCopied] = useState<"details" | null>(null);
  const copyDetails = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(productToText(product));
      setCopied("details");
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }, [product]);

  const share = useCallback(async () => {
    const text = productToText(product);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: product.name, text });
        return;
      } catch {
        /* cancelled: fall through to copying */
      }
    }
    await copyDetails();
  }, [copyDetails, product]);

  return (
    <div className={styles.rowButtons}>
      <button
        type="button"
        className={styles.smallButton}
        onClick={() => void copyDetails()}
      >
        {copied === "details" ? (
          <Check size={14} aria-hidden />
        ) : (
          <Copy size={14} aria-hidden />
        )}
        {copied === "details" ? "Copied" : "Copy product details"}
      </button>
      <button
        type="button"
        className={styles.smallButton}
        onClick={() => void share()}
      >
        <Share2 size={14} aria-hidden />
        Share result
      </button>
      <button
        type="button"
        className={styles.smallButton}
        onClick={() =>
          downloadText(
            productToJson(product),
            `quickkit-${product.gtin}.json`,
            "application/json",
          )
        }
      >
        <FileJson size={14} aria-hidden />
        JSON
      </button>
      <button
        type="button"
        className={styles.smallButton}
        onClick={() =>
          downloadText(
            productToCsv(product),
            `quickkit-${product.gtin}.csv`,
            "text/csv;charset=utf-8",
          )
        }
      >
        <Download size={14} aria-hidden />
        CSV
      </button>
      <a
        className={styles.smallButton}
        href={product.sourceUrl}
        target="_blank"
        rel="noreferrer noopener"
      >
        <ExternalLink size={14} aria-hidden />
        Original record
      </a>
    </div>
  );
}

export function ProductPanel({
  result,
  gtin,
  onScanAnother,
  onRetry,
}: {
  result: LookupResult;
  gtin?: string | null;
  onScanAnother?: () => void;
  onRetry?: () => void;
}) {
  if (result.status === "found") {
    const { product } = result;
    return (
      <div className={styles.productCard}>
        <div className={styles.productHead}>
          {product.imagePath ? (
            <Image
              className={styles.productImage}
              src={product.imagePath}
              alt={`Product image from ${product.sourceName}`}
              width={96}
              height={96}
              unoptimized
            />
          ) : (
            <div className={styles.imagePlaceholder} aria-hidden>
              no image
            </div>
          )}
          <div>
            <h4>{product.name}</h4>
            <p className={styles.meta}>
              {product.brands.length
                ? product.brands.join(", ")
                : "Brand not recorded"}
              {product.quantity ? ` · ${product.quantity}` : ""}
            </p>
            <p className={styles.meta}>
              {product.sourceName} · last edited{" "}
              {product.lastModified ?? "unknown"}
              {product.imagePath ? ` · image ${product.imageLicence}` : ""}
            </p>
          </div>
        </div>

        <dl className={styles.productGrid}>
          <Field label="GTIN" value={product.gtin} />
          <Field label="Brand" value={product.brands} />
          <Field label="Manufacturer" value={product.manufacturer} />
          <Field label="Category" value={product.categories} />
          <Field label="Net quantity" value={product.quantity} />
          <Field label="Packaging" value={product.packaging} />
          <Field label="Country of origin" value={product.origin} />
          <Field
            label="Description (generic name)"
            value={product.description}
          />
        </dl>

        {product.ingredients || product.allergens.length ? (
          <div className={styles.textBlock}>
            <strong>Ingredients</strong>
            <p>{product.ingredients ?? "Not in this record"}</p>
            <strong>Allergens</strong>
            <p>
              {product.allergens.length
                ? product.allergens.join(", ")
                : "Not in this record"}
            </p>
          </div>
        ) : null}

        {product.nutrition.length ? (
          <table className={styles.nutrition}>
            <caption>Nutrition, as recorded</caption>
            <tbody>
              {product.nutrition.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        <MissingList product={product} />
        <ProductActions product={product} />
        <p className={styles.meta}>
          {product.licence} data,{" "}
          {product.imageLicence === "CC-BY-SA" ? "" : ""}
          {product.imageLicence} image licence · Source:{" "}
          <a
            href={product.databaseUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            {product.sourceName}
          </a>
          . {product.disclosure}
        </p>
        {onScanAnother ? (
          <button
            type="button"
            className={styles.smallButton}
            onClick={onScanAnother}
          >
            <RotateCcw size={14} aria-hidden />
            Scan another product
          </button>
        ) : null}
      </div>
    );
  }

  if (result.status === "not-found") {
    return (
      <div className={styles.productCard}>
        <h4>
          <TriangleAlert size={15} aria-hidden /> Barcode successfully decoded,
          but no matching product record was found.
        </h4>
        <p className={styles.meta}>
          {gtin ? `GTIN ${gtin} · ` : ""}
          {result.message}
        </p>
        <p className={styles.meta}>
          A valid barcode does not guarantee that the product exists in a public
          database. Nothing is invented to fill the gap.
        </p>
        <div className={styles.rowButtons}>
          {onRetry ? (
            <button
              type="button"
              className={styles.smallButton}
              onClick={onRetry}
            >
              <RotateCcw size={14} aria-hidden />
              Try again
            </button>
          ) : null}
          {onScanAnother ? (
            <button
              type="button"
              className={styles.smallButton}
              onClick={onScanAnother}
            >
              <RotateCcw size={14} aria-hidden />
              Scan another product
            </button>
          ) : null}
          {gtin ? (
            <a
              className={styles.smallButton}
              href={`${PRODUCT_DATABASE.url}/product/${gtin}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              <ExternalLink size={14} aria-hidden />
              Check the source record
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  const heading =
    result.status === "rate-limited"
      ? "Lookup paused by the rate limit"
      : result.status === "invalid"
        ? "Not a valid GTIN"
        : result.status === "error" && result.reason === "timeout"
          ? "The database did not answer in time"
          : "Lookup unavailable";
  return (
    <div className={styles.productCard}>
      <h4>
        {result.status === "error" || result.status === "rate-limited" ? (
          <TriangleAlert size={15} aria-hidden />
        ) : null}{" "}
        {heading}
      </h4>
      {result.status === "rate-limited" ? (
        <p className={styles.meta}>
          Retry in about {result.retryAfterSeconds}s. Nothing was sent to the
          database.
        </p>
      ) : null}
      <p className={styles.meta}>{result.message}</p>
      <p className={styles.meta}>
        The barcode itself is unaffected — only the optional product lookup
        failed. Source: {PRODUCT_DATABASE.name} ({PRODUCT_DATABASE.licence}).
      </p>
      <div className={styles.rowButtons}>
        {onRetry ? (
          <button
            type="button"
            className={styles.smallButton}
            onClick={onRetry}
          >
            {result.status === "error" ? (
              <Loader2 size={14} aria-hidden />
            ) : (
              <RotateCcw size={14} aria-hidden />
            )}
            Try again
          </button>
        ) : null}
        {onScanAnother ? (
          <button
            type="button"
            className={styles.smallButton}
            onClick={onScanAnother}
          >
            <RotateCcw size={14} aria-hidden />
            Scan another product
          </button>
        ) : null}
      </div>
    </div>
  );
}
