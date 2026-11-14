/**
 * The phase-19 additions to the product lookup: ingredients, nutrition,
 * missing-field reporting, upstream status codes and the export formats.
 *
 * Every payload here is a fixture that mirrors the documented v3.6 shape. No
 * test claims a live response.
 */
import { describe, expect, it } from "vitest";
import {
  nutritionRows,
  parseProductPayload,
  type ProductRecord,
} from "@/lib/tools/barcode-scanner/product-lookup";
import {
  productToCsv,
  productToJson,
} from "@/lib/tools/barcode-scanner/product-export";

const payload = {
  status: "success",
  code: "3017620422003",
  product: {
    product_name: "Nutella",
    brands: "Ferrero",
    quantity: "400 g",
    categories: "Spreads, Chocolate spreads",
    ingredients_text: "Sugar, palm oil, hazelnuts 13%, milk powder 8.7%",
    allergens: "en:milk,en:nuts",
    nutriments: {
      "energy-kcal_100g": 539,
      "energy-kj_100g": 2255,
      fat_100g: 30.9,
      "saturated-fat_100g": 10.6,
      carbohydrates_100g: 57.5,
      sugars_100g: 56.3,
      proteins_100g: 6.3,
      salt_100g: 0.107,
      // A nutrient we do not display must be ignored, not guessed at.
      "vitamin-c_100g": 0,
    },
    last_modified_t: 1794471481,
    image_front_url:
      "https://images.openfoodfacts.org/images/products/301/762/042/2003/front.jpg",
  },
};

function record(): ProductRecord {
  const result = parseProductPayload("3017620422003", payload);
  if (result.status !== "found") throw new Error("fixture did not parse");
  return result.product;
}

describe("nutrition rows", () => {
  it("keeps only the documented rows that are present, in order", () => {
    const rows = nutritionRows(payload.product.nutriments);
    expect(rows.map((row) => row.label)).toEqual([
      "Energy (per 100 g/ml)",
      "Energy (per 100 g/ml)",
      "Fat (per 100 g/ml)",
      "of which saturates (per 100 g/ml)",
      "Carbohydrate (per 100 g/ml)",
      "of which sugars (per 100 g/ml)",
      "Protein (per 100 g/ml)",
      "Salt (per 100 g/ml)",
    ]);
    // kcal and kJ share a label but not a unit.
    expect(rows[0].value).toBe("539 kcal");
    expect(rows[1].value).toBe("2,255 kJ");
  });

  it("returns nothing for a record with no nutriments", () => {
    expect(nutritionRows(undefined)).toEqual([]);
    expect(nutritionRows({})).toEqual([]);
    expect(nutritionRows("nope")).toEqual([]);
  });
});

describe("parsed record", () => {
  it("carries ingredients, allergens, categories and nutrition", () => {
    const product = record();
    expect(product.ingredients).toContain("palm oil");
    expect(product.allergens).toEqual(["en:milk", "en:nuts"]);
    expect(product.categories).toHaveLength(2);
    expect(product.nutrition.length).toBe(8);
  });

  it("lists the fields the record does not have", () => {
    const product = record();
    // The fixture has a name, brand, quantity, image, category, ingredients and
    // nutrition, so nothing is missing.
    expect(product.missing).toEqual([]);
  });

  it("reports missing fields instead of filling them in", () => {
    const sparse = parseProductPayload("3017620422003", {
      status: "success",
      product: { product_name: "Mystery bar" },
    });
    expect(sparse.status).toBe("found");
    if (sparse.status !== "found") return;
    expect(sparse.product.missing).toContain("brand");
    expect(sparse.product.missing).toContain("image");
    expect(sparse.product.missing).toContain("ingredients");
    expect(sparse.product.missing).toContain("nutrition");
    expect(sparse.product.brands).toEqual([]);
    expect(sparse.product.ingredients).toBeNull();
  });

  it("never marks a community record as manufacturer verified", () => {
    expect(record().manufacturerVerified).toBe(false);
  });
});

describe("exports", () => {
  it("writes a CSV with attribution and no invented rows", () => {
    const csv = productToCsv(record());
    expect(csv.split(/\r?\n/)[0]).toBe("field,value");
    expect(csv).toContain("Open Food Facts");
    expect(csv).toContain("ODbL 1.0");
    expect(csv).toContain("manufacturer verified,false");
    expect(csv).not.toContain("vitamin-c");
  });

  it("writes JSON with a schema version and source block", () => {
    const parsed = JSON.parse(productToJson(record()));
    expect(parsed.schema).toBe("quickkit.product-lookup/1");
    expect(parsed.product.name).toBe("Nutella");
    expect(parsed.product.nutrition).toHaveLength(8);
    expect(parsed.source.dataLicence).toBe("ODbL 1.0");
    expect(parsed.source.imageLicence).toBe("CC-BY-SA");
    expect(parsed.source.manufacturerVerified).toBe(false);
    expect(parsed.source.disclosure).toContain("not manufacturer-verified");
  });

  it("escapes commas and quotes in a CSV value", () => {
    const product = { ...record(), name: 'Bar, "special", 40g' };
    const csv = productToCsv(product);
    expect(csv).toContain('"Bar, ""special"", 40g"');
  });
});
