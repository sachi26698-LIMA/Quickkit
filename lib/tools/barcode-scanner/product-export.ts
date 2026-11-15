/**
 * Export a lookup result without laundering it.
 *
 * Every export carries the attribution (which Open * Facts server answered, the
 * ODbL licence for data and CC-BY-SA for the image), the "not
 * manufacturer-verified" flag, and the list of fields that were missing. A
 * consumer of the CSV can therefore tell a complete record from a partial one,
 * and cannot mistake an export for a manufacturer's datasheet.
 */
import { csvDocument } from "@/lib/tools/csv";
import type { ProductRecord } from "./product-lookup";

export function productExportRows(product: ProductRecord) {
  const rows: [string, string][] = [
    ["gtin", product.gtin],
    ["name", product.name],
    ["brand", product.brands.join(" | ")],
    ["quantity", product.quantity ?? ""],
    ["categories", product.categories.join(" | ")],
    ["manufacturer", product.manufacturer ?? ""],
    ["packaging", product.packaging ?? ""],
    ["country of origin", product.origin ?? ""],
    ["description (generic_name)", product.description ?? ""],
    ["ingredients", product.ingredients ?? ""],
    ["allergens", product.allergens.join(" | ")],
    ...product.nutrition.map(
      (row) => [`nutrition: ${row.label}`, row.value] as [string, string],
    ),
    ["last modified", product.lastModified ?? ""],
    ["missing fields", product.missing.join(", ")],
    ["source", product.sourceName],
    ["source host", product.sourceHost],
    ["source url", product.sourceUrl],
    ["data licence", product.licence],
    ["image licence", product.imageLicence],
    ["manufacturer verified", String(product.manufacturerVerified)],
    ["disclosure", product.disclosure],
  ];
  return rows;
}

/** Two-column CSV: field, value. Attribution travels with the data. */
export function productToCsv(product: ProductRecord) {
  return csvDocument([["field", "value"], ...productExportRows(product)]);
}

/** JSON export with the same attribution and an explicit schema version. */
export function productToJson(product: ProductRecord) {
  return JSON.stringify(
    {
      schema: "quickkit.product-lookup/2",
      exportedAt: new Date().toISOString(),
      gtin: product.gtin,
      product: {
        name: product.name,
        brands: product.brands,
        quantity: product.quantity,
        categories: product.categories,
        ingredients: product.ingredients,
        manufacturer: product.manufacturer,
        packaging: product.packaging,
        origin: product.origin,
        description: product.description,
        allergens: product.allergens,
        nutrition: product.nutrition,
        lastModified: product.lastModified,
        imageUrl: product.imageUrl,
        missing: product.missing,
      },
      source: {
        name: product.sourceName,
        host: product.sourceHost,
        url: product.sourceUrl,
        database: product.databaseUrl,
        dataLicence: product.licence,
        imageLicence: product.imageLicence,
        manufacturerVerified: product.manufacturerVerified,
        disclosure: product.disclosure,
      },
    },
    null,
    2,
  );
}

/**
 * Human-readable summary for "copy details" and for the share sheet.
 *
 * Unknown fields are written as "not recorded" rather than omitted, so a pasted
 * summary cannot look more complete than the record it came from.
 */
export function productToText(product: ProductRecord) {
  const line = (label: string, value: string | null) =>
    `${label}: ${value ?? "not recorded"}`;
  const lines = [
    product.name,
    line("GTIN", product.gtin),
    line("Brand", product.brands.join(", ") || null),
    line("Manufacturer", product.manufacturer),
    line("Quantity", product.quantity),
    line("Category", product.categories.join(", ") || null),
    line("Country of origin", product.origin),
    line("Packaging", product.packaging),
    line("Description (generic name)", product.description),
    line("Ingredients", product.ingredients),
    line("Allergens", product.allergens.join(", ") || null),
    ...product.nutrition.map((row) => `${row.label}: ${row.value}`),
    line("Last data update", product.lastModified),
    `Source: ${product.sourceName} (${product.sourceHost}) — ${product.licence}`,
    `Record: ${product.sourceUrl}`,
    `Not manufacturer-verified. ${product.disclosure}`,
  ];
  return lines.join("\n");
}
