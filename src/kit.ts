/**
 * Everything an app needs, from one import:
 *
 *   import { DocElement, defineElement, html, icon, UI, tool } from '../kit.ts';
 *
 * An editor is a DocElement: it is handed the document as text, turns it
 * into whatever it likes to work with, and calls commit() when that changes.
 * The shell does the rest (the link, saving, sharing, downloads).
 */
import { LitElement, html, type PropertyValues, type TemplateResult } from 'lit';
import { icon, UI } from './lib/icons.ts';

export { LitElement, html, svg, nothing, render, type PropertyValues, type TemplateResult } from 'lit';
export { state, property, query } from 'lit/decorators.js';
export { unsafeSVG } from 'lit/directives/unsafe-svg.js';
export { repeat } from 'lit/directives/repeat.js';
export * from './kit/core.ts';
export * from './kit/embed.ts';
export { REFRESH, ToEmbed, download, editRef, embeddable, formatsOf, fontsForPictures, insertMenu, insertOptions, loadEditor, picture, raster, saveFile, withFonts } from './kit/browser.ts';
export { icon, iconInner, libraryIcon, UI, LIBRARY, LIBRARY_NAMES, ICON_SVG } from './lib/icons.ts';
export { searchIcons, suggestIcons } from './lib/iconsearch.ts';
export { EPOCH_DAY, EPOCH_MS, isoDay } from './lib/calmodel.ts';
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

/**
 * A toolbar button that is an icon to the eye and a name to everything
 * else: screen readers, the tooltip, and tests.
 */
export function tool(label: string, glyph: keyof typeof UI, onClick: (e: Event) => void, opts: { disabled?: boolean; pressed?: boolean; text?: boolean; size?: number } = {}): TemplateResult {
  const { disabled = false, pressed, text = false, size = 14 } = opts;
  return html`<sl-tooltip content=${label} hoist ?disabled=${text}>
    <sl-button class=${text ? '' : 'icon'} size="small" aria-label=${label} aria-pressed=${pressed === undefined ? (undefined as unknown as string) : String(pressed)} ?disabled=${disabled} @click=${onClick}>${icon(UI[glyph], size)}${text ? html` ${label}` : html`<span class="sr-only">${label}</span>`}</sl-button>
  </sl-tooltip>`;
}

/** Is this key event the given shortcut? "Mod" is Ctrl, or Command on a Mac. */
export function isKey(e: KeyboardEvent, combo: string): boolean {
  const parts = combo.split('+');
  const key = parts.pop()!;
  const want = (m: string) => parts.includes(m);
  return e.key.toLowerCase() === key.toLowerCase() && (e.ctrlKey || e.metaKey) === want('Mod') && e.altKey === want('Alt') && e.shiftKey === want('Shift');
}
