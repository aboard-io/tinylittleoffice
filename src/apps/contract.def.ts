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
 * Document format: the text (Write's markup), then one line per signature:
 * "~<name>\t<public key>\t<signature>". Each signature covers the text and
 * the signer's own name, so a second person signing does not disturb the first.
 */
import { definePage, htmlPage } from '../lib/diagram.ts';
import { appOf, xml } from '../kit/core.ts';
import './write.def.ts';
import { docToHtml } from './write.def.ts';

export interface Signature {
  name: string;
  key: string;
  sig: string;
}

export function parseContract(body: string): { text: string; signatures: Signature[] } {
  const lines = body.split('\n');
  const signatures = lines.filter((l) => l.startsWith('~')).map((l) => l.slice(1).split('\t')).filter((p) => p.length === 3).map(([name, key, sig]) => ({ name, key, sig }));
  return { text: lines.filter((l) => !l.startsWith('~')).join('\n').replace(/\n+$/, ''), signatures };
}

export function serializeContract(text: string, signatures: Signature[]): string {
  // (A line of the text may not start with "~": that is how signatures are told apart.)
  const safe = text.split('\n').map((l) => (l.startsWith('~') ? ' ' + l : l)).join('\n').replace(/\n+$/, '');
  return [safe, ...signatures.map((s) => `~${s.name.replace(/[\t\n]/g, ' ')}\t${s.key}\t${s.sig}`)].join('\n');
}

/** Exactly what a signature covers: the words, and the name signed under. */
export const signedMessage = (text: string, name: string) => `tinyoffice-contract\n${text.trim()}\n${name.trim()}`;

/** A key, short enough to read out and compare. */
export const keyMark = (key: string) => key.slice(-10);

const title = (body: string) => /^#\s+(.*)$/m.exec(parseContract(body).text)?.[1].trim() ?? '';

/** The text with its signatures written out beneath it, for anything that shows the contract. */
const withSignatures = (body: string) => {
  const c = parseContract(body);
  return c.text + (c.signatures.length ? '\n## Signed\n' + c.signatures.map((s) => `- *${s.name}*, with the key ending ${keyMark(s.key)}`).join('\n') : '');
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
  hint: 'Write the agreement ("# Title", "## Heading", "- point"). Each person types their name and signs; the link then carries their signature.',
  example: '# Dog-walking agreement\nBetween Paul and Sam, starting 1 March 2027.\n## What is agreed\n- Sam walks Biscuit every weekday at noon.\n- Paul pays $20 a walk, on Fridays.\n- Either can end this with a week of notice.',
  page,
};

export default definePage(
  {
    id: 'contract',
    name: 'Contract',
    icon: 'contract',
    group: 'Publish and sell',
    blurb: 'A plain-words agreement that each party signs with a key held in their own browser.',
    title,
    outline: (body) => appOf('write')!.outline(withSignatures(body)),
    view: (body) => appOf('write')!.view(withSignatures(body)),
    steps: undefined,
  },
  spec,
);
