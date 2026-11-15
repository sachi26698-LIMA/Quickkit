/**
 * Check-digit maths for the barcode studio.
 *
 * Every function is total: it returns a digit or `null`, never throws, so the
 * validator can turn a `null` into a sentence a person can act on.
 */

/**
 * GS1 mod-10 check digit (EAN-13, EAN-8, UPC-A, UPC-E, GTIN-14, SSCC-18).
 *
 * Weights run 3,1,3,1… from the right of the payload, which is the same as
 * 1,3,1,3… from the left for an odd-length payload — the caller passes the
 * digits *without* the check digit.
 */
export function gtinCheckDigit(payload: string): number | null {
  if (!/^\d+$/.test(payload)) return null;
  let sum = 0;
  for (let index = payload.length - 1, weight = 3; index >= 0; index -= 1) {
    sum += Number(payload[index]) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  return (10 - (sum % 10)) % 10;
}

/** True when `value` (digits including its check digit) passes mod-10. */
export function gtinCheckOk(value: string): boolean {
  if (!/^\d{2,}$/.test(value)) return false;
  const body = value.slice(0, -1);
  return gtinCheckDigit(body) === Number(value[value.length - 1]);
}

/** Code 39 mod-43 check character. */
const CODE39_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%";

export function code39CheckChar(data: string): string | null {
  let sum = 0;
  for (const char of data) {
    const value = CODE39_ALPHABET.indexOf(char);
    if (value < 0) return null;
    sum += value;
  }
  return CODE39_ALPHABET[sum % 43];
}

/**
 * MSI mod-10 (Luhn-style, doubling the digits in even positions counted from
 * the right) and mod-11 (weights 2–7 cycling from the right).
 */
export function msiMod10(payload: string): number | null {
  if (!/^\d+$/.test(payload)) return null;
  let sum = 0;
  for (let index = 0; index < payload.length; index += 1) {
    const digit = Number(payload[index]);
    if ((index + payload.length) % 2 === 0) sum += digit;
    else sum += ((digit * 2) % 10) + Math.floor((digit * 2) / 10);
  }
  return (10 - (sum % 10)) % 10;
}

/** MSI mod-11. Returns null when the check value is 10 (not a digit). */
export function msiMod11(payload: string): number | null {
  if (!/^\d+$/.test(payload)) return null;
  const weights = [2, 3, 4, 5, 6, 7];
  let sum = 0;
  for (let index = 0; index < payload.length; index += 1) {
    const digit = Number(payload[payload.length - 1 - index]);
    sum += weights[index % weights.length] * digit;
  }
  const check = (11 - (sum % 11)) % 11;
  return check === 10 ? null : check;
}

/**
 * Normalise a UPC-E eight-digit form to the twelve-digit UPC-A it stands for.
 * Returns null for a middle that cannot be expanded (last digit 5–9 and a
 * non-zero fifth digit, etc.).
 */
export function upceToUpca(body6: string, numberSystem: 0 | 1): string | null {
  if (!/^\d{6}$/.test(body6)) return null;
  const d = body6.split("");
  const last = d[5];
  let body: string;
  if (last === "0" || last === "1" || last === "2") {
    body = `${d[0]}${d[1]}${last}0000${d[2]}${d[3]}${d[4]}`;
  } else if (last === "3") {
    body = `${d[0]}${d[1]}${d[2]}00000${d[3]}${d[4]}`;
  } else if (last === "4") {
    body = `${d[0]}${d[1]}${d[2]}${d[3]}00000${d[4]}`;
  } else {
    body = `${d[0]}${d[1]}${d[2]}${d[3]}${d[4]}0000${last}`;
  }
  const payload = `${numberSystem}${body}`;
  const check = gtinCheckDigit(payload);
  return check === null ? null : `${payload}${check}`;
}
