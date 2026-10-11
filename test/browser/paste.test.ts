// What the clipboard really carries from elsewhere, as text/html and text/plain pairs, and what a paste makes of it:
// Google Docs, Microsoft Word, Apple Notes and Mail, Notion, Slack, a web page. Lists keep their items and depth,
// headings, marks and links survive, and nothing of the HTML (Word's <o:p>, comments, styles, &nbsp; runs, zero-width
// characters) arrives as words. (htmlToBlocks needs the browser's DOMParser, so these run in Chromium; the plain-text
// fixtures are node tests in test/clipboard.test.ts.)
import { expect, test } from 'vitest';
import { parse, write, type Block } from '../../src/doc/index.ts';
import { pasteFrom, type Pasted } from '../../src/kit/clipboard.ts';
import type { Shape } from '../../src/kit/textops.ts';

const tlo = (got: Pasted | null) => (got && 'blocks' in got ? write({ head: {}, blocks: got.blocks }) : JSON.stringify(got));
const paste = (html: string, text: string, shape: Shape = 'doc') => pasteFrom({ html, text }, shape);

const DOCS = {
  html: `<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-6a1b2c3d-7fff-1234-abcd-0123456789ab"><h1 dir="ltr" style="line-height:1.38;margin-top:20pt;margin-bottom:6pt;"><span style="font-size:20pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Plan</span></h1><ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:disc;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Bold</span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> start</span></p></li><ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:circle;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;" aria-level="2"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">nested</span></p></li></ul><li dir="ltr" style="list-style-type:disc;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;" aria-level="1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><a href="https://example.com/" style="text-decoration:none;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#1155cc;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:underline;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">a link</span></a></p></li></ul><br><ol style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:decimal;font-size:11pt;" aria-level="1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-weight:400;">first</span></p></li><li dir="ltr" style="list-style-type:decimal;font-size:11pt;" aria-level="1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-weight:400;">second</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-weight:400;">its second paragraph</span></p></li></ol></b><br class="Apple-interchange-newline">`,
  text: 'Plan\nBold start\nnested\na link\n\nfirst\nsecond\nits second paragraph',
};

const WORD = {
  html: `<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta http-equiv=Content-Type content="text/html; charset=utf-8"><meta name=ProgId content=Word.Document><meta name=Generator content="Microsoft Word 15"><!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]--><style><!-- p.MsoNormal, li.MsoNormal {mso-style-unhide:no; margin:0in; font-size:12.0pt;} p.MsoListParagraph {mso-style-priority:34; margin-left:.5in;} @list l0:level1 {mso-level-number-format:bullet; mso-level-text:\\F0B7;} --></style></head><body lang=EN-US style='tab-interval:.5in;word-wrap:break-word'><!--StartFragment--><h1>Minutes<o:p></o:p></h1><p class=MsoNormal><b>Agenda</b>&nbsp;for <span style='background:yellow;mso-highlight:yellow'>today</span><o:p></o:p></p><p class=MsoListParagraphCxSpFirst style='text-indent:-.25in;mso-list:l0 level1 lfo1'><![if !supportLists]><span style='font-family:Symbol;mso-fareast-font-family:Symbol;mso-bidi-font-family:Symbol'><span style='mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span></span></span><![endif]>One<o:p></o:p></p><p class=MsoListParagraphCxSpMiddle style='margin-left:1.0in;mso-add-space:auto;text-indent:-.25in;mso-list:l0 level2 lfo1'><![if !supportLists]><span style='font-family:"Courier New";mso-fareast-font-family:"Courier New"'><span style='mso-list:Ignore'>o<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp; </span></span></span><![endif]><i>Two</i><o:p></o:p></p><p class=MsoListParagraphCxSpLast style='text-indent:-.25in;mso-list:l0 level1 lfo1'><![if !supportLists]><span style='font-family:Symbol;mso-fareast-font-family:Symbol;mso-bidi-font-family:Symbol'><span style='mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span></span></span><![endif]>Three<o:p></o:p></p><p class=MsoListParagraphCxSpFirst style='text-indent:-.25in;mso-list:l1 level1 lfo2'><![if !supportLists]><span style='mso-fareast-font-family:Calibri'><span style='mso-list:Ignore'>1.<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span></span></span><![endif]>Numbered<o:p></o:p></p><p class=MsoListParagraphCxSpLast style='text-indent:-.25in;mso-list:l1 level1 lfo2'><![if !supportLists]><span style='mso-fareast-font-family:Calibri'><span style='mso-list:Ignore'>2.<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span></span></span><![endif]>Again<o:p></o:p></p><!--EndFragment--></body></html>`,
  text: 'Minutes\r\nAgenda for today\r\n·         One\r\no   Two\r\n·         Three\r\n1.      Numbered\r\n2.      Again\r\n',
};

const NOTES = {
  html: `<meta charset="UTF-8"><style type="text/css">p.p1 {margin: 0.0px 0.0px 0.0px 0.0px; font: 13.0px 'Helvetica Neue'} li.li1 {margin: 0.0px 0.0px 0.0px 0.0px; font: 13.0px 'Helvetica Neue'} span.s1 {-webkit-text-stroke: 0px #000000} ul.ul1 {list-style-type: disc}</style>
<p class="p1"><b>Shopping</b></p>
<ul class="ul1">
<li class="li1"><span class="s1"></span>Eggs</li>
<li class="li1"><span class="s1"></span>Milk​</li>
</ul>
<p class="p1"><br></p>
<p class="p1">Done</p>`,
  text: 'Shopping\n\t•\tEggs\n\t•\tMilk\n\nDone',
};

/** Mail and TextEdit write a list as paragraphs that open with the glyph and a tab. */
const MAIL = {
  html: `<div style="-webkit-text-stroke-width: 0px;"><div>Hi,</div><div><br></div><div>•&nbsp;&nbsp;Bread</div><div>•&nbsp;&nbsp;Butter</div><div><span style="-webkit-text-stroke: 0px">Thanks</span></div></div>`,
  text: 'Hi,\n\n•  Bread\n•  Butter\nThanks',
};

const NOTION = {
  html: `<meta charset="utf-8"><h2>Notes</h2><ul><li>Alpha<ul><li>Beta</li></ul></li><li><strong>Gamma</strong> and <code>code</code></li></ul><div>Loose <em>words</em></div><ol><li>first</li></ol>`,
  text: '## Notes\n\n- Alpha\n    - Beta\n- **Gamma** and `code`\n\nLoose *words*\n\n1. first',
};

const SLACK = {
  html: `<meta charset='utf-8'><div class="p-rich_text_section">Hi <b data-stringify-type="bold">team</b>, see <a target="_blank" class="c-link" data-stringify-link="https://x.com/a" delay="150" data-sk="tooltip_parent" href="https://x.com/a" rel="noopener noreferrer">the doc</a><br></div><ul data-stringify-type="unordered-list" data-indent="0" class="p-rich_text_list p-rich_text_list__bullet" data-border="0"><li data-stringify-indent="0" data-stringify-border="0">one</li></ul><ul data-stringify-type="unordered-list" data-indent="1" class="p-rich_text_list p-rich_text_list__bullet" data-border="0"><li data-stringify-indent="1" data-stringify-border="0">two</li></ul>`,
  text: 'Hi team, see the doc\n• one\n    ◦ two',
};

const PAGE = {
  html: `<html><head><style>body{color:red}</style></head><body><!--StartFragment--><div class="article" style="background-color: rgb(250, 250, 250);"><div><span style="font-size: 16px; color: rgb(32, 33, 34);">Words with <a href="https://example.org/page">a link</a> and <span style="font-weight: 600">weight</span>.</span></div><div><a href="javascript:alert(1)">bad</a> <a href="tel:+15551234">call</a> <a href="#top">top</a></div><script>alert(1)</script><!-- a comment --><div role="heading" aria-level="3">Section</div></div><!--EndFragment--></body></html>`,
  text: 'Words with a link and weight.\nbad call top\nSection',
};

test('Google Docs: a <p> inside each item stays the item, depth by nesting, bold and italic by style, a link, numbers kept', () => {
  expect(tlo(paste(DOCS.html, DOCS.text))).toBe('# Plan\n\n- **Bold** start\n  - *nested*\n- [a link](https://example.com/)\n1. first\n2. second\n  its second paragraph\n');
});

test('Microsoft Word: list paragraphs are items (the glyph dropped, the level kept, numbers ordered); <o:p>, comments and &nbsp; leave nothing', () => {
  const got = tlo(paste(WORD.html, WORD.text));
  expect(got).toBe('# Minutes\n\n**Agenda** for ==today==\n\n- One\n  - *Two*\n- Three\n1. Numbered\n2. Again\n');
  expect(got).not.toMatch(/o:p|mso|StartFragment|·| /);
});

test('Apple Notes and Mail: lists, the blank <div><br></div>, the glyph paragraphs; no zero-width space', () => {
  expect(tlo(paste(NOTES.html, NOTES.text))).toBe('**Shopping**\n\n- Eggs\n- Milk\n\nDone\n');
  expect(tlo(paste(MAIL.html, MAIL.text))).toBe('Hi,\n\n- Bread\n- Butter\n\nThanks\n');
});

test("Notion, Slack and a web page: nested lists, Slack's indent, links (http, mailto, tel only), headings by role, no script", () => {
  expect(tlo(paste(NOTION.html, NOTION.text))).toBe('## Notes\n\n- Alpha\n  - Beta\n- **Gamma** and code\n\nLoose *words*\n\n1. first\n');
  expect(tlo(paste(SLACK.html, SLACK.text))).toBe('Hi **team**, see [the doc](https://x.com/a)\n\n- one\n  - two\n');
  // A page's grey background is the page's, not a highlight: only words marked inline are highlighted.
  expect(tlo(paste(PAGE.html, PAGE.text))).toBe('Words with [a link](https://example.org/page) and **weight**.\n\nbad [call](tel:+15551234) top\n\n### Section\n');
});

test('words that look like syntax come through as the words: the writer escapes them, and they read back the same', () => {
  const got = paste('<p>Use **stars**, :smile:, [a](b), ^[x] and</p><p>- not an item</p><p># not a heading</p>', '');
  const blocks = (got as { blocks: Block[] }).blocks;
  expect(blocks.map((b) => ('runs' in b ? b.runs.map((r) => r.t).join('') : ''))).toEqual(['Use **stars**, :smile:, [a](b), ^[x] and', '- not an item', '# not a heading']);
  expect(parse(write({ head: {}, blocks })).blocks).toEqual(blocks);
});

test("fitted to the host: a slide's words keep items and paragraphs, a table becomes its rows; a label takes the words alone", () => {
  const lines = paste(DOCS.html, DOCS.text, 'lines');
  expect(tlo(lines)).toBe('Plan\n\n- **Bold** start\n  - *nested*\n- [a link](https://example.com/)\n1. first\n2. second\n  its second paragraph\n');
  expect(tlo(paste('<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table><img src="https://p.q/r.png" alt="a cat"><hr>', '', 'lines'))).toBe(
    'A\tB\n\n1\t2\n\n[a cat](https://p.q/r.png)\n',
  );
  expect(paste(DOCS.html, DOCS.text, 'line')).toEqual({
    runs: [{ t: 'Plan ' }, { t: 'Bold', b: true }, { t: ' start ' }, { t: 'nested', i: true }, { t: ' ' }, { t: 'a link', href: 'https://example.com/' }, { t: ' first second its second paragraph' }],
  });
});

test('found by the fuzz: an ordered item after a bulleted one starts its own list in our HTML; a pasted list never starts deeper than the text can say', async () => {
  const { docToHtml, htmlToBlocks } = await import('../../src/kit/clipboard.ts');
  const blocks: Block[] = [
    { k: 'li', depth: 0, runs: [{ t: 'a' }] },
    { k: 'li', depth: 0, ord: true, runs: [{ t: 'b' }] },
  ];
  expect(docToHtml(blocks)).toContain('</ul>\n<ol>');
  expect(write({ head: {}, blocks: htmlToBlocks(docToHtml(blocks)) })).toBe('- a\n1. b\n');
  expect(write({ head: {}, blocks: htmlToBlocks('<p>words</p><ul><li><ul><li>deep</li></ul></li></ul>') })).toBe('words\n\n- deep\n');
});
