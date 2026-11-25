/**
 * <to-share>: the Share dialog, "Share <title>" (issue #61, after Paul's of 2026-10-09). From the top: a card warning
 * that the URL is the document (nothing kept on a server, nothing synced; other people's changes come back only as a
 * new link), until "Don't show again"; the first way out, big: with a share sheet Share…, then Copy Link and the QR
 * code as icons; without, Copy Link and the QR code; the line saying where the link fits, a tap on it opening a table of the rooms it fits in
 * (kit/share/limits.ts); then the switches that say what every way out gives, each one's words behind an info button
 * beside its name (kit/ui/info-tip.ts): Preview Mode (the Display Link, pages to read), Password (drawn by <to-privacy>,
 * renderProtect, handed in as `protect`: it seals the document itself), Short Link (the lifetimes under "Expire after";
 * made at the first press, then kept for that link and lifetime: it cannot be changed or recalled once made) and, with a
 * share sheet, Share as Preview Card (the networks' and the sheet's preview card, kit/share/card.ts); the networks'
 * compose boxes as their marks (through the link guard), Email and Embed, and without a share sheet Share as Preview
 * Card under them; a deck's show link; the short links kept here.
 *
 * It gets the document through properties (`app`, `doc`, `heading`, `locked`, `payloadLength`, and
 * `linkTo`, the link the shell projects, made current first) and says back `to-link-copied` when the link (or the
 * Display Link) is on the clipboard or shared, so the document lives somewhere now. It is drawn only while open.
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { appOf, siteRoot } from '../core/apps.ts';
import { budgetFor, encodeDoc } from '../core/codec.ts';
import type { AppDef } from '../core/app.ts';
import type { Locker } from '../share/crypt.ts';
import { withHead } from '../../doc/tlo.ts';
import { ensureIcons, icon, iconNames, UI } from '../draw/icons.ts';
import { chosenLanguage, t } from '../core/i18n.ts';
import { picture, raster, saveFile, slug, utf8 } from '../file/exports.ts';
import { parseHash, routeHash } from '../core/route.ts';
import { fitLine, fitWords, limitWords, roomFor, shown } from '../share/limits.ts';
import { DEFAULT_TTL, EXPIRIES, expiresLine, SHORT_LINK_MAX, shorten, shortLink, type Shortened } from '../share/short.ts';
import { brand } from '../draw/brands.ts';
import { dropKept, keepLink, keptLinks } from '../share/kept-links.ts';
import { CARDS, cardFor, previewOn, setPreview, withCardId } from '../share/card.ts';
import { pack } from '../share/privacy.ts';
import { store } from '../core/store.ts';
import { QR_MAX_BYTES, qrSvg } from '../draw/qr.ts';
import { canShareNative, copyLater, copyText, embedCode, mastodonHost, SERVICE_NAMES, SERVICES, shareNative, shareUrl, type Service } from '../share/share.ts';
import { openLink } from './link-guard.ts';
import { infoTip, marked } from './info-tip.ts';
import { toast } from '../core/say.ts';
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

/** A phone or a tablet (a finger, no hover), whose share sheet copies the link itself: no Copy Link beside it. */
const touch = () => typeof matchMedia === 'function' && matchMedia('(hover: none) and (pointer: coarse)').matches;
/**
 * The share sheet's own picture: Apple's box with the arrow out of it on Apple's systems, the three linked nodes
 * elsewhere (Android's). Read from the browser's platform where it says one ("macOS", "iOS"; Chromium's), else from its
 * user agent (Safari's, an iPad's saying "Macintosh"), never from navigator.platform, which an emulator leaves as the host's.
 */
const sheetIcon = () => {
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.userAgent;
  return /macOS|iOS|Macintosh|iPhone|iPad|iPod/.test(platform) ? UI.shareUp : UI.share;
};

/** Where "Don't show again" under the card about links is remembered: on the device, Saved or Private (kit/core/store.ts). */
const NOTICE_KEY = 'tinyoffice.shareNoticeSeen';

/** Where the site is served from: the page's folder, less an app's own page ("/sheet/") or the embed page's. */
export const siteDir = (): string => new URL(siteRoot()).pathname;

/** A document as a fresh plain link in a new tab: "Copy of …", not yet written; sealed with the same password if it has one. */
export function openCopy(def: AppDef, doc: string, title: string, locker: Locker | null) {
  const copy = withHead(def.retitle(doc, t('share-copy-of-title', { title })), { by: '', created: '' });
  const open = (payload: string) => {
    const u = new URL(location.href);
    u.hash = routeHash(def.id, payload, '', false, null, chosenLanguage());
    window.open(u.href, '_blank', 'noopener');
    toast(t('share-copy-opened-in-new-tab'));
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
    locked: { attribute: false },
    payloadLength: { attribute: false },
    sizing: { state: true },
    protect: { attribute: false },
    present: { state: true },
    shortOn: { state: true },
    shortTtl: { state: true },
    busy: { state: true },
    noticed: { state: true },
    posting: { state: true },
    qr: { state: true },
    sharing: { state: true },
    askMastodon: { state: true },
    preview: { state: true },
  };
  declare app: string;
  declare doc: string;
  /** What the document is called. */
  declare heading: string;
  /** It has a password: nothing of it goes out but its ciphertext link, no picture, no title. */
  declare locked: boolean;
  declare payloadLength: number;
  /** Max Link Sizes open: its table is drawn only then (the link it reads is asked of the shell, which writes the address when asked). */
  declare sizing: boolean;
  /** The Password switch, drawn by <to-privacy>. */
  declare protect: TemplateResult | typeof nothing;
  /** The Preview Mode switch: every way out gives the Display Link. */
  declare present: boolean;
  /** The Short link switch: Copy link and the QR code give a short link to what they would give. */
  declare shortOn: boolean;
  declare shortTtl: number;
  /** A short link is being made. */
  declare busy: boolean;
  /** "Don't show again" pressed under the card about links. */
  declare noticed: boolean;
  /**
   * The network whose preview card is being drawn and posted: its button says so, and every post button waits for it.
   * Apart from `busy`: each is one button's work, and Copy link and the networks never wait for each other.
   */
  declare posting: Service | 'sheet' | null;
  /** The link the QR code dialog holds, while it is open. */
  declare qr: string;
  /** Open: what it shows is drawn only then. */
  declare sharing: boolean;
  /** Mastodon asked for with no server known: the field for one shows. */
  declare askMastodon: boolean;
  /** A network gets a preview of the first page with the link (the switch; on unless the person turned it off). */
  declare preview: boolean;
  /** The link, made current first: the editing one, or the Display Link. */
  linkTo: (display: boolean) => string = () => location.href;
  /** The short links made while the dialog was open, by what each opens and for how long, so a second Copy gives the same one. */
  private made = new Map<string, Promise<Shortened>>();
  /** The last short link made, said under the lifetimes with when it expires. */
  private lastShort: { key: string; short: Shortened } | null = null;

  constructor() {
    super();
    this.app = '';
    this.doc = '';
    this.heading = '';
    this.locked = false;
    this.payloadLength = 0;
    this.sizing = false;
    this.protect = nothing;
    this.present = false;
    this.shortOn = false;
    this.shortTtl = savedTtl();
    this.busy = false;
    this.noticed = store.get(NOTICE_KEY) === '1';
    this.posting = null;
    this.qr = '';
    this.sharing = false;
    this.askMastodon = false;
    this.preview = CARDS && previewOn();
  }
  createRenderRoot() {
    return this;
  }
  private say(name: string, detail: unknown) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
  }
  get link(): string {
    return this.linkTo(false);
  }
  /** What the document is called where the link goes (a post, the embed's frame): "Locked document" for a locked one. */
  private get named(): string {
    return this.locked ? t('common-locked-document') : this.heading;
  }
  get displayLink(): string {
    return this.linkTo(true);
  }
  /** What every way out gives before any shortening: the editing link, or the Display Link with Preview Mode on. */
  private get chosen(): string {
    return this.present ? this.displayLink : this.link;
  }
  /** The short link for what Copy link gives, at the lifetime chosen: made once, kept in the list of those made here (for the visit under Private). */
  private shortFor(target: string): Promise<string> {
    const key = `${this.shortTtl} ${target}`;
    let made = this.made.get(key);
    if (!made) {
      this.busy = true;
      made = shorten(target, this.shortTtl).then((short) => {
        keepLink({ link: short.short, title: this.locked ? '' : this.heading, made: Date.now(), expires: short.expires });
        this.lastShort = { key, short };
        return short;
      });
      made.catch(() => this.made.delete(key)).finally(() => (this.busy = false));
      this.made.set(key, made);
    }
    return made.then((s) => s.short);
  }
  /** What Copy link and the QR code give, the switches read: the link, or a short link to it, made now (errors said). */
  private async target(): Promise<string> {
    return this.shortOn ? this.shortFor(this.chosen) : this.chosen;
  }
  /**
   * Copy link: said to the shell, which then no longer warns before the tab closes. A short link is copied as it
   * comes, asked for inside the press (copyLater); a failure to make one says why, over "Could not copy".
   */
  private async copyChosen() {
    if (!this.shortOn) return void ((await copyText(this.chosen)) && this.say('to-link-copied', null));
    let why = '';
    const link = this.shortFor(this.chosen).catch((err: unknown) => {
      why = err instanceof Error ? err.message : t('share-could-not-shorten-link');
      throw err;
    });
    const ok = await copyLater(link);
    if (why) toast(why);
    if (ok) this.say('to-link-copied', null);
  }

  /** Open. */
  async show() {
    this.querySelector<ToDialog>('to-dialog.to-rooms-dialog')?.close();
    this.sharing = true;
    await this.updateComplete;
    await this.querySelector<ToDialog>('to-dialog.to-share-dialog')?.show();
  }
  /** Max Link Sizes, alone: Share, if open, is closed first, one dialog at a time (the header's meter). */
  async showRooms() {
    this.close();
    this.sizing = true;
    await this.updateComplete;
    await this.querySelector<ToDialog>('to-dialog.to-rooms-dialog')?.show();
  }
  /** A dialog opened from Share (Max Link Sizes, the QR code): Share steps aside for it and is back, as it was, when it closes (the kit's one modal at a time). */
  private async handOverTo(cls: string, back: HTMLElement) {
    const share = this.querySelector<ToDialog>('to-dialog.to-share-dialog');
    const next = this.querySelector<ToDialog>(`to-dialog.${cls}`);
    if (share && next) await share.handOver(next, back);
  }
  private async handOverRooms(back: HTMLElement) {
    this.sizing = true;
    await this.updateComplete;
    await this.handOverTo('to-rooms-dialog', back);
  }
  /** The QR code of what Copy link gives, in its own dialog; a short link made first if its switch is on. */
  private async handOverQr(back: HTMLElement) {
    try {
      this.qr = await this.target();
    } catch (err) {
      return toast(err instanceof Error ? err.message : t('share-could-not-shorten-link'));
    }
    await this.updateComplete;
    await this.handOverTo('to-qr-dialog', back);
  }
  close() {
    this.querySelector<ToDialog>('to-dialog.to-share-dialog')?.close();
  }
  /** Closed for good (not stepped aside): the next Share begins plain, its switches off, no short link made yet. */
  private onClose = () => {
    this.made.clear();
    this.lastShort = null;
    this.present = false;
    this.shortOn = false;
    this.sharing = false;
  };

  /** The lifetime chosen, remembered. */
  private setTtl(seconds: number) {
    this.shortTtl = seconds;
    store.set(TTL_KEY, String(seconds));
  }
  private hideNotice() {
    this.noticed = true;
    store.set(NOTICE_KEY, '1');
  }
  private async saveQr(svg: string, ext: 'png' | 'svg') {
    const file = `${(!this.locked && slug(this.heading)) || 'document'}-qr.${ext}`;
    if (ext === 'svg') return saveFile(file, 'image/svg+xml', utf8(svg));
    const side = 1024;
    const png = await raster(svg.replace(/width="\d+" height="\d+"/, `width="${side}" height="${side}"`), side, side);
    if (png) await saveFile(file, 'image/png', png);
  }

  /**
   * The card about links (issue #61), until "Don't show again", which is kept on the device whether or not the site
   * keeps anything else (kit/core/store.ts): a link is a copy, never a shared document (Paul, 2026-10-11: "docs are not
   * collaborative like Google Docs: that's fine. Communicate it in all the languages").
   */
  private renderNotice() {
    if (this.noticed) return nothing;
    return html`<aside class="to-share-notice" aria-labelledby="to-share-notice-h">
      <h3 id="to-share-notice-h" class="to-trust-line">${icon(UI.warning, 18)}<span>${marked(t('share-link-is-the-document'))}</span></h3>
      <p>${marked(t('share-notice-not-collaborative'))}</p>
      <p>${marked(t('share-notice-each-link'))}</p>
      <button type="button" class="to-btn to-notice-hide" @click=${() => this.hideNotice()}>${t('share-dont-show-again')}</button>
    </aside>`;
  }

  /**
   * The ways the link goes as it is, each a button of its own: with a share sheet, Share… first, then Copy Link (not on a
   * phone or a tablet, whose sheet copies) and the QR code as icons; without, Copy Link first and the QR code. All give what the switches under them say.
   */
  private renderCopy() {
    const over = this.shortOn && utf8(this.chosen).length > SHORT_LINK_MAX;
    const making = this.shortOn && this.busy;
    const wait = over || making || this.posting === 'sheet';
    const label = making ? t('share-making') : t('share-copy-link');
    const qr = html`<button type="button" class="to-btn to-tool to-share-alt to-qr-open" aria-haspopup="dialog" aria-label=${t('common-qr-code')} title=${t('common-qr-code')} ?disabled=${wait} @click=${(e: Event) => void this.handOverQr(e.currentTarget as HTMLElement)}>${icon(UI.qr, 22)}</button>`;
    if (canShareNative())
      return html`<div class="to-share-go">
        <button type="button" class="to-btn primary to-share-via" ?disabled=${wait} @click=${() => void this.shareVia()}>${icon(sheetIcon(), 20)}<span>${making ? t('share-making') : t('common-share')}</span></button>
        ${touch() ? nothing : html`<button type="button" class="to-btn to-tool to-share-alt to-copy-link" aria-label=${label} title=${label} ?disabled=${over || making} @click=${() => void this.copyChosen()}>${icon(UI.copy, 22)}</button>`}${qr}
      </div>`;
    return html`<div class="to-share-go">
      <button type="button" class="to-btn primary to-copy-link" ?disabled=${over || making} @click=${() => void this.copyChosen()}>${icon(UI.copy, 20)}<span>${label}</span></button>${qr}
    </div>`;
  }

  /**
   * Share as Preview Card: where a third party draws the link (the networks, and the share sheet), the preview card goes
   * with it (kit/share/card.ts). With a share sheet it is one of the switches; without, it is the networks' alone, under
   * their buttons. A document with a password sends no card: the switch is there, off
   * and greyed.
   */
  private renderPreviewSwitch() {
    if (!CARDS) return nothing;
    return html`<div class="to-share-option to-share-preview">
      <div class="to-share-option-head">
        <label class="to-switch">
          <input type="checkbox" role="switch" .checked=${this.preview && !this.locked} ?disabled=${this.locked} @change=${(e: Event) => this.setPreview((e.target as HTMLInputElement).checked)} />
          <span class="to-switch-words"><b>${t('share-show-preview-of-first-page')}</b></span>
        </label>
        ${infoTip('to-tip-preview', t('share-about-link-previews'), html`<p>${t('share-picture-of-first-page-and')}</p><p>${t('share-preview-kept-month')}</p>`)}
      </div>
    </div>`;
  }

  /** The switches: what every way out gives, each one's words behind its info button. */
  private renderSwitches() {
    return html`<div class="to-share-options">
      <div class="to-share-option to-share-present">
        <div class="to-share-option-head">
          <label class="to-switch">
            <input type="checkbox" role="switch" class="to-present-switch" .checked=${this.present} @change=${(e: Event) => (this.present = (e.target as HTMLInputElement).checked)} />
            <span class="to-switch-words"><b>${t('share-present-link')}</b></span>
          </label>
          ${infoTip('to-tip-present', t('share-about', { option: t('share-present-link') }), t('share-opens-as-pages-to-read'))}
        </div>
      </div>
      ${this.protect}
      ${this.renderShort()}
      ${canShareNative() ? this.renderPreviewSwitch() : nothing}
    </div>`;
  }

  /**
   * Short link: its switch, and while on, the lifetimes under "Expire after" and the last one made with when it
   * expires. Past what a short link holds (SHORT_LINK_MAX) a line says the numbers before anyone presses Copy (Paul,
   * 2026-10-11), and Copy waits; the toast stays for a document grown since.
   */
  private renderShort() {
    const n = utf8(this.chosen).length;
    const over = n - SHORT_LINK_MAX;
    const last = this.lastShort?.key === `${this.shortTtl} ${this.chosen}` ? this.lastShort.short : null;
    const about = html`<p>${marked(t('share-short-link-warning'))}</p><p>${marked(t('share-short-link-fixed'))}</p>`;
    return html`<div class="to-share-option to-share-short">
      <div class="to-share-option-head">
        <label class="to-switch">
          <input type="checkbox" role="switch" class="to-short-switch" .checked=${this.shortOn} @change=${(e: Event) => (this.shortOn = (e.target as HTMLInputElement).checked)} />
          <span class="to-switch-words"><b>${t('share-short-link-option')}</b></span>
        </label>
        ${infoTip('to-tip-short', t('share-about', { option: t('share-short-link-option') }), about)}
      </div>
      ${
        this.shortOn
          ? html`${this.renderTtl()}
            ${over > 0 ? html`<p class="to-hint to-short-why">${t('share-this-document-is-n-characters', { n, max: SHORT_LINK_MAX, over })}</p>` : nothing}
            ${last ? this.renderMade(last) : nothing}`
          : nothing
      }
    </div>`;
  }

  /** The one Share dialog. */
  private renderShare() {
    return html`${this.renderNotice()}${this.renderCopy()}${this.renderFit()}
      ${this.renderSwitches()}
      ${this.renderPost()}
      ${this.renderKept()}`;
  }

  /** A deck's show link: the same deck, opening already presenting. */
  get showLink(): string {
    const u = new URL(this.link);
    u.hash += u.hash.includes('?') ? '&show' : '?show';
    return u.href;
  }

  /**
   * What a way out other than a copy gives (a network, Email, the share sheet): the link as the switches make it
   * (Preview Mode, Short Link) and, where a third party draws it (`card`) with Share as Preview Card on and no password,
   * its preview card's id (drawn and posted once per link: kit/share/card.ts): in the path, /c/<id>, of a long link; as
   * ?c=<id> before the "#" of a short one, whose landing page says the card (tinier/tinier.ts). A card that could not be
   * made is said in a toast, and the link goes without it; a short link that could not be made throws.
   */
  private async handoff(card: boolean): Promise<string> {
    const base = this.chosen;
    const site = `${location.origin}${siteDir()}`;
    let id = '';
    if (card && !this.locked && this.preview) {
      try {
        await ensureIcons(iconNames(this.doc));
        id = await cardFor(`${site}card`, base, appOf(this.app)!, this.doc, this.heading);
      } catch (err) {
        toast(t('share-shared-without-preview-reason', { reason: err instanceof Error ? err.message : '' }));
      }
    }
    if (!this.shortOn) return id ? withCardId(base, id, site) : base;
    const short = await this.shortFor(base);
    const at = short.indexOf('#');
    return id ? `${short.slice(0, at)}?c=${id}${short.slice(at)}` : short;
  }
  private setPreview(on: boolean) {
    this.preview = on;
    setPreview(on);
  }
  /**
   * The link to a service's compose box: Bluesky, Mastodon (its server asked once), X, LinkedIn, Email; each opened through the link guard, the link as the switches make it (handoff). Email never carries a preview.
   * While a network's card is drawn and posted its button says 'Making the preview…' (Paul, 2026-10-12: "Make it look like the
   * button is working"), and a press on any post button does nothing.
   */
  private async post(service: Service) {
    if (this.posting) return;
    const server = mastodonHost(store.get(MASTODON_KEY) ?? '');
    if (service === 'mastodon' && !server) {
      this.askMastodon = true;
      void this.updateComplete.then(() => this.querySelector<HTMLInputElement>('.to-mastodon-server')?.focus());
      return;
    }
    const card = service !== 'email';
    if (!this.shortOn && (!card || this.locked || !this.preview)) return openLink(shareUrl(service, this.named, this.chosen, server));
    let link: string;
    this.posting = service;
    try {
      link = await this.handoff(card);
    } catch (err) {
      return toast(err instanceof Error ? err.message : t('share-could-not-shorten-link'));
    } finally {
      this.posting = null;
    }
    openLink(shareUrl(service, this.named, link, server));
  }
  private setMastodon(e: Event) {
    e.preventDefault();
    const box = this.querySelector<HTMLInputElement>('.to-mastodon-server')!;
    const host = mastodonHost(box.value);
    box.setCustomValidity(host ? '' : t('share-mastodon-server-like-mastodon-social'));
    if (!box.reportValidity()) return;
    store.set(MASTODON_KEY, host);
    this.askMastodon = false;
    void this.post('mastodon');
  }
  /**
   * Share…: the device's share sheet, given what the switches make (handoff, its preview card too) and a picture of
   * the first page unless there is a password. The button waits while the link and the picture are made, and no longer:
   * an open sheet (whose promise some browsers leave unsettled) never holds it. A sheet refused because the making took
   * too long (the press it was asked in had passed) says to press again: the link is made by then, and the next press
   * opens the sheet at once. Shared, it is said to the shell as a copy is: the document lives somewhere now.
   */
  private async shareVia() {
    if (this.posting) return;
    this.posting = 'sheet';
    let link: string;
    let png: Uint8Array | null = null;
    try {
      link = await this.handoff(true);
      await ensureIcons(iconNames(this.doc));
      if (!this.locked) png = await picture(appOf(this.app)!.view(this.doc, { still: true }));
    } catch (err) {
      return toast(err instanceof Error ? err.message : t('share-could-not-shorten-link'));
    } finally {
      this.posting = null;
    }
    const said = await shareNative(this.locked ? this.named : this.heading, link, png, `${(!this.locked && slug(this.heading)) || 'document'}.png`);
    if (said === 'refused') toast(t('share-ready-press-again'));
    if (said === 'shared') this.say('to-link-copied', null);
  }
  /** One post button: a network's mark (its name said, and shown while its preview is made), or Email's envelope and name. */
  private postButton(s: Service) {
    const busy = this.posting === s;
    const words = busy ? t('share-making-preview') : SERVICE_NAMES[s];
    if (s === 'email') return html`<button type="button" class="to-btn to-post-email" @click=${() => void this.post(s)}>${icon(UI.mail, 18)}<span>${words}</span></button>`;
    return html`<button type="button" class="to-btn to-post-${s} ${busy ? '' : 'to-tool'}" aria-busy=${busy ? 'true' : nothing} aria-label=${words} title=${SERVICE_NAMES[s]} @click=${() => void this.post(s)}>${brand(s)}${busy ? html`<span>${words}</span>` : nothing}</button>`;
  }
  /** The networks' compose boxes, Email and Embed; without a share sheet, the preview card's switch under them. */
  private renderPost() {
    const server = mastodonHost(store.get(MASTODON_KEY) ?? '');
    return html`<section class="to-share-section to-share-post" aria-label=${t('share-post-link')}>
      <div class="to-post">
        <div class="to-post-marks">${SERVICES.filter((s) => s !== 'email').map((s) => this.postButton(s))}</div>
        <div class="to-post-more">
          ${this.postButton('email')}
          <button type="button" class="to-btn to-copy-embed" title=${t('share-pages-in-frame-on-another')} @click=${() => void copyText(embedCode(this.embedLink, this.named), t('share-embed-code-copied'))}>${icon(UI.code, 18)}<span>${t('share-embed')}</span></button>
        </div>
      </div>
      ${
        this.askMastodon || server
          ? html`<form class="to-share-field to-mastodon" @submit=${(e: Event) => this.setMastodon(e)}>
            <input type="text" class="to-mastodon-server" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label=${t('share-your-mastodon-server')} placeholder="mastodon.social" .value=${server} />
            <button type="submit" class="to-btn">${server ? t('share-change') : t('share-post')}</button>
          </form>`
          : nothing
      }
      ${canShareNative() ? nothing : this.renderPreviewSwitch()}
      ${this.app === 'deck' ? html`<button type="button" class="to-btn to-copy-show" @click=${() => void copyText(this.showLink)}>${icon(UI.play, 16)}<span>${t('share-copy-show-link')}</span></button><p class="to-hint">${t('share-opens-deck-already-presenting')}</p>` : nothing}
    </section>`;
  }
  /** The embed code: the document's pages in another site's page, in a frame. */
  get embedLink(): string {
    const u = new URL(this.link);
    u.pathname = `${siteDir()}embed/`;
    u.search = '';
    const { payload, lang } = parseHash(u.hash);
    u.hash = routeHash(this.app, payload, 'embed', false, null, lang ?? null);
    return u.href;
  }

  /**
   * The line under Copy Link: where what it gives fits, red once the link is past the link's limit; a tap on the words
   * opens Max Link Sizes (renderRooms) in Share's place. With Short Link on, the short link's own size: every one is as
   * long as the next (its id and key), so it is known before one is made.
   */
  private renderFit() {
    const { available } = budgetFor(`${location.origin}${location.pathname}${routeHash(this.app)}/`);
    const over = this.shortOn ? 0 : this.payloadLength - available;
    const gives = this.shortOn ? shortLink('x'.repeat(7), 'x'.repeat(43)) : this.chosen;
    return html`<div class="to-share-fit ${over > 0 ? 'over' : ''}">
      <button type="button" class="to-btn to-fit-words" aria-haspopup="dialog" @click=${(e: Event) => void this.handOverRooms(e.currentTarget as HTMLElement)}>${over > 0 ? t('shell-n-characters-over-link-limit', { n: over }) : fitLine(gives)}</button>
    </div>`;
  }

  /** "Expire after" (a hint, spaced and set in as the option's other lines are), then the lifetimes: one row of segments (a radio group) writing shortTtl. */
  private renderTtl() {
    return html`<span id="to-ttl-label" class="to-hint">${t('share-expires-after')}</span>
      <div class="to-seg to-ttl" role="radiogroup" aria-labelledby="to-ttl-label">${EXPIRIES.map(
        (x) => html`<label><input type="radio" name="to-ttl" value=${x.seconds} .checked=${x.seconds === this.shortTtl} @change=${() => this.setTtl(x.seconds)} /><span>${x.name()}</span></label>`,
      )}</div>`;
  }
  /** The short link last made: big, read-only, Copy at its right, and when it expires. */
  private renderMade(short: Shortened) {
    return html`<div class="to-share-field">
        <input type="text" class="to-short-field" readonly .value=${short.short} aria-label=${t('common-short-link')} @focus=${(e: Event) => (e.target as HTMLInputElement).select()} />
        <button type="button" class="to-btn" @click=${() => void copyText(short.short)}>${icon(UI.copy, 16)}<span>${t('common-copy')}</span></button>
      </div>
      <p class="to-hint to-short-expires">${expiresLine(short.expires, Date.now(), document.documentElement.lang)}</p>`;
  }
  /** The QR code of what Copy link gave, drawn when the link fits in one; else why not, in a sentence. */
  private renderQr() {
    const bytes = new TextEncoder().encode(this.qr);
    const fits = bytes.length <= QR_MAX_BYTES;
    const qr = fits ? qrSvg(bytes, 4) : '';
    return fits
      ? html`<div class="to-qr-code" role="img" aria-label=${t('common-qr-code-of-this-document')}>${unsafeSVG(qr)}</div>
          <div class="to-row">
            <button type="button" class="to-btn" @click=${() => void this.saveQr(qr, 'png')}>${icon(UI.download, 16)}<span>PNG</span></button>
            <button type="button" class="to-btn" @click=${() => void this.saveQr(qr, 'svg')}>${icon(UI.download, 16)}<span>SVG</span></button>
          </div>`
      : html`<p class="to-hint to-qr-why">${t('share-this-document-is-n-bytes', { n: bytes.length, max: QR_MAX_BYTES, over: bytes.length - QR_MAX_BYTES })}</p>`;
  }
  /** The short links made on this device, folded: "2 short links kept here". */
  private renderKept() {
    const kept = keptLinks();
    if (!kept.length) return nothing;
    const lang = document.documentElement.lang;
    return html`<details class="to-share-section to-kept-list">
      <summary>${t('share-n-short-links-kept-here', { n: kept.length })}</summary>
      <ul class="to-kept">${kept.map(
        (l) =>
          html`<li><a href=${l.link} class="to-short-link">${l.title || l.link}</a><small>${expiresLine(l.expires, Date.now(), lang)}</small><button type="button" class="to-btn to-tool" aria-label=${t('share-remove')} title=${t('share-remove')} @click=${() => (dropKept(l.link), this.requestUpdate())}>${icon(UI.close, 16)}</button></li>`,
      )}</ul>
    </details>`;
  }

  /**
   * Max Link Sizes: the table of where the link fits, a dialog of its own beside Share, placed as Share is (Paul,
   * 2026-10-16: "Make the sizing menu dismissable and give it a title: 'Max Link Sizes'… Position it exactly as you
   * position the share menu. If one is invoked then hide the other one"): the header's meter opens it alone, Share's
   * head line opens it in Share's place.
   */
  private renderRooms() {
    return html`<to-dialog class="to-rooms-dialog" heading=${t('share-max-link-sizes')} @to-close=${() => (this.sizing = false)} .body=${
      !this.sizing
        ? nothing
        : html`<div class="to-rooms">
        <table class="to-table">
          <caption>${t('share-this-link-n-characters-n-bytes', { n: this.link.length, bytes: utf8(this.link).length })}</caption>
          <thead><tr><th scope="col">${t('share-where')}</th><th scope="col">${t('share-limit')}</th><th scope="col">${t('share-fits')}</th></tr></thead>
          <tbody>${shown(roomFor(this.link)).map(
            (r) => html`<tr class=${r.left < 0 ? 'over' : ''} data-target=${r.target.id}><th scope="row">${r.target.where()}</th><td>${limitWords(r)}</td><td>${fitWords(r)}</td></tr>`,
          )}</tbody>
        </table>
      </div>`
    }></to-dialog>`;
  }
  render() {
    return html`<to-dialog class="to-share-dialog" heading=${t('share-share-title', { title: this.heading })} @to-close=${this.onClose} .body=${this.sharing ? this.renderShare() : nothing}></to-dialog>${this.renderRooms()}
      <to-dialog class="to-qr-dialog" heading=${t('common-qr-code')} @to-close=${() => (this.qr = '')} .body=${this.qr ? this.renderQr() : nothing}></to-dialog>`;
  }
}
customElements.define('to-share', ToShare);
