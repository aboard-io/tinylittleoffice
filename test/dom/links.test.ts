// Links in and out of the shell, in happy-dom: the skill's examples, a document embedded, a QR code (ported from e2e/more.spec.ts).
import { test, expect, beforeEach } from 'vitest';
import { mount, button } from './helpers.ts';
import { open, visit, prefs, asText, settleAll, until, saved, editor, ref } from './helpers-more.ts';
import { appOf } from '../../src/kit/core.ts';
import skill from '../../skill/tinyoffice/SKILL.md?raw';

beforeEach(() => prefs());

const links = [...skill.matchAll(/^\s*https:\/\/tinylittleoffice\.com\/(\w+)\/#(\S+)$/gm)];
/** An example's document, read the way the shell reads a plain link's "doc". */
const docOf = (app: string, params: string) => {
  const text = new URLSearchParams(params).get('doc') ?? '';
  const def = appOf(app)!;
  return def.read ? def.read(text) : text;
};

test('every example in the skill is a document its editor opens and draws', async () => {
  asText();
  expect(links.length).toBeGreaterThanOrEqual(25);
  for (const [, app, params] of links) {
    const doc = docOf(app, params);
    expect(doc, app).not.toBe('');
    const { el, docs } = await mount(app, doc);
    expect(docs, `${app}: opening it changes nothing`).toEqual([]);
    expect(el.childElementCount, app).toBeGreaterThan(0);
    // The picture every other view is made from has something in it (drawn into a PNG: e2e).
    const pages = appOf(app)!.view(doc);
    expect(pages.length, app).toBeGreaterThan(0);
    expect(pages[0].svg.length, app).toBeGreaterThan(200);
  }
});

test('a plain link becomes the compact one, on the page of its app, with its title', async () => {
  for (const app of ['sheet', 'invoice', 'deck']) {
    const [, , params] = links.find((l) => l[1] === app)!;
    await visit(`/${app}/#${params}`);
    expect(editor(app), app).toBeTruthy();
    expect(location.pathname + location.hash, app).toMatch(new RegExp(`^/${app}/#/v0/${app}/[yzr][A-Za-z0-9_-]+$`));
    const want = new URLSearchParams(params).get('title') ?? '';
    expect(document.querySelector<HTMLInputElement>('input[aria-label="Title"]')!.value, app).toBe(want);
    expect(editor(app).value, app).toBe(docOf(app, params));
  }
  // From the front page, with the app named as a parameter.
  await visit('/#app=org&title=Team&doc=Ada%0A++Ben');
  expect([...editor('org').querySelectorAll('svg text')].map((t) => t.textContent)).toEqual(['Ada', 'Ben']);
  // After "?" the document would reach the server, so that form is not understood.
  await visit('/?app=org&doc=Ada');
  expect(document.querySelector('to-org')).toBeNull();
  expect(document.querySelector('.to-launcher')).toBeTruthy();
});

test('what a few of the skill examples say', async () => {
  const at = async (app: string) => {
    const [, , params] = links.find((l) => l[1] === app)!;
    return (await mount(app, docOf(app, params))).el;
  };
  expect((await at('sheet')).querySelectorAll('.sheet-chart svg rect[rx="2"]')).toHaveLength(3);
  const gantt = await at('gantt');
  expect(gantt.querySelector<HTMLInputElement>('input[aria-label="Start of task 1"]')!.value).toBe('2027-03-01');
  expect(gantt.querySelectorAll('.gantt-chart .bar.parent')).toHaveLength(1);
  expect((await at('cal')).querySelectorAll('.cal-agenda li')).toHaveLength(3);
  const todo = await at('todo');
  expect(todo.querySelectorAll('.todo-list li')).toHaveLength(3);
  expect(todo.querySelector<HTMLInputElement>('.todo-list li input[aria-label="Due date"]')!.value).toBe('2027-03-01');
  const trip = await at('trip');
  expect(trip.querySelector<HTMLInputElement>('[aria-label="Name of stop 3"]')!.value).toBe('Porto');
  expect(trip.querySelector<HTMLInputElement>('[aria-label="Note for stop 1"]')!.value).toBe('Pastel de nata first');
  const db = await at('db');
  expect(db.querySelectorAll('.diagram-aside table tbody tr')).toHaveLength(2);
  expect(db.querySelector('.diagram-aside')!.textContent).toContain('Platform');
});

test('a document can be shown inside another page: the embed code, and the page it opens', async () => {
  await open('/deck/#title=Launch+plan&doc=%23%23+%3Arocket%3A+Launch+plan+%7B.title%7D%0A%0A-+Spring%0A%0A---%0A%0A%23%23+Goals%0A%0A-+Ship+it%0A');
  expect(editor('deck')).toBeTruthy();
  // The embed code has the manners of a good embed.
  let code = '';
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t: string) => void (code = t), readText: async () => code } });
  const item = [...document.querySelectorAll<HTMLElement>('sl-menu-item')].find((m) => m.textContent!.trim() === 'Copy embed code')!;
  item.dispatchEvent(new CustomEvent('sl-select', { bubbles: true, composed: true, detail: { item } }));
  await until(() => expect(code).not.toBe(''));
  expect(code).toMatch(/^<iframe src="http:\/\/localhost:3000\/deck\/#\/v0\/deck\.embed\/[^"]+" title="Launch plan" loading="lazy" referrerpolicy="no-referrer" allowfullscreen style="width:100%;max-width:960px;aspect-ratio:960\/644;[^"]*"><\/iframe>$/);
  // What the frame will show: the document, and a way to the editor.
  const src = /src="([^"]+)"/.exec(code)![1];
  await visit(src.replace('http://localhost:3000', ''));
  const pic = () => document.querySelector('.to-embedded .pic svg')!;
  expect(pic().textContent).toContain('Launch plan');
  expect(document.querySelector('.to-header')).toBeNull();
  expect(document.querySelector('.to-embedded a')!.textContent).toContain('Open in TinyLittleOffice');
  expect(document.querySelector('.to-embedded a')!.getAttribute('target')).toBe('_blank');
  // More than one page: step through.
  button(document, 'Next page').click();
  await settleAll();
  expect(pic().textContent).toContain('Goals');
});

test('the whole document as a QR code, to look at and to keep', async () => {
  await open('#/v0/' + ref('todo', '- Scan me', 1));
  button(document, 'QR code').click();
  await settleAll();
  const dialog = document.querySelector('#qr-dialog')!;
  expect(dialog.hasAttribute('open')).toBe(true);
  expect(dialog.querySelector('[role="img"][aria-label="QR code of this document"] svg')).toBeTruthy();
  expect(dialog.textContent).toMatch(/\d+ bytes, as one code/);
  // The SVG is the code as drawn (the PNG is drawn on a canvas: e2e).
  button(dialog, /SVG/).click();
  const svg = await until(() => {
    const f = saved.at(-1);
    if (!f?.name.endsWith('-qr.svg')) throw new Error('not saved');
    return f;
  });
  expect(await svg.text()).toContain('<svg');
  // Too long for any code, and it says so.
  await visit('#/v0/' + ref('write', Array.from({ length: 400 }, (_, i) => `Line ${i} of a long document with words that do not repeat much ${i * 7919}`).join('\n'), 1));
  button(document, 'QR code').click();
  await settleAll();
  expect(document.querySelector('#qr-dialog')!.textContent).toContain('the largest QR code holds 2,953');
});
