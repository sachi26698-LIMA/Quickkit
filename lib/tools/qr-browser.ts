import { qrContrast, validateQrOptions, type QrOptions } from "./qr";

export type GeneratedQr = {
  pngDataUrl: string;
  svg: string;
  moduleCount: number;
  modulePixels: number;
  decodeVerified: boolean;
};

type QrMatrix = {
  modules: {
    size: number;
    get: (row: number, column: number) => number;
  };
};

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("The selected logo could not be decoded."));
    image.src = source;
  });
}

function isFinderZone(row: number, column: number, size: number) {
  const top = row < 8;
  const bottom = row >= size - 8;
  const left = column < 8;
  const right = column >= size - 8;
  return (top && left) || (top && right) || (bottom && left);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function finderShape(
  x: number,
  y: number,
  style: QrOptions["cornerStyle"],
  foreground: string,
  background: string,
) {
  if (style === "circle") {
    const centerX = x + 3.5;
    const centerY = y + 3.5;
    return [
      `<circle cx="${centerX}" cy="${centerY}" r="3.5" fill="${foreground}"/>`,
      `<circle cx="${centerX}" cy="${centerY}" r="2.5" fill="${background}"/>`,
      `<circle cx="${centerX}" cy="${centerY}" r="1.5" fill="${foreground}"/>`,
    ].join("");
  }

  const radius = style === "rounded";
  const roundedRect = (
    inset: number,
    dimension: number,
    fill: string,
    cornerRadius: number,
  ) =>
    `<rect x="${x + inset}" y="${y + inset}" width="${dimension}" height="${dimension}"${radius ? ` rx="${cornerRadius}"` : ""} fill="${fill}"/>`;

  return [
    roundedRect(0, 7, foreground, 1.2),
    roundedRect(1, 5, background, 0.75),
    roundedRect(2, 3, foreground, 0.35),
  ].join("");
}

function sanitizeSvg(svg: string) {
  const document = new DOMParser().parseFromString(svg, "image/svg+xml");
  if (document.querySelector("parsererror"))
    throw new Error("The SVG could not be safely prepared for download.");
  document
    .querySelectorAll(
      "script, foreignObject, iframe, object, embed, audio, video",
    )
    .forEach((node) => node.remove());
  for (const element of Array.from(document.querySelectorAll("*"))) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (
        name.startsWith("on") ||
        ((name === "href" || name === "xlink:href") &&
          !value.startsWith("data:image/png;base64,")) ||
        value.includes("javascript:") ||
        value.includes("url(http")
      )
        element.removeAttribute(attribute.name);
    }
  }
  return new XMLSerializer().serializeToString(document.documentElement);
}

function buildStyledSvg(
  qr: QrMatrix,
  options: QrOptions,
  logoDataUrl?: string,
) {
  const matrixSize = qr.modules.size;
  const qrModules = matrixSize + options.margin * 2;
  const frameInset = options.frameStyle === "none" ? 0 : 2;
  const captionHeight =
    options.frameStyle === "caption" || options.frameStyle === "poster" ? 5 : 0;
  const contentWidth = qrModules + frameInset * 2;
  const contentHeight = contentWidth + captionHeight;
  const transparentPadding = options.transparentBackground ? 2 : 0;
  const layoutWidth = contentWidth + transparentPadding * 2;
  const layoutHeight = contentHeight + transparentPadding * 2;
  const foreground =
    options.fillStyle === "gradient"
      ? "url(#qr-fill-gradient)"
      : options.foreground;
  const diamondBleed = 0.12;
  const squarePath: string[] = [];
  const customDots: string[] = [];

  for (let row = 0; row < matrixSize; row++) {
    for (let column = 0; column < matrixSize; column++) {
      if (!qr.modules.get(row, column) || isFinderZone(row, column, matrixSize))
        continue;
      const x = column + options.margin + frameInset + transparentPadding;
      const y = row + options.margin + frameInset + transparentPadding;
      if (options.dotStyle === "square") {
        squarePath.push(`M${x} ${y}h1v1h-1z`);
      } else if (options.dotStyle === "rounded") {
        customDots.push(
          `<rect x="${x}" y="${y}" width="1" height="1" rx="0.24" fill="${foreground}"/>`,
        );
      } else if (options.dotStyle === "dots") {
        customDots.push(
          `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.52" fill="${foreground}"/>`,
        );
      } else {
        customDots.push(
          `<path d="M${x + 0.5} ${y - diamondBleed}L${x + 1 + diamondBleed} ${y + 0.5}L${x + 0.5} ${y + 1 + diamondBleed}L${x - diamondBleed} ${y + 0.5}Z" fill="${foreground}"/>`,
        );
      }
    }
  }

  const finderPositions = [
    [0, 0],
    [matrixSize - 7, 0],
    [0, matrixSize - 7],
  ];
  const finderMarkup = finderPositions
    .map(([column, row]) =>
      finderShape(
        column + options.margin + frameInset + transparentPadding,
        row + options.margin + frameInset + transparentPadding,
        options.cornerStyle,
        options.eyeColor,
        options.background,
      ),
    )
    .join("");
  const gradientMarkup =
    options.fillStyle === "gradient"
      ? `<linearGradient id="qr-fill-gradient" x1="${transparentPadding}" y1="${transparentPadding}" x2="${layoutWidth - transparentPadding}" y2="${layoutHeight - transparentPadding}" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="${options.foreground}"/><stop offset="100%" stop-color="${options.gradientEnd}"/></linearGradient>`
      : "";
  const frameMarkup =
    options.frameStyle === "none"
      ? ""
      : `<rect x="${transparentPadding + 0.35}" y="${transparentPadding + 0.35}" width="${contentWidth - 0.7}" height="${contentHeight - 0.7}" rx="${options.frameStyle === "poster" ? 1.6 : 1}" fill="${options.transparentBackground ? "none" : options.frameColor}" stroke="${options.frameStyle === "outline" ? options.frameTextColor : options.frameColor}" stroke-width="0.35"/>`;
  const qrBackgroundMarkup = `<rect x="${transparentPadding + frameInset}" y="${transparentPadding + frameInset}" width="${qrModules}" height="${qrModules}" fill="${options.background}"/>`;
  const captionMarkup = captionHeight
    ? `<text x="${transparentPadding + contentWidth / 2}" y="${transparentPadding + contentHeight - 1.8}" text-anchor="middle" dominant-baseline="middle" fill="${options.frameTextColor}" font-family="Arial, Helvetica, sans-serif" font-size="1.55" font-weight="700" letter-spacing="0.12">${escapeXml(options.frameCaption.trim() || "SCAN ME")}</text>`
    : "";
  const logoMarkup = logoDataUrl
    ? (() => {
        const plate = matrixSize * options.logoScale;
        const padding = plate * options.logoPadding;
        const centerX =
          transparentPadding +
          frameInset +
          options.margin +
          matrixSize * options.logoX;
        const centerY =
          transparentPadding +
          frameInset +
          options.margin +
          matrixSize * options.logoY;
        const x = centerX - plate / 2;
        const y = centerY - plate / 2;
        return `${options.logoPlate ? `<rect x="${x}" y="${y}" width="${plate}" height="${plate}" rx="${plate * 0.08}" fill="${options.logoBackground}"/>` : ""}<image x="${x + padding}" y="${y + padding}" width="${plate - padding * 2}" height="${plate - padding * 2}" preserveAspectRatio="xMidYMid meet" href="${logoDataUrl}"/>`;
      })()
    : "";
  const moduleMarkup = [
    squarePath.length
      ? `<path fill="${foreground}" d="${squarePath.join("")}"/>`
      : "",
    ...customDots,
    finderMarkup,
    logoMarkup,
  ].join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}" viewBox="0 0 ${layoutWidth} ${layoutHeight}" preserveAspectRatio="xMidYMid meet"><defs>${gradientMarkup}</defs>${frameMarkup}${qrBackgroundMarkup}${moduleMarkup}${captionMarkup}</svg>`;
}

async function normalizeLogo(logoDataUrl: string) {
  const image = await loadImage(logoDataUrl);
  const maxSide = 512;
  const scale = Math.min(
    1,
    maxSide / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not process the logo.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

/** Render the QR matrix to safe styled SVG and raster, then decode the raster locally. */
export async function generateQrAssets(
  payload: string,
  options: QrOptions,
  logoDataUrl?: string,
): Promise<GeneratedQr> {
  validateQrOptions(options);
  const qrcodeModule = await import("qrcode");
  const qrcode = qrcodeModule.default;
  const qr = qrcode.create(payload, {
    errorCorrectionLevel: options.errorLevel,
  });
  const normalizedLogo = logoDataUrl
    ? await normalizeLogo(logoDataUrl)
    : undefined;
  const svg = sanitizeSvg(buildStyledSvg(qr, options, normalizedLogo));
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = options.width;
    canvas.height = options.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Your browser could not create a QR canvas.");
    context.drawImage(image, 0, 0, options.width, options.height);
    const pngDataUrl = canvas.toDataURL("image/png");
    const scanCanvas = document.createElement("canvas");
    scanCanvas.width = options.width;
    scanCanvas.height = options.height;
    const scanContext = scanCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!scanContext)
      throw new Error("Your browser could not validate the QR.");
    scanContext.fillStyle = options.transparentBackground
      ? options.background
      : options.background;
    scanContext.fillRect(0, 0, options.width, options.height);
    scanContext.drawImage(image, 0, 0, options.width, options.height);
    const pixels = scanContext.getImageData(
      0,
      0,
      options.width,
      options.height,
    );
    const jsQrModule = await import("jsqr");
    const decoded = jsQrModule.default(
      pixels.data,
      pixels.width,
      pixels.height,
      { inversionAttempts: "attemptBoth" },
    );
    const contrast = qrContrast(options);
    const outputScale = Math.min(
      options.width / layoutSize(qr, options),
      options.height / layoutHeight(qr, options),
    );
    const modulePixels = outputScale;
    return {
      pngDataUrl,
      svg,
      moduleCount: qr.modules.size,
      modulePixels,
      decodeVerified: decoded?.data === payload && contrast >= 3,
    };
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function layoutSize(qr: QrMatrix, options: QrOptions) {
  const inset = options.frameStyle === "none" ? 0 : 2;
  const transparentPadding = options.transparentBackground ? 2 : 0;
  return (
    qr.modules.size + options.margin * 2 + inset * 2 + transparentPadding * 2
  );
}

function layoutHeight(qr: QrMatrix, options: QrOptions) {
  const caption =
    options.frameStyle === "caption" || options.frameStyle === "poster" ? 5 : 0;
  return layoutSize(qr, options) + caption;
}
