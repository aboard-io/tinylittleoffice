// A host's page in the library's frame (docs/library.md, A host's page; kit/ui/page-frame.ts, src/styles/page-frame.css):
// with the editors' stylesheet alone and none of the site's, a page draws a .to-page with a .to-page-head, a
// .to-page-menu and a .to-column, holds a PageFrame, and has what the site's chrome has: the column the visible window's
// height, its bar under the header on a wide screen and at the column's foot under a finger (and in a narrow window,
// mobile first, `.foot`, its pinned tools pinned there), the header stepping aside while a box is typed in but for the
// menu button, translucent in the corner, and the column following a keyboard's height.
import { html, LitElement } from 'lit';
import { afterEach, expect, test } from 'vitest';
import { cdp, page, userEvent } from 'vitest/browser';
import { cmdTool, mount, PageFrame, tool, UI } from '../../src/editors.ts';
import { REDO, UNDO } from '../../src/kit/core/keys.ts';
import { settled, until } from './wait.ts';

/** The host's page: its own element, holding the library's frame. */
class HostPage extends LitElement {
  frame = new PageFrame(this);
  /** A page of records, with a bar of its own; else an empty column, for an editor. */
  records = true;
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    this.classList.add('to-page');
    super.connectedCallback();
  }
  render() {
    return html`<header class="to-page-head"><h1 style="margin:0;font-size:1.25em">Clear Channel</h1></header>
      ${tool({ label: 'Menu', icon: UI.menu, size: 24, cls: 'to-page-menu' })}
      <div class="to-column barred">
        <main tabindex="0">
          ${this.records ? this.list() : ''}
        </main>
      </div>`;
  }
  list() {
    return html`<to-bar class="to-page-bar">${Array.from({ length: 16 }, (_, i) => tool({ label: `Tool ${i}`, icon: UI.bold }))}${cmdTool(UNDO, { editor: this })}${cmdTool(REDO, { editor: this })}</to-bar>
          <p>${Array.from({ length: 800 }, (_, i) => `Line ${i + 1} of the page.`).join(' ')}</p>
          <input aria-label="Name" />`;
  }
}
customElements.define('host-page', HostPage);

async function coarse(on: boolean) {
  await cdp().send('Emulation.setTouchEmulationEnabled', on ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
}
const REAL = window.visualViewport!;
afterEach(async () => {
  await coarse(false);
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: REAL });
  document.body.innerHTML = '';
  await page.viewport(414, 896);
});

async function hostPage(cls = '', records = true): Promise<HostPage> {
  document.body.innerHTML = '';
  const el = document.createElement('host-page') as HostPage;
  el.records = records;
  if (cls) el.className = cls;
  document.body.append(el);
  await el.updateComplete;
  await settled();
  return el;
}
const box = (el: Element | null) => el!.getBoundingClientRect();

test('1440×900: the frame is the window’s height, the header at its top, the page’s bar under it, the main scrolling under the bar, the menu at the inline end', async () => {
  await page.viewport(1440, 900);
  const el = await hostPage();
  expect(box(el).height).toBeCloseTo(innerHeight, 0);
  const head = box(el.querySelector('.to-page-head'));
  const bar = box(el.querySelector('.to-page-bar'));
  const main = el.querySelector<HTMLElement>('main')!;
  expect(head.top).toBe(0);
  expect(bar.top).toBeCloseTo(head.bottom, 0);
  expect(box(main).top).toBeCloseTo(bar.bottom, 0);
  expect(main.scrollHeight).toBeGreaterThan(main.clientHeight);
  const menu = box(el.querySelector('.to-page-menu'));
  expect(menu.right).toBeGreaterThan(1440 - 70);
  expect(menu.bottom).toBeLessThanOrEqual(head.bottom);
  // The plus and the menu button at 24px, the kit's tool drawn so (tool's `size`).
  expect(el.querySelector('.to-page-menu svg')!.getAttribute('width')).toBe('24');
  // Under a mouse, wide, the pinned tools scroll with the rest.
  expect(getComputedStyle(el.querySelector('.cmd-kit-undo')!).position).toBe('static');
});

test('390×844 with a finger: the bar at the column’s foot; a tap in a box hides the header, the menu in the corner, translucent; a keyboard makes the frame shorter; a tap outside brings the header back', async () => {
  await page.viewport(390, 844);
  await coarse(true);
  const vv = Object.assign(new EventTarget(), { offsetTop: 0, offsetLeft: 0, pageTop: 0, pageLeft: 0, width: REAL.width, height: REAL.height, scale: 1 });
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv });
  const el = await hostPage();
  const bar = () => box(el.querySelector('.to-page-bar'));
  expect(bar().bottom).toBeCloseTo(box(el).bottom, 0);
  expect(getComputedStyle(el.querySelector('.cmd-kit-undo')!).position).toBe('sticky');
  await userEvent.click(el.querySelector('input')!);
  await until(() => el.hasAttribute('editing'), 'the frame never said editing');
  await settled();
  expect(getComputedStyle(el.querySelector('.to-page-head')!).display).toBe('none');
  const menu = el.querySelector<HTMLElement>('.to-page-menu')!;
  expect(box(menu).top).toBeLessThan(20);
  expect(Number(getComputedStyle(menu).opacity)).toBeLessThan(1);
  // The keyboard: the frame takes the visible window's height, gliding there.
  vv.height -= 300;
  vv.dispatchEvent(new Event('resize'));
  await until(() => Math.abs(box(el).height - vv.height) < 0.5);
  await until(() => !el.hasAttribute('gliding'), 'the column never settled');
  expect(bar().bottom).toBeCloseTo(vv.height, 0);
  // A tap outside the box: the header back.
  vv.height += 300;
  vv.dispatchEvent(new Event('resize'));
  await userEvent.click(el.querySelector('p')!);
  await until(() => !el.hasAttribute('editing'), 'the header never came back');
  expect(getComputedStyle(el.querySelector('.to-page-head')!).display).not.toBe('none');
});

test('700×800 under a mouse: a mobile-first page (.foot) has its bar at the column’s foot with Undo and Redo pinned at its end; another page has it under the header', async () => {
  await page.viewport(700, 800);
  let el = await hostPage();
  expect(box(el.querySelector('.to-page-bar')).top).toBeCloseTo(box(el.querySelector('.to-page-head')).bottom, 0);
  expect(getComputedStyle(el.querySelector('.cmd-kit-undo')!).position).toBe('static');
  el = await hostPage('foot');
  const bar = el.querySelector<HTMLElement>('.to-page-bar')!;
  expect(box(bar).bottom).toBeCloseTo(box(el).bottom, 0);
  expect(getComputedStyle(el.querySelector('.cmd-kit-undo')!).position).toBe('sticky');
  bar.scrollLeft = 0;
  const undo = box(el.querySelector('.cmd-kit-undo'));
  expect(undo.right).toBeLessThanOrEqual(box(bar).right + 1);
  expect(undo.left).toBeGreaterThanOrEqual(box(bar).left);
  // Wider than 720px, the bar goes back under the header.
  await page.viewport(900, 800);
  await until(() => Math.abs(box(bar).top - box(el.querySelector('.to-page-head')).bottom) < 1, 'the bar never went back under the header');
});

test('an editor mounted in the frame’s column has its bar placed as the site’s is: under the header, at the foot under a finger', async () => {
  await page.viewport(1024, 768);
  const el = await hostPage('', false);
  const main = el.querySelector('main')!;
  await mount('write', '# Plans\n\nWords.\n', main, () => {});
  await settled();
  const bar = () => box(el.querySelector('.to-editor to-bar'));
  expect(bar().top).toBeCloseTo(box(el.querySelector('.to-page-head')).bottom, 0);
  await page.viewport(390, 844);
  await coarse(true);
  await until(() => Math.abs(bar().bottom - box(el).bottom) < 1, 'the editor’s bar never went to the foot');
});
