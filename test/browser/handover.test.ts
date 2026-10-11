// One modal at a time (directive r10-handover; the walks' first finding, `dialog-from-dialog`): a dialog opened from
// inside another never stacks on it. The drawer hands over and does not come back: a row of it that opens a dialog
// closes the drawer first, and when that dialog closes the focus is on the hamburger. Share hands over and comes
// back: Password… closes Share, and when the password dialog closes (Cancel or done) Share is open again as it was,
// the focus on Password….
import { afterEach, beforeEach, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { mount, openDrawerDoc, openShare, tick, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { apps } from '../../src/kit/apps.ts';

/** Every showModal() made while another modal was open, by what was open and what opened over it. */
const stacked: string[] = [];
const showModal = HTMLDialogElement.prototype.showModal;
const named = (d: Element) => `${d.className || d.tagName.toLowerCase()}`;
beforeEach(() => {
  stacked.length = 0;
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    const under = [...document.querySelectorAll('dialog')].filter((d) => d !== this && d.matches(':modal'));
    if (!this.open && under.length) stacked.push(`${named(this)} over ${under.map(named).join(', ')}`);
    return showModal.call(this);
  };
});
afterEach(() => {
  HTMLDialogElement.prototype.showModal = showModal;
});

const modals = () => [...document.querySelectorAll('dialog')].filter((d) => d.matches(':modal'));
/** The one modal open, once there is exactly one and it matches. */
async function only(selector: string): Promise<HTMLDialogElement> {
  await until(() => modals().length === 1 && modals()[0].matches(selector));
  return modals()[0];
}
const doc = () => `#/v1/write/${encodeDoc('# Letter\n\nDear Ada,\n')}`;

for (const row of [
  {
    name: 'an app’s templates',
    press: (d: HTMLElement) => d.querySelector<HTMLElement>('.to-drawer-apps .to-app-head to-templates > button')!,
    opens: 'dialog.to-templates-dialog',
    close: (m: HTMLDialogElement) => m.querySelector<HTMLElement>('.to-listbox-close')!.click(),
  },
  {
    name: 'Privacy',
    press: (d: HTMLElement) => d.querySelector<HTMLElement>('.to-drawer-privacy')!,
    opens: 'to-dialog.to-privacy-dialog dialog',
    close: (m: HTMLDialogElement) => m.querySelector<HTMLElement>('.to-dialog-head button')!.click(),
  },
  { name: 'About', press: (d: HTMLElement) => d.querySelector<HTMLElement>('.to-drawer-about')!, opens: 'to-dialog.to-about-dialog dialog', close: (m: HTMLDialogElement) => m.close() },
])
  test(`${row.name} from the drawer: the drawer closes first, one modal at a time, and the focus comes back to the hamburger`, async () => {
    const shell = await mount(doc());
    await until(() => !!shell.querySelector('to-write-editor to-text .tx p'));
    const drawer = (await openDrawerDoc(shell)).closest('dialog')!;
    const burger = shell.querySelector<HTMLElement>('.to-burger')!;
    row.press(drawer).click();
    const opened = await only(row.opens);
    expect(drawer.open).toBe(false);
    expect(stacked).toEqual([]);
    row.close(opened);
    await until(() => !opened.open);
    await until(() => document.activeElement === burger);
    expect(modals()).toEqual([]);
  });

test('a command from the drawer (under a finger, the app’s own: the calendar’s Time zone): the drawer closes first, and the focus comes back to the hamburger', async () => {
  const real = window.matchMedia;
  window.matchMedia = (q: string) =>
    /^\(pointer: coarse\)$/.test(q.trim()) ? ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList) : real.call(window, q);
  try {
    const shell = await mount('#/v1/cal');
    await until(() => !!shell.querySelector('to-cal-editor'));
    const cal = shell.querySelector('to-cal-editor') as HTMLElement & { zone: string };
    const drawer = (await openDrawerDoc(shell)).closest('dialog')!;
    const burger = shell.querySelector<HTMLElement>('.to-burger')!;
    const where = cal.zone.split('/').pop()!.replace(/_/g, ' ');
    const zone = [...drawer.querySelectorAll<HTMLButtonElement>('button.to-drawer-cmd')].find((b) => b.textContent!.includes(where));
    expect(zone, where).toBeDefined();
    zone!.click();
    const opened = await only('to-dialog.cal-zones dialog');
    expect(drawer.open).toBe(false);
    expect(stacked).toEqual([]);
    await userEvent.keyboard('{Escape}');
    await until(() => !opened.open);
    await until(() => document.activeElement === burger);
    expect(modals()).toEqual([]);
  } finally {
    window.matchMedia = real;
  }
});

test('the templates from the home page are as they were: over the page, the focus back on their button', async () => {
  const shell = await mount('');
  const btn = shell.querySelector<HTMLElement>('to-home to-templates > button')!;
  btn.focus();
  btn.click();
  const opened = await only('dialog.to-templates-dialog');
  expect(btn.getAttribute('aria-expanded')).toBe('true');
  opened.querySelector<HTMLElement>('.to-listbox-close')!.click();
  await until(() => document.activeElement === btn && btn.getAttribute('aria-expanded') === 'false');
  expect(stacked).toEqual([]);
});

test('Password… from Share: Share closes, the password dialog alone is open; closed, Share is back as it was, the focus on Password…', async () => {
  const shell = await mount(doc());
  await until(() => !!shell.querySelector('to-write-editor to-text .tx p'));
  await openShare(shell);
  const share = await only('to-share dialog');
  // State to keep: the QR code's Display Link chosen, the body scrolled.
  await until(() => !!share.querySelector('.to-share-qr .to-which'));
  share.querySelectorAll<HTMLElement>('.to-share-qr .to-which button')[1].click();
  await until(() => share.querySelectorAll('.to-share-qr .to-which button')[1].getAttribute('aria-pressed') === 'true');
  // The body made shorter than what it holds, and scrolled part way down: kept across the step (the browser keeps a
  // closed dialog's scroll, Chromium and WebKit alike, since nothing is drawn again).
  const body = share.querySelector<HTMLElement>('.to-dialog-body')!;
  body.style.maxHeight = '12em';
  await until(() => body.scrollHeight > body.clientHeight + 100);
  body.scrollTop = 80;
  const top = body.scrollTop;
  expect(top).toBeGreaterThan(0);
  const open = share.querySelector<HTMLButtonElement>('.to-password-open')!;
  open.focus({ preventScroll: true });
  open.click();
  const pw = await only('to-dialog.to-password-dialog dialog');
  expect(share.open).toBe(false);
  expect(stacked).toEqual([]);
  // Cancel (its Close): Share is back.
  pw.querySelector<HTMLElement>('.to-dialog-head button')!.click();
  await only('to-share dialog');
  await until(() => document.activeElement === share.querySelector('.to-password-open'));
  expect(share.querySelectorAll('.to-share-qr .to-which button')[1].getAttribute('aria-pressed')).toBe('true');
  expect(body.scrollTop).toBe(top);
  // Escape, the commonest way out: Share is back the same.
  share.querySelector<HTMLButtonElement>('.to-password-open')!.click();
  await only('to-dialog.to-password-dialog dialog');
  await userEvent.keyboard('{Escape}');
  await only('to-share dialog');
  await until(() => document.activeElement === share.querySelector('.to-password-open'));
  expect(body.scrollTop).toBe(top);
  expect(stacked).toEqual([]);
  // Done (a password set): Share is back too, saying so.
  share.querySelector<HTMLButtonElement>('.to-password-open')!.click();
  await only('to-dialog.to-password-dialog dialog');
  for (const f of shell.querySelectorAll<HTMLInputElement>('.to-password-new')) ((f.value = 'maple orbit sugar lantern'), f.dispatchEvent(new Event('input', { bubbles: true })));
  shell.querySelector<HTMLButtonElement>('.to-password-set')!.click();
  await only('to-share dialog');
  await until(() => share.querySelector('.to-share-protect .to-trust-line')!.textContent!.includes('Protected by a password'));
  await until(() => document.activeElement === share.querySelector('.to-password-open'));
  expect(stacked).toEqual([]);
  // Share closed for good: it says so (to-close, which a step left behind would swallow), and the next Share begins
  // afresh as before, its body drawn anew, not the one kept across the steps.
  const kept = share.querySelector('.to-share-qr')!;
  share.close();
  await until(() => modals().length === 0);
  await until(() => !kept.isConnected);
  await openShare(shell);
  await only('to-share dialog');
  await until(() => !!share.querySelector('.to-share-qr'));
  expect(share.querySelector('.to-share-qr')).not.toBe(kept);
  share.close();
  await until(() => modals().length === 0);
});

test('no dialog opens another while it is open: every drawer row and every Share button that reaches a dialog hands over', async () => {
  const shell = await mount(doc());
  await until(() => !!shell.querySelector('to-write-editor to-text .tx p'));
  const closeAll = async () => {
    for (const d of modals()) d.close();
    await until(() => modals().length === 0);
    await tick(20);
  };
  // The drawer's rows that open a dialog: Share…, Keyboard shortcuts, Privacy, About, and every app's templates.
  const rows = ['.to-drawer-share', '.to-drawer-keys', '.to-drawer-privacy', '.to-drawer-about', ...apps().map((_, i) => `.to-drawer-apps .to-app-head:nth-of-type(${i + 1}) to-templates > button`)];
  for (const sel of rows) {
    const drawer = (await openDrawerDoc(shell)).closest('dialog')!;
    const b = drawer.parentElement!.querySelector<HTMLElement>(sel) ?? drawer.querySelector<HTMLElement>(sel);
    expect(b, sel).not.toBeNull();
    b!.click();
    await until(() => modals().length > 0 && !modals().some((m) => m.matches('.to-drawer')));
    await closeAll();
  }
  // Share's buttons that open a dialog of their own.
  await openShare(shell);
  await only('to-share dialog');
  for (const b of document.querySelectorAll<HTMLElement>('to-share dialog [aria-haspopup=dialog]')) {
    if (b.getAttribute('popovertarget')) continue;
    b.click();
    await until(() => modals().length > 0 && !modals().some((m) => m.closest('to-share')));
    modals()[0].close();
    await only('to-share dialog');
  }
  await closeAll();
  expect(stacked).toEqual([]);
});
