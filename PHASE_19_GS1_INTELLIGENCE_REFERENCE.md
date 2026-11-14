# GS1 Intelligence — what the parser implements

Source module: `lib/tools/gs1/engine.ts` (reads through `lib/tools/barcode/gs1.ts`).
Tests: `tests/gs1-intelligence.test.ts` (33 assertions).

## Inputs it accepts

| Input          | Example                                                        | How it is read                                    |
| -------------- | -------------------------------------------------------------- | ------------------------------------------------- |
| HRI string     | `(01)09506000134352(10)LOT-42(17)251231`                       | Parentheses parsed as AI markers; no FNC1 needed. |
| Element string | `0109506000134352\u001d10LOT-42\u001d17251231`                 | GS (0x1D) terminates variable-length fields.      |
| Digital Link   | `https://id.example.com/01/09506000134352/10/LOT-42?17=251231` | Path segments and query pairs both mapped to AIs. |

A raw string that does not begin with a known AI is refused with
`gs1-syntax`: the parser will not invent a table entry for arbitrary digits.

## Application identifiers explained

`EXPLANATIONS` covers AI (00) SSCC, (01) GTIN, (02) contained GTIN, (10) batch,
(11) production date, (13) packaging date, (15) best-before, (17) expiry,
(21) serial, (30) variable count, (37) count of trade items, (400) order number,
(410)–(414) GLN locations, (8006) ITIP, plus the measure AIs (310n–390n). Anything
outside the table is reported by number and described as unlisted rather than guessed.

## Date rules

- GS1 writes dates as `YYMMDD`.
- A day of `00` means the **last day of the month**: `260200` → 2026-02-28,
  `240200` → 2024-02-29 (leap year).
- Invalid calendar days (`260231`) are rejected, not rounded.
- Two-digit years resolve inside the standard's window and the resolved calendar date
  is always shown next to the raw value, so a reader can audit it.

## GTIN handling

- Retail lengths 8/12/13 are padded to 14 digits and re-checked, because the check digit
  must survive padding.
- `toGtin14("5901234123457")` → `"05901234123457"`.
- A check-digit failure is reported with the expected final digit. The number is never
  rewritten.

## Digital Link builder

Canonical form: primary key and identifying attributes in the path, dates in the query,
AIs in ascending order.

```
buildDigitalLink({ gtin: "09506000134352", batch: "LOT-42", expiry: "2025-12-31" },
                 { origin: "https://example.com" })
→ https://example.com/01/09506000134352/10/LOT-42?17=251231
```

`toGs1Date` accepts `YYMMDD` or `YYYY-MM-DD` and refuses an impossible date. The page
renders the result as a QR code on demand (`buildTwoD("qrcode", url)`), so the link can
be tried before it is printed.

## What the parser deliberately does not do

- It does not claim a valid check digit means the number was **issued** by GS1.
- It does not decode a batch number into a date. A batch is free text; only AI (11)/(13)/
  (15)/(17) are dates.
- It does not treat a Digital Link as proof of authenticity.
