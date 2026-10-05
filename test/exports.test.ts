import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strFromU8, unzipSync } from 'fflate';

import { EXPORTS, calendarToIcs, deckToPptx, docToHtml, docToRtf, drawingToSvg, exportName, findExport, sheetToCsv, sheetToXlsx, toExcelFormula } from '../src/lib/exports.ts';

const ctx = { created: Date.UTC(2026, 0, 2, 3, 4) };

test('every app has a download view, and aliases resolve', () => {
  assert.deepEqual(Object.keys(EXPORTS).sort(), ['cal', 'deck', 'draw', 'sheet', 'write']);
  assert.equal(findExport('deck', 'ppt')?.ext, 'pptx');
  assert.equal(findExport('deck', 'PPTX')?.ext, 'pptx');
  assert.equal(findExport('cal', 'ical')?.ext, 'ics');
  assert.equal(findExport('sheet', 'xls')?.ext, 'xlsx');
  assert.equal(findExport('sheet', 'pptx'), null);
});

test('file names come from the document title', () => {
  assert.equal(exportName('deck', ':rocket\nLaunch plan — Q3!\none', 'pptx'), 'launch-plan-q3.pptx');
  assert.equal(exportName('write', '# Café *memo*\nbody', 'rtf'), 'cafe-memo.rtf');
  assert.equal(exportName('deck', '', 'pptx'), 'deck.pptx');
  assert.equal(exportName('cal', 'd1,1,x', 'ics'), 'calendar.ics');
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
  const html = docToHtml(body);
  assert.ok(html.includes('<title>Memo</title>'));
  assert.ok(html.includes('<h1>Memo</h1>'));
  assert.ok(html.includes('<strong>bold </strong><strong><em>both</em></strong>'));
  assert.ok(html.includes('<ul>\n<li>one</li>\n<li>two</li>\n</ul>\n<ol>\n<li>first</li>'));
});

test('deck to pptx: one slide part per slide, icons embedded when supplied', () => {
  const body = ':rocket\nLaunch <plan>\nBuild it\n \nShip & tell\n\nSecond';
  const png = new Uint8Array([137, 80, 78, 71]);
  const files = unzipSync(deckToPptx(body, { ...ctx, icons: { rocket: png } }));
  assert.equal(Object.keys(files)[0], '[Content_Types].xml');
  for (const part of ['ppt/presentation.xml', 'ppt/slideMasters/slideMaster1.xml', 'ppt/slideLayouts/slideLayout1.xml', 'ppt/theme/theme1.xml', 'ppt/slides/slide1.xml', 'ppt/slides/slide2.xml'])
    assert.ok(files[part], part);
  assert.equal(files['ppt/slides/slide3.xml'], undefined);
  assert.deepEqual([...files['ppt/media/rocket.png']], [...png]);
  const s1 = strFromU8(files['ppt/slides/slide1.xml']);
  assert.ok(s1.includes('<a:t>Launch &lt;plan&gt;</a:t>'));
  assert.ok(s1.includes('<a:t>Build it</a:t>') && s1.includes('<a:t>Ship &amp; tell</a:t>'));
  assert.equal(s1.match(/<a:p>/g)!.length, 3); // headline and two bullets: the blank one is dropped
  assert.ok(s1.includes('r:embed="rId2"'));
  assert.ok(strFromU8(files['ppt/slides/_rels/slide1.xml.rels']).includes('../media/rocket.png'));
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
  // d: 2020-01-03 for two days. t: 90 minutes from 2020-01-01T10:00Z.
  const ics = calendarToIcs('@America/New_York\nd2,2,Offsite; day 1, 2\ntgo,2i,Call', ctx);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(ics.includes(['DTSTART;VALUE=DATE:20200103', 'DTEND;VALUE=DATE:20200105', String.raw`SUMMARY:Offsite\; day 1\, 2`, ''].join('\r\n')));
  assert.ok(ics.includes('DTSTART:20200101T100000Z\r\nDTEND:20200101T113000Z\r\nSUMMARY:Call\r\n'));
  assert.ok(ics.includes('DTSTAMP:20260102T030400Z'));
  assert.equal(ics.match(/BEGIN:VEVENT/g)!.length, 2);
  const long = calendarToIcs('d0,1,' + 'é'.repeat(60), ctx);
  for (const line of long.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  assert.ok(long.replace(/\r\n /g, '').includes('SUMMARY:' + 'é'.repeat(60)));
});
