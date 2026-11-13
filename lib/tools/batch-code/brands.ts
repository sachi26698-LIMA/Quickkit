/**
 * Brand records.
 *
 * Every record is deliberately conservative. `decoderId: "none"` is not a
 * placeholder to fill in with a guess later: it means no manufacturer document
 * (or other citable source) describes how that brand's lot number encodes a
 * date, so the checker refuses to produce one. The record still carries what is
 * genuinely known — parent group, categories, whether a public brand page
 * exists, and the limitation the visitor needs to read.
 *
 * `lastVerified: null` everywhere is the honest value: these records have not
 * been reviewed against a manufacturer document, because none was reachable.
 */
import type {
  BrandRecord,
  ProductCategory,
  ShelfLife,
} from "@/lib/tools/batch-code/types";
import { CATEGORY_SHELF_LIFE } from "@/lib/tools/batch-code/shelf-life";

type Seed = {
  slug: string;
  name: string;
  group: string;
  categories: ProductCategory[];
  aliases?: string[];
  guidance?: string | null;
  limitation?: string;
  shelfLifeMonths?: number | null;
  shelfLifeNote?: string;
};

const NO_SOURCE = {
  label: "No public manufacturer batch-code documentation identified",
  url: null,
  kind: "none" as const,
};

const GUIDANCE_FALLBACK =
  "No public brand guidance was found for lot numbers. Ask the brand's customer care with the code, or rely on the date printed on the pack.";

function shelfLifeFor(seed: Seed): ShelfLife {
  const base = CATEGORY_SHELF_LIFE[seed.categories[0]];
  if (seed.shelfLifeMonths === undefined) return base;
  if (seed.shelfLifeMonths === null)
    return {
      months: null,
      note:
        seed.shelfLifeNote ?? "No defensible shelf life for this product type.",
      source: "No applicable guidance",
      confidence: "none",
    };
  return {
    months: seed.shelfLifeMonths,
    note: seed.shelfLifeNote ?? base.note,
    source: base.source,
    confidence: "guidance",
  };
}

function record(seed: Seed): BrandRecord {
  return {
    slug: seed.slug,
    name: seed.name,
    aliases: seed.aliases ?? [],
    parentGroup: seed.group,
    categories: seed.categories,
    decoderId: "none",
    decoderVersion: "0",
    decoderStatus: "none",
    pattern: "Internal lot/batch number — field structure not published",
    dateLogic:
      "No published date logic. The checker will not infer one; enter the date printed on the pack instead.",
    source: NO_SOURCE,
    limitation: seed.limitation ?? GUIDANCE_FALLBACK,
    shelfLife: shelfLifeFor(seed),
    officialGuidance: seed.guidance
      ? {
          label: `${seed.name} official site`,
          url: seed.guidance,
          kind: "brand-site",
        }
      : null,
    lastVerified: null,
  };
}

const SEEDS: Seed[] = [
  // L'Oréal Groupe
  {
    slug: "loreal-paris",
    name: "L'Oréal Paris",
    group: "L'Oréal Groupe",
    categories: ["skincare", "haircare", "makeup"],
    aliases: ["loreal", "l'oreal", "loreal paris"],
    guidance: "https://www.lorealparisusa.com",
  },
  {
    slug: "garnier",
    name: "Garnier",
    group: "L'Oréal Groupe",
    categories: ["haircare", "skincare"],
    aliases: ["garnier fructis"],
    guidance: "https://www.garnier.com",
  },
  {
    slug: "maybelline",
    name: "Maybelline New York",
    group: "L'Oréal Groupe",
    categories: ["makeup"],
    aliases: ["maybelline"],
    guidance: "https://www.maybelline.com",
  },
  {
    slug: "lancome",
    name: "Lancôme",
    group: "L'Oréal Groupe",
    categories: ["skincare", "makeup", "fragrance"],
    aliases: ["lancome"],
    guidance: "https://www.lancome.com",
  },
  {
    slug: "cerave",
    name: "CeraVe",
    group: "L'Oréal Groupe",
    categories: ["skincare"],
    aliases: ["cera ve"],
    guidance: "https://www.cerave.com",
  },
  {
    slug: "la-roche-posay",
    name: "La Roche-Posay",
    group: "L'Oréal Groupe",
    categories: ["skincare", "sun-care"],
    aliases: ["laroche posay", "lrp"],
    guidance: "https://www.laroche-posay.us",
  },
  {
    slug: "vichy",
    name: "Vichy",
    group: "L'Oréal Groupe",
    categories: ["skincare", "sun-care"],
    guidance: "https://www.vichyusa.com",
  },
  {
    slug: "kiehls",
    name: "Kiehl's",
    group: "L'Oréal Groupe",
    categories: ["skincare"],
    aliases: ["kiehls since 1851"],
    guidance: "https://www.kiehls.com",
  },
  {
    slug: "nyx",
    name: "NYX Professional Makeup",
    group: "L'Oréal Groupe",
    categories: ["makeup"],
    aliases: ["nyx"],
    guidance: "https://www.nyxcosmetics.com",
  },
  {
    slug: "ysl-beauty",
    name: "Yves Saint Laurent Beauty",
    group: "L'Oréal Groupe",
    categories: ["makeup", "fragrance"],
    aliases: ["ysl", "yves saint laurent"],
    guidance: "https://www.yslbeautyus.com",
  },
  {
    slug: "armani-beauty",
    name: "Giorgio Armani Beauty",
    group: "L'Oréal Groupe",
    categories: ["makeup", "fragrance"],
    aliases: ["armani"],
    guidance: "https://www.armanibeauty.com",
  },
  {
    slug: "mugler",
    name: "Mugler",
    group: "L'Oréal Groupe",
    categories: ["fragrance"],
    aliases: ["thierry mugler"],
    guidance: "https://www.mugler.com",
  },

  // Beiersdorf / Kenvue
  {
    slug: "nivea",
    name: "Nivea",
    group: "Beiersdorf",
    categories: ["skincare", "bodycare"],
    aliases: ["nivea men"],
    guidance: "https://www.nivea.com",
  },
  {
    slug: "eucerin",
    name: "Eucerin",
    group: "Beiersdorf",
    categories: ["skincare"],
    guidance: "https://www.eucerinus.com",
  },
  {
    slug: "neutrogena",
    name: "Neutrogena",
    group: "Kenvue",
    categories: ["skincare"],
    guidance: "https://www.neutrogena.com",
  },
  {
    slug: "aveeno",
    name: "Aveeno",
    group: "Kenvue",
    categories: ["skincare", "bodycare"],
    guidance: "https://www.aveeno.com",
  },

  // The Estée Lauder Companies
  {
    slug: "estee-lauder",
    name: "Estée Lauder",
    group: "The Estée Lauder Companies",
    categories: ["skincare", "makeup", "fragrance"],
    aliases: ["estee lauder"],
    guidance: "https://www.esteelauder.com",
  },
  {
    slug: "clinique",
    name: "Clinique",
    group: "The Estée Lauder Companies",
    categories: ["skincare", "makeup"],
    guidance: "https://www.clinique.com",
  },
  {
    slug: "mac",
    name: "MAC Cosmetics",
    group: "The Estée Lauder Companies",
    categories: ["makeup"],
    aliases: ["mac", "m.a.c"],
    guidance: "https://www.maccosmetics.com",
  },
  {
    slug: "the-ordinary",
    name: "The Ordinary",
    group: "The Estée Lauder Companies (Deciem)",
    categories: ["skincare"],
    aliases: ["deciem", "ordinary"],
    guidance: "https://theordinary.com",
  },
  {
    slug: "origins",
    name: "Origins",
    group: "The Estée Lauder Companies",
    categories: ["skincare"],
    guidance: "https://www.origins.com",
  },
  {
    slug: "bobbi-brown",
    name: "Bobbi Brown",
    group: "The Estée Lauder Companies",
    categories: ["makeup"],
    guidance: "https://www.bobbibrowncosmetics.com",
  },
  {
    slug: "la-mer",
    name: "La Mer",
    group: "The Estée Lauder Companies",
    categories: ["skincare"],
    guidance: "https://www.cremedelamer.com",
  },

  // Shiseido
  {
    slug: "shiseido",
    name: "Shiseido",
    group: "Shiseido Group",
    categories: ["skincare", "makeup", "sun-care"],
    guidance: "https://www.shiseido.com",
  },
  {
    slug: "nars",
    name: "NARS",
    group: "Shiseido Group",
    categories: ["makeup"],
    aliases: ["nars cosmetics"],
    guidance: "https://www.narscosmetics.com",
  },
  {
    slug: "cle-de-peau",
    name: "Clé de Peau Beauté",
    group: "Shiseido Group",
    categories: ["skincare"],
    aliases: ["cle de peau"],
    guidance: null,
  },

  // Unilever / P&G
  {
    slug: "dove",
    name: "Dove",
    group: "Unilever",
    categories: ["bodycare", "personal-care"],
    aliases: ["dove men+care"],
    guidance: "https://www.dove.com",
  },
  {
    slug: "vaseline",
    name: "Vaseline",
    group: "Unilever",
    categories: ["bodycare"],
    guidance: "https://www.vaseline.com",
  },
  {
    slug: "lakme",
    name: "Lakmé",
    group: "Unilever",
    categories: ["makeup", "skincare"],
    aliases: ["lakme"],
    guidance: "https://www.lakmeindia.com",
  },
  {
    slug: "ponds",
    name: "Pond's",
    group: "Unilever",
    categories: ["skincare"],
    aliases: ["ponds"],
    guidance: "https://www.ponds.com",
  },
  {
    slug: "tresemme",
    name: "TRESemmé",
    group: "Unilever",
    categories: ["haircare"],
    aliases: ["tresemme"],
    guidance: "https://www.tresemme.com",
  },
  {
    slug: "olay",
    name: "Olay",
    group: "Procter & Gamble",
    categories: ["skincare"],
    guidance: "https://www.olay.com",
  },
  {
    slug: "pantene",
    name: "Pantene",
    group: "Procter & Gamble",
    categories: ["haircare"],
    guidance: "https://www.pantene.com",
  },
  {
    slug: "head-shoulders",
    name: "Head & Shoulders",
    group: "Procter & Gamble",
    categories: ["haircare"],
    aliases: ["h&s"],
    guidance: "https://www.headandshoulders.com",
  },

  // Indian + indie
  {
    slug: "himalaya",
    name: "Himalaya Wellness",
    group: "Himalaya Wellness",
    categories: ["skincare", "haircare", "personal-care"],
    aliases: ["himalaya herbals"],
    guidance: "https://himalayawellness.in",
  },
  {
    slug: "biotique",
    name: "Biotique",
    group: "Bio Veda Action Research",
    categories: ["skincare", "haircare"],
    guidance: "https://www.biotique.com",
  },
  {
    slug: "mamaearth",
    name: "Mamaearth",
    group: "Honasa Consumer",
    categories: ["skincare", "haircare", "bodycare"],
    aliases: ["mama earth"],
    guidance: "https://mamaearth.in",
  },
  {
    slug: "aqualogica",
    name: "Aqualogica",
    group: "Honasa Consumer",
    categories: ["skincare", "sun-care"],
    guidance: "https://www.aqualogica.in",
  },
  {
    slug: "derma-co",
    name: "The Derma Co",
    group: "Honasa Consumer",
    categories: ["skincare"],
    aliases: ["dermaco", "the derma co"],
    guidance: "https://thedermaco.com",
  },
  {
    slug: "minimalist",
    name: "Minimalist",
    group: "Uprising Science",
    categories: ["skincare"],
    aliases: ["beminimalist"],
    guidance: "https://beminimalist.co",
  },
  {
    slug: "plum",
    name: "Plum",
    group: "Pureplay Skin Sciences",
    categories: ["skincare", "bodycare"],
    aliases: ["plum goodness"],
    guidance: "https://plumgoodness.com",
  },
  {
    slug: "nykaa",
    name: "Nykaa Cosmetics",
    group: "FSN E-Commerce",
    categories: ["makeup", "skincare"],
    aliases: ["nykaa"],
    guidance: "https://www.nykaa.com",
  },
  {
    slug: "forest-essentials",
    name: "Forest Essentials",
    group: "Mountain Valley Springs",
    categories: ["skincare", "haircare"],
    guidance: "https://www.forestessentialsindia.com",
  },
  {
    slug: "wow-skin-science",
    name: "WOW Skin Science",
    group: "Body Cupid",
    categories: ["skincare", "haircare"],
    aliases: ["wow"],
    guidance: "https://www.wowskinscience.com",
  },
  {
    slug: "dot-and-key",
    name: "Dot & Key",
    group: "Dot & Key Wellness",
    categories: ["skincare"],
    aliases: ["dot and key"],
    guidance: "https://www.dotandkey.com",
  },
  {
    slug: "dr-sheths",
    name: "Dr. Sheth's",
    group: "Dr. Sheth's",
    categories: ["skincare"],
    aliases: ["drsheths", "dr sheth"],
    guidance: "https://drsheths.com",
  },

  // Dermo-cosmetics
  {
    slug: "cetaphil",
    name: "Cetaphil",
    group: "Galderma",
    categories: ["skincare"],
    guidance: "https://www.cetaphil.com",
  },
  {
    slug: "bioderma",
    name: "Bioderma",
    group: "NAOS",
    categories: ["skincare", "sun-care"],
    guidance: "https://www.bioderma.com",
  },
  {
    slug: "avene",
    name: "Avène",
    group: "Pierre Fabre",
    categories: ["skincare", "sun-care"],
    aliases: ["avene"],
    guidance: null,
  },

  // Fragrance
  {
    slug: "chanel",
    name: "Chanel",
    group: "Chanel",
    categories: ["fragrance", "makeup"],
    guidance: "https://www.chanel.com",
  },
  {
    slug: "dior",
    name: "Dior",
    group: "LVMH",
    categories: ["fragrance", "makeup", "skincare"],
    aliases: ["christian dior"],
    guidance: "https://www.dior.com",
  },
  {
    slug: "guerlain",
    name: "Guerlain",
    group: "LVMH",
    categories: ["fragrance", "skincare"],
    guidance: "https://www.guerlain.com",
  },
  {
    slug: "versace",
    name: "Versace",
    group: "Euroitalia",
    categories: ["fragrance"],
    guidance: "https://www.versace.com",
  },
  {
    slug: "hugo-boss",
    name: "Hugo Boss",
    group: "Coty",
    categories: ["fragrance"],
    aliases: ["boss"],
    guidance: "https://www.hugoboss.com",
  },
  {
    slug: "calvin-klein",
    name: "Calvin Klein",
    group: "Coty",
    categories: ["fragrance"],
    aliases: ["ck"],
    guidance: "https://www.calvinklein.com",
  },
  {
    slug: "paco-rabanne",
    name: "Paco Rabanne",
    group: "Puig",
    categories: ["fragrance"],
    guidance: "https://www.pacorabanne.com",
  },
  {
    slug: "carolina-herrera",
    name: "Carolina Herrera",
    group: "Puig",
    categories: ["fragrance"],
    aliases: ["ch"],
    guidance: "https://www.carolinaherrera.com",
  },
  {
    slug: "jean-paul-gaultier",
    name: "Jean Paul Gaultier",
    group: "Puig",
    categories: ["fragrance"],
    aliases: ["jpg"],
    guidance: "https://www.jeanpaulgaultier.com",
  },
  {
    slug: "bvlgari",
    name: "Bvlgari",
    group: "LVMH",
    categories: ["fragrance"],
    aliases: ["bulgari"],
    guidance: "https://www.bulgari.com",
  },
];

export const BRANDS: BrandRecord[] = SEEDS.map(record).sort((a, b) =>
  a.name.localeCompare(b.name, "en"),
);

export const BRAND_BY_SLUG = new Map(
  BRANDS.map((brand) => [brand.slug, brand]),
);

export function brandBySlug(slug: string) {
  return BRAND_BY_SLUG.get(slug);
}

/** Coverage, computed from the records rather than promised in copy. */
export function brandCoverage() {
  const total = BRANDS.length;
  const verified = BRANDS.filter(
    (brand) => brand.decoderStatus === "standards",
  ).length;
  const pattern = BRANDS.filter(
    (brand) => brand.decoderStatus === "pattern",
  ).length;
  const none = BRANDS.filter((brand) => brand.decoderStatus === "none").length;
  const withGuidance = BRANDS.filter((brand) => brand.officialGuidance).length;
  const categories = new Set(BRANDS.flatMap((brand) => brand.categories));
  return {
    total,
    verified,
    pattern,
    none,
    withGuidance,
    categories: categories.size,
  };
}
