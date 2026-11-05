/* Local optimized reference render and CSS-layered animated tool cards. */
/* eslint-disable @next/next/no-img-element */
import {
  Calculator,
  Code2,
  FileText,
  Image as ImageIcon,
  LockKeyhole,
  QrCode,
  Scissors,
} from "lucide-react";
import styles from "./hero-scene-orbit.module.css";
import HeroMotion from "./hero-motion";
import HeroScreen from "./hero-screen";

export default function HeroArt() {
  return (
    <HeroMotion>
      <div className={styles.halo} aria-hidden="true" />
      <div className={styles.backShadow} aria-hidden="true" />
      <div className={styles.orbit} aria-hidden="true" />
      <div className={styles.groundShadow} aria-hidden="true" />
      <div className={styles.contactShadow} aria-hidden="true" />
      <div aria-hidden="true" className={`${styles.tile} ${styles.pdf}`}>
        <div className={styles.glassFace}>
          <FileText />
          <span>PDF</span>
        </div>
      </div>
      <div aria-hidden="true" className={`${styles.tile} ${styles.image}`}>
        <div className={styles.glassFace}>
          <ImageIcon />
        </div>
      </div>
      <div aria-hidden="true" className={`${styles.tile} ${styles.qr}`}>
        <div className={styles.glassFace}>
          <QrCode />
        </div>
      </div>
      <div aria-hidden="true" className={`${styles.tile} ${styles.lock}`}>
        <div className={styles.glassFace}>
          <LockKeyhole />
        </div>
      </div>
      <div aria-hidden="true" className={`${styles.tile} ${styles.code}`}>
        <div className={styles.glassFace}>
          <Code2 />
        </div>
      </div>
      <div aria-hidden="true" className={`${styles.tile} ${styles.calculator}`}>
        <div className={styles.glassFace}>
          <Calculator />
        </div>
      </div>
      <div aria-hidden="true" className={`${styles.tile} ${styles.scissors}`}>
        <div className={styles.glassFace}>
          <Scissors />
        </div>
      </div>
      <div
        className={styles.laptop}
        style={{ width: "80%", maxWidth: 1160, marginInline: "auto" }}
      >
        <img
          src="/hero-laptop-reference.webp"
          width={1438}
          height={920}
          alt=""
          draggable={false}
          fetchPriority="high"
          decoding="async"
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            maxWidth: "100%",
            objectFit: "contain",
          }}
        />
        <HeroScreen />
      </div>
    </HeroMotion>
  );
}
