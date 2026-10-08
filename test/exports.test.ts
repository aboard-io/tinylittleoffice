import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strFromU8, unzipSync } from 'fflate';

import '../src/apps/index.ts';
import { apps, appOf, extOf, fileName, docHtml, pageSvg } from '../src/kit/core.ts';
import { pdf } from '../src/kit/pdf.ts';
import { specOf } from '../src/lib/diagram.ts';
import { calendarToIcs } from '../src/apps/cal.def.ts';
import { deckToPptx } from '../src/apps/deck.def.ts';
import { docToHtml, docToRtf } from '../src/apps/write.def.ts';
import { drawingToSvg } from '../src/apps/draw.def.ts';
import { sheetToCsv, sheetToXlsx, toExcelFormula } from '../src/apps/sheet.def.ts';

const ctx = { created: Date.UTC(2026, 0, 2, 3, 4) };

test('every app is defined, and download names resolve', () => {
  assert.deepEqual(apps().map((a) => a.id), ['sheet','write','outline','deck','draw','cal','todo','board','gantt','trip','anim','org','mind','lanes','venn','net','db','site','store','invoice','contract','zine','booklet','brochure','comic','poster','menu','resume','badges','recipes','flow','calc','pixel','floor','seating','family','timeline','wordsearch','adventure','hunt','trivia','madlibs','spinner','flashcards','poll','santa','split','log','qr']);
  assert.equal(extOf('ppt'), 'pptx');
  assert.equal(extOf('PPTX'), 'pptx');
  assert.equal(extOf('ical'), 'ics');
  assert.equal(extOf('xls'), 'xlsx');
  assert.ok(appOf('deck')!.downloads!.some((d) => d.ext === 'pptx'));
  assert.equal(appOf('tune'), undefined);
});

test('file names come from the document title', () => {
  assert.equal(fileName(appOf('deck')!, ':rocket\nLaunch plan — Q3!\none', 'pptx'), 'launch-plan-q3.pptx');
  assert.equal(fileName(appOf('write')!, '# Café *memo*\nbody', 'rtf'), 'cafe-memo.rtf');
  assert.equal(fileName(appOf('deck')!, '', 'pptx'), 'deck.pptx');
  assert.equal(fileName(appOf('cal')!, '- 2020-01-02: x', 'ics'), 'cal.ics');
});

test('every app draws itself, and is a web page with preview tags', () => {
  const samples: Record<string, string> = {
    sheet: '!bar\nItem\tCost\nRent\t1200\nFood\t600',
    outline: 'Launch\n  <Product>\n    Pricing',
    write: '# Memo\nSome *bold* text\n- one\n-- nested\n+ first',
    deck: ':rocket:t\nSpring launch\nWhat ships\n\n::2\nAgenda\none\n|\ntwo',
    draw: 'r,2,1,12,6,1b3,Box\na,14,4,8,0,0',
    cal: '---\nzone: America/New_York\n---\n- 2020-01-01 05:00-06:30: Call\n- 2020-01-03 to 2020-01-04: Offsite',
    todo: '- [ ] one\n- [x] two {.star due=2025-06-23}',
    board: '## A\n\n- x\n- y\n\n## B {limit=1}',
    gantt: 'Task | Start:date | Days:number | Done:percent\n--- | --- | --- | ---\nDesign | 2025-06-23 | 5 | 50%\n- Sketch | 2025-06-23 | 2 | 100%\n- Review | 2025-06-25 | 3 | 0%',
    trip: '---\nunits: miles\n---\nPlace | Lat:number | Lon:number | Note\n--- | --- | --- | ---\nLisbon | 38.7223 | -9.1393 | note\nB | 2.62144 | 0 |',
    anim: '!o\nt,4,20,20,4,04,Lift <off>\ni,8,36,8,8,0b,rocket\n@0\t0,0,0,0,a,0;n,0,-2s,0,a,0,i\n@1\t0,0,0,0,a,0;n,5k,-5k,2s,a,-u,d',
    zine: ':star\nSmall <Joys>\nIssue one\n\nCoffee\nThe first cup.',
    booklet: 'A <book>\nby me\n\nOne\nwords',
    calc: '2+<2>\n7*6',
    poster: ':music\nOpen <mic> night\nFriday 12 March, 8pm',
    badges: 'Ada <Lovelace>\nEngineering\n\nGrace Hopper\nCompilers',
    recipes: ':cookie\nCardamom <buns>\n500g flour\n\nCold brew\n100g coffee',
    brochure: 'Visit\n\nWhy\nbecause',
    pixel: 'ab.c\n.<d',
    comic: 'Biscuit <out>\n\n \n:dog Walk? | Monday',
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
  assert.ok(html('sheet').includes('<td class="n">1200</td>') && html('sheet').includes('role="img" aria-label="Chart"'));
  assert.ok(html('todo').includes('<input type="checkbox" disabled checked> <strong>two</strong>'));
  assert.ok(html('write').replace(/\n/g, '').includes('<ul><li>one<ul><li>nested</li></ul></li></ul><ol><li>first</li></ol>'));
  assert.ok(html('trip').includes('<strong>Lisbon</strong>'));
  // Sheets with a chart are the chart when shown inside another document.
  assert.equal(appOf('sheet')!.view(samples.sheet).length, 2);
  assert.ok(appOf('sheet')!.view(samples.sheet, { embed: true })[0].svg.includes('Rent'));
  // Things that build: a drawing by shape, a table by row.
  assert.equal(appOf('draw')!.steps!(samples.draw), 2);
  assert.ok(!appOf('draw')!.view(samples.draw, { step: 1 })[0].svg.includes('marker-end'));
  assert.equal(appOf('sheet')!.steps!('a\nb\nc'), 3);
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

test('sheet to csv: computed values, quoting, used range only', () => {
  assert.equal(sheetToCsv('10\tTotal, "net"\n32\n=SUM(A1:A2)*2'), '10,"Total, ""net"""\r\n32,\r\n84,\r\n');
  assert.equal(sheetToCsv(''), '');
});

test('sheet to xlsx: formulas survive in Excel dialect', () => {
  assert.equal(toExcelFormula('=round(avg(A1:A3),1)'), 'ROUND(AVERAGE(A1:A3),1)');
  const files = unzipSync(sheetToXlsx('10\tA & <B>\n32\n=AVG(A1:A2)\t=A1/0', ctx));
  assert.equal(Object.keys(files)[0], '[Content_Types].xml');
  const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
  assert.match(sheet, /<c r="A1"><v>10<\/v><\/c>/);
  assert.match(sheet, /<c r="B1" t="inlineStr"><is><t xml:space="preserve">A &amp; &lt;B&gt;<\/t><\/is><\/c>/);
  assert.match(sheet, /<c r="A3"><f>AVERAGE\(A1:A2\)<\/f><v>21<\/v><\/c>/);
  assert.match(sheet, /<c r="B3" t="str"><f>A1\/0<\/f><v>#DIV\/0<\/v><\/c>/);
});

test('write to rtf and html', () => {
  const body = '# Memo\nPlain *bold _both_* {x} café\n- one\n- two\n+ first\n+ second';
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
  const body = ':rocket\nLaunch <plan>\nBuild it\n \nShip & tell\n\nSecond';
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
  const svg = drawingToSvg('r,2,1,12,6,2,Box <1>\na,14,4,8,0,1\nt,0,0,12,3,0,Note');
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
