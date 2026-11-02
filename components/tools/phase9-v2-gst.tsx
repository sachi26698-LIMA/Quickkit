"use client";
import { useState } from "react";
import { gstInvoice, csvCell } from "@/lib/tools/phase9-v2-advanced";
import { downloadText } from "@/lib/tools/download";
type Item = {
  name: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  rate: string;
};
const fresh = (): Item => ({
  name: "",
  quantity: "1",
  unitPrice: "",
  discount: "0",
  rate: "18",
});
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
export default function GSTInvoice() {
  const [items, setItems] = useState<Item[]>([fresh()]);
  const [inclusive, setInclusive] = useState(false);
  const [supply, setSupply] = useState("intra");
  const [notice, setNotice] = useState("");
  let result: ReturnType<typeof gstInvoice> | undefined,
    error = "";
  try {
    if (
      items.every(
        (i) =>
          i.quantity !== "" &&
          i.unitPrice !== "" &&
          i.discount !== "" &&
          i.rate !== "",
      )
    )
      result = gstInvoice(
        items.map((i) => ({
          name: i.name,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          discount: Number(i.discount),
          rate: Number(i.rate),
        })),
        inclusive,
      );
  } catch (e) {
    error = e instanceof Error ? e.message : "Invalid item.";
  }
  function update(index: number, key: keyof Item, value: string) {
    setItems((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    );
  }
  const summary = result
    ? `Taxable ${money(result.taxable)}; GST ${money(result.tax)}; ${supply === "intra" ? `CGST ${money(result.tax / 2)} and SGST ${money(result.tax / 2)}` : `IGST ${money(result.tax)}`}; total ${money(result.total)}.`
    : "";
  function exportCSV() {
    if (!result) return;
    const rows: (string | number)[][] = [
      [
        "Item",
        "Quantity",
        "Unit price",
        "Discount %",
        "GST %",
        "Taxable",
        "GST",
        "CGST",
        "SGST",
        "IGST",
        "Total",
      ],
      ...result.lines.map((r, i) => [
        r.name || `Item ${i + 1}`,
        r.quantity,
        r.unitPrice,
        r.discount,
        r.rate,
        r.taxable.toFixed(2),
        r.tax.toFixed(2),
        (supply === "intra" ? r.tax / 2 : 0).toFixed(2),
        (supply === "intra" ? r.tax / 2 : 0).toFixed(2),
        (supply === "inter" ? r.tax : 0).toFixed(2),
        r.total.toFixed(2),
      ]),
      [
        "TOTAL",
        "",
        "",
        "",
        "",
        result.taxable.toFixed(2),
        result.tax.toFixed(2),
        (supply === "intra" ? result.tax / 2 : 0).toFixed(2),
        (supply === "intra" ? result.tax / 2 : 0).toFixed(2),
        (supply === "inter" ? result.tax : 0).toFixed(2),
        result.total.toFixed(2),
      ],
    ];
    downloadText(
      rows.map((row) => row.map(csvCell).join(",")).join("\r\n"),
      "gst-invoice-estimate.csv",
      "text/csv;charset=utf-8",
    );
  }
  return (
    <section
      className="workspace advanced-workspace"
      aria-labelledby="invoice-heading"
    >
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">ADVANCED WORKFLOW</span>
          <h2 id="invoice-heading">Multi-item GST estimate</h2>
          <p>Build an item-wise estimate with a discount before tax.</p>
        </div>
        <span className="local-badge">Local processing</span>
      </div>
      <div className="advanced-options">
        <label>
          Price basis
          <select
            value={inclusive ? "inclusive" : "exclusive"}
            onChange={(e) => setInclusive(e.target.value === "inclusive")}
          >
            <option value="exclusive">GST-exclusive unit prices</option>
            <option value="inclusive">GST-inclusive unit prices</option>
          </select>
        </label>
        <label>
          Supply type
          <select value={supply} onChange={(e) => setSupply(e.target.value)}>
            <option value="intra">Intra-state (CGST + SGST)</option>
            <option value="inter">Inter-state (IGST)</option>
          </select>
        </label>
      </div>
      {items.map((item, i) => (
        <fieldset key={i} className="advanced-item">
          <legend>Item {i + 1}</legend>
          <div className="advanced-options">
            <label>
              Item name (optional)
              <input
                type="text"
                value={item.name}
                maxLength={100}
                onChange={(e) => update(i, "name", e.target.value)}
              />
            </label>
            <label>
              Quantity
              <input
                type="number"
                min="0"
                step="any"
                value={item.quantity}
                onChange={(e) => update(i, "quantity", e.target.value)}
              />
            </label>
            <label>
              Unit price (₹)
              <input
                type="number"
                min="0"
                step="any"
                value={item.unitPrice}
                onChange={(e) => update(i, "unitPrice", e.target.value)}
              />
            </label>
            <label>
              Discount before GST (%)
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                value={item.discount}
                onChange={(e) => update(i, "discount", e.target.value)}
              />
            </label>
            <label>
              Common GST rate
              <select
                value={
                  ["0", "5", "12", "18", "28"].includes(item.rate)
                    ? item.rate
                    : "custom"
                }
                onChange={(e) => {
                  if (e.target.value !== "custom")
                    update(i, "rate", e.target.value);
                  else update(i, "rate", "");
                }}
              >
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label>
              GST rate (%)
              <input
                type="number"
                min="0"
                step="any"
                value={item.rate}
                onChange={(e) => update(i, "rate", e.target.value)}
              />
            </label>
          </div>
          <button
            className="secondary"
            type="button"
            disabled={items.length === 1}
            onClick={() => setItems((a) => a.filter((_, idx) => idx !== i))}
          >
            Remove item {i + 1}
          </button>
        </fieldset>
      ))}
      <div className="calculator-actions">
        <button
          className="secondary"
          type="button"
          disabled={items.length >= 100}
          onClick={() => setItems((a) => [...a, fresh()])}
        >
          Add item
        </button>
        <button
          className="secondary"
          type="button"
          onClick={() => {
            setItems([fresh()]);
            setInclusive(false);
            setSupply("intra");
            setNotice("");
          }}
        >
          Reset invoice
        </button>
      </div>
      <div className="calculator-result advanced-result" aria-live="polite">
        <h3>Invoice breakdown</h3>
        {error ? (
          <p className="calculator-error">{error}</p>
        ) : !result ? (
          <p>
            Enter the quantity, unit price, discount and GST rate for each item.
          </p>
        ) : (
          <>
            <p>
              Gross: {money(result.gross)} · Discount: {money(result.discount)}
              <br />
              Taxable value: {money(result.taxable)} · Total GST:{" "}
              {money(result.tax)}
              <br />
              {supply === "intra"
                ? `CGST ${money(result.tax / 2)} + SGST ${money(result.tax / 2)}`
                : `IGST ${money(result.tax)}`}
              <br />
              <strong>Invoice total: {money(result.total)}</strong>
            </p>
            <div
              className="loan-table"
              tabIndex={0}
              role="region"
              aria-label="Item-wise GST summary"
            >
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Taxable</th>
                    <th>GST</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {result.lines.map((line, i) => (
                    <tr key={i}>
                      <td>{line.name || `Item ${i + 1}`}</td>
                      <td>{money(line.taxable)}</td>
                      <td>{money(line.tax)}</td>
                      <td>{money(line.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Step 1: quantity × unit price, less discount. Step 2:{" "}
              {inclusive
                ? "divide by (1 + GST rate / 100) to extract taxable value"
                : "use the discounted amount as taxable value"}
              . Step 3: taxable value × rate / 100. Totals are summed before
              display rounding.
            </p>
            <div className="calculator-actions">
              <button
                className="secondary"
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(summary);
                    setNotice("Summary copied.");
                  } catch {
                    setNotice("Copy failed; select the summary manually.");
                  }
                }}
              >
                Copy invoice summary
              </button>
              <button className="secondary" type="button" onClick={exportCSV}>
                Download invoice CSV
              </button>
            </div>
          </>
        )}
        <p role="status">{notice}</p>
      </div>
      <p>
        GST calculation assistance only, not official tax or filing advice.
        Confirm rates, jurisdiction and invoice rounding with a tax
        professional.
      </p>
    </section>
  );
}
