// DocElement, what every app's editor extends: the op log keeps a host's mark of the selection and hands it back to
// undone(); firstAt() says where an entry begins; undoTools() is the bar's Undo and Redo, off with nothing to do.
import { expect, test } from 'vitest';
import { html, render } from 'lit';
import type { Doc, Op } from '../../src/doc/index.ts';
import { DocElement, firstAt, type DocChange, type Entry } from '../../src/kit/element.ts';
import '../../src/styles.css';

class Probe extends DocElement<Doc> {
  heard: { mark: unknown; redo: boolean; first: number }[] = [];
  protected read(doc: Doc) {
    return doc;
  }
  protected undone(entry: Entry, redo: boolean) {
    this.heard.push({ mark: entry.mark, redo, first: firstAt(entry) });
  }
  change(ops: Op[], key?: string, mark?: unknown) {
    this.edit(ops, key, mark);
  }
  render() {
    return html`<to-bar>${this.undoTools()}</to-bar>`;
  }
}
customElements.define('to-probe', Probe);

test("an edit carries the host's mark to undone(); firstAt is the lowest block the ops touch; Undo and Redo follow the log", async () => {
  document.body.innerHTML = '';
  render(html`<to-probe .value=${'a\n\nb\n\nc\n'}></to-probe>`, document.body);
  const el = document.querySelector<Probe>('to-probe')!;
  await el.updateComplete;
  const [undo, redo] = el.querySelectorAll<HTMLButtonElement>('button');
  expect([undo.getAttribute('aria-label'), redo.getAttribute('aria-label')]).toEqual(['Undo', 'Redo']);
  expect(undo.disabled && redo.disabled).toBe(true);
  el.change(
    [
      { op: 'text', at: 2, from: 1, to: 1, runs: [{ t: 'x' }] },
      { op: 'text', at: 1, from: 0, to: 0, runs: [{ t: 'y' }] },
    ],
    undefined,
    { block: 2, offset: 1 },
  );
  await el.updateComplete;
  expect(undo.disabled).toBe(false);
  // A press keeps the focus where it was (keep: true), and undoes.
  const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
  undo.dispatchEvent(down);
  expect(down.defaultPrevented).toBe(true);
  undo.click();
  await el.updateComplete;
  expect(el.value).toBe('a\n\nb\n\nc\n');
  expect(el.heard).toEqual([{ mark: { block: 2, offset: 1 }, redo: false, first: 1 }]);
  expect(undo.disabled).toBe(true);
  expect(redo.disabled).toBe(false);
  redo.click();
  await el.updateComplete;
  expect(el.value).toBe('a\n\nyb\n\ncx\n');
  expect(el.heard[1]).toEqual({ mark: { block: 2, offset: 1 }, redo: true, first: 1 });
  expect(firstAt({ ops: [{ op: 'head', key: 'title', value: 'T' }] })).toBe(-1);
  expect(firstAt({ ops: [{ op: 'move', at: 4, n: 1, to: 2 }] })).toBe(2);
});

test("a docchange carries the edit's burst key, so a host holding the editor keeps its bursts; an undo carries none", async () => {
  document.body.innerHTML = '';
  const host = document.body.appendChild(document.createElement('div'));
  render(html`<to-probe .value=${'a\n'}></to-probe>`, host);
  const el = host.querySelector<Probe>('to-probe')!;
  await el.updateComplete;
  const keys: (string | undefined)[] = [];
  el.addEventListener('docchange', (e) => keys.push((e as DocChange).key));
  el.change([{ op: 'text', at: 0, from: 1, to: 1, runs: [{ t: 'b' }] }], 'type:0');
  el.change([{ op: 'text', at: 0, from: 0, to: 0, runs: [{ t: 'c' }] }]);
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  expect(keys).toEqual(['type:0', undefined, undefined]);
});
