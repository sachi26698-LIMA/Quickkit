import {
  Braces,
  Check,
  Code,
  Files,
  ImageIcon,
  KeyRound,
  QrCode,
  Search,
  Type,
} from "lucide-react";

const tiles = [
  { Icon: Files, color: "purple" },
  { Icon: ImageIcon, color: "peach" },
  { Icon: QrCode, color: "mint" },
  { Icon: Type, color: "blue" },
  { Icon: Braces, color: "purple" },
  { Icon: KeyRound, color: "mint" },
];

export default function HeroArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      <div className="art-halo" />
      <div className="art-blob" />
      <div className="orbit" />
      <div className="orbit orbit-two" />
      <div className="art-window">
        <div className="window-bar">
          <i />
          <i />
          <i />
          <span>your everyday toolkit</span>
        </div>
        <div className="window-body">
          <div className="art-brand">
            <span className="art-brand-mark">Q</span>
            <strong>
              QUICK<span>KIT</span>
            </strong>
          </div>
          <div className="art-search">
            <Search size={12} />
            <span>Search tools…</span>
          </div>
          <div className="art-tiles">
            {tiles.map(({ Icon, color }, index) => (
              <span key={index} className={`art-tile ${color}`}>
                <Icon />
              </span>
            ))}
          </div>
          <div className="art-command">
            <Check size={15} /> One less thing on your list.
          </div>
        </div>
      </div>
      <span className="floating-icon float-pdf">
        <Files />
      </span>
      <span className="floating-icon float-code">
        <Code />
      </span>
      <span className="floating-icon float-qr">
        <QrCode />
      </span>
      <span className="floating-icon float-image">
        <ImageIcon />
      </span>
      <span className="floating-icon float-text">
        <Type />
      </span>
      <div className="art-caption">
        <span /> All the handy. None of the hassle.
      </div>
    </div>
  );
}
