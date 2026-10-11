/**
 * <to-drawer>: the menu behind the hamburger, a native <dialog> that slides in from the side the menu button is on
 * (the inline end), flush with that edge, one hairline against the backdrop. With a document open it begins, under
 * the head (the language, Close), with This document: a small heading over full-width rows, New {noun} (a blank
 * document of the app, `def`: the header's icon goes home now, kit/chrome.ts), Share… and Download (the table of
 * formats, `downloads`, its menu), and the page's other commands drawn in the drawer (Find in this document: a phone's
 * way to it), each with its keys at the right where there is a keyboard (kit/bar.ts keysKbd; the review of 2026-10-11:
 * never under a finger until a key with Ctrl, ⌘ or Alt is typed, and never part of the row's name). Then the size of everything (zoom.ts,
 * the page's commands of kit/keys.ts), first under the head on the home page. They are here alone: the header is
 * the title (Paul, 2026-10-10: "Let's get rid of share and download in the top nav and move that functionality to the
 * hamburger"), and on a phone, while a box has the focus, the header steps aside (kit/chrome.ts). On a touch screen the
 * dialog itself holds the focus (the search would raise the keyboard) and draws no ring for it: it is not a control,
 * and the ring drawn outside the panel stood apart from its edge as a stray line. Then: find an app, a
 * template or a kept document; in a document, the apps as rows, each with its templates (<to-templates>, the home
 * page's; on the home page itself the rows are the page, so the drawer has none: Paul, 2026-10-10),
 * so a template is reachable from inside any app; Private or Saved; Language;
 * Theme; Keyboard shortcuts; Add to home screen where the browser offers it (install.ts)
 * (on an iPhone, the line that says how); Privacy (<to-privacy>: the signing key, what this device holds, everything in one zip); About (which links /network, what leaves your browser: kit/network.ts; says what the site does not protect against, limits(); and names the commit it runs, from /version.json, kit/version.ts, read when About opens). Under Saved, a switch shows pictures from the web always (kit/pictures.ts). The heading is
 * the Office mark beside the name. Anything that opens a document closes the drawer (it follows the hash).
 * Open a file… (a .tlo, a .md, a .txt, a zip of them: kit/open.ts) and Compare… (this document beside another link:
 * kit/compare.ts) sit above the switches.
 *
 * The drawer is a menu: a row that opens a dialog (Share…, an app's templates, Privacy and keys, Keyboard shortcuts,
 * About, a command) closes the drawer first and opens it, one modal at a time, and when that dialog closes the focus is
 * on the hamburger, where the drawer was opened from (handOver; Paul, 2026-10-10: "the outer one hands over"). The
 * dialogs it opens are drawn beside its own <dialog>, not in it: an app's templates in one <to-templates bare>.
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import type { AppDef } from './app.ts';
import { apps, siteRoot } from './apps.ts';
import { templateHash } from './home.ts';
import { library } from './library.ts';
import { icon, UI } from './icons.ts';
import { startEditing } from './chrome.ts';
import { routeHash } from './route.ts';
import { chosenLanguage, languageName, languages, onLanguage, setLanguage, t } from './i18n.ts';
import { THEMES, setTheme, theme, themeName, type Theme } from './theme.ts';
import { keeping, onPrivacy, setPrivate } from './privacy.ts';
import { canInstall, install, installByHand, onInstall } from './install.ts';
import { size } from './zoom.ts';
import { toast } from './toast.ts';
import { reveal } from './scroll.ts';
import { alwaysPictures, onPictures, setAlwaysPictures } from './pictures.ts';
import { openFile, OPENS } from './open.ts';
import { compareHash } from './compare.ts';
import { currentHash, parseHash } from './route.ts';
import { commitUrl, running, sourceFile, type Version } from './version.ts';
import './preview.ts';
import { handBack, type ToDialog } from './dialog.ts';
import type { ToTemplates } from './home.ts';
import type { MenuItem } from './menu.ts';
import './menu.ts';
import { coarse, drawnIn, inScope, labelOf, live, run, type Command } from './commands.ts';
import { keysAria, keysKbd } from './bar.ts';
import { DOWNLOAD, KIT_COMMANDS, LARGER, NORMAL_SIZE, SHARE, SMALLER, type Page } from './keys.ts';
import type { Offer } from './palette.ts';
import type { ToPrivacy } from './privacy-dialog.ts';
import './dialog.ts';
import './privacy-dialog.ts';

/**
 * What the site does not protect against: the threat model's (docs/threat-model.md) list, in a few plain sentences,
 * in the page's language. About's last section; its link goes there (the review of 2026-10-11: the link to the
 * document on GitHub was in English and, while the repository was private, a 404). Under the list, the document
 * itself, in the public repository (kit/version.ts sourceFile), said to be in English.
 */
/** The size of everything's commands, drawn as the stepper rather than as rows of This document. */
const STEPPER: readonly Command<never>[] = [SMALLER, NORMAL_SIZE, LARGER];

const limits = () => [
  t('The browser’s history, and its sync if that is on: the address bar holds the document, so they hold it too. Private does not change what the browser records.'),
  t('Anyone you give the link to, and everything it passes through on the way (a chat, an email, a link preview): a link is a copy, and it cannot be called back.'),
  t('A screenshot, a photo of the screen, a printout or an export: once shown, it is shown.'),
  t('A weak password: the link holds all anyone needs to guess at it, as fast as they like. A long one, or one Generate makes, holds.'),
  t('Whoever serves the code, and the browser it runs in: the site, an extension or malware on the device can read what is shown and what is typed.'),
];

export class ToDrawer extends LitElement {
  static properties = {
    find: { state: true },
    open: { state: true },
    version: { state: true },
    templatesOf: { state: true },
    downloads: { attribute: false },
    def: { attribute: false },
    page: { attribute: false },
    commands: { attribute: false },
  };
  /** The open document's formats, for its Download; null on the home page (and no This document then). */
  declare downloads: MenuItem[] | null;
  /** What Share and Download act on: the shell. */
  declare page: Page | null;
  /** The app's commands that need nothing in hand (the registry's `document`), asked for as the drawer draws: under a finger they are This document's rows too, the bar being away while reading. */
  declare commands: (() => Offer[]) | null;
  /** The open document's app, for its New row. */
  declare def: AppDef | null;
  declare find: string;
  declare open: boolean;
  /** The build this is, once About has asked (null: there is no /version.json, as on the dev server). */
  declare version: Version | null;
  /** The app whose templates were asked for from its row: the one <to-templates bare> shows them. */
  declare templatesOf: AppDef | null;
  private offs: (() => void)[] = [];

  constructor() {
    super();
    this.find = '';
    this.open = false;
    this.version = null;
    this.templatesOf = null;
    this.downloads = null;
    this.def = null;
    this.page = null;
    this.commands = null;
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    const redraw = () => this.requestUpdate();
    const away = () => this.close();
    window.addEventListener('hashchange', away);
    // The size row says the size as a pinch changes it (kit/pinch.ts), the drawer open or not.
    window.addEventListener('to-size', redraw);
    this.offs = [
      onLanguage(redraw),
      onPrivacy(redraw),
      onInstall(redraw),
      onPictures(redraw),
      () => window.removeEventListener('hashchange', away),
      () => window.removeEventListener('to-size', redraw),
    ];
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
    // The search takes the focus only where a keyboard is already there: on a touch screen the focus would bring the
    // keyboard up over the menu (Paul, 2026-10-10), so the dialog itself holds it and a tap on the field asks for one.
    // (Not a touch screen, as the rest of the kit asks it: a device with no pointer at all has its keys.)
    if (!matchMedia('(pointer: coarse)').matches) this.querySelector<HTMLInputElement>('.to-find')?.focus();
    else this.dialog.focus({ preventScroll: true });
  }
  close() {
    if (this.dialog?.open) this.dialog.close();
  }

  /** A row that opens a dialog: the drawer closes, the focus goes to the hamburger, and the dialog opens; its way back is the hamburger. */
  private handOver(open: () => unknown) {
    return handBack(() => this.close(), document.querySelector<HTMLElement>('.to-burger'), open);
  }
  /** An app's templates, from its row: the drawer's one templates dialog, the drawer closed first. */
  private async templates(app: AppDef) {
    this.templatesOf = app;
    await this.updateComplete;
    this.querySelector<ToTemplates>('to-templates.to-drawer-templates')?.show();
  }

  private async togglePrivate(e: Event) {
    const box = e.target as HTMLInputElement;
    if (
      keeping() &&
      !confirm(t('Save nothing on this device from now on? Your preferences, the list of your documents and your signing key are forgotten (the documents themselves live in their links).'))
    ) {
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
    const { app, payload } = parseHash(currentHash());
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
    const row = (href: string, ico: Parameters<typeof icon>[0], name: string, sub = '', preview = false) =>
      html`<a class="to-found" href=${href} @click=${() => this.close()}>${preview ? html`<to-preview hash=${href}></to-preview>` : icon(ico, 20)}<span class="to-found-words"><span>${name}</span>${sub ? html`<small>${sub}</small>` : nothing}</span></a>`;
    return html`${group(
      t('Apps'),
      found.map((a) => row(routeHash(a.id), a.icon, a.name)),
    )}
      ${group(
        t('Templates'),
        templates.map(({ a, tpl }) => row(templateHash(a, tpl), a.icon, tpl.name, a.name)),
      )}
      ${group(
        t('Documents'),
        docs.map(({ a, k }) => row(k.hash, a.icon, k.title || t('Untitled'), a.name, true)),
      )}`;
  }

  render() {
    const want = this.find.trim().toLowerCase();
    const kept = library();
    const placeholder = kept.length ? t('Find app, template, or doc') : t('Find app, template');
    const chosen = chosenLanguage() ?? '';
    return html`<dialog class="to-drawer" aria-label=${t('Tiny Little Office')} @close=${() => (this.open = false)} @click=${(e: Event) => e.target === this.dialog && this.close()}>
      <div class="to-drawer-inner">
        <!-- The head is the language picker and Close, the name not said again here (Paul, 2026-10-10: "make the language picker the first option to the side of the hamburger. Then put the search below those"). -->
        <header class="to-drawer-head">
          <label class="to-field to-drawer-lang" title=${t('Language')}>
            <select aria-label=${t('Language')} @change=${(e: Event) => void setLanguage((e.target as HTMLSelectElement).value || null)}>
              <option value="" ?selected=${!chosen}>${t('Match the device')}</option>
              ${languages().map((c) => html`<option value=${c} ?selected=${c === chosen}>${languageName(c)}</option>`)}
            </select>
          </label>
          <button type="button" class="to-btn to-tool" aria-label=${t('Close')} title=${t('Close')} @click=${() => this.close()}>${icon(UI.close)}</button>
        </header>
        ${
          this.open && this.downloads
            ? html`<section class="to-drawer-section to-drawer-doc" aria-label=${t('This document')}>
              <h3 class="to-drawer-head3">${t('This document')}</h3>
              ${this.def ? html`<a class="to-btn to-drawer-new" href=${routeHash(this.def.id)} @click=${() => (startEditing(), this.close())}>${icon(this.def.icon, 18)}<span>${t('New {noun}', { noun: this.def.noun })}</span></a>` : nothing}
              <button type="button" class="to-btn to-drawer-share" aria-keyshortcuts=${keysAria(SHARE.keys)} @click=${() => this.handOver(() => this.dispatchEvent(new CustomEvent('to-share-open', { bubbles: true })))}>${icon(SHARE.icon!, 18)}<span>${labelOf(SHARE)}</span>${keysKbd(SHARE.keys)}</button>
              <to-menu class="to-drawer-download" .label=${labelOf(DOWNLOAD)} .icon=${DOWNLOAD.icon} .keys=${DOWNLOAD.keys} .items=${this.downloads}></to-menu>
              ${this.renderPage()}
              ${coarse() ? this.renderCommands() : nothing}
            </section>`
            : nothing
        }
        <!-- The size of everything near the top: under the head, after This document when one is open (above it, This document's Download menu would no longer fit under its row on a phone at 150%): a person who needs it larger finds it before the apps, the switches and the rest (the review of 2026-10-11). -->
        <div class="to-field to-size" role="group" aria-label=${t('Size of everything')}>${icon(UI.view, 18)}<span>${t('Size of everything')}</span>
          <span class="to-size-step">
            ${this.sizeButton(SMALLER, 'to-size-less', icon(UI.minus, 16))}${this.sizeButton(NORMAL_SIZE, 'to-size-now', `${Math.round(size() * 100)}%`)}${this.sizeButton(LARGER, 'to-size-more', icon(UI.plus, 16))}
          </span>
        </div>
        ${
          this.open
            ? html`<nav class="to-drawer-apps" aria-label=${t('Apps')}>
                <input class="to-find" type="search" placeholder=${placeholder} aria-label=${placeholder} autocomplete="off" .value=${this.find} @input=${(e: Event) => (this.find = (e.target as HTMLInputElement).value)} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && (e.preventDefault(), this.querySelector<HTMLElement>('.to-drawer-apps a')?.click())} />
                                ${
                                  want
                                    ? this.renderFound(want, kept)
                                    : !this.downloads
                                      ? nothing
                                      : apps().map(
                                          (a) => html`<div class="to-app-head">
                        <a class="to-app-open" href=${routeHash(a.id)} @click=${() => this.close()}>${icon(a.icon, 20)}<span>${a.name}</span></a>
                        <to-templates .app=${a} .via=${(app: AppDef) => this.handOver(() => this.templates(app))}></to-templates>
                      </div>`,
                                        )
                                }
              </nav>
              <section class="to-drawer-section to-drawer-files">
                <button type="button" class="to-btn to-drawer-open" @click=${() => this.querySelector<HTMLInputElement>('.to-open-input')?.click()}>${icon(UI.openFile, 18)}<span>${t('Open a file…')}</span></button>
                <input type="file" class="to-open-input" hidden accept=${OPENS} @change=${(e: Event) => this.opened(e.target as HTMLInputElement)} />
                <a class="to-btn to-drawer-compare" href=${this.compareHref()} @click=${() => this.close()}>${icon(UI.compare, 18)}<span>${t('Compare…')}</span></a>
              </section>
              <section class="to-drawer-section">
                <label class="to-switch">
                  <input type="checkbox" role="switch" .checked=${keeping()} @change=${(e: Event) => void this.togglePrivate(e)} />
                  <span class="to-switch-words"><b>${keeping() ? t('Saved on this device') : t('Private')}</b><small>${keeping() ? t('Your preferences and the documents you open stay here. Turn off to forget all of it.') : t('This site keeps nothing on this device. Your browser’s history still holds every link opened here, and a link is the document: use a private window, or give it a password.')}</small></span>
                </label>
                ${
                  keeping()
                    ? html`<label class="to-switch to-pictures-switch">
                      <input type="checkbox" role="switch" .checked=${alwaysPictures()} @change=${(e: Event) => setAlwaysPictures((e.target as HTMLInputElement).checked)} />
                      <span class="to-switch-words"><b>${t('Always show pictures from the web')}</b><small>${t('Off, a picture another site holds waits for you to ask: fetching it tells that site who is reading.')}</small></span>
                    </label>`
                    : nothing
                }
              </section>
              <section class="to-drawer-section to-drawer-prefs">
                <label class="to-field">${icon(theme() === 'dark' ? UI.moon : theme() === 'light' ? UI.sun : UI.auto, 18)}<span>${t('Theme')}</span>
                  <select @change=${(e: Event) => {
                    setTheme((e.target as HTMLSelectElement).value as Theme);
                    this.requestUpdate();
                  }}>
                    ${THEMES.map((th) => html`<option value=${th} ?selected=${th === theme()}>${themeName(th)}</option>`)}
                  </select>
                </label>
                <button type="button" class="to-btn to-drawer-privacy" @click=${() => this.handOver(() => this.querySelector<ToPrivacy>('to-privacy')?.show())}>${icon(UI.key, 18)}<span>${t('Privacy and keys')}</span></button>
                <button type="button" class="to-btn to-drawer-keys" @click=${() => this.handOver(() => this.dispatchEvent(new CustomEvent('to-keys', { bubbles: true })))}>${icon(UI.keys, 18)}<span>${t('Keyboard shortcuts')}</span></button>
                ${
                  canInstall()
                    ? html`<button type="button" class="to-btn to-install" @click=${() => void install()}>${icon(UI.download, 18)}<span>${t('Add to home screen')}</span></button>`
                    : installByHand()
                      ? html`<p class="to-hint to-install-how">${t('To add Tiny Little Office to the home screen: Share, then Add to Home Screen.')}</p>`
                      : nothing
                }
                <button type="button" class="to-btn to-drawer-about" @click=${() => this.handOver(() => this.about())}>${icon(UI.info, 18)}<span>${t('About')}</span></button>
              </section>`
            : nothing
        }
      </div>
    </dialog>
    <to-privacy></to-privacy>
    ${this.templatesOf ? html`<to-templates class="to-drawer-templates" bare .app=${this.templatesOf}></to-templates>` : nothing}
    <to-dialog class="to-about-dialog" heading=${t('About Tiny Little Office')} .body=${html`<p>${t('A tiny office suite that lives entirely in the URL. No server, no accounts, no saving: the link is the document.')}</p><p class="to-hint">${t('Nothing you write leaves your browser unless you share the link. Two things ask the web by themselves: a trip’s map, whose pictures come from OpenStreetMap while it is shown, and a picture from a site on the trusted list, fetched through this site’s picture service when its document opens.')}</p><p class="to-hint">${t('Private, the default:')} ${t('This site keeps nothing on this device. Your browser’s history still holds every link opened here, and a link is the document: use a private window, or give it a password.')} ${t('Saved, the switch in this menu, keeps your settings and the documents you open on this device.')}</p><p class="to-hint">${t('A document can have a password: it is encrypted here, in the browser, and the link holds only ciphertext. It can be signed with a key this browser makes, so anyone can check that it is exactly what that key signed; the name it is signed under is the signer’s own word. Privacy and keys, in this menu, shows what this device holds.')}</p><p class="to-hint">${t('A picture a document holds by its address on another site is not fetched until you ask: fetching it would tell that site who is reading, and when. A link that leaves Tiny Little Office shows where it goes, and asks, before it opens.')}</p><p class="to-hint">${t('No analytics, no error reports, no fonts or scripts from anywhere else: the site asks the web for nothing you did not cause.')} <a class="to-about-network" href=${`${siteRoot()}network`} target="_blank" rel="noopener">${t('What leaves your browser')}</a></p><p class="to-hint"><button type="button" class="to-about-threats" @click=${() => this.showLimits()}>${t('What this protects against, and what it does not')}</button></p><section class="to-about-limits" aria-labelledby="to-about-limits-h"><h3 id="to-about-limits-h" tabindex="-1">${t('What it does not protect against')}</h3><ul class="to-hint">${limits().map((s) => html`<li>${s}</li>`)}</ul><p class="to-hint"><a class="to-about-threat-model" href=${sourceFile('docs/threat-model.md')} target="_blank" rel="noopener">${t('The whole threat model, in English')}</a></p></section>${
      this.version
        ? html`<p class="to-hint to-about-version"><a href=${commitUrl(this.version.commit)} target="_blank" rel="noopener">${t('Running commit {commit}', { commit: this.version.commit.slice(0, 7) })}</a>${this.version.tag ? ` (${this.version.tag})` : ''}</p>`
        : nothing
    }`}></to-dialog>`;
  }

  /** A button of the size stepper: the page's command (kit/keys.ts), its words its name. */
  private sizeButton(cmd: Command, cls: string, face: unknown): TemplateResult {
    const tool = cmd === NORMAL_SIZE ? '' : ' to-tool';
    return html`<button type="button" class="to-btn${tool} ${cls}" aria-label=${labelOf(cmd)} title=${labelOf(cmd)} ?disabled=${!!cmd.disabled?.(this.page)} @click=${() => (run(cmd, this.page), this.requestUpdate())}>${face}</button>`;
  }

  /** Under a finger, the app's own commands that need nothing in hand (Present, Look, Play, the views), under its name: a row each, a menu as a menu. */
  private renderCommands(): TemplateResult | typeof nothing {
    const offers = this.commands?.() ?? [];
    if (!offers.length) return nothing;
    const scope = offers[0].cmd.scope;
    return html`<h3 class="to-drawer-head3 to-drawer-app">${apps().find((a) => a.id === scope)?.name ?? ''}</h3>
      ${offers.map(({ cmd, c }) =>
        cmd.menu
          ? html`<to-menu class="to-drawer-cmd" .label=${labelOf(cmd, c)} .icon=${cmd.icon ?? null} .items=${drawnIn(inScope(scope), `menu:${cmd.menu}`, c).map((d) => ({ ...d, does: () => this.handOver(() => d.does()) }))}></to-menu>`
          : html`<button type="button" class="to-btn to-drawer-cmd" ?disabled=${!!cmd.disabled?.(c)} aria-keyshortcuts=${keysAria(cmd.keys)} @click=${() => this.handOver(() => void run(cmd, c))}>${cmd.icon ? icon(cmd.icon, 18) : nothing}<span>${labelOf(cmd, c)}</span>${keysKbd(cmd.keys)}</button>`,
      )}`;
  }

  /** About's link to what the site does not protect against: that section, brought into view, its heading focused. */
  private showLimits() {
    const h = this.querySelector<HTMLElement>('#to-about-limits-h');
    reveal(h, { block: 'start' });
    h?.focus({ preventScroll: true });
  }

  /** The page's other rows of This document (the registry's 'drawer' beside Share and Download, the size's stepper apart): Find in this document, a phone's way to it (the review of 2026-10-11). */
  private renderPage(): TemplateResult[] | typeof nothing {
    const page = this.page;
    if (!page) return nothing;
    return KIT_COMMANDS.filter((cmd) => cmd !== SHARE && cmd !== DOWNLOAD && !STEPPER.includes(cmd) && cmd.where.includes('drawer') && live(cmd, page)).map(
      (cmd) =>
        html`<button type="button" class="to-btn to-drawer-cmd cmd-${cmd.id.replace(/\./g, '-')}" aria-keyshortcuts=${keysAria(cmd.keys)} @click=${() => this.handOver(() => void run(cmd, page))}>${cmd.icon ? icon(cmd.icon, 18) : nothing}<span>${labelOf(cmd, page)}</span>${keysKbd(cmd.keys)}</button>`,
    );
  }

  /** About, and the build it runs, asked for the first time it opens. */
  private about() {
    void this.querySelector<ToDialog>('to-dialog.to-about-dialog')?.show();
    void running(siteRoot()).then((v) => (this.version = v));
  }
}
customElements.define('to-drawer', ToDrawer);
