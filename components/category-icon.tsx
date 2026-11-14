import {
  Calculator,
  Code,
  Files,
  ImageIcon,
  QrCode,
  ShieldCheck,
  Sparkles,
  Type,
  type LucideIcon,
} from "lucide-react";
import type { CategoryMeta } from "@/lib/catalog";

export const categoryIcons: Record<CategoryMeta["icon"], LucideIcon> = {
  pdf: Files,
  image: ImageIcon,
  qr: QrCode,
  text: Type,
  code: Code,
  calc: Calculator,
  shield: ShieldCheck,
  sparkles: Sparkles,
};

export default function CategoryIcon({
  meta,
  size = 26,
}: {
  /** Anything carrying the icon name — a full category record or a nav entry. */
  meta: Pick<CategoryMeta, "icon">;
  size?: number;
}) {
  const Icon = categoryIcons[meta.icon];
  return <Icon size={size} strokeWidth={1.7} aria-hidden="true" />;
}
