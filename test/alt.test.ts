// Alt text for drawings and animations: kept in the text, said on every picture, carried through Markdown, asked for by lint.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../src/api.ts';
import { appOf, pageSvg } from '../src/kit/core.ts';
import { altOf, describeDrawing, parseDrawing, serializeDrawing } from '../src/lib/drawmodel.ts';
import { parseAnim, serializeAnim } from '../src/lib/animmodel.ts';
import { fromMarkdown, toMarkdown } from '../src/lib/markdown.ts';

const DRAWING = 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\no | 4 | 6 | 16 | 8 | 1b | Browser\no | 32 | 6 | 16 | 8 | 1b | Server\nk | 0 | 1 | 0 | 0 | 0 | asks';
/** The drawing with alt text, as its editor writes it. */
const withAlt = (alt: string) => serializeDrawing(parseDrawing(DRAWING), alt);
const ANIM = `---\nframes: 24\nfps: 8\nalt: Rocket lifts off\n---\n${DRAWING.split('\n').slice(0, 2).join('\n')}\nt | 4 | 20 | 20 | 4 | 04 | Lift off`;

test('alt text is in the header, and leaves the shapes alone', () => {
  const body = withAlt('A browser asks a server.');
  assert.equal(body.split('\n').slice(0, 3).join('\n'), '---\nalt: A browser asks a server.\n---');
  assert.equal(altOf(body), 'A browser asks a server.');
  assert.equal(serializeDrawing(parseDrawing(body)), DRAWING);
  assert.equal(serializeDrawing(parseDrawing(body), altOf(body)), body);
  assert.equal(serializeDrawing(parseDrawing(body), ''), DRAWING);
  assert.equal(serializeDrawing(parseDrawing(body), 'Two\nlines'), '---\nalt: Two lines\n---\n' + DRAWING);
});
test('a description is made from the labels when nobody wrote one', () => {
  assert.equal(describeDrawing(parseDrawing(DRAWING)), 'A drawing of Browser, Server. Browser leads to Server (asks).');
  assert.equal(describeDrawing(parseDrawing(DRAWING.split('\n').slice(0, 2).join('\n') + '\nr | 1 | 1 | 4 | 4 | 0 |')), 'A drawing of 1 unlabelled shape.');
  assert.equal(describeDrawing([]), '');
});

test('every picture of the drawing says it, after the name it is given, and keeps it as its <title>', () => {
  const def = appOf('draw')!;
  const page = def.view(withAlt('A browser asks a server.'))[0];
  const svg = pageSvg(page, 'role="img" aria-label="Request flow"');
  assert.ok(svg.includes('aria-label="Request flow. A browser asks a server."'), svg.slice(0, 300));
  assert.ok(svg.includes('<title>A browser asks a server.</title>'));
  assert.ok(pageSvg(def.view(DRAWING)[0]).includes('aria-label="A drawing of Browser, Server. Browser leads to Server (asks)."'));
  assert.equal(def.outline(withAlt('Alt'))[0], 'Alt');
  // Markup in alt text is only text.
  assert.ok(pageSvg(def.view(withAlt('<b>&'))[0]).includes('&lt;b&gt;&amp;'));
});

test('an animation keeps its alt text through its editor’s model', () => {
  const anim = parseAnim(ANIM);
  assert.equal(anim.alt, 'Rocket lifts off');
  assert.equal(serializeAnim(anim), ANIM);
  assert.equal(appOf('anim')!.view(ANIM)[0].alt, 'Rocket lifts off');
});

test('alt text goes into Markdown in the header and comes back; a quote is alt text too', () => {
  for (const [app, body] of [['draw', withAlt('A browser asks a server.')], ['anim', ANIM]] as const) {
    const def = appOf(app)!;
    const md = toMarkdown(body);
    assert.ok(md.startsWith('---\nframes') || md.startsWith('---\nalt'), md);
    assert.equal(fromMarkdown(def, md), body);
    // Written as a model might: a quote saying what it shows, and the things in it.
    const loose = fromMarkdown(def, '> What it shows\n\n- Browser\n- Server\n');
    assert.equal(altOf(loose), 'What it shows');
    assert.ok(loose.includes('| Browser') && loose.includes('| Server'), loose);
  }
});

test('lint asks for alt text, and is satisfied by it', async () => {
  const notes = (await T.lint('draw', DRAWING)).filter((w) => /alt text/.test(w.message));
  assert.equal(notes.length, 1);
  assert.equal(notes[0].level, 'note');
  assert.deepEqual((await T.lint('draw', withAlt('A flow.'))).filter((w) => /alt text/.test(w.message)), []);
});
