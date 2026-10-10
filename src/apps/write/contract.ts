/**
 * A contract: a text that ends in a signatures fence, a table of who signed, with what key, the signature and
 * the day (Name | Key | Signature | Signed). Each person signs with their own device's key (kit/sign.ts
 * through kit/privacy.ts); a second signer opens the same link and signs under the first.
 *
 * What a signature covers is the old tree's message, exactly, so its signed contracts verify here: the
 * contract's words (everything but the fence, as the kernel writes them, with the document's own head
 * fields) and the signer's own name. A second signature does not disturb the first; a change to the words
 * breaks every one until each is signed again. The day is the signer's word, not signed (as in the old tree).
 *
 * What a signature proves: that whoever holds that key signed these exact words under that name. Not who
 * holds the key: the fingerprint is there to compare with the signer.
 *
 * Verifying is WebCrypto, so it is asynchronous; drawing is not. checkContract() verifies a document's
 * signatures and keeps each answer (and each key's fingerprint), and verdictOf() reads them back at once:
 * the editor checks on open and after every change, so the printed page, drawn at once, says what it found.
 */
import { parse, write, type Block, type Doc, type Op } from '../../doc/index.ts';
import { canCheck, fingerprintOf, verify } from '../../kit/sign.ts';
import { t } from '../../kit/i18n.ts';
import { fieldsOf } from './model.ts';

export interface Signature {
  name: string;
  key: string;
  sig: string;
  /** The day it was signed, YYYY-MM-DD, as the signer's device gave it ('' in old contracts). */
  date: string;
}

export const COLUMNS = ['Name', 'Key', 'Signature', 'Signed'];

/** Exactly what a signature covers: the words, and the name signed under (the old tree's contract.def.ts). */
export const signedMessage = (text: string, name: string) => `tinyoffice-contract\n${text.trim()}\n${name.trim()}`;

/** A key, short enough to read out, where its fingerprint is not known yet. */
export const keyMark = (key: string) => key.slice(-10);

/** Where the signatures fence stands; -1 when there is none. */
export const signaturesAt = (doc: Doc): number => doc.blocks.findIndex((b) => b.k === 'fence' && b.lang === 'signatures');

/** The rows of a signatures fence's body: a name with no key is a party yet to sign. */
export function readSignatures(body: string): Signature[] {
  const table = parse(body).blocks.find((b) => b.k === 'table');
  if (table?.k !== 'table') return [];
  return table.rows.map(([name = '', key = '', sig = '', date = '']) => ({ name: name.trim(), key: key.trim(), sig: sig.trim(), date: date.trim() })).filter((s) => s.name || s.key);
}

/** The body of a signatures fence: the table with its four columns, a name on one line. */
export const writeSignatures = (rows: Signature[]): string =>
  write({ head: {}, blocks: [{ k: 'table', cols: COLUMNS.map((name) => ({ name, type: 'text' })), rows: rows.map((s) => [s.name.replace(/\s+/g, ' ').trim(), s.key, s.sig, s.date]) }] }).trimEnd();

/** The signatures of a document, in order. */
export function signaturesOf(doc: Doc): Signature[] {
  const b = doc.blocks[signaturesAt(doc)];
  return b?.k === 'fence' ? readSignatures(b.body) : [];
}

/** The contract's words: the document but its signatures, as the kernel writes it. */
export function contractText(doc: Doc): string {
  const at = signaturesAt(doc);
  return write({ head: Object.fromEntries(fieldsOf(doc)), blocks: doc.blocks.filter((_, i) => i !== at) });
}

/** A contract's text read into its words and its signatures (the old tree's parseContract, over the kernel). */
export function parseContract(text: string): { text: string; signatures: Signature[] } {
  const doc = parse(text);
  return { text: contractText(doc).trimEnd(), signatures: signaturesOf(doc) };
}

/** Words and signatures written as one text: the signatures fence at the end (none when nobody has signed). */
export function serializeContract(text: string, signatures: Signature[]): string {
  const doc = parse(text);
  return write(signatures.length ? { ...doc, blocks: [...doc.blocks, { k: 'fence', lang: 'signatures', body: writeSignatures(signatures) }] } : doc);
}

/**
 * The ops that put a signature in: in place of the row this key signed before (signing again after a change), else
 * of the row waiting under this name, else after the rest. Nothing when the document has no signatures fence.
 */
export function signOps(doc: Doc, s: Signature): Op[] {
  const at = signaturesAt(doc);
  const b = doc.blocks[at];
  if (b?.k !== 'fence') return [];
  const rows = readSignatures(b.body);
  let i = rows.findIndex((r) => r.key && r.key === s.key);
  if (i < 0) i = rows.findIndex((r) => !r.sig && r.name.toLowerCase() === s.name.trim().toLowerCase());
  const next = i < 0 ? [...rows, s] : rows.map((r, j) => (j === i ? s : r));
  const block: Block = { ...b, body: writeSignatures(next) };
  return [{ op: 'splice', at, n: 1, blocks: [block] }];
}

/* ---------- checked ---------- */

/**
 * A row as it stands against the words: signed and holding, signed and not (the words changed), not signed yet,
 * or signed with a kind of key this browser cannot check (Ed25519 where it has none), which is not the same as
 * not matching (kit/sign.ts canCheck, as the document's own signature: kit/privacy.ts checkSignature).
 */
export type Verdict = 'valid' | 'mismatch' | 'unsigned' | 'unchecked';

const verdicts = new Map<string, Verdict>();
const prints = new Map<string, string>();
const keyOf = (text: string, s: Signature) => `${s.key}\u0000${s.sig}\u0000${signedMessage(text, s.name)}`;

/** What is known of a row against these words; undefined while it has not been checked. */
export function verdictOf(text: string, s: Signature): Verdict | undefined {
  if (!s.key || !s.sig) return 'unsigned';
  return verdicts.get(keyOf(text, s));
}

/** A key's fingerprint as the Privacy dialog shows it, once checked; its last characters before. */
export const printOf = (key: string): string => prints.get(key) ?? keyMark(key);

/** Every signature of the document verified against its words, and the answers kept; the verdicts in order. */
export async function checkContract(doc: Doc): Promise<Verdict[]> {
  const text = contractText(doc);
  const rows = signaturesOf(doc);
  if (verdicts.size > 500) verdicts.clear();
  return Promise.all(
    rows.map(async (s) => {
      if (!s.key || !s.sig) return 'unsigned' as const;
      const k = keyOf(text, s);
      if (!verdicts.has(k)) {
        const [ok, can] = await Promise.all([verify(s.key, s.sig, signedMessage(text, s.name)), canCheck(s.key)]);
        verdicts.set(k, ok ? 'valid' : can ? 'mismatch' : 'unchecked');
      }
      if (!prints.has(s.key)) prints.set(s.key, await fingerprintOf(s.key).catch(() => keyMark(s.key)));
      return verdicts.get(k)!;
    }),
  );
}

/** The day as a signature records it: the signer's own calendar. */
export function today(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** A row as a printed signature block draws it: the name, and a line of the day, the key and what the check found. */
export interface Printed {
  name: string;
  detail: string;
  /** 'unchecked' when it has not been checked here, or cannot be. */
  verdict: Verdict;
}

/** The signatures as print and the files draw them: each checked as last verified, here, before printing. */
export function printedSignatures(doc: Doc, at: number): Printed[] {
  const b = doc.blocks[at];
  if (b?.k !== 'fence') return [];
  const text = contractText(doc);
  return readSignatures(b.body).map((s) => {
    const v = verdictOf(text, s) ?? 'unchecked';
    const state = { valid: t('verified'), mismatch: t('does not match these words'), unsigned: t('not signed'), unchecked: t('not checked') }[v];
    const detail = s.key ? [s.date && t('Signed {date}', { date: s.date }), t('key {fp}', { fp: printOf(s.key) }), state].filter(Boolean).join(' · ') : state;
    return { name: s.name || t('Unnamed'), detail, verdict: v };
  });
}
