/** Habit tracker: a month of boxes to tick, one row per habit, to print. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { definePrint, SIDEWAYS } from '../lib/print.ts';
import { h1, rest } from '../lib/diagram.ts';
import { text, rect, clip, LINE, MUTED, SHADE } from '../kit/core.ts';

export const spec = {
  form: [
    { name: 'Month', is: '# {Month}', once: true },
    { name: 'Habit', is: '{Habit}' },
  ] as LineKind[],
  hint: '"# The month", then a habit per line. Prints a row of 31 boxes for each.',
  example: '# March\nWalk Biscuit\nRead 20 pages\nNo phone before 9\nPiano\nIn bed by 11',
  sheets: (body: string) => {
    const habits = rest(body).slice(0, 18);
    const { w, h } = SIDEWAYS;
    const [x0, y0, c] = [230, 130, 25];
    let svg = text(48, 76, h1(body) || 'Habits', { px: 40, bold: true });
    for (let d = 0; d < 31; d++) svg += text(x0 + d * c + c / 2, y0 - 8, String(d + 1), { px: 10, fill: MUTED, anchor: 'middle' });
    habits.forEach((name, r) => {
      const y = y0 + r * 34;
      svg += text(48, y + 17, clip(name, 170, 14), { px: 14 });
      for (let d = 0; d < 31; d++) svg += rect(x0 + d * c + 2, y + 2, c - 4, c - 4, d % 7 > 4 ? SHADE : 'none', `rx="4" stroke="${LINE}"`);
    });
    return [{ w, h, svg }];
  },
};

export default definePrint({ id: 'habits', under: undefined, group: 'Personal', name: 'Habit tracker', icon: 'habits', blurb: 'A month of boxes to tick for each habit, on one page to print.' }, spec);
