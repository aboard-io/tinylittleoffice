/** Certificate: a framed page, on its side, for a name and a reason. */
import { definePrint, slidesOf, SIDEWAYS } from '../lib/print.ts';
import { fitted } from '../lib/fold.ts';
import { rect, ACCENT } from '../kit/core.ts';

const { w, h } = SIDEWAYS;
export const spec = {
  hint: 'What it is, then a line each for who it is for, why, and when. Start with ":icon-name" for a seal.',
  example: ':award\nCertificate of Achievement\nAwarded to\nSam Rivera\nfor walking Biscuit every weekday for a year\n1 March 2027',
  sheets: (text: string) => [
    {
      w,
      h,
      svg: rect(36, 36, w - 72, h - 72, 'none', `stroke="${ACCENT}" stroke-width="6"`) + rect(50, 50, w - 100, h - 100, 'none', `stroke="${ACCENT}" stroke-width="1.5"`) + fitted(slidesOf(text)[0] ?? { icon: '', title: '', bullets: [] }, w, h, { cover: true, max: 30, m: 120 }).svg,
    },
  ],
};

export default definePrint({ id: 'certificate', name: 'Certificate', icon: 'certificate', blurb: 'A certificate to print: who, what for and when, framed on one page.' }, spec);
