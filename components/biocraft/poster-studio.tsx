"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, Sparkles } from "lucide-react";
import FontPicker from "./font-picker";
import FontPreviewLine from "./font-preview-line";
import { fontFamilyName, loadFont } from "@/lib/fonts/loader";
import { rememberSelectedFont, trackFontUse } from "@/lib/fonts/preferences";
import type { FontRecord } from "@/lib/fonts/types";

const PRESETS = [
  { id: "portrait", label: "Post 4:5", width: 1080, height: 1350 },
  { id: "square", label: "Square 1:1", width: 1080, height: 1080 },
  { id: "story", label: "Story 9:16", width: 1080, height: 1920 },
] as const;

const THEMES = {
  cream: { label: "Cream", from: "#fdfbf6", to: "#f2ead9", ink: "#211b12" },
  dusk: { label: "Dusk", from: "#2a2440", to: "#141122", ink: "#f8f5ff" },
  rose: { label: "Rose", from: "#fff1f5", to: "#ffd9e6", ink: "#3b1422" },
  mint: { label: "Mint", from: "#effaf7", to: "#d3f0e8", ink: "#0d2f28" },
  indigo: { label: "Indigo", from: "#eef0ff", to: "#d5d8ff", ink: "#181a45" },
} as const;

type ThemeKey = keyof typeof THEMES;

export default function PosterStudio({
  initialFonts,
  initialFont,
  initialText,
}: {
  initialFonts: FontRecord[];
  initialFont: FontRecord | null;
  initialText: string;
}) {
  const [font, setFont] = useState<FontRecord | null>(
    initialFont ?? initialFonts[0] ?? null,
  );
  const [text, setText] = useState(
    initialText || "शब्दों में अपनी दुनिया लिखो।",
  );
  const [preset, setPreset] =
    useState<(typeof PRESETS)[number]["id"]>("portrait");
  const [theme, setTheme] = useState<ThemeKey>("cream");
  const [size, setSize] = useState(104);
  const [weight, setWeight] = useState(500);
  const [align, setAlign] = useState<"left" | "center">("left");
  const [ready, setReady] = useState(false);
  const [rendering, setRendering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activePreset = PRESETS.find((item) => item.id === preset) ?? PRESETS[0];

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !font) return;
    setRendering(true);
    try {
      const loaded = await loadFont(font, weight, { latin: true });
      if (!loaded) {
        setReady(false);
        return;
      }
      await document.fonts.ready;
      const context = canvas.getContext("2d");
      if (!context) return;
      const { width, height } = canvas;
      const palette = THEMES[theme];
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, palette.from);
      gradient.addColorStop(1, palette.to);
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      // Decorative Devanagari comma motif, drawn faintly.
      context.save();
      context.globalAlpha = 0.06;
      context.fillStyle = palette.ink;
      context.font = `700 420px "${fontFamilyName(font.slug)}"`;
      context.fillText("क", width - 320, height - 90);
      context.restore();

      const padding = 96;
      const maxWidth = width - padding * 2;
      context.fillStyle = palette.ink;
      context.textBaseline = "top";
      context.font = `${weight} ${size}px "${fontFamilyName(font.slug)}", sans-serif`;
      context.direction = "ltr";

      const lines: string[] = [];
      for (const paragraph of text.split("\n")) {
        if (!paragraph.trim()) {
          lines.push("");
          continue;
        }
        let current = "";
        for (const word of paragraph.split(/\s+/)) {
          const candidate = current ? `${current} ${word}` : word;
          if (context.measureText(candidate).width > maxWidth && current) {
            lines.push(current);
            current = word;
          } else {
            current = candidate;
          }
        }
        lines.push(current);
      }

      const lineHeight = size * 1.55;
      const totalHeight = lines.length * lineHeight;
      let y = Math.max(padding, (height - totalHeight) / 2 - 60);
      context.textAlign = align === "center" ? "center" : "left";
      const x = align === "center" ? width / 2 : padding;
      for (const line of lines) {
        context.fillText(line, x, y);
        y += lineHeight;
      }

      context.globalAlpha = 1;
      context.textAlign = "left";
      context.font = '500 28px -apple-system, "Segoe UI", sans-serif';
      context.fillStyle = palette.ink;
      context.globalAlpha = 0.62;
      context.fillText(`BioCraft · ${font.family}`, padding, height - 84);
      context.textAlign = "right";
      // Draw the Devanagari footer in the selected file: the device system
      // font may not carry Devanagari, and the poster must prove the font.
      context.font = `500 28px "${fontFamilyName(font.slug)}", sans-serif`;
      context.fillText("हिंदी टाइपोग्राफी", width - padding, height - 84);
      context.globalAlpha = 1;
      setReady(true);
    } finally {
      setRendering(false);
    }
  }, [font, weight, theme, text, size, align]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void draw();
    }, 180);
    return () => window.clearTimeout(timer);
  }, [draw]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `biocraft-${font?.slug ?? "poster"}-${activePreset.width}x${activePreset.height}.png`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      if (font) trackFontUse(font.slug, "poster");
    }, "image/png");
  };

  const chooseFont = (next: FontRecord) => {
    setFont(next);
    rememberSelectedFont(next.slug);
    trackFontUse(next.slug, "poster");
  };

  return (
    <div className="bc-studio" style={{ marginTop: 26 }}>
      <section className="bc-card bc-panel" aria-label="Poster controls">
        <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Poster studio</h2>
        <div style={{ display: "grid", gap: 12 }}>
          <FontPicker
            selected={font}
            initialFonts={initialFonts}
            onChange={chooseFont}
          />
          <div className="bc-field">
            <label htmlFor="poster-text">Poster text</label>
            <textarea
              id="poster-text"
              className="bc-textarea"
              rows={4}
              maxLength={220}
              value={text}
              onChange={(event) => setText(event.target.value)}
              lang="hi"
            />
          </div>
          <div className="bc-controls-inline">
            <div className="bc-field">
              <label htmlFor="poster-size">Font size · {size}px</label>
              <input
                id="poster-size"
                className="bc-range"
                type="range"
                min={48}
                max={180}
                value={size}
                onChange={(event) => setSize(Number(event.target.value))}
              />
            </div>
            <div className="bc-field">
              <label htmlFor="poster-weight">Weight</label>
              <select
                id="poster-weight"
                className="bc-select"
                value={weight}
                onChange={(event) => setWeight(Number(event.target.value))}
              >
                {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="bc-field">
            <label>Format</label>
            <div className="bc-chips" style={{ paddingTop: 0 }}>
              {PRESETS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="bc-chip"
                  aria-pressed={preset === item.id}
                  onClick={() => setPreset(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="bc-field">
            <label>Background</label>
            <div className="bc-chips" style={{ paddingTop: 0 }}>
              {(Object.keys(THEMES) as ThemeKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className="bc-chip"
                  aria-pressed={theme === key}
                  onClick={() => setTheme(key)}
                >
                  {THEMES[key].label}
                </button>
              ))}
            </div>
          </div>
          <div className="bc-field">
            <label>Alignment</label>
            <div className="bc-chips" style={{ paddingTop: 0 }}>
              {(["left", "center"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className="bc-chip"
                  aria-pressed={align === value}
                  onClick={() => setAlign(value)}
                >
                  {value === "left" ? "Left" : "Centered"}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="bc-button"
            onClick={download}
            disabled={!ready || rendering || !font}
          >
            {rendering ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <Download size={14} />
            )}
            {rendering ? "Rendering…" : "Download PNG"}
          </button>
          <p className="bc-hint">
            The PNG is painted on a canvas with the loaded WOFF2, so Devanagari
            shaping, matras and conjuncts match what you see below.
          </p>
        </div>
      </section>

      <section aria-label="Poster preview">
        <div
          className="bc-card"
          style={{
            padding: 18,
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(245,245,247,0.7))",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 420,
              margin: "0 auto",
              aspectRatio: `${activePreset.width} / ${activePreset.height}`,
              borderRadius: 18,
              overflow: "hidden",
              boxShadow: "0 24px 60px rgba(20,20,40,0.18)",
              background: `linear-gradient(135deg, ${THEMES[theme].from}, ${THEMES[theme].to})`,
            }}
          >
            {font ? (
              <FontPreviewLine
                font={font}
                text={text}
                weight={weight}
                size={Math.round(size * 0.42)}
                className=""
                as="div"
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: align === "center" ? "center" : "flex-start",
                  padding: "12%",
                  color: THEMES[theme].ink,
                  whiteSpace: "pre-wrap",
                  textAlign: align,
                  overflowWrap: "anywhere",
                }}
              />
            ) : null}
            <span
              style={{
                position: "absolute",
                left: "9%",
                bottom: "5%",
                fontSize: 9,
                color: THEMES[theme].ink,
                opacity: 0.6,
              }}
            >
              BioCraft · {font?.family ?? ""}
            </span>
          </div>
          <p className="bc-hint" style={{ textAlign: "center", marginTop: 12 }}>
            {activePreset.width} × {activePreset.height} px · live preview
          </p>
        </div>
        <canvas
          ref={canvasRef}
          width={activePreset.width}
          height={activePreset.height}
          style={{ display: "none" }}
          aria-hidden="true"
        />
        <div className="bc-note" style={{ marginTop: 14 }}>
          <Sparkles size={13} style={{ verticalAlign: -2, marginRight: 6 }} />
          Tip: pick a display family such as Rozha One or Gajraj One for a
          headline, and a book family such as Tiro Devanagari Hindi for a longer
          quote.
        </div>
      </section>
    </div>
  );
}
