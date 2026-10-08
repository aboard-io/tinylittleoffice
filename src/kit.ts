/**
 * Everything an app needs, from one import:
 *
 *   import { DocElement, defineElement, html, icon, UI, tool } from '../kit.ts';
 *
 * An editor is a DocElement: it is handed the document as text, turns it
 * into whatever it likes to work with, and calls commit() when that changes.
 * The shell does the rest (the link, saving, sharing, downloads).
 */
import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { icon, UI } from './lib/icons.ts';

export { LitElement, html, svg, nothing, render, type PropertyValues, type TemplateResult } from 'lit';
export { state, property } from 'lit/decorators.js';
export { unsafeSVG } from 'lit/directives/unsafe-svg.js';
export * from './kit/core.ts';
export * from './kit/embed.ts';
export { download, editRef, fontsForPictures, insertOptions, picture } from './kit/browser.ts';
export { icon, libraryIcon, UI, LIBRARY, ICON_SVG } from './lib/icons.ts';
export { suggestIcons } from './lib/iconsearch.ts';
export { EPOCH_DAY, EPOCH_MS } from './lib/calmodel.ts';
export { dayToYmd, ymdToDay, ymdString, pad2 } from './lib/tz.ts';
export type { SlDialog, SlInput, SlSelect, SlCheckbox, SlTextarea, SlDrawer } from './lib/shoelace.ts';

/**
 * The base of every editor. T is the document as the editor works with it.
 * Subclasses say how to read and write it, and render `this.doc`.
 */
export abstract class DocElement<T> extends LitElement {
  static properties = { value: {} };
  /** The document as text. Set by the shell; never set it from inside. */
  declare value: string;
  protected doc!: T;
  private emitted: string | null = null;

  constructor() {
    super();
    this.value = '';
  }

  protected abstract parse(text: string): T;
  protected abstract serialize(doc: T): string;
  /** Called after a document arrives from outside (not after your own commits). */
  protected loaded(): void {}

  /** Apps render into the page itself, so the one stylesheet styles them. */
  protected createRenderRoot() {
    return this;
  }

  protected willUpdate(changed: PropertyValues) {
    if (changed.has('value') && this.value !== this.emitted) {
      this.doc = this.parse(this.value);
      this.emitted = this.value;
      this.loaded();
    }
  }

  /** Focus the first element matching `sel` once the next render is done; `select` selects its text too. */
  protected focusSoon(sel: string, select = false) {
    void this.updateComplete.then(() => {
      const el = this.querySelector<HTMLElement>(sel);
      el?.focus();
      if (select && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) el.select();
    });
  }

  /** Replace the document. Redraws, and tells the shell to put it in the link. */
  protected commit(doc: T) {
    this.doc = doc;
    this.emitted = this.serialize(doc);
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('docchange', { detail: this.emitted, bubbles: true, composed: true }));
  }
}

/** Register an editor as <to-<id>>. */
export function defineElement(id: string, cls: CustomElementConstructor) {
  if (!customElements.get(`to-${id}`)) customElements.define(`to-${id}`, cls);
}

const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
/** A shortcut the way this keyboard writes it: "Mod+D" is ⌘D on a Mac, Ctrl+D elsewhere. */
export const keyLabel = (keys: string) => keys.replace(/Mod\+?/g, MAC ? '⌘' : 'Ctrl+').replace(/Alt\+?/g, MAC ? '⌥' : 'Alt+');

const keepFocusDown = (e: Event) => e.preventDefault();

export interface ToolOpts {
  disabled?: boolean;
  /** A toggle: whether it is on. */
  pressed?: boolean;
  /** Show the label beside the icon (then it needs no tip). */
  text?: boolean;
  size?: number;
  /** Its shortcut ("Mod+D"), shown in the tip the way this keyboard writes it. */
  key?: string;
  /** Leave the focus where it is: for a button that acts on a selection in an editor. */
  keepFocus?: boolean;
  /** A link rather than an action. */
  href?: string;
  /** With href: '_blank' opens it in a new tab. */
  target?: string;
  cls?: string;
}

/**
 * A toolbar button that is an icon to the eye and a name to everything
 * else: screen readers, the tip, and tests.
 */
export function tool(label: string, glyph: keyof typeof UI, onClick: (e: Event) => void, opts: ToolOpts = {}): TemplateResult {
  const { disabled = false, pressed, text = false, size = 14, key, keepFocus = false, href, target, cls = '' } = opts;
  const tip = key ? `${label} (${keyLabel(key)})` : label;
  return html`<sl-button class="${text ? '' : 'icon'} ${cls}" size="small" data-tip=${text && !key ? nothing : tip} href=${href ?? nothing} target=${href && target ? target : nothing} aria-label=${label} aria-pressed=${pressed === undefined ? nothing : String(pressed)} ?disabled=${disabled} @mousedown=${keepFocus ? keepFocusDown : nothing} @click=${onClick}>${icon(UI[glyph], size)}${text ? html` ${label}` : html`<span class="sr-only">${label}</span>`}</sl-button>`;
}

/**
 * A small plain button that is an icon: for the row of a list, where a
 * Shoelace button is too much. Styled once, as .to-icon-btn.
 */
export function btn(label: string, glyph: keyof typeof UI, onClick: (e: Event) => void, opts: { disabled?: boolean; size?: number; keepFocus?: boolean; cls?: string; tip?: string } = {}): TemplateResult {
  const { disabled = false, size = 14, keepFocus = false, cls = '', tip = label } = opts;
  return html`<button type="button" class="to-icon-btn ${cls}" data-tip=${tip} aria-label=${label} ?disabled=${disabled} @mousedown=${keepFocus ? keepFocusDown : nothing} @click=${onClick}>${icon(UI[glyph], size)}</button>`;
}

/** A less / value / more control. Pressing the value resets it, when `reset` says what that does. */
export function stepper(label: string, value: string, o: { less: string; more: string; onLess(): void; onMore(): void; canLess?: boolean; canMore?: boolean; reset?: string; onReset?(): void; glyphs?: [keyof typeof UI, keyof typeof UI] }): TemplateResult {
  const [lessGlyph, moreGlyph] = o.glyphs ?? ['zoomOut', 'zoomIn'];
  return html`<sl-button-group label=${label}>
    ${tool(o.less, lessGlyph, o.onLess, { disabled: o.canLess === false })}
    <sl-button size="small" data-tip=${o.reset ?? nothing} ?disabled=${!o.onReset} @click=${o.onReset}><span class="sr-only">${label}: </span>${value}${o.reset ? html`<span class="sr-only">. ${o.reset}</span>` : nothing}</sl-button>
    ${tool(o.more, moreGlyph, o.onMore, { disabled: o.canMore === false })}
  </sl-button-group>`;
}

/**
 * A row of colour swatches as a radio group. `colors` is id -> name and
 * hex; `names` can say what a colour stands for here ("Paul"). The arrow
 * keys move between them, as a radio group's do.
 */
export function swatches(label: string, colors: Record<string, { name: string; hex: string }>, current: string, pick: (id: string) => void, opts: { disabled?: boolean; names?: Record<string, string>; cls?: string } = {}): TemplateResult {
  const { disabled = false, names = {}, cls = '' } = opts;
  const ids = Object.keys(colors);
  const onKey = (e: KeyboardEvent) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = ids[(ids.indexOf(current) + d + ids.length) % ids.length];
    pick(next);
    (e.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-id="${next}"]`)?.focus();
  };
  return html`<div class="to-swatches ${cls}" role="radiogroup" aria-label=${label} @keydown=${onKey}>
    ${ids.map((id) => {
      const name = names[id] ? `${names[id]} (${colors[id].name})` : colors[id].name;
      return html`<button type="button" role="radio" data-id=${id} data-tip=${names[id] || colors[id].name} aria-label=${name} aria-checked=${current === id ? 'true' : 'false'} tabindex=${current === id || (!ids.includes(current) && id === ids[0]) ? 0 : -1} class=${colors[id].hex === 'transparent' ? 'none' : ''} style="--c:${colors[id].hex}" ?disabled=${disabled} @click=${() => pick(id)}></button>`;
    })}
  </div>`;
}

/** Say something briefly, from anywhere: the shell shows it. */
export const toast = (from: EventTarget, text: string) => from.dispatchEvent(new CustomEvent('to-toast', { detail: text, bubbles: true, composed: true }));

/** What to tell the person about an error: its message, or `fallback` when it has none. */
export const errorText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

/** Is this key event the given shortcut? "Mod" is Ctrl, or Command on a Mac. */
export function isKey(e: KeyboardEvent, combo: string): boolean {
  const parts = combo.split('+');
  const key = parts.pop()!;
  const want = (m: string) => parts.includes(m);
  return e.key.toLowerCase() === key.toLowerCase() && (e.ctrlKey || e.metaKey) === want('Mod') && e.altKey === want('Alt') && e.shiftKey === want('Shift');
}
