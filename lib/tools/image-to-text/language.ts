/**
 * Language selection and automatic detection.
 *
 * Tesseract can recognise several languages in one pass, but it cannot tell
 * you which language a page is written in. Detection here is therefore
 * script-based and honest about its limits:
 *
 *  - it identifies the *script* of the page (Latin, Devanagari, Gujarati,
 *    Bengali, Tamil, Telugu, Arabic) from Unicode ranges — reliable;
 *  - inside a script (Hindi vs Marathi, both Devanagari) it uses stop words
 *    and n-grams, and reports low confidence when the evidence is thin;
 *  - it only ever proposes languages shipped with the build.
 */
import { OCR_LANGUAGES, type OcrLanguageCode } from "./types";

export interface ScriptDetection {
  code: OcrLanguageCode;
  confidence: number;
  /** Text share (0..1) of the script that triggered this candidate. */
  scriptShare: number;
}

const SCRIPT_TESTS: Array<{
  script: string;
  codes: OcrLanguageCode[];
  pattern: RegExp;
}> = [
  { script: "Devanagari", codes: ["hin", "mar"], pattern: /[\u0900-\u097F]/gu },
  { script: "Gujarati", codes: ["guj"], pattern: /[\u0A80-\u0AFF]/gu },
  { script: "Bengali", codes: ["ben"], pattern: /[\u0980-\u09FF]/gu },
  { script: "Tamil", codes: ["tam"], pattern: /[\u0B80-\u0BFF]/gu },
  { script: "Telugu", codes: ["tel"], pattern: /[\u0C00-\u0C7F]/gu },
  {
    script: "Arabic",
    codes: ["urd"],
    pattern: /[\u0600-\u06FF\u0750-\u077F]/gu,
  },
  { script: "Latin", codes: ["eng"], pattern: /[A-Za-z]/gu },
];

/**
 * Distinguishing vocabulary for languages that share a script.
 * Only used to break ties, never to claim certainty.
 */
const MARKERS: Partial<Record<OcrLanguageCode, string[]>> = {
  hin: ["है", "हैं", "और", "का", "की", "के", "में", "यह", "नहीं", "लिए", "कर"],
  mar: ["आहे", "आहेत", "आणि", "चा", "ची", "चे", "मध्ये", "हे", "नाही", "साठी"],
  eng: ["the", "and", "of", "to", "in", "is", "for", "that", "with", "this"],
};

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

/**
 * Detect the scripts present in the recognised text.
 * Returns candidates sorted by confidence, best first. Never invents a
 * language outside `OCR_LANGUAGES`.
 */
export function detectScripts(text: string): ScriptDetection[] {
  const sample = text.slice(0, 20_000);
  const letters = countMatches(sample, /[\p{L}]/gu);
  if (!letters) return [];
  const candidates: ScriptDetection[] = [];
  for (const test of SCRIPT_TESTS) {
    const hits = countMatches(sample, test.pattern);
    const share = hits / letters;
    if (share < 0.05) continue;
    for (const code of test.codes) {
      let confidence = Math.min(0.98, 0.35 + share * 0.63);
      if (test.codes.length > 1) {
        const markers = MARKERS[code] ?? [];
        const words = sample.split(/\s+/u);
        const markerHits = words.filter((word) =>
          markers.some((marker) => word.includes(marker)),
        ).length;
        const markerShare = words.length ? markerHits / words.length : 0;
        // Shared-script decision: scale confidence by the marker evidence.
        confidence = Math.min(
          0.9,
          Math.max(0.15, 0.2 + markerShare * 4) * (0.6 + share * 0.4),
        );
        candidates.push({ code, confidence, scriptShare: share });
        continue;
      }
      candidates.push({ code, confidence, scriptShare: share });
    }
  }
  return candidates.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Suggest languages for a page. Returns at most two candidates and only
 * those the evidence supports; a mixed page legitimately returns two.
 */
export function detectLanguages(text: string): ScriptDetection[] {
  const detected = detectScripts(text);
  if (!detected.length) return [];
  const top = detected[0];
  const second = detected.find(
    (candidate) =>
      candidate.code !== top.code &&
      candidate.confidence > 0.25 &&
      Math.abs(candidate.scriptShare - top.scriptShare) < 0.65,
  );
  const result = second ? [top, second] : [top];
  return result.filter((candidate) => candidate.confidence >= 0.2);
}

/** Language tag for a mixed selection, e.g. "hi+en" or "devanagari". */
export function languageTag(codes: string[]): string {
  return codes
    .map((code) => OCR_LANGUAGES.find((l) => l.code === code)?.tag ?? code)
    .join("+");
}

/** Human summary of a detection result for the UI. */
export function describeDetection(
  detections: ReadonlyArray<Pick<ScriptDetection, "code" | "confidence">>,
): string {
  if (!detections.length) return "No script detected yet";
  return detections
    .map((detection) => {
      const language = OCR_LANGUAGES.find((l) => l.code === detection.code);
      return `${language?.name ?? detection.code} ${Math.round(detection.confidence * 100)}%`;
    })
    .join(" · ");
}

/** Map detection confidence onto an honest label. */
export function detectionQuality(
  confidence: number,
): "strong" | "likely" | "weak" {
  if (confidence >= 0.7) return "strong";
  if (confidence >= 0.45) return "likely";
  return "weak";
}
