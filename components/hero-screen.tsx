import { Zap } from "lucide-react";
import HeroVisitorChart from "./hero-visitor-chart";
import HeroFeedback from "./hero-feedback";
import HeroScreenStatus from "./hero-screen-status";
import HeroScreenSearch from "./hero-screen-search";
import styles from "./hero-scene-orbit.module.css";

/** Real controls and an opt-in live visitor chart, clipped to the laptop screen. */
export default function HeroScreen() {
  return (
    <div
      className={styles.screenLayer}
      role="group"
      aria-label="QUICKKIT laptop preview"
      style={{
        position: "absolute",
        inset: 0,
        clipPath:
          "polygon(22.95% 11.09%, 96.38% 4.89%, 93.60% 72.4%, 19.96% 71.2%)",
        pointerEvents: "auto",
        overflow: "hidden",
      }}
    >
      <div
        className={styles.screenPlane}
        data-screen-alignment="four-corner-v1"
        style={{
          position: "absolute",
          left: "22.95%",
          top: "11.09%",
          width: "73.43%",
          height: "60.11%",
          transformOrigin: "top left",
          // Four-corner projective fit to the photographed display. A plain
          // skew aligned only its top edge and lifted the bottom-right content.
          // 100cqw is the image width, so this stays exact at every viewport.
          transform:
            "perspective(100cqw) matrix3d(0.890510769900, -0.048104563565, 0.149106945527, 0, -0.077206044032, 0.993014936724, 0.018163296622, 0, 0, 0, 1, 0, 0, 0, 0, 1)",
          overflow: "hidden",
        }}
      >
        <div className={styles.miniSite}>
          <div className={styles.miniMain}>
            <div className={styles.brandLockup}>
              <span className={styles.screenLogo} aria-hidden="true">
                <Zap fill="currentColor" />
              </span>
              <strong className={styles.miniBrand}>QUICKKIT</strong>
            </div>
            <HeroScreenSearch />
            <HeroVisitorChart />
          </div>
          <HeroFeedback />
        </div>
        <HeroScreenStatus />
      </div>
    </div>
  );
}
