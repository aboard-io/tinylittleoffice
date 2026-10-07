/** Go-to-market plan: the launch, from the first customer to the hundredth. */
import { definePlan } from '../lib/plan.ts';

export default definePlan({ id: 'gtm', name: 'Go-to-market plan', icon: 'gtm', blurb: 'A go-to-market plan: the customer, the offer, the route to them, pricing, launch and what to measure, a page each.' }, 'Go-to-market plan', 'Product · Launch', [
  { heading: 'The customer', prompts: ['Who buys first, exactly: role, company, situation.', 'The moment they feel the need.', 'Who else has a say in the purchase.'] },
  { heading: 'The offer', prompts: ['What they get, in their words.', 'The one thing it does that nothing else does.', 'What is included, what is not, what comes later.'] },
  { heading: 'Pricing and packaging', prompts: ['The price, and why that number.', 'Tiers or plans, if any, and who each is for.', 'Trials, discounts, guarantees.'] },
  { heading: 'The route to them', prompts: ['How they find out: the first channel, and the second.', 'Self-serve, sales, partners, or a mix.', 'What a sale takes, step by step, and how long.'] },
  { heading: 'The launch', prompts: ['What happens on the day, and the week before and after.', 'Who does what.', 'What is ready: pages, materials, support, billing.'] },
  { heading: 'Enablement', prompts: ['What sales and support need to know and have.', 'The objections, and the answers.', 'The demo.'] },
  { heading: 'Measures', prompts: ['Leads, trials, customers, revenue: the targets for the first month and the first quarter.', 'What a good first week looks like.', 'When you decide to push harder, change course or stop.'] },
]);
