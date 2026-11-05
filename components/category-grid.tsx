"use client";
import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import { categoryMeta, toolsByCategory } from "@/lib/catalog";
import { CategoryIcon3D } from "@/components/icon-3d";

/**
 * Homepage category cards with a subtle pointer-tracked 3D tilt and glow
 * (pointer-fine devices only; inert under reduced motion via CSS guard).
 */
export default function CategoryGrid() {
  const onMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const rx = ((e.clientY - rect.top) / rect.height - 0.5) * -7;
    const ry = ((e.clientX - rect.left) / rect.width - 0.5) * 9;
    el.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
    el.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
    el.style.setProperty(
      "--gx",
      `${(((e.clientX - rect.left) / rect.width) * 100).toFixed(1)}%`,
    );
    el.style.setProperty(
      "--gy",
      `${(((e.clientY - rect.top) / rect.height) * 100).toFixed(1)}%`,
    );
  };
  const onLeave = (e: React.PointerEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.setProperty("--rx", "0deg");
    e.currentTarget.style.setProperty("--ry", "0deg");
  };

  return (
    <div className="category-grid">
      {categoryMeta.map((meta) => {
        const count = toolsByCategory(meta.name).length;
        const comingSoon = count === 0;
        return (
          <Link
            key={meta.slug}
            href={`/category/${meta.slug}`}
            className={`category-card ${meta.tint}`}
            onPointerMove={onMove}
            onPointerLeave={onLeave}
          >
            <span className="category-glow" aria-hidden="true" />
            <span className="category-card-top">
              <CategoryIcon3D meta={meta} size={72} />
              {comingSoon ? (
                <span className="soon-badge">
                  <Clock size={11} aria-hidden="true" /> Soon
                </span>
              ) : (
                <span className="category-arrow">
                  <ArrowUpRight size={16} aria-hidden="true" />
                </span>
              )}
            </span>
            <h3>{meta.name}</h3>
            <p>{meta.blurb}</p>
            <span className="category-count">
              {comingSoon
                ? "Coming soon"
                : `${count} ${count === 1 ? "tool" : "tools"}`}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
