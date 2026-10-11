/**
 * The question before a link is followed. Anyone can write any address into a document and pass the link
 * round, and the words shown for a link need not match where it goes; so no link that leaves Tiny Little
 * Office opens without first showing, in large type, the site it goes to and the whole address, and asking:
 * a red Cancel (the default, focused) and a green Go (a new tab, no opener, no referrer). A link to anything
 * but a web page, an email or a phone number does not open at all (a toast says so).
 *
 * installLinkGuard() is called once by the shell: one capture-phase catcher on the document for click and
 * auxclick (a middle click), so every link in every app, the display mode, a card's "open on the site", a
 * footnote's link, Mod+click and Enter on a focused link (the browser's own click) are all asked about. Links
 * that stay here pass: this origin (the apps' own routes, "Open in a new tab" of a document held in another),
 * and a file this page made (blob:).
 * openLink(href) is the same question for a link followed from code (the link bubble's Open).
 * (Ported from the old tree's src/widgets/link-guard.ts; the dialog is the kit's <to-dialog>.)
 */
import { html, nothing } from 'lit';
import { icon, UI } from './icons.ts';
import { t } from './i18n.ts';
import { toast } from './toast.ts';
import type { ToDialog } from './dialog.ts';
import './dialog.ts';

const OPENS = ['http:', 'https:', 'mailto:', 'tel:'];

/** Where a link really goes: null for one that stays here, 'refused' for one that never opens, else the address. */
export function leaving(href: string, base = location.href): URL | 'refused' | null {
  let url: URL;
  try {
    url = new URL(href, base);
  } catch {
    return 'refused';
  }
  const here = new URL(base).origin;
  if ((url.protocol === 'http:' || url.protocol === 'https:') && url.origin === here) return null;
  // A file this page made itself (a download) is this page's own.
  if (url.protocol === 'blob:' && url.origin === here) return null;
  if (!OPENS.includes(url.protocol)) return 'refused';
  return url;
}

let guard: ToDialog | null = null;
/** The page's one guard dialog, made when first wanted. */
function theGuard(): ToDialog {
  if (!guard || !guard.isConnected) {
    guard = document.createElement('to-dialog') as ToDialog;
    guard.className = 'to-link-guard';
    document.body.append(guard);
  }
  return guard;
}

/**
 * The characters that turn or hide what is drawn: the bidi controls and marks (U+200E–200F, U+202A–202E, U+2066–2069),
 * the zero-width ones (U+200B–200D), the byte-order mark (U+FEFF); and, beyond that list, the Arabic letter mark
 * (U+061C, a bidi mark like U+200F) and the word joiner and invisible operators (U+2060–2064, zero-width like U+200B).
 */
const HIDDEN = /[\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/;

/**
 * What the dialog says of an address: what the link does, and the one name to read (the host, the mailbox, the
 * number). Null for a mailbox or a number whose name hides characters (HIDDEN: a reversal drawn would show a false address in
 * large type); a web address's host is the browser's own spelling, and its whole address spells such characters out.
 */
export function where(u: URL): { what: string; name: string } | null {
  if (u.protocol === 'mailto:' || u.protocol === 'tel:') {
    let name = u.pathname;
    try {
      name = decodeURIComponent(name);
    } catch {
      // Not a whole encoding: drawn as written.
    }
    if (HIDDEN.test(name)) return null;
    return { what: u.protocol === 'mailto:' ? t('This link writes an email to') : t('This link calls'), name };
  }
  // The host as the browser will reach it: a look-alike letter shows as its xn-- spelling.
  return { what: t('You are leaving Tiny Little Office for'), name: u.hostname };
}

/** Ask before going to this address. */
export async function ask(url: URL): Promise<void> {
  const said = where(url);
  if (!said) return toast(t('This link hides characters in its address.'));
  const { what, name } = said;
  const d = theGuard();
  const go = () => {
    d.close();
    window.open(url.href, '_blank', 'noopener,noreferrer');
  };
  // Said as it opens, after the question: what the link does and where (Cancel, which has the focus, says nothing of it).
  const id = (part: string) => `${d.uid}-${part}`;
  const plain = url.protocol === 'http:';
  d.heading = t('Do you trust this link?');
  d.describedby = [id('what'), id('host'), ...(plain ? [id('warn')] : [])].join(' ');
  d.body = html`<p class="lg-what" id=${id('what')}>${what}</p>
    <p class="lg-host" id=${id('host')} dir="ltr">${name}</p>
    ${plain ? html`<p class="lg-warn" id=${id('warn')}>${icon(UI.shield, 16)} ${t('Not a secure address: what you send there can be read on the way.')}</p>` : nothing}
    <p class="lg-label">${t('The whole address:')}</p>
    <code class="lg-url" dir="ltr">${url.href}</code>
    <p class="lg-note">${t('Someone wrote this link into the document. The words shown for a link need not match where it goes. Only go if you trust where it leads.')}</p>
    <div class="lg-buttons">
      <button type="button" class="to-btn lg-cancel" autofocus @click=${() => d.close()}>${icon(UI.close, 18)}<span>${t('Cancel')}</span></button>
      <button type="button" class="to-btn lg-go" @click=${go}><span>${t('Go')}</span>${icon(UI.open, 18)}</button>
    </div>`;
  await d.show();
  d.querySelector<HTMLButtonElement>('.lg-cancel')?.focus();
}

/** A link that does not open here, said so. */
const refuse = () => toast(t('Links of this kind do not open here.'));

/** Follow a link from code the way every link is followed: by asking first. */
export function openLink(href: string) {
  const url = leaving(href);
  if (url === 'refused') return refuse();
  if (url === null) return void window.open(new URL(href, location.href).href, '_blank', 'noopener');
  void ask(url);
}

/** The address an anchor (in HTML or SVG) points at, as written. */
const hrefOf = (a: Element) => a.getAttribute('href') ?? a.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ?? '';

const guarded = new WeakSet<Document>();
/** Every click on a link that leaves the site, anywhere on the page, asks first. */
export function installLinkGuard(root: Document = document) {
  if (guarded.has(root)) return;
  guarded.add(root);
  const catchIt = (e: MouseEvent) => {
    if (e.type === 'auxclick' && e.button !== 1) return;
    // (An SVG link may carry its address as xlink:href.)
    const a = e.composedPath().find((n): n is Element => n instanceof Element && n.localName === 'a' && !!hrefOf(n));
    if (!a || a.closest('.to-link-guard')) return;
    // In words being written a click puts the caret in the link (the bubble shows where it goes); Mod+click follows it.
    if (a.closest('[contenteditable="true"]') && !(e.metaKey || e.ctrlKey) && e.type === 'click') return void e.preventDefault();
    // A download the page is saving is not a link out.
    if (a.hasAttribute('download') && /^(blob|data):/.test(hrefOf(a))) return;
    const url = leaving(hrefOf(a));
    if (url === null) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (url === 'refused') refuse();
    else void ask(url);
  };
  root.addEventListener('click', catchIt, true);
  root.addEventListener('auxclick', catchIt, true);
}
