// <to-dialog> (kit/dialog.ts): closed by Escape, the backdrop or its Close, it gives the focus back where it was when
// it opened, even where the browser's own restoring finds nothing to give it to (a page in a frame had it).
import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { html, render } from 'lit';
import { until } from './helpers.ts';
import '../../src/styles.css';
import '../../src/kit/dialog.ts';
import '../../src/kit/menu.ts';
import type { ToDialog } from '../../src/kit/dialog.ts';

test('Escape gives the focus back to the frame whose page had it, not to nothing (walks: site at a phone, seed -553790039)', async () => {
  document.body.innerHTML = '';
  const host = document.body.appendChild(document.createElement('div'));
  render(html`<main class="to-main" tabindex="-1"><iframe srcdoc="<input>" title="A page"></iframe></main><to-dialog heading="Asked" .body=${html`<button>OK</button>`}></to-dialog>`, host);
  const frame = document.querySelector('iframe')!;
  await until(() => !!frame.contentDocument?.querySelector('input'));
  frame.contentDocument!.querySelector('input')!.focus();
  expect(document.activeElement).toBe(frame);
  const dialog = document.querySelector<ToDialog>('to-dialog')!;
  await dialog.show();
  await userEvent.keyboard('{Escape}');
  await until(() => !dialog.dialog.open);
  await until(() => document.activeElement !== document.body, 500).catch(() => undefined);
  expect(document.activeElement).toBe(frame);
});

test('opened over a menu (which the dialog closes), it gives the focus back to the menu’s button; with nothing to give it to, to the column (walks: site at a desktop, seed 97425194)', async () => {
  document.body.innerHTML = '';
  const host = document.body.appendChild(document.createElement('div'));
  render(html`<main class="to-main" tabindex="-1"><to-menu .label=${'Look'} .items=${[{ label: 'Amber', does() {} }]}></to-menu><button class="gone">Gone</button></main><to-dialog heading="Asked" .body=${html`<button>OK</button>`}></to-dialog>`, host);
  const menu = document.querySelector<HTMLElement & { button: HTMLButtonElement; menu: HTMLElement }>('to-menu')!;
  await (menu as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await userEvent.click(menu.button);
  await until(() => menu.menu.matches(':popover-open'));
  const dialog = document.querySelector<ToDialog>('to-dialog')!;
  await dialog.show();
  expect(menu.menu.matches(':popover-open')).toBe(false);
  await userEvent.keyboard('{Escape}');
  await until(() => !dialog.dialog.open);
  expect(document.activeElement).toBe(menu.button);
  // What had the focus is gone when it closes: the column has it.
  const gone = document.querySelector<HTMLButtonElement>('.gone')!;
  gone.focus();
  await dialog.show();
  gone.remove();
  await userEvent.keyboard('{Escape}');
  await until(() => !dialog.dialog.open);
  expect(document.activeElement).toBe(document.querySelector('main.to-main'));
});
