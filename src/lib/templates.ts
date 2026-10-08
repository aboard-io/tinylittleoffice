

/**
 * Templates: the documents an app can start from, as plain text in the
 * app's own format, keyed by app. Each is a minimal, correct, useful
 * starting point (a budget that adds up, a talk with its shape, a letter
 * with its parts), never a sample to admire. The editors offer them when a
 * document opens empty (widgets/template-picker.ts); programs get them
 * from the API (`templates(app)`); a test round-trips every one through
 * its app's parse, serialize and view.
 *
 * The three plans (business, marketing, go-to-market) live here as Write
 * templates: the sections a good plan has, and the questions each answers.
 */

/** A section of a plan, and what it should say, as prompts the writer replaces. */
interface Section {
  heading: string;
  prompts: string[];
}

const BIZPLAN: Section[] = [
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

const MKTPLAN: Section[] = [
  { heading: 'Goals', prompts: ['What marketing must achieve this period, as numbers.', 'By when.', 'What success looks like, and what it does not.'] },
  { heading: 'Audience', prompts: ['Who you are talking to: the two or three kinds of person.', 'What they want, worry about, and read.', 'Where they are when they decide.'] },
  { heading: 'Positioning and message', prompts: ['What this is, for whom, and why it is the one to choose, in one sentence.', 'The three things to say every time.', 'The proof for each.'] },
  { heading: 'Channels', prompts: ['Where the audience is, and what you will do in each place.', 'What is owned (site, list), earned (press, word of mouth) and paid (ads, sponsorship).', 'What you will not do.'] },
  { heading: 'Calendar', prompts: ['What ships when: launches, campaigns, events, content.', 'The rhythm: weekly, monthly.', 'Dates that are fixed by others.'] },
  { heading: 'Budget', prompts: ['How much, and where it goes, by channel.', 'People and time, not only money.', 'What you cut first if it has to shrink.'] },
  { heading: 'Measures', prompts: ['The numbers you watch, and where they come from.', 'The targets for each.', 'When you look, and who decides what changes.'] },
];

const GTM: Section[] = [
  { heading: 'The customer', prompts: ['Who buys first, exactly: role, company, situation.', 'The moment they feel the need.', 'Who else has a say in the purchase.'] },
  { heading: 'The offer', prompts: ['What they get, in their words.', 'The one thing it does that nothing else does.', 'What is included, what is not, what comes later.'] },
  { heading: 'Pricing and packaging', prompts: ['The price, and why that number.', 'Tiers or plans, if any, and who each is for.', 'Trials, discounts, guarantees.'] },
  { heading: 'The route to them', prompts: ['How they find out: the first channel, and the second.', 'Self-serve, sales, partners, or a mix.', 'What a sale takes, step by step, and how long.'] },
  { heading: 'The launch', prompts: ['What happens on the day, and the week before and after.', 'Who does what.', 'What is ready: pages, materials, support, billing.'] },
  { heading: 'Enablement', prompts: ['What sales and support need to know and have.', 'The objections, and the answers.', 'The demo.'] },
  { heading: 'Measures', prompts: ['Leads, trials, customers, revenue: the targets for the first month and the first quarter.', 'What a good first week looks like.', 'When you decide to push harder, change course or stop.'] },
];

export interface Template {
  /** A short name, unique within its app: 'meeting'. */
  id: string;
  name: string;
  /** One line on what it is for. */
  blurb: string;
  /** The document, in the app's format. */
  body: string;
}

/** A plan in Write's format: the title, then a subheading a section, its prompts in italics to be written over. */
export function planText(title: string, subtitle: string, sections: Section[]): string {
  return [`# ${title}`, `_${subtitle}_`, ...sections.flatMap((s) => [`## ${s.heading}`, ...s.prompts.map((p) => `_${p}_`)])].join('\n');
}

const WRITE: Template[] = [
  {
    id: 'meeting',
    name: 'Meeting notes',
    blurb: 'Agenda, what was said, what was decided, who does what.',
    body: ['# Meeting notes', '_Date · Where · Who was there_', '## Agenda', '+ The first thing', '+ The second thing', '+ Any other business', '## Notes', 'What was said, a line or two a topic.', '## Decisions', '- What was decided, and by whom', '## Actions', '- Who does what, by when'].join('\n'),
  },
  {
    id: 'letter',
    name: 'A letter',
    blurb: 'Your address, the date, the greeting, the point, the sign-off.',
    body: ['>r Your name', '>r Street', '>r Town, postcode', '>r you@example.com', '', 'Day Month Year', '', 'Dear Name,', '', 'Why you are writing, in a sentence.', '', 'The detail: what happened, what you would like, and by when.', '', 'Thank you for your time. I look forward to hearing from you.', '', 'Yours sincerely,', '', 'Your name'].join('\n'),
  },
  {
    id: 'memo',
    name: 'One-page memo',
    blurb: 'To, from, subject; the summary, the background, the proposal, the ask.',
    body: ['# Memo', '*To:* Everyone', '*From:* Your name', '*Date:* Day Month Year', '*Subject:* The one thing this memo is about', '## Summary', 'What this memo says, in two sentences.', '## Background', 'What led here, briefly.', '## What we propose', '- The change', '- What it costs', '- When', '## What we need from you', 'A decision, a reply, or nothing: say which, and by when.'].join('\n'),
  },
  {
    id: 'bio',
    name: 'A short bio',
    blurb: 'Who you are, what you do now, what you did before: a résumé in a page.',
    body: ['# Your Name', '_What you do, in a line · Town · you@example.com_', '## Now', 'Role at Place, since year. What you do there, in two sentences.', '## Before', '- Role, Place, years. One thing you did there.', '- Role, Place, years. One thing you did there.', '## Education', '- Degree, School, year', '## Skills', '- Three or four things you are good at', '## Elsewhere', 'Talks, writing, volunteering, the odd prize.'].join('\n'),
  },
  {
    id: 'week',
    name: 'Weekly plan',
    blurb: 'The three things that matter this week, then a line for each day.',
    body: ['# This week', '_The one thing this week is for._', '## Must do', '+ ', '+ ', '+ ', '## Monday', '- ', '## Tuesday', '- ', '## Wednesday', '- ', '## Thursday', '- ', '## Friday', '- ', '## Notes', 'What came up, and what moves to next week.'].join('\n'),
  },
  { id: 'bizplan', name: 'Business plan', blurb: 'Summary, problem, product, market, money, team, numbers, risks, the ask: the questions a plan answers.', body: planText('Business plan', 'Company name · Month Year', BIZPLAN) },
  { id: 'mktplan', name: 'Marketing plan', blurb: 'Goals, audience, message, channels, calendar, budget, measures.', body: planText('Marketing plan', 'Product · Period', MKTPLAN) },
  { id: 'gtm', name: 'Go-to-market plan', blurb: 'The customer, the offer, pricing, the route to them, the launch, enablement, measures.', body: planText('Go-to-market plan', 'Product · Launch', GTM) },
];

/** Rows as a sheet: cells joined by tabs, trailing blank cells dropped, so each row is already in the sheet's own spelling. */
const rows = (settings: string, ...lines: string[][]) => [settings, ...lines.map((cells) => cells.join('\t').replace(/\t+$/, ''))].join('\n');

const SHEET: Template[] = [
  {
    id: 'budget',
    name: 'Budget',
    blurb: 'Planned against actual, a line each, with the difference and totals.',
    body: rows('!|t$$$', ['Item', 'Planned', 'Actual', 'Difference'], ['Rent', '1200', '1200', '=C2-B2'], ['Groceries', '500', '540', '=C3-B3'], ['Transport', '150', '120', '=C4-B4'], ['Utilities', '180', '175', '=C5-B5'], ['Fun', '200', '260', '=C6-B6'], ['Savings', '400', '400', '=C7-B7'], ['Total', '=SUM(B2:B7)', '=SUM(C2:C7)', '=SUM(D2:D7)']),
  },
  {
    id: 'expenses',
    name: 'Expense log',
    blurb: 'Date, what, how much, which kind; a running total at the foot.',
    body: rows('!|dt$', ['Date', 'What', 'Amount', 'Category'], ['2027-03-01', 'Coffee with a client', '14.50', 'Meals'], ['2027-03-02', 'Train to the city', '38', 'Travel'], ['2027-03-03', 'Notebook', '6.25', 'Supplies'], ['Total', '', '=SUM(C2:C4)']),
  },
  {
    id: 'invoice',
    name: 'Invoice table',
    blurb: 'Items by quantity and price, the subtotal, tax, and the total.',
    body: rows('!|tn$$', ['Item', 'Qty', 'Price', 'Amount'], ['Design', '12', '150', '=B2*C2'], ['Build', '20', '140', '=B3*C3'], ['Hosting, a year', '1', '120', '=B4*C4'], ['Subtotal', '', '', '=SUM(D2:D4)'], ['Tax 8%', '', '', '=ROUND(D5*0.08,2)'], ['Total', '', '', '=D5+D6']),
  },
  {
    id: 'tracker',
    name: 'Project tracker',
    blurb: 'Tasks with owners, start and due dates counted from today, days each, and a tick when done.',
    body: rows('!|ttddnc', ['Task', 'Owner', 'Start', 'Due', 'Days', 'Done'], ['Brief', 'Ana', '=TODAY()', '=C2+4', '=D2-C2+1', 'x'], ['Design', 'Ben', '=D2+1', '=C3+13', '=D3-C3+1'], ['Build', 'Cy', '=D3+1', '=C4+27', '=D4-C4+1'], ['Launch', 'Ana', '=D4+1', '=C5', '=D5-C5+1']),
  },
  {
    id: 'compare',
    name: 'Comparison, with a chart',
    blurb: 'Options scored against three things, drawn as a bar chart.',
    body: rows('!bar|tnnn', ['Option', 'Price', 'Speed', 'Support'], ['Alpha', '3', '4', '5'], ['Beta', '4', '3', '3'], ['Gamma', '2', '5', '4']),
  },
  {
    id: 'loan',
    name: 'Loans compared',
    blurb: 'Amount, rate and years for each loan; the monthly payment (PMT), what it costs in all, and the interest.',
    body: rows('!|$%n$$$', ['Loan', 'Rate', 'Years', 'Monthly', 'Total paid', 'Interest'], ['20000', '6.5%', '5', '=PMT(B2/12,C2*12,-A2)', '=D2*C2*12', '=E2-A2'], ['15000', '7.9%', '3', '=PMT(B3/12,C3*12,-A3)', '=D3*C3*12', '=E3-A3'], ['30000', '5.5%', '7', '=PMT(B4/12,C4*12,-A4)', '=D4*C4*12', '=E4-A4']),
  },
  {
    id: 'months',
    name: 'Month by month, with a chart',
    blurb: 'This year against last, a line a month, drawn as lines.',
    body: rows('!line|t$$', ['Month', 'This year', 'Last year'], ['Jan', '1200', '980'], ['Feb', '1350', '1010'], ['Mar', '1100', '1200'], ['Apr', '1600', '1150'], ['May', '1750', '1300'], ['Jun', '1900', '1420']),
  },
];

/** A deck's slides, a rule between each. */
const slides = (...each: string[]) => each.join('\n\n---\n\n') + '\n';

const DECK: Template[] = [
  {
    id: 'talk',
    name: 'A talk',
    blurb: 'Title, agenda, three points, and a close.',
    body: slides(
      '## :rocket: Talk title {.title}\n\n- Your name · Where · Date',
      '## :compass: Agenda\n\n- The first point\n- The second point\n- The third point\n\n> Say what the talk is for, and how long it takes.',
      '## :lightbulb: The first point\n\n- What it is\n- Why it matters\n- An example',
      '## :target: The second point\n\n- What it is\n- Why it matters\n- An example',
      '## :trending-up: The third point\n\n- What it is\n- Why it matters\n- An example',
      '## :flag: To close\n\n- The one thing to remember\n- What happens next\n- Thank you',
    ),
  },
  {
    id: 'status',
    name: 'Status update',
    blurb: 'Done and next side by side, then risks, then asks.',
    body: slides(
      '## :calendar: Status update {.title}\n\n- Project · Week of',
      '## This week and next {.two}\n\n- Done: the first thing\n- Done: the second thing\n\n|\n\n- Next: the third thing\n- Next: the fourth thing\n\n> Left, what shipped; right, what is planned.',
      '## :warning: Risks and blockers\n\n- What is in the way\n- Who can clear it',
      '## :help: Asks\n\n- What we need\n- From whom\n- By when',
    ),
  },
  {
    id: 'pitch',
    name: 'A pitch',
    blurb: 'Problem, solution, why now, the team, the ask.',
    body: slides(
      '## :rocket: Company {.title}\n\n- What it is, for whom, in a line',
      '## :puzzle: The problem\n\n- Who has it\n- What it costs them\n- How they cope today',
      '## :lightbulb: The solution\n\n- What we do\n- Why it works\n- Why now',
      '## :bar-chart: Where we are\n\n- Customers, revenue, growth\n- What we have learned',
      '## :users: The team\n\n- Who, and why these people\n- Who is missing',
      '## :dollar: The ask\n\n- How much\n- What it buys\n- When we are back',
    ),
  },
  {
    id: 'lesson',
    name: 'A lesson',
    blurb: 'What you will learn, a starter, the idea, a task, a recap.',
    body: slides(
      '## :graduation: Lesson title {.title}\n\n- Subject · Class · Date',
      '## :target: What you will learn\n\n- The first goal\n- The second goal',
      '## :help: Starter\n\n- A question to think about\n\n> Two minutes, in pairs.',
      '## :book: The idea\n\n- The main point, plainly\n- An example\n- Another example',
      '## :puzzle: Try it\n\n- A task to do now\n- How long it takes',
      '## :check: Recap\n\n- What we learned\n- What to do before next time',
    ),
  },
  {
    id: 'kickoff',
    name: 'Project kickoff',
    blurb: 'Why, who, how, when, and the open questions.',
    body: slides(
      '## :flag: Project name {.title}\n\n- Kickoff · Date',
      '## :target: Why\n\n- The problem this project solves\n- What success looks like',
      '## :users: Who\n\n- Name · role\n- Name · role\n- Name · role',
      '## :map: How\n\n- Phase one\n- Phase two\n- Phase three',
      '## :calendar: When\n\n- Milestone · date\n- Milestone · date\n- Milestone · date',
      '## :help: Open questions\n\n- What is still to decide\n- Who decides it',
    ),
  },
];

export const TEMPLATES: Record<string, Template[]> = { write: WRITE, sheet: SHEET, deck: DECK };

/** The templates an app can start from; none for most apps. */
export const templatesOf = (app: string): Template[] => TEMPLATES[app] ?? [];
