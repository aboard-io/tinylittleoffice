import { test } from 'node:test';
import assert from 'node:assert/strict';

import '../src/apps/index.ts';
import { appOf, apps, pageSvg } from '../src/kit/core.ts';
import { TEMPLATES, templatesOf, planText } from '../src/lib/templates.ts';
import { parseDoc, serializeDoc } from '../src/lib/richtext.ts';
import { readSheet, serializeGrid } from '../src/lib/formula.ts';
import { parseDeck, serializeDeck, deckTransition, deckIconColor, deckEndsWithQr } from '../src/lib/deckmodel.ts';
import { toMarkdown } from '../src/lib/markdown.ts';
import * as T from '../src/api.ts';

/** A template as its app would write it back: the same text, or the template is not in the app's own spelling. */
const rewrite: Record<string, (body: string) => string> = {
  write: (b) => serializeDoc(parseDoc(b)),
  sheet: (b) => ((s) => serializeGrid(s.grid, s.chart, s.types, s.names))(readSheet(b)),
  deck: (b) => serializeDeck(parseDeck(b), deckTransition(b), deckIconColor(b), deckEndsWithQr(b)),
};

test('every template is in its app\'s own spelling, draws, and has a name and a line', () => {
  for (const [app, list] of Object.entries(TEMPLATES)) {
    const def = appOf(app)!;
    assert.ok(def && rewrite[app], app);
    assert.ok(list.length >= 5 && list.length <= 8, `${app}: ${list.length} templates`);
    assert.equal(new Set(list.map((t) => t.id)).size, list.length, `${app}: ids are unique`);
    for (const t of list) {
      assert.ok(t.name && t.blurb && t.body.trim(), `${app}/${t.id}`);
      assert.equal(rewrite[app](t.body), t.body, `${app}/${t.id} round-trips`);
      const pages = def.view(t.body);
      assert.ok(pages.length >= 1, `${app}/${t.id} draws`);
      for (const p of pages) assert.ok(!/NaN|undefined/.test(pageSvg(p)), `${app}/${t.id} draws cleanly`);
      assert.ok(def.outline(t.body).length > 1, `${app}/${t.id} has an outline`);
      assert.ok(!/undefined|NaN/.test(toMarkdown(def, t.body)), `${app}/${t.id} exports as Markdown`);
    }
  }
  assert.deepEqual(templatesOf('todo'), []);
});

test('the sheets add up: no errors in any computed cell, and the formulas mean what they say', () => {
  const cells = (id: string) => T.evaluateSheet(TEMPLATES.sheet.find((t) => t.id === id)!.body);
  for (const t of TEMPLATES.sheet) for (const row of T.evaluateSheet(t.body)) for (const v of row) assert.ok(!v.startsWith('#'), `${t.id}: ${row.join(' | ')}`);
  const budget = cells('budget');
  assert.deepEqual(budget[6], ['Total', '$2,630.00', '$2,695.00', '$65.00']);
  // 1,800 + 2,800 + 120, and 8% on top.
  assert.deepEqual(cells('invoice').slice(3).map((r) => r[3]), ['$4,720.00', '$377.60', '$5,097.60']);
  // A loan of 20,000 at 6.5% over five years: about 391 a month.
  assert.equal(cells('loan')[0][3], '$391.32');
  // The tracker counts from today, so its dates are dates and its days are days.
  const tracker = cells('tracker');
  assert.match(tracker[0][2], /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(tracker.map((r) => r[4]), ['5', '14', '28', '1']);
  assert.equal(tracker[0][5], '☑');
});

test('the decks name only icons the library has, and lay out as they say', async () => {
  for (const t of TEMPLATES.deck) {
    const warnings = await T.lint('deck', t.body);
    assert.deepEqual(warnings, [], `${t.id}: ${warnings.map((w) => w.message).join('; ')}`);
    const slides = parseDeck(t.body);
    assert.equal(slides[0].layout, 't', `${t.id} opens with a title slide`);
    assert.ok(slides.length >= 4 && slides.every((s) => s.title), t.id);
  }
  assert.ok(parseDeck(TEMPLATES.deck.find((t) => t.id === 'status')!.body)[1].right?.length);
});

test('the plans are Write templates, a section a heading, its questions under it', () => {
  const plan = TEMPLATES.write.find((t) => t.id === 'bizplan')!;
  const blocks = parseDoc(plan.body);
  assert.deepEqual(blocks.filter((b) => b.k === 'h2').map((b) => b.runs.map((r) => r.t).join('')).slice(0, 3), ['Summary', 'The problem', 'The product']);
  assert.ok(blocks.filter((b) => b.k === 'p').every((b) => b.runs.every((r) => r.i)), 'the prompts are in italics, to be written over');
  assert.equal(planText('T', 'S', [{ heading: 'H', prompts: ['p'] }]), '# T\n\n*S*\n\n## H\n\n*p*');
  for (const id of ['mktplan', 'gtm']) assert.ok(TEMPLATES.write.some((t) => t.id === id), id);
});

test('templates, for programs', () => {
  assert.equal(T.templates('sheet').length, TEMPLATES.sheet.length);
  assert.ok(T.templates('write').some((t) => t.id === 'meeting'));
  assert.deepEqual(T.templates('cal'), []);
  assert.throws(() => T.templates('nope'));
});
