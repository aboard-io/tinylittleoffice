// What a host keeps of who reviewed what and who said what (kit/text/review.ts; docs/library.md, Tracked changes and
// comments for a host), read for the tracking, the drawing and the panel: a host's rows handed in as its server gives
// them (Atlas's `reviews` and `comments`), a version's changes named whole, a review taken back, the comments as
// threads; and each person's color, past the six and in either theme (kit/text/redline.ts colorAt).
import { describe, expect, test } from 'vitest';
import { covers, reviewsOf, threadsOf, type Comment, type Review } from '../src/kit/text/review.ts';
import { COLORS, colorAt, colorOf, slotOf } from '../src/kit/text/redline.ts';

/** A color's relative luminance, and two luminances' contrast (WCAG's). */
const luminance = (hex: string) =>
  [0, 1, 2]
    .map((i) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
    .reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const A = 'alice@x.co';
const B = 'bob@x.co';

describe('reviews', () => {
  const reviews: Review[] = [
    { id: 'r1', change_id: 'v1:0', by: A, verdict: 'accepted', at_seq: 3, undone_at: null },
    { id: 'r2', change_id: 'v2:*', by: A, verdict: 'rejected', at_seq: 4, undone_at: null },
    { id: 'r3', change_id: 'v1:1', by: A, verdict: 'rejected', at_seq: 5, undone_at: '2026-10-18T10:00:00Z' },
  ];
  const r = reviewsOf(reviews);

  test('a review names a change, or a version’s changes whole', () => {
    expect([covers('v2:*', 'v2:3'), covers('v2:*', 'v21:0'), covers('v1:0', 'v1:0'), covers('v1:0', 'v1:1')]).toEqual([true, false, true, false]);
  });

  test('for the tracking: rejected and reviewed before a version, a review taken back still closing what it reviewed', () => {
    expect([r.rejectedBy('v2:1', 4), r.rejectedBy('v2:1', 5), r.rejectedBy('v1:1', 9)]).toEqual([false, true, false]);
    expect([r.reviewedBy('v1:1', 5), r.reviewedBy('v1:1', 6)]).toEqual([false, true]);
  });

  test('for the drawing and the panel: settled by anyone’s acceptance, and where each change stands for a reader', () => {
    expect([r.settled('v1:0'), r.settled('v1:1')]).toEqual([true, false]);
    expect(r.standing('v1:0', B, B)).toBe('settled');
    expect(r.standing('v2:0', B, A)).toBe('rejected');
    expect(r.standing('v3:0', B, B)).toBe('yours');
    expect(r.standing('v3:0', B, A)).toBe('waiting');
    expect(
      reviewsOf([
        { change_id: 'v3:0', by: A, verdict: 'accepted', at_seq: 1, undone_at: 'x' },
        { change_id: 'v3:*', by: 'carol', verdict: 'rejected', at_seq: 1, undone_at: 'x' },
      ]).standing('v3:0', B, A),
    ).toBe('waiting');
    expect(r.of('v2:0').map((x) => x.id)).toEqual(['r2']);
  });
});

describe('comments as threads', () => {
  // As Atlas's server gives them: times as strings, a reply's parent, a deleted one, a thread resolved.
  const rows: Comment[] = [
    {
      id: 'c3',
      thread_id: 'c1',
      parent_id: 'c2',
      quote: '',
      by: 'atlas',
      text: 'Done.',
      to_atlas: false,
      change_ids: ['7:*'],
      created_at: '2026-10-18T10:03:00Z',
      resolved_at: null,
      deleted_at: null,
    },
    { id: 'c1', thread_id: 'c1', parent_id: null, quote: 'the rent', by: A, text: 'Too high?', created_at: '2026-10-18T10:00:00Z', resolved_at: null, deleted_at: null },
    { id: 'c4', parent_id: null, quote: 'Brooklyn', by: B, text: 'Queens', created_at: '2026-10-18T09:00:00Z', resolved_at: '2026-10-18T11:00:00Z' },
    { id: 'c2', parent_id: 'c1', by: B, text: '@atlas lower it', to_atlas: true, created_at: '2026-10-18T10:01:00Z' },
    { id: 'c5', parent_id: 'c4', by: A, text: 'gone', created_at: '2026-10-18T09:30:00Z', deleted_at: '2026-10-18T09:31:00Z' },
  ];

  test('in the order they began, each in the order written, a thread found up its replies, a deleted comment left out', () => {
    expect(threadsOf(rows).map((t) => [t.id, t.quote, t.resolved, t.comments.map((c) => c.id)])).toEqual([
      ['c4', 'Brooklyn', true, ['c4']],
      ['c1', 'the rent', false, ['c1', 'c2', 'c3']],
    ]);
  });

  test('a thread whose first comment was deleted keeps its replies, and has no first', () => {
    const [t] = threadsOf([
      { id: 'a', by: A, text: '', quote: 'x', deleted_at: '2026-10-18T09:00:00Z', created_at: '2026-10-18T09:00:00Z' },
      { id: 'b', parent_id: 'a', by: B, text: 'still here', created_at: '2026-10-18T09:01:00Z' },
    ]);
    expect([t.id, t.first, t.comments.map((c) => c.id)]).toEqual(['a', undefined, ['b']]);
  });
});

describe('each person’s color', () => {
  /** Both of a light-dark() color. */
  const both = (c: string) => /^light-dark\((#[0-9a-f]{6}), (#[0-9a-f]{6})\)$/.exec(c)!.slice(1);
  const PAPER = [luminance('#ffffff'), luminance('#1e1e22')];

  test('a person’s place in the host’s order, or one their name picks, the same wherever it is asked', () => {
    expect(slotOf(B, [A, B])).toBe(1);
    expect(slotOf('dana@x.co', [A, B])).toBe(slotOf('dana@x.co', [A, B]));
    expect(slotOf('dana@x.co', [A, B])).toBeGreaterThanOrEqual(COLORS.length);
    expect(colorOf(A, [A])).toBe(colorAt(0));
  });

  test('forty people, every one a color of their own, each reading at 4.5:1 on the paper of either theme', () => {
    const colors = Array.from({ length: 40 }, (_, i) => colorAt(i));
    expect(new Set(colors).size).toBe(40);
    for (const c of colors) {
      const [light, dark] = both(c);
      expect(contrast(luminance(light), PAPER[0]), c).toBeGreaterThanOrEqual(4.5);
      expect(contrast(luminance(dark), PAPER[1]), c).toBeGreaterThanOrEqual(4.5);
    }
    // The first six are COLORS', as near as reads: the ones that read already, as they are.
    expect(both(colorAt(0))[0]).toBe(COLORS[0]);
  });

  test('apart: no two of the first twenty-four people near in color, in either theme', () => {
    const rgb = (hex: string) => [0, 1, 2].map((i) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16));
    const far = (a: string, b: string) => Math.hypot(...rgb(a).map((x, i) => x - rgb(b)[i]));
    for (const theme of [0, 1]) {
      const colors = Array.from({ length: 24 }, (_, i) => both(colorAt(i))[theme]);
      for (let i = 0; i < colors.length; i++) for (let j = i + 1; j < colors.length; j++) expect(far(colors[i], colors[j]), `${theme}: ${i} ${j}`).toBeGreaterThan(20);
    }
  });
});
