/**
 * <to-avatar>: a person drawn small on a host's page (docs/library.md, The kit's small pieces): their initials
 * (kit/ui/initials.ts `initial`) in a disc of a hue of their own (`hueOf`), the same for the same name on a Board's
 * card, in a typed table's person cell and here, with their name for a screen reader and as the disc's title. A page
 * draws one beside a lead's owner, a document's people, a task's assignee.
 *
 * - `name`: the person's. `href`: where the disc opens (a link); without it, a plain disc. `size`: `s` (1.5rem, a
 *   table's), `m` (1.75rem, the default) or `l` (2.5rem, a page's header); a page may set `--to-av-size` instead.
 * - A few in a row (a document's people) go in a `.to-avatars`, each overlapping the one before it a little.
 */
import { LitElement, html, nothing } from 'lit';
import { hueOf, initial } from './initials.ts';

export class ToAvatar extends LitElement {
  static properties = {
    name: {},
    href: {},
    size: { reflect: true },
  };
  declare name: string;
  declare href: string;
  declare size: 's' | 'm' | 'l';

  constructor() {
    super();
    this.name = '';
    this.href = '';
    this.size = 'm';
  }
  createRenderRoot() {
    return this;
  }
  render() {
    const name = this.name.trim();
    const inner = html`<span aria-hidden="true">${initial(name)}</span>${name ? html`<span class="sr-only">${name}</span>` : nothing}`;
    const style = `--to-av-hue: ${hueOf(name)}`;
    return this.href
      ? html`<a class="to-av" href=${this.href} style=${style} title=${name || nothing}>${inner}</a>`
      : html`<span class="to-av" style=${style} title=${name || nothing}>${inner}</span>`;
  }
}
if (!customElements.get('to-avatar')) customElements.define('to-avatar', ToAvatar);

declare global {
  interface HTMLElementTagNameMap {
    'to-avatar': ToAvatar;
  }
}
