/** Business plan: the questions a plan answers, a page each, to fill in. */
import { definePlan, type PlanSection } from '../lib/plan.ts';

/** The sections, and what each should say: the same words are Write's template (lib/templates.ts). */
export const sections: PlanSection[] = [
  { heading: 'Summary', prompts: ['What the business does, in two sentences.', 'Who it is for, and what they get.', 'Where it is now, and what the next year holds.', 'What you are asking for, if anything.'] },
  { heading: 'The problem', prompts: ['What is hard, slow or costly for the customer today.', 'How they cope with it now.', 'Why it matters enough to pay to fix.'] },
  { heading: 'The product', prompts: ['What it is and how it works, plainly.', 'What makes it better than the way things are done now.', 'What exists today, and what is still to build.'] },
  { heading: 'The market', prompts: ['Who the customers are, and how many of them there are.', 'How the market is changing.', 'Who else serves them, and how you differ.'] },
  { heading: 'How it makes money', prompts: ['What is sold, at what price, how often.', 'What it costs to make and to sell.', 'The margin, and how it improves with scale.'] },
  { heading: 'Going to market', prompts: ['How customers hear of it.', 'How they try it, buy it and stay.', 'The first hundred customers: where they come from.'] },
  { heading: 'The team', prompts: ['Who is building this, and why these people.', 'Who is missing, and when they join.', 'Advisers and partners.'] },
  { heading: 'The numbers', prompts: ['Revenue and costs for the next three years, by year.', 'When it breaks even.', 'The assumptions that matter most.'] },
  { heading: 'Risks', prompts: ['What could stop this working.', 'What you would do about each.', 'What you do not know yet.'] },
  { heading: 'The ask', prompts: ['How much, for what, until when.', 'What it buys: the milestones.', 'What the money gets whoever gives it.'] },
];

export default definePlan({ id: 'bizplan', name: 'Business plan', icon: 'bizplan', blurb: 'A business plan, a page a section, started from the questions a plan answers; prints, presents, outlines.' }, 'Business plan', 'Company name · Month Year', sections);
