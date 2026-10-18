/**
 * <to-review-panel>: who did what in a document several people write, as a list beside its words (docs/library.md,
 * Tracked changes and comments for a host): every change the tracking found (kit/text/changes.ts `changesOf`), by
 * author, each author in their color with how many of theirs wait for this reader, each change in words ("Put in “45”
 * for “30”.") with where it stands for the reader, and Accept and Reject: one change, or all of one person's at once.
 * The panel draws and asks; the host decides. Accepting and rejecting are the host's (a rejection is an edit of its own:
 * kit/text/reject.ts `rejectOps`), so the panel says what was asked in an event and changes nothing:
 *
 * - "review-accept" and "review-reject", bubbling, `{ ids }` (ReviewAsk): the changes to accept or reject;
 * - "review-show", bubbling, `{ id }`: a change chosen in the list, for the host to bring its words into view.
 *
 * What it is given, in the shapes a host's server gives them (kit/text/review.ts): `changes`, `people` (Person: each
 * one's id as the versions name them, their name, and a color of their own if the host keeps one; otherwise their
 * place among `people`, kit/text/redline.ts colorAt), and where each change stands for `me`: from the host's `reviews`
 * (Review, as its server keeps them), or the host's own `standing`; a change accepted or rejected says by whom where the
 * reviews say ("Accepted by Lee": their `by`, named as `people` name them). `canReview` draws Accept and Reject: Accept on a
 * change of someone else's waiting for this reader, Reject on any change still open. `current` marks the change a
 * lozenge named ("text-ghost": `show(id)` brings it into view and gives it the focus).
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { language, t } from '../core/i18n.ts';
import type { Change } from '../text/changes.ts';
import { colorOf } from '../text/redline.ts';
import { reviewsOf, type Review, type Standing } from '../text/review.ts';
import { reveal } from './scroll.ts';

/** Someone who writes, comments or reviews, as a host names them: their id (Step's `author`, a comment's `by`), name, color. */
export interface Person {
  id: string;
  name: string;
  color?: string;
}

/** What "review-accept" and "review-reject" carry: the changes. */
export interface ReviewAsk {
  ids: string[];
}

/** Words cut to `n` characters at most, at a word, with an ellipsis; on one line. */
function cut(words: string, n = 120): string {
  const one = words.replace(/\s+/g, ' ').trim();
  return one.length <= n ? one : `${one.slice(0, n - 1).replace(/\s+\S*$/, '')}…`;
}

/** A change in words, as the panel says it: what it put in, took out or restyled ("Put in “45” for “30”."). */
export function changeWords(c: Change): string {
  const put = cut(c.put);
  const took = cut(c.took);
  if (c.kind === 'rejection') return put ? t('review-rejected-putting-back', { words: put }) : took ? t('review-rejected-taking-out', { words: took }) : t('review-rejected-restyling');
  if (c.kind === 'restore') return t('review-put-back', { words: put });
  if (c.kind === 'format') return c.styled.trim() ? t('review-restyled', { words: cut(c.styled, 60) }) : t('review-changed');
  if (put && took) return t('review-put-in-for', { put, took });
  if (put) return t('review-put-in', { words: put });
  if (took) return t('review-took-out', { words: took });
  if (c.styles.some((s) => s.startsWith('+block:'))) return t('review-put-in-line');
  if (c.styles.some((s) => s.startsWith('-block:'))) return t('review-took-out-line');
  return t('review-changed');
}

/** Where a change stands, in words, for the reader; accepted or rejected, by whom where the host's reviews say (`by`, names). */
const standingWords = (s: Standing, by: string[] = []): string => {
  const names = by.length ? new Intl.ListFormat(language(), { type: 'conjunction' }).format(by) : '';
  if (s === 'settled') return names ? t('review-accepted-by', { names }) : t('review-accepted');
  if (s === 'rejected') return names ? t('review-rejected-by', { names }) : t('review-rejected');
  return s === 'yours' ? t('review-yours') : s === 'reviewed' ? t('review-reviewed') : t('review-waiting');
};

/**
 * Who gave a change the verdict it stands at, by name: the live reviews of it (or of its version whole) that accepted
 * it where it is settled, that rejected it where it is rejected, each reviewer once, named as `people` (or the
 * assistant, `also`) name them; none for a change still open, or where the host gave no reviews.
 */
export function reviewersOf(reviews: readonly Review[], id: string, standing: Standing, people: readonly Person[], also?: Person | null): string[] {
  const verdict = standing === 'settled' ? 'accepted' : standing === 'rejected' ? 'rejected' : null;
  if (!verdict || !reviews.length) return [];
  const who = [
    ...new Set(
      reviewsOf(reviews)
        .of(id)
        .filter((r) => r.verdict === verdict)
        .map((r) => r.by),
    ),
  ];
  return who.map((w) => (also?.id === w ? also.name : (people.find((p) => p.id === w)?.name ?? w)));
}

/** Whether a change is still open to a verdict from this reader: Reject; and Accept, when it waits for them. */
const open = (s: Standing) => s === 'waiting' || s === 'reviewed' || s === 'yours';

/** The colors of `people` by id: each one's own, or their place's. */
export const colorsOf = (people: readonly Person[]) => {
  const order = people.map((p) => p.id);
  return (who: string) => people.find((p) => p.id === who)?.color ?? colorOf(who, order);
};

/**
 * One change as a list draws it (the panel's, and a reply's changes in the margin, kit/ui/comments.ts): its words,
 * where it stands, and Accept and Reject where the reader may give them, each telling `ask`.
 */
export function changeRow(
  c: Change,
  standing: Standing,
  canReview: boolean,
  ask: (verdict: 'accept' | 'reject', ids: string[]) => void,
  show?: () => void,
  current = false,
  by: string[] = [],
): TemplateResult {
  return html`<li class="to-review-change ${current ? 'to-review-current' : ''}" data-change=${c.id} data-standing=${standing} tabindex="-1">
    ${show ? html`<button type="button" class="to-review-what" @click=${show}>${changeWords(c)}</button>` : html`<p class="to-review-what">${changeWords(c)}</p>`}
    <p class="to-review-state">${standingWords(standing, by)}</p>
    ${
      canReview && open(standing)
        ? html`<p class="to-review-acts">
            ${standing === 'waiting' ? html`<button type="button" class="to-btn primary to-review-accept" @click=${() => ask('accept', [c.id])}>${t('review-accept')}</button>` : nothing}
            <button type="button" class="to-btn to-review-reject" @click=${() => ask('reject', [c.id])}>${t('review-reject')}</button>
          </p>`
        : nothing
    }
  </li>`;
}

export class ToReviewPanel extends LitElement {
  static properties = {
    changes: { attribute: false },
    people: { attribute: false },
    reviews: { attribute: false },
    standing: { attribute: false },
    me: {},
    canReview: { type: Boolean, attribute: 'can-review' },
    current: {},
  };
  declare changes: Change[];
  declare people: Person[];
  /** The host's reviews, as its server keeps them: where each change stands is read from them, unless `standing` is given. */
  declare reviews: Review[];
  /** Where a change stands for the reader, the host's own answer; null to read it from `reviews`. */
  declare standing: ((c: Change) => Standing) | null;
  /** Who reads, as the versions name people. */
  declare me: string;
  declare canReview: boolean;
  /** The change a lozenge named, marked in the list. */
  declare current: string;

  constructor() {
    super();
    this.changes = [];
    this.people = [];
    this.reviews = [];
    this.standing = null;
    this.me = '';
    this.canReview = false;
    this.current = '';
  }
  createRenderRoot() {
    return this;
  }

  /** The change `id` marked, brought into view and given the focus (a lozenge opened: "text-ghost"). */
  async show(id: string) {
    this.current = id;
    await this.updateComplete;
    const row = this.querySelector<HTMLElement>(`[data-change="${CSS.escape(id)}"]`);
    reveal(row);
    row?.focus({ preventScroll: true });
  }

  private standingOf(c: Change): Standing {
    return this.standing ? this.standing(c) : reviewsOf(this.reviews).standing(c.id, c.author, this.me);
  }

  private ask = (verdict: 'accept' | 'reject', ids: string[]) => {
    if (ids.length) this.dispatchEvent(new CustomEvent<ReviewAsk>(`review-${verdict}`, { detail: { ids }, bubbles: true }));
  };

  private nameOf(who: string): string {
    return this.people.find((p) => p.id === who)?.name ?? who;
  }

  render() {
    const color = colorsOf(this.people);
    const authors = [...new Set(this.changes.map((c) => c.author))];
    const states = new Map(this.changes.map((c) => [c.id, this.standingOf(c)]));
    return html`<section class="to-review" aria-labelledby="to-review-head">
      <h2 class="to-review-head" id="to-review-head">${t('review-changes')} <span class="to-review-count">${this.changes.length || ''}</span></h2>
      ${!this.changes.length ? html`<p class="to-hint to-review-none">${t('review-none')}</p>` : nothing}
      ${authors.map((who) => {
        const theirs = this.changes.filter((c) => c.author === who);
        const waiting = theirs.filter((c) => states.get(c.id) === 'waiting').map((c) => c.id);
        const openIds = theirs.filter((c) => open(states.get(c.id)!)).map((c) => c.id);
        const name = this.nameOf(who);
        return html`<section class="to-review-person" data-person=${who} style=${`--c: ${color(who)}`} aria-label=${name}>
          <h3 class="to-review-who"><span class="to-review-dot" aria-hidden="true"></span>${name} ${waiting.length ? html`<span class="to-review-waiting">${t('review-n-waiting', { n: waiting.length })}</span>` : nothing}</h3>
          ${
            this.canReview && openIds.length > 1
              ? html`<p class="to-review-all">
                  ${waiting.length ? html`<button type="button" class="to-btn to-review-accept-all" aria-label=${t('review-accept-all-by', { name })} @click=${() => this.ask('accept', waiting)}>${t('review-accept-all')}</button>` : nothing}
                  <button type="button" class="to-btn to-review-reject-all" aria-label=${t('review-reject-all-by', { name })} @click=${() => this.ask('reject', openIds)}>${t('review-reject-all')}</button>
                </p>`
              : nothing
          }
          <ol class="to-review-list">
            ${theirs.map((c) =>
              changeRow(
                c,
                states.get(c.id)!,
                this.canReview,
                this.ask,
                () => this.dispatchEvent(new CustomEvent('review-show', { detail: { id: c.id }, bubbles: true })),
                c.id === this.current,
                reviewersOf(this.reviews, c.id, states.get(c.id)!, this.people),
              ),
            )}
          </ol>
        </section>`;
      })}
    </section>`;
  }
}
if (!customElements.get('to-review-panel')) customElements.define('to-review-panel', ToReviewPanel);

declare global {
  interface HTMLElementTagNameMap {
    'to-review-panel': ToReviewPanel;
  }
}
