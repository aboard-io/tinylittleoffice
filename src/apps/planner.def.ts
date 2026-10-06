/** Planner: a week in your pocket. A zine whose pages are a cover and seven ruled days. */
import { defineFold, fitted } from '../lib/fold.ts';
import { ZINE } from './zine.def.ts';
import { LINE } from '../kit/core.ts';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const { w, h } = ZINE.size(false);
// Ruled, like a notebook, for writing in by hand.
const RULES = Array.from({ length: 13 }, (_, i) => `<line x1="20" y1="${76 + i * 24}" x2="${w - 20}" y2="${76 + i * 24}" stroke="${LINE}" stroke-width="0.7"/>`).join('');

/** A week written plainly: a title, then "Monday: gym; call Sam" for each day. */
export function readPlanner(body: string): string {
  if (body.includes('\n\n') || !body.includes('\n')) return body;
  const [title, ...days] = body.split('\n');
  return [
    title,
    ...days.map((d) => {
      const [label, things = ''] = d.split(/:(.*)/);
      return [label, ...things.split(';')].map((t) => t.trim()).filter(Boolean).join('\n');
    }),
  ].join('\n\n');
}

export default defineFold(
  { id: 'planner', group: 'Plan', name: 'Planner', icon: 'planner', blurb: 'A pocket planner for the week: a cover and seven ruled days, folded from one sheet.', read: readPlanner },
  {
    ...ZINE,
    sides: false,
    name: (i) => (i ? DAYS[i - 1] : 'Cover'),
    sheets: (p) => ZINE.sheets(p, false),
    how: () => ZINE.how(false),
    // A day is named for itself unless given another headline, and ruled whatever is on it.
    page: (s, i) => (i === 0 || s.sub ? fitted(s.icon || s.sub ? s : { ...s, icon: 'calendar-days' }, w, h, { cover: true }) : { w, h, svg: RULES + fitted({ ...s, title: s.title || DAYS[i - 1] }, w, h, { max: 10 }).svg }),
  },
);
