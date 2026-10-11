/**
 * <to-share>: the Share dialog (Paul, 2026-10-09: "The short link function modal needs to be redesigned"). When the
 * document was first written and by whom; the head line, where the link fits, red past the link's limit, with Copy,
 * opening a table of the rooms it fits in (kit/limits.ts) on a hover or a tap; Copy link and Copy display link, and
 * the device's share sheet; Password and signature (drawn by <to-privacy>, renderProtect, handed in as `protect`);
 * a short link that expires (the lifetimes as one row, Make, then the link with Copy; its owner's Update, Extend and
 * Forget); posting the link to a service's compose box (through the link guard), a deck's show link; the QR code;
 * the embed code; the short links kept here.
 *
 * It gets the document through properties (`app`, `doc`, `heading`, `owned`, `expires`, `changed`, `payloadLength`,
 * `signature`, and `linkTo`, the link the shell projects, made current first) and says back what changes the
 * document's link: `to-owned` (detail: the short link this document now owns, or null, and when it expires), and
 * `to-link-copied` when the link (or the Display Link) is on the clipboard, so the document lives somewhere now. It is
 * drawn only while open. (Until round eight all of this was the shell's own.)
 */
import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { appOf } from './apps.ts';
import { budgetFor, encodeDoc } from './codec.ts';
import type { AppDef } from './app.ts';
import type { Locker } from './crypt.ts';
import { withHead } from '../doc/tlo.ts';
import { readEnvelope } from './envelope.ts';
import { ensureIcons, icon, iconNames, UI } from './icons.ts';
import { t } from './i18n.ts';
import { picture, raster, saveFile, slug, utf8, withPictures } from './exports.ts';
import { parseHash, routeHash, type Owned } from './route.ts';
import { fitLine, roomFor } from './limits.ts';
import { DEFAULT_TTL, EXPIRIES, expiresLine, forget, ownerLink, shorten, shortLink, update, type Shortened } from './short.ts';
import { dropKept, isKept, keepLink, keptLinks } from './links.ts';
import { keeping, pack, type Signature } from './privacy.ts';
import { store } from './store.ts';
import { QR_MAX_BYTES, qrSvg } from './qr.ts';
import { canShareNative, copyText, embedCode, mastodonHost, SERVICE_NAMES, SERVICES, shareNative, shareUrl, type Service } from './share.ts';
import { openLink } from './link-guard.ts';
import { toast } from './toast.ts';
import { place } from './menu.ts';
import { reveal } from './scroll.ts';
import type { ToDialog } from './dialog.ts';
import './dialog.ts';

/** The Mastodon server a link is posted to, asked once and remembered (under Saved; for the visit under Private). */
const MASTODON_KEY = 'tinyoffice.mastodon';

/** Where the lifetime chosen for short links is remembered (under Saved; for the visit under Private). */
const TTL_KEY = 'tinyoffice.shortTtl';
const savedTtl = () => {
  const n = Number(store.get(TTL_KEY));
  return EXPIRIES.some((x) => x.seconds === n) ? n : DEFAULT_TTL;
};

/** Where the site is served from: the page's folder, less an app's own page ("/sheet/") or the embed page's. */
export function siteDir(): string {
  const dir = location.pathname.replace(/[^/]*$/, '');
  const last = dir.split('/').slice(-2)[0];
  return last && (appOf(last) || last === 'embed') ? dir.slice(0, -(last.length + 1)) : dir;
}

/** A document as a fresh plain link in a new tab: "Copy of …", no owner, not signed, not yet written; sealed with the same password if it has one. */
export function openCopy(def: AppDef, doc: string, title: string, locker: Locker | null) {
  const copy = withHead(def.retitle(doc, t('Copy of {title}', { title })), { by: '', created: '', key: '', sig: '' });
  const open = (payload: string) => {
    const u = new URL(location.href);
    u.hash = routeHash(def.id, payload);
    window.open(u.href, '_blank', 'noopener');
    toast(t('A copy opened in a new tab'));
  };
  // A plain one opens at once, inside the tap.
  if (locker) void pack(copy, locker).then(open);
  else open(encodeDoc(copy));
}

export class ToShare extends LitElement {
  static properties = {
    app: { attribute: false },
    doc: { attribute: false },
    heading: { attribute: false },
    owned: { attribute: false },
    expires: { attribute: false },
    changed: { attribute: false },
    payloadLength: { attribute: false },
    signature: { attribute: false },
    protect: { attribute: false },
    displayOwner: { attribute: false },
    short: { state: true },
    shortTtl: { state: true },
    busy: { state: true },
    qrDisplay: { state: true },
    shortDisplay: { state: true },
    sharing: { state: true },
    askMastodon: { state: true },
  };
  declare app: string;
  declare doc: string;
  /** What the document is called. */
  declare heading: string;
  /** The short link this document may update: arrived from its owner link, or made here. */
  declare owned: Owned | null;
  /** When the short link this document is tied to expires, ms since the epoch; 0 when none is known. */
  declare expires: number;
  /** Edited since the short link last had this document. */
  declare changed: boolean;
  declare payloadLength: number;
  declare signature: Signature;
  /** The Password and signature part, drawn by <to-privacy>. */
  declare protect: TemplateResult | typeof nothing;
  /** The owner of a short link that opens the pages arrived with "?d": the short link goes on opening them. */
  declare displayOwner: boolean;
  declare short: Shortened | null;
  declare shortTtl: number;
  declare busy: boolean;
  /** Which link the QR code holds, and which a short link opens: the Display Link, or the editing one. */
  declare qrDisplay: boolean;
  declare shortDisplay: boolean;
  /** Open: what it shows (the QR code above all) is drawn only then. */
  declare sharing: boolean;
  /** Mastodon asked for with no server known: the field for one shows. */
  declare askMastodon: boolean;
  /** The link, made current first: the editing one, or the Display Link. */
  linkTo: (display: boolean) => string = () => location.href;

  constructor() {
    super();
    this.app = '';
    this.doc = '';
    this.heading = '';
    this.owned = null;
    this.expires = 0;
    this.changed = false;
    this.payloadLength = 0;
    this.signature = { state: 'none' };
    this.protect = nothing;
    this.displayOwner = false;
    this.short = null;
    this.shortTtl = savedTtl();
    this.busy = false;
    this.qrDisplay = false;
    this.shortDisplay = false;
    this.sharing = false;
    this.askMastodon = false;
  }
  createRenderRoot() {
    return this;
  }
  protected willUpdate(changed: PropertyValues<this>) {
    if (changed.has('displayOwner') && this.displayOwner) this.shortDisplay = true;
  }
  private say(name: string, detail: unknown) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
  }
  get link(): string {
    return this.linkTo(false);
  }
  /** The link (or the Display Link) copied: said to the shell, which then no longer warns before the tab closes. */
  private copyLink = async (link: string) => void ((await copyText(link)) && this.say('to-link-copied', null));
  get displayLink(): string {
    return this.linkTo(true);
  }
  /** What a short link opens. */
  private get shortTarget() {
    return this.shortDisplay ? this.displayLink : this.link;
  }

  /** Open; `short` scrolls it to the short link's section (the banner's Extend). */
  async show(short = false) {
    this.sharing = true;
    await this.updateComplete;
    await this.querySelector<ToDialog>('to-dialog.to-share-dialog')?.show();
    if (!short) return;
    const section = this.querySelector<HTMLElement>('.to-share-short');
    if (section) reveal(section, { block: 'start' });
    section?.querySelector<HTMLInputElement>('input[type=radio]:checked')?.focus({ preventScroll: true });
  }
  close() {
    this.querySelector<ToDialog>('to-dialog.to-share-dialog')?.close();
  }

  /** The lifetime chosen, remembered. */
  private setTtl(seconds: number) {
    this.shortTtl = seconds;
    store.set(TTL_KEY, String(seconds));
  }
  /** A short link made, updated or forgotten: one request, the outcome said, errors said too. */
  private async shortDo(work: () => Promise<void>) {
    this.busy = true;
    try {
      await work();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('Could not shorten the link.'));
    } finally {
      this.busy = false;
    }
  }
  /** A new short link; from here on this document owns it, and edits can be sent to it. */
  private makeShort = () =>
    this.shortDo(async () => {
      this.short = await shorten(this.shortTarget, this.shortTtl);
      this.say('to-owned', { owned: this.short.owned, expires: this.short.expires });
    });
  /** The short link given this version; with `seconds`, a longer life too. */
  private updateShort = (seconds?: number) =>
    this.shortDo(async () => {
      const owned = this.owned!;
      const { ver, expires } = await update(owned, this.shortTarget, seconds);
      this.say('to-owned', { owned, expires });
      toast(seconds ? expiresLine(expires, Date.now(), document.documentElement.lang) : t('Updated · version {n}', { n: ver }));
      if (isKept(ownerLink(owned))) keepLink({ owner: ownerLink(owned), title: this.heading, made: Date.now(), expires });
    });
  private forgetShort = () => {
    if (!confirm(t('Forget this short link? Anyone who opens it from now on finds nothing. Anyone who already opened it still has the document.'))) return;
    return this.shortDo(async () => {
      const owned = this.owned!;
      await forget(owned);
      dropKept(ownerLink(owned));
      this.short = null;
      this.say('to-owned', { owned: null, expires: 0 });
      toast(t('Forgotten'));
    });
  };
  private keepShort(short: Shortened) {
    keepLink({ owner: short.owner, title: this.heading, made: Date.now(), expires: short.expires });
    this.requestUpdate();
  }
  private async saveQr(svg: string, ext: 'png' | 'svg') {
    const file = `${slug(this.heading) || 'document'}-qr.${ext}`;
    if (ext === 'svg') return saveFile(file, 'image/svg+xml', utf8(svg));
    const side = 1024;
    const png = await raster(svg.replace(/width="\d+" height="\d+"/, `width="${side}" height="${side}"`), side, side);
    if (png) await saveFile(file, 'image/png', png);
  }

  /** When the document was first written, and by whom: "Created 9 Oct 2026, 14:03 · by Paul". */
  private madeLine(): string {
    const env = readEnvelope(this.doc);
    const lang = document.documentElement.lang || undefined;
    const when =
      env.created === null
        ? ''
        : t('Created {date}', { date: new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(env.created) });
    const by = env.by ? (this.signature.state === 'valid' ? t('by {name}', { name: env.by }) : t('by {name} (unsigned)', { name: env.by })) : '';
    return [when, by].filter(Boolean).join(' · ');
  }

  /** The one Share dialog: where the link fits, the two copies, the short link, the QR code, the short links kept here. */
  private renderShare() {
    const def = appOf(this.app)!;
    const share = async () => {
      await ensureIcons(iconNames(this.doc));
      return shareNative(this.heading, this.link, await picture(await withPictures(def.view(this.doc, { still: true }))));
    };
    const made = this.madeLine();
    return html`${made ? html`<p class="to-share-made">${made}</p>` : nothing}${this.renderFit()}
      <div class="to-share-links">
        <button type="button" class="to-btn to-share-copy to-copy-link" @click=${() => void this.copyLink(this.link)}><span>${icon(UI.link, 18)}${t('Copy link')}</span><small>${t('Opens in the editor')}</small></button>
        <button type="button" class="to-btn to-share-copy to-copy-display" @click=${() => void this.copyLink(this.displayLink)}><span>${icon(UI.view, 18)}${t('Copy display link')}</span><small>${t('Opens as pages to read')}</small></button>
        ${canShareNative() ? html`<button type="button" class="to-btn to-share-native" @click=${() => void share()}>${icon(UI.share, 18)}<span>${t('Share…')}</span></button>` : nothing}
      </div>
      ${this.protect}
      <section class="to-share-section to-share-short" aria-labelledby="to-share-short-h">
        <h3 id="to-share-short-h">${t('Short link that expires')}</h3>
        ${this.short ? this.renderMade(this.short) : this.owned ? this.renderOwned(this.owned) : this.renderMaker()}
      </section>
      ${this.renderPost()}
      ${this.renderQr()}
      ${this.renderEmbedCode()}
      ${this.renderKept()}`;
  }

  /** A deck's show link: the same deck, opening already presenting. */
  get showLink(): string {
    return `${this.link}?show`;
  }

  /** The link to a service's compose box: Bluesky, Mastodon (its server asked once), X, LinkedIn, Email; each opened through the link guard. */
  private post(service: Service) {
    const server = mastodonHost(store.get(MASTODON_KEY) ?? '');
    if (service === 'mastodon' && !server) {
      this.askMastodon = true;
      void this.updateComplete.then(() => this.querySelector<HTMLInputElement>('.to-mastodon-server')?.focus());
      return;
    }
    openLink(shareUrl(service, this.heading, this.link, server));
  }
  private setMastodon(e: Event) {
    e.preventDefault();
    const box = this.querySelector<HTMLInputElement>('.to-mastodon-server')!;
    const host = mastodonHost(box.value);
    box.setCustomValidity(host ? '' : t('A Mastodon server, like mastodon.social'));
    if (!box.reportValidity()) return;
    store.set(MASTODON_KEY, host);
    this.askMastodon = false;
    this.post('mastodon');
  }
  private renderPost() {
    const server = mastodonHost(store.get(MASTODON_KEY) ?? '');
    return html`<section class="to-share-section to-share-post" aria-labelledby="to-share-post-h">
      <h3 id="to-share-post-h">${t('Post the link')}</h3>
      <div class="to-post">${SERVICES.map(
        (s) => html`<button type="button" class="to-btn to-post-${s}" @click=${() => this.post(s)}>${icon(s === 'email' ? UI.mail : UI.post, 16)}<span>${SERVICE_NAMES[s]}</span></button>`,
      )}</div>
      ${
        this.askMastodon || server
          ? html`<form class="to-share-field to-mastodon" @submit=${(e: Event) => this.setMastodon(e)}>
            <input type="text" class="to-mastodon-server" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label=${t('Your Mastodon server')} placeholder="mastodon.social" .value=${server} />
            <button type="submit" class="to-btn">${server ? t('Change') : t('Post')}</button>
          </form>`
          : nothing
      }
      ${this.app === 'deck' ? html`<button type="button" class="to-btn to-copy-show" @click=${() => void copyText(this.showLink)}>${icon(UI.play, 16)}<span>${t('Copy show link')}</span></button><p class="to-hint">${t('Opens the deck already presenting.')}</p>` : nothing}
    </section>`;
  }
  /** The embed code: the document's pages in another site's page, in a frame. */
  get embedLink(): string {
    const u = new URL(this.link);
    u.pathname = `${siteDir()}embed/`;
    u.search = '';
    u.hash = routeHash(this.app, parseHash(u.hash).payload, 'embed');
    return u.href;
  }
  private renderEmbedCode() {
    return html`<section class="to-share-section to-share-embed" aria-labelledby="to-share-embed-h">
      <h3 id="to-share-embed-h">${t('Embed')}</h3>
      <p class="to-hint">${t('The pages, in a frame on another site, with a link to open them here.')}</p>
      <button type="button" class="to-btn to-copy-embed" @click=${() => void copyText(embedCode(this.embedLink, this.heading), t('Embed code copied'))}>${icon(UI.code, 16)}<span>${t('Copy embed code')}</span></button>
    </section>`;
  }

  /**
   * The head line: where the link fits, red once it is past the link's limit, with Copy; a hover or a tap on
   * the words opens the rooms it fits in, a small table in a popover (kit/limits.ts).
   */
  private renderFit() {
    const { available } = budgetFor(`${location.origin}${location.pathname}${routeHash(this.app)}/`);
    const over = this.payloadLength - available;
    const hover = (show: boolean) => (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const pop = this.querySelector<HTMLElement>('.to-rooms');
      const btn = e.currentTarget as HTMLElement;
      if (show && !pop?.matches(':popover-open')) (pop?.showPopover(), pop && place(pop, btn));
      else if (!show && !pop?.matches(':hover')) pop?.hidePopover();
    };
    const lang = document.documentElement.lang || undefined;
    const n = (x: number) => x.toLocaleString(lang);
    return html`<div class="to-share-fit ${over > 0 ? 'over' : ''}">
      <button type="button" class="to-btn to-fit-words" popovertarget="to-rooms" aria-haspopup="dialog" @pointerenter=${hover(true)} @pointerleave=${hover(false)} @click=${(e: Event) => {
        const btn = e.currentTarget as HTMLElement;
        requestAnimationFrame(() => this.querySelector<HTMLElement>('.to-rooms:popover-open') && place(this.querySelector<HTMLElement>('.to-rooms')!, btn));
      }}>${over > 0 ? t('{n} characters over the link limit', { n: n(over) }) : fitLine(this.link)}</button>
      <button type="button" class="to-btn to-tool to-fit-copy" aria-label=${t('Copy link')} title=${t('Copy link')} @click=${() => void this.copyLink(this.link)}>${icon(UI.copy, 18)}</button>
      <div id="to-rooms" class="to-rooms to-menu" popover="auto" role="dialog" aria-label=${t('Where the link fits')} @pointerleave=${(e: PointerEvent) => e.pointerType === 'mouse' && (e.currentTarget as HTMLElement).hidePopover()}>
        <table>
          <thead><tr><th scope="col">${t('Where')}</th><th scope="col">${t('Uses')}</th><th scope="col">${t('Left')}</th></tr></thead>
          <tbody>${roomFor(this.link).map(
            (r) =>
              html`<tr class=${r.left < 0 ? 'over' : ''}><th scope="row">${r.target.where()}</th><td>${n(r.used)} / ${n(r.target.max)}</td><td>${r.target.flat ? t('any length') : r.left < 0 ? t('{n} over', { n: n(-r.left) }) : n(r.left)}</td></tr>`,
          )}</tbody>
        </table>
      </div>
    </div>`;
  }

  /** Link or Display Link: a pair of buttons, the one chosen pressed. */
  private renderWhich(display: boolean, choose: (display: boolean) => void) {
    return html`<div class="to-seg to-which" role="group" aria-label=${t('Opens')}>
      <button type="button" class="to-btn" aria-pressed=${String(!display)} @click=${() => choose(false)}>${icon(UI.link, 16)}<span>${t('Link')}</span></button>
      <button type="button" class="to-btn" aria-pressed=${String(display)} @click=${() => choose(true)}>${icon(UI.view, 16)}<span>${t('Display Link')}</span></button>
    </div>`;
  }
  /** The lifetimes, one row of segments (a radio group) writing shortTtl. */
  private renderTtl() {
    return html`<fieldset class="to-seg to-ttl"><legend class="sr-only">${t('Expires after')}</legend>${EXPIRIES.map(
      (x) => html`<label><input type="radio" name="to-ttl" value=${x.seconds} .checked=${x.seconds === this.shortTtl} @change=${() => this.setTtl(x.seconds)} /><span>${x.name()}</span></label>`,
    )}</fieldset>`;
  }
  /** A link to copy: big, read-only, Copy at its right. */
  private renderField(link: string, cls: string, label: string, primary = true) {
    return html`<div class="to-share-field">
      <input type="text" class=${cls} readonly .value=${link} aria-label=${label} @focus=${(e: Event) => (e.target as HTMLInputElement).select()} />
      <button type="button" class="to-btn ${primary ? 'primary' : ''}" @click=${() => void copyText(link)}>${icon(UI.copy, 16)}<span>${t('Copy')}</span></button>
    </div>`;
  }
  private renderMaker() {
    return html`${this.renderTtl()}
      ${this.renderWhich(this.shortDisplay, (d) => (this.shortDisplay = d))}
      <p class="to-hint">${t('Encrypted here: the service holds only ciphertext, and only until then.')}</p>
      <button type="button" class="to-btn primary to-make" ?disabled=${this.busy} @click=${() => void this.makeShort()}>${icon(UI.link, 16)}<span>${this.busy ? t('Making…') : t('Make a short link')}</span></button>`;
  }
  /** Just made: the public link to share, big, and the owner's folded away. */
  private renderMade(short: Shortened) {
    const kept = isKept(short.owner);
    return html`${this.renderField(short.short, 'to-short-field', t('Short link'))}
      <p class="to-hint to-short-expires">${expiresLine(short.expires, Date.now(), document.documentElement.lang)}</p>
      <details class="to-owner">
        <summary>${t('Keep the owner link, to update it later')}</summary>
        ${this.renderField(short.owner, 'to-owner-field', t('Owner link'), false)}
        ${
          keeping()
            ? html`<button type="button" class="to-btn to-keep" ?disabled=${kept} @click=${() => this.keepShort(short)}>${icon(UI.check, 16)}<span>${kept ? t('Kept') : t('Keep on this device')}</span></button>`
            : html`<p class="to-hint">${t('Turn on Saved on this device, in the menu, to keep owner links here.')}</p>`
        }
      </details>`;
  }
  /** Opened from an owner link (or made here): the link, Update, the lifetimes with Extend, Forget. */
  private renderOwned(owned: Owned) {
    const link = shortLink(owned);
    return html`<p class="to-share-own">${t('You own this short link')}</p>
      ${this.renderField(link, 'to-short-field', t('Short link'), false)}
      ${this.expires ? html`<p class="to-hint to-short-expires">${expiresLine(this.expires, Date.now(), document.documentElement.lang)}</p>` : nothing}
      <button type="button" class="to-btn primary to-update" ?disabled=${this.busy || !this.changed} @click=${() => void this.updateShort()}>${icon(UI.link, 16)}<span>${this.busy ? t('Updating…') : this.changed ? t('Update') : t('Up to date')}</span></button>
      <div class="to-share-extend">
        ${this.renderTtl()}
        <button type="button" class="to-btn to-extend" ?disabled=${this.busy} @click=${() => void this.updateShort(this.shortTtl)}>${icon(UI.calendar, 16)}<span>${t('Extend')}</span></button>
      </div>
      <button type="button" class="to-btn to-forget" ?disabled=${this.busy} @click=${() => void this.forgetShort()}>${icon(UI.trash, 16)}<span>${t('Forget')}</span></button>`;
  }
  /** The QR code, drawn here when the link fits in one; else why not, in a sentence. */
  private renderQr() {
    const bytes = new TextEncoder().encode(this.qrDisplay ? this.displayLink : this.link);
    const fits = bytes.length <= QR_MAX_BYTES;
    const qr = fits ? qrSvg(bytes, 4) : '';
    return html`<section class="to-share-section to-share-qr" aria-labelledby="to-share-qr-h">
      <h3 id="to-share-qr-h">${t('QR code')}</h3>
      ${
        fits
          ? html`${this.renderWhich(this.qrDisplay, (d) => (this.qrDisplay = d))}
            <div class="to-qr-code" role="img" aria-label=${t('QR code of this document')}>${unsafeSVG(qr)}</div>
            <div class="to-row">
              <button type="button" class="to-btn" @click=${() => void this.saveQr(qr, 'png')}>${icon(UI.download, 16)}<span>PNG</span></button>
              <button type="button" class="to-btn" @click=${() => void this.saveQr(qr, 'svg')}>${icon(UI.download, 16)}<span>SVG</span></button>
            </div>`
          : html`<p class="to-hint to-qr-why">${t('This document is {n} bytes; the largest QR code holds {max}. Shorten it by {over} bytes and it will fit.', { n: bytes.length, max: QR_MAX_BYTES, over: bytes.length - QR_MAX_BYTES })}</p>`
      }
    </section>`;
  }
  /** The owner links kept on this device, folded: "2 short links kept here". */
  private renderKept() {
    const kept = keptLinks();
    if (!kept.length) return nothing;
    const lang = document.documentElement.lang;
    return html`<details class="to-share-section to-kept-list">
      <summary>${t('{n|# short link kept here|# short links kept here}', { n: kept.length })}</summary>
      <ul class="to-kept">${kept.map(
        (l) =>
          html`<li><a href=${l.owner} class="to-short-link">${l.title || l.owner}</a><small>${expiresLine(l.expires, Date.now(), lang)}</small><button type="button" class="to-btn to-tool" aria-label=${t('Remove')} title=${t('Remove')} @click=${() => (dropKept(l.owner), this.requestUpdate())}>${icon(UI.close, 16)}</button></li>`,
      )}</ul>
    </details>`;
  }

  render() {
    return html`<to-dialog class="to-share-dialog" heading=${this.heading} @to-close=${() => ((this.short = null), (this.sharing = false))} .body=${this.sharing ? this.renderShare() : nothing}></to-dialog>`;
  }
}
customElements.define('to-share', ToShare);
