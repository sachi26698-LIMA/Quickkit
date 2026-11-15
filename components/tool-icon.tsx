import {
  Type,
  CaseSensitive,
  Braces,
  KeyRound,
  QrCode,
  Barcode,
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
  ScanText,
  LockKeyhole,
} from "lucide-react";
export type ToolIconName = keyof typeof icons;
const icons = {
  text: Type,
  case: CaseSensitive,
  code: Braces,
  key: KeyRound,
  qr: QrCode,
  barcode: Barcode,
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
  ocr: ScanText,
  scan: ScanLine,
  pdfLock: LockKeyhole,
};
export default function ToolIcon({
  icon,
  color,
}: {
  icon: ToolIconName;
  color: string;
}) {
  const Icon = icons[icon];
  return (
    <span className={`tool-icon ${color}`}>
      <Icon size={25} strokeWidth={1.7} aria-hidden="true" />
    </span>
  );
}
