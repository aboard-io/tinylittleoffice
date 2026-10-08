/** Putting an editor on the page and working it as a person would, in happy-dom. */
export type Editor = HTMLElement & { value: string; updateComplete: Promise<unknown> };

/** An editor on the page with a document, and every document it hands back since. */
export async function mount(id: string, value = '') {
  document.body.innerHTML = '';
  const el = document.createElement(`to-${id}`) as Editor;
  el.value = value;
  const docs: string[] = [];
  el.addEventListener('docchange', (e) => {
    docs.push((e as CustomEvent<string>).detail);
    // As the shell does: the editor's own text comes back as its value.
    el.value = (e as CustomEvent<string>).detail;
  });
  document.body.append(el);
  await settle(el);
  return { el, docs, last: () => docs.at(-1) };
}

/** Let the editor (and any element inside it) finish drawing. */
export async function settle(el: Editor) {
  for (let i = 0; i < 3; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
  }
}

/** Type into a plain input or textarea: its value, then the event it fires. */
export function type(box: HTMLInputElement | HTMLTextAreaElement | null, text: string, event: 'input' | 'change' = 'input') {
  if (!box) throw new Error('nothing to type into');
  box.value = text;
  box.dispatchEvent(new Event(event, { bubbles: true, composed: true }));
}

/** The button with this accessible name (its aria-label, else its words). */
export function button(root: ParentNode, name: string | RegExp): HTMLElement {
  const all = [...root.querySelectorAll<HTMLElement>('button, sl-button, [role="button"]')];
  const found = all.find((b) => {
    const label = b.getAttribute('aria-label') ?? b.textContent?.trim() ?? '';
    return typeof name === 'string' ? label === name : name.test(label);
  });
  if (!found) throw new Error(`no button ${name}: ${all.map((b) => b.getAttribute('aria-label') ?? b.textContent?.trim()).filter(Boolean).slice(0, 30).join(', ')}`);
  return found;
}

/** A key pressed on an element: keydown, as the editors listen for. */
export function press(el: Element | null, key: string, mods: { shift?: boolean; alt?: boolean; mod?: boolean } = {}) {
  if (!el) throw new Error(`nothing to press ${key} on`);
  el.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey: !!mods.shift, altKey: !!mods.alt, ctrlKey: !!mods.mod, bubbles: true, composed: true }));
}

/** A Shoelace control set as a person would: its value, then the event it fires ("sl-input", "sl-change"). */
export function setSl(el: Element | null, value: string | boolean, event: 'sl-input' | 'sl-change' = 'sl-change') {
  if (!el) throw new Error('no such control');
  if (typeof value === 'boolean') (el as unknown as { checked: boolean }).checked = value;
  else (el as unknown as { value: string }).value = value;
  el.dispatchEvent(new CustomEvent(event, { bubbles: true, composed: true }));
}
