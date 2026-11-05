import { Zap } from "lucide-react";
import { tools } from "@/lib/catalog";
import HeroFeedback from "./hero-feedback";
import HeroScreenSearch from "./hero-screen-search";
import styles from "./hero-scene-orbit.module.css";

const chartCategories = [
  { label: "PDF", category: "PDF Tools" },
  { label: "Image", category: "Image Tools" },
  { label: "QR", category: "QR & Barcode" },
] as const;
const catalogReport = chartCategories.map((item) => ({
  ...item,
  count: tools.filter((tool) => tool.category === item.category).length,
}));
const largestCategory = Math.max(...catalogReport.map((item) => item.count), 1);

/** Real controls and a decorative 3D chart, clipped to the laptop screen. */
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
        background:
          "linear-gradient(118deg, #ffffff99 0%, #ffffff00 35%, #ffffff44 53%, #ffffff00 54%), linear-gradient(135deg, #f5fcff 0%, #e4f4fc 56%, #d4ebf8 100%)",
        pointerEvents: "auto",
        overflow: "hidden",
      }}
    >
      <div
        className={styles.screenPlane}
        style={{
          position: "absolute",
          left: "22.95%",
          top: "11.09%",
          width: "73.43%",
          height: "60.11%",
          transformOrigin: "top left",
          transform: "matrix(1, -.054, -.078, 1, 0, 0)",
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
            <div className={styles.catalogReport} aria-hidden="true">
              <div className={styles.chart}>
                <div className={styles.chartGrid} />
                {catalogReport.map((item) => (
                  <div key={item.label} className={styles.barColumn}>
                    <div
                      className={styles.chartBar}
                      style={{
                        height: `${(item.count / largestCategory) * 100}%`,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <HeroFeedback />
        </div>
      </div>
    </div>
  );
}
