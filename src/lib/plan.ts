/**
 * Plans: a business plan, a marketing plan, a go-to-market plan, and kin.
 * Each is letter pages (lib/fold.ts): a title page, then a page a section,
 * started from a template whose words are the questions a good plan
 * answers. Being pages, a plan prints, reads as a deck or an outline, and
 * takes Markdown in and out.
 *
 * The plans are now templates in Write (lib/templates.ts), so these apps
 * are hidden: not offered anywhere, but every link to one still opens.
 */
import { defineFold, fitted, LETTER, type Format } from './fold.ts';
import type { AppDef } from '../kit/core.ts';

export interface PlanSection {
  heading: string;
  /** What this section should say, as prompts; the writer replaces them. */
  prompts: string[];
}

/** A plan as the text its pages are written in: the title page, then a page per section with its prompts as lines. */
export function planTemplate(title: string, subtitle: string, sections: PlanSection[]): string {
  return [`::t\n${title}\n${subtitle}`, ...sections.map((s) => `${s.heading}\n${s.prompts.join('\n')}`)].join('\n\n');
}

export function definePlan(app: Pick<AppDef, 'id' | 'name' | 'icon' | 'blurb'>, title: string, subtitle: string, sections: PlanSection[]): AppDef {
  const f: Format = {
    count: sections.length + 1,
    grow: 40,
    by: 1,
    size: () => LETTER,
    name: (i) => (i === 0 ? 'Title page' : `Section ${i}`),
    page: (s, i) => fitted(s, LETTER.w, LETTER.h, { cover: i === 0, foot: i === 0 ? '' : String(i), max: 15, m: 72 }),
    sheets: (p) => p,
    template: planTemplate(title, subtitle, sections),
    how: () => 'Download the PDF and print it on letter paper, one page a sheet.',
  };
  return defineFold({ group: 'Plan', under: app.id === 'bizplan' ? undefined : 'bizplan', hidden: true, ...app }, f);
}

