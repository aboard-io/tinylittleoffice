/**
 * <to-comments>: the margin, the comments of a document several people write beside its words (docs/library.md,
 * Tracked changes and comments for a host). Each open thread whose words are found is a note beside them, at their
 * height (kit/text/redline.ts `pinComments`), a note that would meet the one above it moved down under it, placed again
 * whenever the words move: an edit here or another's ("docchange", "docremote"), who did what drawn again
 * ("text-redline", kit/text/redline.ts `drawChanges`), a scroll, a width. Where there is no room beside the words (a
 * phone: the stylesheet's `--to-comments-beside`), the margin is a sheet over the page's foot, opened by a button that
 * says how many threads are open, the notes in the order their words read.
 *
 * - A note opens its thread: the words it is about, every comment (by whom, in their color, and when), the box to
 *   reply (kit/ui/comment-box.ts, with "@" for the host's people), Resolve, and Close (or Escape). A reply of the
 *   host's assistant that made changes in answer (a Comment's `change_ids`) lists them, each in words, where it stands,
 *   and Accept and Reject for whoever reviews (kit/ui/review-panel.ts `changeRow`).
 * - The words' bubble has Comment while the margin is given the editor's words (`words`) and the reader may comment
 *   (`canComment`: the margin marks the editor `data-comments`), and a box opens beside the words selected for a new
 *   thread on them (kit/text/quote.ts Quote); New comment, at the top, one on the whole document.
 * - Threads whose words are no longer there are listed under "On words since changed", threads on the whole document
 *   under their own heading, resolved threads folded under Resolved.
 * - `ask`, the host's assistant (Atlas), is offered first by "@", and each box has Ask beside Comment: a comment that
 *   asks says so (`to_atlas`), and until a comment of the assistant's answers it the thread says it is answering.
 *
 * Storage is the host's: the margin is given the comments as its server keeps them (kit/text/review.ts Comment, made
 * into threads by `threadsOf`), its people (Person), who reads (`me`), and for a reply's changes the tracked changes and
 * the reviews; and it tells what is asked, bubbling, changing nothing itself:
 *
 * - "comment-send" (CommentSend): words for a new thread on `quote` (null: on the whole document) or a reply to
 *   `parent_id`, whether they ask the assistant, whom they name, and `done(ok)`, which the host calls once it has kept
 *   them (the box is emptied) or refused them (the words stay);
 * - "comment-resolve" `{ thread_id, resolved }`, "comment-delete" `{ id }` (a reader's own comment);
 * - "review-accept" and "review-reject" `{ ids }`, as the review panel tells them, for a reply's changes.
 */
import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { language, t } from '../core/i18n.ts';
import type { Change } from '../text/changes.ts';
import { pinComments, PREFIX, unpin, type Pinned } from '../text/redline.ts';
import type { Quote } from '../text/quote.ts';
import { covers, reviewsOf, threadsOf, type Comment, type Review, type Standing, type Thread } from '../text/review.ts';
import type { ToText } from '../text/text.ts';
import './comment-box.ts';
import type { BoxSend, ToCommentBox } from './comment-box.ts';
import { changeRow, colorsOf, type Person, type ReviewAsk } from './review-panel.ts';

/** What "comment-send" carries (the header). */
export interface CommentSend {
  text: string;
  ask: boolean;
  mentions: string[];
  parent_id: string | null;
  quote: Quote | null;
  done(ok?: boolean): void;
}

/** A new thread being written: on the words of `quote`, or, null, on the whole document. */
type Draft = { quote: Quote | null };
const DRAFT = '\u0000draft';

export class ToComments extends LitElement {
  static properties = {
    comments: { attribute: false },
    people: { attribute: false },
    ask: { attribute: false },
    words: { attribute: false },
    changes: { attribute: false },
    reviews: { attribute: false },
    standing: { attribute: false },
    me: {},
    canComment: { type: Boolean, attribute: 'can-comment' },
    canReview: { type: Boolean, attribute: 'can-review' },
    prefix: {},
    open: { state: true },
    draft: { state: true },
    pins: { state: true },
    sheet: { state: true },
  };
  declare comments: Comment[];
  declare people: Person[];
  /** The host's assistant, whom a comment may ask; null for none. */
  declare ask: Person | null;
  /** The editor's words the notes are placed by (a mounted Word Processor's: `wordsOf`); null with none. */
  declare words: ToText | null;
  /** The tracked changes and the host's reviews (or its own `standing`), for the changes a reply made in answer. */
  declare changes: Change[];
  declare reviews: Review[];
  declare standing: ((c: Change) => Standing) | null;
  declare me: string;
  declare canComment: boolean;
  declare canReview: boolean;
  /** The highlights' prefix for the comments' words (redline.ts PREFIX unless a page holding two documents names one apart). */
  declare prefix: string;
  /** The thread open, or ''. */
  declare open: string;
  declare draft: Draft | null;
  declare pins: Pinned[];
  /** On a phone: the sheet is open. */
  declare sheet: boolean;

  private frame = 0;
  private watched: { words: ToText; editor: Element; off: () => void } | null = null;
  private resizing: ResizeObserver | null = null;

  constructor() {
    super();
    this.comments = [];
    this.people = [];
    this.ask = null;
    this.words = null;
    this.changes = [];
    this.reviews = [];
    this.standing = null;
    this.me = '';
    this.canComment = false;
    this.canReview = false;
    this.prefix = PREFIX;
    this.open = '';
    this.draft = null;
    this.pins = [];
    this.sheet = false;
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('scroll', this.schedule, { capture: true, passive: true });
    window.addEventListener('resize', this.schedule);
    this.resizing = new ResizeObserver(this.schedule);
    this.resizing.observe(this);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('scroll', this.schedule, { capture: true });
    window.removeEventListener('resize', this.schedule);
    this.resizing?.disconnect();
    this.unwatch();
    cancelAnimationFrame(this.frame);
    unpin(this.prefix);
  }

  /** The threads, as the host's comments make them. */
  get threads(): Thread[] {
    return threadsOf(this.comments);
  }

  /** Thread `id` opened, as a click on its note does: the focus in its box to reply, or on Close where there is none. */
  async show(id: string) {
    this.open = id;
    if (!this.beside) this.sheet = true;
    await this.updateComplete;
    const thread = this.querySelector<HTMLElement>(`[data-thread="${CSS.escape(id)}"]`);
    const box = thread?.querySelector<ToCommentBox>('to-comment-box');
    if (box) await box.focusField();
    else thread?.querySelector<HTMLElement>('.to-thread-close')?.focus();
  }

  /** A new thread begun on `quote` (null: on the whole document), its box open beside the words. */
  async write(quote: Quote | null) {
    if (!this.canComment) return;
    this.draft = { quote };
    this.open = '';
    if (!this.beside) this.sheet = true;
    await this.updateComplete;
    this.repin();
    await this.updateComplete;
    await this.querySelector<ToCommentBox>('.to-draft to-comment-box')?.focusField();
  }

  /** Whether there is room for the notes beside the words (the stylesheet says: `--to-comments-beside`). */
  get beside(): boolean {
    return getComputedStyle(this).getPropertyValue('--to-comments-beside').trim() !== '0';
  }

  /* ---------- the words, watched ---------- */

  private unwatch() {
    this.watched?.off();
    this.watched = null;
  }
  private watch() {
    const words = this.words;
    if (this.watched?.words === words) return;
    this.unwatch();
    if (!words) return;
    const editor = words.closest('.to-editor') ?? words;
    const onComment = (e: Event) => void this.write((e as CustomEvent<Quote | null>).detail ?? null);
    words.addEventListener('text-comment', onComment);
    words.addEventListener('text-redline', this.schedule);
    editor.addEventListener('docchange', this.schedule);
    editor.addEventListener('docremote', this.schedule);
    this.resizing?.observe(words);
    this.watched = {
      words,
      editor,
      off: () => {
        words.removeEventListener('text-comment', onComment);
        words.removeEventListener('text-redline', this.schedule);
        editor.removeEventListener('docchange', this.schedule);
        editor.removeEventListener('docremote', this.schedule);
        this.resizing?.unobserve(words);
        editor.removeAttribute('data-comments');
      },
    };
  }

  /** Placed again a frame from now, once however often it is asked meanwhile: the words drawn first. */
  private schedule = () => {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      void (this.words?.updateComplete ?? Promise.resolve()).then(() => this.repin());
    });
  };

  /** Each open thread's words found again, and the draft's, and where each note goes from the top of the notes. */
  private repin() {
    const box = this.querySelector<HTMLElement>('.to-comments-notes');
    if (!this.words || !box || !this.isConnected) return;
    const quotes = this.threads.filter((th) => !th.resolved && th.quote).map((th) => ({ id: th.id, quote: th.quote, block: th.first?.block, offset: th.first?.offset }));
    if (this.draft?.quote) quotes.push({ id: DRAFT, ...this.draft.quote });
    const pins = pinComments(this.words, box, quotes, this.prefix);
    if (JSON.stringify(pins) !== JSON.stringify(this.pins)) this.pins = pins;
    else this.layout();
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has('words')) this.watch();
    this.watched?.editor.toggleAttribute('data-comments', this.canComment);
    if (changed.has('comments') || changed.has('words')) this.schedule();
    this.layout();
  }

  /** The notes at their pins, each below the one above it, beside the words; in their order where there is no room. */
  private layout() {
    const box = this.querySelector<HTMLElement>('.to-comments-notes');
    if (!box) return;
    const notes = [...box.querySelectorAll<HTMLElement>(':scope > [data-top]')];
    if (!this.beside) {
      for (const n of notes) n.style.removeProperty('top');
      box.style.removeProperty('height');
      return;
    }
    let y = 0;
    for (const n of notes.sort((a, b) => Number(a.dataset.top) - Number(b.dataset.top))) {
      const top = Math.max(y, Number(n.dataset.top));
      n.style.top = `${top}px`;
      y = top + n.offsetHeight + 8;
    }
    box.style.height = `${y}px`;
  }

  /* ---------- what is asked ---------- */

  private send(e: Event, parent: string | null) {
    e.stopPropagation();
    const box = e.target as ToCommentBox;
    const { text, ask, mentions } = (e as CustomEvent<BoxSend>).detail;
    const quote = parent ? null : (this.draft?.quote ?? null);
    box.busy = true;
    const done = (ok = true) => {
      box.busy = false;
      if (!ok) return;
      box.clear();
      if (!parent) this.draft = null;
    };
    this.dispatchEvent(new CustomEvent<CommentSend>('comment-send', { detail: { text, ask, mentions, parent_id: parent, quote, done }, bubbles: true }));
  }
  private tell(type: string, detail: unknown) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
  }
  private onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (this.open) {
      const id = this.open;
      this.open = '';
      e.stopPropagation();
      void this.updateComplete.then(() => this.querySelector<HTMLElement>(`[data-thread="${CSS.escape(id)}"] .to-note-open`)?.focus());
    } else if (this.sheet) {
      this.sheet = false;
      this.querySelector<HTMLElement>('.to-comments-toggle')?.focus();
    }
  };

  /* ---------- drawn ---------- */

  private nameOf(who: string): string {
    return (this.ask?.id === who ? this.ask.name : undefined) ?? this.people.find((p) => p.id === who)?.name ?? who;
  }
  private when(at?: string | Date): string {
    if (at === undefined) return '';
    const d = new Date(at);
    return isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat(language(), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d);
  }

  render() {
    const threads = this.threads;
    const open = threads.filter((th) => !th.resolved);
    const pinned = new Map(this.pins.map((p) => [p.id, p.top]));
    const words = !!this.words;
    const atPin = open.filter((th) => th.quote && pinned.has(th.id));
    const moved = open.filter((th) => th.quote && !pinned.has(th.id) && words);
    const whole = open.filter((th) => !th.quote || (!pinned.has(th.id) && !words));
    const resolved = threads.filter((th) => th.resolved);
    const draft = this.draft;
    const draftTop = draft?.quote ? pinned.get(DRAFT) : undefined;
    return html`<button type="button" class="to-btn to-comments-toggle" aria-expanded=${this.sheet ? 'true' : 'false'} @click=${() => (this.sheet = !this.sheet)}>
        ${t('comments-comments')} <span class="to-comments-count">${open.length || ''}</span>
      </button>
      <section class="to-comments-in" ?data-open=${this.sheet} aria-labelledby="to-comments-head" @keydown=${this.onKey}>
        <div class="to-comments-top">
          <h2 class="to-comments-head" id="to-comments-head">${t('comments-comments')} <span class="to-comments-count">${open.length || ''}</span></h2>
          ${this.canComment && !(draft && !draft.quote) ? html`<button type="button" class="to-btn to-comments-new" @click=${() => this.write(null)}>${t('comments-new')}</button>` : nothing}
          <button type="button" class="to-btn to-comments-shut" @click=${() => (this.sheet = false)}>${t('common-close')}</button>
        </div>
        ${draft && !draft.quote ? html`<div class="to-note to-draft">${this.box(null)}</div>` : nothing}
        ${!open.length && !resolved.length && !draft ? html`<p class="to-hint to-comments-none">${this.canComment && words ? t('comments-select-words') : t('comments-none')}</p>` : nothing}
        <div class="to-comments-notes">
          ${draft?.quote && draftTop !== undefined ? html`<div class="to-note to-draft" data-top=${draftTop}><p class="to-note-quote">“${draft.quote.quote.split('\n')[0]}”</p>${this.box(null)}</div>` : nothing}
          ${atPin.map((th) => this.thread(th, pinned.get(th.id)!))}
        </div>
        ${draft?.quote && draftTop === undefined ? html`<div class="to-note to-draft"><p class="to-note-quote">“${draft.quote.quote.split('\n')[0]}”</p>${this.box(null)}</div>` : nothing}
        ${moved.length ? html`<h3 class="to-comments-sub">${t('comments-words-changed')}</h3><div class="to-comments-moved">${moved.map((th) => this.thread(th))}</div>` : nothing}
        ${whole.length ? html`<h3 class="to-comments-sub">${t('comments-whole-document')}</h3><div class="to-comments-whole">${whole.map((th) => this.thread(th))}</div>` : nothing}
        ${resolved.length ? html`<details class="to-comments-resolved"><summary>${t('comments-resolved')} <span class="to-comments-count">${resolved.length}</span></summary>${resolved.map((th) => this.thread(th))}</details>` : nothing}
      </section>`;
  }

  private box(parent: string | null) {
    return html`<to-comment-box
      .people=${this.people}
      .ask=${this.ask}
      label=${parent ? t('comments-reply') : t('common-comment')}
      send=${parent ? t('comments-reply') : t('common-comment')}
      ?cancelable=${!parent}
      @comment-box-send=${(e: Event) => this.send(e, parent)}
      @comment-box-cancel=${(e: Event) => (e.stopPropagation(), (this.draft = null))}
    ></to-comment-box>`;
  }

  /** A thread: a note to open, or, open, everything in it; at `top` when pinned. */
  private thread(th: Thread, top?: number) {
    const first = th.first ?? th.comments[0];
    const color = colorsOf(this.people);
    const isOpen = this.open === th.id;
    const cls = `to-note${isOpen ? ' to-note-shown' : ''}${th.resolved ? ' to-note-resolved' : ''}`;
    if (!isOpen)
      return html`<div class=${cls} data-thread=${th.id} data-top=${top ?? nothing} style=${`--c: ${color(first.by)}`}>
        <button type="button" class="to-note-open" aria-expanded="false" @click=${() => this.show(th.id)}>
          <span class="to-note-who">${this.nameOf(first.by)}</span>
          <span class="to-note-text">${first.text}</span>
          ${th.comments.length > 1 ? html`<span class="to-hint to-note-more">${t('comments-n-replies', { n: th.comments.length - 1 })}</span>` : nothing}
        </button>
      </div>`;
    const asking = this.ask ? th.comments.filter((c, i) => c.to_atlas && !th.comments.slice(i + 1).some((r) => r.by === this.ask!.id)) : [];
    return html`<div class=${cls} data-thread=${th.id} data-top=${top ?? nothing} role="group" aria-label=${t('comments-by', { name: this.nameOf(first.by) })}>
      <div class="to-thread-head">
        <p class="to-note-quote">${th.quote ? `“${th.quote.split('\n')[0]}”` : t('comments-whole-document')}</p>
        <button type="button" class="to-btn to-thread-close" @click=${() => (this.open = '')}>${t('common-close')}</button>
      </div>
      <ol class="to-thread">
        ${th.comments.map((c) => this.comment(c))}
      </ol>
      ${asking.length ? html`<p class="to-hint to-thread-answering" role="status">${t('comments-answering', { name: this.ask!.name })}</p>` : nothing}
      ${this.canComment && !th.resolved ? this.box(th.comments.at(-1)?.id ?? th.id) : nothing}
      ${this.canComment ? html`<button type="button" class="to-btn to-thread-resolve" @click=${() => this.tell('comment-resolve', { thread_id: th.id, resolved: !th.resolved })}>${th.resolved ? t('comments-reopen') : t('comments-resolve')}</button>` : nothing}
    </div>`;
  }

  private comment(c: Comment) {
    const color = colorsOf(this.people);
    return html`<li class="to-comment" data-comment=${c.id}>
      <p class="to-comment-head">
        <span class="to-comment-who" style=${`--c: ${this.ask?.id === c.by ? (this.ask.color ?? color(c.by)) : color(c.by)}`}>${this.nameOf(c.by)}</span>
        ${c.to_atlas && this.ask ? html`<span class="to-comment-tag">${t('comments-asks', { name: this.ask.name })}</span>` : nothing}
        <span class="to-hint">${this.when(c.created_at)}</span>
        ${c.by === this.me && this.canComment ? html`<button type="button" class="to-comment-delete" @click=${() => this.tell('comment-delete', { id: c.id })}>${t('common-delete')}</button>` : nothing}
      </p>
      <p class="to-comment-text">${c.text}</p>
      ${c.change_ids?.length ? this.made(c.change_ids) : nothing}
    </li>`;
  }

  /** The changes a reply made in answer, each with where it stands and its Accept and Reject. */
  private made(ids: string[]) {
    const reviewed = reviewsOf(this.reviews);
    const ask = (verdict: 'accept' | 'reject', named: string[]) => this.tell(`review-${verdict}`, { ids: named } satisfies ReviewAsk);
    return html`<ul class="to-review-list to-comment-made">
      ${ids.map((id) => {
        const parts = this.changes.filter((c) => covers(id, c.id));
        if (!parts.length) return html`<li class="to-review-change"><p class="to-review-what">${t('review-changed')}</p></li>`;
        return parts.map((c) => changeRow(c, this.standing ? this.standing(c) : reviewed.standing(c.id, c.author, this.me), this.canReview, ask));
      })}
    </ul>`;
  }
}
if (!customElements.get('to-comments')) customElements.define('to-comments', ToComments);

declare global {
  interface HTMLElementTagNameMap {
    'to-comments': ToComments;
  }
}
