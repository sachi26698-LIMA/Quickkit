/**
 * Search helpers shared by the public font API and the browser UI.
 *
 * Hindi queries are translated to the English editorial tags the catalogue
 * actually stores, so "पोस्टर" finds the poster faces without maintaining a
 * second index.
 */

export const HINDI_QUERY_ALIASES: Record<string, string> = {
  हैंडराइटिंग: "Handwriting",
  हस्तलेखन: "Handwriting",
  सुलेख: "Calligraphy",
  कैलिग्राफी: "Calligraphy",
  पोस्टर: "Poster",
  अखबार: "Newspaper",
  समाचार: "Newspaper",
  किताब: "Book",
  पुस्तक: "Book",
  पढ़ने: "Reading",
  मॉडर्न: "Modern",
  आधुनिक: "Modern",
  पारंपरिक: "Traditional",
  पारम्परिक: "Traditional",
  मोटा: "Bold",
  बोल्ड: "Bold",
  पतला: "Light",
  हल्का: "Light",
  गोल: "Rounded",
  डिस्प्ले: "Display",
  प्रदर्शन: "Display",
  सेरिफ: "Serif",
  सैंस: "Sans Serif",
  वेरिएबल: "Variable",
  वैरिएबल: "Variable",
  एडिटोरियल: "Editorial",
  संपादकीय: "Editorial",
  बिज़नेस: "Business",
  व्यवसाय: "Business",
  सोशल: "Social Media",
  शादी: "Artistic",
  कला: "Artistic",
  देवनागरी: "Devanagari",
};

export function normalizeQuery(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function expandQuery(value: string): string[] {
  const normalized = normalizeQuery(value);
  if (!normalized) return [];
  const terms = new Set<string>();
  for (const token of normalized.split(" ").filter(Boolean)) {
    // Replace a Hindi keyword with the English tag it means; leave any other
    // term as typed so family-name searches still work in both scripts.
    const direct = HINDI_QUERY_ALIASES[token];
    if (direct) {
      terms.add(direct.toLowerCase());
      continue;
    }
    const phrase = Object.entries(HINDI_QUERY_ALIASES).find(([hindi]) =>
      token.includes(hindi),
    );
    if (phrase) {
      terms.add(phrase[1].toLowerCase());
      continue;
    }
    terms.add(token);
  }
  return [...terms];
}

export function matchesQuery(
  haystack: {
    family: string;
    tags: string[];
    category: string;
    description: string;
    source: string;
  },
  value: string,
): boolean {
  const terms = expandQuery(value);
  if (!terms.length) return true;
  const text = [
    haystack.family,
    haystack.category,
    haystack.description,
    haystack.source,
    ...haystack.tags,
  ]
    .join(" ")
    .toLowerCase();
  return terms.every((term) => text.includes(term));
}
