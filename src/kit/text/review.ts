/**
 * Who reviewed what, and who said what about it, as a host keeps them (docs/library.md, Tracked changes and comments
 * for a host): the verdicts on changes (Review) and the comments in threads (Comment), in the shapes and the names a
 * host's server gives them (Atlas's `reviews` and `comments` rows, docs/data.md there, Who did what), so its rows are
 * handed in as they come, and what the tracking and the drawing ask of them read back: whether a change had been
 * rejected or reviewed by a version (`track`'s `rejectedBy` and `reviewedBy`), whether it is settled (drawn plain), and
 * where it stands for a reader (Standing), for the review panel (kit/ui/review-panel.ts); and the comments as threads,
 * for the margin (kit/ui/comments.ts). Pure: no DOM, nothing kept between calls.
 *
 * A change is named as the tracking names it, `<hash>:<n>`; a review may name a version's changes whole, `<hash>:*`
 * (`covers`). A review taken back (`undone_at`) still closed what it reviewed, as the server's runs are closed by it,
 * and no longer settles or rejects anything. Settled is accepted by anyone: whoever may review a document reviews it for
 * everyone, so everyone sees one redline (Atlas's choice; a host that wants another gives its own `settled`).
 */

/** A verdict on a change, as a host keeps it. Times as the host gives them (an ISO string, or a Date). */
export interface Review {
  id?: string;
  /** The change it is on (`<hash>:<n>`, a Change's id), or a version's changes whole (`<hash>:*`). */
  change_id: string;
  /** Who gave it, as the versions name people (Step's `author`). */
  by: string;
  verdict: 'accepted' | 'rejected';
  /** The host's version when it was given (Step's `seq`): it closes the changes it names from the next one on. */
  at_seq: number;
  why?: string | null;
  /** Taken back, and when. */
  undone_at?: string | Date | null;
}

/** Where a change stands for a reader: accepted (drawn plain), rejected, theirs, reviewed by them, or waiting for them. */
export type Standing = 'settled' | 'rejected' | 'yours' | 'reviewed' | 'waiting';

/** Whether a review naming `reviewed` is of the change `id`: the same change, or its version's changes whole. */
export const covers = (reviewed: string, id: string): boolean => reviewed === id || (reviewed.endsWith(':*') && id.startsWith(reviewed.slice(0, -1)));

/** What the tracking, the drawing and the panel ask of a host's reviews, answered from them. */
export interface Reviewed {
  /** For `track`: whether a live rejection of the change was given before version `seq`. */
  rejectedBy(id: string, seq: number): boolean;
  /** For `track`: whether any review of it was given before version `seq` (one taken back too: it still closed it). */
  reviewedBy(id: string, seq: number): boolean;
  /** For the drawing: whether it is accepted, by anyone, and so drawn as plain words. */
  settled(id: string): boolean;
  /** Where the change stands for `me`, whose it is being `author`. */
  standing(id: string, author: string, me: string): Standing;
  /** The live reviews of the change (or of its version's changes whole), in the order given. */
  of(id: string): Review[];
}

/** A host's reviews read for the tracking, the drawing and the panel (Reviewed). */
export function reviewsOf(reviews: readonly Review[]): Reviewed {
  const live = (r: Review) => !r.undone_at;
  const of = (id: string) => reviews.filter((r) => live(r) && covers(r.change_id, id));
  const settled = (id: string) => of(id).some((r) => r.verdict === 'accepted');
  const rejection = (id: string) => of(id).some((r) => r.verdict === 'rejected');
  return {
    rejectedBy: (id, seq) => reviews.some((r) => live(r) && r.verdict === 'rejected' && r.at_seq < seq && covers(r.change_id, id)),
    reviewedBy: (id, seq) => reviews.some((r) => r.at_seq < seq && covers(r.change_id, id)),
    settled,
    of,
    standing(id, author, me) {
      if (settled(id)) return 'settled';
      if (rejection(id)) return 'rejected';
      if (author === me) return 'yours';
      return of(id).some((r) => r.by === me) ? 'reviewed' : 'waiting';
    },
  };
}

/**
 * A comment, as a host keeps it: on the words it quotes as they read when it was made (none: on the whole document),
 * in a thread (the first comment's id; a reply's `parent_id` the comment it answers), by someone, saying something.
 * Times as the host gives them. `to_atlas` is a comment that asks the host's assistant (the margin's Ask), whose reply
 * may carry the changes it made in answer (`change_ids`, which the margin offers to accept or reject). `block` and
 * `offset` say where the quote was taken from (quoteAt), so pinComments finds that one where the words read twice.
 */
export interface Comment {
  id: string;
  thread_id?: string;
  parent_id?: string | null;
  quote?: string;
  block?: number;
  offset?: number;
  by: string;
  text: string;
  to_atlas?: boolean;
  change_ids?: string[];
  resolved_at?: string | Date | null;
  created_at?: string | Date;
  deleted_at?: string | Date | null;
}

/** A thread: its first comment (gone when it was deleted), every comment in it in the order written, its quote, whether resolved. */
export interface Thread {
  id: string;
  first: Comment | undefined;
  comments: Comment[];
  quote: string;
  resolved: boolean;
}

const time = (c: Comment) => (c.created_at === undefined ? '' : new Date(c.created_at).toISOString());

/**
 * The comments as threads, in the order they began, each thread's in the order written; a deleted comment left out,
 * its replies kept in its thread. A comment's thread is its `thread_id`, or the first comment up its `parent_id`s.
 */
export function threadsOf(comments: Iterable<Comment>): Thread[] {
  const all = [...comments];
  const byId = new Map(all.map((c) => [c.id, c]));
  const threadOf = (c: Comment): string => {
    if (c.thread_id) return c.thread_id;
    let at = c;
    for (let n = 0; at.parent_id && byId.has(at.parent_id) && n < 1000; n++) at = byId.get(at.parent_id)!;
    return at.parent_id ?? at.id;
  };
  const order = (a: Comment, b: Comment) => (time(a) < time(b) ? -1 : time(a) > time(b) ? 1 : all.indexOf(a) - all.indexOf(b));
  const groups = new Map<string, Comment[]>();
  for (const c of all) if (!c.deleted_at) groups.set(threadOf(c), [...(groups.get(threadOf(c)) ?? []), c]);
  return [...groups.entries()]
    .map(([id, list]) => {
      const sorted = list.sort(order);
      const first = byId.get(id);
      const head = first && !first.deleted_at ? first : undefined;
      return { id, first: head, comments: sorted, quote: first?.quote ?? '', resolved: !!first?.resolved_at };
    })
    .sort((a, b) => order(a.comments[0], b.comments[0]));
}
