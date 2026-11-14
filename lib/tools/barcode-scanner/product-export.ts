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
      schema: "quickkit.product-lookup/1",
      exportedAt: new Date().toISOString(),
      gtin: product.gtin,
      product: {
        name: product.name,
        brands: product.brands,
        quantity: product.quantity,
        categories: product.categories,
        ingredients: product.ingredients,
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
