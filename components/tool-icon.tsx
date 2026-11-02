import {
  Type,
  CaseSensitive,
  Braces,
  KeyRound,
  QrCode,
  ImageIcon,
  Files,
  FileText,
  Calculator,
  Scaling,
  Crop,
  ArrowRightLeft,
} from "lucide-react";
const icons = {
  text: Type,
  case: CaseSensitive,
  code: Braces,
  key: KeyRound,
  qr: QrCode,
  image: ImageIcon,
  pdf: Files,
  word: FileText,
  calc: Calculator,
  resize: Scaling,
  crop: Crop,
  convert: ArrowRightLeft,
};
export default function ToolIcon({
  icon,
  color,
}: {
  icon: keyof typeof icons;
  color: string;
}) {
  const Icon = icons[icon];
  return (
    <span className={`tool-icon ${color}`}>
      <Icon size={25} strokeWidth={1.7} aria-hidden="true" />
    </span>
  );
}
