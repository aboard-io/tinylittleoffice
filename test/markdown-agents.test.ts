// The Markdown layer as agents use it (src/api.ts over src/lib/markdown.ts): Markdown of the kind a language model
// writes, made into a link, read back, linted; stable when it goes round again; unbothered by the wrapping models add.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../src/api.ts';
import { appOf, apps } from '../src/kit/core.ts';
import { fromMarkdown, toMarkdown } from '../src/lib/markdown.ts';
import { parseGrid, evaluateGrid, namesOf, typesOf } from '../src/lib/formula.ts';
import { parseDeck } from '../src/lib/deckmodel.ts';
import { parseTodos } from '../src/lib/todomodel.ts';
import { parseCalendar } from '../src/lib/calmodel.ts';

/** Markdown the way a model writes it for each app, and what must come of it. */
const AGENT: Record<string, { md: string; check(body: string): void }> = {
  deck: {
    md: '# Rye & Rise Bakery\n\nA neighbourhood bakery, growing\n\n## The problem\n\n- Lines out the door by 8am\n- One oven, at capacity\n\n## The ask\n\n- **$50,000** loan over 5 years\n- Second oven, two hires\n',
    check: (b) => {
      const s = parseDeck(b);
      assert.equal(s[0].layout, 't');
      assert.deepEqual(s.map((x) => x.title), ['Rye & Rise Bakery', 'The problem', 'The ask']);
      assert.deepEqual(s[2].bullets, ['*$50,000* loan over 5 years', 'Second oven, two hires']);
    },
  },
  sheet: {
    md: '| Month | Rent | Food |\n|---|---:|---:|\n| Jan | 1,200 | 450 |\n| Feb | 1,200 | 480 |\n',
    check: (b) => {
      // The header row names the columns; the rows under it are rows 1 and 2.
      assert.deepEqual(namesOf(b).slice(0, 3), ['Month', 'Rent', 'Food']);
      const g = parseGrid(b);
      assert.deepEqual(g.slice(0, 2).map((r) => r.slice(0, 3)), [['Jan', '1,200', '450'], ['Feb', '1,200', '480']]);
      const v = evaluateGrid(g, typesOf(b));
      assert.equal(v[1][2], 480);
    },
  },
  todo: {
    md: '## This week\n\n- [x] Book the venue\n- [ ] Send invitations\n- [ ] **Order the cake**\n',
    // (In a to-do list, bold is a star.)
    check: (b) => assert.deepEqual(parseTodos(b).map((t) => [t.text, t.done, t.star]), [['Book the venue', true, false], ['Send invitations', false, false], ['Order the cake', false, true]]),
  },
  write: {
    md: '# Meeting notes\n\nWe agreed on **three** things:\n\n1. Ship on Friday\n2. Review pricing\n\n- Ben owns the release\n  - with Cy\n',
    check: (b) => {
      assert.ok(b.startsWith('# Meeting notes\n'));
      assert.ok(b.includes('*three*') && b.includes('+ Ship on Friday') && b.includes('-- with Cy'));
    },
  },
  outline: {
    md: '- Launch\n  - Product\n    - Pricing\n  - Marketing\n',
    check: (b) => assert.equal(b, '- Launch\n  - Product\n    - Pricing\n  - Marketing'),
  },
  board: {
    md: '## To do\n\n- Write the brief\n\n## Doing (limit 2)\n\n- Build the form\n\n## Done\n',
    check: (b) => assert.ok(/^#To do\nWrite the brief\n#Doing\|2\nBuild the form\n#Done$/.test(b), b),
  },
  calc: {
    md: '## Mortgage\n\n- Price: 350,000\n- Deposit: 70,000\n- Interest rate: 6%\n- Term: 25 years\n',
    check: (b) => assert.equal(b, '!mortgage\nprice = 350000\ndeposit = 70000\nrate = 6\nyears = 25'),
  },
  cal: {
    md: '- 2027-03-01 to 2027-03-03: Offsite\n- 2027-03-08: Launch day\n',
    check: (b) => {
      const spans = parseCalendar(b).spans;
      assert.equal(spans.length, 2);
      assert.deepEqual(spans.map((s) => s.label), ['Offsite', 'Launch day']);
      assert.equal(spans[0].dur, 3);
    },
  },
};

test('Markdown as an agent writes it becomes the document it meant', () => {
  for (const [app, { md, check }] of Object.entries(AGENT)) {
    const url = T.linkFromMarkdown(app, md, { title: 'T', by: 'test-agent' });
    const p = T.parse(url);
    assert.equal(p.app, app);
    assert.equal(p.env.by, 'test-agent');
    check(p.env.body);
  }
});

test('every app: Markdown in, a link out, read back as Markdown, and lint finds nothing wrong', async () => {
  for (const def of apps()) {
    const md = toMarkdown(def, T.example(def.id));
    const url = T.linkFromMarkdown(def.id, md);
    assert.ok(url.includes(`/#/v0/${def.id}/`), def.id);
    const p = T.parse(url);
    assert.equal(p.app, def.id);
    assert.ok(p.markdown.trim().length > 0, `${def.id} reads back as Markdown`);
    const errors = (await T.lint(def.id, p.env.body)).filter((w) => w.level === 'error');
    assert.deepEqual(errors, [], `${def.id}: lint errors on what Markdown made`);
  }
});

test('every app: one trip through Markdown settles; the second changes nothing', () => {
  for (const def of apps()) {
    const once = fromMarkdown(def, toMarkdown(def, T.example(def.id)));
    const twice = fromMarkdown(def, toMarkdown(def, once));
    assert.equal(twice, once, `${def.id} drifts on a second trip through Markdown`);
  }
});

test('what models wrap Markdown in is taken off: a code fence, front matter, Windows line ends, trailing spaces', () => {
  for (const [app, { md }] of Object.entries(AGENT)) {
    const def = appOf(app)!;
    const clean = fromMarkdown(def, md);
    for (const [how, wrapped] of [
      ['fence', '```markdown\n' + md + '```\n'],
      ['front matter', '---\ntitle: X\n---\n\n' + md],
      ['CRLF', md.replace(/\n/g, '\r\n')],
      ['trailing spaces', md.replace(/\n/g, '  \n')],
    ] as const) {
      assert.equal(fromMarkdown(def, wrapped), clean, `${app}: ${how}`);
    }
  }
});

test('a plain link carrying Markdown (#md=) is read as that Markdown', () => {
  for (const [app, { md, check }] of Object.entries(AGENT)) {
    const p = T.parse(`https://tinylittleoffice.com/${app}/#title=X&md=${encodeURIComponent(md)}`);
    assert.equal(p.app, app);
    assert.equal(p.env.title, 'X');
    check(p.env.body);
  }
});

test('a timed event keeps its time and zone through Markdown', () => {
  const def = appOf('cal')!;
  const md = 'Time zone: Europe/Lisbon\n\n- 2027-03-10 09:00-10:30: Retro\n- 2027-03-12: Demo\n';
  const body = fromMarkdown(def, md);
  const cal = parseCalendar(body);
  assert.equal(cal.zone, 'Europe/Lisbon');
  assert.equal(cal.spans[0].kind, 't');
  assert.equal(cal.spans[0].dur, 90);
  assert.equal(toMarkdown(def, body), md);
});
