// Alt text for drawings and animations: kept in the text, said on every picture, carried through Markdown, asked for by lint.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../src/api.ts';
import { appOf, pageSvg } from '../src/kit/core.ts';
import { altOf, withAlt, describeDrawing, parseDrawing, serializeDrawing } from '../src/lib/drawmodel.ts';
import { parseAnim, serializeAnim } from '../src/lib/animmodel.ts';
import { fromMarkdown, toMarkdown } from '../src/lib/markdown.ts';

const DRAWING = 'o,4,6,16,8,1b,Browser\no,32,6,16,8,1b,Server\nk,0,1,0,0,0,asks';

test('alt text is a first line of its own, and leaves the shapes alone', () => {
  const body = withAlt(DRAWING, 'A browser asks a server.');
  assert.equal(body.split('\n')[0], '# A browser asks a server.');
  assert.equal(altOf(body), 'A browser asks a server.');
  assert.equal(serializeDrawing(parseDrawing(body)), DRAWING);
  assert.equal(withAlt(body, ''), DRAWING);
  assert.equal(withAlt(body, 'Two\nlines'), '# Two lines\n' + DRAWING);
});

test('a description is made from the labels when nobody wrote one', () => {
  assert.equal(describeDrawing(parseDrawing(DRAWING)), 'A drawing of Browser, Server. Browser leads to Server (asks).');
  assert.equal(describeDrawing(parseDrawing('r,1,1,4,4,0')), 'A drawing of 1 unlabelled shape.');
  assert.equal(describeDrawing([]), '');
});

test('every picture of the drawing says it, after the name it is given, and keeps it as its <title>', () => {
  const def = appOf('draw')!;
  const page = def.view(withAlt(DRAWING, 'A browser asks a server.'))[0];
  const svg = pageSvg(page, 'role="img" aria-label="Request flow"');
  assert.ok(svg.includes('aria-label="Request flow. A browser asks a server."'), svg.slice(0, 300));
  assert.ok(svg.includes('<title>A browser asks a server.</title>'));
  assert.ok(pageSvg(def.view(DRAWING)[0]).includes('aria-label="A drawing of Browser, Server. Browser leads to Server (asks)."'));
  assert.equal(def.outline(withAlt(DRAWING, 'Alt'))[0], 'Alt');
  // Markup in alt text is only text.
  assert.ok(pageSvg(def.view(withAlt(DRAWING, '<b>&'))[0]).includes('&lt;b&gt;&amp;'));
});

test('an animation keeps its alt text through its editor’s model', () => {
  const body = '!o\n# Rocket lifts off\nt,4,20,20,4,04,Lift off';
  const anim = parseAnim(body);
  assert.equal(anim.alt, 'Rocket lifts off');
  assert.ok(serializeAnim(anim).startsWith('!o\n# Rocket lifts off\n'));
  assert.equal(appOf('anim')!.view(body)[0].alt, 'Rocket lifts off');
});

test('alt text goes into Markdown as a quote and comes back', () => {
  for (const [app, body] of [['draw', withAlt(DRAWING, 'A browser asks a server.')], ['anim', '!o\n# Rocket lifts off\nt,4,20,20,4,04,Lift off']] as const) {
    const def = appOf(app)!;
    const md = toMarkdown(def, body);
    assert.ok(md.startsWith('> '), md);
    assert.equal(altOf(fromMarkdown(def, md)), altOf(body.replace(/^!o\n/, '')));
  }
});

test('lint asks for alt text, and is satisfied by it', async () => {
  const notes = (await T.lint('draw', DRAWING)).filter((w) => /alt text/.test(w.message));
  assert.equal(notes.length, 1);
  assert.equal(notes[0].level, 'note');
  assert.deepEqual((await T.lint('draw', withAlt(DRAWING, 'A flow.'))).filter((w) => /alt text/.test(w.message)), []);
});
