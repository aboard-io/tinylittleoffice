/**
 * Contract: an agreement in plain words, signed by the people agreeing.
 *
 * What a signature here is, and is not. Each person's browser holds a key of
 * its own (the same one the Signature menu uses). Signing puts their name,
 * their public key and a signature of the exact text into the document. It
 * proves that whoever holds that key signed these exact words: change a
 * letter and the signature no longer matches. It does not prove who holds
 * the key. The name is whatever was typed; to be sure a key is someone's,
 * compare its fingerprint with them directly.
 *
 * Document format (docs/tlo.md): a text, as Write writes it, then the
 * signatures in a fenced block of their own, a table of who, their public
 * key and their signature:
 *
 *   ```signatures
 *   Name | Key | Signature
 *   --- | --- | ---
 *   Paul | MFkw… | 3045…
 *   ```
 *
 * Each signature covers the text and the signer's own name, so a second
 * person signing does not disturb the first.
 */
import type { Kind as LineKind } from '../lib/lines.ts';
import { definePage, htmlPage } from '../lib/diagram.ts';
import { appOf, xml } from '../kit/core.ts';
import { parse, write, writeBlock, escapeInline } from '../lib/tlo.ts';
import { docText, parseDoc } from '../lib/richtext.ts';
import './write.def.ts';
import { docToHtml, readText } from './write.def.ts';

export interface Signature {
  name: string;
  key: string;
  sig: string;
}

/** The signatures' fence, at the very end. */
const SIGNED = /(?:^|\n)(`{3,})signatures[ \t]*\n([\s\S]*?)\n\1\s*$/;

export function parseContract(body: string): { text: string; signatures: Signature[] } {
  const m = SIGNED.exec(body);
  if (!m) return { text: body.trimEnd(), signatures: [] };
  const table = parse(m[2]).blocks.find((b) => b.k === 'table');
  const signatures = table?.k === 'table' ? table.rows.map(([name, key, sig]) => ({ name, key, sig })).filter((s) => s.key && s.sig) : [];
  return { text: body.slice(0, m.index).trimEnd(), signatures };
}

export function serializeContract(text: string, signatures: Signature[]): string {
  const words = text.trimEnd();
  if (!signatures.length) return words;
  const table = write({ head: {}, blocks: [{ k: 'table', head: ['Name', 'Key', 'Signature'], rows: signatures.map((s) => [s.name.replace(/\s+/g, ' ').trim(), s.key, s.sig]) }] }).trimEnd();
  return (words ? words + '\n\n' : '') + writeBlock({ k: 'fence', lang: 'signatures', body: table });
}

/** Exactly what a signature covers: the words, and the name signed under. */
export const signedMessage = (text: string, name: string) => `tinyoffice-contract\n${text.trim()}\n${name.trim()}`;

/** A key, short enough to read out and compare. */
export const keyMark = (key: string) => key.slice(-10);

/** Its title, or else its first heading. */
const title = (body: string) => {
  const blocks = parseDoc(parseContract(body).text);
  const head = blocks.find((b) => b.k === 'title') ?? blocks.find((b) => b.k === 'h1');
  return head ? docText([head]).trim() : '';
};

/** The text with its signatures written out beneath it, for anything that shows the contract. */
const withSignatures = (body: string) => {
  const c = parseContract(body);
  return c.text + (c.signatures.length ? '\n\n## Signed\n\n' + c.signatures.map((s) => `- *${escapeInline(s.name)}*, with the key ending ${escapeInline(keyMark(s.key))}`).join('\n') : '');
};

function page(body: string): string {
  const c = parseContract(body);
  return htmlPage(
    title(body) || 'Agreement',
    c.signatures.length ? `Signed by ${c.signatures.map((s) => s.name).join(' and ')}` : 'An agreement, not yet signed',
    `main{max-width:42rem;margin:0 auto;padding:3rem 1.25rem 5rem}h1{font-size:2rem}h2{font-size:1.25rem;margin-top:2rem}
.signed{margin-top:3rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:1.5rem}
.signed div{border-top:2px solid #18181b;padding-top:.5rem}.signed small{display:block;color:#52525b;font-size:.82rem;overflow-wrap:anywhere}`,
    `<main>
${docToHtml(c.text)}
${c.signatures.length ? `<div class="signed">${c.signatures.map((s) => `<div><strong>${xml(s.name)}</strong><small>Signed with the key ending ${xml(keyMark(s.key))}</small></div>`).join('')}</div>` : ''}
</main>`,
  );
}

export const spec = {
  form: [
    { name: 'Title', is: '# {Title}', once: true },
    { name: 'Heading', is: '## {Heading}', head: true },
    { name: 'Point', is: '- {Point}', indent: true },
    { name: 'Paragraph', is: '{Text:long}' },
  ] as LineKind[],
  hint: 'Write the agreement as Markdown ("# Title", "## Heading", "- point", **bold**). Each person types their name and signs; the link then carries their signature.',
  example: '# Dog-walking agreement\n\nBetween Paul and Sam, starting 1 March 2027.\n\n## What is agreed\n\n- Sam walks Biscuit every weekday at noon.\n- Paul pays $20 a walk, on Fridays.\n- Either can end this with a week of notice.',
  page,
};

export default definePage(
  {
    id: 'contract',
    name: 'Contract',
    icon: 'contract',
    group: 'Collaborate',
    blurb: 'A plain-words agreement that each party signs with a key held in their own browser.',
    title,
    outline: (body) => appOf('write')!.outline(withSignatures(body)),
    view: (body) => appOf('write')!.view(withSignatures(body)),
    // Markdown as anyone writes it is made a text; the signatures stay as they are.
    read: (body) => ((c) => serializeContract(readText(c.text), c.signatures))(parseContract(body)),
    steps: undefined,
  },
  spec,
);
