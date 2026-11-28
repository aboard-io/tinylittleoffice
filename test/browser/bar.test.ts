// The bar: one row that scrolls sideways, saying at its edges where there is more.
import { test, expect } from 'vitest';
import { render, html } from 'lit';
import { cdp } from 'vitest/browser';
import { tool, btn, cmdTool } from '../../src/kit/ui/bar.ts';
import { REDO, UNDO } from '../../src/kit/core/keys.ts';
import { keyboard } from '../../src/kit/core/commands.ts';
import { UI } from '../../src/kit/draw/icons.ts';
import { until } from './helpers.ts';
import '../../src/styles.css';

test('related tools stay together, with a divider only between groups', async () => {
  document.body.innerHTML = '<to-bar></to-bar>';
  const bar = document.querySelector<HTMLElement>('to-bar')!;
  render(
    html`${tool({ label: 'Insert', icon: UI.plus })}${['Title', 'H1', 'H2', 'Paragraph'].map((label) => tool({ label, icon: UI.text, group: 'blocks' }))}${tool({ label: 'Bold', icon: UI.bold, group: 'marks' })}${tool({ label: 'Italic', icon: UI.italic, group: 'marks' })}`,
    bar,
  );
  await until(() => bar.querySelectorAll('[data-group-start]').length === 2);
  const buttons = [...bar.querySelectorAll('button')];
  expect(buttons.filter((button) => button.hasAttribute('data-group-start')).map((button) => button.getAttribute('aria-label'))).toEqual(['Title', 'Bold']);
  const gap = (before: number, after: number) => buttons[after].getBoundingClientRect().left - buttons[before].getBoundingClientRect().right;
  expect(gap(4, 5)).toBeGreaterThan(gap(1, 2));
  expect(getComputedStyle(buttons[1], '::before').width).toBe('1px');
  buttons[0].remove();
  await until(() => !buttons[1].hasAttribute('data-group-start'));
  buttons[1].focus();
  buttons[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  expect(document.activeElement).toBe(buttons[2]);
});

test('a bar wider than its box fades at the end, then at the start once scrolled', async () => {
  document.body.innerHTML = '<div style="width:200px"><to-bar></to-bar></div>';
  const bar = document.querySelector<HTMLElement>('to-bar')!;
  render(html`${Array.from({ length: 12 }, (_, i) => tool({ label: `Tool ${i}`, icon: UI.bold }))}`, bar);
  await until(() => bar.hasAttribute('data-fade-end'));
  expect(bar.hasAttribute('data-fade-start')).toBe(false);
  expect(bar.getAttribute('role')).toBe('toolbar');
  bar.scrollLeft = 100;
  await until(() => bar.hasAttribute('data-fade-start'));
  expect(bar.hasAttribute('data-fade-end')).toBe(true);
  bar.scrollLeft = 10_000;
  await until(() => !bar.hasAttribute('data-fade-end'));
  // Wide enough, no fade at all.
  bar.parentElement!.style.width = '2000px';
  await until(() => !bar.hasAttribute('data-fade-start') && !bar.hasAttribute('data-fade-end'));
});

test('tool() and btn() are named buttons, 44px to the finger, with a state when they have one', () => {
  document.body.innerHTML = '<to-bar></to-bar>';
  let pressed = false;
  render(html`${tool({ label: 'Bold', icon: UI.bold, keys: 'Mod+B', pressed, does: () => (pressed = true) })}${btn({ label: 'Insert', icon: UI.plus })}`, document.querySelector('to-bar')!);
  const [t, b] = [...document.querySelectorAll<HTMLButtonElement>('button')];
  expect(t.getAttribute('aria-label')).toBe('Bold');
  expect(t.title).toMatch(/^Bold \((⌘|Ctrl\+)B\)$/);
  expect(t.getAttribute('aria-pressed')).toBe('false');
  expect(t.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  expect(t.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
  t.click();
  expect(pressed).toBe(true);
  expect(b.textContent!.trim()).toBe('Insert');
  expect(b.hasAttribute('aria-pressed')).toBe(false);
});

test('a label in the bar is one line, however narrow the bar; a hint is the tooltip', async () => {
  document.body.innerHTML = '<div style="width:120px"><to-bar></to-bar></div>';
  const bar = document.querySelector<HTMLElement>('to-bar')!;
  render(html`${btn({ label: 'Background', hint: 'Use as background', icon: UI.image })}${btn({ label: 'Two words' })}`, bar);
  const buttons = [...bar.querySelectorAll<HTMLButtonElement>('button')];
  for (const b of buttons) {
    const span = b.querySelector('span')!;
    expect(getComputedStyle(span).whiteSpace).toBe('nowrap');
    // One line: as tall as one line of its type.
    expect(span.getBoundingClientRect().height).toBeLessThan(parseFloat(getComputedStyle(span).fontSize) * 2);
  }
  expect(buttons[0].title).toBe('Use as background');
  expect(buttons[0].textContent!.trim()).toBe('Background');
  expect(buttons[1].hasAttribute('title')).toBe(false);
});

// The review of 2026-10-11: "Undo is never on screen in any app's bar". Under a finger Undo and Redo (kit/core/keys.ts,
// `pinned`) stay at the bar's inline end however far it is scrolled; on a bar under 360px Undo alone; under a mouse the
// bar is as it was, Undo last in its scroll.
test('under a finger Undo and Redo stay at the end of a bar however it is scrolled; under a mouse they scroll with it', async () => {
  const pinnedIn = async (width: number) => {
    document.body.innerHTML = `<div style="width:${width}px"><to-bar></to-bar></div>`;
    const bar = document.querySelector<HTMLElement>('to-bar')!;
    bar.style.margin = '0';
    const here = { editor: document.createElement('div') };
    render(html`${Array.from({ length: 14 }, (_, i) => tool({ label: `Tool ${i}`, icon: UI.bold }))}${cmdTool(UNDO, here)}${cmdTool(REDO, here)}`, bar);
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const shown = (sel: string) => {
      const b = bar.getBoundingClientRect();
      const r = bar.querySelector(sel)!.getBoundingClientRect();
      return r.left >= b.left - 1 && r.right <= b.right + 1;
    };
    const out: Record<string, boolean>[] = [];
    for (const to of [0, 120, 100_000]) {
      bar.scrollLeft = to;
      await new Promise(requestAnimationFrame);
      out.push({ undo: shown('.cmd-kit-undo'), redo: shown('.cmd-kit-redo') });
    }
    return out;
  };
  await cdp().send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  try {
    expect(matchMedia('(pointer: coarse)').matches).toBe(true);
    expect(await pinnedIn(390)).toEqual([
      { undo: true, redo: true },
      { undo: true, redo: true },
      { undo: true, redo: true },
    ]);
    // Narrower than 360px: Undo alone is pinned, Redo scrolls with the rest (in view once the bar is at its end).
    expect(await pinnedIn(340)).toEqual([
      { undo: true, redo: false },
      { undo: true, redo: false },
      { undo: true, redo: true },
    ]);
  } finally {
    await cdp().send('Emulation.setTouchEmulationEnabled', { enabled: false });
  }
  expect(matchMedia('(pointer: coarse)').matches).toBe(false);
  expect(await pinnedIn(390)).toEqual([
    { undo: false, redo: false },
    { undo: false, redo: false },
    { undo: true, redo: true },
  ]);
  expect(getComputedStyle(document.querySelector('.cmd-kit-undo')!).position).not.toBe('sticky');
});

// The review of 2026-10-11: a key is written only where there is a keyboard to press it on (commands.ts chords). A bar's
// tooltip says Undo's keys under a mouse, and under a finger once a keyboard is seen; under a finger with none, Undo
// alone; its aria-keyshortcuts say the keys either way.
test("a bar's tooltip writes the keys under a mouse and once a keyboard is seen, never under a finger with none", async () => {
  const undo = () => {
    document.body.innerHTML = '<to-bar></to-bar>';
    render(html`${cmdTool(UNDO, { editor: document.createElement('div') })}`, document.querySelector('to-bar')!);
    return document.querySelector<HTMLButtonElement>('.cmd-kit-undo')!;
  };
  keyboard.seen = false;
  expect(undo().title).toMatch(/^Undo \((⌘|Ctrl\+)Z\)$/);
  expect(undo().getAttribute('aria-keyshortcuts')).toMatch(/^(Control|Meta)\+Z\b/);
  await cdp().send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  try {
    const b = undo();
    expect(b.title).toBe('Undo');
    expect(b.title).not.toMatch(/Ctrl|⌘/);
    expect(b.getAttribute('aria-keyshortcuts')).toMatch(/^(Control|Meta)\+Z\b/);
    keyboard.seen = true;
    expect(undo().title).toMatch(/^Undo \((⌘|Ctrl\+)Z\)$/);
  } finally {
    keyboard.seen = false;
    await cdp().send('Emulation.setTouchEmulationEnabled', { enabled: false });
  }
});
