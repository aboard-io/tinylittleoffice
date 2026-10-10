/**
 * The three things Insert ▾ asks an address for, as one kind of dialog each app shares (Write, Deck, the
 * Outliner, the Website Builder): Web Picture, Web Embed and Tiny Little Office Doc. Each is a <to-dialog>
 * with one layout: one wide address field with OK at its right (one row; the field takes the room), and
 * under it what that address will be, drawn as soon as it is typed or pasted. The content sits at the top of
 * the dialog, so nothing moves as the preview arrives or the window grows. A person never types a marker:
 * the address is all, and the code writes the block.
 *
 *   askPicture()  a picture by its address, shown as it will be (an <img> that sends no referrer; a broken
 *                 one says so), and the words for anyone who cannot see it, optional, in a second field.
 *   askEmbed()    a thing from the web: the sources embeds.ts knows as a row of icons and names, and the
 *                 card <to-embed> will draw.
 *   askDocLink()  a Tiny Little Office link, long or short, and the document's first page drawn small; it
 *                 resolves to the fence that holds the document (refFence), a short link opened here first.
 *                 A link locked with a password goes in as itself, drawn as the locked card (kit/locked.ts).
 *
 * Each resolves null when closed without OK.
 */
import { html, nothing, type TemplateResult } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { BookOpen, Code, File as FileIcon, Landmark, MapPin, MessageCircle, Music, Video, type IconNode } from 'lucide';
import type { Block } from '../doc/index.ts';
import { lookup } from './app.ts';
import { linkToFence } from './clipboard.ts';
import { LOCKED_LANG } from './locked.ts';
import type { ToDialog } from './dialog.ts';
import { EMBED_SOURCES, embedOf, type EmbedKind } from './embeds.ts';
import { icon, UI } from './icons.ts';
import { authored, gateSvg, mayShow, onPictures, picture } from './pictures.ts';
import { pictureSrc } from './media.ts';
import { t } from './i18n.ts';
import { TINIER, unshorten } from './short.ts';
import { origin } from './network.ts';
import './dialog.ts';
import './embeds.ts';

/** An address that can be asked for: http or https, no spaces. */
export const isAddress = (url: string): boolean => /^https?:\/\/\S+$/.test(url.trim());

interface Frame<T> {
  /** Draw the dialog again (after the state changed). */
  draw: () => void;
  /** Close it with this answer. */
  finish: (v: T) => void;
}

/** A dialog on the page's body: drawn from `body` whenever it asks, resolved with what `finish` was given, or null. */
function ask<T>(heading: string, cls: string, body: (f: Frame<T>) => TemplateResult): Promise<T | null> {
  return new Promise((done) => {
    const dialog = document.createElement('to-dialog') as ToDialog;
    dialog.heading = heading;
    dialog.className = `to-ask-dialog ${cls}`;
    let answer: T | null = null;
    const f: Frame<T> = {
      draw: () => (dialog.body = body(f)),
      finish: (v) => {
        answer = v;
        dialog.close();
      },
    };
    f.draw();
    const off = onPictures(f.draw);
    dialog.addEventListener('to-close', () => {
      off();
      dialog.remove();
      done(answer);
    });
    document.body.append(dialog);
    void dialog.show().then(() => dialog.querySelector<HTMLInputElement>('.to-ask-url')?.focus());
  });
}

/** The one row every dialog here has: the address, and OK at its right. */
function urlRow(o: { label: string; placeholder: string; value: string; ok: boolean; input: (v: string) => void }): TemplateResult {
  return html`<div class="to-ask-row">
    <input class="to-ask-url" type="url" inputmode="url" aria-label=${o.label} placeholder=${o.placeholder} .value=${o.value} autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" @input=${(e: Event) => o.input((e.target as HTMLInputElement).value)} />
    <button type="submit" class="to-btn primary to-ask-ok" ?disabled=${!o.ok}>${t('OK')}</button>
  </div>`;
}
const form = (cls: string, submit: () => void, inner: TemplateResult) => html`<form class="to-ask ${cls}" novalidate @submit=${(e: Event) => (e.preventDefault(), submit())}>${inner}</form>`;

/* ---------- Web Picture ---------- */

export interface Picture {
  url: string;
  alt: string;
}

/** A picture from the web, by its address (and, optionally, its words): the address shows the picture as it is typed. */
export function askPicture(now: Partial<Picture> = {}): Promise<Picture | null> {
  let url = now.url ?? '';
  let alt = now.alt ?? '';
  let state: 'loading' | 'ok' | 'broken' = 'loading';
  return ask<Picture>(t('Web Picture'), 'to-ask-picture', (f) => {
    const ok = isAddress(url);
    // The address typed here is the author's own choice: it shows at once, here and in the document (kit/pictures.ts).
    const submit = () => ok && (authored(url.trim()), f.finish({ url: url.trim(), alt: alt.trim() }));
    // The address the picture already had is the document's: not fetched until asked for, even here.
    const asked = url.trim() !== (now.url ?? '').trim() || mayShow(url.trim());
    return form(
      'to-ask-picture-form',
      submit,
      html`${urlRow({ label: t('Address of the picture'), placeholder: 'https://', value: url, ok, input: (v) => ((url = v), (state = 'loading'), f.draw()) })}
        <label class="to-ask-alt"><span>${t('Words for anyone who cannot see it (optional)')}</span><input class="to-ask-text" type="text" .value=${alt} autocomplete="off" enterkeyhint="done" @input=${(e: Event) => (alt = (e.target as HTMLInputElement).value)} /></label>
        <div class="to-ask-preview" aria-live="polite">
          ${
            ok && !asked
              ? picture(url.trim(), alt)
              : ok
                ? html`<img class=${state} src=${pictureSrc(url.trim())} alt=${alt} referrerpolicy="no-referrer" @load=${() => ((state = 'ok'), f.draw())} @error=${() => ((state = 'broken'), f.draw())} />
                ${state === 'broken' ? html`<p class="to-hint to-ask-broken">${t('No picture came from this address. Check it, or try another.')}</p>` : nothing}`
                : html`<p class="to-hint">${t('Paste the address of a picture on the web: the picture shows here.')}</p>`
          }
        </div>`,
    );
  });
}

/* ---------- Web Embed ---------- */

const KIND_ICON: Record<EmbedKind, IconNode> = {
  video: Video,
  audio: Music,
  music: Music,
  image: UI.image,
  pdf: FileIcon,
  post: MessageCircle,
  map: MapPin,
  code: Code,
  page: Landmark,
  article: BookOpen,
  link: UI.globe,
};

/** A thing from the web, by its address: the sources it can come from are shown, and the card it will be. Resolves the address. */
export function askEmbed(now = ''): Promise<string | null> {
  let url = now;
  return ask<string>(t('Web Embed'), 'to-ask-embed', (f) => {
    const ok = isAddress(url);
    const known = ok ? embedOf(url.trim()) : null;
    return form(
      'to-ask-embed-form',
      () => ok && f.finish(url.trim()),
      html`${urlRow({ label: t('Address of a video, a post, a song, a place, a page'), placeholder: 'https://', value: url, ok, input: (v) => ((url = v), f.draw()) })}
        <ul class="to-ask-sources" aria-label=${t('What it can show')}>
          ${EMBED_SOURCES.map((s) => html`<li class=${known?.provider === s.name ? 'on' : ''}>${icon(KIND_ICON[s.kind], 18)}<span>${s.name}</span></li>`)}
          <li class=${known?.file ? 'on' : ''}>${icon(FileIcon, 18)}<span>${t('A film, a sound, a PDF or a picture')}</span></li>
        </ul>
        <div class="to-ask-preview" aria-live="polite">
          ${ok ? html`<to-embed url=${url.trim()}></to-embed>${known ? nothing : html`<p class="to-hint">${t('Not one of these: it goes in as a link to the page.')}</p>`}` : nothing}
        </div>`,
    );
  });
}

/* ---------- Tiny Little Office Doc ---------- */

/** The fence as a document holds one: its body without the new line its text ends with. */
const asFence = (b: Block | null): Block | null => (b?.k === 'fence' ? { ...b, body: b.body.replace(/\n$/, '') } : b);

/** A short link from the shortener, …/<id>#<key> (an owner's ".<o>" after the key too): where it is, its id and key. */
export function shortParts(link: string): { at: string; id: string; key: string } | null {
  const m = /^(https?:\/\/\S+\/)([A-Za-z0-9_~-]{4,})#([A-Za-z0-9_~-]{16,})(?:\.[A-Za-z0-9_~-]+)?$/.exec(link.trim());
  if (!m) return null;
  // Only ever asked of the shortener itself, here or in production.
  if (m[1] !== TINIER && m[1] !== `${origin('tinier')}/`) return null;
  return { at: m[1], id: m[2], key: m[3] };
}

/** A short link opened: the long link it holds, as the fence of its document; null when it is gone or is not a document. */
export async function openShort(link: string): Promise<Block | null> {
  const p = shortParts(link);
  if (!p) return null;
  try {
    const r = await fetch(`${p.at}api/${p.id}`);
    if (!r.ok) return null;
    const { c, iv } = (await r.json()) as { c: string; iv: string };
    return asFence(linkToFence(await unshorten(c, iv, p.key)));
  } catch {
    return null;
  }
}

/** Another Tiny Little Office document, by its link (long or short): its first page is shown small. Resolves the fence that holds it. */
export function askDocLink(): Promise<Block | null> {
  let url = '';
  let fence: Block | null = null;
  let state: 'none' | 'opening' | 'ok' | 'bad' = 'none';
  let asked = 0;
  return ask<Block>(t('Tiny Little Office Doc'), 'to-ask-doc', (f) => {
    const typed = (v: string) => {
      url = v;
      const n = ++asked;
      fence = null;
      const s = v.trim();
      if (!s) state = 'none';
      else if ((fence = asFence(linkToFence(s)))) state = 'ok';
      else if (shortParts(s)) {
        state = 'opening';
        void openShort(s).then((got) => {
          if (n !== asked) return;
          fence = got;
          state = got ? 'ok' : 'bad';
          f.draw();
        });
      } else state = 'bad';
      f.draw();
    };
    const b = fence as Block | null;
    const def = b?.k === 'fence' ? lookup.appOf(b.lang) : undefined;
    const page = b?.k === 'fence' && def ? def.view(b.body, { small: true, still: true })[0] : null;
    const name = b?.k === 'fence' ? def?.title(b.body) || (b.lang === LOCKED_LANG ? def!.name : t('Untitled {noun}', { noun: def?.noun ?? b.lang })) : '';
    return form(
      'to-ask-doc-form',
      () => b && f.finish(b),
      html`${urlRow({ label: t('A Tiny Little Office link'), placeholder: `${origin('site')}/#/v1/…`, value: url, ok: state === 'ok', input: typed })}
        <div class="to-ask-preview" aria-live="polite">
          ${
            state === 'ok' && b?.k === 'fence'
              ? html`<figure class="to-ask-page">
                ${page ? html`<svg viewBox="0 0 ${page.w} ${page.h}" role="img" aria-label=${page.alt || name}>${unsafeSVG(gateSvg(page.svg, true))}</svg>` : nothing}
                <figcaption><b>${name}</b><small>${def?.name ?? b.lang}</small></figcaption>
              </figure>`
              : state === 'opening'
                ? html`<p class="to-hint">${t('Opening the short link…')}</p>`
                : state === 'bad'
                  ? html`<p class="to-hint to-ask-broken">${t('This is not a Tiny Little Office link, or it has expired.')}</p>`
                  : html`<p class="to-hint">${t('Paste the link of another Tiny Little Office document, long or short: its first page shows here.')}</p>`
          }
        </div>`,
    );
  });
}
