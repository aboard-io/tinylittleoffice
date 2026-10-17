// The caret stays at the middle while you type (Paul, 2026-10-12: "We want to put enough padding at the end of a
// document we are editing that the cursor stays roughly in the middle of the screen unless we scroll"). An edited
// column has half of what can be seen of it as room below its last line (page.css, --to-col-h), and an edit that leaves
// the caret below the middle scrolls it there (kit/ui/scroll.ts revealCaret's `middle`); a click, an arrow key or the
// person's own scroll never recenters.
import { test, expect, afterEach } from 'vitest';
import { cdp, page, userEvent } from 'vitest/browser';
import { mount, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/core/codec.ts';
import { reveal } from '../../src/kit/ui/scroll.ts';
import type { ToText } from '../../src/kit/text/text.ts';

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
const settled = async () => {
  await frame();
  await until(() => !document.querySelector('to-chrome[gliding]') && document.getAnimations().every((a) => a.playState !== 'running'));
  await frame();
};
const SOME = `---\ntitle: Typed\n---\n${Array.from({ length: 6 }, (_, i) => `Paragraph ${i + 1}.`).join('\n\n')}\n`;
const LONG = `---\ntitle: Long\n---\n${Array.from({ length: 60 }, (_, i) => `Paragraph ${i + 1}, long enough to take a line or two of the page.`).join('\n\n')}\n`;

async function coarse(on: boolean) {
  await cdp().send('Emulation.setTouchEmulationEnabled', on ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
}
const REAL = window.visualViewport!;
let faked = false;
/** iOS's keyboard: the layout viewport stays and the visual one shrinks, with a `resize`. */
function fakeViewport() {
  faked = true;
  const vv = Object.assign(new EventTarget(), { offsetTop: 0, offsetLeft: 0, pageTop: 0, pageLeft: 0, width: REAL.width, height: REAL.height, scale: 1 });
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv });
  return vv;
}
afterEach(async () => {
  await coarse(false);
  if (faked) Object.defineProperty(window, 'visualViewport', { configurable: true, value: REAL });
  faked = false;
  history.replaceState(null, '', location.pathname);
  await page.viewport(414, 896);
});

const main = () => document.querySelector<HTMLElement>('.to-main')!;
/** The middle of what can be seen of the column: its box inside the bar (which sits in the column's padding). */
const middle = () => {
  const m = main();
  const r = m.getBoundingClientRect();
  return r.top + m.clientTop + m.clientHeight / 2;
};
const caretY = () => {
  const r = document.getSelection()!.getRangeAt(0).getBoundingClientRect();
  return (r.top + r.bottom) / 2;
};
const line = () => parseFloat(getComputedStyle(document.querySelector('to-write-editor to-text p')!).lineHeight);

async function write(doc: string) {
  const shell = await mount(`#/v1/write/${encodeDoc(doc)}`);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx') && !!shell.querySelector('.to-editor to-bar button'));
  const text = shell.querySelector<ToText>('to-write-editor to-text')!;
  await text.updateComplete;
  await settled();
  return text;
}

test('reveal with block "middle" brings a target below the middle to the middle, and leaves one above it where it is', async () => {
  document.body.innerHTML = '';
  const box = document.body.appendChild(document.createElement('div'));
  box.style.cssText = 'position:fixed;top:0;left:0;width:200px;height:400px;overflow-y:auto';
  box.innerHTML =
    '<div style="height:2000px;position:relative"><i style="position:absolute;top:300px;height:20px;width:10px"></i><b style="position:absolute;top:100px;height:20px;width:10px;display:block"></b></div>';
  const low = box.querySelector('i')!;
  const high = box.querySelector('b')!;
  reveal(low, { block: 'middle' });
  expect(box.scrollTop).toBeCloseTo(110, 0);
  const at = low.getBoundingClientRect();
  expect((at.top + at.bottom) / 2).toBeCloseTo(200, 0);
  box.scrollTop = 0;
  reveal(high, { block: 'middle' });
  expect(box.scrollTop).toBe(0);
  // Above the middle and out of sight: kept visible, as little as it takes.
  box.scrollTop = 500;
  reveal(high, { block: 'middle' });
  expect(box.scrollTop).toBeCloseTo(100, 0);
  box.remove();
});

test('a box placed over a column’s foot that says data-covers is not room: reveal stops above it while it is out of the flow, and counts it as content while it is in it', async () => {
  document.body.innerHTML = '';
  const column = document.body.appendChild(document.createElement('div'));
  column.style.cssText = 'position:fixed;top:0;left:0;width:200px;height:400px';
  column.innerHTML =
    '<div class="to-main" style="height:400px;overflow-y:auto"><div style="height:2000px;position:relative"><i style="position:absolute;top:1500px;height:20px;width:10px"></i></div><nav data-covers style="position:absolute;left:0;right:0;bottom:0;height:100px"></nav></div>';
  const main = column.querySelector<HTMLElement>('.to-main')!;
  const target = column.querySelector('i')!;
  const cover = column.querySelector('nav')!;
  reveal(target);
  // The target's foot stands just above the cover's top, not at the scroller's foot a hundred lower.
  const coverTop = cover.getBoundingClientRect().top;
  expect(target.getBoundingClientRect().bottom).toBeLessThanOrEqual(coverTop);
  expect(target.getBoundingClientRect().bottom).toBeGreaterThan(coverTop - 20);
  // In the flow (a short page, a desktop), the same box is content: the target is brought to the scroller's own foot.
  cover.style.position = 'static';
  main.scrollTop = 0;
  reveal(target);
  const foot = main.getBoundingClientRect().bottom;
  expect(target.getBoundingClientRect().bottom).toBeLessThanOrEqual(foot);
  expect(target.getBoundingClientRect().bottom).toBeGreaterThan(foot - 20);
  column.remove();
});

test('390×600: typed to the end, the caret stays within a line of the column’s middle; the person’s scroll and an arrow key never recenter; typing does only from below', async () => {
  await page.viewport(390, 600);
  const text = await write(SOME);
  await userEvent.click([...text.tx.querySelectorAll('p')].pop()!);
  await userEvent.keyboard('{Control>}{End}{/Control}');
  const m = main();
  const h = line();
  for (let i = 0; i < 16; i++) {
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('A line of words.');
    await frame();
    // Never below the middle by more than a line; once the column has scrolled, at the middle.
    expect(caretY()).toBeLessThanOrEqual(middle() + h);
    if (m.scrollTop > 0) expect(Math.abs(caretY() - middle())).toBeLessThanOrEqual(h);
  }
  expect(m.scrollTop).toBeGreaterThan(0);
  // The person scrolls up: the caret is lower, still in sight. An arrow key keeps it where it is.
  m.dispatchEvent(new WheelEvent('wheel', { deltaY: -200, bubbles: true }));
  m.scrollTop -= 200;
  await frame();
  const scrolled = m.scrollTop;
  await userEvent.keyboard('{ArrowLeft}{ArrowRight}');
  await frame();
  expect(m.scrollTop).toBe(scrolled);
  // Typing from below the middle brings it back there.
  await userEvent.keyboard('x');
  await frame();
  expect(Math.abs(caretY() - middle())).toBeLessThanOrEqual(h);
  // From above the middle (scrolled down, as far as it goes), typing leaves the column where it is.
  m.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true }));
  m.scrollTop += 100;
  await frame();
  const down = m.scrollTop;
  expect(caretY()).toBeLessThan(middle() - h / 2);
  await userEvent.keyboard('y');
  await frame();
  expect(m.scrollTop).toBe(down);
});

test('a click never recenters', async () => {
  await page.viewport(390, 600);
  const text = await write(LONG);
  const m = main();
  const p = [...text.tx.querySelectorAll('p')].find((el) => el.getBoundingClientRect().top > middle() + 60)!;
  const before = m.scrollTop;
  await userEvent.click(p);
  await frame();
  expect(m.scrollTop).toBe(before);
});

test('the column’s room below is half what can be seen of it in an edited text, and not in a Drawing, a Calendar, a Trip or a Display Link', async () => {
  await page.viewport(390, 600);
  await write(SOME);
  const pad = (el: Element) => parseFloat(getComputedStyle(el).paddingBottom);
  await until(() => Math.abs(pad(main()) - main().clientHeight / 2) < 1);
  expect(pad(main())).toBeCloseTo(main().clientHeight / 2, 0);
  const draw = await mount('#/v1/draw');
  await until(() => !!draw.querySelector('to-draw-editor .draw-wrap'));
  await frame();
  expect(pad(main())).toBe(parseFloat(getComputedStyle(main()).paddingTop));
  expect(pad(main())).toBeLessThan(main().clientHeight / 4);
  // The Calendar and the Trip Planner are typed in their dialog and their rows, not at the column's end (Paul,
  // 2026-10-12: "The calendar is oddly vertically stretched"): the gutter below them, as below a canvas.
  for (const app of ['cal', 'trip']) {
    const shell = await mount(`#/v1/${app}`);
    await until(() => !!shell.querySelector(`to-${app}-editor`));
    await frame();
    expect(pad(main()), app).toBe(parseFloat(getComputedStyle(main()).paddingTop));
  }
  const shown = await mount(`#/v1/write/${encodeDoc(SOME)}?d`);
  await until(() => !!shown.querySelector('main.to-display'));
  await frame();
  const pages = shown.querySelector('main.to-display')!;
  expect(pad(pages)).toBeLessThan(pages.clientHeight / 4);
});

test('390×844 with a finger and the keyboard up (508px): the middle is of what is seen above the keyboard and the bar', async () => {
  await page.viewport(390, 844);
  await coarse(true);
  const vv = fakeViewport();
  const text = await write(SOME);
  await userEvent.click([...text.tx.querySelectorAll('p')].pop()!);
  vv.height = 508;
  vv.dispatchEvent(new Event('resize'));
  await until(() => !document.querySelector('to-chrome')!.hasAttribute('gliding') && document.querySelector('to-chrome')!.getBoundingClientRect().height <= 509);
  await settled();
  await userEvent.keyboard('{Control>}{End}{/Control}');
  const h = line();
  const bar = () => document.querySelector<HTMLElement>('.to-editor to-bar')!.getBoundingClientRect();
  for (let i = 0; i < 14; i++) {
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('Words.');
    await frame();
  }
  await settled();
  // The middle of 508 less the bar (the header steps aside while editing).
  const seen = (0 + bar().top) / 2;
  expect(main().scrollTop).toBeGreaterThan(0);
  expect(Math.abs(caretY() - seen)).toBeLessThanOrEqual(h);
  expect(Math.abs(middle() - seen)).toBeLessThanOrEqual(2);
});
