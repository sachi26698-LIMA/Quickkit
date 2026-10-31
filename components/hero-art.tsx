import { Braces, Type, QrCode, ImageIcon, KeyRound, Check } from "lucide-react";
export default function HeroArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      <div className="art-halo" />
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div className="art-window">
        <div className="window-bar">
          <i />
          <i />
          <i />
          <span>your everyday toolkit</span>
        </div>
        <div className="window-body">
          <span className="large-q">Q</span>
          <strong>
            Big help.
            <br />
            <span>Little effort.</span>
          </strong>
          <div className="art-command">
            <Check size={15} /> One less thing on your list.
          </div>
        </div>
      </div>
      <span className="floating-icon float-text">
        <Type />
      </span>
      <span className="floating-icon float-image">
        <ImageIcon />
      </span>
      <span className="floating-icon float-qr">
        <QrCode />
      </span>
      <span className="floating-icon float-code">
        <Braces />
      </span>
      <span className="floating-icon float-key">
        <KeyRound />
      </span>
      <div className="art-caption">
        <span /> All the handy. None of the hassle.
      </div>
    </div>
  );
}
