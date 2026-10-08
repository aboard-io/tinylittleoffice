// The apps that make a page, in happy-dom: the page each draws in its frame, read as it is written, before any script of its own runs (ported from e2e/more.spec.ts).
import { test, expect, beforeEach } from 'vitest';
import { mount, settle, button, setSl, type Editor } from './helpers.ts';
import { open, visit, prefs, asText, box, settleAll, until, saved, editor } from './helpers-more.ts';
import { privacy } from '../../src/lib/privacy.ts';
import { parseContract } from '../../src/apps/contract.def.ts';

beforeEach(() => {
  prefs();
  asText();
});

/** The page in an editor's frame, as written (its scripts are e2e's). */
const framed = (el: Element) => new DOMParser().parseFromString(el.querySelector('iframe')!.getAttribute('srcdoc')!, 'text/html');
const texts = (els: Iterable<Element>) => [...els].map((e) => e.textContent!.replace(/\s+/g, ' ').trim());
/** An app with its example in it. */
async function example(app: string) {
  const m = await mount(app);
  button(m.el, 'Start from an example').click();
  await settle(m.el);
  return m;
}

test('page apps: a site, a store, an invoice', async () => {
  // What downloads is the page itself, whole.
  await open('#/v0/site');
  button(editor('site'), 'Start from an example').click();
  await settleAll();
  [...document.querySelectorAll<HTMLElement>('sl-menu-item')].find((m) => /Web page/.test(m.textContent!))!.dispatchEvent(new CustomEvent('sl-select', { bubbles: true, composed: true, detail: { item: { value: 'html' } } }));
  const file = await until(() => {
    const f = saved.at(-1);
    if (!f?.name.endsWith('.html')) throw new Error('nothing saved');
    return f;
  });
  expect(file.name).toBe('harbor-coffee.html');
  expect(await file.text()).toContain('<h1>Harbor Coffee</h1>');

  // A site.
  const site = framed((await example('site')).el);
  // (One page of the site shows at a time: the first is home.)
  expect(site.querySelector('h1')!.textContent).toBe('Harbor Coffee');
  expect(site.querySelectorAll('ul.cards li')).toHaveLength(6);
  expect(texts(site.querySelectorAll('header a'))).toEqual(['Home', 'Menu', 'Find us']);

  // A store: a button for each thing (the cart itself is e2e's: its script).
  const store = framed((await example('store')).el);
  expect([...store.querySelectorAll('button')].filter((b) => /^Add .* to the cart$/.test(b.getAttribute('aria-label') ?? ''))).toHaveLength(4);

  // An invoice: the sums are done, and it is called by its number.
  await visit('#/v0/invoice');
  button(editor('invoice'), 'Start from an example').click();
  await settleAll();
  expect(framed(editor('invoice')).querySelector('tfoot tr:last-child')!.textContent).toContain('$5,486.40');
  expect(document.title).toBe('Invoice 0042 · TinyLittleOffice');
});

test('contract: two people, two keys, two signatures', async () => {
  const { el, last } = await mount('contract');
  const text = box<HTMLTextAreaElement>(el, 'Contract, as text');
  text.value = '# Dog-walking agreement\n\nSam walks Biscuit every weekday.';
  text.dispatchEvent(new Event('input', { bubbles: true }));
  await settle(el);
  const signatures = (root: Element) => root.querySelectorAll('.contract-sign li:not(.none)');
  const sign = async (root: Editor, name: string) => {
    setSl(root.querySelector('sl-input[label="Your name"]'), name, 'sl-input');
    await settle(root);
    button(root, /Sign$/).click();
    await until(() => expect(root.querySelector('.contract-sign')!.textContent).toContain(`Signed as ${name}`));
    await until(() => expect(root.querySelectorAll('.contract-sign li.ok').length).toBe(parseContract(root.value).signatures.length));
  };
  await sign(el, 'Paul');
  expect(signatures(el)).toHaveLength(1);
  expect(signatures(el)[0].textContent).toContain('Signed these exact words');
  const sent = last()!;
  // The signatures follow the words, a table in a fence of their own.
  expect(sent).toMatch(/^# Dog-walking agreement\n\nSam walks Biscuit every weekday\.\n\n```signatures\nName \| Key \| Signature\n--- \| --- \| ---\nPaul \| \S+ \| \S+\n```$/);

  // The other party, with a key of their own (as in a browser of their own), opens what was sent.
  privacy.forgetKey();
  const other = await mount('contract', sent);
  await until(() => expect(other.el.querySelectorAll('.contract-sign li.ok')).toHaveLength(1));
  expect(signatures(other.el)[0].textContent).toContain('Paul');
  await sign(other.el, 'Sam');
  expect(signatures(other.el)).toHaveLength(2);
  expect(other.el.querySelectorAll('.contract-sign li.ok')).toHaveLength(2);
  // Two different keys signed.
  const marks = texts(other.el.querySelectorAll('.contract-sign li code'));
  expect(new Set(marks).size).toBe(2);
  expect(new Set(parseContract(other.last()!).signatures.map((s) => s.key)).size).toBe(2);

  // Back with the first party: both signatures hold, on the page too; change a word and neither does.
  const both = await mount('contract', other.last()!);
  await until(() => expect(both.el.querySelectorAll('.contract-sign li.ok')).toHaveLength(2));
  expect(framed(both.el).querySelectorAll('.signed div')).toHaveLength(2);
  const area = box<HTMLTextAreaElement>(both.el, 'Contract, as text');
  area.value = '# Dog-walking agreement\n\nSam walks Biscuit every weekend.';
  area.dispatchEvent(new Event('input', { bubbles: true }));
  await until(() => expect(both.el.querySelectorAll('.contract-sign li.bad')).toHaveLength(2));
  expect(both.el.querySelector('.contract-sign li.bad')!.textContent).toContain('have changed since');
});

test('small apps: a poll counts, a bill is settled, a log adds up, Secret Santa deals one link each', async () => {
  // A poll counts; adding a line adds a vote.
  const poll = await example('poll');
  const votes = (doc: Document, choice: string) => [...doc.querySelectorAll('li')].find((l) => l.textContent!.includes(choice))!.querySelector('.top span:last-child')!.textContent;
  expect(votes(framed(poll.el), 'Tacos')).toBe('2');
  const text = box<HTMLTextAreaElement>(poll.el, 'Poll, as text');
  text.value += '\nGrace | Sushi';
  text.dispatchEvent(new Event('input', { bubbles: true }));
  await settle(poll.el);
  expect(votes(framed(poll.el), 'Sushi')).toBe('2');
  // The bill, settled.
  expect(texts(framed((await example('split')).el).querySelectorAll('.pay'))).toEqual(['Grace pays Paul 92.88', 'Ada pays Paul 47.88', 'Sam pays Paul 6.38']);
  expect(framed((await example('log')).el).querySelector('.sums div')!.textContent).toContain('22.5 km');
  // Secret Santa: the organiser gets a link per person; each shows one draw only (shown at the press of a button: e2e).
  const santa = framed((await example('santa')).el);
  const links = [...santa.querySelectorAll('.links li')];
  expect(links).toHaveLength(5);
  const adas = links.find((l) => l.textContent!.includes('Ada'))!.querySelector('a')!.getAttribute('href')!;
  await visit(adas.replace(/^https?:\/\/[^/]+/, ''));
  const main = framed(editor('santa')).querySelector('main')!;
  expect(main.textContent).toContain('Ada, this link is yours alone');
  expect(main.textContent).not.toContain('their link');
});

test('the diagram apps that draw a place, a family or a time: each example draws', async () => {
  for (const app of ['floor', 'seating', 'family', 'timeline']) {
    const { el } = await example(app);
    expect(el.querySelectorAll('.pic > svg g.pick, .pic > svg g.shape').length, app).toBeGreaterThan(0);
    expect(el.querySelectorAll('.pic > svg text').length, app).toBeGreaterThan(0);
  }
});
