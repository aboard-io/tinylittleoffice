// The .pdf file (a JPEG a page) and the Outliner's text PDF: well-formed files, their cross-reference tables true.
import { test, expect } from 'vitest';
import { pdf } from '../src/kit/pdf.ts';
import { measure, textPdf } from '../src/kit/textpdf.ts';
import { outlineBlocks, readOutline } from '../src/apps/outline/model.ts';
import { parse } from '../src/doc/index.ts';

const latin1 = (b: Uint8Array) => Array.from(b, (c) => String.fromCharCode(c)).join('');
/** Every object the xref table points at starts where it says. */
function xrefHolds(s: string) {
  const at = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(s)![1]);
  expect(s.slice(at, at + 4)).toBe('xref');
  const [, count] = /^xref\n0 (\d+)\n/.exec(s.slice(at))!;
  const rows = s
    .slice(at)
    .split('\n')
    .slice(3, 2 + Number(count));
  rows.forEach((row, i) => expect(s.slice(Number(row.slice(0, 10)), Number(row.slice(0, 10)) + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
}

test('a page a JPEG, each the size of its page (px as 3/4 pt), numbered when there are more than one', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const s = latin1(
    pdf(
      [
        { w: 960, h: 540, pw: 1920, ph: 1080, jpeg },
        { w: 960, h: 540, pw: 1920, ph: 1080, jpeg },
      ],
      'Talk',
    ),
  );
  expect(s.startsWith('%PDF-1.4\n')).toBe(true);
  expect(s).toContain('/Count 2');
  expect(s).toContain('/MediaBox [0 0 720 405]');
  expect(s).toContain('/Width 1920 /Height 1080');
  expect(s).toContain('(1 / 2) Tj');
  expect(s).toContain('/Title <FEFF00540061006c006b>');
  xrefHolds(s);
  expect(latin1(pdf([{ w: 816, h: 1056, pw: 816, ph: 1056, jpeg }]))).not.toContain(' Tj');
});

test('the Outliner as a text PDF: the lone top item the title, its children sections (bookmarked), deeper ones bullets, the notes after', () => {
  const v = readOutline(parse('- Launch\n  - Product\n    - Pricing^[Set by **Ben**]\n  - Marketing\n    - Press\n'));
  const blocks = outlineBlocks(v, '', 'Notes');
  expect(blocks.map((b) => [b.kind, b.depth ?? null, b.runs.map((r) => r.t).join('')])).toEqual([
    ['title', null, 'Launch'],
    ['h', null, 'Product'],
    ['li', 0, 'Pricing1'],
    ['h', null, 'Marketing'],
    ['li', 0, 'Press'],
    ['h', null, 'Notes'],
    ['p', null, '1 Set by Ben'],
  ]);
  const s = latin1(textPdf(blocks, 'Launch'));
  expect(s).toContain('(Launch) Tj');
  // "Product", a bookmark in the reader's outline.
  expect(s).toContain('/Title <FEFF00500072006f0064007500630074>');
  expect(s).toContain('/PageMode /UseOutlines');
  xrefHolds(s);
  expect(measure('ab', 10)).toBeCloseTo(11.12);
});
