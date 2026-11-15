"use client";
/**
 * The batch-code checker workspace.
 *
 * The UI is built around one rule: a date is only shown next to the thing that
 * produced it, with its own label. Printed, decoded, estimated and PAO dates are
 * four separate cards, and the disclaimer says which one governs.
 */
import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  ClipboardCopy,
  Clock,
  HelpCircle,
  Info,
  Search,
  ShieldQuestion,
} from "lucide-react";
import { brandBySlug, brandCoverage } from "@/lib/tools/batch-code/brands";
import { VERDICT_LABELS, checkBatchCode } from "@/lib/tools/batch-code/check";
import { formatDate, relativeDays } from "@/lib/tools/batch-code/decoders";
import { PAO_GUIDANCE } from "@/lib/tools/batch-code/shelf-life";
import type {
  CheckOutcome,
  CheckResult,
  DateFact,
  PaoMonths,
  ProductCategory,
} from "@/lib/tools/batch-code/types";
import BrandPicker from "./brand-picker";
import styles from "./checker.module.css";

const VERDICT_CLASS = {
  verified: styles.verdictVerified,
  estimated: styles.verdictEstimated,
  undecodable: styles.verdictUndecodable,
} as const;

type FormState = {
  code: string;
  productName: string;
  printedManufacture: string;
  printedExpiry: string;
  purchase: string;
  opened: string;
  pao: PaoMonths | null;
};

const emptyForm: FormState = {
  code: "",
  productName: "",
  printedManufacture: "",
  printedExpiry: "",
  purchase: "",
  opened: "",
  pao: null,
};

/**
 * `?brand=` preset, read without forcing the whole workspace into a
 * client-only Suspense boundary.
 *
 * `useSearchParams()` on a statically rendered page makes Next replace the
 * boundary with its fallback and stream the real form in after hydration. That
 * cost the page a 0.145 CLS and a 1,669 px jump on a phone. Reading the query
 * string through `useSyncExternalStore` is hydration-safe instead: the server
 * and the first client paint both see `""`, then the real value arrives in a
 * second render that does not change the form's height. The form itself is now
 * in the static HTML, so it is present before any JavaScript runs.
 */
const subscribeToLocation = () => () => {};

function readPresetSlug(): string {
  return new URLSearchParams(window.location.search).get("brand") ?? "";
}

export default function BatchChecker() {
  const presetSlug = useSyncExternalStore(
    subscribeToLocation,
    readPresetSlug,
    () => "",
  );
  const preset = presetSlug ? brandBySlug(presetSlug) : undefined;

  // `undefined` means "the visitor has not chosen yet", which is different from
  // choosing to clear the brand (`null`). Without that distinction, clearing a
  // preset would immediately restore it from the query string.
  const [choice, setChoice] = useState<
    | {
        slug: string;
        name: string;
      }
    | null
    | undefined
  >(undefined);

  const brand =
    choice === undefined
      ? preset
        ? { slug: preset.slug, name: preset.name }
        : null
      : choice;
  const setBrand = setChoice;
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [outcome, setOutcome] = useState<CheckOutcome | null>(null);
  const [copied, setCopied] = useState(false);

  const coverage = useMemo(() => brandCoverage(), []);
  const problems = outcome && !outcome.ok ? outcome.problems : [];
  const problemFor = (code: string) =>
    problems.find((entry) => entry.code === code);
  const invalid = (code: string) => Boolean(problemFor(code));

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const run = () => {
    setCopied(false);
    const result = checkBatchCode({
      brandSlug: brand?.slug ?? "",
      code: form.code,
      productName: form.productName,
      dates: {
        printedManufacture: form.printedManufacture,
        printedExpiry: form.printedExpiry,
        purchase: form.purchase,
        opened: form.opened,
        pao: form.pao,
      },
    });
    setOutcome(result);
  };

  return (
    <div className={styles.workspace}>
      <section className={styles.form} aria-labelledby="checker-form-heading">
        <div className={styles.formHeading}>
          <h2 id="checker-form-heading">Check a batch code</h2>
          <span className={styles.formHint}>
            {coverage.total} brand records · {coverage.verified} brand-specific
            decoders · {coverage.none} documented as undecodable
          </span>
        </div>
        <p className={styles.formHint}>
          A lot number alone is usually a serial. The checker reads what it can
          defend — a GS1 element string, a date the manufacturer typed into the
          code, or the printed date you enter — and keeps everything else
          clearly labelled as an estimate or as not decodable.
        </p>

        <BrandPicker
          brandSlug={brand?.slug ?? ""}
          brandName={brand?.name ?? ""}
          category={category}
          onCategoryChange={setCategory}
          onSelect={setBrand}
          invalid={invalid("brand")}
          describedBy={problemFor("brand") ? "problem-brand" : undefined}
        />

        <div className={styles.grid}>
          <label className={styles.field}>
            Batch / lot code
            <input
              className={styles.input}
              type="text"
              value={form.code}
              onChange={(event) => update("code", event.target.value)}
              placeholder="e.g. 28H300 or a GS1 link"
              autoComplete="off"
              spellCheck={false}
              maxLength={200}
              aria-invalid={invalid("code") || undefined}
              aria-describedby={
                problemFor("code") ? "problem-code" : "hint-code"
              }
            />
            <small id="hint-code">
              Exactly as printed, including any spaces or slashes. A GS1 element
              string or GS1 Digital Link URI can be pasted here too. Never
              guessed at or auto-corrected.
            </small>
          </label>

          <label className={styles.field}>
            Product name <span className={styles.formHint}>(optional)</span>
            <input
              className={styles.input}
              type="text"
              value={form.productName}
              onChange={(event) => update("productName", event.target.value)}
              placeholder="e.g. Soft cream 200 ml"
              maxLength={80}
            />
            <small>
              Only used to label your own result; it does not change the decode.
            </small>
          </label>
        </div>

        <div className={styles.grid}>
          <label className={styles.field}>
            Printed manufacture date
            <input
              className={styles.input}
              type="date"
              value={form.printedManufacture}
              onChange={(event) =>
                update("printedManufacture", event.target.value)
              }
              aria-invalid={invalid("printedManufacture") || undefined}
            />
            <small>
              MFG / PROD on the pack. This is a fact and outranks every
              inference.
            </small>
          </label>
          <label className={styles.field}>
            Printed expiry date
            <input
              className={styles.input}
              type="date"
              value={form.printedExpiry}
              onChange={(event) => update("printedExpiry", event.target.value)}
              aria-invalid={invalid("printedExpiry") || undefined}
            />
            <small>EXP / best before. Never overridden by an estimate.</small>
          </label>
          <label className={styles.field}>
            Purchase date
            <input
              className={styles.input}
              type="date"
              value={form.purchase}
              onChange={(event) => update("purchase", event.target.value)}
              aria-invalid={invalid("purchase") || undefined}
            />
            <small>
              Optional context. It is not used as a manufacture date.
            </small>
          </label>
          <label className={styles.field}>
            Opened date
            <input
              className={styles.input}
              type="date"
              value={form.opened}
              onChange={(event) => update("opened", event.target.value)}
              aria-invalid={invalid("opened") || undefined}
            />
            <small>Needed only for the period-after-opening calculation.</small>
          </label>
          <label className={styles.field}>
            PAO — open-jar symbol
            <select
              className={styles.select}
              value={form.pao ?? ""}
              onChange={(event) =>
                update(
                  "pao",
                  event.target.value
                    ? (Number(event.target.value) as PaoMonths)
                    : null,
                )
              }
              aria-invalid={invalid("pao") || undefined}
            >
              <option value="">No PAO printed / not chosen</option>
              {PAO_GUIDANCE.map((entry) => (
                <option key={entry.months} value={entry.months}>
                  {entry.label} — {entry.note}
                </option>
              ))}
            </select>
            <small>
              The number inside the open jar. It is a legal statement, not a
              shelf life.
            </small>
          </label>
        </div>

        {problems.length ? (
          <ul className={styles.problems} role="alert">
            {problems.map((entry) => (
              <li key={entry.code} id={`problem-${entry.code}`}>
                {entry.message}
              </li>
            ))}
          </ul>
        ) : null}

        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={run}>
            <Search size={17} aria-hidden /> CHECK BATCH CODE
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => {
              setForm(emptyForm);
              setOutcome(null);
              setCopied(false);
            }}
          >
            Reset
          </button>
        </div>
        <p className={styles.formHint}>
          Everything runs in this tab. No code, date or product name is sent
          anywhere, and no account is needed.
        </p>
      </section>

      {outcome?.ok ? (
        <ResultPanel
          result={outcome.result}
          copied={copied}
          onCopy={async (text) => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function FactCard({
  title,
  fact,
  empty,
  icon,
}: {
  title: string;
  fact: DateFact | null;
  empty: string;
  icon: React.ReactNode;
}) {
  return (
    <article className={styles.card}>
      <h3>
        {icon} {title}
      </h3>
      {fact ? (
        <>
          <p className={styles.cardDate}>{formatDate(fact.date)}</p>
          <span
            className={`${styles.confidence} ${
              fact.confidence === "verified"
                ? styles.confidenceVerified
                : styles.confidenceEstimated
            }`}
          >
            {fact.confidence === "verified" ? "Verified date" : "Estimate"}
          </span>
          <p className={styles.cardMethod}>{fact.method}</p>
          <p className={styles.cardEvidence}>Evidence: {fact.evidence}</p>
        </>
      ) : (
        <p className={styles.cardEmpty}>{empty}</p>
      )}
    </article>
  );
}

function ResultPanel({
  result,
  copied,
  onCopy,
}: {
  result: CheckResult;
  copied: boolean;
  onCopy: (text: string) => Promise<void>;
}) {
  const { verdict } = result;
  const label = VERDICT_LABELS[verdict.status];
  const Icon =
    verdict.status === "verified"
      ? BadgeCheck
      : verdict.status === "estimated"
        ? Clock
        : ShieldQuestion;

  const summary = [
    `QUICKKIT batch code check — ${label}`,
    `Brand: ${result.brand.name}`,
    `Code: ${result.code}${result.productName ? ` (${result.productName})` : ""}`,
    `Decoder: ${verdict.id} v${verdict.version} — ${verdict.headline}`,
    result.manufacture
      ? `Manufacture: ${result.manufacture.date} (${result.manufacture.confidence})`
      : "Manufacture: not determined",
    result.printedExpiry
      ? `Printed expiry: ${result.printedExpiry.date}`
      : "Printed expiry: not entered",
    result.estimatedExpiry
      ? `Estimated expiry: ${result.estimatedExpiry.date} (guidance, not a manufacturer statement)`
      : "Estimated expiry: none",
    result.paoExpiry
      ? `After opening: ${result.paoExpiry.date}`
      : "After opening: not calculated",
    ...result.decodedDates.map(
      (entry) =>
        `GS1 AI ${entry.ai} (${entry.label}): ${entry.date}${entry.time ? ` ${entry.time}` : ""}`,
    ),
    result.effectiveExpiry
      ? `Governing date: ${result.effectiveExpiry.date}`
      : "Governing date: none",
    `Checked on ${result.checkedOn}`,
    "A printed date always takes precedence. This is not a safety guarantee.",
  ].join("\n");

  return (
    <section className={styles.result} aria-labelledby="checker-result-heading">
      <h2 id="checker-result-heading" className={styles.srOnly}>
        Result
      </h2>
      <div
        className={`${styles.verdict} ${VERDICT_CLASS[verdict.status]}`}
        role="status"
        aria-live="polite"
      >
        <div className={styles.verdictTop}>
          <span className={styles.verdictLabel}>
            <Icon size={15} aria-hidden /> {label}
          </span>
          <span className={styles.formHint}>
            {result.brand.name} ·{" "}
            <span className={styles.codeChip}>{result.code}</span>
            {result.productName ? ` · ${result.productName}` : ""}
          </span>
        </div>
        <h3 className={styles.verdictTitle}>{verdict.headline}</h3>
        <p className={styles.verdictDetail}>{verdict.detail}</p>
        <p className={styles.verdictMeta}>
          <span>
            Decoder: {verdict.id} v{verdict.version}
          </span>
          {verdict.match ? <span>Matched: {verdict.match}</span> : null}
          <span>Evidence: {verdict.evidence}</span>
          <span>Checked: {result.checkedOn}</span>
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.smallButton}
            onClick={() => void onCopy(summary)}
          >
            <ClipboardCopy size={13} aria-hidden />{" "}
            {copied ? "Copied summary" : "Copy summary"}
          </button>
          <Link
            className={styles.smallButton}
            href={`/tools/batch-code-checker/brand/${result.brand.slug}`}
          >
            {result.brand.name} decoder record
          </Link>
        </div>
      </div>

      <div className={styles.cards}>
        <FactCard
          title="Decoded from the code"
          icon={<Clock size={13} aria-hidden />}
          fact={result.manufacture}
          empty={
            verdict.status === "undecodable"
              ? `Nothing decoded. ${result.brand.name} publishes no date format for its lot numbers, so this code is treated as a serial.`
              : "Nothing decoded from the code itself."
          }
        />
        <FactCard
          title="Printed expiry"
          icon={<CalendarClock size={13} aria-hidden />}
          fact={result.printedExpiry}
          empty="No printed expiry entered. If the pack shows EXP or a best-before date, enter it — a printed date always outranks anything below."
        />
        <FactCard
          title="Manufacture + shelf life (estimate)"
          icon={<Info size={13} aria-hidden />}
          fact={result.estimatedExpiry}
          empty={
            result.brand.shelfLife.months === null
              ? "No estimate: this category has no defensible shelf-life guidance, so none is invented."
              : result.manufacture
                ? "No estimate could be calculated from the available date."
                : "No estimate: it needs a manufacture date (printed or decoded) as the starting point."
          }
        />
        <FactCard
          title="Opened + PAO"
          icon={<HelpCircle size={13} aria-hidden />}
          fact={result.paoExpiry}
          empty="Not calculated. Enter the opened date and the number inside the open-jar symbol; the two together define this window."
        />
      </div>

      {result.decodedDates.length ? (
        <div className={styles.column}>
          <h3>Date fields carried by the code</h3>
          <ul className={styles.list}>
            {result.decodedDates.map((entry) => (
              <li key={`${entry.ai}-${entry.date}-${entry.time ?? ""}`}>
                <span className={styles.codeChip}>AI {entry.ai}</span>{" "}
                <strong>{entry.label}</strong> — {formatDate(entry.date)}
                {entry.time ? ` at ${entry.time}` : ""}
              </li>
            ))}
          </ul>
          <p className={styles.formHint}>
            Each field is read with the rule the GS1 General Specifications
            assign to that Application Identifier. A field that is not a real
            calendar date is rejected rather than adjusted.
          </p>
        </div>
      ) : null}

      <div className={styles.column}>
        <h3>What governs</h3>
        {result.effectiveExpiry ? (
          <p className={styles.rangeSummary}>
            <span>
              <strong>{formatDate(result.effectiveExpiry.date)}</strong>{" "}
              <span className={styles.codeChip}>
                {result.effectiveExpiry.source}
              </span>
            </span>
            {result.remainingDays !== null ? (
              <span>{relativeDays(result.remainingDays)}</span>
            ) : null}
            {result.ageMonths !== null ? (
              <span>~{result.ageMonths} months old</span>
            ) : null}
          </p>
        ) : (
          <p className={styles.cardEmpty}>
            No governing date. Nothing was decoded, nothing was estimated, and
            no printed date was entered — so the honest answer is that this
            check produced no date at all.
          </p>
        )}
        <p className={styles.cardEvidence}>
          Printed expiry and the period after opening are separate windows: a
          product should not be used beyond either one, and the earlier of the
          two is the one that matters in practice.
        </p>
      </div>

      {result.candidates.length > 1 ? (
        <div className={styles.column}>
          <h3>Every date-shaped reading in this code</h3>
          <p className={styles.cardMethod}>
            The digits can be read more than one way. All readings are listed
            rather than one being chosen for you.
          </p>
          {result.candidates.map((candidate) => (
            <div
              key={`${candidate.date}-${candidate.match}`}
              className={styles.candidate}
            >
              <strong>{formatDate(candidate.date)}</strong>
              <span>
                from <span className={styles.codeChip}>{candidate.match}</span>{" "}
                read as {candidate.interpretation}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {result.warnings.length ? (
        <div className={styles.column}>
          <h3>Warnings</h3>
          <ul className={`${styles.list} ${styles.warnList}`}>
            {result.warnings.map((warning) => (
              <li key={warning}>
                <AlertTriangle size={13} aria-hidden /> {warning}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Only when the code itself produced nothing. A brand with no published
          lot-code rule can still have its code read as a GS1 element string, and
          that case explains itself in the notes instead of claiming the code
          "cannot be decoded". */}
      {result.verdict.status === "undecodable" ? (
        <div className={styles.column}>
          <h3>Why this code cannot be decoded</h3>
          <ul className={styles.list}>
            <li>
              <strong>Format not supported by any public decoder.</strong>{" "}
              {result.brand.pattern}. {result.brand.dateLogic}
            </li>
            <li>
              <strong>Nothing is guessed.</strong> An opaque serial such as a
              short alphanumeric string has no calendar meaning without the
              brand&apos;s own key, and a confident-looking wrong date is worse
              than no date.
            </li>
            <li>
              <strong>What to do instead.</strong> Read the printed EXP /
              best-before date if there is one; otherwise ask the brand&apos;s
              customer care with the code in hand.
            </li>
            <li>
              <strong>Official support.</strong>{" "}
              {result.brand.officialGuidance?.url ? (
                <a
                  href={result.brand.officialGuidance.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {result.brand.officialGuidance.label}
                </a>
              ) : (
                "No official brand page could be verified for this record, so none is linked."
              )}{" "}
              {result.brand.limitation}
            </li>
            <li>
              <strong>The open-jar symbol (PAO).</strong> A jar with a number
              such as 12M means &ldquo;use within 12 months of opening&rdquo;,
              defined by EU Regulation 1223/2009 Annex VIII. It is a statement
              about the period after opening, not about the batch code and not
              about the printed expiry date.
            </li>
          </ul>
        </div>
      ) : null}

      {result.notes.length ? (
        <div className={styles.column}>
          <h3>Notes</h3>
          <ul className={styles.list}>
            {result.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={styles.disclaimer}>
        <strong>
          Printed dates take precedence. This is not a safety guarantee.
        </strong>
        <p>
          Every date above is labelled with its source and its method. A decoded
          date is only as good as the standard or pattern behind it; an estimate
          is guidance, not a manufacturer statement; and a PAO window starts
          when you opened the pack, which no barcode knows. If the pack looks,
          smells or feels wrong, stop using it regardless of any date here.
        </p>
        <p>
          Storage, contamination and formulation changes are outside this
          tool&apos;s reach, and a lot code is not an authenticity check.
        </p>
      </div>
    </section>
  );
}
