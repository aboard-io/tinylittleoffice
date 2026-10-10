// A contract under node: its words and its signatures read and written over the kernel, the message a signature
// covers exactly as the old tree's (a contract the old tree signed verifies here), two signers, a change after
// signing breaking both, the row this key signed before put right, and the signature block in every file.
import { unzipSync, strFromU8 } from 'fflate';
import { expect, test, vi } from 'vitest';
import { applyAll, parse, write } from '../../../doc/index.ts';
import { createSigner, verify } from '../../../kit/sign.ts';
import { checkContract, contractText, keyMark, parseContract, printedSignatures, readSignatures, serializeContract, signaturesAt, signaturesOf, signedMessage, signOps, verdictOf, writeSignatures } from '../contract.ts';
import { templates } from '../templates.ts';
import { docToDocx, docToHtml, docToRtf, pages } from '../view.ts';
import def from '../def.ts';

const memory = () => {
  let held: string | null = null;
  return { get: () => held, set: (v: string) => void (held = v), remove: () => void (held = null) };
};
const ctx = { def, title: 'Deal', link: '' };
const contract = () => templates().find((t) => t.id === 'contract')!.doc;

/** Signed by the old tree (src/lib/sign.ts and contract.def.ts, three columns, no day), two parties. */
const OLD = "# Dog-walking agreement\n\nBetween Paul Ford and Sam Reyes, from 1 March 2027.\n\n## What is agreed\n\n- Sam walks Biscuit every weekday at noon.\n- Paul pays $20 a walk, on Fridays.\n\n```signatures\nName | Key | Signature\n--- | --- | ---\nPaul Ford | gTuAwZkOkxT4natjwaGS687f67m7GMVJFyPXZGSgAzo | dz0LbgV6Xwvq5aRwVoIpgPOT28xlSq-lBjxAJ8Ye0zc36ukrn11i0S7VGlkqSG9r2KGK3MgYELqKAKbzjGCqBA\nSam Reyes | djJ8ndfQOrk4TI2nmSSn2Sy-QioX-i02t6PV_qZP224 | an7NrGCTv1Cmf-FGk9e7QG8CtvZaaD2RyvG0qZG6IQMi2O_zL-4hbyOGLqfQABFsypODpw6nU138lg16CUd2BA\n```";

test('a contract the old tree signed reads, writes back byte for byte, and both signatures verify', async () => {
  expect(write(parse(OLD))).toBe(OLD + '\n');
  const c = parseContract(OLD);
  expect(c.text).toBe(OLD.slice(0, OLD.indexOf('\n\n```signatures')));
  expect(c.signatures.map((s) => [s.name, s.date])).toEqual([['Paul Ford', ''], ['Sam Reyes', '']]);
  for (const s of c.signatures) expect(await verify(s.key, s.sig, signedMessage(c.text, s.name))).toBe(true);
  expect(await checkContract(parse(OLD))).toEqual(['valid', 'valid']);
  // A word changed breaks both; one name's signature does not pass for the other's.
  expect(await checkContract(parse(OLD.replace('noon', 'one')))).toEqual(['mismatch', 'mismatch']);
  const [paul] = c.signatures;
  expect(await verify(paul.key, paul.sig, signedMessage(c.text, 'Sam Reyes'))).toBe(false);
});

test('the message is the old one exactly; the key mark is its last ten characters', () => {
  expect(signedMessage('  # Deal\n\nWords.\n', ' Paul ')).toBe('tinyoffice-contract\n# Deal\n\nWords.\nPaul');
  expect(keyMark('abcdefghijklmnop')).toBe('ghijklmnop');
});

test('the fence is Name | Key | Signature | Signed; a name alone is a party yet to sign; a bar in a name stays in its cell', () => {
  const body = writeSignatures([
    { name: 'Paul  Ford', key: 'k1', sig: 's1', date: '2027-03-01' },
    { name: 'Sam | Reyes', key: '', sig: '', date: '' },
  ]);
  expect(body).toBe('Name | Key | Signature | Signed\n--- | --- | --- | ---\nPaul Ford | k1 | s1 | 2027-03-01\nSam \\| Reyes |  |  |');
  expect(readSignatures(body)).toEqual([
    { name: 'Paul Ford', key: 'k1', sig: 's1', date: '2027-03-01' },
    { name: 'Sam | Reyes', key: '', sig: '', date: '' },
  ]);
  expect(readSignatures('Name | Key | Signature | Signed\n--- | --- | --- | ---')).toEqual([]);
  expect(verdictOf('x', { name: 'Sam', key: '', sig: '', date: '' })).toBe('unsigned');
  // Words and signatures as one text, and back.
  const text = serializeContract('# Deal\n\nSam walks the dog.', [{ name: 'Paul', key: 'k', sig: 's', date: '2027-03-01' }]);
  expect(text).toBe('# Deal\n\nSam walks the dog.\n\n```signatures\nName | Key | Signature | Signed\n--- | --- | --- | ---\nPaul | k | s | 2027-03-01\n```\n');
  expect(parseContract(text)).toEqual({ text: '# Deal\n\nSam walks the dog.', signatures: [{ name: 'Paul', key: 'k', sig: 's', date: '2027-03-01' }] });
  expect(serializeContract('# Deal', [])).toBe('# Deal\n');
});

test('the words are everything but the fence, with the document\'s own head fields and not the envelope', () => {
  const doc = parse('---\ntitle: Named\nby: Paul\nparty: Acme\n---\n# Deal {.title}\n\n```signatures\nName | Key | Signature | Signed\n--- | --- | --- | ---\n```\n\nAfter the fence.\n');
  expect(contractText(doc)).toBe('---\nparty: Acme\n---\n# Deal {.title}\n\nAfter the fence.\n');
});

test('two people sign the template: both verify; a change breaks both; signing again puts this key\'s row right', async () => {
  const [paul, sam] = [createSigner(memory(), () => import('../../../kit/sign.ts').then((m) => m.generate('ec'))), createSigner(memory())];
  let doc = parse(contract());
  const sign = async (who: typeof paul, name: string, date: string) => {
    const { key, sig } = await who.sign(signedMessage(contractText(doc), name));
    doc = applyAll(doc, signOps(doc, { name, key, sig, date }));
  };
  await sign(paul, 'Paul Ford', '2027-03-01');
  await sign(sam, 'Sam Reyes', '2027-03-02');
  expect(signaturesOf(doc).map((s) => s.name)).toEqual(['Paul Ford', 'Sam Reyes']);
  expect(await checkContract(doc)).toEqual(['valid', 'valid']);
  // The signatures are the last block, still; the words above them are the template's.
  expect(signaturesAt(doc)).toBe(doc.blocks.length - 1);
  expect(write(parse(write(doc)))).toBe(write(doc));
  // A change to the words: both stale until each signs again.
  doc = applyAll(doc, [{ op: 'splice', at: 1, n: 1, blocks: [{ k: 'p', runs: [{ t: 'Between Paul Ford and Sam Reyes, from 1 April 2027.' }] }] }]);
  expect(await checkContract(doc)).toEqual(['mismatch', 'mismatch']);
  await sign(paul, 'Paul Ford', '2027-03-03');
  expect(signaturesOf(doc).map((s) => [s.name, s.date])).toEqual([['Paul Ford', '2027-03-03'], ['Sam Reyes', '2027-03-02']]);
  expect(await checkContract(doc)).toEqual(['valid', 'mismatch']);
  // A party named before signing: their row is the one filled in.
  doc = applyAll(doc, [{ op: 'splice', at: signaturesAt(doc), n: 1, blocks: [{ k: 'fence', lang: 'signatures', body: writeSignatures([{ name: 'Dee', key: '', sig: '', date: '' }]) }] }]);
  await sign(sam, 'dee', '2027-03-04');
  expect(signaturesOf(doc).map((s) => s.name)).toEqual(['dee']);
  expect(signOps(parse('# No fence\n'), { name: 'x', key: 'k', sig: 's', date: '' })).toEqual([]);
});

test('the printed block and every file: name, day, key and whether it verified when drawn', async () => {
  const signer = createSigner(memory());
  let doc = parse(contract());
  const { key, sig } = await signer.sign(signedMessage(contractText(doc), 'Paul Ford'));
  doc = applyAll(doc, signOps(doc, { name: 'Paul Ford', key, sig, date: '2027-03-01' }));
  doc = applyAll(doc, [{ op: 'splice', at: signaturesAt(doc), n: 1, blocks: [{ k: 'fence', lang: 'signatures', body: writeSignatures([...signaturesOf(doc), { name: 'Sam Reyes', key: '', sig: '', date: '' }]) }] }]);
  // Not yet checked: drawn at once, it says so.
  expect(printedSignatures(doc, signaturesAt(doc))[0].verdict).toBe('unchecked');
  await checkContract(doc);
  const [p, s] = printedSignatures(doc, signaturesAt(doc));
  expect(p.verdict).toBe('valid');
  expect(p.detail).toMatch(/^Signed 2027-03-01 · key [0-9a-f]{5}-[0-9a-f]{5} · verified$/);
  expect(s).toEqual({ name: 'Sam Reyes', detail: 'not signed', verdict: 'unsigned' });
  const svg = pages(doc).map((pg) => pg.svg).join('');
  expect(svg).toContain('>Paul Ford</text>');
  expect(svg).toContain('verified');
  expect(svg).toContain('>Sam Reyes</text>');
  expect(svg).not.toContain('Name | Key');
  const html = docToHtml(doc, ctx);
  expect(html).toContain('<div class="valid"><strong>Paul Ford</strong><small>Signed 2027-03-01');
  expect(html).not.toContain('Name | Key');
  expect(docToRtf(doc, ctx)).toContain('{\\b Paul Ford}');
  const docx = strFromU8(unzipSync(docToDocx(doc, ctx))['word/document.xml']);
  expect(docx).toContain('>Paul Ford</w:t>');
  expect(docx).toContain('verified');
  // The words changed: printed as not matching, in red.
  const changed = applyAll(doc, [{ op: 'splice', at: 1, n: 1, blocks: [{ k: 'p', runs: [{ t: 'Other words.' }] }] }]);
  await checkContract(changed);
  expect(printedSignatures(changed, signaturesAt(changed))[0].detail).toContain('does not match these words');
  expect(pages(changed).map((pg) => pg.svg).join('')).toContain('#b91c1c');
});

test('where Ed25519 is missing an Ed25519 signature cannot be checked, which is not the same as not matching; printed, it is "not checked"', async () => {
  const real = crypto.subtle.importKey.bind(crypto.subtle);
  const spy = vi.spyOn(crypto.subtle, 'importKey').mockImplementation(((fmt: string, data: unknown, alg: AlgorithmIdentifier, ...rest: unknown[]) =>
    (alg as Algorithm).name === 'Ed25519' ? Promise.reject(new DOMException('Unrecognized name', 'NotSupportedError')) : (real as (...a: unknown[]) => unknown)(fmt, data, alg, ...rest)) as typeof crypto.subtle.importKey);
  try {
    const doc = parse(OLD.replace('Biscuit', 'Rex'));
    expect(await checkContract(doc)).toEqual(['unchecked', 'unchecked']);
    expect(printedSignatures(doc, signaturesAt(doc)).map((p) => [p.verdict, p.detail.split(' · ').at(-1)])).toEqual([['unchecked', 'not checked'], ['unchecked', 'not checked']]);
  } finally {
    spy.mockRestore();
  }
});
