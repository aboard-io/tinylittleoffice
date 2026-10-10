/**
 * <to-drawer>: the menu behind the hamburger, a native <dialog> that slides in from the side. Find an app, a
 * template or a kept document; the apps as rows, each with its templates (<to-templates>, the home page's),
 * so a template is reachable from inside any app; Private or Saved; Keep the app on this device; Language;
 * Theme; the size of everything (zoom.ts); Keyboard shortcuts; Add to home screen where the browser offers it
 * (on an iPhone, the line that says how); Privacy (<to-privacy>: the signing key, what this device holds, everything in one zip); About. Under Saved, a switch shows pictures from the web always (kit/pictures.ts). The heading is
 * the Office mark beside the name. Anything that opens a document closes the drawer (it follows the hash).
 * Open a file… (a .tlo, a .md, a .txt: kit/open.ts) and Compare… (this document beside another link:
 * kit/compare.ts) sit above the switches.
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { apps } from './apps.ts';
import { templateHash } from './home.ts';
import { library } from './library.ts';
import { icon, UI } from './icons.ts';
import { routeHash } from './route.ts';
import { chosenLanguage, languageName, languages, onLanguage, setLanguage, t } from './i18n.ts';
import { THEMES, setTheme, theme, themeName, type Theme } from './theme.ts';
import { keeping, onPrivacy, setPrivate } from './privacy.ts';
import { canInstall, install, installByHand, offlineState, onOffline, setOffline } from './offline.ts';
import { size, SIZE_MAX, SIZE_MIN, stepSize } from './zoom.ts';
import { toast } from './toast.ts';
import { alwaysPictures, onPictures, setAlwaysPictures } from './pictures.ts';
import { mark } from './mark.ts';
import { openFile, OPENS } from './open.ts';
import { compareHash } from './compare.ts';
import { parseHash } from './route.ts';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import './preview.ts';
import type { ToDialog } from './dialog.ts';
import type { ToPrivacy } from './privacy-dialog.ts';
import './dialog.ts';
import './privacy-dialog.ts';

/** The threat model (docs/threat-model.md), read where the code is. */
export const THREAT_MODEL = 'https://github.com/ftrain/tinyoffice/blob/main/docs/threat-model.md';

export class ToDrawer extends LitElement {
  static properties = { find: { state: true }, open: { state: true } };
  declare find: string;
  declare open: boolean;
  private offs: (() => void)[] = [];

  constructor() {
    super();
    this.find = '';
    this.open = false;
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    const redraw = () => this.requestUpdate();
    const away = () => this.close();
    window.addEventListener('hashchange', away);
    this.offs = [onLanguage(redraw), onPrivacy(redraw), onOffline(redraw), onPictures(redraw), () => window.removeEventListener('hashchange', away)];
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    for (const off of this.offs) off();
  }
  get dialog(): HTMLDialogElement {
    return this.querySelector('dialog')!;
  }
  async show() {
    this.open = true;
    await this.updateComplete;
    if (!this.dialog.open) this.dialog.showModal();
    this.querySelector<HTMLInputElement>('.to-find')?.focus();
  }
  close() {
    if (this.dialog?.open) this.dialog.close();
  }

  private async togglePrivate(e: Event) {
    const box = e.target as HTMLInputElement;
    if (keeping() && !confirm(t('Save nothing on this device from now on? Your preferences, the offline copy, the list of your documents and your signing key are forgotten (the documents themselves live in their links).'))) {
      // The browser flipped the switch before the question was asked: Cancel puts it back.
      box.checked = true;
      this.requestUpdate();
      return;
    }
    await setPrivate(keeping());
    toast(keeping() ? t('Saved on this device from now on') : t('Private: nothing saved'));
  }

  /** A file chosen: opened as a document (the drawer closes as the address changes). */
  private opened(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (file) void openFile(file, parseHash(location.hash).app ?? location.pathname.split('/').slice(-2)[0]);
  }
  /** Compare, beginning with the document open now (if one is). */
  private compareHref(): string {
    const { app, payload } = parseHash(location.hash);
    return compareHash(app && payload ? { app, payload } : null);
  }

  /** What Find finds: apps (by name and blurb), templates (by name, blurb and app), kept documents (by title), each under its heading. */
  private renderFound(want: string, kept: ReturnType<typeof library>): TemplateResult {
    const has = (...words: string[]) => words.some((w) => w.toLowerCase().includes(want));
    const all = apps();
    const found = all.filter((a) => has(a.name, a.blurb));
    const templates = all.flatMap((a) => a.templates.filter((tpl) => has(tpl.name, tpl.blurb, a.name)).map((tpl) => ({ a, tpl })));
    const docs = kept.filter((k) => has(k.title)).flatMap((k) => all.filter((a) => a.id === k.app).map((a) => ({ a, k })));
    if (!found.length && !templates.length && !docs.length) return html`<p class="to-hint">${t('Nothing by that name')}</p>`;
    const group = (heading: string, rows: TemplateResult[]) => (rows.length ? html`<h3 class="to-drawer-head3">${heading}</h3>${rows}` : nothing);
    const row = (href: string, ico: Parameters<typeof icon>[0], name: string, sub = '', preview = false) => html`<a class="to-found" href=${href} @click=${() => this.close()}>${preview ? html`<to-preview hash=${href}></to-preview>` : icon(ico, 20)}<span class="to-found-words"><span>${name}</span>${sub ? html`<small>${sub}</small>` : nothing}</span></a>`;
    return html`${group(t('Apps'), found.map((a) => row(routeHash(a.id), a.icon, a.name)))}
      ${group(t('Templates'), templates.map(({ a, tpl }) => row(templateHash(a, tpl), a.icon, tpl.name, a.name)))}
      ${group(t('Documents'), docs.map(({ a, k }) => row(k.hash, a.icon, k.title || t('Untitled'), a.name, true)))}`;
  }

  render() {
    const want = this.find.trim().toLowerCase();
    const kept = library();
    const placeholder = kept.length ? t('Find app, template, or doc') : t('Find app, template');
    const offline = offlineState();
    const chosen = chosenLanguage() ?? '';
    return html`<dialog class="to-drawer" aria-label="Tiny Little Office" @close=${() => (this.open = false)} @click=${(e: Event) => e.target === this.dialog && this.close()}>
      <div class="to-drawer-inner">
        <header class="to-drawer-head">
          <a class="to-brand" href="#/" @click=${() => this.close()}>${unsafeHTML(mark(24))}<span>Tiny Little Office</span></a>
          <button type="button" class="to-btn to-tool" aria-label=${t('Close')} title=${t('Close')} @click=${() => this.close()}>${icon(UI.close)}</button>
        </header>
        ${this.open
          ? html`<nav class="to-drawer-apps" aria-label=${t('Apps')}>
                <input class="to-find" type="search" placeholder=${placeholder} aria-label=${placeholder} autocomplete="off" .value=${this.find} @input=${(e: Event) => (this.find = (e.target as HTMLInputElement).value)} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && (e.preventDefault(), this.querySelector<HTMLElement>('.to-drawer-apps a')?.click())} />
                ${want
                  ? this.renderFound(want, kept)
                  : apps().map(
                      (a) => html`<div class="to-app-head">
                        <a class="to-app-open" href=${routeHash(a.id)} @click=${() => this.close()}>${icon(a.icon, 20)}<span>${a.name}</span></a>
                        <to-templates .app=${a}></to-templates>
                      </div>`,
                    )}
              </nav>
              <section class="to-drawer-section to-drawer-files">
                <button type="button" class="to-btn to-drawer-open" @click=${() => this.querySelector<HTMLInputElement>('.to-open-input')?.click()}>${icon(UI.openFile, 18)}<span>${t('Open a file…')}</span></button>
                <input type="file" class="to-open-input" hidden accept=${OPENS} @change=${(e: Event) => this.opened(e.target as HTMLInputElement)} />
                <a class="to-btn to-drawer-compare" href=${this.compareHref()} @click=${() => this.close()}>${icon(UI.compare, 18)}<span>${t('Compare…')}</span></a>
              </section>
              <section class="to-drawer-section">
                <label class="to-switch">
                  <input type="checkbox" role="switch" .checked=${keeping()} @change=${(e: Event) => void this.togglePrivate(e)} />
                  <span class="to-switch-words"><b>${keeping() ? t('Saved on this device') : t('Private')}</b><small>${keeping() ? t('Your preferences, the offline copy and the documents you open stay here. Turn off to forget all of it.') : t('Nothing is saved on this device: no cookies, no trace.')}</small></span>
                </label>
                <label class="to-switch">
                  <input type="checkbox" role="switch" .checked=${offline.on} ?disabled=${offline.status === 'saving'} @change=${(e: Event) => void setOffline((e.target as HTMLInputElement).checked)} />
                  <span class="to-switch-words"><b>${t('Keep the app on this device')}</b><small>${offline.line}</small></span>
                </label>
                ${keeping()
                  ? html`<label class="to-switch to-pictures-switch">
                      <input type="checkbox" role="switch" .checked=${alwaysPictures()} @change=${(e: Event) => setAlwaysPictures((e.target as HTMLInputElement).checked)} />
                      <span class="to-switch-words"><b>${t('Always show pictures from the web')}</b><small>${t('Off, a picture another site holds waits for you to ask: fetching it tells that site who is reading.')}</small></span>
                    </label>`
                  : nothing}
              </section>
              <section class="to-drawer-section to-drawer-prefs">
                <label class="to-field">${icon(UI.language, 18)}<span>${t('Language')}</span>
                  <select @change=${(e: Event) => void setLanguage((e.target as HTMLSelectElement).value || null)}>
                    <option value="" ?selected=${!chosen}>${t('Match the device')}</option>
                    ${languages().map((c) => html`<option value=${c} ?selected=${c === chosen}>${languageName(c)}</option>`)}
                  </select>
                </label>
                <label class="to-field">${icon(theme() === 'dark' ? UI.moon : theme() === 'light' ? UI.sun : UI.auto, 18)}<span>${t('Theme')}</span>
                  <select @change=${(e: Event) => { setTheme((e.target as HTMLSelectElement).value as Theme); this.requestUpdate(); }}>
                    ${THEMES.map((th) => html`<option value=${th} ?selected=${th === theme()}>${themeName(th)}</option>`)}
                  </select>
                </label>
                <button type="button" class="to-btn to-drawer-privacy" @click=${() => void this.querySelector<ToPrivacy>('to-privacy')?.show()}>${icon(UI.key, 18)}<span>${t('Privacy and keys')}</span></button>
                <div class="to-field to-size" role="group" aria-label=${t('Size of everything')}>${icon(UI.view, 18)}<span>${t('Size of everything')}</span>
                  <span class="to-size-step">
                    <button type="button" class="to-btn to-tool to-size-less" aria-label=${t('Everything a little smaller')} title=${t('Everything a little smaller')} ?disabled=${size() <= SIZE_MIN} @click=${() => (stepSize(-1), this.requestUpdate())}>${icon(UI.minus, 16)}</button>
                    <button type="button" class="to-btn to-size-now" aria-label=${t('Back to the normal size')} title=${t('Back to the normal size')} @click=${() => (stepSize(0), this.requestUpdate())}>${Math.round(size() * 100)}%</button>
                    <button type="button" class="to-btn to-tool to-size-more" aria-label=${t('Everything a little larger')} title=${t('Everything a little larger')} ?disabled=${size() >= SIZE_MAX} @click=${() => (stepSize(1), this.requestUpdate())}>${icon(UI.plus, 16)}</button>
                  </span>
                </div>
                <button type="button" class="to-btn to-drawer-keys" @click=${() => { this.close(); this.dispatchEvent(new CustomEvent('to-keys', { bubbles: true })); }}>${icon(UI.keys, 18)}<span>${t('Keyboard shortcuts')}</span></button>
                ${canInstall()
                  ? html`<button type="button" class="to-btn to-install" @click=${() => void install()}>${icon(UI.download, 18)}<span>${t('Add to home screen')}</span></button>`
                  : installByHand()
                    ? html`<p class="to-hint to-install-how">${t('To add Tiny Little Office to the home screen: Share, then Add to Home Screen.')}</p>`
                    : nothing}
                <button type="button" class="to-btn to-drawer-about" @click=${() => void this.querySelector<ToDialog>('to-dialog.to-about-dialog')?.show()}>${icon(UI.info, 18)}<span>${t('About')}</span></button>
              </section>`
          : nothing}
      </div>
    </dialog>
    <to-privacy></to-privacy>
    <to-dialog class="to-about-dialog" heading=${t('About Tiny Little Office')} .body=${html`<p>${t('A tiny office suite that lives entirely in the URL. No server, no accounts, no saving: the link is the document.')}</p><p class="to-hint">${t('Nothing you write leaves your browser unless you share the link. A trip’s map is the one thing that asks the web by itself: its pictures come from OpenStreetMap while it is shown. Private by default: nothing is kept. Saved, the switch in this menu, keeps your settings and the documents you open on this device.')}</p><p class="to-hint">${t('A document can have a password: it is encrypted here, in the browser, and the link holds only ciphertext. It can be signed with a key this browser makes, so anyone can check that it is exactly what you signed, and under what name. Privacy and keys, in this menu, shows what this device holds.')}</p><p class="to-hint">${t('A picture a document holds by its address on another site is not fetched until you ask: fetching it would tell that site who is reading, and when. A link that leaves Tiny Little Office shows where it goes, and asks, before it opens.')}</p><p class="to-hint"><a class="to-about-threats" href=${THREAT_MODEL}>${t('What this protects against, and what it does not')}</a></p>`}></to-dialog>`;
  }
}
customElements.define('to-drawer', ToDrawer);
