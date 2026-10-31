import {
  Braces,
  CaseSensitive,
  ImageIcon,
  KeyRound,
  QrCode,
  Type,
} from "lucide-react";
import { IconTile, type TileSize } from "@/components/ui/icon-tile";
import type { ToolColor, ToolIconName } from "@/lib/catalog";

export const toolIconMap = {
  text: Type,
  case: CaseSensitive,
  code: Braces,
  key: KeyRound,
  qr: QrCode,
  image: ImageIcon,
} as const;

export const toolToneMap: Record<
  ToolColor,
  "purple" | "blue" | "mint" | "peach"
> = {
  purple: "purple",
  blue: "blue",
  mint: "mint",
  peach: "peach",
};

/** Rounded accent tile with the tool's Lucide icon. */
export default function ToolIcon({
  icon,
  color,
  size = "md",
  className,
}: {
  icon: ToolIconName;
  color: ToolColor;
  size?: TileSize;
  className?: string;
}) {
  const Icon = toolIconMap[icon];
  return (
    <IconTile tone={toolToneMap[color]} size={size} className={className}>
      <Icon strokeWidth={1.8} />
    </IconTile>
  );
}
