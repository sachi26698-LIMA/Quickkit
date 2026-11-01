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

function buildStyledSvg(
  qr: QrMatrix,
  options: QrOptions,
  logoDataUrl?: string,
) {
  const matrixSize = qr.modules.size;
  const totalModules = matrixSize + options.margin * 2;
  const foreground =
    options.fillStyle === "gradient"
      ? "url(#qr-fill-gradient)"
      : options.foreground;
  const squarePath: string[] = [];
  const customDots: string[] = [];

  for (let row = 0; row < matrixSize; row++) {
    for (let column = 0; column < matrixSize; column++) {
      if (!qr.modules.get(row, column) || isFinderZone(row, column, matrixSize))
        continue;
      const x = column + options.margin;
      const y = row + options.margin;
      if (options.dotStyle === "square") {
        squarePath.push(`M${x} ${y}h1v1h-1z`);
      } else if (options.dotStyle === "rounded") {
        customDots.push(
          `<rect x="${x}" y="${y}" width="1" height="1" rx="0.24" fill="${foreground}"/>`,
        );
      } else {
        customDots.push(
          `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.52" fill="${foreground}"/>`,
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
        column + options.margin,
        row + options.margin,
        options.cornerStyle,
        foreground,
        options.background,
      ),
    )
    .join("");
  const gradientMarkup =
    options.fillStyle === "gradient"
      ? `<linearGradient id="qr-fill-gradient" x1="0" y1="0" x2="${totalModules}" y2="${totalModules}" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="${options.foreground}"/><stop offset="100%" stop-color="${options.gradientEnd}"/></linearGradient>`
      : "";
  const logoMarkup = logoDataUrl
    ? (() => {
        const plate = totalModules * options.logoScale;
        const inset = plate * 0.12;
        const x = (totalModules - plate) / 2;
        return `<rect x="${x}" y="${x}" width="${plate}" height="${plate}" rx="${plate * 0.08}" fill="${options.background}"/><image x="${x + inset}" y="${x + inset}" width="${plate - inset * 2}" height="${plate - inset * 2}" preserveAspectRatio="xMidYMid meet" href="${logoDataUrl}"/>`;
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

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${options.size}" height="${options.size}" viewBox="0 0 ${totalModules} ${totalModules}"><defs>${gradientMarkup}</defs><rect width="${totalModules}" height="${totalModules}" fill="${options.background}"/>${moduleMarkup}</svg>`;
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

/** Render the QR matrix to styled SVG and PNG, then decode the exact raster locally. */
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
  const svg = buildStyledSvg(qr, options, normalizedLogo);
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = options.size;
    canvas.height = options.size;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Your browser could not create a QR canvas.");
    context.drawImage(image, 0, 0, options.size, options.size);
    const pngDataUrl = canvas.toDataURL("image/png");
    const pixels = context.getImageData(0, 0, options.size, options.size);
    const jsQrModule = await import("jsqr");
    const decoded = jsQrModule.default(
      pixels.data,
      pixels.width,
      pixels.height,
      { inversionAttempts: "attemptBoth" },
    );
    const contrast = qrContrast(options);
    const modulePixels = options.size / (qr.modules.size + options.margin * 2);
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
