// <to-table> on a bare page (kit/ui/table.ts; docs/library.md, A typed table): a grid of typed cells that sorts by a
// click on a heading (Shift: as well), edits in place and tells the page, which keeps the edit or refuses it and the
// cell goes back; walks by the keys; ticks rows; filters; hides columns; and 5,000 rows drawn, sorted, scrolled and
// walked to the end in the time a person does not notice. The order of each type is test/table.test.ts's.
import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../../src/editors.css';
import '../../src/kit/ui/table.ts';
import type { RowChange, ToTable } from '../../src/kit/ui/table.ts';
import type { TableColumn, TableRow } from '../../src/kit/ui/table-model.ts';
import { until } from './wait.ts';

interface Row extends TableRow {
  name: string;
  deal: number | null;
  met: string | null;
  vip: boolean;
  stage: string;
  company: string;
}
const COLS: TableColumn<Row>[] = [
  { key: 'name', label: 'Name', type: 'person', editable: true },
  { key: 'deal', label: 'Deal', type: 'money', currency: '$', editable: true },
  { key: 'met', label: 'Met', type: 'date', editable: true },
  { key: 'vip', label: 'VIP', type: 'boolean', editable: true },
  {
    key: 'stage',
    label: 'Stage',
    type: 'enum',
    editable: true,
    options: [
      { value: 'lead', label: 'Lead', color: 'gray' },
      { value: 'won', label: 'Won', color: 'green' },
    ],
  },
  { key: 'company', label: 'Company', type: 'link', href: (r) => `#company-${r.company}` },
];
const ROWS: Row[] = [
  { id: 'a', name: 'Ada', deal: 950, met: '2027-03-01', vip: true, stage: 'won', company: 'Aboard' },
  { id: 'b', name: 'Bea', deal: 12000, met: '2026-12-31', vip: false, stage: 'lead', company: 'Clear Channel' },
  { id: 'c', name: 'Cy', deal: null, met: null, vip: false, stage: 'lead', company: 'Mubadala' },
  { id: 'd', name: 'Dee', deal: 1200, met: '2027-01-15', vip: true, stage: 'won', company: 'Sixth Street' },
];

async function table(props: Partial<ToTable<Row>> = {}, rows: Row[] = ROWS): Promise<ToTable<Row>> {
  document.body.innerHTML = '';
  const el = document.createElement('to-table') as ToTable<Row>;
  Object.assign(el, { columns: COLS, rows, label: 'People', ...props });
  document.body.append(el);
  await el.updateComplete;
  await el.updateComplete;
  return el;
}
/** The names in the rows shown, in their order. */
const names = (el: ToTable<Row>) => el.shownRows.map((r) => r.name).join(' ');
/** The words in the cell of a row (by name) and a column (by its heading). */
function cell(el: ToTable<Row>, name: string, col: string): HTMLElement {
  const c = [...el.querySelectorAll('[role=columnheader]')].findIndex((h) => h.textContent?.trim().startsWith(col));
  const r = el.shownRows.findIndex((x) => x.name === name);
  return el.querySelector<HTMLElement>(`[data-r="${r}"][data-c="${c}"]`)!;
}
const heading = (el: ToTable<Row>, col: string) => [...el.querySelectorAll<HTMLElement>('[role=columnheader]')].find((h) => h.textContent?.trim().startsWith(col))!;

test('a grid: a row of headings and a row a record, each cell typed', async () => {
  const el = await table();
  const grid = el.querySelector('[role=grid]')!;
  expect(grid.getAttribute('aria-rowcount')).toBe('5');
  expect(grid.getAttribute('aria-label')).toBe('People');
  expect([...el.querySelectorAll('[role=columnheader]')].map((h) => h.textContent?.trim())).toStrictEqual(['Name', 'Deal', 'Met', 'VIP', 'Stage', 'Company']);
  expect(cell(el, 'Ada', 'Deal').textContent?.trim()).toBe('$950.00');
  expect(cell(el, 'Ada', 'Met').textContent?.trim()).toBe('1 Mar 27');
  expect(cell(el, 'Ada', 'VIP').querySelector('input')!.checked).toBe(true);
  expect(cell(el, 'Ada', 'Stage').querySelector('.to-chip')!.textContent).toBe('Won');
  expect(cell(el, 'Ada', 'Company').querySelector('a')!.getAttribute('href')).toBe('#company-Aboard');
  expect(cell(el, 'Cy', 'Deal').textContent?.trim()).toBe('');
  // One cell takes Tab.
  expect(el.querySelectorAll('[tabindex="0"]').length).toBe(1);
});

test('a click on a heading sorts by it, each type by its own order, an empty cell last; Shift sorts by it as well', async () => {
  const el = await table();
  const sorts: unknown[] = [];
  el.addEventListener('sortchange', (e) => sorts.push((e as CustomEvent).detail.sort));
  heading(el, 'Deal').querySelector('button')!.click();
  await el.updateComplete;
  expect(names(el)).toBe('Ada Dee Bea Cy');
  expect(heading(el, 'Deal').getAttribute('aria-sort')).toBe('ascending');
  heading(el, 'Deal').querySelector('button')!.click();
  await el.updateComplete;
  expect(names(el)).toBe('Bea Dee Ada Cy');
  expect(heading(el, 'Deal').getAttribute('aria-sort')).toBe('descending');
  heading(el, 'Met').querySelector('button')!.click();
  await el.updateComplete;
  expect(names(el)).toBe('Bea Dee Ada Cy');
  heading(el, 'Stage').querySelector('button')!.click();
  await el.updateComplete;
  heading(el, 'Name')
    .querySelector('button')!
    .dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
  await el.updateComplete;
  heading(el, 'Name')
    .querySelector('button')!
    .dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
  await el.updateComplete;
  expect(names(el)).toBe('Cy Bea Dee Ada');
  expect(el.sort).toStrictEqual([
    { key: 'stage', dir: 'asc' },
    { key: 'name', dir: 'desc' },
  ]);
  expect(heading(el, 'Name').getAttribute('aria-sort')).toBe('none');
  expect(heading(el, 'Name').querySelector('small')!.textContent).toBe('2');
  expect(sorts.length).toBe(6);
});

test("a click anywhere on a heading sorts, its far end and its padding too; a number's words stay at the end", async () => {
  // Paul, 2026-10-23: "Let me click on the full column head to sort in addition to the text in the column head."
  const el = await table();
  const name = heading(el, 'Name');
  const words = name.querySelector('button > span')!.getBoundingClientRect();
  const box = name.getBoundingClientRect();
  expect(box.right - words.right).toBeGreaterThan(20);
  // The empty end of the heading, past its words, inside its padding.
  await userEvent.click(name, { position: { x: name.offsetWidth - 3, y: name.offsetHeight / 2 } });
  await el.updateComplete;
  expect(el.sort).toStrictEqual([{ key: 'name', dir: 'asc' }]);
  expect(name.getAttribute('aria-sort')).toBe('ascending');
  // Just past the words, on the button that fills the cell.
  await userEvent.click(name, { position: { x: words.right - box.left + 12, y: name.offsetHeight / 2 } });
  await el.updateComplete;
  expect(el.sort).toStrictEqual([{ key: 'name', dir: 'desc' }]);
  // Shift adds a sort from the empty end as from the words.
  const deal = heading(el, 'Deal');
  await userEvent.click(deal, { position: { x: 3, y: deal.offsetHeight / 2 }, modifiers: ['Shift'] });
  await el.updateComplete;
  expect(el.sort).toStrictEqual([
    { key: 'name', dir: 'desc' },
    { key: 'deal', dir: 'asc' },
  ]);
  // A number's heading keeps its words at the cell's end, a word's at its start.
  const dealWords = deal.querySelector('button > span')!.getBoundingClientRect();
  const dealBox = deal.getBoundingClientRect();
  expect(dealWords.left - dealBox.left).toBeGreaterThan(20);
  expect(words.left - box.left).toBeLessThan(16);
});

test('an edit is told to the page and shown; refused, at once or later, the cell goes back', async () => {
  const el = await table();
  const told: RowChange<Row>[] = [];
  let answer: 'keep' | 'refuse' | 'later' = 'keep';
  let later: (ok: boolean) => void = () => {};
  el.addEventListener('rowchange', (e) => {
    const ev = e as CustomEvent<RowChange<Row>>;
    told.push(ev.detail);
    if (answer === 'refuse') ev.preventDefault();
    if (answer === 'later') ev.detail.wait(new Promise<boolean>((ok) => (later = ok)));
  });
  const edit = async (name: string, col: string, typed: string) => {
    cell(el, name, col).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await until(() => !!el.querySelector('.to-dt-editor'), 'no editor opened');
    const field = el.querySelector<HTMLInputElement>('.to-dt-editor')!;
    expect(document.activeElement).toBe(field);
    field.value = typed;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await el.updateComplete;
  };
  await edit('Ada', 'Deal', '$1,500');
  expect(told.at(-1)).toMatchObject({ id: 'a', column: 'deal', value: 1500, before: 950 });
  expect(cell(el, 'Ada', 'Deal').textContent?.trim()).toBe('$1,500.00');
  expect(document.activeElement).toBe(cell(el, 'Ada', 'Deal'));

  answer = 'refuse';
  await edit('Bea', 'Met', '2027-05-04');
  expect(told.at(-1)).toMatchObject({ id: 'b', column: 'met', value: '2027-05-04', before: '2026-12-31' });
  expect(cell(el, 'Bea', 'Met').textContent?.trim()).toBe('31 Dec 26');

  answer = 'later';
  await edit('Cy', 'Name', 'Cyrus');
  expect(cell(el, 'Cy', 'Name').textContent?.trim()).toBe('CCyrus');
  later(false);
  await until(() => cell(el, 'Cy', 'Name').textContent?.trim() === 'CCy', 'the refused name never went back');

  // Words where a number belongs are not an edit: the field says so and stays.
  answer = 'keep';
  const n = told.length;
  cell(el, 'Dee', 'Deal').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  await until(() => !!el.querySelector('.to-dt-editor'));
  const field = el.querySelector<HTMLInputElement>('.to-dt-editor')!;
  field.value = 'lots';
  field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  expect(field.getAttribute('aria-invalid')).toBe('true');
  field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await el.updateComplete;
  expect(el.querySelector('.to-dt-editor')).toBeNull();
  expect(told.length).toBe(n);
  expect(cell(el, 'Dee', 'Deal').textContent?.trim()).toBe('$1,200.00');

  // A box is ticked at once; a status chosen from its options.
  cell(el, 'Bea', 'VIP').click();
  await el.updateComplete;
  expect(told.at(-1)).toMatchObject({ id: 'b', column: 'vip', value: true, before: false });
  expect(cell(el, 'Bea', 'VIP').querySelector('input')!.checked).toBe(true);
  cell(el, 'Bea', 'Stage').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  await until(() => el.querySelector('.to-dt-editor') instanceof HTMLSelectElement, 'no options');
  const select = el.querySelector<HTMLSelectElement>('.to-dt-editor')!;
  select.value = 'won';
  select.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await el.updateComplete;
  expect(told.at(-1)).toMatchObject({ id: 'b', column: 'stage', value: 'won', before: 'lead' });

  // The page's rows given again are the truth: the edits shown over them are let go.
  el.rows = ROWS.map((r) => ({ ...r }));
  await el.updateComplete;
  expect(cell(el, 'Ada', 'Deal').textContent?.trim()).toBe('$950.00');
});

test('the keys: the arrows walk the cells and the headings, Enter edits or picks, Escape lets an edit go, Space ticks', async () => {
  const el = await table({ selectable: true });
  const picked: unknown[] = [];
  const selected: unknown[] = [];
  el.addEventListener('rowpick', (e) => picked.push((e as CustomEvent).detail.id));
  el.addEventListener('selection', (e) => selected.push((e as CustomEvent).detail.ids));
  const first = el.querySelector<HTMLElement>('[tabindex="0"]')!;
  first.focus();
  const at = () => document.activeElement as HTMLElement;
  await userEvent.keyboard('{ArrowRight}');
  await until(() => at().dataset.c === '1');
  await userEvent.keyboard('{ArrowDown}');
  await until(() => at().dataset.r === '1');
  await userEvent.keyboard('{ArrowUp}{ArrowUp}');
  await until(() => at().getAttribute('role') === 'columnheader', 'the headings were never reached');
  await userEvent.keyboard('{Enter}');
  await el.updateComplete;
  expect(el.sort).toStrictEqual([{ key: 'name', dir: 'asc' }]);
  await userEvent.keyboard('{ArrowDown}{Enter}');
  await until(() => !!el.querySelector('.to-dt-editor'), 'Enter opened no editor');
  await userEvent.keyboard('{Escape}');
  await until(() => !el.querySelector('.to-dt-editor') && at().dataset.r === '0', 'Escape did not let the edit go');
  await userEvent.keyboard('{End}');
  await until(() => at().dataset.c === '6');
  await userEvent.keyboard('{Enter}');
  // A link's cell: Enter opens its link (here, an address in the page).
  await until(() => location.hash === '#company-Aboard', 'the link was not followed');
  await userEvent.keyboard('{Home} ');
  await until(() => selected.length === 1);
  expect(selected[0]).toStrictEqual(['a']);
  // A cell of a column not edited picks its row.
  COLS[0].editable = false;
  el.columns = [...COLS];
  await el.updateComplete;
  cell(el, 'Bea', 'Name').click();
  COLS[0].editable = true;
  expect(picked).toStrictEqual(['b']);
  history.replaceState(null, '', location.pathname + location.search);
});

test('rows ticked one by one, by Shift and a click, and all at once', async () => {
  const el = await table({ selectable: true });
  const told: string[][] = [];
  el.addEventListener('selection', (e) => told.push((e as CustomEvent).detail.ids));
  const box = (r: number) => el.querySelector<HTMLElement>(`[data-r="${r}"][data-c="0"]`)!;
  box(0).click();
  await el.updateComplete;
  box(2).dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
  await el.updateComplete;
  expect(told).toStrictEqual([['a'], ['a', 'b', 'c']]);
  // A tap on the box itself (not the cell round it) leaves it ticked once the browser has had its say after the click.
  box(3).querySelector('input')!.click();
  await el.updateComplete;
  await new Promise((ok) => setTimeout(ok, 0));
  expect([told.at(-1), box(3).querySelector('input')!.checked]).toStrictEqual([['a', 'b', 'c', 'd'], true]);
  box(3).querySelector('input')!.click();
  await el.updateComplete;
  await new Promise((ok) => setTimeout(ok, 0));
  expect([told.at(-1), box(3).querySelector('input')!.checked]).toStrictEqual([['a', 'b', 'c'], false]);
  expect(el.querySelectorAll('[role=row][aria-selected=true]').length).toBe(3);
  const all = el.querySelector<HTMLInputElement>('.to-dt-head input')!;
  expect(all.indeterminate).toBe(true);
  all.click();
  await el.updateComplete;
  expect(told.at(-1)).toStrictEqual(['a', 'b', 'c', 'd']);
  expect(all.checked).toBe(true);
});

test('the quick search, the page’s filter, the columns hidden, Add row, and nothing found', async () => {
  const el = await table({ filterable: true, hideable: true, addable: true });
  const field = el.querySelector<HTMLInputElement>('.to-dt-filter input')!;
  field.value = 'channel';
  field.dispatchEvent(new Event('input'));
  await el.updateComplete;
  expect(names(el)).toBe('Bea');
  el.query = 'won';
  await el.updateComplete;
  expect(names(el)).toBe('Ada Dee');
  el.filter = (r) => r.deal !== 950;
  await el.updateComplete;
  expect(names(el)).toBe('Dee');
  el.query = 'nobody';
  await el.updateComplete;
  expect(el.querySelector('.to-dt-empty')!.textContent).toBe('No rows match');
  el.query = '';
  el.filter = null;
  let hidden: string[] = [];
  el.addEventListener('columnschange', (e) => (hidden = (e as CustomEvent).detail.hidden));
  const menu = el.querySelector<HTMLElement & { items: { label: string; does(): void }[] }>('to-menu')!;
  menu.items.find((i) => i.label === 'Company')!.does();
  await el.updateComplete;
  expect(hidden).toStrictEqual(['company']);
  expect([...el.querySelectorAll('[role=columnheader]')].map((h) => h.textContent?.trim())).not.toContain('Company');
  let added = 0;
  el.addEventListener('rowadd', () => added++);
  el.querySelector<HTMLButtonElement>('.to-dt-add')!.click();
  expect(added).toBe(1);
  const none = await table({ empty: 'No people yet' }, []);
  expect(none.querySelector('.to-dt-empty')!.textContent).toBe('No people yet');
});

test('the toolbar slot: the page’s own controls drawn in the bar, before the kit’s', async () => {
  document.body.innerHTML = '<to-table filterable><div slot="toolbar" class="mine">My · All</div></to-table>';
  const el = document.querySelector('to-table') as ToTable<Row>;
  el.columns = COLS;
  el.rows = ROWS;
  await el.updateComplete;
  const bar = el.querySelector('.to-dt-bar')!;
  expect(bar.firstElementChild?.classList.contains('mine')).toBe(true);
  expect(el.querySelector(':scope > .mine')).toBeNull();
});

test('5,000 rows: drawn, sorted, filtered, scrolled and walked to the end quickly, only those in sight drawn', async () => {
  const many: Row[] = Array.from({ length: 5000 }, (_, i) => ({
    id: i,
    name: `Person ${(i * 7919) % 5000}`,
    deal: (i * 31) % 9973,
    met: `2027-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
    vip: i % 3 === 0,
    stage: i % 2 ? 'lead' : 'won',
    company: `Company ${i % 97}`,
  }));
  const times: Record<string, number> = {};
  const time = async (what: string, f: () => unknown) => {
    const t0 = performance.now();
    await f();
    times[what] = Math.round(performance.now() - t0);
  };
  let el!: ToTable<Row>;
  await time('draw', async () => (el = await table({}, many)));
  const drawn = el.querySelectorAll('.to-dt-body [role=row]').length;
  expect(drawn).toBeGreaterThan(5);
  expect(drawn).toBeLessThan(80);
  await time('sort by money', async () => {
    heading(el, 'Deal').querySelector('button')!.click();
    await el.updateComplete;
  });
  expect(el.shownRows[0].deal).toBe(0);
  await time('sort by date, then name', async () => {
    el.sort = [
      { key: 'met', dir: 'desc' },
      { key: 'name', dir: 'asc' },
    ];
    await el.updateComplete;
  });
  await time('filter', async () => {
    el.query = '"company 42"';
    await el.updateComplete;
  });
  expect(el.shownRows.length).toBe(52);
  // The next letter typed finds each row's words kept.
  await time('filter, a letter more', async () => {
    el.query = '"company 42" person';
    await el.updateComplete;
  });
  expect(el.shownRows.length).toBe(52);
  el.query = '';
  await el.updateComplete;
  const box = el.querySelector<HTMLElement>('.to-dt-box')!;
  await time('scroll to the end', async () => {
    box.scrollTop = box.scrollHeight;
    await until(() => !!el.querySelector('[aria-rowindex="5001"]'), 'the last row was never drawn');
  });
  expect(el.querySelectorAll('.to-dt-body [role=row]').length).toBeLessThan(80);
  box.scrollTop = 0;
  el.querySelector<HTMLElement>('[tabindex="0"]')!.focus();
  await time('Mod+End', async () => {
    await userEvent.keyboard('{Control>}{End}{/Control}');
    await until(() => (document.activeElement as HTMLElement).dataset.r === '4999', 'Mod+End did not reach the last row');
  });
  console.info(`5,000 rows, in ms: ${JSON.stringify(times)}`);
  expect(times.draw).toBeLessThan(500);
  expect(times['sort by money']).toBeLessThan(500);
  expect(times['sort by date, then name']).toBeLessThan(500);
  expect(times.filter).toBeLessThan(1000);
  expect(times['filter, a letter more']).toBeLessThan(250);
});

test('at a phone’s width the table scrolls sideways in its own box, the page never', async () => {
  await page.viewport(390, 844);
  try {
    const el = await table({ selectable: true });
    const box = el.querySelector<HTMLElement>('.to-dt-box')!;
    expect(box.scrollWidth).toBeGreaterThan(box.clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    // In a box this narrow the names stay at the start, narrowed to two fifths of it, the rest scrolling beside them.
    box.scrollLeft = 200;
    const name = cell(el, 'Ada', 'Name');
    expect(getComputedStyle(name).position).toBe('sticky');
    await until(() => box.hasAttribute('scrolled') && name.getBoundingClientRect().width <= 0.4 * box.clientWidth + 1, 'the names never narrowed');
    el.querySelector<HTMLElement>('[tabindex="0"]')!.focus();
    box.scrollLeft = 0;
    await userEvent.keyboard('{End}');
    await until(() => (document.activeElement as HTMLElement).dataset.c === '6');
    const last = document.activeElement!.getBoundingClientRect();
    expect(last.right).toBeLessThanOrEqual(box.getBoundingClientRect().right + 1);
  } finally {
    await page.viewport(1280, 800);
  }
});

test.each([
  ['a column that does not wrap', false],
  ['a column that wraps', true],
])('scrolled sideways, the first column gives way to the rest, cut at a word, and opens again at the start: %s', async (_what, wrap) => {
  await page.viewport(1000, 800);
  try {
    const TITLE = "Young Center for Immigrant Children's Rights";
    const cols: TableColumn<Row>[] = [{ key: 'name', label: 'Name', type: 'text', fit: true, wrap }, ...COLS.slice(1).map((c) => ({ ...c, width: '12rem' }))];
    const el = await table({ columns: cols }, [{ ...ROWS[0], name: TITLE }, ...ROWS.slice(1)]);
    const box = el.querySelector<HTMLElement>('.to-dt-box')!;
    const name = cell(el, TITLE, 'Name');
    const words = name.querySelector<HTMLElement>('.to-dt-words')!;
    const wide = name.getBoundingClientRect().width;
    // At the start, as wide as its words, every one of them read.
    expect(words.scrollWidth).toBeLessThanOrEqual(words.clientWidth + 1);
    expect(wide).toBeGreaterThan(200);
    expect(name.title).toBe(TITLE);
    expect(box.hasAttribute('scrolled')).toBe(false);
    // The words of the first line drawn: the characters as high as the first.
    const firstLine = () => {
      const text = [...words.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent === TITLE)!;
      const range = document.createRange();
      const top = (i: number) => {
        range.setStart(text, i);
        range.setEnd(text, i + 1);
        return range.getBoundingClientRect().top;
      };
      let i = 1;
      while (i < TITLE.length && Math.abs(top(i) - top(0)) < 2) i++;
      return TITLE.slice(0, i);
    };
    expect(firstLine()).toBe(TITLE);
    const oneLine = words.getBoundingClientRect().height;

    box.scrollLeft = 300;
    // About twenty characters: --to-dt-pin-w, the one width for the heading and the rows.
    const narrow = 11 * parseFloat(getComputedStyle(document.documentElement).fontSize);
    await until(() => box.hasAttribute('scrolled') && Math.abs(name.getBoundingClientRect().width - narrow) < 1, 'the first column never narrowed');
    const head = el.querySelector<HTMLElement>('[role=columnheader].to-dt-pin')!;
    expect(head.getBoundingClientRect().width).toBeCloseTo(narrow, 0);
    expect(name.getBoundingClientRect().left).toBeCloseTo(box.getBoundingClientRect().left + 1, 0);
    // Its words cut at a word: the first line a whole word or more, shorter than the title; the rest not drawn.
    const seen = firstLine();
    expect(seen.length).toBeLessThan(TITLE.length);
    expect(seen.trim().length).toBeGreaterThan(0);
    expect(TITLE[seen.length] === ' ' || seen.endsWith(' ')).toBe(true);
    // One line drawn, the next not: the span no taller than a line and a half.
    expect(words.getBoundingClientRect().height).toBeLessThan(1.5 * oneLine);
    expect(name.title).toBe(TITLE);
    expect(name.textContent?.trim()).toBe(TITLE);
    // A cell walked to from the narrowed column is beside it, not under it.
    name.focus();
    await userEvent.keyboard('{ArrowRight}');
    await until(() => (document.activeElement as HTMLElement).dataset.c === '1');
    expect(document.activeElement!.getBoundingClientRect().left).toBeGreaterThanOrEqual(name.getBoundingClientRect().right - 1);

    box.scrollLeft = 0;
    await until(() => !box.hasAttribute('scrolled') && Math.abs(name.getBoundingClientRect().width - wide) < 1, 'the first column never opened again');
    expect(firstLine()).toBe(TITLE);
  } finally {
    await page.viewport(1280, 800);
  }
});

test.each([
  ['24em', 0.4],
  ['60em', null],
])('the first column gives way to two fifths of a narrow box, and to eleven rem of a wide one: %s', async (width, share) => {
  const cols: TableColumn<Row>[] = [{ key: 'name', label: 'Name', type: 'text', width: '16rem' }, ...COLS.slice(1).map((c) => ({ ...c, width: '12rem' }))];
  const el = await table({ columns: cols });
  el.style.width = width;
  const box = el.querySelector<HTMLElement>('.to-dt-box')!;
  box.scrollLeft = 200;
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const want = share === null ? 11 * rem : share * box.clientWidth;
  const name = cell(el, 'Ada', 'Name');
  await until(() => box.hasAttribute('scrolled') && Math.abs(name.getBoundingClientRect().width - want) < 1, 'the first column never narrowed');
  if (share !== null) expect(want).toBeLessThan(11 * rem);
  expect(el.querySelector<HTMLElement>('[role=columnheader].to-dt-pin')!.getBoundingClientRect().width).toBeCloseTo(want, 0);
  // The cell walked to from it is beside it, not under it.
  name.focus();
  await userEvent.keyboard('{ArrowRight}');
  await until(() => (document.activeElement as HTMLElement).dataset.c === '1');
  expect(document.activeElement!.getBoundingClientRect().left).toBeGreaterThanOrEqual(name.getBoundingClientRect().right - 1);
});

test('a line between every column, the heads’ and the rows’, the last none; a field’s halo drawn inside its cell', async () => {
  const el = await table();
  const end = (c: HTMLElement) => getComputedStyle(c).borderInlineEndWidth;
  for (const col of ['Name', 'Deal', 'Met', 'VIP', 'Stage']) {
    expect(end(cell(el, 'Ada', col)), col).toBe('1px');
    expect(end(heading(el, col)), col).toBe('1px');
  }
  expect(end(cell(el, 'Ada', 'Company'))).toBe('0px');
  expect(end(heading(el, 'Company'))).toBe('0px');
  // A ticked row's ground is still drawn, its lines with it.
  const ticked = await table({ selectable: true, selected: ['a'] } as Partial<ToTable<Row>>);
  const row = cell(ticked, 'Ada', 'Deal');
  expect(getComputedStyle(row).backgroundColor).not.toBe(getComputedStyle(cell(ticked, 'Bea', 'Deal')).backgroundColor);
  expect(end(row)).toBe('1px');
  expect(end(ticked.querySelector<HTMLElement>('[data-r="0"][data-c="0"]')!)).toBe('1px');

  // The Stage's options: the field's halo inset, inside the cell's lines.
  const stage = cell(ticked, 'Ada', 'Stage');
  stage.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  await until(() => !!ticked.querySelector('select.to-dt-editor'), 'no options opened');
  const field = ticked.querySelector<HTMLSelectElement>('select.to-dt-editor')!;
  expect(document.activeElement).toBe(field);
  expect(parseFloat(getComputedStyle(field).outlineOffset)).toBeLessThan(0);
  const [inner, outer] = [field.getBoundingClientRect(), stage.getBoundingClientRect()];
  expect(inner.left).toBeGreaterThan(outer.left);
  expect(inner.right).toBeLessThan(outer.right - 1);
  expect(inner.top).toBeGreaterThan(outer.top);
  expect(inner.bottom).toBeLessThan(outer.bottom - 1);
  // A <to-field> a page draws in a cell the same.
  const own = document.createElement('div');
  own.className = 'to-dt-cell';
  own.innerHTML = '<to-field><select><option>Won</option></select></to-field>';
  ticked.append(own);
  own.querySelector('select')!.focus();
  expect(parseFloat(getComputedStyle(own.querySelector('select')!).outlineOffset)).toBeLessThan(0);
});

interface Lead extends TableRow {
  title: string;
  company: { id: string; label: string; href?: string } | null;
  value: number;
  invite: boolean;
}
const COMPANIES = [
  { id: 'c1', label: 'Aboard', detail: 'aboard.com' },
  { id: 'c2', label: 'Clear Channel', detail: 'clearchannel.com' },
  { id: 'c3', label: 'Mubadala', detail: 'mubadala.com' },
];
const LONG = 'Clear Channel Digital Strategy for the spring outdoor campaign across every city they light up at night';
const LEADS: Lead[] = [
  { id: 'l1', title: 'Pilot', company: { id: 'c1', label: 'Aboard', href: '#c1' }, value: 12000, invite: false },
  { id: 'l2', title: LONG, company: null, value: 950.5, invite: true },
  { id: 'l3', title: 'Renewal', company: { id: 'c3', label: 'Mubadala' }, value: 1200, invite: false },
];
const asked: string[] = [];
const LEAD_COLS: TableColumn<Lead>[] = [
  { key: 'title', label: 'Title', type: 'text', editable: (r) => !r.invite, wrap: true, width: '14rem' },
  {
    key: 'company',
    label: 'Company',
    type: 'record',
    editable: true,
    fit: true,
    search: async (q) => {
      asked.push(q);
      await new Promise((ok) => setTimeout(ok, 10));
      return COMPANIES.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()));
    },
  },
  { key: 'value', label: 'Value', type: 'money', currency: '$', decimals: 0, editable: (r) => !r.invite },
];
async function leads(props: Partial<ToTable<Lead>> = {}, rows: Lead[] = LEADS): Promise<ToTable<Lead>> {
  document.body.innerHTML = '';
  const el = document.createElement('to-table') as ToTable<Lead>;
  Object.assign(el, { columns: LEAD_COLS, rows, label: 'Leads', ...props });
  document.body.append(el);
  await el.updateComplete;
  await el.updateComplete;
  return el;
}
const leadCell = (el: ToTable<Lead>, id: string, c: number) => el.querySelector<HTMLElement>(`[data-r="${el.shownRows.findIndex((r) => r.id === id)}"][data-c="${c}"]`)!;

test('money in whole units; a column that fits its widest words; a row that grows to wrap them', async () => {
  const el = await leads();
  expect(leadCell(el, 'l1', 2).textContent?.trim()).toBe('$12,000');
  expect(leadCell(el, 'l2', 2).textContent?.trim()).toBe('$951');
  // The company column is as wide as "Clear Channel" would be (none shows it yet: it is every row's words that count, and its heading's).
  const company = el.querySelector<HTMLElement>('[role=columnheader][aria-colindex="2"]')!;
  const words = leadCell(el, 'l1', 1).querySelector('a')!;
  expect(company.offsetWidth).toBeGreaterThanOrEqual(words.offsetWidth);
  expect(company.offsetWidth).toBeLessThan(24 * 16);
  // The long title wraps: its row is taller than the others, and the row after it begins below it.
  const rows = [...el.querySelectorAll<HTMLElement>('.to-dt-body > [role=row]')];
  const [short, long, after] = rows.map((r) => r.getBoundingClientRect());
  expect(long.height).toBeGreaterThan(short.height * 1.5);
  expect(Math.round(after.top)).toBe(Math.round(long.bottom));
  expect(leadCell(el, 'l2', 0).scrollHeight).toBeLessThanOrEqual(leadCell(el, 'l2', 0).clientHeight + 1);
  // The other cells of the tall row start at its top, in line with the title's first line, not halfway down it.
  const title = leadCell(el, 'l2', 0).getBoundingClientRect();
  const run = document.createRange();
  run.selectNodeContents(leadCell(el, 'l2', 2));
  expect(run.getBoundingClientRect().top).toBeLessThan(title.top + short.height / 2);
});

test('rows that grow are windowed by their heights: 5,000 drawn a few at a time, scrolled to the end and walked there', async () => {
  const many: Lead[] = Array.from({ length: 5000 }, (_, i) => ({ ...LEADS[i % 3], id: `x${i}`, title: i % 7 ? `Lead ${i}` : `${LONG} ${i}` }));
  const t0 = performance.now();
  const el = await leads({}, many);
  expect(performance.now() - t0).toBeLessThan(1500);
  expect(el.querySelectorAll('.to-dt-body [role=row]').length).toBeLessThan(80);
  const box = el.querySelector<HTMLElement>('.to-dt-box')!;
  box.scrollTop = box.scrollHeight;
  await until(() => !!el.querySelector('[aria-rowindex="5001"]'), 'the last row was never drawn');
  // Each drawn row begins where the one above it ends.
  await until(() => {
    const drawn = [...el.querySelectorAll<HTMLElement>('.to-dt-body > [role=row]')].sort((a, b) => Number(a.dataset.r) - Number(b.dataset.r));
    return drawn.every((r, i) => i === 0 || Number(r.dataset.r) !== Number(drawn[i - 1].dataset.r) + 1 || Math.abs(r.offsetTop - drawn[i - 1].offsetTop - drawn[i - 1].offsetHeight) < 1);
  }, 'rows overlap or leave gaps');
  box.scrollTop = 0;
  await until(() => !!el.querySelector('[aria-rowindex="2"]'));
  el.querySelector<HTMLElement>('[tabindex="0"]')!.focus();
  await userEvent.keyboard('{Control>}{End}{/Control}');
  await until(() => (document.activeElement as HTMLElement).dataset.r === '4999', 'Mod+End did not reach the last row');
  const last = document.activeElement!.getBoundingClientRect();
  expect(last.bottom).toBeLessThanOrEqual(box.getBoundingClientRect().bottom + 1);
});

test('a record’s cell: a link, edited by a picker that searches the host’s records, the id told', async () => {
  const el = await leads();
  const told: RowChange<Lead>[] = [];
  el.addEventListener('rowchange', (e) => told.push((e as CustomEvent<RowChange<Lead>>).detail));
  expect(leadCell(el, 'l1', 1).querySelector('a')!.getAttribute('href')).toBe('#c1');
  asked.length = 0;
  leadCell(el, 'l2', 1).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  await until(() => !!el.querySelector('.to-dt-pick'), 'no picker');
  const field = el.querySelector<HTMLInputElement>('.to-dt-pick')!;
  expect(field.getAttribute('role')).toBe('combobox');
  expect(document.activeElement).toBe(field);
  // Opened, the search is asked for '' at once; the records found are listed in a popover under the cell.
  await until(() => el.querySelectorAll('.to-rp-pop [role=option]').length === 3, 'the records were never listed');
  expect(asked).toStrictEqual(['']);
  expect(el.querySelector('.to-rp-pop')!.matches(':popover-open')).toBe(true);
  await userEvent.keyboard('clear');
  await until(() => el.querySelectorAll('.to-rp-pop [role=option]').length === 1, 'the search did not narrow');
  expect(asked.at(-1)).toBe('clear');
  // Typed a letter at a time, only the last words are asked (a moment after the last key).
  expect(asked.length).toBeLessThan(4);
  expect(field.getAttribute('aria-activedescendant')).toBe(el.querySelector('.to-rp-pop [role=option]')!.id);
  await userEvent.keyboard('{Enter}');
  await until(() => told.length === 1);
  expect(told[0]).toMatchObject({ id: 'l2', column: 'company', value: 'c2', before: null, record: { id: 'c2', label: 'Clear Channel' } });
  expect(leadCell(el, 'l2', 1).textContent?.trim()).toBe('Clear Channel');
  expect(document.activeElement).toBe(leadCell(el, 'l2', 1));
  // Escape lets the picker go; nothing told. A refusal puts the record back.
  await userEvent.keyboard('{Enter}');
  await until(() => !!el.querySelector('.to-dt-pick'));
  await userEvent.keyboard('{Escape}');
  await until(() => !el.querySelector('.to-dt-pick'));
  expect(told.length).toBe(1);
  el.addEventListener('rowchange', (e) => e.preventDefault(), { once: true });
  leadCell(el, 'l1', 1).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  await until(() => el.querySelectorAll('.to-rp-pop [role=option]').length === 3);
  await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
  await until(() => told.length === 2);
  expect(told[1]).toMatchObject({ value: 'c3', before: 'c1' });
  await el.updateComplete;
  expect(leadCell(el, 'l1', 1).textContent?.trim()).toBe('Aboard');
});

test('a row’s own editable: a row it says no to offers no field, and says it is read-only', async () => {
  const el = await leads();
  const told: unknown[] = [];
  el.addEventListener('rowchange', (e) => told.push(e));
  expect(leadCell(el, 'l2', 0).getAttribute('aria-readonly')).toBe('true');
  expect(leadCell(el, 'l1', 0).hasAttribute('aria-readonly')).toBe(false);
  leadCell(el, 'l2', 0).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  await el.updateComplete;
  expect(el.querySelector('.to-dt-editor')).toBeNull();
  leadCell(el, 'l2', 2).focus();
  await userEvent.keyboard('{Enter}');
  await el.updateComplete;
  expect(el.querySelector('.to-dt-editor')).toBeNull();
  leadCell(el, 'l1', 2).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  await until(() => !!el.querySelector('.to-dt-editor'));
  expect(told.length).toBe(0);
});

test('a row’s actions: a menu at its end, by a click and by the keys, the action told', async () => {
  const el = await leads({
    rowActions: (r) => [
      { id: 'open', label: 'Open' },
      { id: 'delete', label: `Delete ${r.title.slice(0, 7)}`, danger: true },
    ],
  });
  const told: { id: unknown; action: string }[] = [];
  el.addEventListener('rowaction', (e) => told.push((e as CustomEvent).detail));
  const grid = el.querySelector('[role=grid]')!;
  expect(grid.getAttribute('aria-colcount')).toBe('4');
  const btn = leadCell(el, 'l1', 3).querySelector<HTMLButtonElement>('button')!;
  expect(btn.getAttribute('aria-label')).toBe('Actions for Pilot');
  btn.click();
  const menu = el.querySelector<HTMLElement>('to-menu.to-dt-menu [popover]')!;
  await until(() => menu.matches(':popover-open'), 'the menu never opened');
  const items = [...menu.querySelectorAll<HTMLElement>('[role=menuitem]')];
  expect(items.map((i) => i.textContent?.trim())).toStrictEqual(['Open', 'Delete Pilot']);
  expect(items[1].classList.contains('to-danger')).toBe(true);
  items[1].click();
  expect(told).toMatchObject([{ id: 'l1', action: 'delete' }]);
  // By the keys: the arrows reach the actions' cell, Enter opens its menu, the menu's keys choose.
  leadCell(el, 'l3', 2).focus();
  await userEvent.keyboard('{ArrowRight}');
  await until(() => document.activeElement === leadCell(el, 'l3', 3));
  await userEvent.keyboard('{Enter}');
  await until(() => menu.matches(':popover-open') && menu.contains(document.activeElement), 'Enter did not open the menu');
  await userEvent.keyboard('{Enter}');
  expect(told.at(-1)).toMatchObject({ id: 'l3', action: 'open' });
  // Shift+F10 anywhere in a row opens its menu; Escape closes it.
  leadCell(el, 'l1', 0).focus();
  await userEvent.keyboard('{Shift>}{F10}{/Shift}');
  await until(() => menu.matches(':popover-open'));
  await userEvent.keyboard('{Escape}');
  await until(() => !menu.matches(':popover-open'));
});
