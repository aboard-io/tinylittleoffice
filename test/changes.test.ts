// Who did what, for a host whose documents several people write (kit/text/changes.ts, kit/text/redline.ts; docs/
// library.md, Tracked changes and comments for a host): versions by their authors tracked word by word, every change
// its maker's and every kind of change tracked (Paul, 2026-10-16: "There can be no changes of any kind unless they are
// tracked and attributed"), a rejection a change of its own, and what is drawn among the words (ghostsOf) never the
// words; and the edit that rejects a change (kit/text/reject.ts) taking back exactly that change. The examples first,
// then the same fuzzed from the kernel's grammar (test/doc/tlo-grammar.ts), as the kernel's properties are: any
// document, any edits of any kind, each property over RUNS cases (2,000 under `npm run fuzz`), a failure naming the
// shrunk counterexample. Painting over a mounted editor and pinning comments are the browser's:
// test/browser/changes.test.ts.
import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { applyAll, parse, write, type Block, type Doc, type Op } from '../src/doc/index.ts';
import { changesOf, isHead, OTHER, same, textOf, track, type Step, type Tracked } from '../src/kit/text/changes.ts';
import { ghostsOf, initialsOf, type Drawing } from '../src/kit/text/redline.ts';
import { rejectOps } from '../src/kit/text/reject.ts';
import { arbitraryEdits, RUNS } from './doc/tlo-grammar.ts';

const A = 'alice@x.co';
const B = 'bob@x.co';
const C = 'charlie@x.co';

/** A block's words as a redline: [+words+b] put in, [-words-c] taken out, by the first letter of who did it. */
const show = (v: Step[], rejectedBy?: (id: string, seq: number) => boolean) =>
  track(v, rejectedBy).map((b) => {
    const words = b.toks
      .map((x) => (x.del || b.del ? `[-${x.t}-${(x.del ?? b.del)![0]}]` : x.ins ? `[+${x.t}+${x.ins[0]}]` : x.t))
      .join('')
      // Neighbors with the same mark, as one.
      .replace(/([+-])([a-z])\]\[\1/g, '');
    return `${b.kind}: ${words}`;
  });

/** How a test's ghosts name and draw people: plain, so what is drawn is what is compared. */
const drawing: Drawing = {
  color: () => '#000',
  initials: (who) => who[0].toUpperCase(),
  name: (who) => who,
  accepted: () => false,
  takenOutBy: (name) => `Taken out by ${name}`,
  cardChanged: 'changed',
  rejected: 'rejected',
  restored: 'restored',
};

/** A document with something of every kind in it, and an edit of each kind to it. */
const BASE = `---
title: Supply agreement
paper: letter
---
# Supply agreement {.title}

The supplier delivers^[By road.] the goods :truck: on time.

- [ ] Sign the order
- [ ] Pay the deposit

| Item | Price:money |
|---|---|
| Steel | 100 |

Notices go by email.
`;
const EDITS: [string, string][] = [
  ['bold', BASE.replace('on time', '**on time**')],
  ['link', BASE.replace('on time', '[on time](https://example.com)')],
  ['footnote rewritten', BASE.replace('By road.', 'By rail.')],
  ['icon swapped', BASE.replace(':truck:', ':ship:')],
  ['task ticked', BASE.replace('- [ ] Sign the order', '- [x] Sign the order')],
  ['centered', BASE.replace('Notices go by email.', 'Notices go by email. {.center}')],
  ['made a heading', BASE.replace('Notices go by email.', '## Notices go by email.')],
  ['list made numbered', BASE.replace('- [ ] Pay the deposit', '1. Pay the deposit')],
  ['column retyped', BASE.replace('Price:money', 'Price:number')],
  ['cell changed', BASE.replace('| Steel | 100 |', '| Steel | 120 |')],
  ['paper', BASE.replace('paper: letter', 'paper: a4')],
  ['head title', BASE.replace('title: Supply agreement', 'title: Supply contract')],
  ['head field added', BASE.replace('paper: letter', 'paper: letter\nlook: serif')],
  ['a space', BASE.replace('on time.', 'on time .')],
  ['a line break', BASE.replace('Notices go by email.', 'Notices go\nby email.')],
  ['blocks swapped', BASE.replace('- [ ] Sign the order\n- [ ] Pay the deposit', '- [ ] Pay the deposit\n- [ ] Sign the order')],
  ['a rule', BASE.replace('Notices go by email.', '---\n\nNotices go by email.')],
];

describe('tracked changes', () => {
  test('words put in and taken out are marked with who did it, and the rest is plain', () => {
    expect(
      show([
        { author: A, text: 'Payment is due in 30 days.\n' },
        { author: B, text: 'Payment is due in 45 days.\n' },
      ]),
    ).toEqual(['p: Payment is due in [-30-b][+45+b] days.']);
  });

  test('a block put in, a block taken out, a heading kept', () => {
    expect(
      show([
        { author: A, text: '## Terms\n\nOne.\n\nTwo.\n' },
        { author: B, text: '## Terms\n\nOne.\n\nNew.\n\nTwo.\n' },
        { author: C, text: '## Terms\n\nNew.\n\nTwo.\n' },
      ]),
    ).toEqual(['h2: Terms', 'p: [-One.-c]', 'p: [+New.+b]', 'p: Two.']);
  });

  test('words someone puts in and takes out again are simply gone; another’s are struck through, as a rejection where they rejected them', () => {
    const v = [
      { author: A, text: 'Hello.\n' },
      { author: B, text: 'Hello there.\n' },
      { author: B, text: 'Hello.\n' },
    ];
    expect(show(v)).toEqual(['p: Hello.']);
    const three = [...v.slice(0, 2), { author: C, text: 'Hello.\n' }].map((x, i) => ({ ...x, hash: `v${i}`, seq: i * 10 }));
    expect(show(three)).toEqual(['p: Hello[- there-c].']);
    // Charlie had rejected Bob's change before taking its words out: the taking out is the rejection.
    const rejected = track(three, (id, seq) => id === 'v1:0' && seq === 20);
    expect(rejected[0].toks.filter((x) => x.del).every((x) => x.rejected)).toBe(true);
    expect(changesOf(rejected).find((x) => x.author === C)).toMatchObject({ kind: 'rejection', took: ' there' });
  });

  test('words put back where they were taken out: undone by whoever took them out, restored as a change by anyone else', () => {
    const base = { author: A, text: 'Due in 30 days.\n' };
    const cut = { author: B, text: 'Due in days.\n' };
    expect(show([base, cut, { author: B, text: 'Due in 30 days.\n' }])).toEqual(['p: Due in 30 days.']);
    const back = track([base, cut, { author: A, text: 'Due in 30 days.\n' }].map((x, i) => ({ ...x, hash: `v${i}` })));
    expect(changesOf(back)).toEqual([
      { id: 'v2:0', author: A, put: '30 ', took: '', styled: '', styles: [], kind: 'restore' },
      // The taking out it undid stays Bob's change, so that both can be seen, and either rejected.
      { id: 'v1:0', author: B, put: '', took: '30 ', styled: '', styles: [], kind: 'edit' },
    ]);
  });

  test('a paragraph put back whole, where it was taken out, is restored as a change, as words put back are', () => {
    const base = { author: A, text: 'One.\n\nTwo **words**.\n\nThree.\n', hash: 'v0' };
    const cut = { author: B, text: 'One.\n\nThree.\n', hash: 'v1' };
    // Undone by whoever took it out, nobody having reviewed it: as it was.
    expect(show([base, cut, { author: B, text: base.text, hash: 'v2' }])).toEqual(['p: One.', 'p: Two words.', 'p: Three.']);
    // Put back by anyone else (a rejection, say): words restored, the taking out it undid still Bob's.
    const back = track([base, cut, { author: A, text: base.text, hash: 'v2' }]);
    expect(show([base, cut, { author: A, text: base.text, hash: 'v2' }])).toEqual(['p: One.', 'p: [+Two words.+a]', 'p: Three.']);
    expect(back[1].toks.every((x) => x.restored && x.from?.delId === 'v1:0')).toBe(true);
    expect(changesOf(back).map((c) => [c.id, c.author, c.kind, c.put, c.took])).toEqual([
      ['v2:0', A, 'restore', 'Two words.', ''],
      ['v1:0', B, 'edit', '', 'Two words.'],
    ]);
    const ghosts = ghostsOf(back, parse(base.text).blocks, () => false, drawing);
    expect(ghosts.get(1)!.map((g) => g.text)).toEqual(['[', 'A restored', ']']);
    // Nothing of it struck through elsewhere, and rejecting the restoring takes it out again.
    expect([...ghosts.values()].flat().some((g) => g.cls?.includes('tx-gone'))).toBe(false);
    expect(rejecting([base, cut, { author: A, text: base.text, hash: 'v2' }], () => ['v2:0'])).toBe(cut.text);
    // Rejecting both, the restoring and the taking out it undid, leaves it standing.
    expect(rejecting([base, cut, { author: A, text: base.text, hash: 'v2' }], () => ['v2:0', 'v1:0'])).toBe(base.text);
  });

  test('a replacement is one change, with what it put in and what it took out, named by the version that made it', () => {
    const t = track([
      { author: A, text: 'Due in 30 days.\n', hash: 'h1' },
      { author: B, text: 'Due in 45 days, net.\n', hash: 'h2' },
    ]);
    expect(changesOf(t)).toEqual([
      { id: 'h2:0', author: B, put: '45', took: '30', styled: '', styles: [], kind: 'edit' },
      { id: 'h2:1', author: B, put: ', net', took: '', styled: '', styles: [], kind: 'edit' },
    ]);
  });

  test('a stretch of one person’s typing, saved at every pause, is one change until someone reviews it', () => {
    const v = [
      { author: A, text: 'The terms.\n', hash: 'v0', seq: 0 },
      { author: B, text: 'The terms are firm.\n', hash: 'v1', seq: 10 },
      { author: B, text: 'The terms are firm and final.\n', hash: 'v2', seq: 20 },
    ];
    expect(changesOf(track(v)).map((x) => [x.id, x.put])).toEqual([['v1:0', ' are firm and final']]);
    // Once someone has accepted the first part (before v2), the rest is a change of its own.
    const reviewed = (id: string, seq: number) => id === 'v1:0' && seq >= 15;
    expect(changesOf(track(v, undefined, reviewed)).map((x) => [x.id, x.put])).toEqual([
      ['v1:0', ' are firm'],
      ['v2:0', ' and final'],
    ]);
  });

  test('formatting is a change: a word bolded, a paragraph made a heading, by whom and from what', () => {
    const v = [
      { author: A, text: 'Payment is due.\n\nTerms\n', hash: 'v0' },
      { author: B, text: 'Payment is **due**.\n\n## Terms\n', hash: 'v1' },
    ];
    const t = track(v);
    expect(t[0].toks.find((x) => x.t === 'due')).toMatchObject({ m: 'b', fmt: B, was: '' });
    expect(t[1]).toMatchObject({ kind: 'h2', fmt: B, wasKind: 'p' });
    expect(changesOf(t)).toEqual([
      { id: 'v1:0', author: B, put: '', took: '', styled: 'due', styles: ['+b'], kind: 'format' },
      { id: 'v1:1', author: B, put: '', took: '', styled: 'Terms', styles: ['kind:p>h2'], kind: 'format' },
    ]);
    // Bold taken off again by the same person, nobody having reviewed it: no change at all.
    expect(changesOf(track([...v, { author: B, text: 'Payment is due.\n\n## Terms\n', hash: 'v2' }])).map((x) => x.styles)).toEqual([['kind:p>h2']]);
    // Words someone put in, bolded by them before anyone reviewed them: still just words put in.
    const typed = track([v[0], { author: B, text: 'Payment is due now.\n\nTerms\n', hash: 'v1' }, { author: B, text: 'Payment is due **now**.\n\nTerms\n', hash: 'v2' }]);
    expect(changesOf(typed).map((x) => [x.kind, x.put])).toEqual([['edit', ' now']]);
  });

  test('a field of the head is a change with what it was', () => {
    const t = track([
      { author: A, text: '---\npaper: letter\n---\nWords.\n', hash: 'v0' },
      { author: B, text: '---\npaper: a4\n---\nWords.\n', hash: 'v1' },
    ]);
    expect(changesOf(t)).toEqual([{ id: 'v1:0', author: B, put: '', took: '', styled: '', styles: ['head:paper:letter>a4'], kind: 'format' }]);
  });

  test('no change of any kind goes untracked: every edit of a document leaves a change, attributed to its maker', () => {
    for (const [what, text] of EDITS) {
      const changes = changesOf(
        track([
          { author: A, text: BASE, hash: 'v0' },
          { author: B, text, hash: 'v1' },
        ]),
      );
      expect(changes.length, what).toBeGreaterThan(0);
      expect(
        changes.every((c) => c.author === B),
        what,
      ).toBe(true);
    }
  });

  test('an icon counts as one character, as the editor counts it', () => {
    expect(textOf(parse('A :star: B\n').blocks[0])).toBe('A ￼ B');
  });

  test('none given, nothing is tracked; one version, nothing changed', () => {
    expect(track([])).toEqual([]);
    expect(changesOf(track([{ author: A, text: BASE }]))).toEqual([]);
  });
});

/** The last version's text with the changes `ids` of its tracking rejected (rejectOps), as the format writes it; null where they cannot be. */
function rejecting(v: Step[], ids: (all: string[]) => string[], rejectedBy?: (id: string, seq: number) => boolean, reviewedBy?: (id: string, seq: number) => boolean) {
  const t = track(v, rejectedBy, reviewedBy);
  const doc = parse(v.at(-1)!.text);
  const ops = rejectOps(t, doc.blocks, ids(changesOf(t).map((c) => c.id)));
  return ops && write(applyAll(doc, ops));
}

describe('the edit that rejects a change', () => {
  const v = [
    { author: A, text: 'Payment is due in 30 days.\n\nNotices go by email.\n', hash: 'v0' },
    { author: B, text: 'Payment is due in 45 days, net.\n\nNotices go by email.\n', hash: 'v1' },
  ];

  test('takes back the words it put in and puts back the words it took out, and leaves the other changes as they are', () => {
    expect(changesOf(track(v)).map((c) => [c.id, c.put, c.took])).toEqual([
      ['v1:0', '45', '30'],
      ['v1:1', ', net', ''],
    ]);
    expect(rejecting(v, () => ['v1:0'])).toBe('Payment is due in 30 days, net.\n\nNotices go by email.\n');
    expect(rejecting(v, () => ['v1:1'])).toBe('Payment is due in 45 days.\n\nNotices go by email.\n');
    expect(rejecting(v, (all) => all)).toBe(v[0].text);
    // None named, nothing to do.
    expect(rejecting(v, () => [])).toBe(v[1].text);
  });

  test('against the words as they are now: the ops are made at the places the change has in the editor’s blocks', () => {
    // A paragraph typed at the top since (the words being typed are a version too): the change is found below it.
    const t = track(v);
    const now = parse(`Draft.\n\n${v[1].text}`);
    expect(write(applyAll(now, rejectOps(t, now.blocks, ['v1:1'])!))).toBe('Draft.\n\nPayment is due in 45 days.\n\nNotices go by email.\n');
  });

  test('puts back marks, a block’s kind and look, a paragraph taken out and a field of the head, as they were', () => {
    const base = { author: A, text: '---\npaper: letter\n---\nPayment is due.\n\nTerms\n\nGone soon.\n\nNotices.\n', hash: 'v0' };
    const next = { author: B, text: '---\npaper: a4\n---\nPayment is **due**.\n\n## Terms {.center}\n\nNotices.\n', hash: 'v1' };
    expect(changesOf(track([base, next])).map((c) => [c.id, c.styles.join(' '), c.took])).toEqual([
      ['v1:3', 'head:paper:letter>a4', ''],
      ['v1:0', '+b', ''],
      ['v1:1', 'kind:p>h2 look:>.center', ''],
      ['v1:2', '-block:p', 'Gone soon.'],
    ]);
    for (const [id, text] of [
      ['v1:3', next.text.replace('a4', 'letter')],
      ['v1:0', next.text.replace('**due**', 'due')],
      ['v1:1', next.text.replace('## Terms {.center}', 'Terms')],
      ['v1:2', next.text.replace('Notices.', 'Gone soon.\n\nNotices.')],
    ])
      expect(
        rejecting([base, next], () => [id]),
        id,
      ).toBe(text);
  });

  test('a rejection of a rejection: words someone took out and another put back are taken out again', () => {
    const steps = [
      { author: A, text: 'Due in 30 days.\n', hash: 'v0' },
      { author: B, text: 'Due in days.\n', hash: 'v1' },
      { author: A, text: 'Due in 30 days.\n', hash: 'v2' },
    ];
    expect(rejecting(steps, () => ['v2:0'])).toBe('Due in days.\n');
    // Both: the taking out and the putting back, the words as they were.
    expect(rejecting(steps, () => ['v1:0', 'v2:0'])).toBe('Due in 30 days.\n');
  });

  test('words accepted and then taken out by the person who put them in: a change, and rejecting it puts them back', () => {
    // Version 1's words accepted before version 2 (its place in the list): they are anyone's words now.
    const reviewed = (id: string, seq: number) => id.startsWith('v1:') && seq >= 2;
    const said = [
      { author: A, text: 'Hello.\n', hash: 'v0' },
      { author: B, text: 'Hello there.\n', hash: 'v1' },
    ];
    const words = [...said, { author: B, text: 'Hello.\n', hash: 'v2' }];
    expect(changesOf(track(words, undefined, reviewed)).map((c) => [c.id, c.put, c.took])).toEqual([
      ['v1:0', ' there', ''],
      ['v2:0', '', ' there'],
    ]);
    expect(rejecting(words, () => ['v2:0'], undefined, reviewed)).toBe('Hello there.\n');
    // Nobody having reviewed them, they were only ever a draft of version 1's: simply gone.
    expect(changesOf(track(words))).toEqual([]);
    // A paragraph put in, accepted and taken out again by the same person; and words they took out, accepted, put back.
    const para = [
      { author: A, text: 'Terms.\n', hash: 'v0' },
      { author: B, text: 'Terms.\n\nNotices.\n', hash: 'v1' },
      { author: B, text: 'Terms.\n', hash: 'v2' },
    ];
    expect(changesOf(track(para, undefined, reviewed)).map((c) => [c.id, c.styles.join(' ')])).toEqual([
      ['v1:0', '+block:p'],
      ['v2:0', '-block:p'],
    ]);
    expect(rejecting(para, () => ['v2:0'], undefined, reviewed)).toBe(para[1].text);
    const back = [
      { author: A, text: 'Hello there.\n', hash: 'v0' },
      { author: B, text: 'Hello.\n', hash: 'v1' },
      { author: B, text: 'Hello there.\n', hash: 'v2' },
    ];
    expect(changesOf(track(back, undefined, reviewed)).map((c) => [c.id, c.put, c.took])).toEqual([
      ['v2:0', ' there', ''],
      ['v1:0', '', ' there'],
    ]);
    expect(rejecting(back, () => ['v2:0'], undefined, reviewed)).toBe('Hello.\n');
  });

  test('a change no part of the tracking could place is undone by hand alone: none is made', () => {
    const t: Tracked[] = [{ kind: OTHER, look: '', toks: [], fmt: B, fmtId: 'v1:0', wasLook: '' }];
    expect(rejectOps(t, [], ['v1:0'])).toBeNull();
  });
});

describe('drawn among the words', () => {
  test('every edit: an opening bracket, the lozenge right after it, the words taken out in place, a closing bracket', () => {
    const t = track([
      { author: A, text: 'Payment is due in 30 days.\n', hash: 'v0' },
      { author: B, text: 'Payment is due in **45** days.\n', hash: 'v1' },
    ]);
    const ghosts = ghostsOf(t, parse('Payment is due in **45** days.\n').blocks, () => false, drawing).get(0)!;
    expect(ghosts.map((g) => [g.offset, g.text, g.cls])).toEqual([
      [18, '[', 'tx-br'],
      [18, 'B', 'tx-loz tx-loz-waiting'],
      [18, '30', 'tx-out'],
      [20, ']', 'tx-br'],
    ]);
    // The lozenge is named for the host to find again and open: "edit:" and its changes.
    expect([ghosts[1].id, ghosts[1].title]).toEqual(['edit:v1:0', B]);
    expect(ghosts[2].title).toBe(`Taken out by ${B}`);
    // Accepted by this reader, a lozenge waits no longer; settled, a change is not drawn at all.
    expect(ghostsOf(t, parse('Payment is due in **45** days.\n').blocks, () => false, { ...drawing, accepted: () => true }).get(0)![1].cls).toBe('tx-loz');
    expect(ghostsOf(t, parse('Payment is due in **45** days.\n').blocks, () => true, drawing).size).toBe(0);
  });

  test('a paragraph taken out is a line of its own before the next, bracketed, its lozenge first', () => {
    const t = track([
      { author: A, text: 'One.\n\nTwo.\n', hash: 'v0' },
      { author: C, text: 'Two.\n', hash: 'v1' },
    ]);
    const [gone] = ghostsOf(t, parse('Two.\n').blocks, () => false, drawing).get(0)!;
    expect([gone.block, gone.cls, gone.parts!.map((p) => p.text)]).toEqual([true, 'tx-gone', ['[', 'C', 'One.', ']']]);
  });

  test('a paragraph taken out last, with no block after it, is a line of its own after the last block standing', () => {
    const t = track([
      { author: A, text: 'One.\n\nTwo.\n', hash: 'v0' },
      { author: C, text: 'One.\n', hash: 'v1' },
    ]);
    const ghosts = ghostsOf(t, parse('One.\n').blocks, () => false, drawing).get(0) ?? [];
    expect(ghosts.map((g) => [g.block, g.after, g.cls, g.parts?.map((p) => p.text)])).toEqual([[true, true, 'tx-gone tx-gone-after', ['[', 'C', 'Two.', ']']]]);
    // At the words' end, drawn after everything there (an edit's closing bracket).
    expect(ghosts[0].offset).toBe('One.'.length);
  });

  test('a person’s initials: the first letters of the first and last words of their name, more of the first where two would match', () => {
    const ini = initialsOf([
      { email: A, name: 'Alice Smith' },
      { email: B, name: 'Alan Smith' },
      { email: C, name: '' },
    ]);
    expect([...ini.values()]).toEqual(['AS', 'ALS', 'C']);
  });
});

/** A property over RUNS cases, a failure naming its shrunk counterexample. */
function holds<T>(name: string, arb: fc.Arbitrary<T>, pred: (x: T) => void): void {
  const out = fc.check(
    fc.property(arb, (x) => (pred(x), true)),
    { numRuns: RUNS },
  );
  if (out.failed)
    throw new Error(
      `${name} fails for ${fc.stringify(out.counterexample?.[0])}\n(seed ${out.seed}, path ${out.counterexample ? out.counterexamplePath : ''})\n${out.errorInstance instanceof Error ? out.errorInstance.stack : String(out.errorInstance)}`,
    );
}
const LONG = Math.max(20_000, RUNS * 40);
const canon = (text: string) => same(parse(text));
/** A document's text after some edits. */
const after = (doc: Doc, ops: Op[]) => write(applyAll(doc, ops));
/** A block of words: a paragraph, a heading, an item or a quote (the tracking's kinds of text). */
const WORDS = /^(p|h[1-6]|li\d+o?|quote)$/;
const isWords = (b: Block) => b.k === 'p' || b.k === 'h' || b.k === 'li' || b.k === 'quote';
/**
 * The words of each block of words with the change `c` alone taken back, read from the tracking itself (one
 * person's version after another's: no restoring, no restyling under another): a block it put in gone, one it took
 * out back; in the rest, the words it put in gone and the words it took out back.
 */
function wordsWithout(t: Tracked[], c: string): string[] {
  const words = (b: Tracked, keep: (x: Tracked['toks'][number]) => boolean) =>
    b.toks
      .filter(keep)
      .map((x) => x.t)
      .join('');
  return t.flatMap((b) => {
    if (isHead(b) || !WORDS.test(b.kind)) return [];
    if (b.del) return b.delId === c && b.insId !== c ? [words(b, (x) => x.insId !== c)] : [];
    if (b.insId === c && b.toks.every((x) => x.insId === c || x.del)) return [];
    return [words(b, (x) => (x.del ? x.delId === c && x.insId !== c : x.insId !== c))];
  });
}

describe('properties', () => {
  test(
    'any edit of any document is tracked, every change its maker’s and placed',
    () => {
      holds('one person’s edits, tracked', arbitraryEdits(), ({ doc, ops }) => {
        const x = write(doc);
        const y = after(doc, ops);
        const t = track([
          { author: 'a', text: x, hash: 'v0' },
          { author: 'b', text: y, hash: 'v1' },
        ]);
        const changes = changesOf(t);
        if (canon(x) === canon(y)) return void expect(changes).toEqual([]);
        expect(changes.length, 'some change').toBeGreaterThan(0);
        expect(
          changes.every((c) => c.author === 'b'),
          'every change its maker’s',
        ).toBe(true);
        expect(
          t.some((b) => b.kind === OTHER),
          'every change placed (none left to the catch-all)',
        ).toBe(false);
      });
    },
    LONG,
  );

  test(
    'three people’s edits one after another: every change by someone who made a version, and placed',
    () => {
      const chain = fc.tuple(arbitraryEdits(4), fc.integer({ min: 1, max: 3 }), fc.integer({ min: 0, max: 2 }));
      holds('edits by three people, tracked', chain, ([{ doc, ops }, parts, first]) => {
        // The edits split into versions, each by the next person.
        const people = ['a', 'b', 'c'];
        const size = Math.ceil(ops.length / parts);
        const versions = [{ author: people[first], text: write(doc), hash: 'v0' }];
        let d = doc;
        for (let k = 0; k * size < ops.length; k++) {
          d = applyAll(d, ops.slice(k * size, (k + 1) * size));
          versions.push({ author: people[(first + k + 1) % 3], text: write(d), hash: `v${k + 1}` });
        }
        const t = track(versions);
        expect(
          t.some((b) => b.kind === OTHER),
          'every change placed',
        ).toBe(false);
        expect(
          changesOf(t).every((c) => versions.slice(1).some((v) => v.author === c.author)),
          'every change by someone who made a version',
        ).toBe(true);
      });
    },
    LONG,
  );

  test(
    'what is drawn among the words is never past them, and each edit is bracketed once',
    () => {
      holds('the ghosts of any edits', arbitraryEdits(), ({ doc, ops }) => {
        const y = after(doc, ops);
        const t = track([
          { author: 'a', text: write(doc), hash: 'v0' },
          { author: 'b', text: y, hash: 'v1' },
        ]);
        const blocks = parse(y).blocks;
        for (const [at, ghosts] of ghostsOf(t, blocks, () => false, drawing)) {
          const len = textOf(blocks[at]).length;
          for (const g of ghosts) expect(g.offset, 'within its block').toBeLessThanOrEqual(len);
          // A bracket is a ghost of the bracket's class (the words taken out may be "[" or "]" themselves).
          const isBracket = (x: { text: string; cls?: string }, c: string) => x.cls === 'tx-br' && x.text === c;
          const count = (c: string) => ghosts.filter((g) => isBracket(g, c)).length + ghosts.filter((g) => g.parts?.some((p) => isBracket(p, c))).length;
          expect(count('['), 'brackets paired').toBe(count(']'));
        }
      });
    },
    LONG,
  );

  test(
    'rejecting every change of a version gives back the version before it, its words with marks at their edges and all',
    () => {
      holds('one person’s edits, rejected', arbitraryEdits(6, true), ({ doc, ops }) => {
        const x = write(doc);
        const y = after(doc, ops);
        const t = track([
          { author: 'a', text: x, hash: 'v0' },
          { author: 'b', text: y, hash: 'v1' },
        ]);
        const now = parse(y);
        const back = rejectOps(
          t,
          now.blocks,
          changesOf(t).map((c) => c.id),
        );
        expect(back, 'a rejection for every change').not.toBeNull();
        expect(same(applyAll(now, back!))).toBe(canon(x));
      });
    },
    LONG,
  );

  test(
    'three people’s edits one after another, all rejected, give the first version back',
    () => {
      const chain = fc.tuple(arbitraryEdits(4, true), fc.integer({ min: 1, max: 3 }), fc.integer({ min: 0, max: 2 }));
      holds('edits by three people, rejected', chain, ([{ doc, ops }, parts, first]) => {
        const people = ['a', 'b', 'c'];
        const size = Math.ceil(ops.length / parts);
        const versions = [{ author: people[first], text: write(doc), hash: 'v0' }];
        let d = doc;
        for (let k = 0; k * size < ops.length; k++) {
          d = applyAll(d, ops.slice(k * size, (k + 1) * size));
          versions.push({ author: people[(first + k + 1) % 3], text: write(d), hash: `v${k + 1}` });
        }
        const t = track(versions);
        const now = parse(versions.at(-1)!.text);
        const back = rejectOps(
          t,
          now.blocks,
          changesOf(t).map((c) => c.id),
        );
        expect(back, 'a rejection for every change').not.toBeNull();
        expect(same(applyAll(now, back!))).toBe(canon(versions[0].text));
      });
    },
    LONG,
  );

  test(
    'versions one after another, each reviewed before the next and by anyone, the same person or not: rejecting the last one’s changes gives back the one before it',
    () => {
      const chain = fc.tuple(arbitraryEdits(6, true), fc.integer({ min: 2, max: 4 }), fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }));
      holds('a chain of versions, the last rejected', chain, ([{ doc, ops }, parts, who]) => {
        const size = Math.ceil(ops.length / parts);
        const versions = [{ author: who[0] ? 'a' : 'b', text: write(doc), hash: 'v0' }];
        let d = doc;
        for (let k = 0; k * size < ops.length; k++) {
          d = applyAll(d, ops.slice(k * size, (k + 1) * size));
          versions.push({ author: who[k + 1] ? 'a' : 'b', text: write(d), hash: `v${k + 1}` });
        }
        const last = versions.length - 1;
        // Every change accepted before the version after the one that made it.
        const t = track(versions, undefined, (id, seq) => Number(id.slice(1, id.indexOf(':'))) < seq);
        const now = parse(versions[last].text);
        const back = rejectOps(
          t,
          now.blocks,
          changesOf(t)
            .map((c) => c.id)
            .filter((id) => id.startsWith(`v${last}:`)),
        );
        expect(back, 'a rejection for every change').not.toBeNull();
        expect(same(applyAll(now, back!))).toBe(canon(versions[last - 1].text));
      });
    },
    LONG,
  );

  test(
    'rejecting one change leaves the others’ words: each block of words reads as the tracking says it does with that change alone taken back',
    () => {
      holds(
        'one change of several, rejected',
        arbitraryEdits(6, true).chain((e) => fc.nat().map((pick) => ({ ...e, pick }))),
        ({ doc, ops, pick }) => {
          const y = after(doc, ops);
          const t = track([
            { author: 'a', text: write(doc), hash: 'v0' },
            { author: 'b', text: y, hash: 'v1' },
          ]);
          const ids = changesOf(t).map((c) => c.id);
          if (!ids.length) return;
          const c = ids[pick % ids.length];
          const now = parse(y);
          const back = rejectOps(t, now.blocks, [c]);
          expect(back, `a rejection of ${c}`).not.toBeNull();
          // A card is put back whole, every change open on it with it: the words are the blocks of words.
          expect(applyAll(now, back!).blocks.filter(isWords).map(textOf)).toStrictEqual(wordsWithout(t, c));
        },
      );
    },
    LONG,
  );
});
