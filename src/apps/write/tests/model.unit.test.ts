// Write's reading and drawing under node: the name, the word count, a cell typed into a table block, a row put in
// inside a sum's reach, the pages on either paper, and every file it becomes (HTML, RTF, DOCX, Markdown); each
// template round-trips byte for byte and the invoice adds up.
import { unzipSync, strFromU8 } from 'fflate';
import { expect, test } from 'vitest';
import { applyAll, evaluate, firstTable, formatCell, isRule, parse, write } from '../../../doc/index.ts';
import write_ from '../def.ts';
import { lint } from '../../../lint.ts';
// The registry, so a document held in the text is drawn by its own app.
import { appOf } from '../../../kit/core/apps.ts';
import {
  duplicateBlock,
  fieldsOf,
  moveBlock,
  putAfter,
  removeBlock,
  retitle,
  tableColIn,
  tableColOut,
  tablePut,
  tableRename,
  tableRowsIn,
  tableRowsOut,
  setCellAt,
  tableView,
  titleOf,
  wordCount,
} from '../model.ts';
import { writeToDeck, writeToOutline } from '../convert.ts';
import { templates } from '../templates.ts';
import { LOOK_IDS, lookOf } from '../look.ts';
import { docToDocx, docToHtml, docToMarkdown, docToRtf, pages } from '../view.ts';

const ctx = { def: write_, title: 'Test', link: 'https://tinylittleoffice.com/#/v1/write/rAbc' };
const invoice = () => templates().find((t) => t.id === 'invoice')!.doc;

test('the name is the head title, else the title heading; retitle writes the head', () => {
  expect(titleOf('# Hello there {.title}\n\nwords\n')).toBe('Hello there');
  expect(titleOf('---\ntitle: Named\n---\n# Hello {.title}\n')).toBe('Named');
  expect(titleOf('# Not a title\n')).toBe('');
  expect(retitle('# Hello {.title}\n', 'Named')).toBe('---\ntitle: Named\n---\n# Hello {.title}\n');
  expect(retitle('---\ntitle: Named\n---\nwords\n', '')).toBe('words\n');
});

test('words are counted in the text and its notes; a web address alone is a word like any other', () => {
  expect(wordCount(parse('One two^[three four] five\n\nhttps://example.com/x\n\n- six\n'))).toBe(7);
});

test('every template is canonical and parses as the kernel wrote it', () => {
  const ids = templates().map((t) => t.id);
  expect(ids.length).toBeGreaterThanOrEqual(25);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.slice(0, 4)).toEqual(['letter', 'cover', 'memo', 'meeting']);
  for (const id of ['thesis', 'book-review', 'news', 'interview', 'music-review', 'complaint', 'politician', 'love']) expect(ids).toContain(id);
  for (const t of templates()) {
    expect(write(parse(t.doc)), t.id).toBe(t.doc);
    expect(t.doc.endsWith('\n')).toBe(true);
    expect(write_.view(t.doc).length).toBeGreaterThan(0);
  }
});

test('the contract lints clean', () => {
  const contract = templates().find((t) => t.id === 'contract')!.doc;
  expect(lint('write', contract)).toEqual([]);
});

test('the invoice adds up in place: Amount is Qty × Price and locked, the totals are formulas', () => {
  const doc = parse(invoice());
  const at = firstTable(doc);
  const ev = evaluate(doc, at)!;
  expect(ev.values[0][4]).toBe(1800);
  expect(ev.values[2][4]).toBe(480);
  expect(ev.values[4][4]).toBe(5080);
  expect(ev.values[5][4]).toBeCloseTo(406.4);
  expect(ev.values[6][4]).toBeCloseTo(5486.4);
  expect(formatCell(ev.values[6][4], 'money')).toBe('$5,486.40');
  // The Amount column is locked: a cell typed into there stays as it was.
  expect(applyAll(doc, setCellAt(doc, at, 0, 4, '1')).blocks[at]).toBe(doc.blocks[at]);
  // A line's quantity changed changes its amount.
  const more = applyAll(doc, setCellAt(doc, at, 0, 1, '20'));
  expect(evaluate(more, at)!.values[0][4]).toBe(3000);
  // A row put in under the last line (its row's menu), inside the subtotal's reach.
  const grown = applyAll(doc, tableRowsIn(doc, at, 3));
  const t = grown.blocks[at];
  expect(t.k === 'table' && t.rows.length).toBe(8);
  expect(t.k === 'table' && t.rows[5][4]).toBe('=SUM(E1:E5)');
  expect(t.k === 'table' && t.rows[6][4]).toBe('=E6*B7/100');
  expect(t.k === 'table' && t.rows[7][4]).toBe('=E6+E7');
  expect(tableView(grown, at)!.table.lock).toEqual([{ r0: 0, c0: 4, r1: 7, c1: 4 }]);
});

test('a cell typed into the blank row under a table adds the row; a row cleared at the end goes', () => {
  const doc = parse('A | B\n--- | ---\n1 | 2\n');
  const grown = applyAll(doc, setCellAt(doc, 0, 1, 0, 'x'));
  expect(write(grown)).toBe('A | B\n--- | ---\n1 | 2\nx |\n');
  const shrunk = applyAll(grown, setCellAt(grown, 0, 1, 0, ''));
  expect(write(shrunk)).toBe('A | B\n--- | ---\n1 | 2\n');
  expect(setCellAt(doc, 0, 3, 0, '')).toEqual([]);
});

test("a table's rows and columns, by their menus: put in, taken out, named; a range written; each on the table where it stands", () => {
  const doc = parse('Before\n\nA | B\n--- | ---\n1 | =A1*2\n2 | =A2*2\n\nAfter\n');
  const at = 1;
  const w = (ops: ReturnType<typeof tableRowsIn>) => write(applyAll(doc, ops));
  expect(w(tableRowsIn(doc, at, 1))).toBe('Before\n\nA | B\n--- | ---\n1 | =A1*2\n| |\n2 | =A3*2\n\nAfter\n');
  expect(w(tableRowsOut(doc, at, 0, 0))).toBe('Before\n\nA | B\n--- | ---\n2 | =A1*2\n\nAfter\n');
  expect(w(tableColIn(doc, at, 1))).toBe('Before\n\nA | ColB | B\n--- | --- | ---\n1 |  | =A1*2\n2 |  | =A2*2\n\nAfter\n');
  // A column taken out with what it holds: a formula that pointed into it says so.
  expect(w(tableColOut(doc, at, 0))).toBe('Before\n\n| B |\n| --- |\n| =#REF*2 |\n| =#REF*2 |\n\nAfter\n');
  expect(w(tableRename(doc, at, 0, 'Qty'))).toBe('Before\n\nQty | B\n--- | ---\n1 | =A1*2\n2 | =A2*2\n\nAfter\n');
  expect(
    w(
      tablePut(doc, at, {
        r: 1,
        c: 0,
        values: [
          ['5', '6'],
          ['7', '8'],
        ],
      }),
    ),
  ).toBe('Before\n\nA | B\n--- | ---\n1 | =A1*2\n5 | 6\n7 | 8\n\nAfter\n');
  // A range cleared at the end of the table takes its rows with it.
  expect(w(tablePut(doc, at, { r: 1, c: 0, values: [['', '']] }))).toBe('Before\n\nA | B\n--- | ---\n1 | =A1*2\n\nAfter\n');
  // Letter-named columns follow their places when one goes; a table keeps one column.
  const letters = parse('ColA | ColB | ColC\n--- | --- | ---\nx | y | z\n');
  expect(write(applyAll(letters, tableColOut(letters, 0, 0)))).toBe('ColA | ColB\n--- | ---\ny | z\n');
  const one = parse('A\n---\nx\n');
  expect(tableColOut(one, 0, 0)).toEqual([]);
  // Nothing on a block that is no table.
  expect(tableRowsIn(doc, 0, 0)).toEqual([]);
});

test('a card in hand: moved past its neighbour, copied after itself, taken out, something pasted after it', () => {
  const doc = parse('One\n\n![a picture](https://example.com/a.png)\n\nTwo\n');
  expect(write(applyAll(doc, moveBlock(doc, 1, -1)!))).toBe('![a picture](https://example.com/a.png)\n\nOne\n\nTwo\n');
  expect(write(applyAll(doc, moveBlock(doc, 1, 1)!))).toBe('One\n\nTwo\n\n![a picture](https://example.com/a.png)\n');
  expect(moveBlock(doc, 0, -1)).toBeNull();
  expect(moveBlock(doc, 2, 1)).toBeNull();
  expect(write(applyAll(doc, duplicateBlock(doc, 1)))).toBe('One\n\n![a picture](https://example.com/a.png)\n\n![a picture](https://example.com/a.png)\n\nTwo\n');
  expect(write(applyAll(doc, removeBlock(doc, 1)))).toBe('One\n\nTwo\n');
  expect(write(applyAll(doc, putAfter(1, [{ k: 'p', runs: [{ t: 'Pasted' }] }])))).toBe('One\n\n![a picture](https://example.com/a.png)\n\nPasted\n\nTwo\n');
});

test('pages: letter by default, A4 when the head says so, one page drawn small, many when the words run over', () => {
  const [p] = pages('# Title {.title}\n\nSome words.\n');
  expect([p.w, p.h]).toEqual([816, 1056]);
  expect(p.svg).toContain('Title');
  expect(p.alt).toBe('Title');
  const [a4] = pages('---\npaper: a4\n---\nwords\n');
  expect([a4.w, a4.h]).toEqual([794, 1123]);
  const long = Array.from({ length: 80 }, (_, i) => `Paragraph ${i + 1} with a few words in it to take up a line or two of the page.`).join('\n\n') + '\n';
  const many = pages(long);
  expect(many.length).toBeGreaterThan(1);
  expect(many[1].svg).toContain('>2</text>');
  expect(pages(long, true)).toHaveLength(1);
  // Drawn small, a full page stays a page; a short letter is cut to what is on it, never under a third of a page (Paul, 2026-10-13: the tiny letter on a slide).
  expect(pages(long, true)[0].h).toBe(1056);
  const letter = pages('# A letter {.title}\n\nDear neighbors,\n\nThe sale is **Saturday**.^[Ten to four.]\n\n- [ ] Tables\n', true)[0];
  expect(letter.w).toBe(816);
  expect(letter.h).toBeLessThan(1056 / 2);
  expect(letter.h).toBeGreaterThanOrEqual(352);
  expect(letter.svg).toContain('Ten to four');
  expect(pages('', true)[0].h).toBe(352);
  // An icon in the words is drawn as a glyph over the space it leaves.
  expect(pages('A :star: day\n')[0].svg).toMatch(/<g transform="translate\([\d.]+ [\d.]+\) scale\([\d.]+\)"/);
});

test('pages draw the table worked out, the head fields, a footnote, a web address as words, and another document', () => {
  const doc = parse(invoice() + '\nA note^[Said in passing].\n\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ\n\n```sheet\nA | B:number\n--- | ---\nx | 1\n```\n');
  const all = pages(doc);
  const p = { svg: all.map((x) => x.svg).join('') };
  expect(all[0].svg).toContain('$5,486.40');
  expect(p.svg).toContain('FROM');
  expect(p.svg).toContain('Street and number');
  expect(p.svg).toContain('Said in passing');
  expect(p.svg).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  expect(p.svg).not.toMatch(/<image|YouTube/);
  expect(p.svg).toContain(appOf('sheet')!.name);
  // The head's currency in place of the dollar.
  const euro = pages(parse(invoice().replace('currency: $', 'currency: €')))[0];
  expect(euro.svg).toContain('€5,486.40');
  expect(euro.svg).not.toContain('$5,486.40');
});

test('the web page: the title large, the fields, the table of values, the notes with ids, the embedded document as a picture that links', () => {
  const html = docToHtml(parse(invoice() + '\nA note^[Said in passing].\n\n```sheet\nA | B:number\n--- | ---\nx | 1\n```\n\n- [x] done\n'), ctx);
  expect(html).toContain('<h1 class="title">Invoice</h1>');
  expect(html).toContain('<dt>from</dt>');
  expect(html).toContain('<td class="n">$5,486.40</td>');
  expect(html).toContain('<th scope="col">What</th>');
  expect(html).toContain('role="doc-endnotes"');
  expect(html).toContain('id="fn-1"');
  expect(html).toContain('href="https://tinylittleoffice.com/#/v1/sheet/');
  expect(html).toContain('<svg');
  expect(html).toContain('<li class="task done"><input type="checkbox" checked disabled>');
  expect(html).toContain('<meta name="generator" content="TinyLittleOffice">');
});

test('RTF: the words, the marks, a table as a table, a web address as a link, the notes at the end', () => {
  const rtf = docToRtf(parse('# Head {.title}\n\nSome **bold** and *italic* words^[A note].\n\nA | B:number\n--- | ---\nx | =1+2\n\nhttps://example.com/a.mp3\n'), ctx);
  expect(rtf.startsWith('{\\rtf1')).toBe(true);
  expect(rtf).toContain('{\\b bold}');
  expect(rtf).toContain('{\\i italic}');
  expect(rtf).toContain('\\trowd');
  expect(rtf).toContain('\\intbl 3\\cell');
  expect(rtf).toContain('HYPERLINK "https://example.com/a.mp3"');
  expect(rtf).toContain('{\\super 1} A note');
});

test('DOCX: a zip with the document, its styles and numbering; the table, the title style and the notes inside', () => {
  const bytes = docToDocx(parse(invoice() + '\n1. one\n2. two\n\nA note^[Said in passing].\n'), ctx);
  const files = unzipSync(bytes);
  expect(Object.keys(files).sort()).toEqual(['[Content_Types].xml', '_rels/.rels', 'word/_rels/document.xml.rels', 'word/document.xml', 'word/numbering.xml', 'word/styles.xml']);
  const docXml = strFromU8(files['word/document.xml']);
  expect(docXml).toContain('<w:pStyle w:val="Title"/>');
  expect(docXml).toContain('<w:tbl>');
  expect(docXml).toContain('$5,486.40');
  expect(docXml).toContain('<w:numId w:val="2"/>');
  expect(docXml).toContain('Said in passing');
  expect(docXml).toContain('<w:pgSz w:w="12240" w:h="15840"/>');
  expect(strFromU8(files['word/styles.xml'])).toContain('w:styleId="Heading1"');
});

test('Markdown: the footnotes in the reference form', () => {
  expect(docToMarkdown(parse('Words^[A note] here.\n'))).toBe('Words[^1] here.\n\n[^1]: A note\n');
});

test('a page break: the next page on paper (never a blank one), break-after in print, a page break in .docx and .rtf, --- in Markdown', () => {
  const text = 'One.\n\n---\n\nTwo.\n';
  const all = pages(text);
  expect(all).toHaveLength(2);
  expect(all[0].svg).toContain('One.');
  expect(all[0].svg).not.toContain('Two.');
  expect(all[1].svg).toContain('Two.');
  // A break at the very top of a page starts nothing new; two in a row make one.
  expect(pages('---\n\nTop.\n')).toHaveLength(1);
  expect(pages('A.\n\n---\n\n---\n\nB.\n')).toHaveLength(2);
  const html = docToHtml(parse(text), ctx);
  expect(html).toContain('<p>One.</p>\n<hr class="page-break">\n<p>Two.</p>');
  expect(html).toContain('@media print{hr.page-break{break-after:page');
  const docXml = strFromU8(unzipSync(docToDocx(parse(text), ctx))['word/document.xml']);
  expect(docXml).toContain('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
  expect(docToRtf(parse(text), ctx)).toMatch(/One\.\\par\}\n\\page\n\{\\pard[^\n]* Two\./);
  expect(docToMarkdown(parse(text))).toBe(text);
});

test('a horizontal rule: a light line on the same page, <hr class="rule"> in a web page, a bottom border in .docx and .rtf, --- in Markdown', () => {
  const text = 'One.\n\n--- {.rule}\n\nTwo.\n';
  expect(write(parse(text))).toBe(text);
  const all = pages(text);
  expect(all).toHaveLength(1);
  expect(all[0].svg).toContain('Two.');
  expect(all[0].svg).toMatch(/<line x1="\d+" y1="[\d.]+" x2="\d+" y2="[\d.]+" stroke="#d4d4d8"\/>/);
  const html = docToHtml(parse(text), ctx);
  expect(html).toContain('<p>One.</p>\n<hr class="rule">\n<p>Two.</p>');
  expect(html).toContain('hr.rule{margin:1.25em 0;border:0;border-top:1px solid #d4d4d8}');
  const docXml = strFromU8(unzipSync(docToDocx(parse(text), ctx))['word/document.xml']);
  expect(docXml).toContain('<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="D4D4D8"/></w:pBdr>');
  expect(docXml).not.toContain('w:type="page"');
  const rtf = docToRtf(parse(text), ctx);
  expect(rtf).toContain('\\red212\\green212\\blue216;}');
  expect(rtf).toContain('{\\pard\\sb120\\sa240\\brdrb\\brdrs\\brdrw10\\brdrcf4\\brsp20\\fs4\\par}');
  expect(rtf).not.toContain('\\page');
  expect(docToMarkdown(parse(text))).toBe('One.\n\n---\n\nTwo.\n');
  // Shown as slides a rule starts nothing; in an outline it is gone, as a page break is.
  expect(writeToDeck(text)).toBe(writeToDeck('One.\n\nTwo.\n'));
  expect(writeToDeck(text)).not.toContain('---');
  expect(writeToOutline(text)).not.toContain('---');
});

test('a page break and a horizontal rule together: two pages, the line on the first, each its own <hr> in a web page', () => {
  const text = 'One.\n\n--- {.rule}\n\nTwo.\n\n---\n\nThree.\n';
  const all = pages(text);
  expect(all).toHaveLength(2);
  const line = /<line x1="\d+" y1="[\d.]+" x2="\d+" y2="[\d.]+" stroke="#d4d4d8"\/>/;
  expect(all[0].svg).toMatch(line);
  expect(all[0].svg).toContain('Two.');
  expect(all[1].svg).not.toMatch(line);
  expect(all[1].svg).toContain('Three.');
  const html = docToHtml(parse(text), ctx);
  expect(html.match(/<hr class="rule">/g)).toHaveLength(1);
  expect(html).toContain('<p>One.</p>\n<hr class="rule">\n<p>Two.</p>\n<hr class="page-break">\n<p>Three.</p>');
});

test('a horizontal rule with another class too is still a rule, and comes back with both', () => {
  const text = 'One.\n\n--- {.rule .center}\n\nTwo.\n';
  const doc = parse(text);
  expect(isRule(doc.blocks[1])).toBe(true);
  expect(write(doc)).toBe(text);
  expect(pages(text)).toHaveLength(1);
});

test('code: Plex Mono on the page, <code> in the web page, Courier New in Word and RTF, backticks in Markdown', () => {
  const text = 'Run **`npx tlo`** now.\n';
  const page = pages(text)[0].svg;
  expect(page).toMatch(/<tspan font-weight="600" font-family="'IBM Plex Mono'[^"]*">npx tlo<\/tspan>/);
  expect(docToHtml(parse(text), ctx)).toContain('<strong><code>npx tlo</code></strong>');
  const docXml = strFromU8(unzipSync(docToDocx(parse(text), ctx))['word/document.xml']);
  expect(docXml).toContain('<w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/><w:b/></w:rPr><w:t xml:space="preserve">npx tlo</w:t>');
  const rtf = docToRtf(parse(text), ctx);
  expect(rtf).toContain('{\\f2\\fmodern\\fcharset0 Courier New;}');
  expect(rtf).toContain('{\\b\\f2 npx tlo}');
  expect(docToMarkdown(parse(text))).toBe(text);
});

test('every template is a whole document: a name and a blurb, no placeholder words, and a look only where one is known', () => {
  for (const t of templates()) {
    expect(t.name, t.id).toBeTruthy();
    expect(t.blurb, t.id).toMatch(/\.$/);
    expect(t.doc, t.id).not.toMatch(/[Ll]orem ipsum|TODO|Day Month Year|[Ii]nsert here/);
    const look = parse(t.doc).head.look;
    if (look) expect(LOOK_IDS, t.id).toContain(look);
  }
  // The tables of sample data add up.
  const doc = (id: string) => parse(templates().find((t) => t.id === id)!.doc);
  const tables = (id: string) => doc(id).blocks.flatMap((b, i) => (b.k === 'table' ? [tableView(doc(id), i)!] : []));
  expect(tables('grant')[0].values[6][1]).toBe(4800);
  expect(tables('syllabus')[1].values[4][1]).toBeCloseTo(1);
  expect(tables('recipe')[0].values[7][3]).toBe(9);
  expect(tables('minutes')[0].values[4][1]).toBe(1453);
});

/** Each template's words before they were lightened (2026-10-11), the prose its sample story carried. */
const BEFORE: Record<string, number> = {
  letter: 121,
  cover: 175,
  memo: 158,
  meeting: 94,
  minutes: 153,
  resume: 50,
  cv: 103,
  invoice: 6,
  contract: 45,
  newsletter: 130,
  recipe: 150,
  faq: 192,
  press: 148,
  news: 243,
  interview: 274,
  'book-review': 258,
  'music-review': 197,
  thesis: 436,
  grant: 207,
  syllabus: 148,
  complaint: 263,
  politician: 203,
  love: 197,
  wedding: 228,
  eulogy: 229,
  zine: 230,
  petition: 156,
  terms: 234,
};

test('every template is its shape and a hint at each part, not a story: a third of its words, the prose in italics (Paul, 2026-10-11)', () => {
  for (const t of templates()) {
    const doc = parse(t.doc);
    const n = wordCount(doc);
    // Under a third of what it carried; the three that carried a heading's worth (the invoice, the contract, the résumé) no more than they did.
    expect(n, t.id).toBeLessThan(BEFORE[t.id] < 60 ? BEFORE[t.id] + 1 : BEFORE[t.id] / 3);
    expect(n, t.id).toBeLessThan(90);
    expect(t.doc, t.id).not.toMatch(/Mara|Harbor Studio|Okafor|Lovelace|Biscuit|Reyes|Ferreira|Raman|Casco|Westgate|Middlemarch|Daniel|Hannah/);
    for (const b of doc.blocks) {
      if (b.k !== 'p' && b.k !== 'li' && b.k !== 'quote') continue;
      for (const r of b.runs as { t: string; i?: boolean; b?: boolean; fn?: string }[]) {
        const words = (r.t.match(/\S+/g) ?? []).length;
        // Words that are not a hint (italic) nor a label (bold) are the shape's own: a greeting, a sign-off, a line's name.
        if (!r.i && !r.b) expect(words, `${t.id}: ${r.t}`).toBeLessThanOrEqual(4);
        // A hint is a sentence or two, at most about fifteen words.
        if (r.i) expect(words, `${t.id}: ${r.t}`).toBeLessThanOrEqual(18);
      }
    }
    expect(t.doc, t.id).toMatch(/\*[^*\s][^*\n]*\*/);
  }
});

test("the look is a head field, absent for sans, never one of the document's own fields, and stable through parse and write", () => {
  expect(lookOf(parse('words\n')).id).toBe('sans');
  expect(lookOf(parse('---\nlook: nonsense\n---\nwords\n')).id).toBe('sans');
  const text = '---\nlook: book\n---\n# A title {.title}\n\nOne.\n\nTwo.\n';
  expect(write(parse(text))).toBe(text);
  expect(lookOf(parse(text)).id).toBe('book');
  expect(fieldsOf(parse(text))).toEqual([]);
});

test("the pages wear the look: its faces, a book's justified lines and small capitals, a newspaper's two columns", () => {
  const body =
    '# The title {.title}\n\n## A heading\n\n' +
    Array.from({ length: 16 }, (_, i) => `Paragraph ${i} goes on for long enough that it has to wrap across more than one line of the page, and then a little more besides.`).join('\n\n') +
    '\n';
  const svg = (look: string) =>
    pages(look ? `---\nlook: ${look}\n---\n${body}` : body)
      .map((p) => p.svg)
      .join('');
  expect(svg('')).not.toContain('font-family="\'IBM Plex Serif');
  expect(svg('serif')).toContain("font-family=\"'IBM Plex Serif', Charter");
  expect(svg('mono')).toContain("font-family=\"'IBM Plex Mono', ui-monospace");
  const mixed = svg('mixed');
  expect(mixed).toMatch(/font-size="40" font-family="'IBM Plex Serif'/);
  expect(mixed).toMatch(/font-size="16"(?! font-family)/);
  const book = svg('book');
  expect(book).toContain('font-variant="small-caps"');
  expect(book).toContain('lengthAdjust="spacing"');
  expect(book).toContain('\u2003\u2003Paragraph 1');
  expect(book).not.toContain('\u2003\u2003Paragraph 0');
  const news = svg('news');
  expect(news).toContain(`font-family="'Bodoni 72'`);
  expect(news).toMatch(/<g transform="translate\(\d+ 0\)">/);
});

test("the files wear the look: the web page's CSS, Word's and RTF's font names, a newspaper's columns", () => {
  const doc = (look: string) => parse(`---\nlook: ${look}\n---\n# Headline {.title}\n\nOne.\n\nTwo.\n`);
  expect(docToHtml(doc('serif'), ctx)).toMatch(/body\{font-family:'IBM Plex Serif', Charter/);
  expect(docToHtml(doc('news'), ctx)).toContain('columns:2');
  expect(docToHtml(doc('book'), ctx)).toContain('main>p+p{text-indent:1.5em}');
  const styles = (look: string) => strFromU8(unzipSync(docToDocx(doc(look), ctx))['word/styles.xml']);
  expect(styles('sans')).toContain('w:ascii="Calibri"');
  expect(styles('serif')).toContain('w:ascii="Georgia"');
  expect(styles('mono')).toContain('w:ascii="Courier New"');
  expect(styles('book')).toContain('<w:smallCaps/>');
  const news = strFromU8(unzipSync(docToDocx(doc('news'), ctx))['word/document.xml']);
  expect(news).toContain('<w:cols w:num="2"');
  const bookXml = strFromU8(unzipSync(docToDocx(doc('book'), ctx))['word/document.xml']);
  expect(bookXml).toContain('<w:ind w:firstLine="360"/><w:jc w:val="both"/>');
  expect(docToRtf(doc('sans'), ctx)).toContain('{\\f0\\fswiss\\fcharset0 Helvetica;}');
  expect(docToRtf(doc('mixed'), ctx)).toContain('{\\f0\\fswiss\\fcharset0 Helvetica;}{\\f1\\froman\\fcharset0 Georgia;}');
  expect(docToRtf(doc('news'), ctx)).toContain('\\cols2');
  expect(docToRtf(doc('book'), ctx)).toContain('\\fi360');
});

test("a look named for an Object's own property is sans (a review, 2026-10-17)", async () => {
  const { lookOf } = await import('../look.ts');
  for (const name of ['constructor', 'toString', '__proto__']) expect(lookOf(parse(`---\nlook: ${name}\n---\nA\n`)).id, name).toBe('sans');
  expect(lookOf(parse('---\nlook: book\n---\nA\n')).id).toBe('book');
});
