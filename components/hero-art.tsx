"use client";
import { useRef } from "react";
import {
  Braces,
  Calculator,
  Check,
  Code,
  Files,
  ImageIcon,
  KeyRound,
  QrCode,
  Search,
  Type,
  Zap,
} from "lucide-react";

const tiles = [
  { Icon: Files, color: "purple", label: "PDF" },
  { Icon: ImageIcon, color: "peach", label: "Image" },
  { Icon: QrCode, color: "mint", label: "QR" },
  { Icon: Type, color: "blue", label: "Text" },
  { Icon: Braces, color: "purple", label: "JSON" },
  { Icon: KeyRound, color: "mint", label: "Keys" },
];

const floats = [
  { Icon: Files, cls: "float-pdf", depth: 14 },
  { Icon: Code, cls: "float-code", depth: 22 },
  { Icon: QrCode, cls: "float-qr", depth: 18 },
  { Icon: ImageIcon, cls: "float-image", depth: 24 },
  { Icon: Calculator, cls: "float-calc", depth: 12 },
  { Icon: Type, cls: "float-text", depth: 20 },
];

/**
 * CSS-3D laptop with the QUICKKIT dashboard, glowing rings and floating
 * tool tiles. Pointer parallax is pointer-fine + motion-safe only.
 */
export default function HeroArt() {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width - 0.5).toFixed(3);
    const py = ((e.clientY - rect.top) / rect.height - 0.5).toFixed(3);
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--px", px);
      el.style.setProperty("--py", py);
    });
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.style.setProperty("--px", "0");
    el.style.setProperty("--py", "0");
  };

  return (
    <div
      className="hero-art"
      aria-hidden="true"
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div className="art-halo" />
      <div className="art-blob" />
      <div className="art-ring ring-one" />
      <div className="art-ring ring-two" />
      <div className="laptop">
        <div className="laptop-screen">
          <div className="window-bar">
            <i />
            <i />
            <i />
            <span>your everyday toolkit</span>
          </div>
          <div className="window-body">
            <div className="art-brand">
              <span className="art-brand-mark">
                <Zap size={16} fill="currentColor" />
              </span>
              <strong>
                QUICK<span>KIT</span>
              </strong>
              <span className="art-brand-badge">100+ tools</span>
            </div>
            <div className="art-search">
              <Search size={12} />
              <span>Search tools…</span>
            </div>
            <div className="art-tiles">
              {tiles.map(({ Icon, color, label }) => (
                <span key={label} className="art-tile-wrap">
                  <span className={`art-tile ${color}`}>
                    <Icon />
                  </span>
                  <small>{label}</small>
                </span>
              ))}
            </div>
            <div className="art-command">
              <Check size={15} /> One less thing on your list.
            </div>
          </div>
        </div>
        <div className="laptop-base" />
      </div>
      {floats.map(({ Icon, cls, depth }) => (
        <span
          key={cls}
          className={`floating-icon ${cls}`}
          style={{ "--depth": depth } as React.CSSProperties}
        >
          <Icon />
        </span>
      ))}
      <div className="art-caption">
        <span /> All the handy. None of the hassle.
      </div>
    </div>
  );
}
