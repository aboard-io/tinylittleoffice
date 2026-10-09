// Footnotes in rich text: written inline as ^[the note], read in Markdown's reference form too, numbered as
// they come, and drawn at the end of a text or the foot of a slide, in every export.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strFromU8, unzipSync } from 'fflate';
import { parseInline, writeInline } from '../src/lib/tlo.ts';
import { parseDoc, serializeDoc, notesOf, notesIn, referenceNotes, markNotes, noteNumbers, noteRuns, type Block } from '../src/lib/richtext.ts';
import { docToDocx, docToHtml, docToRtf, pages } from '../src/apps/write.def.ts';
import { toMarkdown } from '../src/lib/markdown.ts';
import { parseDeck, readDeck } from '../src/lib/deckmodel.ts';
import { layoutSlide, slideNotes, slidePage } from '../src/lib/slide.ts';
import deck from '../src/apps/deck.def.ts';
import { outlinePage } from '../src/apps/outline.def.ts';
import { wrap } from '../src/kit/core.ts';

test('inline footnotes read as a run of their own and write back as they were', () => {
  const line = 'Words^[a note with *italics* and a [link](https://x.org/)] here.';
  assert.deepEqual(parseInline(line), [{ t: 'Words' }, { t: '', fn: 'a note with *italics* and a [link](https://x.org/)' }, { t: ' here.' }]);
  assert.equal(writeInline(parseInline(line)), line);
  // The note's words are rich text themselves.
  assert.deepEqual(noteRuns('a note with *italics* and a [link](https://x.org/)'), [{ t: 'a note with ' }, { t: 'italics', i: true }, { t: ' and a ' }, { t: 'link', href: 'https://x.org/' }]);
  // Brackets inside balance; an escaped one is a bracket; what never closes is words.
  assert.equal(writeInline(parseInline('See^[balanced [1] inside] and^[escaped \\] bracket] end')), 'See^[balanced [1] inside] and^[escaped \\] bracket] end');
  assert.deepEqual(parseInline('Not a note ^[ unclosed'), [{ t: 'Not a note ^[ unclosed' }]);
  assert.deepEqual(parseInline('Escaped \\^[not a note]'), [{ t: 'Escaped ^[not a note]' }]);
  // A note set by the editor with stray brackets in it is written so it reads back whole.
  const stray = writeInline([{ t: 'x' }, { t: '', fn: 'a ] b [ c' }]);
  assert.equal(stray, 'x^[a \\] b \\[ c]');
  assert.deepEqual(noteRuns(parseInline(stray)[1].fn!), [{ t: 'a ] b [ c' }]);
  // Two marks side by side stay two; a mark never merges into the words around it.
  assert.deepEqual(parseInline('Two^[one]^[two].'), [{ t: 'Two' }, { t: '', fn: 'one' }, { t: '', fn: 'two' }, { t: '.' }]);
  // Words that would read as a note are escaped on the way out.
  assert.equal(writeInline([{ t: 'see ^[this]' }]), 'see \\^[this]');
});

test('a document round-trips its notes; the reference form is read and folded into the inline form', () => {
  const doc: Block[] = [
    { k: 'h1', runs: [{ t: 'Title' }, { t: '', fn: 'On the title' }] },
    { k: 'p', runs: [{ t: 'Plain' }, { t: '', fn: 'First' }, { t: ' and ' }, { t: 'bold', b: true }, { t: '', fn: 'Second, **bold** inside' }, { t: '.' }] },
    { k: 'ul', runs: [{ t: 'item' }, { t: '', fn: 'Third' }] },
  ];
  const text = serializeDoc(doc);
  assert.equal(text, '# Title^[On the title]\n\nPlain^[First] and **bold**^[Second, **bold** inside].\n\n- item^[Third]');
  assert.deepEqual(parseDoc(text), doc);
  assert.deepEqual(notesOf(doc), ['On the title', 'First', 'Second, **bold** inside', 'Third']);
  // Markdown's reference form, as a model or a person writes it: the definitions anywhere, folded in on read; written back inline.
  const ref = '[^b]: Second, with **bold**\n\nHello[^a] world[^b].\n\nMore words, and [^none] stays.\n\n[^a]: First note\n  carried on';
  const blocks = parseDoc(ref);
  assert.deepEqual(blocks, [
    { k: 'p', runs: [{ t: 'Hello' }, { t: '', fn: 'First note carried on' }, { t: ' world' }, { t: '', fn: 'Second, with **bold**' }, { t: '.' }] },
    { k: 'p', runs: [{ t: 'More words, and [^none] stays.' }] },
  ]);
  assert.equal(serializeDoc(blocks), 'Hello^[First note carried on] world^[Second, with **bold**].\n\nMore words, and [^none] stays.');
  // The reference form reads in a deck too.
  assert.equal(readDeck('## A slide[^x]\n\n- Point[^y]\n\n[^x]: On the head\n[^y]: On the point'), '## A slide^[On the head]\n\n- Point^[On the point]\n');
});

test('Markdown export writes the notes in the reference form, numbered as they come, defined at the end', () => {
  const body = '# Title^[On the title]\n\nPlain^[First] and **bold**^[Second, **bold** inside].\n\n- item^[Third]';
  assert.equal(toMarkdown(body, 'Notes'), '---\ntitle: Notes\n---\n# Title[^1]\n\nPlain[^2] and **bold**[^3].\n\n- item[^4]\n\n[^1]: On the title\n\n[^2]: First\n\n[^3]: Second, **bold** inside\n\n[^4]: Third\n');
  // What comes back reads as the same document.
  assert.equal(serializeDoc(parseDoc(referenceNotes(body))), body);
  // A text with no notes is left exactly as it is.
  assert.equal(toMarkdown('# Hi\n\nWords'), '# Hi\n\nWords\n');
  assert.equal(referenceNotes('a | b\n--- | ---\n1 | 2'), 'a | b\n--- | ---\n1 | 2');
});

test('HTML: marks and an endnotes section with the roles and ids a reader knows; two documents on one page keep apart', () => {
  const body = 'Plain^[First *note*] and more^[Second].';
  const html = docToHtml(body);
  assert.ok(html.includes('<p>Plain<sup class="fn" role="doc-noteref"><a href="#fn-1" id="fnref-1">1</a></sup> and more<sup class="fn" role="doc-noteref"><a href="#fn-2" id="fnref-2">2</a></sup>.</p>'));
  assert.ok(html.includes('<section class="fn-notes" role="doc-endnotes" aria-label="Footnotes"><hr><ol><li id="fn-1">First <em>note</em> <a href="#fnref-1" role="doc-backlink" aria-label="Back to the text">↩</a></li><li id="fn-2">Second <a href="#fnref-2" role="doc-backlink" aria-label="Back to the text">↩</a></li></ol></section>'));
  assert.ok(!docToHtml('No notes').includes('doc-endnotes'));
  const ids = (h: string) => [...h.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  const other = docToHtml('Another^[Note].', { created: null }, 'b-fn');
  assert.deepEqual(ids(other), ['b-fnref-1', 'b-fn-1']);
  assert.equal(ids(html).filter((id) => ids(other).includes(id)).length, 0);
});

test('the printed pages, Word and RTF carry the marks raised and the notes at the end', () => {
  const body = '# Title^[On the title]\n\nPlain^[First] words.';
  const [page] = pages(body);
  assert.ok(page.svg.includes('<tspan font-size="18.6" baseline-shift="super">1</tspan>'));
  assert.ok(page.svg.includes('<tspan font-size="9.92" baseline-shift="super">2</tspan>'));
  assert.ok(page.svg.includes('On the title'));
  assert.ok(page.svg.includes('First'));
  const docx = strFromU8(unzipSync(docToDocx(body))['word/document.xml']);
  assert.ok(docx.includes('<w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:t>1</w:t></w:r>'));
  assert.ok(docx.includes('<w:pBdr><w:top w:val="single" w:sz="4" w:space="6" w:color="A1A1AA"/></w:pBdr>'));
  assert.ok(docx.includes('<w:t>1</w:t></w:r><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">On the title</w:t></w:r></w:p>'));
  const rtf = docToRtf(body);
  assert.ok(rtf.includes('Title{\\super 1}'));
  assert.ok(rtf.includes('\\fs18 {\\super 2} First\\par}'));
});

test('a mark stays with its word when lines wrap', () => {
  const runs = markNotes(parseInline('A few short words then a longer-one^[note] end'), noteNumbers());
  for (const line of wrap(runs, 180, 16)) {
    const at = line.findIndex((s) => s.sup);
    if (at >= 0) assert.ok(at > 0 && line[at - 1].t.endsWith('longer-one'), JSON.stringify(line));
  }
});

test('slides: each slide numbers its own notes from 1, the headline first, and draws them at its foot', () => {
  const body = '## Head^[On the head]\n\n- One^[First point]\n- Two\n\n---\n\n## Next\n\n- Three^[Only here]';
  const [a, b] = parseDeck(body);
  assert.deepEqual(slideNotes(a), ['On the head', 'First point']);
  assert.deepEqual(slideNotes(b), ['Only here']);
  assert.deepEqual(notesIn(a.bullets), ['First point']);
  const L = layoutSlide(a);
  assert.ok(L.notes && L.notes.lines.length === 2 && L.notes.y + L.notes.h <= 600 - 40);
  // The words stop above the notes.
  assert.ok(L.cols[0].y + L.cols[0].h <= L.notes.y);
  const svg = slidePage(a).svg;
  assert.ok(svg.includes('baseline-shift="super">1</tspan>'));
  assert.ok(svg.includes('baseline-shift="super">2</tspan>'));
  assert.ok(svg.includes('On the head') && svg.includes('First point'));
  assert.ok(!slidePage(b).svg.includes('On the head'));
  assert.ok(!layoutSlide(b).notes || layoutSlide(b).notes!.lines.length === 1);
  // The deck's HTML: a section of notes per slide, ids the slide's own.
  const html = deck.html!(body, { created: null });
  assert.ok(html.includes('<h1>Head<sup class="fn" role="doc-noteref"><a href="#s1-fn-1" id="s1-fnref-1">1</a></sup></h1>'));
  assert.ok(html.includes('<li id="s1-fn-2">First point'));
  assert.ok(html.includes('<li id="s2-fn-1">Only here'));
  // The outline, drawn: marks in the items, the notes under them.
  const pic = outlinePage('- Launch^[When?]\n  - Soon');
  assert.ok(pic.svg.includes('baseline-shift="super">1</tspan>') && pic.svg.includes('When?'));
});
