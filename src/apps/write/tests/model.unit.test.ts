// Write's reading and drawing under node: the name, the word count, a cell typed into a table block, a row put in
// inside a sum's reach, the pages on either paper, and every file it becomes (HTML, RTF, DOCX, Markdown); each
// template round-trips byte for byte and the invoice adds up.
import { unzipSync, strFromU8 } from 'fflate';
import { expect, test } from 'vitest';
import { applyAll, evaluate, firstTable, formatCell, parse, write } from '../../../doc/index.ts';
import write_ from '../def.ts';
// The registry, so a document held in the text is drawn by its own app.
import '../../../kit/apps.ts';
import { duplicateBlock, moveBlock, putAfter, removeBlock, retitle, tableColIn, tableColOut, tablePut, tableRename, tableRowsIn, tableRowsOut, setCellAt, tableView, titleOf, wordCount } from '../model.ts';
import { templates } from '../templates.ts';
import { docToDocx, docToHtml, docToMarkdown, docToRtf, pages } from '../view.ts';

const ctx = { title: 'Test', link: 'https://tinylittleoffice.com/#/v1/write/rAbc' };
const invoice = () => templates().find((t) => t.id === 'invoice')!.doc;

test('the name is the head title, else the title heading; retitle writes the head', () => {
  expect(titleOf('# Hello there {.title}\n\nwords\n')).toBe('Hello there');
  expect(titleOf('---\ntitle: Named\n---\n# Hello {.title}\n')).toBe('Named');
  expect(titleOf('# Not a title\n')).toBe('');
  expect(retitle('# Hello {.title}\n', 'Named')).toBe('---\ntitle: Named\n---\n# Hello {.title}\n');
  expect(retitle('---\ntitle: Named\n---\nwords\n', '')).toBe('words\n');
});

test('words are counted in the text and its notes, not in a web address alone', () => {
  expect(wordCount(parse('One two^[three four] five\n\nhttps://example.com/x\n\n- six\n'))).toBe(6);
});

test('every template is canonical and parses as the kernel wrote it', () => {
  expect(write_.templates.map((t) => t.id)).toEqual(['letter', 'meeting', 'resume', 'contract', 'invoice']);
  for (const t of write_.templates) {
    expect(write(parse(t.doc)), t.id).toBe(t.doc);
    expect(t.doc.endsWith('\n')).toBe(true);
    expect(write_.view(t.doc).length).toBeGreaterThan(0);
  }
  const contract = parse(write_.templates.find((t) => t.id === 'contract')!.doc);
  const last = contract.blocks[contract.blocks.length - 1];
  expect(last.k === 'fence' && last.lang).toBe('signatures');
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

test('a table\'s rows and columns, by their menus: put in, taken out, named; a range written; each on the table where it stands', () => {
  const doc = parse('Before\n\nA | B\n--- | ---\n1 | =A1*2\n2 | =A2*2\n\nAfter\n');
  const at = 1;
  const w = (ops: ReturnType<typeof tableRowsIn>) => write(applyAll(doc, ops));
  expect(w(tableRowsIn(doc, at, 1))).toBe('Before\n\nA | B\n--- | ---\n1 | =A1*2\n| |\n2 | =A3*2\n\nAfter\n');
  expect(w(tableRowsOut(doc, at, 0, 0))).toBe('Before\n\nA | B\n--- | ---\n2 | =A1*2\n\nAfter\n');
  expect(w(tableColIn(doc, at, 1))).toBe('Before\n\nA | ColB | B\n--- | --- | ---\n1 |  | =A1*2\n2 |  | =A2*2\n\nAfter\n');
  // A column taken out with what it holds: a formula that pointed into it says so.
  expect(w(tableColOut(doc, at, 0))).toBe('Before\n\n| B |\n| --- |\n| =#REF*2 |\n| =#REF*2 |\n\nAfter\n');
  expect(w(tableRename(doc, at, 0, 'Qty'))).toBe('Before\n\nQty | B\n--- | ---\n1 | =A1*2\n2 | =A2*2\n\nAfter\n');
  expect(w(tablePut(doc, at, { r: 1, c: 0, values: [['5', '6'], ['7', '8']] }))).toBe('Before\n\nA | B\n--- | ---\n1 | =A1*2\n5 | 6\n7 | 8\n\nAfter\n');
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
  // An icon in the words is drawn as a glyph over the space it leaves.
  expect(pages('A :star: day\n')[0].svg).toMatch(/<g transform="translate\([\d.]+ [\d.]+\) scale\([\d.]+\)"/);
});

test('pages draw the table worked out, the head fields, a footnote, a web card and another document', () => {
  const doc = parse(invoice() + '\nA note^[Said in passing].\n\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ\n\n```sheet\nA | B:number\n--- | ---\nx | 1\n```\n');
  const all = pages(doc);
  const p = { svg: all.map((x) => x.svg).join('') };
  expect(all[0].svg).toContain('$5,486.40');
  expect(p.svg).toContain('FROM');
  expect(p.svg).toContain('Harbor Studio');
  expect(p.svg).toContain('Said in passing');
  expect(p.svg).toContain('YouTube');
  expect(p.svg).toContain('Sheet');
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

test('RTF: the words, the marks, a table as a table, a link to a thing from the web, the notes at the end', () => {
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
