import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strFromU8, unzipSync } from 'fflate';

import '../src/apps/index.ts';
import { apps, appOf, csv, csvSeparator, extOf, fileName, docHtml, pageSvg, printHtml, slug } from '../src/kit/core.ts';
import { pdf } from '../src/kit/pdf.ts';
import { specOf } from '../src/lib/diagram.ts';
import { calendarToIcs } from '../src/apps/cal.def.ts';
import { deckToPptx } from '../src/apps/deck.def.ts';
import { docToDocx, docToHtml, docToRtf } from '../src/apps/write.def.ts';
import { ganttToIcs } from '../src/apps/gantt.def.ts';
import { todosToIcs } from '../src/apps/todo.def.ts';
import { drawingToSvg } from '../src/apps/draw.def.ts';
import { sheetToCsv, sheetToXlsx, toExcelFormula } from '../src/apps/sheet.def.ts';

const ctx = { created: Date.UTC(2026, 0, 2, 3, 4) };

test('every app is defined, and download names resolve', () => {
  assert.deepEqual(apps().map((a) => a.id), ['sheet','write','outline','deck','draw','cal','todo','board','gantt','trip','anim','org','mind','lanes','venn','net','site','links','invoice','contract','zine','booklet','brochure','comic','poster','badges','calc','pixel','seating','family','timeline','wordsearch','spinner','santa','split','web','qr']);
  assert.equal(extOf('ppt'), 'pptx');
  assert.equal(extOf('PPTX'), 'pptx');
  assert.equal(extOf('ical'), 'ics');
  assert.equal(extOf('xls'), 'xlsx');
  assert.ok(appOf('deck')!.downloads!.some((d) => d.ext === 'pptx'));
  assert.equal(appOf('tune'), undefined);
});

test('file names come from the document title, in any script, safe on every filesystem', () => {
  assert.equal(fileName(appOf('deck')!, '## :rocket: Launch plan — Q3!\n\n- one', 'pptx'), 'launch-plan-q3.pptx');
  assert.equal(fileName(appOf('write')!, '# Café *memo*\n\nbody', 'rtf'), 'cafe-memo.rtf');
  assert.equal(fileName(appOf('deck')!, '', 'pptx'), 'deck.pptx');
  assert.equal(fileName(appOf('cal')!, '- 2020-01-02: x', 'ics'), 'cal.ics');
  // Letters of every script stay (й keeps its breve; a Latin accent goes); what no filesystem takes goes.
  assert.equal(fileName(appOf('write')!, '# Привет, κόσμε: 日本語 / файл?', 'docx'), 'привет-κόσμε-日本語-файл.docx');
  assert.equal(slug('Straße <in> "Köln" | 2026*'), 'straße-in-koln-2026');
  assert.equal(slug('😀 :) ...'), '');
  assert.equal(extOf('doc'), 'docx');
});

test('CSV takes the separator of the place: a semicolon, with decimal commas, where the decimal mark is a comma', () => {
  assert.ok([',', ';'].includes(csvSeparator()));
  assert.equal(csv([['A', 'B'], ['1.5', 'x;y'], [2, 'a,b']], ';'), 'A;B\r\n1,5;"x;y"\r\n2;a,b\r\n');
  assert.equal(csv([['1.5', 'a,b']]), '1.5,"a,b"\r\n');
  assert.equal(sheetToCsv('N | Cost:money\n--- | ---\n1.25 | 2', ';'), 'N;Cost\r\n1,25;$2.00\r\n');
});

/** Every tag opened is closed, in order: what any XML reader would check first. */
function balanced(xml: string): boolean {
  const open: string[] = [];
  for (const m of xml.matchAll(/<(\/?)([\w:.-]+)[^>]*?(\/?)>/g)) {
    if (m[1]) {
      if (open.pop() !== m[2]) return false;
    } else if (!m[3] && !m[0].startsWith('<?')) open.push(m[2]);
  }
  return open.length === 0;
}

test('write to docx: WordprocessingML that opens anywhere, with styles, lists that restart, links and the paper', () => {
  const body = '---\npaper: a4\n---\n# Memo {.title}\n\n# Plan\n\nPlain **bold** _it_ <u>under</u> ~~gone~~ ==hi== and https://x.y/z\n\n- one\n  - two\n\n1. first\n2. second\n\nBetween {.center}\n\n1. again\n\n```sheet\nA | B\n--- | ---\n1 | 2\n```';
  const files = unzipSync(docToDocx(body, { ...ctx, base: 'https://example.com/' }));
  const part = (name: string) => strFromU8(files[name]);
  for (const name of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml', 'word/numbering.xml', 'word/_rels/document.xml.rels']) assert.ok(files[name] && balanced(part(name)), name);
  assert.ok(part('[Content_Types].xml').includes('PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"'));
  const doc = part('word/document.xml');
  assert.ok(doc.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'));
  assert.ok(doc.includes('<w:pStyle w:val="Title"/></w:pPr><w:r><w:t xml:space="preserve">Memo</w:t></w:r>'));
  assert.ok(doc.includes('<w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t xml:space="preserve">Plan</w:t></w:r>'));
  assert.ok(doc.includes('<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">bold</w:t></w:r>'));
  assert.ok(doc.includes('<w:rPr><w:i/></w:rPr><w:t xml:space="preserve">it</w:t>') && doc.includes('<w:u w:val="single"/>') && doc.includes('<w:strike/>') && doc.includes('<w:highlight w:val="yellow"/>'));
  // A nested bullet is level 1 of the bullet numbering; the two numbered lists are instances of their own, each starting at 1.
  assert.ok(doc.includes('<w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr>'));
  assert.ok(doc.includes('<w:numId w:val="2"/>') && doc.includes('<w:numId w:val="3"/>'));
  assert.equal(part('word/numbering.xml').match(/<w:startOverride w:val="1"\/>/g)!.length, 2);
  assert.ok(doc.includes('<w:jc w:val="center"/>'));
  // Links in the words, and the embedded sheet as a link to it, are relationships to the outside.
  const rels = part('word/_rels/document.xml.rels');
  assert.ok(doc.includes('<w:hyperlink r:id="rId3"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr><w:t xml:space="preserve">https://x.y/z</w:t></w:r></w:hyperlink>'));
  assert.ok(rels.includes('Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://x.y/z" TargetMode="External"'));
  assert.ok(rels.includes('Target="https://example.com/#/v0/sheet/') && doc.includes('<w:hyperlink r:id="rId4">'));
  assert.ok(doc.includes('<w:pgSz w:w="11906" w:h="16838"/>'));
  assert.ok(strFromU8(unzipSync(docToDocx('# Hi'))['word/document.xml']).includes('<w:pgSz w:w="12240" w:h="15840"/>'));
  // Characters are what they are, escaped for XML only.
  assert.ok(strFromU8(unzipSync(docToDocx('Привет <κόσμε> & 日本語'))['word/document.xml']).includes('<w:t xml:space="preserve">Привет &lt;κόσμε&gt; &amp; 日本語</w:t>'));
});

test('a schedule and a list as iCalendar: all-day events, to-dos; UTF-8 folded at 75 octets without breaking a character', () => {
  const gantt = ganttToIcs('Task | Start | Days | Done\n--- | --- | --- | ---\nПишем документацию для всех: ' + 'ё'.repeat(40) + ' | 2020-01-03 | 2 | 0%\nSub | 2020-01-04 | 1 | 50%', ctx);
  assert.ok(gantt.includes('BEGIN:VEVENT\r\nUID:') && gantt.includes('DTSTART;VALUE=DATE:20200103\r\nDTEND;VALUE=DATE:20200105\r\nSUMMARY:Пишем'));
  assert.ok(gantt.includes('DESCRIPTION:50% done'));
  for (const line of gantt.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  assert.ok(gantt.replace(/\r\n /g, '').includes('Пишем документацию для всех: ' + 'ё'.repeat(40)));
  assert.equal(gantt.match(/BEGIN:VEVENT/g)!.length, 2);
  const todo = todosToIcs('- [x] Buy milk\n- [ ] Call 日本 {.star due=2020-02-01}', ctx);
  assert.ok(todo.includes('BEGIN:VTODO\r\nUID:') && todo.includes('SUMMARY:Buy milk\r\nSTATUS:COMPLETED\r\nEND:VTODO'));
  assert.ok(todo.includes('SUMMARY:Call 日本\r\nSTATUS:NEEDS-ACTION\r\nDUE;VALUE=DATE:20200201\r\nPRIORITY:1\r\nEND:VTODO'));
  assert.ok(todo.includes('DTSTAMP:20260102T030400Z') && todo.endsWith('END:VCALENDAR\r\n'));
  // No byte order mark anywhere but CSV, where Excel wants one.
  for (const [id, ext] of [['cal', 'ics'], ['gantt', 'ics'], ['todo', 'ics'], ['write', 'rtf'], ['outline', 'opml'], ['trip', 'gpx']]) {
    const d = appOf(id)!.downloads!.find((x) => x.ext === ext)!;
    assert.notEqual(d.build!(appOf(id)!.id === 'trip' ? '' : '- x', ctx)[0], 0xef, `${id}.${ext}`);
  }
  for (const id of ['sheet', 'board', 'gantt']) assert.equal(appOf(id)!.downloads!.find((x) => x.ext === 'csv')!.build!('A | B\n--- | ---\n1 | 2', ctx)[0], 0xef, `${id}.csv has the mark`);
});


test('every app draws itself, and is a web page with preview tags', () => {
  const samples: Record<string, string> = {
    sheet: '---\nchart: bar\n---\nItem | Cost\n--- | ---\nRent | 1200\nFood | 600',
    outline: '- Launch\n  - <Product>\n    - Pricing',
    write: '# Memo\n\nSome **bold** text\n\n- one\n  - nested\n\n1. first',
    deck: '## :rocket: Spring launch {.title}\n\n- What ships\n\n---\n\n## Agenda {.two}\n\n- one\n\n|\n\n- two\n',
    draw: 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nr | 2 | 1 | 12 | 6 | 1b3 | Box\na | 14 | 4 | 8 | 0 | 0 |',
    cal: '---\nzone: America/New_York\n---\n- 2020-01-01 05:00-06:30: Call\n- 2020-01-03 to 2020-01-04: Offsite',
    todo: '- [ ] one\n- [x] two {.star due=2025-06-23}',
    board: '## A\n\n- x\n- y\n\n## B {limit=1}',
    gantt: 'Task | Start:date | Days:number | Done:percent\n--- | --- | --- | ---\nDesign | 2025-06-23 | 5 | 50%\n- Sketch | 2025-06-23 | 2 | 100%\n- Review | 2025-06-25 | 3 | 0%',
    trip: '---\nunits: miles\n---\nPlace | Lat:number | Lon:number | Note\n--- | --- | --- | ---\nLisbon | 38.7223 | -9.1393 | note\nB | 2.62144 | 0 |',
    anim: 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nt | 4 | 20 | 20 | 4 | 04 | Lift <off>\ni | 8 | 36 | 8 | 8 | 0b | rocket\n\nShape | Keys\n--- | ---\n0 | 0,0,0,0,1,0; 23,0,-100,0,1,0,i\n1 | 0,0,0,0,1,0; 23,200,-200,100,1,-30,d',
    zine: '## :star: Small <Joys>\n\nIssue one\n\n---\n\n## Coffee\n\nThe first cup.\n',
    booklet: '## A <book>\n\nby me\n\n---\n\n## One\n\nwords\n',
    calc: '2+<2>\n7*6',
    poster: '## :music: Open <mic> night\n\nFriday 12 March, 8pm\n',
    badges: '## Ada <Lovelace>\n\nEngineering\n\n---\n\n## Grace Hopper\n\nCompilers\n',
    brochure: '## Visit\n\n---\n\n## Why\n\nbecause\n',
    pixel: 'ab.c\n.<d',
    comic: '## Biscuit <out>\n\n---\n\n- :dog: Walk? | Monday\n',
    web: '---\nalt: The <sea>\n---\nhttps://example.org/sea.jpg',
  };
  for (const def of apps()) {
    for (const body of [samples[def.id] ?? specOf(def.id)!.example, '']) {
      const pages = def.view(body);
      assert.ok(pages.length >= 1, def.id);
      for (const p of pages) {
        assert.ok(p.w > 0 && p.h > 0 && Number.isFinite(p.w + p.h), `${def.id} page size`);
        assert.ok(!pageSvg(p).includes('NaN') && !pageSvg(p).includes('undefined'), `${def.id} draws cleanly`);
      }
      assert.ok(def.view(body, { embed: true }).length >= 1);
      const page = docHtml({ def, body }, { created: Date.UTC(2026, 0, 2), base: 'https://example.com/' }, 'https://example.com/x/#/v0/x/abc');
      assert.ok(page.includes(`<meta property="og:image" content="https://example.com/og/${def.id}.png">`), def.id);
      assert.ok(page.includes('<meta property="og:title"') && page.includes('<meta name="description"'));
      assert.ok(page.includes('<meta property="article:published_time" content="2026-01-02T00:00:00.000Z">'));
      assert.ok(page.includes('<main>') && (def.id === 'write' || page.includes('<h1')), `${def.id} is real HTML`);
    }
  }
  // Real HTML where the app has it: a table, a checklist, nested lists.
  const html = (id: string) => docHtml({ def: appOf(id)!, body: samples[id] }, { created: null });
  assert.ok(html('sheet').includes('<td class="n">1200</td>') && html('sheet').includes('<th scope="col">Cost</th>') && html('sheet').includes('role="img" aria-label="Chart"'));
  assert.ok(html('todo').includes('<input type="checkbox" disabled checked> <strong>two</strong>'));
  assert.ok(html('write').replace(/\n/g, '').includes('<ul><li>one<ul><li>nested</li></ul></li></ul><ol><li>first</li></ol>'));
  assert.ok(html('trip').includes('<strong>Lisbon</strong>'));
  // Sheets with a chart are the chart when shown inside another document.
  assert.equal(appOf('sheet')!.view(samples.sheet).length, 2);
  assert.ok(appOf('sheet')!.view(samples.sheet, { embed: true })[0].svg.includes('Rent'));
  // Things that build: a drawing by shape, a table by row.
  assert.equal(appOf('draw')!.steps!(samples.draw), 2);
  assert.ok(!appOf('draw')!.view(samples.draw, { step: 1 })[0].svg.includes('marker-end'));
  assert.equal(appOf('sheet')!.steps!('ColA | ColB\n--- | ---\na |\nb |\nc |'), 3);
});

test('pdf: one page per picture', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const out = pdf([{ w: 960, h: 600, pw: 1920, ph: 1200, jpeg }, { w: 720, h: 1018, pw: 720, ph: 1018, jpeg }], 'Launch');
  const text = new TextDecoder('latin1').decode(out);
  assert.ok(text.startsWith('%PDF-1.4'));
  assert.ok(text.trimEnd().endsWith('%%EOF'));
  assert.equal(text.match(/\/Type \/Page /g)!.length, 2);
  assert.ok(text.includes('/MediaBox [0 0 720 450]') && text.includes('/Width 1920 /Height 1200'));
  // The cross-reference table points at every object.
  const xref = Number(/startxref\n(\d+)/.exec(text)![1]);
  // (Objects: catalog, pages, info, three for each page, and the font its numbers are set in.)
  assert.ok(text.slice(xref).startsWith('xref\n0 11\n'));
  for (const [, off, n] of [...text.slice(xref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m, i) => [m[0], m[1], i + 1] as const)) assert.ok(text.slice(Number(off)).startsWith(`${n} 0 obj`), `object ${n}`);
});

test('sheet to csv: the names over the columns, computed values, quoting, used range only', () => {
  assert.equal(sheetToCsv('ColA | ColB\n--- | ---\n10 | Total, "net"\n32 |\n=SUM(A1:A2)*2 |'), '10,"Total, ""net"""\r\n32,\r\n84,\r\n');
  assert.equal(sheetToCsv('N | Cost:money | ColC\n--- | --- | ---\n1 | 2 |'), 'N,Cost\r\n1,$2.00\r\n');
  assert.equal(sheetToCsv(''), '');
});

test('sheet to xlsx: formulas survive in Excel dialect', () => {
  assert.equal(toExcelFormula('=round(avg(A1:A3),1)'), 'ROUND(AVERAGE(A1:A3),1)');
  // A named cell is its reference there (a row down, for the names' row); words in quotes and functions are left alone.
  const refs = new Map<string, [number, number]>([['VISITORS', [0, 4]], ['SIGNUP_RATE', [1, 4]]]);
  assert.equal(toExcelFormula('=visitors*signup_rate/100', refs, 1), 'E2*E3/100');
  assert.equal(toExcelFormula('=SUMIF(B1:B9, "visitors", C1:C9)+ROUND(visitors)', refs, 1), 'SUMIF(B1:B9, "VISITORS", C1:C9)+ROUND(E2)');
  const files = unzipSync(sheetToXlsx('ColA | ColB\n--- | ---\n10 | A & <B>\n32 |\n=AVG(A1:A2) | =A1/0', ctx));
  assert.equal(Object.keys(files)[0], '[Content_Types].xml');
  const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
  assert.match(sheet, /<c r="A1"><v>10<\/v><\/c>/);
  assert.match(sheet, /<c r="B1" t="inlineStr"><is><t xml:space="preserve">A &amp; &lt;B&gt;<\/t><\/is><\/c>/);
  assert.match(sheet, /<c r="A3"><f>AVERAGE\(A1:A2\)<\/f><v>21<\/v><\/c>/);
  assert.match(sheet, /<c r="B3" t="str"><f>A1\/0<\/f><v>#DIV\/0<\/v><\/c>/);
  // Named columns take Excel's first row, and every row and reference moves down one to make room.
  const named = strFromU8(unzipSync(sheetToXlsx('Item | Cost:money\n--- | ---\nRent | 1200\nTotal | =SUM(B1:B1)', ctx))['xl/worksheets/sheet1.xml']);
  assert.match(named, /<row r="1"><c r="A1" t="inlineStr"><is><t xml:space="preserve">Item<\/t><\/is><\/c><c r="B1" t="inlineStr"><is><t xml:space="preserve">Cost<\/t>/);
  assert.match(named, /<c r="B2" s="2"><v>1200<\/v><\/c>/);
  assert.match(named, /<c r="B3" s="2"><f>SUM\(B2:B2\)<\/f><v>1200<\/v><\/c>/);
});

test('the page to print: prose on its paper with the text of every script as text; pictures a page each at their own size', () => {
  const write = appOf('write')!;
  const a4 = printHtml({ def: write, body: '---\npaper: a4\n---\n# Привет, κόσμε\n\nñandú and 日本語 **bold**' }, ctx);
  assert.ok(a4.includes('@page{size:A4;margin:25mm}'));
  assert.ok(a4.includes('<meta charset="utf-8">'));
  assert.ok(a4.includes('Привет, κόσμε') && a4.includes('ñandú and 日本語 <strong>bold</strong>'));
  assert.ok(a4.includes('h1,h2,h3{break-after:avoid}'));
  assert.ok(!a4.includes('<svg'), 'prose is text, not pictures');
  assert.ok(printHtml({ def: write, body: '---\npaper: letter\n---\n# Hi' }, ctx).includes('@page{size:letter;margin:1in}'));
  // A drawn document: a figure a page, the paper the page's own size, and the words still text in the SVG.
  const zine = printHtml({ def: appOf('zine')!, body: '## Малые радости\n\nIssue one\n' }, ctx);
  assert.ok(zine.includes('@page{size:11in 8.5in;margin:0}'));
  assert.equal(zine.match(/<figure>/g)!.length, 1);
  assert.ok(zine.includes('Малые радости'));
  assert.ok(printHtml({ def: appOf('deck')!, body: '## One\n\n---\n\n## Two' }, ctx).includes('@page{size:10in 6.25in;margin:0}'));
});

test('write to rtf and html', () => {
  const body = '# Memo\n\nPlain **bold *both*** {x} café\n\n- one\n- two\n\n1. first\n2. second';
  const rtf = docToRtf(body);
  assert.ok(rtf.startsWith('{\\rtf1\\ansi'));
  assert.ok(rtf.trimEnd().endsWith('}'));
  assert.ok(rtf.includes('\\b\\fs40 Memo\\par'));
  assert.ok(rtf.includes('{\\b bold }{\\b\\i both}'));
  assert.ok(rtf.includes('\\{x\\} caf\\u233?'));
  assert.ok(rtf.includes('\\bullet\\tab one'));
  assert.ok(rtf.includes('1.\\tab first') && rtf.includes('2.\\tab second'));
  assert.ok(docToRtf('😀').includes('\\u-10179?\\u-8704?'));
  const html = docToHtml(body).replace(/\n/g, '');
  assert.ok(html.includes('<h1>Memo</h1>'));
  assert.ok(html.includes('<strong>bold </strong><strong><em>both</em></strong>'));
  assert.ok(html.includes('<ul><li>one</li><li>two</li></ul><ol><li>first</li>'));
});

test('deck to pptx: one slide part per slide, icons embedded when supplied', () => {
  const body = '## :rocket: Launch <plan>\n\n- Build it\n-\n- Ship & tell\n\n---\n\n## Second\n';
  const png = new Uint8Array([137, 80, 78, 71]);
  const files = unzipSync(deckToPptx(body, { ...ctx, png: { 'icon-rocket': png } }));
  assert.equal(Object.keys(files)[0], '[Content_Types].xml');
  for (const part of ['ppt/presentation.xml', 'ppt/slideMasters/slideMaster1.xml', 'ppt/slideLayouts/slideLayout1.xml', 'ppt/theme/theme1.xml', 'ppt/slides/slide1.xml', 'ppt/slides/slide2.xml'])
    assert.ok(files[part], part);
  // The third slide is the closing QR code of the deck; there is no fourth.
  assert.ok(files['ppt/slides/slide3.xml']);
  assert.equal(files['ppt/slides/slide4.xml'], undefined);
  assert.deepEqual([...files['ppt/media/icon-rocket.png']], [...png]);
  const s1 = strFromU8(files['ppt/slides/slide1.xml']);
  assert.ok(s1.includes('<a:t>Launch &lt;plan&gt;</a:t>'));
  assert.ok(s1.includes('<a:t>Build it</a:t>') && s1.includes('<a:t>Ship &amp; tell</a:t>'));
  assert.equal(s1.match(/<a:p>/g)!.length, 3); // headline and two bullets: the blank one is dropped
  assert.ok(s1.includes('r:embed="rId2"'));
  assert.ok(strFromU8(files['ppt/slides/_rels/slide1.xml.rels']).includes('../media/icon-rocket.png'));
  assert.ok(!strFromU8(files['ppt/slides/slide2.xml']).includes('<p:pic>'));
  // Without a PNG the slide simply has no picture.
  assert.ok(!strFromU8(unzipSync(deckToPptx(body, ctx))['ppt/slides/slide1.xml']).includes('<p:pic>'));
  // Same document, same bytes.
  assert.deepEqual(deckToPptx(body, ctx), deckToPptx(body, ctx));
});

test('drawing to svg', () => {
  const svg = drawingToSvg('Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nr | 2 | 1 | 12 | 6 | 2 | Box <1>\na | 14 | 4 | 8 | 0 | 1 |\nt | 0 | 0 | 12 | 3 | 0 | Note');
  assert.ok(svg.includes('viewBox="0 0 640 400"'));
  assert.ok(svg.includes('<rect x="16" y="8" width="96" height="48" rx="2" fill="#18181b"'));
  assert.ok(svg.includes('fill="#ffffff">Box &lt;1&gt;</text>'));
  assert.ok(svg.includes('stroke-dasharray="6 4" marker-end="url(#arrow)"'));
  assert.ok(svg.includes('text-anchor="start"') && svg.includes('>Note</text>'));
});

test('calendar to ics: floating all-day dates and UTC instants', () => {
  // 2020-01-03 for two days, and 90 minutes from 2020-01-01T10:00Z, which is 05:00 in New York.
  const ics = calendarToIcs('---\nzone: America/New_York\n---\n- 2020-01-03 to 2020-01-04: Offsite; day 1, 2\n- 2020-01-01 05:00-06:30: Call', ctx);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(ics.includes(['DTSTART;VALUE=DATE:20200103', 'DTEND;VALUE=DATE:20200105', String.raw`SUMMARY:Offsite\; day 1\, 2`, ''].join('\r\n')));
  assert.ok(ics.includes('DTSTART:20200101T100000Z\r\nDTEND:20200101T113000Z\r\nSUMMARY:Call\r\n'));
  assert.ok(ics.includes('DTSTAMP:20260102T030400Z'));
  assert.equal(ics.match(/BEGIN:VEVENT/g)!.length, 2);
  const long = calendarToIcs('- 2020-01-01: ' + 'é'.repeat(60), ctx);
  for (const line of long.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  assert.ok(long.replace(/\r\n /g, '').includes('SUMMARY:' + 'é'.repeat(60)));
});
