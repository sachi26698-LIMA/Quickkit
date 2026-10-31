export const characterSets = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?",
};
export type PasswordOptions = {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
};
export const defaultPasswordOptions: PasswordOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
};
function randomIndex(max: number) {
  if (!globalThis.crypto?.getRandomValues)
    throw new Error(
      "Secure randomness is unavailable in this browser. Try a current browser over HTTPS.",
    );
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % max;
}
export function generatePassword(options: PasswordOptions) {
  if (
    !Number.isInteger(options.length) ||
    options.length < 8 ||
    options.length > 64
  )
    throw new Error("Choose a password length from 8 to 64.");
  const sets = Object.entries(characterSets)
    .filter(([key]) => options[key as keyof typeof characterSets])
    .map(([, value]) =>
      options.excludeAmbiguous ? value.replace(/[Il1O0o|]/g, "") : value,
    );
  if (!sets.length) throw new Error("Select at least one character set.");
  const pool = sets.join("");
  const chars = sets.map((set) => set[randomIndex(set.length)]);
  while (chars.length < options.length)
    chars.push(pool[randomIndex(pool.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
