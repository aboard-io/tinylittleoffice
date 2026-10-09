/**
 * <to-web>: the editor for a thing from the web: a box for its address,
 * and for a picture the words that say what it shows; the card it will
 * be, under them. Opened from Insert in a text, an outline or a deck.
 */
import { DocElement, defineElement, html, nothing, unsafeSVG, pageSvg, type SlInput } from '../kit.ts';
import { withHead } from '../lib/tlo.ts';
import { parseWeb } from '../lib/embeds.ts';
import { webCard } from './web.def.ts';
import './web.css';

export class ToWeb extends DocElement<{ url: string; alt: string }> {
  protected parse(text: string) {
    const { url, alt } = parseWeb(text);
    return { url, alt };
  }
  protected serialize(d: { url: string; alt: string }) {
    return withHead(d.url.trim(), d.alt.trim() ? { alt: d.alt.trim() } : {});
  }
  firstUpdated() {
    this.focusSoon('.web-url');
  }
  render() {
    const { embed } = parseWeb(this.serialize(this.doc));
    return html`<div class="web">
      <sl-input class="web-url" size="small" label="Address" placeholder="https://… a YouTube or Vimeo video, a Bluesky or X post, a picture" autocomplete="off" spellcheck="false" .value=${this.doc.url} @sl-input=${(e: Event) => this.commit({ ...this.doc, url: (e.target as SlInput).value })}></sl-input>
      ${embed?.kind === 'image' ? html`<sl-input class="web-alt" size="small" label="What the picture shows" placeholder="A few words, for anyone who cannot see it" .value=${this.doc.alt} @sl-input=${(e: Event) => this.commit({ ...this.doc, alt: (e.target as SlInput).value })}></sl-input>` : nothing}
      <p class="to-hint">${embed ? `${embed.provider}: shown as a card; loaded from ${embed.provider} only where a reader taps it.` : 'The document keeps the address and nothing else.'}</p>
      <div class="web-card">${unsafeSVG(pageSvg(webCard(this.serialize(this.doc)), 'role="img" aria-label="The card"'))}</div>
    </div>`;
  }
}
defineElement('web', ToWeb);

declare global {
  interface HTMLElementTagNameMap {
    'to-web': ToWeb;
  }
}
