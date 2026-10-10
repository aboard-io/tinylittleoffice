/**
 * <to-palette>: every command in force, found by typing (Mod+K, or the button at a bar's end). The list is the
 * registry (kit/commands.ts) as it stands where the person was: the words' commands when words had the focus, the
 * open app's, the page's; each with its keys beside it. Letters typed narrow it to the commands with a word that
 * starts with them (case and accents aside); Up and Down move, round the ends; Enter or a tap runs one, after the
 * focus has gone back where it was, so a command on the words finds them selected as they were. Escape closes it.
 * A native modal <dialog>, the kit's dialog's look; the input is a combobox over a listbox (the ARIA pattern).
 */
import { LitElement, html, nothing } from 'lit';
import { keysText, run, type Command } from './commands.ts';
import { t } from './i18n.ts';
import { icon } from './icons.ts';
import { fold } from './search.ts';
import { reveal } from './scroll.ts';

/** A command and the context it is run in. */
export interface Offer {
  cmd: Command;
  c: unknown;
}

export class ToPalette extends LitElement {
  static properties = { offers: { state: true }, query: { state: true }, at: { state: true } };
  declare offers: Offer[];
  declare query: string;
  /** The highlighted row, in the list as narrowed. */
  declare at: number;
  /** What had the focus before: it has it again before a command runs. */
  private from: HTMLElement | null = null;

  constructor() {
    super();
    this.offers = [];
    this.query = '';
    this.at = 0;
  }
  createRenderRoot() {
    return this;
  }
  get dialog(): HTMLDialogElement {
    return this.querySelector('dialog')!;
  }
  get isOpen(): boolean {
    return !!this.dialog?.open;
  }
  /** Open over these commands, the box empty and the first highlighted. */
  async show(offers: Offer[]) {
    this.from = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.offers = offers;
    this.query = '';
    this.at = 0;
    await this.updateComplete;
    if (!this.dialog.open) this.dialog.showModal();
    this.querySelector<HTMLInputElement>('.to-palette-find')?.focus();
  }
  close() {
    if (this.dialog?.open) this.dialog.close();
  }
  /** The commands left by what is typed. */
  shown(): Offer[] {
    const q = fold(this.query.trim());
    if (!q) return this.offers;
    return this.offers.filter((o) => {
      const words = fold(o.cmd.label(o.c));
      return words.startsWith(q) || words.split(/[\s\-–—/(),.…:]+/).some((w) => w.startsWith(q));
    });
  }
  /** A command chosen: the palette closes, the focus goes back, then it runs. */
  private choose(o: Offer | undefined) {
    if (!o) return;
    this.close();
    this.from?.focus({ preventScroll: true });
    void run(o.cmd, o.c);
  }
  private onKey = (e: KeyboardEvent) => {
    if (e.isComposing) return;
    const n = this.shown().length;
    const go = (i: number) => {
      e.preventDefault();
      this.at = n ? (i + n) % n : 0;
      void this.updateComplete.then(() => reveal(this.querySelector('.to-palette-item[aria-selected=true]')));
    };
    if (e.key === 'ArrowDown') go(this.at + 1);
    else if (e.key === 'ArrowUp') go(this.at - 1);
    else if (e.key === 'Home' && !this.query) go(0);
    else if (e.key === 'End' && !this.query) go(n - 1);
    else if (e.key === 'Enter') {
      e.preventDefault();
      this.choose(this.shown()[this.at]);
    }
  };
  render() {
    const shown = this.isOpen || this.offers.length ? this.shown() : [];
    const active = Math.min(this.at, shown.length - 1);
    return html`<dialog class="to-dialog to-palette" aria-label=${t('All commands…')} @close=${() => (this.offers = [])} @click=${(e: Event) => e.target === this.dialog && this.close()}>
      <div class="to-dialog-inner">
        <input
          class="to-palette-find"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="to-palette-list"
          aria-autocomplete="list"
          aria-activedescendant=${active >= 0 ? `to-palette-${active}` : nothing}
          aria-label=${t('Find a command')}
          placeholder=${t('Find a command')}
          autocomplete="off"
          spellcheck="false"
          enterkeyhint="go"
          .value=${this.query}
          @input=${(e: Event) => ((this.query = (e.target as HTMLInputElement).value), (this.at = 0))}
          @keydown=${this.onKey}
        />
        <div id="to-palette-list" class="to-palette-list" role="listbox" aria-label=${t('All commands…')}>
          ${shown.length
            ? shown.map(
                (o, i) => html`<div id="to-palette-${i}" class="to-palette-item" role="option" aria-selected=${String(i === active)} @pointermove=${() => (this.at = i)} @click=${() => this.choose(o)}>
                  ${o.cmd.icon ? icon(o.cmd.icon, 18) : html`<span class="to-palette-noicon"></span>`}<span class="to-palette-words">${o.cmd.label(o.c)}</span>${o.cmd.keys ? html`<kbd class="to-menu-keys">${keysText(o.cmd.keys)}</kbd>` : nothing}
                </div>`,
              )
            : this.query
              ? html`<p class="to-hint" role="status">${t('Nothing starts “{q}”', { q: this.query })}</p>`
              : nothing}
        </div>
      </div>
    </dialog>`;
  }
}
if (!customElements.get('to-palette')) customElements.define('to-palette', ToPalette);

declare global {
  interface HTMLElementTagNameMap {
    'to-palette': ToPalette;
  }
}
