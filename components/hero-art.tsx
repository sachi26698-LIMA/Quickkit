/* Local optimized reference render and CSS-layered animated tool cards. */
/* eslint-disable @next/next/no-img-element */
import Icon3D from "./icon-3d";
import styles from "./hero-scene-orbit.module.css";
import HeroMotion from "./hero-motion";
import HeroBubbleIcon from "./hero-bubble-icon";
import HeroScreen from "./hero-screen";
import LaptopColourControls from "./laptop-colour-controls";
import { LAPTOP_FINISHES, laptopFinishStyle } from "@/lib/laptop-finishes";
import finishStyles from "./laptop-colour-studio.module.css";

export default function HeroArt() {
  return (
    <HeroMotion>
      <div className={styles.halo} aria-hidden="true" />
      <div className={styles.orbit} aria-hidden="true" />
      <div className={styles.groundShadow} aria-hidden="true" />
      <div className={styles.contactShadow} aria-hidden="true" />
      <div className={`${styles.tile} ${styles.pdf}`}>
        <HeroBubbleIcon label="PDF icon">
          <div className={styles.glassFace}>
            <Icon3D
              name="mergePdf"
              tone="violet"
              size={112}
              className={styles.orbitArt}
            />
          </div>
        </HeroBubbleIcon>
      </div>
      <div className={`${styles.tile} ${styles.image}`}>
        <HeroBubbleIcon label="Image icon">
          <div className={styles.glassFace}>
            <Icon3D
              name="imgCompress"
              tone="coral"
              size={112}
              className={styles.orbitArt}
            />
          </div>
        </HeroBubbleIcon>
      </div>
      <div className={`${styles.tile} ${styles.qr}`}>
        <HeroBubbleIcon label="QR icon">
          <div className={styles.glassFace}>
            <Icon3D
              name="qrScan"
              tone="crimson"
              size={112}
              className={styles.orbitArt}
            />
          </div>
        </HeroBubbleIcon>
      </div>
      <div className={`${styles.tile} ${styles.lock}`}>
        <HeroBubbleIcon label="Key icon">
          <div className={styles.glassFace}>
            <Icon3D
              name="key"
              tone="emerald"
              size={112}
              className={styles.orbitArt}
            />
          </div>
        </HeroBubbleIcon>
      </div>
      <div className={`${styles.tile} ${styles.code}`}>
        <HeroBubbleIcon label="Code icon">
          <div className={styles.glassFace}>
            <Icon3D
              name="json"
              tone="indigo"
              size={112}
              className={styles.orbitArt}
            />
          </div>
        </HeroBubbleIcon>
      </div>
      <div className={`${styles.tile} ${styles.calculator}`}>
        <HeroBubbleIcon label="Calculator icon">
          <div className={styles.glassFace}>
            <Icon3D
              name="percent"
              tone="azure"
              size={112}
              className={styles.orbitArt}
            />
          </div>
        </HeroBubbleIcon>
      </div>
      <div className={`${styles.tile} ${styles.scissors}`}>
        <HeroBubbleIcon label="Crop icon">
          <div className={styles.glassFace}>
            <Icon3D
              name="crop"
              tone="rose"
              size={112}
              className={styles.orbitArt}
            />
          </div>
        </HeroBubbleIcon>
      </div>
      <div className={`${styles.tile} ${styles.text}`}>
        <HeroBubbleIcon label="Text icon">
          <div className={styles.glassFace}>
            <Icon3D
              name="wordCount"
              tone="amber"
              size={72}
              className={styles.orbitArt}
            />
          </div>
        </HeroBubbleIcon>
      </div>
      <div className={`${styles.tile} ${styles.shield}`}>
        <HeroBubbleIcon label="Security icon">
          <div className={styles.glassFace}>
            <Icon3D
              name="shield"
              tone="teal"
              size={72}
              className={styles.orbitArt}
            />
          </div>
        </HeroBubbleIcon>
      </div>
      <div className={`${styles.tile} ${styles.clock}`}>
        <HeroBubbleIcon label="Clock icon">
          <div className={styles.glassFace}>
            <Icon3D
              name="clock"
              tone="magenta"
              size={72}
              className={styles.orbitArt}
            />
          </div>
        </HeroBubbleIcon>
      </div>
      <div className={`${styles.tile} ${styles.swap}`}>
        <HeroBubbleIcon label="Image converter icon">
          <div className={styles.glassFace}>
            <Icon3D
              name="imgSwap"
              tone="cyan"
              size={72}
              className={styles.orbitArt}
            />
          </div>
        </HeroBubbleIcon>
      </div>
      <div className={`${styles.tile} ${styles.calendar}`}>
        <HeroBubbleIcon label="Calendar icon">
          <div className={styles.glassFace}>
            <Icon3D
              name="calendar"
              tone="plum"
              size={72}
              className={styles.orbitArt}
            />
          </div>
        </HeroBubbleIcon>
      </div>
      <div
        className={`${styles.laptop} ${finishStyles.finish}`}
        style={laptopFinishStyle()}
        data-laptop-body="studio-v2"
        data-finish-phase="holding"
        data-finish-running="false"
      >
        {/* Colour is composited with the image in one paint. It must not wait
            for a separately downloaded CSS mask or for client hydration. */}
        <svg
          className={finishStyles.metalFilter}
          aria-hidden="true"
          focusable="false"
          width="0"
          height="0"
        >
          <defs>
            <filter
              id="quickkit-laptop-metal"
              x="0"
              y="0"
              width="100%"
              height="100%"
              colorInterpolationFilters="sRGB"
            >
              <feColorMatrix
                in="SourceGraphic"
                type="saturate"
                values="0"
                result="silver"
              />
              <feComponentTransfer in="silver" result="metal">
                <feFuncR type="linear" slope="1.07" />
                <feFuncG type="linear" slope="1.07" />
                <feFuncB type="linear" slope="1.07" />
              </feComponentTransfer>
              <feFlood
                className={finishStyles.tint}
                floodColor={`rgb(${LAPTOP_FINISHES[0].rgb})`}
                result="paint"
              />
              <feBlend in="paint" in2="metal" mode="color" result="coloured" />
              <feComposite
                in="coloured"
                in2="metal"
                operator="arithmetic"
                k2="0.46"
                k3="0.54"
                result="softMetal"
              />
              <feComposite in="softMetal" in2="SourceGraphic" operator="in" />
            </filter>
          </defs>
        </svg>
        <img
          src="/hero-laptop-reference.webp"
          width={1438}
          height={920}
          alt=""
          draggable={false}
          fetchPriority="high"
          decoding="sync"
          loading="eager"
          crossOrigin="anonymous"
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            maxWidth: "100%",
            objectFit: "contain",
          }}
        />
        <HeroScreen />
        <span className={finishStyles.reflection} aria-hidden="true" />
      </div>
      <LaptopColourControls />
    </HeroMotion>
  );
}
