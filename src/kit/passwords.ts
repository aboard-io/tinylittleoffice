/**
 * A strong password made here, for the Password dialog (Paul, 2026-10-10: "Give me an option to generate
 * secure passwords"). Twenty characters from an alphabet of 58 (letters and digits with the look-alikes l, I,
 * 1, O and 0 left out) chosen with crypto.getRandomValues by rejection, so every character is equally
 * likely: about 117 bits. Written in four groups of five with dashes so it can be read aloud and typed on a
 * phone; the dashes are part of the password.
 */
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** `n` random characters of the alphabet, each chosen uniformly. */
function draw(n: number): string {
  const out: string[] = [];
  const limit = 256 - (256 % ALPHABET.length);
  const buf = new Uint8Array(n * 2);
  while (out.length < n) {
    crypto.getRandomValues(buf);
    for (const b of buf) {
      if (b < limit) out.push(ALPHABET[b % ALPHABET.length]);
      if (out.length === n) break;
    }
  }
  return out.join('');
}

/** A new password: four groups of five, "k7Rwm-Xq9Pz-…". */
export function generatePassword(groups = 4, each = 5): string {
  return Array.from({ length: groups }, () => draw(each)).join('-');
}
export const PASSWORD_ALPHABET = ALPHABET;

/**
 * How hard a password is to guess, in bits: its length times log2 of the character sets it draws on (lower case,
 * upper case, digits, the rest), the guess an offline attacker starts from. One of the commonest passwords, in any
 * case and with up to two digits or a mark after it, is next to nothing, and so is a run of one character. A
 * rough estimate on purpose (no library): it only has to tell "1" and "password" from twenty random characters.
 */
const COMMON = new Set(
  (
    'password passw0rd 123456 12345678 123456789 1234567890 qwerty qwertyuiop abc123 abcdef abcdefg letmein welcome ' +
    'monkey dragon iloveyou admin login princess football baseball sunshine master shadow superman trustno1 ' +
    'starwars whatever freedom secret hello hunter charlie michael jessica azerty 111111 000000 123123 654321'
  ).split(' '),
);
export function strength(password: string): number {
  const p = password.normalize('NFKC');
  if (!p) return 0;
  const bare = p.toLowerCase().replace(/[\d!?.]{1,2}$/, '');
  if (COMMON.has(p.toLowerCase()) || COMMON.has(bare) || new Set(p).size === 1) return Math.log2(1000);
  let set = 0;
  if (/[a-z]/.test(p)) set += 26;
  if (/[A-Z]/.test(p)) set += 26;
  if (/\d/.test(p)) set += 10;
  if (/[^a-zA-Z\d]/.test(p)) set += 33;
  return [...p].length * Math.log2(set);
}
/** Below this, someone holding the link guesses the password offline in reach of a home computer. */
export const GUESSABLE_BITS = 50;
export const guessable = (password: string): boolean => strength(password) < GUESSABLE_BITS;
