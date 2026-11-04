import {
  Type,
  CaseSensitive,
  Braces,
  KeyRound,
  QrCode,
  ImageIcon,
  Files,
  ScissorsLineDashed,
  Shrink,
  FileText,
  Calculator,
  Scaling,
  Crop,
  ArrowRightLeft,
  FileImage,
  ImageDown,
  Layers,
  ScanLine,
} from "lucide-react";
const icons = {
  text: Type,
  case: CaseSensitive,
  code: Braces,
  key: KeyRound,
  qr: QrCode,
  image: ImageIcon,
  pdf: Files,
  pdfSplit: ScissorsLineDashed,
  pdfCompress: Shrink,
  word: FileText,
  calc: Calculator,
  resize: Scaling,
  crop: Crop,
  convert: ArrowRightLeft,
  imagesToPdf: FileImage,
  pdfToImage: ImageDown,
  pdfStudio: Layers,
  scan: ScanLine,
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
