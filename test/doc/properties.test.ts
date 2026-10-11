// The kernel's properties, fuzzed from the grammar (test/doc/tlo-grammar.ts): the format read and written, every
// operation and its inverse, pages, the formula engine and the link codec. Each is a fast-check property over 200
// generated cases (2,000 under `npm run fuzz`); a failure names the shrunk counterexample.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { applyAll, evaluateTable, invert, invertAll, pages, parse, write, type ColType, type Table } from '../../src/doc/index.ts';
import { apply } from '../../src/doc/ops.ts';
import { decodeDoc, encodeDoc, packDoc, toBase64Url } from '../../src/kit/codec.ts';
import { arbitraryDoc, arbitraryEdits, arbitraryOp, arbitraryText, readGrammar, RULES, RUNS, TLO_EBNF, textOf } from './tlo-grammar.ts';

/** Long enough for RUNS cases of the slowest property (deflate at level 9 twice a case). */
const LONG = Math.max(5000, RUNS * 30);

/** A property held over RUNS cases; the message carries the shrunk case, so the next builder starts from it. */
function holds<T>(name: string, arb: fc.Arbitrary<T>, pred: (x: T) => void): void {
  const out = fc.check(
    fc.property(arb, (x) => (pred(x), true)),
    { numRuns: RUNS },
  );
  if (out.failed)
    throw new Error(
      `${name} fails for ${fc.stringify(out.counterexample?.[0])}\n(seed ${out.seed}, path ${out.counterexample ? out.counterexamplePath : ''})\n${out.errorInstance instanceof Error ? out.errorInstance.message : String(out.errorInstance)}`,
    );
}

test('the grammar reads: every rule defined, every name it uses has a rule or a pool', () => {
  expect([...RULES.keys()]).toContain('document');
  expect(RULES.size).toBeGreaterThanOrEqual(30);
  expect(() => readGrammar('a = b ;')).toThrow(/no rule b/);
  expect(() => readGrammar('a = ? nothing ? ;')).toThrow(/no pool nothing/);
  expect(TLO_EBNF).toContain('block      = paragraph | heading | items | quote | rule | table | fence | edges ;');
  // It makes texts of every kind of block.
  const kinds = new Set(fc.sample(textOf('document'), { numRuns: 300, seed: 1 }).flatMap((t) => parse(t).blocks.map((b) => b.k)));
  expect([...kinds].sort()).toStrictEqual(['edge', 'fence', 'h', 'hr', 'li', 'p', 'quote', 'table']);
});

test(
  'property: any text the grammar makes is read, and what is written of it is canonical: written again, it is itself',
  () => {
    holds('write(parse(x)) is a fixpoint', textOf(), (x) => {
      const once = write(parse(x));
      expect(write(parse(once)), JSON.stringify(once)).toBe(once);
    });
  },
  LONG,
);

test(
  'property: a lenient text and its canonical writing read as the same document',
  () => {
    holds('parse(write(parse(x))) = parse(x)', textOf(), (x) => {
      expect(parse(write(parse(x)))).toStrictEqual(parse(x));
    });
  },
  LONG,
);

test(
  'property: write(parse(x)) is x for every canonical text',
  () => {
    holds('write(parse(x)) = x', arbitraryText(), (x) => expect(write(parse(x))).toBe(x));
  },
  LONG,
);

test(
  'property: parse(write(d)) is d for every model the format can say',
  () => {
    holds('parse(write(d)) = d', arbitraryDoc(), (d) => expect(parse(write(d)), write(d)).toStrictEqual(d));
  },
  LONG,
);

test(
  'property: every operation applied and then its inverse gives the document back',
  () => {
    holds(
      'apply(apply(d, op), invert(d, op)) = d',
      arbitraryDoc().chain((doc) => arbitraryOp(doc).map((op) => ({ doc, op }))),
      ({ doc, op }) => {
        const after = apply(doc, op);
        expect(applyAll(after, invert(doc, op))).toStrictEqual(doc);
        // What one op touches is one block; the rest keep their identity.
        if (op.op === 'head') expect(after.blocks).toBe(doc.blocks);
        else if (op.op !== 'splice' && op.op !== 'move') after.blocks.forEach((b, k) => k !== op.at && expect(b).toBe(doc.blocks[k]));
      },
    );
  },
  LONG,
);

test(
  'property: a run of operations, then the inverse of the run, gives the document back',
  () => {
    holds('applyAll(applyAll(d, ops), invertAll(d, ops)) = d', arbitraryEdits(), ({ doc, ops }) => {
      expect(applyAll(applyAll(doc, ops), invertAll(doc, ops))).toStrictEqual(doc);
    });
  },
  LONG,
);

test(
  'property: pages() never throws and never gives no pages',
  () => {
    holds('pages(d.blocks).length >= 1', arbitraryDoc(12), (d) => {
      const ps = pages(d.blocks);
      expect(ps.length).toBeGreaterThanOrEqual(1);
      // The pages are the blocks between rules, every other block in one of them, in order.
      expect(ps.flat()).toStrictEqual(d.blocks.filter((b) => b.k !== 'hr'));
      expect(ps.length).toBe(d.blocks.filter((b) => b.k === 'hr').length + 1);
    });
  },
  LONG,
);

/* ---------- the formula engine ---------- */

const table = (rows: string[][], types: ColType[] = []): Table => ({ cols: rows[0].map((_, c) => ({ name: '', type: types[c] ?? 'number' })), rows, lock: [], chart: '' });
/** Numbers as a person types them, plain and in e-notation. */
const number = fc.oneof(fc.integer({ min: -1e6, max: 1e6 }), fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true })).map((n) => String(n));
const close = (a: number, b: number, scale: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, scale);

test(
  'property: a + b = b + a, and (a + b) + c = a + (b + c) within float tolerance',
  () => {
    holds('addition commutes and associates', fc.tuple(number, number, number), ([a, b, c]) => {
      const [row] = evaluateTable(table([[a, b, c, '=A1+B1', '=B1+A1', '=(A1+B1)+C1', '=A1+(B1+C1)', '=A1*B1', '=B1*A1']])).values;
      expect(row[3]).toBe(row[4]);
      expect(row[7]).toBe(row[8]);
      const scale = Math.abs(+a) + Math.abs(+b) + Math.abs(+c);
      expect(close(row[5] as number, row[6] as number, scale), `${row[5]} vs ${row[6]}`).toBe(true);
      expect(close(row[3] as number, +a + +b, scale)).toBe(true);
    });
  },
  LONG,
);

const COLS = 'ABCD';
/** A cell: a number, words, nothing, or a formula over other cells of a 4×4 grid. */
const arbitraryCell = fc.oneof(
  number,
  fc.constantFrom('', 'words', 'x'),
  fc.array(fc.tuple(fc.constantFrom(...COLS), fc.integer({ min: 1, max: 4 })), { minLength: 1, maxLength: 3 }).map((refs) => '=' + refs.map(([c, r]) => c + r).join('+')),
  fc.tuple(fc.constantFrom(...COLS), fc.integer({ min: 1, max: 4 })).map(([c, r]) => `=SUM(A1:${c}${r})`),
);
const arbitraryGrid = fc.array(fc.array(arbitraryCell, { minLength: 4, maxLength: 4 }), { minLength: 4, maxLength: 4 });

test(
  "property: a reference to a cell is the cell's value",
  () => {
    holds('=X equals X', arbitraryGrid, (rows) => {
      const refs = COLS.split('').map((c) => rows.map((_, r) => `=${c}${r + 1}`));
      // A row of references to each cell of each column, below the grid.
      const t = table([...rows, ...refs.map((col) => col)]);
      const { values } = evaluateTable(t);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) expect(values[4 + c][r], `=${COLS[c]}${r + 1}`).toStrictEqual(values[r][c]);
    });
  },
  LONG,
);

test(
  'property: a cycle is reported, never followed for ever; a cell clear of cycles has its sum',
  () => {
    // Cells of references and numbers only: what a cell reaches through its references decides its value.
    const cell = fc.oneof(
      fc.integer({ min: -100, max: 100 }).map(String),
      fc.array(fc.tuple(fc.integer({ min: 0, max: 3 }), fc.integer({ min: 0, max: 3 })), { minLength: 1, maxLength: 3 }).map((refs) => '=' + refs.map(([c, r]) => COLS[c] + (r + 1)).join('+')),
    );
    holds('cycles are #CIRC', fc.array(fc.array(cell, { minLength: 4, maxLength: 4 }), { minLength: 4, maxLength: 4 }), (rows) => {
      const refsOf = (r: number, c: number) =>
        rows[r][c].startsWith('=')
          ? rows[r][c]
              .slice(1)
              .split('+')
              .map((ref) => [Number(ref.slice(1)) - 1, COLS.indexOf(ref[0])] as const)
          : [];
      // The truth, worked out by hand: a cell that reaches a cycle is #CIRC, any other its sum.
      const state = new Map<string, 'busy' | number | 'circ'>();
      const truth = (r: number, c: number): number | 'circ' => {
        const k = `${r},${c}`;
        const s = state.get(k);
        if (s === 'busy') return 'circ';
        if (s !== undefined) return s;
        state.set(k, 'busy');
        let v = rows[r][c].startsWith('=') ? 0 : (Number(rows[r][c]) as number | 'circ');
        for (const [rr, cc] of refsOf(r, c)) {
          const x = truth(rr, cc);
          v = x === 'circ' || v === 'circ' ? 'circ' : v + x;
        }
        state.set(k, v);
        return v;
      };
      const { values } = evaluateTable(table(rows));
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 4; c++) {
          const want = truth(r, c);
          expect(values[r][c], `${COLS[c]}${r + 1} of ${JSON.stringify(rows)}`).toBe(want === 'circ' ? '#CIRC' : want);
        }
    });
  },
  LONG,
);

/* ---------- the link codec ---------- */

test(
  'property: packing a document and reading it back is the document, and the encoding chosen is never longer than the raw',
  () => {
    const texts = fc.oneof(arbitraryText(), fc.string({ unit: 'grapheme', maxLength: 300 }));
    holds('decodeDoc(encodeDoc(x)) = x', texts, (x) => {
      const payload = encodeDoc(x);
      expect(decodeDoc(payload)).toBe(x);
      if (!x) return;
      expect(payload.length).toBeLessThanOrEqual(1 + toBase64Url(new TextEncoder().encode(x)).length);
      expect(packDoc(x).bytes.length).toBeLessThanOrEqual(new TextEncoder().encode(x).length);
    });
  },
  LONG,
);
