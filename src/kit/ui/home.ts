/**
 * <to-home>: the apps, as rows, in the registry's order: each its icon and name (open it blank), a dialog
 * of its templates to the right of its name (Blank first and chosen, or the first template where the app's templates carry its blanks, each drawn small from its own document; choosing one opens the
 * app with that document), and under it the documents of that app kept on this device (kit/share/library.ts),
 * newest first, each preview on the edge of the app's icon (kit.css .to-drive). No copy. (Paul, 2026-10-09: "Small icon and app name, then templates menu. Then documents
 * in that format … Drive is just documents under the icons. No descriptions of apps.") Rows the width of
 * the page, not cards, so it looks on a desktop as it does on a phone (Paul, 2026-10-09: "Don't make apps into cards.
 * Just make them into rows with docs below."). Each document shows its first page small at its left
 * (<to-preview>, drawn as it scrolls into sight: "When you list documents under apps, show them with
 * previews"). An app's templates are a file of their own, asked for when its list opens (Blank shown at once, the
 * rest added as they arrive, no spinner) or ahead of the tap, as a pointer comes over its row (`loadTemplates`);
 * offline, a file the service worker never kept is not there, and the list says so under Blank.
 * <to-templates> is the drawer's too: there a row's button (`via`) hands over to the drawer's one dialog
 * (`bare`, drawn outside the drawer's own), the drawer closing first (one modal at a time: kit/ui/drawer.ts).
 *
 * Below the apps, the foot, one line: "An Aboard Foundry project. Made with respect in New York City. · Beta version ·
 * GitHub · Email" (Paul, 2026-10-12, verbatim; Aboard Foundry a link to aboard.com, GitHub the repository, Email
 * hello+tlo@aboard.com), then the build's version once /version.json is read (its tag, or its commit); the only words on
 * the page beyond the apps' names. The two sites open in a new tab, unasked,
 * and the mail link opens the mail app: the chrome's own links (kit/ui/link-guard.ts `data-to-chrome`).
 *
 * Above the apps, while Save in browser is on and something is kept, a search box over the library (kit/share/search.ts):
 * under Private there is nothing to search, so nothing says so (Paul, 2026-10-12). Every word of it
 * somewhere in a document's title or text, the best first, each found document with its title and the
 * lines that hold the words, the words marked. Each document's link is decoded once, when first searched.
 */
import { LitElement, html, nothing } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import type { AppDef, Template } from '../core/app.ts';
import { apps, siteRoot } from '../core/apps.ts';
import { decodeDoc, encodeDoc, isSealed } from '../core/codec.ts';
import { linesOf, search, type Seg } from '../share/search.ts';
import { icon, UI } from '../draw/icons.ts';
import { onLanguage, t } from '../core/i18n.ts';
import { hoverFocus, menuKey, OpeningPress, openedByPointer } from './menu.ts';
import { CROPPED, pageSvg } from '../draw/draw.ts';
import './preview.ts';
import { startEditing } from './chrome.ts';
import { go, parseHash, routeHash } from '../core/route.ts';
import { ago, forget, library, onLibrary, type Kept } from '../share/library.ts';
import { keeping, onPrivacy } from '../share/privacy.ts';
import { focusBack } from './dialog.ts';
import { MAKER } from '../core/network.ts';
import { repoUrl, running, type Version } from '../core/version.ts';

/** Where a note to the makers goes. */
/** Where to write: the foot's Email and About's "email us" (kit/ui/drawer.ts). */
export const MAIL = 'mailto:hello+tlo@aboard.com';

/** The documents shown under an app before "n more". */
const SHOWN = 5;

let n = 0;

/** Each app's templates once they have arrived, by its id: what the lists draw while they ask again. */
const arrived = new Map<string, Template[]>();
/** The apps whose templates a pointer has already asked for. */
const asking = new Map<string, Promise<Template[]>>();
// Their names are read in the language of the moment: a language chosen, they are asked for again.
let era = 0;
onLanguage(() => forgetTemplates());
/** The apps whose templates' file could not be fetched (offline, and never kept by the service worker). */
const unreached = new Set<string>();
/** An app's templates if they have arrived, else undefined. */
export const templatesOf = (app: AppDef): Template[] | undefined => arrived.get(app.id);
/** Whether an app's templates were asked for and could not be fetched: the list says so, and the next asking tries again. */
const templatesUnreached = (app: AppDef): boolean => unreached.has(app.id);
/** An app's templates, asked for: its file is fetched the first time (a pointer over its row asks ahead of the tap), and the names are read again in the language of the moment. Not fetched, none. */
async function loadTemplates(app: AppDef): Promise<Template[]> {
  const at = era;
  let list: Template[];
  try {
    list = await app.templates();
  } catch {
    asking.delete(app.id);
    if (at === era) unreached.add(app.id);
    return [];
  }
  unreached.delete(app.id);
  // A load that set out before a forgetting (a language chosen, a test's reset) does not land in the cache after it.
  if (at === era) arrived.set(app.id, list);
  return list;
}
/** Everything forgotten, and what is still on its way told not to land (a language chosen; the tests, between two that must not share). */
export function forgetTemplates(): void {
  era++;
  arrived.clear();
  asking.clear();
  unreached.clear();
}
/** Intent: a pointer over an app's row fetches its templates' file ahead of the tap, once, so its list is full as it opens (and the drawer's Find, once something is typed, asks for every app's). */
export function preloadTemplates(app: AppDef): Promise<Template[]> {
  let asked = asking.get(app.id);
  if (!asked) asking.set(app.id, (asked = loadTemplates(app)));
  return asked;
}

/** The link that opens an app with a template's document; Blank is the app's own page. */
export const templateHash = (app: AppDef, tpl: Template | null) => (tpl ? routeHash(app.id, encodeDoc(tpl.doc)) : routeHash(app.id));

export class ToTemplates extends LitElement {
  static properties = { app: { attribute: false }, via: { attribute: false }, bare: { type: Boolean }, chosen: { state: true }, drawn: { state: true }, list: { state: true } };
  declare app: AppDef;
  /** The button opens the templates through this instead of a dialog of its own (a drawer's row: kit/ui/drawer.ts). */
  declare via: ((app: AppDef) => void) | null;
  /** The dialog alone, no button: the one a drawer's rows hand over to. */
  declare bare: boolean;
  /** What had the focus as the dialog opened, for a bare one: it has it again when it closes. */
  private from: HTMLElement | null = null;
  /** The template's id, '' for Blank (or, with no Blank in the list, the first template). */
  declare chosen: string;
  /** The thumbnails are drawn once the list first opens: a home page of many apps costs nothing until then. */
  declare drawn: boolean;
  /** The app's templates once they have arrived (Blank is shown before). */
  declare list: Template[] | undefined;
  readonly uid = `to-templates-${++n}`;

  private off = () => {};
  /** The press that opened the list, which an option under it does not take for the first moment (menu.ts). */
  private press = new OpeningPress();

  constructor() {
    super();
    this.chosen = '';
    this.drawn = false;
    this.via = null;
    this.bare = false;
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    this.off = onLanguage(() => (this.drawn ? this.load() : this.requestUpdate()));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.off();
  }
  /** Its button (none when `bare`). */
  get button(): HTMLButtonElement {
    return this.querySelector<HTMLButtonElement>(':scope > button')!;
  }
  get dialog(): HTMLDialogElement {
    return this.querySelector<HTMLDialogElement>(':scope > dialog')!;
  }
  get listbox(): HTMLElement {
    return this.querySelector<HTMLElement>(':scope > dialog [role=listbox]')!;
  }
  private options(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>('[role=option]')];
  }
  /** The app's templates asked for, and drawn when they arrive. */
  private load() {
    const app = this.app;
    this.list = templatesOf(app);
    void loadTemplates(app).then((list) => {
      if (this.app === app) this.list = list;
      this.requestUpdate();
    });
  }
  /** The list, over the whole screen (Paul, 2026-10-10: "a large modal that takes over the screen, don't cut them off based on where the invoking icon is"). */
  show() {
    const pointer = openedByPointer();
    this.drawn = true;
    this.load();
    const at = document.activeElement;
    this.from = at instanceof HTMLElement && at !== document.body ? at : null;
    void this.updateComplete.then(() => {
      if (this.dialog.open) return;
      this.dialog.showModal();
      this.press.open();
      if (!this.bare) this.button.setAttribute('aria-expanded', 'true');
      // Opened by a key, the chosen template has the focus; by a pointer (or before a list with no Blank has arrived), the list itself, and the first arrow goes in.
      if (pointer) this.listbox.focus({ preventScroll: true });
      else (this.options().find((o) => o.getAttribute('aria-selected') === 'true') ?? this.options()[0] ?? this.listbox).focus({ preventScroll: true });
    });
  }
  hide() {
    if (this.dialog.open) this.dialog.close();
  }
  private onClose = () => {
    if (!this.bare) this.button.setAttribute('aria-expanded', 'false');
    if (document.activeElement === document.body || this.contains(document.activeElement)) void (this.bare ? focusBack(this.from) : this.button.focus());
  };
  /** A click in the dialog, before its option has it: the opening press again is nothing; on the backdrop, the list closes. */
  private onClick = { capture: true, handleEvent: (e: MouseEvent) => !this.press.stops(e) && e.target === this.dialog && this.hide() };
  /** The keys every menu here keeps (menu.ts). */
  private onKey = (e: KeyboardEvent) => menuKey(e, this.listbox, this.options(), () => this.hide());
  /** The id of the option shown chosen: '' is Blank, or the first template where the list has no Blank. */
  private get current(): string {
    return this.chosen || (this.app.blankInTemplates ? (this.list?.[0]?.id ?? '') : '');
  }
  private choose(tpl: Template | null) {
    this.chosen = tpl?.id ?? '';
    this.hide();
    startEditing();
    go(templateHash(this.app, tpl));
  }
  private option(tpl: Template | null) {
    const id = tpl?.id ?? '';
    const name = tpl?.name ?? t('home-blank');
    const page = this.drawn ? this.app.view(tpl?.doc ?? this.app.blank(), { small: true, thumb: true })[0] : null;
    return html`<div role="option" class="to-option" tabindex="-1" aria-selected=${String(this.current === id)} @pointermove=${hoverFocus} @click=${() => this.choose(tpl)}>
      <span class="to-thumb" aria-hidden="true">${page ? unsafeSVG(pageSvg(page, CROPPED)) : nothing}</span>
      <span class="to-option-words"><span>${name}</span>${tpl?.blurb ? html`<small>${tpl.blurb}</small>` : nothing}</span>
    </div>`;
  }
  render() {
    const chosen = this.list?.find((x) => x.id === this.chosen);
    // The button is the small arrow alone, no icon and no words (Paul, 2026-10-09: "don't use the word Blank over and over"; 2026-10-10: "just the small arrow to the right"); its name says what it holds.
    const button = html`<button type="button" class="to-btn to-tool to-templates-btn" aria-haspopup="dialog" aria-expanded="false" aria-label=${chosen ? t('home-templates-for-app-name', { app: this.app.name, name: chosen.name }) : t('home-templates-for-app', { app: this.app.name })} title=${t('common-templates')} @click=${() => (this.via ? this.via(this.app) : this.show())}>
        ${icon(UI.down, 18, 'to-caret')}
      </button>`;
    if (this.via) return button;
    return html`${this.bare ? nothing : button}
      <dialog
        class="to-dialog to-templates-dialog"
        aria-label=${t('home-templates-for-app', { app: this.app.name })}
        @close=${this.onClose}
        @pointerdown=${this.press.down}
        @click=${this.onClick}
      >
        <div class="to-dialog-inner">
          <header class="to-dialog-head to-listbox-head"><h2 id=${this.uid}>${t('home-app-templates', { app: this.app.name })}</h2><button type="button" class="to-btn to-tool to-listbox-close" aria-label=${t('common-close')} title=${t('common-close')} @click=${() => this.hide()}>${icon(UI.close, 18)}</button></header>
          <div class="to-listbox" role="listbox" tabindex="-1" aria-label=${t('common-templates')} @keydown=${this.onKey}>
            ${this.drawn ? html`${this.app.blankInTemplates ? nothing : this.option(null)}${(this.list ?? []).map((tpl) => this.option(tpl))}` : nothing}
          </div>
          ${this.drawn && templatesUnreached(this.app) ? html`<p class="to-hint" role="status">${t('home-templates-are-not-saved-in')}</p>` : nothing}
        </div>
      </dialog>`;
  }
}
customElements.define('to-templates', ToTemplates);

/** A kept document's lines, by its link: decoded once a visit. */
const linesCache = new Map<string, string[]>();
function keptLines(k: Kept): string[] {
  let lines = linesCache.get(k.hash);
  if (!lines) {
    const text = decodeDoc(parseHash(k.hash).payload) ?? '';
    try {
      lines = text ? linesOf(text) : [];
    } catch {
      lines = [];
    }
    linesCache.set(k.hash, lines);
  }
  return lines;
}
/** A kept document's name as a list says it: its title, else Locked document for a sealed one, else Untitled. */
export const keptTitle = (k: Kept): string => k.title || (isSealed(parseHash(k.hash).payload) ? t('common-locked-document') : t('common-untitled'));

/** Stretches of words, the found ones marked. */
const segs = (s: Seg[]) => s.map((x) => (x.hit ? html`<mark>${x.t}</mark>` : x.t));

export class ToHome extends LitElement {
  static properties = { unfolded: { state: true }, query: { state: true }, version: { state: true } };
  /** What the search box holds. */
  declare query: string;
  /** The build this site runs, from its /version.json once read (kit/core/version.ts): its tag, or its commit's first seven letters, at the foot's end (Paul, 2026-10-12: "Start putting the version in the footer"). */
  declare version: Version | null;
  /** The apps whose whole list of documents is shown, past the first five. */
  declare unfolded: Set<string>;
  private offs: (() => void)[] = [];
  private redraw = () => this.requestUpdate();
  private onVisible = () => document.visibilityState === 'visible' && this.redraw();

  constructor() {
    super();
    this.unfolded = new Set();
    this.query = '';
    this.version = null;
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    void running(siteRoot()).then((v) => (this.version = v));
    window.addEventListener('pageshow', this.redraw);
    document.addEventListener('visibilitychange', this.onVisible);
    this.offs = [
      onLanguage(this.redraw),
      onPrivacy(this.redraw),
      onLibrary(this.redraw),
      () => window.removeEventListener('pageshow', this.redraw),
      () => document.removeEventListener('visibilitychange', this.onVisible),
    ];
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    for (const off of this.offs) off();
  }
  /** An app's kept documents, newest first: five, then "n more". Nothing kept, nothing shown. */
  private drive(app: AppDef, kept: Kept[]) {
    if (!kept.length) return nothing;
    const all = this.unfolded.has(app.id);
    const shown = all ? kept : kept.slice(0, SHOWN);
    const lang = document.documentElement.lang;
    return html`<ul class="to-drive" aria-label=${t('home-app-documents', { app: app.name })}>
        ${shown.map((k) => {
          const title = keptTitle(k);
          return html`<li>
            <a class="to-drive-open" href=${k.hash}><to-preview hash=${k.hash}></to-preview><span class="to-drive-words"><span>${title}</span><small>${ago(k.at, lang)}</small></span></a>
            <button type="button" class="to-btn to-tool" aria-label=${t('home-forget-title', { title })} title=${t('common-forget')} @click=${() => forget(k.id)}>${icon(UI.close, 16)}</button>
          </li>`;
        })}
      </ul>
      ${kept.length > SHOWN && !all ? html`<button type="button" class="to-btn to-drive-more" @click=${() => (this.unfolded = new Set([...this.unfolded, app.id]))}>${t('home-n-more', { n: kept.length - SHOWN })}</button>` : nothing}`;
  }
  /** The kept documents the search finds, the best first: the title and up to two lines, the words marked. */
  private renderFound(kept: Kept[]) {
    const names = new Map(apps().map((a) => [a.id, a]));
    const docs = kept.filter((k) => names.has(k.app)).map((k) => ({ id: k.id, title: k.title || t('common-untitled'), app: names.get(k.app)!.name, folder: '', lines: keptLines(k), at: k.at }));
    const found = search(docs, this.query);
    const byId = new Map(kept.map((k) => [k.id, k]));
    if (!found.length) return html`<p class="to-hint" role="status">${t('home-no-document-here-has-those')}</p>`;
    return html`<p class="sr-only" role="status">${t('home-n-documents-found', { n: found.length })}</p>
      <ul class="to-found-docs" aria-label=${t('home-documents-found')}>
        ${found.map((f) => {
          const k = byId.get(f.id)!;
          const a = names.get(k.app)!;
          return html`<li><a href=${k.hash}><b>${segs(f.title)}</b> <small>${a.name} · ${ago(k.at, document.documentElement.lang)}</small>${f.context.map((c) => html`<small>${segs(c)}</small>`)}</a></li>`;
        })}
      </ul>`;
  }
  /** Whose project it is and where it was made, the beta, where its source is, and how to write: one line. "Aboard Foundry" and "GitHub" are names, said as they are in every language. */
  private foot() {
    const [before, after = ''] = t('home-aboard-project-made-with-respect').split('{aboard}');
    return html`<footer class="to-home-foot">
      <p>${before}<a href=${MAKER} target="_blank" rel="noopener" data-to-chrome>Aboard Foundry</a>${after} · ${t('home-beta-version')} · <a href=${repoUrl()} target="_blank" rel="noopener" data-to-chrome>GitHub</a> · <a href=${MAIL} data-to-chrome>${t('home-email')}</a>${this.version ? html` · ${this.version.tag || this.version.commit.slice(0, 7)}` : nothing}</p>
    </footer>`;
  }
  render() {
    const kept = library();
    const want = this.query.trim();
    return html`<div class="to-home">
      <h1 class="sr-only">${t('common-tiny-little-office')}</h1>
      ${
        keeping() && kept.length
          ? html`<input class="to-search" type="search" placeholder=${t('home-search-your-documents')} aria-label=${t('home-search-your-documents')} autocomplete="off" .value=${this.query} @input=${(e: Event) => (this.query = (e.target as HTMLInputElement).value)} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && (e.preventDefault(), this.querySelector<HTMLElement>('.to-found-docs a')?.click())} />`
          : nothing
      }
      ${want ? this.renderFound(kept) : nothing}
      <div class="to-apps" ?hidden=${!!want}>
        ${apps().map(
          (a) => html`<section class="to-app" aria-label=${a.name}>
            <div class="to-app-head" @pointerenter=${() => void preloadTemplates(a)}>
              <a class="to-app-open" href=${routeHash(a.id)} @click=${startEditing}>${icon(a.icon, 20)}<span class="to-app-name">${a.name}</span></a>
              <to-templates .app=${a}></to-templates>
            </div>
            ${this.drive(
              a,
              kept.filter((k) => k.app === a.id),
            )}
          </section>`,
        )}
      </div>
      ${this.foot()}
    </div>`;
  }
}
customElements.define('to-home', ToHome);
