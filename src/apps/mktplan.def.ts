/** Marketing plan: who, what to say, where, how much, how you will know. */
import { definePlan } from '../lib/plan.ts';

export default definePlan({ id: 'mktplan', name: 'Marketing plan', icon: 'mktplan', blurb: 'A marketing plan: audience, message, channels, calendar, budget and measures, a page each.' }, 'Marketing plan', 'Product · Period', [
  { heading: 'Goals', prompts: ['What marketing must achieve this period, as numbers.', 'By when.', 'What success looks like, and what it does not.'] },
  { heading: 'Audience', prompts: ['Who you are talking to: the two or three kinds of person.', 'What they want, worry about, and read.', 'Where they are when they decide.'] },
  { heading: 'Positioning and message', prompts: ['What this is, for whom, and why it is the one to choose, in one sentence.', 'The three things to say every time.', 'The proof for each.'] },
  { heading: 'Channels', prompts: ['Where the audience is, and what you will do in each place.', 'What is owned (site, list), earned (press, word of mouth) and paid (ads, sponsorship).', 'What you will not do.'] },
  { heading: 'Calendar', prompts: ['What ships when: launches, campaigns, events, content.', 'The rhythm: weekly, monthly.', 'Dates that are fixed by others.'] },
  { heading: 'Budget', prompts: ['How much, and where it goes, by channel.', 'People and time, not only money.', 'What you cut first if it has to shrink.'] },
  { heading: 'Measures', prompts: ['The numbers you watch, and where they come from.', 'The targets for each.', 'When you look, and who decides what changes.'] },
]);
