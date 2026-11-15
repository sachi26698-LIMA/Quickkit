"use client";
/**
 * GTIN product lookup.
 *
 * One request, one record, and an explicit state for every way it can fail. The
 * four failures a user can hit — invalid number, no record, rate limit, database
 * or network error — are rendered as four different messages, because "we could
 * not reach the database" and "this product does not exist" are not the same
 * answer and must never be merged into one.
 *
 * The data is community-entered Open Food Facts content under ODbL. Nothing on
 * this page presents it as a manufacturer statement.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AlertTriangle,
  BadgeQuestionMark,
  ClipboardCopy,
  Database,
  Download,
  ExternalLink,
  ImageOff,
  Loader2,
  Search,
  Share2,
  WifiOff,
} from "lucide-react";
import {
  PRODUCT_DATABASE,
  normalizeGtin,
  type LookupResult,
  type ProductRecord,
} from "@/lib/tools/barcode-scanner/product-lookup";
import {
  productToCsv,
  productToJson,
} from "@/lib/tools/barcode-scanner/product-export";
import styles from "@/components/tools/barcode-suite/suite.module.css";

type View =
  | { state: "idle" }
  | { state: "loading"; gtin: string }
  | { state: "local"; gtin: string; message: string }
  | {
      state: "done";
      gtin: string;
      result: LookupResult;
      ms: number;
      cached: boolean;
    }
  | { state: "offline"; gtin: string; message: string; ms: number };

function download(name: string, mime: string, body: string) {
  const blob = new Blob([body], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Hydration-safe read of the query string (see the batch code checker). */
const subscribeToLocation = () => () => {};

function readPresetGtin(): string {
  return new URLSearchParams(window.location.search).get("gtin") ?? "";
}

export default function ProductLookup({
  initialGtin = "",
}: {
  initialGtin?: string;
}) {
  const [gtin, setGtin] = useState(initialGtin);
  const [view, setView] = useState<View>({ state: "idle" });
  const [copied, setCopied] = useState("");

  /**
   * `?gtin=` arrives after hydration, without forcing this pre-rendered page to
   * become dynamic. A deep link from a label, a ticket or another page then
   * performs the lookup instead of merely filling the box.
   */
  const presetGtin = useSyncExternalStore(
    subscribeToLocation,
    readPresetGtin,
    () => "",
  );
  const presetApplied = useRef(false);

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("");
    }
  };

  const runFor = useCallback(async (value: string) => {
    const normalized = normalizeGtin(value);
    if (!normalized) {
      setView({
        state: "local",
        gtin: value.trim(),
        message:
          "That is not a valid GTIN. It must be 8, 12, 13 or 14 digits, and the final digit must be the GS1 check digit for the rest. Nothing was sent to the database.",
      });
      return;
    }

    setView({ state: "loading", gtin: normalized });
    const started = performance.now();
    try {
      const response = await fetch(
        `/api/product-lookup?gtin=${encodeURIComponent(normalized)}`,
        {
          signal: AbortSignal.timeout(12_000),
          headers: { Accept: "application/json" },
        },
      );
      const ms = Math.round(performance.now() - started);
      const body = (await response.json()) as LookupResult;
      setView({
        state: "done",
        gtin: normalized,
        result: body,
        ms,
        cached: response.headers.get("x-quickkit-cache") === "HIT",
      });
    } catch (error) {
      const ms = Math.round(performance.now() - started);
      const timedOut =
        error instanceof DOMException && error.name === "TimeoutError";
      setView({
        state: "offline",
        gtin: normalized,
        ms,
        message: timedOut
          ? "The request to this site's own lookup proxy timed out after 12 seconds. That is a timeout between your browser and this server, not a statement about the product."
          : "The request to this site's own lookup proxy failed before any response arrived — usually an offline connection, a proxy or a content blocker. Nothing was learned about the product.",
      });
    }
  }, []);

  const run = useCallback(() => runFor(gtin), [gtin, runFor]);

  useEffect(() => {
    if (presetApplied.current || !presetGtin) return;
    presetApplied.current = true;
    const id = window.setTimeout(() => {
      setGtin(presetGtin);
      void runFor(presetGtin);
    }, 0);
    return () => window.clearTimeout(id);
  }, [presetGtin, runFor]);

  const product: ProductRecord | null =
    view.state === "done" && view.result.status === "found"
      ? view.result.product
      : null;

  return (
    <div className={styles.workspace}>
      <div className={styles.heading}>
        <h2>Product lookup by GTIN</h2>
        <p>
          Enter the number under the barcode. The lookup is optional and goes
          through this site&rsquo;s proxy to {PRODUCT_DATABASE.name}, a
          community database: the record is what contributors entered, not what
          the manufacturer declared.
        </p>
      </div>

      <section className={styles.card} aria-labelledby="lookup-heading">
        <div className={styles.cardHead}>
          <Search size={16} aria-hidden="true" />
          <h3 id="lookup-heading">Look up a barcode number</h3>
          <p>
            Only the GTIN is sent. No batch code, no camera frame, no history.
          </p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run();
          }}
        >
          <div className={styles.grid}>
            <label className={styles.field} htmlFor="lookup-gtin">
              GTIN (8, 12, 13 or 14 digits)
              <input
                id="lookup-gtin"
                className={styles.input}
                value={gtin}
                onChange={(event) => setGtin(event.target.value)}
                inputMode="numeric"
                autoComplete="off"
                placeholder="3017620422003"
              />
              <small>
                The check digit is validated before anything is sent.{" "}
                {gtin.trim()
                  ? normalizeGtin(gtin)
                    ? "✓ valid"
                    : "✗ not valid"
                  : ""}
              </small>
            </label>
          </div>
          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.button}
              disabled={view.state === "loading"}
            >
              {view.state === "loading" ? (
                <>
                  <Loader2 size={14} aria-hidden="true" /> Looking up…
                </>
              ) : (
                <>
                  <Database size={14} aria-hidden="true" /> Look up
                </>
              )}
            </button>
            <button
              type="button"
              className={styles.buttonGhost}
              onClick={() => {
                setGtin("3017620422003");
                setView({ state: "idle" });
              }}
            >
              Use an example GTIN
            </button>
          </div>
        </form>

        {view.state === "local" && (
          <p className={styles.error} role="alert">
            <strong>Not sent.</strong> {view.message}
          </p>
        )}

        {view.state === "offline" && (
          <p className={styles.error} role="alert">
            <strong>
              <WifiOff size={13} aria-hidden="true" /> No response in {view.ms}{" "}
              ms.
            </strong>{" "}
            {view.message}
          </p>
        )}

        {view.state === "loading" && (
          <p className={styles.hint} role="status">
            Asking {PRODUCT_DATABASE.name} through this site&rsquo;s proxy. The
            request has a 12-second ceiling; a slow answer is reported as slow,
            not as a missing product.
          </p>
        )}
      </section>

      {view.state === "done" && view.result.status !== "found" && (
        <section
          className={styles.card}
          aria-labelledby="lookup-problem-heading"
        >
          <div className={styles.cardHead}>
            <AlertTriangle size={16} aria-hidden="true" />
            <h3 id="lookup-problem-heading">
              {view.result.status === "not-found"
                ? "No record for this GTIN"
                : view.result.status === "rate-limited"
                  ? "Lookup paused by the rate limit"
                  : view.result.status === "invalid"
                    ? "The proxy rejected the number"
                    : "The database could not be read"}
            </h3>
            <p>
              Answer from {PRODUCT_DATABASE.name} in {view.ms} ms
              {view.cached
                ? " (served from the server's short-lived cache)"
                : ""}
              .
            </p>
          </div>
          <p className={styles.error} role="alert">
            {view.result.message}
            {view.result.status === "error" && view.result.upstreamStatus ? (
              <span> Upstream HTTP status: {view.result.upstreamStatus}.</span>
            ) : null}
          </p>
          <p className={styles.hint}>
            {view.result.status === "not-found"
              ? "A missing record means nobody has entered this product yet. It does not mean the barcode is fake: plenty of legitimate products are absent from a volunteer database."
              : view.result.status === "rate-limited"
                ? "The proxy limits each visitor to stay inside the database's published rate limit. Waiting is the fix; retrying immediately makes it worse."
                : "This is a connectivity or availability problem between this server and the database. It says nothing about the product. The report above preserves the exact reason so it can be investigated."}
          </p>
        </section>
      )}

      {product && (
        <>
          <section className={styles.card} aria-labelledby="product-heading">
            <div className={styles.cardHead}>
              <h3 id="product-heading">{product.name}</h3>
              <span className={styles.chip}>GTIN {product.gtin}</span>
              {product.missing.length > 0 && (
                <span className={styles.chip}>
                  {product.missing.length} fields missing
                </span>
              )}
            </div>
            <div
              style={{
                display: "grid",
                gap: 14,
                gridTemplateColumns: "minmax(0, 1fr)",
                alignItems: "start",
              }}
            >
              {product.imagePath ? (
                // eslint-disable-next-line @next/next/no-img-element -- proxied, size-capped, same-origin
                <img
                  src={product.imagePath}
                  alt={`Product photo of ${product.name}`}
                  width={220}
                  height={220}
                  style={{
                    maxWidth: 220,
                    height: "auto",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "#fff",
                  }}
                />
              ) : (
                <p className={styles.hint}>
                  <ImageOff size={13} aria-hidden="true" /> This record has no
                  image.
                </p>
              )}
              <dl className={styles.kv}>
                <dt>Brands</dt>
                <dd>
                  {product.brands.length ? (
                    product.brands.join(", ")
                  ) : (
                    <em>not recorded</em>
                  )}
                </dd>
                <dt>Quantity</dt>
                <dd>{product.quantity ?? <em>not recorded</em>}</dd>
                <dt>Categories</dt>
                <dd>
                  {product.categories.length ? (
                    product.categories.join(", ")
                  ) : (
                    <em>not recorded</em>
                  )}
                </dd>
                <dt>Manufacturer</dt>
                <dd>{product.manufacturer ?? <em>not recorded</em>}</dd>
                <dt>Packaging</dt>
                <dd>{product.packaging ?? <em>not recorded</em>}</dd>
                <dt>Country of origin</dt>
                <dd>{product.origin ?? <em>not recorded</em>}</dd>
                <dt>Description (generic name)</dt>
                <dd>{product.description ?? <em>not recorded</em>}</dd>
                <dt>Last edited</dt>
                <dd>{product.lastModified ?? <em>unknown</em>}</dd>
                <dt>Source</dt>
                <dd>
                  <a
                    href={product.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {product.sourceName}{" "}
                    <ExternalLink size={11} aria-hidden="true" />
                  </a>{" "}
                  ({product.sourceHost})
                </dd>
              </dl>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.buttonGhost}
                onClick={() =>
                  download(
                    `product-${product.gtin}.csv`,
                    "text/csv",
                    productToCsv(product),
                  )
                }
              >
                <Download size={13} aria-hidden="true" /> CSV
              </button>
              <button
                type="button"
                className={styles.buttonGhost}
                onClick={() =>
                  download(
                    `product-${product.gtin}.json`,
                    "application/json",
                    productToJson(product),
                  )
                }
              >
                <Download size={13} aria-hidden="true" /> JSON
              </button>
              <button
                type="button"
                className={styles.buttonGhost}
                onClick={() => copy("json", productToJson(product))}
              >
                <ClipboardCopy size={13} aria-hidden="true" />
                {copied === "json" ? "Copied" : "Copy JSON"}
              </button>
              <button
                type="button"
                className={styles.buttonGhost}
                onClick={() =>
                  void navigator
                    .share?.({
                      title: product.name,
                      text: `${product.name} — GTIN ${product.gtin}`,
                      url: product.sourceUrl,
                    })
                    .catch(() => setCopied(""))
                }
              >
                <Share2 size={13} aria-hidden="true" /> Share
              </button>
            </div>
          </section>

          <section
            className={styles.card}
            aria-labelledby="ingredients-heading"
          >
            <div className={styles.cardHead}>
              <h3 id="ingredients-heading">
                Ingredients, allergens and nutrition
              </h3>
              <p>
                Exactly the fields the record has, with nothing interpolated.
              </p>
            </div>
            <dl className={styles.kv}>
              <dt>Ingredients</dt>
              <dd>
                {product.ingredients ?? (
                  <em>not recorded — the pack is the authority</em>
                )}
              </dd>
              <dt>Allergens</dt>
              <dd>
                {product.allergens.length ? (
                  <ul className={styles.chips}>
                    {product.allergens.map((allergen) => (
                      <li key={allergen} className={styles.chip}>
                        {allergen.replace(/^[a-z]{2}:/, "")}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <em>not recorded</em>
                )}
              </dd>
            </dl>

            {product.nutrition.length ? (
              <div className={styles.scroll} style={{ marginTop: 12 }}>
                <table className={styles.table}>
                  <caption className={styles.srOnly}>
                    Nutrition values as recorded, per 100 g or 100 ml
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Nutrient</th>
                      <th scope="col">As recorded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.nutrition.map((row, index) => (
                      <tr key={`${row.label}-${index}`}>
                        <td>{row.label}</td>
                        <td>{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.hint}>
                No nutrition values are recorded for this product.
              </p>
            )}

            {product.missing.length > 0 && (
              <p className={styles.warning}>
                <BadgeQuestionMark size={13} aria-hidden="true" /> Missing from
                this record: {product.missing.join(", ")}. An empty field is
                shown as empty — it is not filled with a typical value.
              </p>
            )}
          </section>

          <section
            className={styles.card}
            aria-labelledby="attribution-heading"
          >
            <div className={styles.cardHead}>
              <h3 id="attribution-heading">Where this data comes from</h3>
            </div>
            <p className={styles.hint} style={{ marginTop: 0 }}>
              Data: {product.sourceName} ({product.licence}). Image:{" "}
              {product.imageLicence}. The database itself is at{" "}
              <a
                href={product.databaseUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                {product.databaseUrl}
              </a>
              .
            </p>
            <p className={styles.warning}>{product.disclosure}</p>
            <p className={styles.hint}>
              {product.manufacturerVerified
                ? ""
                : "This record is not manufacturer-verified. For ingredients a reaction depends on, read the pack you are holding — recipes and labels change between batches."}
            </p>
          </section>
        </>
      )}
    </div>
  );
}
