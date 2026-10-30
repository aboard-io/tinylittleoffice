// The Pinboard's editor in a real browser: a tool and a tap pin a note and type its words, a drag moves it as cells on
// its X and Y, a frame carries what it holds, the arrow tool joins two things, the pen draws, the context bar colors,
// connects, duplicates, brings to front and deletes, cut, copy and paste keep what is in hand, the keys nudge and step out, the board pans and zooms and fits,
// a picture pasted or chosen goes to the host and is pinned, read-only only moves and zooms, and two editors sharing
// one document through docops and applyRemote end with one board.
import { expect, test } from 'vitest';
import '../../../styles.css';
import '../editor.ts';
import type { ToPinboardEditor } from '../editor.ts';
import { until, tick } from '../../../../test/browser/helpers.ts';
import { host } from '../../../kit/core/host.ts';
import { picker } from '../../../kit/draw/image-picture.ts';
import { readBoard } from '../model.ts';
import { parse, type Op } from '../../../doc/index.ts';

const BOARD = [
  'Id | Kind | X | Y | W | H | Color | Words',
  '--- | --- | --- | --- | --- | --- | --- | ---',
  'f1 | frame | 0 | 0 | 600 | 400 | blue | Act one',
  'n1 | note | 40 | 60 | 200 | 160 |  | Jeff watches',
  'n2 | note | 300 | 60 | 200 | 160 | pink | Lisa',
  'a1 | arrow | n1 | n2 |  |  |  | sees',
  'n3 | note | 700 | 60 | 200 | 160 |  | Outside',
  '',
].join('\n');

async function editor(value = BOARD, readOnly = false, into?: HTMLElement): Promise<{ el: ToPinboardEditor; last: () => string | undefined; changes: string[]; ops: Op[][] }> {
  if (!into) {
    document.body.innerHTML = '';
    into = document.createElement('main');
    into.className = 'to-main';
    document.body.append(into);
  }
  into.style.setProperty('--to-col-h', '760px');
  const el = document.createElement('to-pinboard-editor') as ToPinboardEditor;
  el.value = value;
  el.readOnly = readOnly;
  const changes: string[] = [];
  const ops: Op[][] = [];
  el.addEventListener('docchange', (e) => changes.push((e as CustomEvent<string>).detail));
  el.addEventListener('docops', (e) => ops.push((e as CustomEvent<{ ops: Op[] }>).detail.ops));
  into.append(el);
  await el.updateComplete;
  await until(() => el.size[0] > 0);
  await el.updateComplete;
  return { el, changes, ops, last: () => changes.at(-1) };
}
const button = (el: HTMLElement, label: string) => el.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const canvas = (el: HTMLElement) => el.querySelector<SVGSVGElement>('svg.pin-canvas')!;
const wrap = (el: HTMLElement) => el.querySelector<HTMLElement>('.pin-wrap')!;
/** A point of the board on the screen, as the editor shows it now. */
const screenOf = (el: ToPinboardEditor, x: number, y: number): [number, number] => {
  const b = canvas(el).getBoundingClientRect();
  return [b.left + el.ox + x * el.zoom, b.top + el.oy + y * el.zoom];
};
/** A pointer put down at a point of the board, moved along `path`, and lifted: on whatever is drawn there, as a real pointer lands. */
async function press(el: ToPinboardEditor, x: number, y: number, path: [number, number][] = [], more: PointerEventInit = {}) {
  const svg = canvas(el);
  const at = (bx: number, by: number) => {
    const [cx, cy] = screenOf(el, bx, by);
    return { clientX: cx, clientY: cy, button: 0, buttons: 1, pointerId: 1, pointerType: 'mouse', bubbles: true, isPrimary: true, ...more };
  };
  const down = at(x, y);
  const under = document.elementFromPoint(down.clientX, down.clientY);
  (under && svg.contains(under) ? under : svg).dispatchEvent(new PointerEvent('pointerdown', down));
  // Where each step is on the screen is reckoned from where the board was when the press began.
  const [ox, oy, z] = [el.ox, el.oy, el.zoom];
  const b = svg.getBoundingClientRect();
  const fixed = (bx: number, by: number) => ({ ...at(bx, by), clientX: b.left + ox + bx * z, clientY: b.top + oy + by * z });
  for (const p of path) {
    svg.dispatchEvent(new PointerEvent('pointermove', fixed(...p)));
    await el.updateComplete;
  }
  const end = path.length ? path[path.length - 1] : ([x, y] as [number, number]);
  svg.dispatchEvent(new PointerEvent('pointerup', { ...fixed(...end), buttons: 0 }));
  await el.updateComplete;
  await tick();
}
const key = async (el: ToPinboardEditor, k: string, more: KeyboardEventInit = {}) => {
  wrap(el).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...more }));
  await el.updateComplete;
  await tick();
};
const ctx = (el: HTMLElement) => el.querySelector<HTMLElement>('.pin-context .to-context')!;
const ctxButton = (el: HTMLElement, label: string) => ctx(el).querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
const words = (el: HTMLElement) => el.querySelector<HTMLElement>('.pin-words .tx')!;
const typeIn = async (el: ToPinboardEditor, text: string) => {
  for (const ch of text) {
    words(el).dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true, composed: true }));
    await el.updateComplete;
    await tick();
  }
};
const enter = async (el: ToPinboardEditor) => {
  words(el).dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertParagraph', bubbles: true, cancelable: true, composed: true }));
  await el.updateComplete;
  await tick();
};
const board = (text: string | undefined) => readBoard(parse(text ?? ''));
async function pick(el: ToPinboardEditor, words: string) {
  el.querySelector<HTMLElement>('to-insert button')!.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  const items = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')];
  const item = items.find((x) => x.textContent!.includes(words));
  if (!item) throw new Error(`no item ${words} among ${items.map((x) => x.textContent!.trim()).join(' | ')}`);
  item.click();
  await el.updateComplete;
  await tick();
}

test('it opens fitted to everything; the Note tool and a tap pin a note whose words are typed on it; Escape steps out', async () => {
  const { el, last } = await editor();
  // Everything in view, no larger than its own size.
  expect(el.zoom).toBeLessThanOrEqual(1);
  const [l] = screenOf(el, 0, 0);
  const [r] = screenOf(el, 900, 0);
  const b = canvas(el).getBoundingClientRect();
  expect(l).toBeGreaterThanOrEqual(b.left);
  expect(r).toBeLessThanOrEqual(b.right);
  expect(el.querySelectorAll('svg.pin-canvas [data-id]')).toHaveLength(5);
  button(el, 'Note').click();
  await el.updateComplete;
  expect(button(el, 'Note').getAttribute('aria-pressed')).toBe('true');
  await press(el, 750, 300);
  await until(() => !el.querySelector<HTMLElement>('.pin-words')!.hidden);
  const id = el.chosen[0];
  expect(board(last()).byId.get(id)).toMatchObject({ k: 'note', x: 650, y: 220, w: 200, h: 160 });
  await typeIn(el, 'Thorwald');
  await enter(el);
  expect(board(last()).byId.get(id)!.words).toBe('Thorwald');
  expect(el.querySelector('.pin-words')!.hasAttribute('hidden')).toBe(true);
  expect(el.tool).toBe('select');
  // Escape: what is in hand let go, then nothing to step out of.
  await key(el, 'Escape');
  expect(el.chosen).toEqual([]);
});

test('a drag moves a note as cells on its X and Y; a frame carries what it holds; arrows nudge; undo takes it back', async () => {
  const { el, last, ops } = await editor();
  await press(el, 100, 100, [
    [120, 110],
    [140, 130],
  ]);
  expect(el.chosen).toEqual(['n1']);
  expect(ops.at(-1)).toEqual([{ op: 'cells', at: 0, r: 1, c: 2, values: [['80', '90']] }]);
  // The arrow follows: it is drawn from n1's new place, and its row is untouched.
  expect(last()).toContain('a1 | arrow | n1 | n2 |');
  await key(el, 'ArrowRight');
  await key(el, 'ArrowDown', { shiftKey: true });
  expect(board(last()).byId.get('n1')).toMatchObject({ x: 88, y: 130 });
  // The frame, by its title strip: the two notes inside it go with it, the one outside stays.
  await press(el, 300, 15, [[300, 65]]);
  expect(el.chosen).toEqual(['f1']);
  const v = board(last());
  expect(v.byId.get('f1')!.y).toBe(50);
  expect(v.byId.get('n2')!.y).toBe(110);
  expect(v.byId.get('n3')!.y).toBe(60);
  el.dispatchEvent(new CustomEvent('docundo'));
  await el.updateComplete;
  expect(board(el.value).byId.get('f1')!.y).toBe(0);
});

test('the handle resizes; double-click types a frame’s title; the context bar colors, connects, toggles an arrowhead, duplicates, brings to front and deletes', async () => {
  const { el, last } = await editor();
  await press(el, 100, 100);
  await until(() => !!el.querySelector('.pin-handle'));
  await press(el, 240, 220, [[280, 260]]);
  expect(board(last()).byId.get('n1')).toMatchObject({ w: 240, h: 200 });
  // The context bar under it: its colors (a note's are papers, yellow its own).
  await until(() => !!ctxButton(el, 'Green'));
  ctxButton(el, 'Green')!.click();
  await el.updateComplete;
  expect(board(last()).byId.get('n1')!.color).toBe('green');
  // Shift adds n3; Connect draws an arrow from the first to the second.
  await press(el, 750, 100, [], { shiftKey: true });
  expect(el.chosen).toEqual(['n1', 'n3']);
  await until(() => !!ctxButton(el, 'Connect'));
  ctxButton(el, 'Connect')!.click();
  await el.updateComplete;
  const arrow = board(last()).items.at(-1)!;
  expect(arrow).toMatchObject({ k: 'arrow', from: 'n1', to: 'n3' });
  expect(el.chosen).toEqual([arrow.id]);
  await until(() => !!ctxButton(el, 'Arrowhead'));
  ctxButton(el, 'Arrowhead')!.click();
  await el.updateComplete;
  expect(board(last()).byId.get(arrow.id)!.k).toBe('line');
  await until(() => !!ctxButton(el, 'Black'));
  ctxButton(el, 'Blue')!.click();
  await el.updateComplete;
  ctxButton(el, 'Black')!.click();
  await el.updateComplete;
  expect(board(last()).byId.get(arrow.id)!.color).toBe('');
  // Each of the other colors, on n2.
  await press(el, 350, 100);
  for (const c of ['Yellow', 'Orange', 'Pink', 'Purple']) {
    await until(() => !!ctxButton(el, c));
    ctxButton(el, c)!.click();
    await el.updateComplete;
    expect(board(last()).byId.get('n2')!.color).toBe(c.toLowerCase());
  }
  // Bring to front, Duplicate (Mod+D too), Delete (with its arrows).
  ctxButton(el, 'Bring to front')!.click();
  await el.updateComplete;
  expect(board(last()).items.at(-1)!.id).toBe('n2');
  await until(() => !!ctxButton(el, 'Duplicate'));
  ctxButton(el, 'Duplicate')!.click();
  await el.updateComplete;
  const copy = el.chosen[0];
  expect(board(last()).byId.get(copy)).toMatchObject({ k: 'note', x: 324, y: 84, words: 'Lisa' });
  await key(el, 'd', { ctrlKey: true });
  expect(board(last()).items.filter((i) => i.words === 'Lisa')).toHaveLength(3);
  await until(() => !!ctxButton(el, 'Delete'));
  ctxButton(el, 'Delete')!.click();
  await el.updateComplete;
  expect(board(last()).items.filter((i) => i.words === 'Lisa')).toHaveLength(2);
  // (Where n2 alone is: its copies lie over its middle.)
  await press(el, 310, 70);
  expect(el.chosen).toEqual(['n2']);
  await key(el, 'Delete');
  expect(board(last()).byId.has('n2')).toBe(false);
  expect(board(last()).byId.has('a1')).toBe(false);
  // Edit text from the bar, and a double click, type a frame's title on it.
  await press(el, 300, 15);
  await until(() => !!ctxButton(el, 'Edit text'));
  ctxButton(el, 'Edit text')!.click();
  await until(() => !el.querySelector<HTMLElement>('.pin-words')!.hidden);
  await typeIn(el, 'Act 1');
  await enter(el);
  expect(board(last()).byId.get('f1')!.words).toBe('Act 1');
  const [cx, cy] = screenOf(el, 750, 100);
  document.elementFromPoint(cx, cy)!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: cx, clientY: cy }));
  await until(() => !el.querySelector<HTMLElement>('.pin-words')!.hidden);
  await typeIn(el, 'x');
  // Escape puts the words back as they were.
  words(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  await el.updateComplete;
  expect(board(last()).byId.get('n3')!.words).toBe('Outside');
  // Mod+A takes everything.
  await key(el, 'a', { ctrlKey: true });
  expect(el.chosen.length).toBe(board(last()).items.length);
});

test('cut, copy and paste: what is in hand kept in the page, the clipboard given its words; a frame takes what it holds and the arrows between', async () => {
  const { el, last } = await editor();
  const writes: string[] = [];
  const was = navigator.clipboard?.writeText;
  if (navigator.clipboard) navigator.clipboard.writeText = async (s: string) => void writes.push(s);
  try {
    await press(el, 100, 100);
    await until(() => !!ctxButton(el, 'Copy'));
    ctxButton(el, 'Copy')!.click();
    await el.updateComplete;
    expect(el.clip!.text).toBe('Jeff watches');
    if (navigator.clipboard) expect(writes).toEqual(['Jeff watches']);
    // A paste of those words, the board in focus: the note again, a little along.
    wrap(el).focus();
    const dt = new DataTransfer();
    dt.setData('text/plain', 'Jeff watches');
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    await el.updateComplete;
    expect(
      board(last())
        .items.filter((i) => i.words === 'Jeff watches')
        .map((i) => [i.x, i.y]),
    ).toEqual([
      [40, 60],
      [64, 84],
    ]);
    // Mod+V with no paste after it (Safari, to a canvas): again, further along.
    await key(el, 'v', { ctrlKey: true });
    await until(() => board(last()).items.filter((i) => i.words === 'Jeff watches').length === 3);
    expect(board(last()).items.at(-1)).toMatchObject({ x: 88, y: 108 });
    // Cut the frame: it goes with all it holds and the arrow; pasted, it is back where it was, joined as before.
    await press(el, 300, 15);
    expect(el.chosen).toEqual(['f1']);
    ctxButton(el, 'Cut')!.click();
    await el.updateComplete;
    expect(board(last()).items.map((i) => i.id)).toEqual(['n3']);
    await press(el, 750, 100);
    await until(() => !!ctxButton(el, 'Paste'));
    ctxButton(el, 'Paste')!.click();
    await el.updateComplete;
    const after = board(last());
    expect(after.items.find((i) => i.k === 'frame')).toMatchObject({ x: 0, y: 0, words: 'Act one' });
    const arrow = after.items.find((i) => i.k === 'arrow')!;
    expect([after.byId.get(arrow.from!)!.words, after.byId.get(arrow.to!)!.words]).toEqual(['Jeff watches', 'Lisa']);
    expect(after.items).toHaveLength(7);
    expect(el.chosen).toHaveLength(6);
  } finally {
    if (navigator.clipboard && was) navigator.clipboard.writeText = was;
  }
});

test('Insert ▾ puts a note, words and a frame in the middle; the frame and text tools place one; the arrow joins two; the pen draws', async () => {
  const { el, last } = await editor();
  await pick(el, 'Note');
  await enter(el);
  expect(board(last()).items.at(-1)!.k).toBe('note');
  await pick(el, 'Frame');
  await enter(el);
  expect(board(last()).items.at(-1)!.k).toBe('frame');
  await pick(el, 'Text');
  await typeIn(el, 'Why?');
  await enter(el);
  expect(board(last()).items.at(-1)).toMatchObject({ k: 'text', words: 'Why?' });
  // Words with nothing typed in them go when they are done with.
  button(el, 'Text').click();
  await el.updateComplete;
  await press(el, 100, 500);
  const n = board(last()).items.length;
  await enter(el);
  expect(board(last()).items.length).toBe(n - 1);
  // A frame as large as the drag.
  button(el, 'Frame').click();
  await el.updateComplete;
  await press(el, 0, 600, [[400, 900]]);
  await enter(el);
  expect(board(last()).items.at(-1)).toMatchObject({ k: 'frame', x: 0, y: 600, w: 400, h: 300 });
  // The arrow: pressed on one note, let go on another.
  button(el, 'Arrow').click();
  await el.updateComplete;
  await press(el, 750, 100, [[100, 100]]);
  expect(board(last()).items.at(-1)).toMatchObject({ k: 'arrow', from: 'n3', to: 'n1' });
  // The pen: a stroke while it is held.
  button(el, 'Pen').click();
  await el.updateComplete;
  await press(el, 650, 450, [
    [700, 500],
    [750, 450],
    [800, 520],
  ]);
  expect(board(last()).items.at(-1)).toMatchObject({ k: 'pen', x: 650, y: 450, w: 150, h: 70 });
  button(el, 'Select').click();
  await el.updateComplete;
  expect(el.tool).toBe('select');
});

test('the board pans by a drag and the wheel, zooms by the buttons and Ctrl and the wheel about the pointer, and fits everything; Shift and a drag choose what is inside', async () => {
  const { el } = await editor();
  const [ox, oy, z] = [el.ox, el.oy, el.zoom];
  await press(el, 650, 300, [[600, 250]]);
  expect(el.ox).toBeCloseTo(ox - 50 * z, 0);
  expect(el.oy).toBeCloseTo(oy - 50 * z, 0);
  canvas(el).dispatchEvent(new WheelEvent('wheel', { deltaX: 10, deltaY: 20, bubbles: true, cancelable: true }));
  await el.updateComplete;
  expect(el.oy).toBeCloseTo(oy - 50 * z - 20, 0);
  button(el, 'Zoom in').click();
  await el.updateComplete;
  expect(el.zoom).toBeCloseTo(z * 1.25);
  button(el, 'Zoom out').click();
  await el.updateComplete;
  expect(el.zoom).toBeCloseTo(z);
  // Ctrl and the wheel: the point under the pointer stays under it.
  const [px, py] = screenOf(el, 100, 100);
  canvas(el).dispatchEvent(new WheelEvent('wheel', { deltaY: -50, ctrlKey: true, clientX: px, clientY: py, bubbles: true, cancelable: true }));
  await el.updateComplete;
  expect(el.zoom).toBeGreaterThan(z);
  const [qx, qy] = screenOf(el, 100, 100);
  expect(qx).toBeCloseTo(px, 0);
  expect(qy).toBeCloseTo(py, 0);
  button(el, 'Fit everything').click();
  await el.updateComplete;
  const [l] = screenOf(el, 0, 0);
  expect(l).toBeGreaterThanOrEqual(canvas(el).getBoundingClientRect().left);
  // Shift and a drag on the board: a box, and what it holds wholly is in hand.
  await press(el, 650, -40, [[920, 260]], { shiftKey: true });
  expect(el.chosen).toEqual(['n3']);
  // A tap on the board lets it go.
  await press(el, 650, 300);
  expect(el.chosen).toEqual([]);
});

test('read-only: the board moves and zooms, nothing is edited, no bar but the zoom', async () => {
  const { el, changes } = await editor(BOARD, true);
  expect(el.querySelector('to-bar')).toBeNull();
  expect(button(el, 'Zoom in')).not.toBeNull();
  const ox = el.ox;
  await press(el, 100, 100, [[150, 100]]);
  expect(el.ox).toBeGreaterThan(ox);
  expect(el.chosen).toEqual([]);
  await key(el, 'Delete');
  expect(changes).toEqual([]);
});

const PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
const png = (name: string) => new File([PNG as BlobPart], name, { type: 'image/png' });

test('where the host keeps pictures, Insert ▾ Picture… and a pasted picture are put to it and pinned, drawn from its address; a double click describes one; where it keeps none, a card says so', async () => {
  const kept = new Map<string, Blob>();
  Object.assign(host, {
    images: {
      put: async (file: Blob) => (kept.set(`test:${kept.size + 1}`, file), { ref: `test:${kept.size}`, w: 1280, h: 720 }),
      url: (ref: string) => (kept.has(ref) ? URL.createObjectURL(kept.get(ref)!) : ''),
    },
  });
  const was = picker.choose;
  picker.choose = async () => png('rear-window.png');
  try {
    const { el, last } = await editor();
    await pick(el, 'Picture…');
    await until(() => !!last()?.includes('```image'));
    const pic = board(last()).items.at(-1)!;
    expect(pic).toMatchObject({ k: 'picture', w: 320, h: 180, image: { ref: 'test:1', alt: 'rear window', w: 1280, h: 720 } });
    expect(last()).toContain(`\`\`\`image {#${pic.id} alt="rear window" w=1280 h=720}\ntest:1\n\`\`\``);
    await until(() => !!el.querySelector(`[data-id="${pic.id}"] image`));
    expect(el.querySelector(`[data-id="${pic.id}"] image`)!.getAttribute('href')).toMatch(/^blob:/);
    // Describe picture: its words typed under it.
    await until(() => !!ctxButton(el, 'Describe picture'));
    ctxButton(el, 'Describe picture')!.click();
    await until(() => !el.querySelector<HTMLElement>('.pin-words')!.hidden);
    await typeIn(el, 'The courtyard');
    await enter(el);
    expect(last()).toContain('alt="The courtyard"');
    // Pasted while the board has the focus: put to the host too.
    wrap(el).focus();
    const dt = new DataTransfer();
    dt.items.add(png('courtyard.png'));
    wrap(el).dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    await until(() => !!last()?.includes('test:2'));
    // Words pasted are a note.
    const words = new DataTransfer();
    words.setData('text/plain', 'The neighbor’s dog');
    wrap(el).dispatchEvent(new ClipboardEvent('paste', { clipboardData: words, bubbles: true, cancelable: true }));
    await el.updateComplete;
    expect(board(last()).items.at(-1)).toMatchObject({ k: 'note', words: 'The neighbor’s dog' });
  } finally {
    picker.choose = was;
    delete (host as { images?: unknown }).images;
  }
  // The site keeps none: a picture is its words on a card, and Insert ▾ offers none.
  const { el } = await editor(`${BOARD.replace('n3 | note', 'p1 | picture | 700 | 260 | 320 | 180 |  |\nn3 | note')}\n\`\`\`image {#p1 alt="The courtyard"}\ntest:9\n\`\`\`\n`);
  expect(el.querySelector('[data-id="p1"] image')).toBeNull();
  expect(el.querySelector('[data-id="p1"]')!.textContent).toContain('The courtyard');
  el.querySelector<HTMLElement>('to-insert button')!.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  expect(document.querySelector('[popover]:popover-open')!.textContent).not.toContain('Picture');
});

test('two editors sharing one document, each one’s ops handed to the other, end with one board', async () => {
  document.body.innerHTML = '';
  const row = document.createElement('div');
  row.style.display = 'flex';
  document.body.append(row);
  const [ma, mb] = [document.createElement('main'), document.createElement('main')];
  for (const m of [ma, mb]) ((m.className = 'to-main'), (m.style.cssText = 'width: 50vw; max-width: 50vw; min-width: 0; padding: 0'), row.append(m));
  const a = await editor(BOARD, false, ma);
  const b = await editor(BOARD, false, mb);
  // Each brought into view at the width it ended with, beside the other.
  for (const x of [a, b]) {
    await until(() => x.el.size[0] === x.el.querySelector('svg.pin-canvas')!.getBoundingClientRect().width);
    x.el.fit(1);
    await x.el.updateComplete;
  }
  a.el.addEventListener('docops', (e) => b.el.applyRemote((e as CustomEvent<{ ops: Op[] }>).detail.ops));
  b.el.addEventListener('docops', (e) => a.el.applyRemote((e as CustomEvent<{ ops: Op[] }>).detail.ops));
  // B holds n3 while A adds a note and moves n1: B's hand stays on n3.
  await press(b.el, 750, 100);
  expect(b.el.chosen).toEqual(['n3']);
  await press(a.el, 100, 100, [[110, 120]]);
  await pick(a.el, 'Note');
  await typeIn(a.el, 'Hi');
  await enter(a.el);
  expect(b.el.chosen).toEqual(['n3']);
  await key(b.el, 'ArrowLeft');
  ctxButton(b.el, 'Orange')!.click();
  await b.el.updateComplete;
  expect(a.el.value).toBe(b.el.value);
  const v = board(a.el.value);
  expect(v.byId.get('n1')).toMatchObject({ x: 50, y: 80 });
  expect(v.byId.get('n3')).toMatchObject({ x: 692, color: 'orange' });
  expect(v.items.at(-1)).toMatchObject({ k: 'note', words: 'Hi' });
  // An undo takes back only one's own.
  b.el.dispatchEvent(new CustomEvent('docundo'));
  await b.el.updateComplete;
  expect(board(b.el.value).byId.get('n3')!.color).toBe('');
  expect(board(b.el.value).items.at(-1)!.words).toBe('Hi');
  expect(a.el.value).toBe(b.el.value);
});

test('a pinboard goes inside another document: Insert ▾ of the Word Processor, the Outliner and the Presentation Builder makes one in the dialog, drawn where it sits', async () => {
  const { registered, run } = await import('../../../kit/core/commands.ts');
  await import('../../write/editor.ts');
  await import('../../outline/commands.ts');
  await import('../../deck/commands.ts');
  document.body.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'to-main';
  document.body.append(main);
  const w = document.createElement('to-write-editor') as HTMLElement & { value: string; updateComplete: Promise<unknown>; focusFirst(): Promise<void> };
  w.value = 'Notes on the film\n';
  const changes: string[] = [];
  w.addEventListener('docchange', (e) => changes.push((e as CustomEvent<string>).detail));
  main.append(w);
  await w.updateComplete;
  await w.focusFirst();
  void run(
    registered().find((c) => c.id === 'write.insert.app.pinboard')!,
    w,
  );
  // The dialog holds a pinboard's editor over a blank board; a note pinned there, and Done.
  await until(() => !!document.querySelector('to-doc-dialog to-pinboard-editor'));
  const board = document.querySelector('to-doc-dialog to-pinboard-editor') as ToPinboardEditor;
  await until(() => board.size[0] > 0);
  board.insert('note');
  await board.updateComplete;
  await enter(board);
  document.querySelector<HTMLButtonElement>('to-doc-dialog .to-doc-dialog-done')!.click();
  await until(() => !!changes.at(-1)?.includes('```pinboard'));
  expect(changes.at(-1)).toMatch(/```pinboard\nId \| Kind \| X \| Y \| W \| H \| Color \| Words\n--- \| --- \| --- \| --- \| --- \| --- \| --- \| ---\nn[a-z0-9]{4} \| note \|/);
  // The Outliner and the Presentation Builder offer one too, from the same registry.
  for (const id of ['outline.insert.app.pinboard', 'deck.insert.app.pinboard']) {
    const asked: string[] = [];
    await run(
      registered().find((c) => c.id === id)!,
      { insertApp: (app: string) => void asked.push(app) } as never,
    );
    expect(asked, id).toEqual(['pinboard']);
  }
});
