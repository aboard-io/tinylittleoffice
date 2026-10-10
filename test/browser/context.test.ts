// <to-context>: shown centred under its anchor inside the viewport, moved with it, its buttons keep the focus where it was, hidden on hide().
import { expect, test } from 'vitest';
import { Copy, Trash2 } from 'lucide';
import { SEP, type ToContext } from '../../src/kit/context.ts';
import { tick, until } from './helpers.ts';
import '../../src/styles.css';
import '../../src/kit/context.ts';

test('shows under the anchor, centred, follows it, keeps the focus, hides', async () => {
  document.body.innerHTML = '<div id="box" tabindex="0" style="position:absolute;top:100px;left:100px;width:120px;height:40px;background:#ccc"></div>';
  const box = document.getElementById('box')!;
  box.focus();
  const ctx = document.createElement('to-context') as ToContext;
  const did: string[] = [];
  ctx.label = 'Shape';
  ctx.items = [
    { label: 'Red', swatch: '#b3261e', pressed: true, does: () => did.push('red') },
    { label: 'Large', text: 'L', does: () => did.push('L') },
    SEP,
    { label: 'Duplicate', icon: Copy, keys: 'Mod+D', does: () => did.push('dup') },
    { label: 'Delete', icon: Trash2, does: () => did.push('del') },
  ];
  document.body.append(ctx);
  await ctx.updateComplete;
  expect(ctx.isOpen).toBe(false);
  ctx.show(box);
  await until(() => ctx.isOpen);
  await tick(30);
  const pop = ctx.querySelector<HTMLElement>('.to-context')!;
  const a = box.getBoundingClientRect();
  const r = pop.getBoundingClientRect();
  expect(r.top).toBeGreaterThanOrEqual(a.bottom);
  expect(Math.abs(r.left + r.width / 2 - (a.left + a.width / 2))).toBeLessThan(2);
  expect(pop.getAttribute('role')).toBe('toolbar');
  expect(pop.querySelectorAll('button').length).toBe(4);
  expect(pop.querySelector('[role=separator]')).not.toBeNull();
  // A press does the thing and the focus stays on the anchor.
  const del = pop.querySelector<HTMLButtonElement>('button[aria-label="Delete"]')!;
  const md = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
  del.dispatchEvent(md);
  expect(md.defaultPrevented).toBe(true);
  del.click();
  expect(did).toEqual(['del']);
  expect(document.activeElement).toBe(box);
  expect(pop.querySelector<HTMLButtonElement>('button[aria-label="Red"]')!.getAttribute('aria-pressed')).toBe('true');
  // The anchor moves: so does the bar.
  box.style.top = '300px';
  ctx.refresh();
  expect(pop.getBoundingClientRect().top).toBeGreaterThanOrEqual(box.getBoundingClientRect().bottom);
  // No room below: above.
  box.style.top = `${window.innerHeight - 50}px`;
  ctx.refresh();
  expect(pop.getBoundingClientRect().bottom).toBeLessThanOrEqual(box.getBoundingClientRect().top);
  ctx.hide();
  expect(ctx.isOpen).toBe(false);
});

test('asked for, it sits above the anchor where there is room, and under it where there is none', async () => {
  document.body.innerHTML = '<div id="box" style="position:absolute;top:300px;left:200px;width:120px;height:40px"></div>';
  const box = document.getElementById('box')!;
  const ctx = document.createElement('to-context') as ToContext;
  ctx.items = [{ label: 'Delete', icon: Trash2, does: () => undefined }];
  document.body.append(ctx);
  await ctx.updateComplete;
  ctx.show(box, 'above');
  await until(() => ctx.isOpen);
  await tick(30);
  const pop = ctx.querySelector<HTMLElement>('.to-context')!;
  expect(pop.getBoundingClientRect().bottom).toBeLessThanOrEqual(box.getBoundingClientRect().top);
  box.style.top = '4px';
  ctx.refresh();
  expect(pop.getBoundingClientRect().top).toBeGreaterThanOrEqual(box.getBoundingClientRect().bottom);
  ctx.hide();
});
