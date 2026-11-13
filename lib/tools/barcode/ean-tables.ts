/**
 * EAN/UPC module tables and the tiny structural types the reader shares.
 *
 * Kept in their own module so the UPC-E reader can import the tables without
 * pulling the encoders (and the GS1 grammar) into the scanner bundle.
 */

/** Structural shape of ZXing's BitMatrix, which is not exported by the package. */
export type BitRow = {
  get(x: number, y: number): boolean | number | null;
  getWidth(): number;
  getHeight(): number;
};

/** L (odd) digit patterns, 7 modules each, starting with a space. */
export const EAN_L = [
  "0001101",
  "0011001",
  "0010011",
  "0111101",
  "0100011",
  "0110001",
  "0101111",
  "0111011",
  "0110111",
  "0001011",
];

/** G (even) digit patterns, 7 modules each, starting with a space. */
export const EAN_G = [
  "0100111",
  "0110011",
  "0011011",
  "0100001",
  "0011101",
  "0111001",
  "0000101",
  "0010001",
  "0001001",
  "0010111",
];

/** R (right) digit patterns, 7 modules each, starting with a bar. */
export const EAN_R = [
  "1110010",
  "1100110",
  "1101100",
  "1000010",
  "1011100",
  "1001110",
  "1010000",
  "1000100",
  "1001000",
  "1110100",
];

/** Parity of the six left-hand digits, indexed by the leading digit. */
export const EAN13_PARITY = [
  "LLLLLL",
  "LLGLGG",
  "LLGGLG",
  "LLGGGL",
  "LGLLGG",
  "LGGLLG",
  "LGGGLL",
  "LGLGLG",
  "LGLGGL",
  "LGGLGL",
];

/** UPC-E parity, indexed by check digit, for number system 0 (1 is inverted). */
export const UPCE_PARITY = [
  "EEEOOO",
  "EEOEOO",
  "EEOOEO",
  "EEOOOE",
  "EOEEOO",
  "EOOEEO",
  "EOOOEE",
  "EOEOEO",
  "EOEOOE",
  "EOOEOE",
];

export const EAN_SIDE_GUARD = "101";
export const EAN_CENTRE_GUARD = "01010";
