// Forms and pictures worked as a person would: rows added and typed into, things tapped on the picture and typed on,
// drafts that become real when typed into; checked by the text saved (ported from e2e/forms.spec.ts).
import { test, expect } from 'vitest';
import { mount, settle, type, button, press, type Editor } from './helpers.ts';
import { shell, reopen, editorOf, framed, until, shortcut, settleAll } from './helpers-apps.ts';

/** How this browser has been told to show diagrams and forms: the picture (null), the list beside it, or the text. */
function edit(mode: 'form' | 'text' | null) {
  localStorage.setItem('tinyoffice.keep', '1');
  if (mode) localStorage.setItem('tinyoffice.edit', mode);
  else localStorage.removeItem('tinyoffice.edit');
}

/** A diagram app opened with its example, in a mode. */
async function example(app: string, mode: 'form' | 'text' | null = null) {
  edit(mode);
  const m = await mount(app);
  button(m.el, 'Start from an example').click();
  await settle(m.el);
  return m;
}

const box = (root: ParentNode, label: string) => root.querySelector<HTMLInputElement>(`[aria-label="${label}"]`);
/** A thing on the picture, by the start of its name. */
const thing = (el: Editor, name: string | RegExp) => {
  const all = [...el.querySelectorAll<SVGGElement>('.pic > svg g.pick')];
  const found = all.find((g) => (typeof name === 'string' ? g.getAttribute('aria-label')!.startsWith(name) : name.test(g.getAttribute('aria-label')!)));
  if (!found) throw new Error(`no ${name}: ${all.map((g) => g.getAttribute('aria-label')).join(' | ')}`);
  return found;
};
/** A tap on a thing on the picture (a click: no drag starts). */
async function tapThing(el: Editor, name: string | RegExp) {
  thing(el, name).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  await settle(el);
}
const editBox = (el: Editor) => [...el.querySelectorAll<HTMLInputElement>('.pic-edit input')];
async function key(el: Editor, k: string, on: Element | null = document.activeElement) {
  press(on, k);
  await settle(el);
}
/** Pick an icon in the icon dialog, by searching for it. */
async function pickIcon(name: string) {
  let dialog: Element | null = null;
  await until(() => expect((dialog = document.querySelector('sl-dialog.to-icons'))).toBeTruthy());
  const search = dialog!.querySelector<HTMLElement & { value: string }>('sl-input')!;
  search.value = name;
  search.dispatchEvent(new CustomEvent('sl-input', { bubbles: true, composed: true }));
  await until(() => expect(dialog!.querySelector(`button[aria-label="${name}"]`)).toBeTruthy());
  dialog!.querySelector<HTMLElement>(`button[aria-label="${name}"]`)!.click();
  await until(() => expect(document.querySelector('sl-dialog.to-icons')).toBeNull());
}


test('forms: a diagram joined and given pictures on its picture, guests renamed where they sit', async () => {
  // A diagram is worked on its picture (its list is retired): two people joined by a dotted line, one given a picture.
  const org = await example('org');
  expect(org.el.querySelector('to-lines')).toBeNull();
  await tapThing(org.el, 'Cy Lund');
  button(org.el.querySelector('.pic-edit')!, 'Join it to another thing').click();
  await settle(org.el);
  await tapThing(org.el, 'Di Shah');
  expect(org.last()).toContain('~ Cy Lund -- Di Shah');
  expect(org.el.querySelectorAll('.pic > svg line[stroke-dasharray="2 3"]')).toHaveLength(2);
  await tapThing(org.el, 'Ben Okoro');
  button(org.el.querySelector('.pic-edit')!, 'Give it a picture').click();
  await pickIcon('crown');
  await settle(org.el);
  expect(org.last()).toContain(':crown Ben Okoro | Engineering');

  // Seating: each guest at a table is a thing of their own, renamed where they sit. (The place cards are a PDF: e2e.)
  const seats = await example('seating');
  await tapThing(seats.el, /^Ken\b/);
  expect(editBox(seats.el)).toHaveLength(1);
  type(editBox(seats.el)[0], 'Ken Thompson');
  await key(seats.el, 'Escape', editBox(seats.el)[0]);
  expect(seats.last()).toContain('Table 2: Linus, Barbara, Ken Thompson, Dennis, Edsger');
});

test('a page is edited in the page: type into it, add with the bar, Enter for another', async () => {
  const { el } = await example('split');
  const f = framed(el);
  // What is written in the text is there in the page, to type into.
  expect(f.data()!.v).toContainEqual([3, 0, 'Sam', 'Who']);
  f.post({ lf: 'focus', r: 3 });
  f.post({ lf: 'set', r: 3, f: 0, v: 'Samantha' });
  await settle(el);
  // Once the typing pauses the page is drawn afresh, sums and all.
  await until(async () => {
    await settle(el);
    expect([...f.page().querySelectorAll('.pay')].at(-1)!.textContent).toContain('Samantha');
  }, 2500);
  // The bar adds a row (after the row last typed in: Samantha's), with its fields' names to type over.
  f.post({ lf: 'add', k: f.data()!.k.findIndex((k) => k.name === 'Payment') });
  await settle(el);
  expect(f.data()!.v).toContainEqual([4, 0, 'Who', 'Who']);
  expect(f.data()!.f).toBe('4,');
  expect(f.page().querySelectorAll('tbody tr')).toHaveLength(5);
  f.post({ lf: 'set', r: 4, f: 0, v: 'Grace' });
  await settle(el);
  f.post({ lf: 'done' });
  await settle(el);
  expect(f.page().querySelector('tbody')!.textContent).toContain('Grace');
  // Remove takes the row being typed in away.
  f.post({ lf: 'focus', r: 4 });
  f.post({ lf: 'remove' });
  await settle(el);
  expect(f.page().querySelectorAll('tbody tr')).toHaveLength(4);
  // Enter in a box: another row like it.
  f.post({ lf: 'enter', r: 4 });
  await settle(el);
  expect(f.page().querySelectorAll('tbody tr')).toHaveLength(5);
});

test('words are typed on the picture itself: a shape, and a line of a printed sheet', async () => {
  const { el, last } = await example('org');
  // A tap opens the box; the role is in the same box, a Tab away.
  await tapThing(el, 'Ben Okoro');
  expect(editBox(el)[0].value).toBe('Ben Okoro');
  type(editBox(el)[0], 'Ben Okoro-Smith');
  await settle(el);
  expect(el.querySelector('.pic > svg')!.textContent).toContain('Ben Okoro-Smith');
  expect(editBox(el)[1].value).toBe('Engineering');
  type(editBox(el)[1], 'Platform engineering');
  await settle(el);
  expect(el.querySelector('.pic > svg')!.textContent).toContain('Platform engineering');
  await key(el, 'Escape', editBox(el)[1]);
  expect(editBox(el)).toHaveLength(0);
  // What is saved is the line, name and role.
  expect(last()).toContain('Ben Okoro-Smith | Platform engineering');
  await tapThing(el, 'Eve Marsh');
  expect(editBox(el)[0].value).toBe('Eve Marsh');

});

test('the picture is the editor: no list beside a picture of shapes', async () => {
  // Picture mode: the default; no list beside it.
  const org = await example('org');
  expect(org.el.querySelector('to-lines')).toBeNull();
  expect(org.el.querySelectorAll('.pic > svg g.pick:not(.line)')).toHaveLength(6);
  expect(() => button(org.el, 'List')).toThrow();
});

test('adding on the picture: a draft that becomes real when typed into, and goes if not', async () => {
  // (Which thing: the second drawn, or by name where a lane's name or a date is a thing too.)
  for (const [app, words, written, which] of [
    ['mind', 'Idea', /\n    - Fresh thing\n/, null],
    ['net', 'To', /~ API -> Fresh thing/, null],
    ['lanes', 'What they do', /Customer: Fresh thing/, /^Places order/],
    ['timeline', 'What happened', /1843: Fresh thing/, /^1843 \| Lovelace/],
  ] as const) {
    const { el } = await example(app);
    const doc = () => el.value;
    const pick = async () => {
      if (which) await tapThing(el, which);
      else {
        el.querySelectorAll('.pic > svg g.pick:not(.line)')[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await settle(el);
      }
    };
    const before = doc();
    await pick();
    await key(el, 'Enter', editBox(el)[0]);
    // The draft is drawn and its box is open, but nothing is written yet.
    await until(() => expect(document.activeElement, app).toBe(editBox(el)[0]));
    expect(editBox(el)[0].getAttribute('aria-label')).toMatch(new RegExp(`^${words}, row`));
    expect(doc()).toBe(before);
    // Abandoned, nothing changes; typed into, it is real.
    await key(el, 'Escape', editBox(el)[0]);
    expect(el.querySelector('.pic-edit')).toBeNull();
    expect(doc()).toBe(before);
    await pick();
    await key(el, 'Enter', editBox(el)[0]);
    type(editBox(el)[0], 'Fresh thing');
    await key(el, 'Enter', editBox(el)[0]);
    expect(doc(), app).toMatch(written);
    // (Enter opened the next draft; let it go.)
    await key(el, 'Escape', editBox(el)[0]);
    expect(el.querySelector('.pic-edit')).toBeNull();
    // A tap on empty space while typing only closes the box: the words lose the focus, and nothing is added.
    const after = doc();
    [...el.querySelectorAll<SVGGElement>('.pic > svg g.pick:not(.line)')].find((g) => /\S/.test(g.textContent ?? ''))!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(el);
    expect(el.querySelectorAll('.pic-edit')).toHaveLength(1);
    editBox(el)[0].dispatchEvent(new FocusEvent('blur'));
    el.querySelector('.pic')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(el);
    expect(el.querySelector('.pic-edit')).toBeNull();
    expect(doc()).toBe(after);
  }
});

