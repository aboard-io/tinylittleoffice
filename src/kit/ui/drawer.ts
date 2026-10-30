/**
 * <to-drawer>: the menu behind the hamburger, a native <dialog> that slides in from the side the menu button is on
 * (the inline end), flush with that edge, one hairline against the backdrop. In Paul's order (his notes of 2026-10-11):
 *
 * 1. The head: the language (its first option "Default: Français", the device's language named in itself, the word
 *    Default the page's) and Close.
 * 2. What is this?: the manual, a deck kept in the tree (manual.ts, manual.tlo) and compiled into its link, above
 *    Save in browser (Paul, 2026-10-14).
 * 3. Save in browser: the switch (off by default), and under it what turning it over does; on, the documents saved,
 *    newest first, each its app's icon, its name and when it was saved, a tap opening it and its Delete at the end as
 *    on the home page, in a list that scrolls inside its own height; nothing saved yet, a line saying so (Paul,
 *    2026-10-15, issue #6: "Maybe we just put their icons underneath the toggle in a big scrollable list view. That
 *    would be hard to miss"; three readers had turned the switch on and could not find what they had saved).
 * 4. The size of everything (zoom.ts, the page's commands of kit/core/keys.ts): the eye and the stepper, no words.
 * 5. One search for anything (Mod+K opens the drawer with it focused): apps, documents kept here, templates and the
 *    commands in force where the person was (the words', the app's, the page's, each with its keys at the row's end),
 *    each kind under its heading, by one matching (search.ts startsAWord). A command chosen closes the drawer, gives
 *    the focus back where it was, and runs. No rows of apps with nothing typed (Paul, 2026-10-12: "If people want apps
 *    they can search or go to home page"): a template is found by search, or on the home page.
 * 6. This document, with a document open: New {noun}, Share…, Download (the table of formats, `downloads`, its
 *    menu), the page's other commands drawn in the drawer (Find in this document) and, under a finger, the app's
 *    commands that need nothing in hand (the bar being away while reading); each with its keys at the right where
 *    there is a keyboard (kit/ui/bar.ts keysKbd: never under a finger until a key with Ctrl, ⌘ or Alt is typed, and never
 *    part of the row's name).
 * 7. Theme, Add to home screen where the browser offers it (install.ts; on an iPhone, the line that says how), About
 *    (Paul's three sentences of 2026-10-13, Aboard, "email us" and the repository's issues as links, then the commit it
 *    runs, from /version.json, kit/core/version.ts, read when About opens).
 *
 * On a touch screen the dialog itself holds the focus (the search would raise the keyboard) and draws no ring for it.
 * Anything that opens a document closes the drawer (it follows the hash). The drawer is a menu: a row that opens a
 * dialog closes the drawer first and opens it, one modal at a time, and when that dialog closes the focus is on the
 * hamburger (handOver; Paul, 2026-10-10: "the outer one hands over"). The dialogs it opens are drawn beside its own
 * <dialog>, not in it.
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import type { AppDef } from '../core/app.ts';
import { apps, siteRoot } from '../core/apps.ts';
import { mark } from '../draw/mark.ts';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { keptTitle, MAIL, preloadTemplates, templateHash, templatesOf as arrivedTemplates } from './home.ts';
import { ago, forget, library, onLibrary, type Kept } from '../share/library.ts';
import { icon, UI } from '../draw/icons.ts';
import { startEditing } from './chrome.ts';
import { routeHash } from '../core/route.ts';
import { browserLanguage, chosenLanguage, languageName, languages, onLanguage, setLanguage, t } from '../core/i18n.ts';
import { THEMES, setTheme, theme, themeName, type Theme } from './theme.ts';
import { keeping, onPrivacy, setPrivate } from '../share/privacy.ts';
import { canInstall, install, installByHand, onInstall } from '../core/install.ts';
import { size } from './zoom.ts';
import { toast } from '../core/say.ts';
import { commitUrl, repoUrl, running, type Version } from '../core/version.ts';
import { MAKER } from '../core/network.ts';
import './preview.ts';
import { manualHash } from './manual.ts';
import { focusBack, handBack, type ToDialog } from './dialog.ts';
import type { MenuItem } from './menu.ts';
import './menu.ts';
import { coarse, drawnIn, inScope, labelOf, live, run, type Command } from '../core/commands.ts';
import { keysAria, keysKbd } from './bar.ts';
import { DOWNLOAD, KIT_COMMANDS, LARGER, NORMAL_SIZE, SHARE, SMALLER, type Page } from '../core/keys.ts';
import { fold, startsAWord } from '../share/search.ts';
import './dialog.ts';

/** A command and the context it is run in: what the search offers, and This document's rows under a finger. */
export interface Offer {
  cmd: Command;
  c: unknown;
}

/** The size of everything's commands, drawn as the stepper rather than as rows of This document. */
const STEPPER: readonly Command<never>[] = [SMALLER, NORMAL_SIZE, LARGER];

/** A translated sentence with links in it: each {name} the template given for it, the words around it as the language puts them (t() leaves a placeholder it is given no value for). */
const linked = (sentence: string, links: Record<string, TemplateResult>) => sentence.split(/\{(\w+)\}/).map((part, i) => (i % 2 ? (links[part] ?? `{${part}}`) : part));

export class ToDrawer extends LitElement {
  static properties = {
    find: { state: true },
    open: { state: true },
    version: { state: true },
    downloads: { attribute: false },
    def: { attribute: false },
    page: { attribute: false },
    commands: { attribute: false },
    offers: { attribute: false },
  };
  /** The open document's formats, for its Download; null on the home page (and no This document then). */
  declare downloads: MenuItem[] | null;
  /** What Share and Download act on: the shell. */
  declare page: Page | null;
  /** The app's commands that need nothing in hand (the registry's `document`), asked for as the drawer draws: under a finger they are This document's rows too, the bar being away while reading. */
  declare commands: (() => Offer[]) | null;
  /** Every command in force where the person is (the shell's offers), asked for as the drawer opens, before it takes the focus. */
  declare offers: (() => Offer[]) | null;
  /** What the search finds among the commands: the offers as the drawer opened. */
  private offered: Offer[] = [];
  /** What had the focus as the drawer opened: it has it again before a command found runs. */
  private from: HTMLElement | null = null;
  /** The open document's app, for its New row. */
  declare def: AppDef | null;
  declare find: string;
  declare open: boolean;
  /** The build this is, once About has asked (null: there is no /version.json, as on the dev server). */
  declare version: Version | null;
  private offs: (() => void)[] = [];

  constructor() {
    super();
    this.find = '';
    this.open = false;
    this.version = null;
    this.downloads = null;
    this.def = null;
    this.page = null;
    this.commands = null;
    this.offers = null;
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    const redraw = () => this.requestUpdate();
    const away = () => this.close();
    window.addEventListener('hashchange', away);
    // The size row says the size as a pinch changes it (kit/ui/pinch.ts), the drawer open or not.
    window.addEventListener('to-size', redraw);
    this.offs = [
      onLanguage(redraw),
      onPrivacy(redraw),
      onInstall(redraw),
      onLibrary(redraw),
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
  /** Open, the search empty; `find` (Mod+K): with the search focused, wherever the keys came from. */
  async show(find = false) {
    if (!this.dialog?.open) {
      const at = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      // Opened by the tap that closed a menu: the focus is still in the menu, gone; it was the menu's button's.
      const closed = at?.closest<HTMLElement>('[popover]:not(:popover-open)');
      this.from = closed ? (closed.closest('to-menu')?.querySelector<HTMLElement>(':scope > button') ?? null) : at;
      this.offered = this.offers?.() ?? [];
      // A search begins afresh each time the menu opens: what was typed before was looked for among what was in force then.
      this.find = '';
    }
    this.open = true;
    // Drawn afresh: what it shows may have changed while it was closed (the keys written once a keyboard is seen).
    this.requestUpdate();
    await this.updateComplete;
    if (!this.dialog.open) this.dialog.showModal();
    // The search takes the focus only where a keyboard is already there: on a touch screen the focus would bring the
    // keyboard up over the menu (Paul, 2026-10-10), so the dialog itself holds it and a tap on the field asks for one.
    // (Not a touch screen, as the rest of the kit asks it: a device with no pointer at all has its keys.)
    if (find || !matchMedia('(pointer: coarse)').matches) this.querySelector<HTMLInputElement>('.to-find')?.focus();
    else this.dialog.focus({ preventScroll: true });
  }
  close() {
    if (this.dialog?.open) this.dialog.close();
  }
  /** Closed: where the browser's own restoring found nothing (a menu it was opened over has gone), the focus goes back by focusBack. */
  private onClose = () => {
    // The close event comes a task later: opened again meanwhile, it is open.
    if (this.dialog?.open) return;
    this.open = false;
    const at = document.activeElement;
    if (!at || at === document.body || this.contains(at) || at.closest('[popover]:not(:popover-open)')) focusBack(this.from);
  };

  /** A row that opens a dialog: the drawer closes, the focus goes to the hamburger, and the dialog opens; its way back is the hamburger. */
  private handOver(open: () => unknown) {
    return handBack(() => this.close(), document.querySelector<HTMLElement>('.to-burger'), open);
  }

  private async togglePrivate(e: Event) {
    const box = e.target as HTMLInputElement;
    if (keeping() && !confirm(t('drawer-remove-all-files-and-settings'))) {
      // The browser flipped the switch before the question was asked: Cancel puts it back.
      box.checked = true;
      this.requestUpdate();
      return;
    }
    await setPrivate(keeping());
    toast(keeping() ? t('common-saving-in-this-browser') : t('common-nothing-saved-in-this-browser'));
  }

  /**
   * Download's table opens under its row (Paul's order puts This document low in the drawer, and below it there may be
   * too little left to scroll it up: Open a file… and Compare… were that room until they went, 2026-10-12): as the
   * table opens, the drawer gains a screen of room at its foot and the row goes to its top; closed, the room goes.
   * Heard in the capture, before the menu places itself beside the row.
   */
  private onToggle = (e: Event) => {
    const pop = e.target as HTMLElement;
    const row = pop.parentElement;
    if (!row?.matches('to-menu.to-drawer-download')) return;
    const inner = this.querySelector<HTMLElement>('.to-drawer-inner')!;
    const open = (e as ToggleEvent).newState === 'open';
    inner.classList.toggle('to-drawer-room', open);
    if (open) inner.scrollTop += row.getBoundingClientRect().top - inner.getBoundingClientRect().top;
  };

  /** A command found: the drawer closes, the focus goes back where it was, then it runs (a command on the words finds them selected as they were). */
  private choose({ cmd, c }: Offer) {
    this.close();
    // A command on the words: the words have the focus again, as they had it before the menu button was pressed.
    const back = c instanceof HTMLElement && c.localName === 'to-text' ? c : this.from;
    back?.focus({ preventScroll: true });
    void run(cmd, c);
  }

  /**
   * What the search finds, by one matching (search.ts startsAWord), under four headings in this order, each only with
   * rows: Apps (by name and blurb), Documents kept here (by title), Templates (by name, blurb and app) and Commands (the
   * offers as the drawer opened, by their words, each with its keys).
   */
  private renderFound(want: string, kept: ReturnType<typeof library>): TemplateResult {
    const q = fold(want);
    const has = (...words: string[]) => startsAWord(q, ...words);
    const all = apps();
    const found = all.filter((a) => has(a.name, a.blurb));
    // The templates that have arrived; asked for here (a file an app), the list grows as the rest come.
    for (const a of all) if (!arrivedTemplates(a)) void preloadTemplates(a).then(() => this.requestUpdate());
    const templates = all.flatMap((a) => (arrivedTemplates(a) ?? []).filter((tpl) => has(tpl.name, tpl.blurb, a.name)).map((tpl) => ({ a, tpl })));
    const docs = kept.filter((k) => has(k.title)).flatMap((k) => all.filter((a) => a.id === k.app).map((a) => ({ a, k })));
    const cmds = this.offered.filter((o) => has(labelOf(o.cmd, o.c)));
    if (!found.length && !templates.length && !docs.length && !cmds.length) return html`<p class="to-hint">${t('drawer-nothing-by-that-name')}</p>`;
    const group = (heading: string, rows: TemplateResult[]) => (rows.length ? html`<h3 class="to-drawer-head3">${heading}</h3>${rows}` : nothing);
    const row = (href: string, ico: Parameters<typeof icon>[0], name: string, sub = '', preview = false) =>
      html`<a class="to-found" href=${href} @click=${() => this.close()}>${preview ? html`<to-preview hash=${href}></to-preview>` : icon(ico, 20)}<span class="to-found-words"><span>${name}</span>${sub ? html`<small>${sub}</small>` : nothing}</span></a>`;
    const command = (o: Offer) =>
      html`<button type="button" class="to-found to-found-cmd" ?disabled=${!!o.cmd.disabled?.(o.c as never)} aria-keyshortcuts=${keysAria(o.cmd.keys)} @click=${() => this.choose(o)}>${o.cmd.icon ? icon(o.cmd.icon, 20) : html`<span class="to-found-noicon"></span>`}<span class="to-found-words"><span>${labelOf(o.cmd, o.c)}</span></span>${keysKbd(o.cmd.keys)}</button>`;
    return html`${group(
      t('drawer-apps'),
      found.map((a) => row(routeHash(a.id), a.icon, a.name)),
    )}
      ${group(
        t('drawer-documents'),
        docs.map(({ a, k }) => row(k.hash, a.icon, k.title || t('common-untitled'), a.name, true)),
      )}
      ${group(
        t('common-templates'),
        templates.map(({ a, tpl }) => row(templateHash(a, tpl), a.icon, tpl.name, a.name)),
      )}
      ${group(t('drawer-commands'), cmds.map(command))}`;
  }

  render() {
    const want = this.find.trim().toLowerCase();
    const kept = library();
    const placeholder = kept.length ? t('common-find-app-doc-template-or') : t('drawer-find-app-template-or-command');
    const chosen = chosenLanguage() ?? '';
    return html`<dialog class="to-drawer" aria-label=${t('common-tiny-little-office')} @close=${this.onClose} @toggle=${{ handleEvent: this.onToggle, capture: true }} @click=${(e: Event) => e.target === this.dialog && this.close()}>
      <div class="to-drawer-inner">
        <!-- The head is the language picker, then (away from home) the mark as the way home beside Close (Paul, 2026-10-12); the name is not said again here (2026-10-10). -->
        <header class="to-drawer-head">
          <label class="to-field to-drawer-lang" title=${t('drawer-language')}>
            <select aria-label=${t('drawer-language')} @change=${(e: Event) => void setLanguage((e.target as HTMLSelectElement).value || null)}>
              <option value="" ?selected=${!chosen}>${t('drawer-default-name', { name: languageName(browserLanguage()) })}</option>
              ${languages().map((c) => html`<option value=${c} ?selected=${c === chosen}>${languageName(c)}</option>`)}
            </select>
          </label>
          ${this.def ? html`<a class="to-btn to-tool to-drawer-home" href="#/" aria-label=${t('common-home')} title=${t('common-home')} @click=${() => this.close()}>${unsafeSVG(mark(20))}</a>` : nothing}
          <button type="button" class="to-btn to-tool" aria-label=${t('common-close')} title=${t('common-close')} @click=${() => this.close()}>${icon(UI.close)}</button>
        </header>
        <section class="to-drawer-section to-drawer-manual">
          <a class="to-btn to-drawer-whatis" href=${manualHash()} @click=${() => this.close()}>${icon(UI.help, 18)}<span>${t('drawer-what-is-this')}</span></a>
        </section>
        <section class="to-drawer-section to-drawer-save">
          <label class="to-switch">
            <input type="checkbox" role="switch" .checked=${keeping()} @change=${(e: Event) => void this.togglePrivate(e)} />
            <span class="to-switch-words"><b>${t('drawer-save-in-browser')}</b><small>${keeping() ? t('drawer-turn-off-to-remove-all') : t('drawer-turn-on-to-save-files')}</small></span>
          </label>
          ${keeping() ? this.renderSaved(kept) : nothing}
        </section>
        <!-- The size of everything: the eye and the stepper, no words (Paul, 2026-10-12); its name is the screen reader's. -->
        <div class="to-field to-size" role="group" aria-label=${t('drawer-size-of-everything')}>${icon(UI.view, 18)}<div class="to-size-step">
            ${this.sizeButton(SMALLER, 'to-size-less', icon(UI.minus, 16))}${this.sizeButton(NORMAL_SIZE, 'to-size-now', `${Math.round(size() * 100)}%`)}${this.sizeButton(LARGER, 'to-size-more', icon(UI.plus, 16))}
          </div>
        </div>
        ${
          this.open
            ? html`<nav class="to-drawer-apps" aria-label=${t('drawer-apps')}>
                <input class="to-find" type="search" placeholder=${placeholder} aria-label=${placeholder} autocomplete="off" .value=${this.find} @input=${(e: Event) => (this.find = (e.target as HTMLInputElement).value)} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && !e.isComposing && (e.preventDefault(), this.querySelector<HTMLElement>('.to-drawer-apps .to-found')?.click())} />
                ${want ? this.renderFound(want, kept) : nothing}
              </nav>
              ${
                this.downloads
                  ? html`<section class="to-drawer-section to-drawer-doc" aria-label=${t('common-this-document')}>
                    <h3 class="to-drawer-head3">${t('common-this-document')}</h3>
                    ${this.def ? html`<a class="to-btn to-drawer-new" href=${routeHash(this.def.id)} @click=${() => (startEditing(), this.close())}>${icon(this.def.icon, 18)}<span>${t('common-new-noun', { noun: this.def.noun })}</span></a>` : nothing}
                    <button type="button" class="to-btn to-drawer-share" aria-keyshortcuts=${keysAria(SHARE.keys)} @click=${() => this.handOver(() => this.dispatchEvent(new CustomEvent('to-share-open', { bubbles: true })))}>${icon(SHARE.icon!, 18)}<span>${labelOf(SHARE)}</span>${keysKbd(SHARE.keys)}</button>
                    <to-menu class="to-drawer-download" .label=${labelOf(DOWNLOAD)} .icon=${DOWNLOAD.icon} .keys=${DOWNLOAD.keys} .items=${this.downloads}></to-menu>
                    ${this.renderPage()}
                    ${coarse() ? this.renderCommands() : nothing}
                  </section>`
                  : nothing
              }
              <section class="to-drawer-section to-drawer-prefs">
                <label class="to-field"><span class="to-field-words">${icon(theme() === 'dark' ? UI.moon : theme() === 'light' ? UI.sun : UI.auto, 18)}<span>${t('common-theme')}</span></span>
                  <select @change=${(e: Event) => {
                    setTheme((e.target as HTMLSelectElement).value as Theme);
                    this.requestUpdate();
                  }}>
                    ${THEMES.map((th) => html`<option value=${th} ?selected=${th === theme()}>${themeName(th)}</option>`)}
                  </select>
                </label>
                ${
                  canInstall()
                    ? html`<button type="button" class="to-btn to-install" @click=${() => void install()}>${icon(UI.download, 18)}<span>${t('drawer-add-to-home-screen')}</span></button>`
                    : installByHand()
                      ? html`<p class="to-hint to-install-how">${t('drawer-to-add-tiny-little-office')}</p>`
                      : nothing
                }
                <button type="button" class="to-btn to-drawer-about" @click=${() => this.handOver(() => this.about())}>${icon(UI.info, 18)}<span>${t('drawer-about')}</span></button>
              </section>`
            : nothing
        }
      </div>
    </dialog>
    <to-dialog class="to-about-dialog" heading=${t('drawer-about-tiny-little-office')} .body=${html`<p>
        ${linked(t('drawer-tiny-little-office-is-experiment'), { aboard: html`<a href=${MAKER} target="_blank" rel="noopener" data-to-chrome>Aboard</a>` })}
        ${linked(t('drawer-to-reach-out-with-questions'), { email: html`<a href=${MAIL} data-to-chrome>${t('drawer-email-us')}</a>` })}
        ${linked(t('drawer-if-you-find-bugs-please'), { github: html`<a href=${`${repoUrl()}/issues`} target="_blank" rel="noopener" data-to-chrome>${t('drawer-github-repository')}</a>` })}
      </p>
      <blockquote class="to-about-quote">
        <p>${t('drawer-all-of-these-notes-these')}</p>
        <footer>${linked(t('drawer-eugene-ionesco-book'), { book: html`<cite>${t('drawer-discoveries')}</cite>` })}</footer>
      </blockquote>
      ${
        this.version
          ? html`<p class="to-hint to-about-version"><a href=${commitUrl(this.version.commit)} target="_blank" rel="noopener">${t('leave-running-commit-commit', { commit: this.version.commit.slice(0, 7) })}</a>${this.version.tag ? ` (${this.version.tag})` : ''}</p>`
          : nothing
      }`}></to-dialog>`;
  }

  /** Under the switch, while it is on: every document saved, newest first, its app's icon, its name and when; a tap opens it, and its Delete is the home page's. Nothing saved, a line that says so. */
  private renderSaved(kept: Kept[]): TemplateResult {
    const byId = new Map(apps().map((a) => [a.id, a]));
    const rows = kept.flatMap((k) => {
      const a = byId.get(k.app);
      return a ? [{ a, k, title: keptTitle(k) }] : [];
    });
    if (!rows.length) return html`<p class="to-hint to-saved-none">${t('drawer-nothing-saved-yet')}</p>`;
    const lang = document.documentElement.lang;
    return html`<ul class="to-saved" aria-label=${t('drawer-saved-documents')}>
      ${rows.map(
        ({ a, k, title }) =>
          html`<li>
            <a class="to-saved-open" href=${k.hash} @click=${() => this.close()}>${icon(a.icon, 20)}<span class="to-found-words"><span>${title}</span><small>${ago(k.at, lang)}</small></span></a>
            <button type="button" class="to-btn to-tool" aria-label=${t('home-forget-title', { title })} title=${t('common-forget')} @click=${() => forget(k.id)}>${icon(UI.close, 16)}</button>
          </li>`,
      )}
    </ul>`;
  }

  /** A button of the size stepper: the page's command (kit/core/keys.ts), its words its name. */
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
