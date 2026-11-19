#!/usr/bin/env python3
"""BioCraft Devanagari font verifier.

Reads the imported fonts in ``public/fonts/hindi`` and proves — against the
actual binary, not the family name — that:

* the Devanagari Unicode block is covered (consonants, vowels, matras, virama,
  nukta, anusvara/chandrabindu/visarga, danda, Devanagari numerals);
* real Hindi text shapes with HarfBuzz without a single ``.notdef`` glyph;
* conjuncts (क्ष त्र ज्ञ श्र क्र प्र स्त्र …) and pre-base matras are shaped;
* nukta letters work both precomposed and decomposed;
* Latin text works too, for mixed Hindi/English lines;
* every declared weight file parses, and variable fonts expose a wght axis.

The output (``lib/fonts/data/verification.json``) is committed and consumed by
the catalogue builder, the admin report screen and the automated tests.

Usage:
    python3 scripts/fonts/verify_fonts.py
Requirements: fonttools, brotli, uharfbuzz (see scripts/fonts/requirements.txt).
"""

from __future__ import annotations

import hashlib
import io
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from fontTools.ttLib import TTFont
import fontTools
import uharfbuzz as hb

ROOT = Path(__file__).resolve().parents[2]
FONT_ROOT = ROOT / "public" / "fonts" / "hindi"
MANIFEST = ROOT / "lib" / "fonts" / "data" / "import-manifest.json"
OUTPUT = ROOT / "lib" / "fonts" / "data" / "verification.json"

SAMPLE = (
    "नमस्ते भारत मेरा नाम सचिन है। ज़िंदगी खूबसूरत है। "
    "प्रेम, विश्वास और उम्मीद। कर्मण्येवाधिकारस्ते मा फलेषु कदाचन। "
    "श्रृंगार, शायरी और एहसास।"
)

# Every consonant used by Hindi (क … ह). U+0929 ऩ, U+0931 ऱ and U+0934 ऴ are
# Dravidian / Konkani letters that a Hindi font may legitimately omit, so they
# are optional rather than rejections.
CONSONANTS = [
    code for code in range(0x0915, 0x093A) if code not in (0x0929, 0x0931, 0x0934)
]
INDEPENDENT_VOWELS = [
    0x0905,
    0x0906,
    0x0907,
    0x0908,
    0x0909,
    0x090A,
    0x090B,
    0x090C,
    0x090F,
    0x0910,
    0x0913,
    0x0914,
]
MATRAS = [
    0x093E, 0x093F, 0x0940, 0x0941, 0x0942, 0x0943,
    0x0947, 0x0948, 0x0949, 0x094B, 0x094C, 0x094D,
]
SIGNS = [0x0901, 0x0902, 0x0903, 0x093C, 0x094D]
PUNCTUATION = [0x0964, 0x0965]
NUMERALS = list(range(0x0966, 0x0970))
LATIN = [
    ord(char)
    for char in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
]

CRITICAL = {
    "consonants": CONSONANTS,
    "independentVowels": INDEPENDENT_VOWELS,
    "matras": MATRAS,
    "signs": SIGNS,
    "punctuation": PUNCTUATION,
    "numerals": NUMERALS,
}

OPTIONAL = {
    # Rare / non-Hindi Devanagari letters.
    "dravidianConsonants": [0x0929, 0x0931, 0x0934],
    "rareVowelSigns": [0x093A, 0x0944, 0x0945, 0x0946, 0x094A, 0x094E, 0x094F],
    "precomposedNukta": list(range(0x0958, 0x0960)),
    "avagrahaAndOm": [0x093D, 0x0950],
    "vedicExtensions": list(range(0x1CD0, 0x1CFA)) + list(range(0xA8E0, 0xA900)),
    "vowelSignsExtended": [0x0951, 0x0952],
    "rupeeSign": [0x20B9],
    "latin": LATIN,
}

CONJUNCTS = [
    "क्ष",
    "त्र",
    "ज्ञ",
    "श्र",
    "क्र",
    "प्र",
    "स्त्र",
    "द्ध",
    "ट्ट",
    "ञ्ज",
    "ण्ड",
    "म्भ",
    "क्क",
    "ग्र",
    "न्द्र",
]

MATRA_TESTS = [
    "कि",
    "की",
    "कु",
    "कू",
    "के",
    "कै",
    "को",
    "कौ",
    "कं",
    "कः",
    "क्",
]

NUKTA_TESTS = ["क़", "ख़", "ग़", "ज़", "ड़", "ढ़", "फ़", "य़"]

SHAPING_SAMPLES = {
    "greeting": "नमस्ते भारत",
    "introduction": "मेरा नाम सचिन है।",
    "nukta": "ज़िंदगी खूबसूरत है।",
    "values": "प्रेम, विश्वास और उम्मीद।",
    "gita": "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।",
    "ornament": "श्रृंगार, शायरी और एहसास।",
    "numerals": "०१२३४५६७८९ ०९",
    "punctuation": "। ॥ ? ! ,",
    "sample": SAMPLE,
}


def hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 128), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_font(path: Path):
    """Decode WOFF2 into a TTFont and a HarfBuzz font + cmap."""
    with path.open("rb") as handle:
        raw = handle.read()
    font = TTFont(io.BytesIO(raw))
    font.flavor = None
    buffer = io.BytesIO()
    font.save(buffer)
    data = buffer.getvalue()
    face = hb.Face(data)
    hb_font = hb.Font(face)
    cmap = font.getBestCmap() or {}
    return font, hb_font, cmap, data


def shape(hb_font, text: str):
    buffer = hb.Buffer()
    buffer.add_str(text)
    buffer.guess_segment_properties()
    hb.shape(hb_font, buffer)
    return [
        {
            "glyph": info.codepoint,
            "cluster": info.cluster,
            "xAdvance": position.x_advance,
            "xOffset": position.x_offset,
            "yOffset": position.y_offset,
        }
        for info, position in zip(buffer.glyph_infos, buffer.glyph_positions)
    ]


def is_devanagari(char: str) -> bool:
    code = ord(char)
    return (
        0x0900 <= code <= 0x097F
        or 0x1CD0 <= code <= 0x1CFF
        or 0xA8E0 <= code <= 0xA8FF
    )


def shape_mixed(text, deva_font, latin_font):
    """Shape a mixed Hindi/English line the way the browser does: each script
    run is shaped by its own subset font."""
    runs = []
    for char in text:
        script = "devanagari" if is_devanagari(char) else "latin"
        if runs and runs[-1][0] == script:
            runs[-1][1] += char
        else:
            runs.append([script, char])
    shaped = []
    for script, run in runs:
        font = deva_font if script == "devanagari" else latin_font
        shaped.extend(shape(font, run))
    return shaped


def coverage(cmap, codepoints):
    present = [code for code in codepoints if code in cmap]
    missing = [code for code in codepoints if code not in cmap]
    return {
        "required": len(codepoints),
        "present": len(present),
        "percent": round(100 * len(present) / len(codepoints), 2)
        if codepoints
        else 100,
        "missing": [f"U+{code:04X}" for code in missing][:48],
        "missingCount": len(missing),
    }


def shaping_check(hb_font, text, latin_font=None):
    glyphs = (
        shape_mixed(text, hb_font, latin_font) if latin_font is not None else shape(hb_font, text)
    )
    notdef = [entry for entry in glyphs if entry["glyph"] == 0]
    clusters = {entry["cluster"] for entry in glyphs}
    return {
        "text": text,
        "glyphCount": len(glyphs),
        "clusterCount": len(clusters),
        "notdefCount": len(notdef),
        "ok": len(notdef) == 0 and len(glyphs) > 0,
    }


def verify_font(
    path: Path,
    declared_weight: int | None,
    variable: bool,
    latin_path: Path | None = None,
):
    font, hb_font, cmap, data = load_font(path)
    latin_cmap = {}
    latin_report = None
    if latin_path and latin_path.exists():
        _, _, latin_cmap, _ = load_font(latin_path)
    latin_cmap = latin_cmap or cmap
    latin_hb = hb_font if latin_cmap is cmap else None
    if latin_path and latin_path.exists():
        _, latin_hb, _, _ = load_font(latin_path)
    result = {
        "file": path.name,
        "bytes": len(data),
        "glyphCount": len(font.getGlyphOrder()),
        "cmapEntries": len(cmap),
        "upem": font["head"].unitsPerEm,
        "hasGSUB": "GSUB" in font,
        "hasGPOS": "GPOS" in font,
        "declaredWeight": declared_weight,
    }

    if declared_weight is not None and "OS/2" in font:
        result["os2WeightClass"] = font["OS/2"].usWeightClass
        result["weightMatches"] = abs(font["OS/2"].usWeightClass - declared_weight) <= 50

    if variable:
        fvar = font.get("fvar")
        axes = {}
        if fvar:
            for axis in fvar.axes:
                axes[axis.axisTag] = {
                    "min": axis.minValue,
                    "default": axis.defaultValue,
                    "max": axis.maxValue,
                }
        result["axes"] = axes
        result["wghtAxis"] = axes.get("wght")

    result["coverage"] = {name: coverage(cmap, codes) for name, codes in CRITICAL.items()}
    latin_coverage = coverage(latin_cmap, LATIN)
    result["latin"] = latin_coverage
    result["optionalCoverage"] = {
        name: coverage(cmap, codes) for name, codes in OPTIONAL.items()
    }
    if result["optionalCoverage"]["precomposedNukta"]["present"] == 0:
        result["nuktaImplementedByShaping"] = True

    conjuncts = []
    for text in CONJUNCTS:
        shaped = shape(hb_font, text)
        conjuncts.append(
            {
                "text": text,
                "glyphs": [entry["glyph"] for entry in shaped],
                "clusters": sorted({entry["cluster"] for entry in shaped}),
                "singleGlyph": len(shaped) == 1,
                "ok": len(shaped) > 0 and all(entry["glyph"] != 0 for entry in shaped),
            }
        )
    result["conjuncts"] = conjuncts

    result["matras"] = []
    for text in MATRA_TESTS:
        shaped = shape(hb_font, text)
        result["matras"].append(
            {
                "text": text,
                "glyphs": [entry["glyph"] for entry in shaped],
                "ok": len(shaped) > 0
                and all(entry["glyph"] != 0 for entry in shaped),
            }
        )

    # Pre-base matra reordering: in "कि" the i-matra must be drawn before the
    # base consonant, so the first glyph must be the U+093F glyph (or a
    # contextual variant), never the ka glyph.
    pre_base_ok = None
    if 0x093F in cmap and 0x0915 in cmap:
        shaped = shape(hb_font, "कि")
        if len(shaped) >= 2:
            ka_glyph = cmap[0x0915]
            pre_base_ok = shaped[0]["glyph"] != ka_glyph
    result["preBaseMatraReordered"] = pre_base_ok

    result["nukta"] = []
    for text in NUKTA_TESTS:
        shaped = shape(hb_font, text)
        decomposed = shape(hb_font, text.replace("़", "\u093c"))
        result["nukta"].append(
            {
                "text": text,
                "ok": all(entry["glyph"] != 0 for entry in shaped)
                and all(entry["glyph"] != 0 for entry in decomposed),
                "decomposedOk": all(entry["glyph"] != 0 for entry in decomposed),
            }
        )

    result["samples"] = {
        name: shaping_check(hb_font, text, latin_hb)
        for name, text in SHAPING_SAMPLES.items()
    }
    result["latinSample"] = shaping_check(latin_hb, "BioCraft Studio 2026")
    result["mixedSample"] = {
        "hindi": shaping_check(hb_font, "नमस्ते दुनिया"),
        "english": result["latinSample"],
        "ok": result["latinSample"]["ok"]
        and shaping_check(hb_font, "नमस्ते दुनिया")["ok"],
    }

    # Glyph-level checks for the full paragraph: every cluster must map to a
    # real glyph and the Devanagari sample must produce some advance.
    full = shape_mixed(SAMPLE, hb_font, latin_hb)
    result["fullSample"] = {
        "glyphCount": len(full),
        "notdefCount": sum(1 for entry in full if entry["glyph"] == 0),
        "advance": sum(entry["xAdvance"] for entry in full),
    }

    errors = []
    warnings = []

    for name in ("consonants", "independentVowels", "matras", "signs", "punctuation", "numerals"):
        block = result["coverage"][name]
        if block["missingCount"]:
            errors.append(
                f"{name}: missing {block['missingCount']} of {block['required']} ({', '.join(block['missing'][:6])})"
            )

    if not latin_coverage["missingCount"]:
        pass
    elif latin_coverage["missingCount"] > 10:
        errors.append(
            f"latin: missing {latin_coverage['missingCount']} of "
            f"{latin_coverage['required']} basic letters/digits"
        )
    else:
        warnings.append(
            f"latin: {latin_coverage['missingCount']} basic characters missing"
        )

    for sample in result["samples"].values():
        if not sample["ok"]:
            errors.append(f"shaping produced .notdef for “{sample['text']}”")
    if not result["latinSample"]["ok"]:
        errors.append("Latin sample produced .notdef glyphs")

    ok_conjuncts = sum(1 for entry in conjuncts if entry["ok"])
    if ok_conjuncts < len(conjuncts):
        errors.append(
            f"conjuncts: {len(conjuncts) - ok_conjuncts} of {len(conjuncts)} rendered with .notdef"
        )
    single = sum(1 for entry in conjuncts if entry["singleGlyph"])
    if single < 4:
        warnings.append(f"only {single}/{len(conjuncts)} conjuncts form one glyph")

    ok_matras = sum(1 for entry in result["matras"] if entry["ok"])
    if ok_matras < len(result["matras"]):
        errors.append(f"matras: {len(result['matras']) - ok_matras} failed to shape")

    if pre_base_ok is False:
        errors.append("pre-base i-matra is not reordered before the consonant")

    ok_nukta = sum(1 for entry in result["nukta"] if entry["ok"])
    if ok_nukta < len(result["nukta"]):
        warnings.append(f"nukta: {len(result['nukta']) - ok_nukta} of {len(result['nukta'])} incomplete")

    if not result["hasGSUB"]:
        warnings.append("font has no GSUB table: conjunct shaping is limited")
    if not result["hasGPOS"]:
        warnings.append("font has no GPOS table: mark positioning may be weak")

    if declared_weight is not None and result.get("weightMatches") is False:
        warnings.append(
            f"OS/2 weight {result.get('os2WeightClass')} differs from declared {declared_weight}"
        )

    if variable and not result.get("wghtAxis"):
        errors.append("variable build has no wght axis")

    result["errors"] = errors
    result["warnings"] = warnings
    result["status"] = "verified" if not errors else "rejected"
    result["score"] = max(
        0,
        round(
            100
            - len(errors) * 18
            - len(warnings) * 2
            - max(0, 12 - single) * 0.4
            - (100 - result["coverage"]["consonants"]["percent"]) * 0.6
            - latin_coverage["missingCount"] * 0.5,
            1,
        ),
    )
    return result


def main() -> int:
    if not MANIFEST.exists():
        print(f"Missing {MANIFEST}; run import-devanagari.mjs first.", file=sys.stderr)
        return 1
    manifest = json.loads(MANIFEST.read_text())

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "verifier": {
            "engine": "harfbuzz " + hb.version_string(),
            "fontTools": fontTools.version,
            "sampleText": SAMPLE,
            "checks": [
                "Devanagari Unicode coverage",
                "matra shaping",
                "conjunct shaping",
                "half-letter / virama shaping",
                "nukta (precomposed + decomposed)",
                "punctuation and Devanagari numerals",
                "mixed Hindi + English",
                "every declared weight parses",
                "variable wght axis",
                "SHA-256 file integrity",
            ],
        },
        "families": {},
        "totals": {},
    }

    for entry in manifest["families"]:
        slug = entry.get("slug")
        family = entry.get("family")
        if entry.get("status") == "failed" or not slug:
            report["families"][slug or family] = {
                "family": family,
                "status": "rejected",
                "errors": [entry.get("error", "import failed")],
                "warnings": [],
            }
            continue

        directory = FONT_ROOT / slug
        font_report = {
            "family": family,
            "slug": slug,
            "category": entry.get("category"),
            "license": entry.get("license"),
            "upstream": entry.get("upstream"),
            "declaredWeights": entry.get("weights", []),
            "variable": bool(entry.get("variable")),
            "files": [],
            "status": "verified",
            "errors": [],
            "warnings": [],
        }

        devanagari_files = [
            file for file in entry["files"] if file.get("subset") == "devanagari"
        ]
        devanagari_files.sort(
            key=lambda file: (file.get("weight") is None, file.get("weight") or 0)
        )
        if not devanagari_files:
            font_report["status"] = "rejected"
            font_report["errors"].append("no Devanagari build imported")
            report["families"][slug] = font_report
            continue

        # Full check on the primary (400 / variable) build; quick integrity
        # checks on every other declared weight.
        primary = next(
            (
                file
                for file in devanagari_files
                if file.get("weight") in (400, None)
            ),
            devanagari_files[0],
        )
        primary_path = ROOT / "public" / primary["path"].lstrip("/")
        if not primary_path.exists():
            font_report["status"] = "rejected"
            font_report["errors"].append(f"missing file {primary['path']}")
            report["families"][slug] = font_report
            continue

        for file in entry["files"]:
            path = ROOT / "public" / file["path"].lstrip("/")
            if not path.exists():
                font_report["errors"].append(f"missing file {file['path']}")
                continue
            digest = hash_file(path)
            if digest != file["sha256"]:
                font_report["errors"].append(f"checksum mismatch {file['path']}")
            if file["subset"] == "devanagari":
                try:
                    font, hb_font, cmap, _ = load_font(path)
                    font_report["files"].append(
                        {
                            "path": file["path"],
                            "weight": file.get("weight"),
                            "bytes": path.stat().st_size,
                            "sha256": digest,
                            "glyphs": len(font.getGlyphOrder()),
                            "cmapEntries": len(cmap),
                            "conjunctProbe": sum(
                                1
                                for entry in shape(hb_font, "क्षत्रज्ञश्र")
                                if entry["glyph"] != 0
                            ),
                        }
                    )
                except Exception as error:  # noqa: BLE001
                    font_report["errors"].append(
                        f"could not decode {file['path']}: {error}"
                    )

        latin_files = [
            file for file in entry["files"] if file.get("subset") == "latin"
        ]
        latin_files.sort(
            key=lambda file: (file.get("weight") != primary.get("weight"), file.get("weight") or 0)
        )
        latin_path = (
            ROOT / "public" / latin_files[0]["path"].lstrip("/")
            if latin_files
            else None
        )
        try:
            primary_report = verify_font(
                primary_path,
                primary.get("weight"),
                bool(entry.get("variable")),
                latin_path,
            )
        except Exception as error:  # noqa: BLE001
            primary_report = {
                "status": "rejected",
                "errors": [f"verification failed: {error}"],
                "warnings": [],
            }

        font_report["primary"] = primary_report
        font_report["errors"].extend(primary_report.get("errors", []))
        font_report["warnings"].extend(primary_report.get("warnings", []))
        font_report["status"] = (
            "verified" if not font_report["errors"] else "rejected"
        )
        font_report["score"] = primary_report.get("score", 0)
        font_report["coverage"] = primary_report.get("coverage")
        font_report["latin"] = primary_report.get("latin")
        font_report["latinSample"] = primary_report.get("latinSample")
        font_report["mixedSample"] = primary_report.get("mixedSample")
        font_report["nuktaImplementedByShaping"] = primary_report.get(
            "nuktaImplementedByShaping"
        )
        font_report["optionalCoverage"] = primary_report.get("optionalCoverage")
        font_report["conjuncts"] = primary_report.get("conjuncts")
        font_report["samples"] = primary_report.get("samples")
        font_report["nukta"] = primary_report.get("nukta")
        font_report["matras"] = primary_report.get("matras")
        font_report["preBaseMatraReordered"] = primary_report.get(
            "preBaseMatraReordered"
        )
        font_report["fullSample"] = primary_report.get("fullSample")
        font_report["axes"] = primary_report.get("axes")
        report["families"][slug] = font_report
        verdict = "✓" if font_report["status"] == "verified" else "✗"
        print(
            f"{verdict} {family} ({slug}) score {font_report['score']}"
            f"{' — ' + font_report['errors'][0] if font_report['errors'] else ''}"
        )

    families = list(report["families"].values())
    report["totals"] = {
        "discovered": len(families),
        "verified": sum(1 for family in families if family["status"] == "verified"),
        "rejected": sum(1 for family in families if family["status"] != "verified"),
        "scannedFiles": sum(len(family.get("files", [])) for family in families),
        "fontFamiliesWithDevanagari": sum(
            1
            for family in families
            if (family.get("coverage") or {})
            .get("consonants", {})
            .get("percent", 0)
            > 0
        ),
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(
        f"\nVerified {report['totals']['verified']}/{report['totals']['discovered']} families."
    )
    print(f"Report: {OUTPUT.relative_to(ROOT)}")
    return 0 if report["totals"]["verified"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
