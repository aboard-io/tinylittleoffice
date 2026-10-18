/**
 * <to-comment-box>: where a comment is written, a new one or a reply in a thread (kit/ui/comments.ts, the margin): a
 * plain field, marked `data-comment-box` so the words' bubble offers no Comment inside it, with Comment (or Reply), Ask
 * (when the host has an assistant to ask: `ask`, "Ask Assistant"), and Cancel when there is something to cancel.
 *
 * - "@" with letters after it (at the start or after a space) offers the host's people under the field (`people`, the
 *   assistant first), as "@" offers them in the words (kit/text/text.ts `mentions`): Up and Down move, Enter or Tab puts
 *   in the one chosen ("@Dana Diaz "), Escape closes the list and keeps the words, a click picks. A person is kept as
 *   words in the comment; who was named is said with it (`mentions`, their ids), and "@" and the assistant's name asks it.
 * - A plain textarea rather than the kit's <to-text>: a comment is plain words, and the browser's own field is native to
 *   spelling, a phone's keyboard and a screen reader.
 * - Sending tells "comment-box-send" ({ text, ask, mentions }), bubbling; the margin hands it to the host and empties the
 *   box (`clear`) once the host says it has it, so words refused stay. Mod+Enter sends; Escape, with the list closed,
 *   tells "comment-box-cancel".
 */
import { LitElement, html, nothing } from 'lit';
import { t } from '../core/i18n.ts';
import { keysText } from '../core/commands.ts';
import type { Person } from './review-panel.ts';

/** What a box sends: its words, whether they ask the assistant, and the ids of the people named in them. */
export interface BoxSend {
  text: string;
  ask: boolean;
  mentions: string[];
}

/** The "@word" before the caret in `before`, if it is one: where its "@" is, and the letters after it. */
function trigger(before: string): { at: number; q: string } | null {
  const m = /(?:^|[\s(“"'])@([\p{L}\p{N}.'’-]*)$/u.exec(before);
  return m ? { at: before.length - m[1].length - 1, q: m[1] } : null;
}

let boxes = 0;

export class ToCommentBox extends LitElement {
  static properties = {
    people: { attribute: false },
    ask: { attribute: false },
    label: {},
    send: {},
    cancelable: { type: Boolean },
    busy: { type: Boolean },
    offered: { state: true },
    chosen: { state: true },
  };
  /** The people "@" offers. */
  declare people: Person[];
  /** The assistant a comment may ask (its name, "Assistant"), offered first by "@"; null for none. */
  declare ask: Person | null;
  /** The field's name: "Comment", "Reply". */
  declare label: string;
  /** The send button's words. */
  declare send: string;
  declare cancelable: boolean;
  /** Sending: the buttons wait. */
  declare busy: boolean;
  declare offered: Person[];
  declare chosen: number;
  private readonly key = `to-box-${++boxes}`;

  constructor() {
    super();
    this.people = [];
    this.ask = null;
    this.label = '';
    this.send = '';
    this.cancelable = false;
    this.busy = false;
    this.offered = [];
    this.chosen = 0;
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('data-comment-box', '');
  }

  get field(): HTMLTextAreaElement | null {
    return this.querySelector('textarea');
  }
  /** The words written. */
  get value(): string {
    return this.field?.value ?? '';
  }
  /** Empties the box, once what it said is the host's. */
  clear() {
    if (this.field) this.field.value = '';
    this.offered = [];
  }
  /** The focus in the field. */
  async focusField() {
    await this.updateComplete;
    this.field?.focus();
  }

  /** Everyone "@" may name: the assistant first. */
  private get named(): Person[] {
    return [...(this.ask ? [this.ask] : []), ...this.people.filter((p) => p.id !== this.ask?.id)];
  }
  /** Whoever has a word of their name or id beginning with the letters `q`. */
  private offer(q: string): Person[] {
    const starts = (p: Person) => [p.name, p.id].some((s) => s.split(/[\s@.]+/).some((w) => w.toLowerCase().startsWith(q.toLowerCase())));
    return this.named.filter((p) => !q || starts(p)).slice(0, 8);
  }
  private onInput = () => {
    const field = this.field!;
    const found = field.selectionStart === field.selectionEnd ? trigger(field.value.slice(0, field.selectionStart)) : null;
    this.offered = found ? this.offer(found.q) : [];
    this.chosen = 0;
  };
  /** The one chosen put in place of the "@word" before the caret. */
  private pick(p: Person) {
    const field = this.field!;
    const caret = field.selectionStart;
    const found = trigger(field.value.slice(0, caret));
    if (!found) return;
    field.setRangeText(`@${p.name} `, found.at, caret, 'end');
    this.offered = [];
    field.focus();
  }
  private onKey = (e: KeyboardEvent) => {
    if (e.isComposing) return;
    if (this.offered.length) {
      const n = this.offered.length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.chosen = (this.chosen + (e.key === 'ArrowDown' ? 1 : n - 1)) % n;
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        this.pick(this.offered[this.chosen]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.offered = [];
        return;
      }
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      this.submit(false);
    } else if (e.key === 'Escape' && this.cancelable) {
      e.preventDefault();
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('comment-box-cancel', { bubbles: true }));
    }
  };
  /** The people the words name ("@" and their name), by id. */
  private mentionsIn(text: string): string[] {
    const low = text.toLowerCase();
    return this.named.filter((p) => low.includes(`@${p.name.toLowerCase()}`)).map((p) => p.id);
  }
  private submit(ask: boolean) {
    const text = this.value.trim();
    if (!text || this.busy) return;
    const mentions = this.mentionsIn(text);
    const asks = ask || (!!this.ask && mentions.includes(this.ask.id));
    this.dispatchEvent(new CustomEvent<BoxSend>('comment-box-send', { detail: { text, ask: asks, mentions }, bubbles: true }));
  }
  private onSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    this.submit((e.submitter as HTMLElement | null)?.dataset.ask !== undefined);
  };

  render() {
    const list = `${this.key}-people`;
    const open = this.offered.length > 0;
    const label = this.label || t('common-comment');
    return html`<form class="to-comment-box" @submit=${this.onSubmit}>
      <textarea
        class="to-comment-field"
        rows="3"
        aria-label=${label}
        placeholder=${t('comments-write', { what: label })}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded=${open ? 'true' : 'false'}
        aria-controls=${list}
        aria-activedescendant=${open ? `${list}-${this.chosen}` : nothing}
        @input=${this.onInput}
        @keydown=${this.onKey}
        @blur=${() => setTimeout(() => !this.contains(document.activeElement) && (this.offered = []), 150)}
      ></textarea>
      ${
        open
          ? html`<ul class="to-comment-people" id=${list} role="listbox" aria-label=${t('comments-people')}>
              ${this.offered.map(
                (p, i) =>
                  html`<li id=${`${list}-${i}`} role="option" class="to-comment-person" aria-selected=${i === this.chosen ? 'true' : 'false'} data-id=${p.id} @mousedown=${(e: Event) => (e.preventDefault(), this.pick(p))}>
                    <span>@${p.name}</span>${p.id !== p.name ? html`<span class="to-hint">${p.id === this.ask?.id ? t('comments-ask', { name: p.name }) : p.id}</span>` : nothing}
                  </li>`,
              )}
            </ul>`
          : nothing
      }
      <div class="to-comment-acts">
        <button type="submit" class="to-btn primary to-comment-send" ?disabled=${this.busy} title=${keysText('Mod+Enter')}>${this.send || t('common-comment')}</button>
        ${this.ask ? html`<button type="submit" class="to-btn to-comment-ask" data-ask ?disabled=${this.busy}>${t('comments-ask', { name: this.ask.name })}</button>` : nothing}
        ${this.cancelable ? html`<button type="button" class="to-btn to-comment-cancel" @click=${() => this.dispatchEvent(new CustomEvent('comment-box-cancel', { bubbles: true }))}>${t('common-cancel')}</button>` : nothing}
      </div>
    </form>`;
  }
}
if (!customElements.get('to-comment-box')) customElements.define('to-comment-box', ToCommentBox);

declare global {
  interface HTMLElementTagNameMap {
    'to-comment-box': ToCommentBox;
  }
}
