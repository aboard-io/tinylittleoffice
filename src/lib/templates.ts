

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
import { write as writeTlo } from './tlo.ts';

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

/** A text's blocks, one after another, as Write writes them (lib/richtext.ts): a blank line between blocks, list items line by line. */
const text = (...blocks: string[]) => blocks.join('\n\n');

/** A plan as a text: the title, then a subheading a section, its prompts in italics to be written over. */
export function planText(title: string, subtitle: string, sections: Section[]): string {
  return text(`# ${title}`, `*${subtitle}*`, ...sections.flatMap((s) => [`## ${s.heading}`, ...s.prompts.map((p) => `*${p}*`)]));
}

const WRITE: Template[] = [
  {
    id: 'meeting',
    name: 'Meeting notes',
    blurb: 'Agenda, what was said, what was decided, who does what.',
    body: text('# Meeting notes', '*Date · Where · Who was there*', '## Agenda', '1. The first thing\n2. The second thing\n3. Any other business', '## Notes', 'What was said, a line or two a topic.', '## Decisions', '- What was decided, and by whom', '## Actions', '- Who does what, by when'),
  },
  {
    id: 'letter',
    name: 'A letter',
    blurb: 'Your address, the date, the greeting, the point, the sign-off.',
    body: text('Your name {.right}', 'Street {.right}', 'Town, postcode {.right}', 'you@example.com {.right}', '<br>', 'Day Month Year', '<br>', 'Dear Name,', '<br>', 'Why you are writing, in a sentence.', '<br>', 'The detail: what happened, what you would like, and by when.', '<br>', 'Thank you for your time. I look forward to hearing from you.', '<br>', 'Yours sincerely,', '<br>', 'Your name'),
  },
  {
    id: 'memo',
    name: 'One-page memo',
    blurb: 'To, from, subject; the summary, the background, the proposal, the ask.',
    body: text('# Memo', '**To:** Everyone', '**From:** Your name', '**Date:** Day Month Year', '**Subject:** The one thing this memo is about', '## Summary', 'What this memo says, in two sentences.', '## Background', 'What led here, briefly.', '## What we propose', '- The change\n- What it costs\n- When', '## What we need from you', 'A decision, a reply, or nothing: say which, and by when.'),
  },
  {
    id: 'bio',
    name: 'A short bio',
    blurb: 'Who you are, what you do now, what you did before: a résumé in a page.',
    body: text('# Your Name', '*What you do, in a line · Town · you@example.com*', '## Now', 'Role at Place, since year. What you do there, in two sentences.', '## Before', '- Role, Place, years. One thing you did there.\n- Role, Place, years. One thing you did there.', '## Education', '- Degree, School, year', '## Skills', '- Three or four things you are good at', '## Elsewhere', 'Talks, writing, volunteering, the odd prize.'),
  },
  {
    id: 'week',
    name: 'Weekly plan',
    blurb: 'The three things that matter this week, then a line for each day.',
    body: text('# This week', '*The one thing this week is for.*', '## Must do', '1.\n2.\n3.', '## Monday', '-', '## Tuesday', '-', '## Wednesday', '-', '## Thursday', '-', '## Friday', '-', '## Notes', 'What came up, and what moves to next week.'),
  },
  { id: 'bizplan', name: 'Business plan', blurb: 'Summary, problem, product, market, money, team, numbers, risks, the ask: the questions a plan answers.', body: planText('Business plan', 'Company name · Month Year', BIZPLAN) },
  { id: 'mktplan', name: 'Marketing plan', blurb: 'Goals, audience, message, channels, calendar, budget, measures.', body: planText('Marketing plan', 'Product · Period', MKTPLAN) },
  { id: 'gtm', name: 'Go-to-market plan', blurb: 'The customer, the offer, pricing, the route to them, the launch, enablement, measures.', body: planText('Go-to-market plan', 'Product · Launch', GTM) },
];

/** A sheet: its chart (or ''), the names over its columns with their types ("Price:money"), and its rows, A1 the first. */
const sheet = (chart: string, head: string[], ...rows: string[][]) => writeTlo({ head: chart ? { chart } : {}, blocks: [{ k: 'table', head, rows: rows.map((r) => head.map((_, c) => r[c] ?? '')) }] }).trimEnd();

const SHEET: Template[] = [
  {
    id: 'budget',
    name: 'Budget',
    blurb: 'Planned against actual, a line each, with the difference and totals.',
    body: sheet('', ['Item', 'Planned:money', 'Actual:money', 'Difference:money'], ['Rent', '1200', '1200', '=C1-B1'], ['Groceries', '500', '540', '=C2-B2'], ['Transport', '150', '120', '=C3-B3'], ['Utilities', '180', '175', '=C4-B4'], ['Fun', '200', '260', '=C5-B5'], ['Savings', '400', '400', '=C6-B6'], ['Total', '=SUM(B1:B6)', '=SUM(C1:C6)', '=SUM(D1:D6)']),
  },
  {
    id: 'expenses',
    name: 'Expense log',
    blurb: 'Date, what, how much, which kind; a running total at the foot.',
    body: sheet('', ['Date:date', 'What', 'Amount:money', 'Category'], ['2027-03-01', 'Coffee with a client', '14.50', 'Meals'], ['2027-03-02', 'Train to the city', '38', 'Travel'], ['2027-03-03', 'Notebook', '6.25', 'Supplies'], ['Total', '', '=SUM(C1:C3)']),
  },
  {
    id: 'invoice',
    name: 'Invoice table',
    blurb: 'Items by quantity and price, the subtotal, tax, and the total.',
    body: sheet('', ['Item', 'Qty:number', 'Price:money', 'Amount:money'], ['Design', '12', '150', '=B1*C1'], ['Build', '20', '140', '=B2*C2'], ['Hosting, a year', '1', '120', '=B3*C3'], ['Subtotal', '', '', '=SUM(D1:D3)'], ['Tax 8%', '', '', '=ROUND(D4*0.08,2)'], ['Total', '', '', '=D4+D5']),
  },
  {
    id: 'tracker',
    name: 'Project tracker',
    blurb: 'Tasks with owners, start and due dates counted from today, days each, and a tick when done.',
    body: sheet('', ['Task', 'Owner', 'Start:date', 'Due:date', 'Days:number', 'Done:check'], ['Brief', 'Ana', '=TODAY()', '=C1+4', '=D1-C1+1', 'x'], ['Design', 'Ben', '=D1+1', '=C2+13', '=D2-C2+1'], ['Build', 'Cy', '=D2+1', '=C3+27', '=D3-C3+1'], ['Launch', 'Ana', '=D3+1', '=C4', '=D4-C4+1']),
  },
  {
    id: 'compare',
    name: 'Comparison, with a chart',
    blurb: 'Options scored against three things, drawn as a bar chart.',
    body: sheet('bar', ['Option', 'Price:number', 'Speed:number', 'Support:number'], ['Alpha', '3', '4', '5'], ['Beta', '4', '3', '3'], ['Gamma', '2', '5', '4']),
  },
  {
    id: 'loan',
    name: 'Loans compared',
    blurb: 'Amount, rate and years for each loan; the monthly payment (PMT), what it costs in all, and the interest.',
    body: sheet('', ['Loan:money', 'Rate:percent', 'Years:number', 'Monthly:money', 'Total paid:money', 'Interest:money'], ['20000', '6.5%', '5', '=PMT(B1/12,C1*12,-A1)', '=D1*C1*12', '=E1-A1'], ['15000', '7.9%', '3', '=PMT(B2/12,C2*12,-A2)', '=D2*C2*12', '=E2-A2'], ['30000', '5.5%', '7', '=PMT(B3/12,C3*12,-A3)', '=D3*C3*12', '=E3-A3']),
  },
  {
    id: 'months',
    name: 'Month by month, with a chart',
    blurb: 'This year against last, a line a month, drawn as lines.',
    body: sheet('line', ['Month', 'This year:money', 'Last year:money'], ['Jan', '1200', '980'], ['Feb', '1350', '1010'], ['Mar', '1100', '1200'], ['Apr', '1600', '1150'], ['May', '1750', '1300'], ['Jun', '1900', '1420']),
  },
];

/** A deck's slides, a rule between each. */
const slides = (...each: string[]) => each.join('\n\n---\n\n') + '\n';
/** A deck in one of its themes (lib/decktheme.ts). */
const themed = (theme: string, ...each: string[]) => `---\ntheme: ${theme}\n---\n${slides(...each)}`;

const DECK: Template[] = [
  {
    id: 'talk',
    name: 'A talk',
    blurb: 'Title, agenda, three points, and a close.',
    body: themed(
      'midnight',
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
    body: themed(
      'boardroom',
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
    body: themed(
      'graphite',
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
    body: themed(
      'chalkboard',
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
    body: themed(
      'ocean',
      '## :flag: Project name {.title}\n\n- Kickoff · Date',
      '## :target: Why\n\n- The problem this project solves\n- What success looks like',
      '## :users: Who\n\n- Name · role\n- Name · role\n- Name · role',
      '## :map: How\n\n- Phase one\n- Phase two\n- Phase three',
      '## :calendar: When\n\n- Milestone · date\n- Milestone · date\n- Milestone · date',
      '## :help: Open questions\n\n- What is still to decide\n- Who decides it',
    ),
  },
  {
    id: 'review',
    name: 'Quarterly review',
    blurb: 'The numbers, what worked, what did not, the next quarter.',
    body: themed(
      'ivory',
      '## :bar-chart: Quarter in review {.title}\n\n- Team · Q1 Year',
      '## :target: The numbers\n\n- Goal against result, one line each\n- The one number that matters most',
      '## What worked, and what did not {.two}\n\n- Worked: the first thing\n- Worked: the second thing\n\n|\n\n- Did not: the first thing\n- Did not: the second thing',
      '## :lightbulb: What we learned\n\n- The lesson\n- What we will do differently',
      '## :flag: Next quarter\n\n- The three goals\n- What we need to reach them',
    ),
  },
  {
    id: 'launch',
    name: 'Product launch',
    blurb: 'What is new, who it is for, how it works, when it ships.',
    body: themed(
      'arcade',
      '## :zap: Introducing the product {.title}\n\n- The one line that says why it matters',
      '## :users: Who it is for\n\n- The person, and their problem\n- What they do today',
      '## :rocket: What is new\n\n- The first thing it does\n- The second thing it does\n- The thing nobody else does',
      '## :star: The one to remember {.icon}\n\n- The feature to remember\n- Shown, not told\n\n> Show it working here.',
      '## :calendar: When and how\n\n- The date\n- The price\n- Where to get it',
    ),
  },
  {
    id: 'party',
    name: 'Party invitation',
    blurb: 'Who it is for, when, where, what to bring, how to reply.',
    body: themed(
      'confetti',
      '## :gift: You are invited! {.title}\n\n- A party for Name',
      '## :calendar: When and where\n\n- Day, date, time\n- The address\n- How to get there',
      '## :pizza: What to expect\n\n- Food and drink\n- Music and games\n- What to wear',
      '## :heart: Please reply\n\n- By date\n- To name, at phone or email',
    ),
  },
  {
    id: 'offsite',
    name: 'Team offsite',
    blurb: 'Why we are here, the plan for the day, the questions, what we leave with.',
    body: themed(
      'sunset',
      '## :sun: Team offsite {.title}\n\n- Place · Date',
      '## :compass: Why we are here\n\n- The question this day answers\n- What a good day looks like',
      '## :clock: The plan\n\n- Morning: where we are\n- Afternoon: where we are going\n- Evening: dinner together',
      '## :puzzle: Questions to work on\n\n- The first question\n- The second question\n- The third question',
      '## :check: What we leave with\n\n- Decisions\n- Owners and dates',
    ),
  },
  {
    id: 'workshop',
    name: 'Workshop',
    blurb: 'Warm-up, the method, hands-on time, share-back, next steps.',
    body: themed(
      'bubblegum',
      '## :palette: Workshop title {.title}\n\n- Host · Date · Room',
      '## :smile: Warm-up\n\n- Names, and one thing you hope to learn\n\n> Five minutes, round the room.',
      '## :lightbulb: The method\n\n- Step one\n- Step two\n- Step three',
      '## :brush: Your turn\n\n- The task\n- In groups of three\n- Twenty minutes',
      '## :message: Share back\n\n- What each group made\n- What surprised you',
      '## :flag: Next steps\n\n- What to try this week\n- Where to find the materials',
    ),
  },
  {
    id: 'research',
    name: 'Research findings',
    blurb: 'The question, how it was studied, what was found, what it means.',
    body: themed(
      'boardroom',
      '## :search: Research findings {.title}\n\n- Study name · Researcher · Date',
      '## :help: The question\n\n- What we wanted to know\n- Why it matters',
      '## :book: How we studied it\n\n- Who took part\n- What we did\n- When and where',
      '## :pie-chart: What we found\n\n- The first finding\n- The second finding\n- The third finding',
      '## :lightbulb: What it means\n\n- For the product\n- For the next study',
    ),
  },
  {
    id: 'trip',
    name: 'Trip recap',
    blurb: 'Where you went, the highlights, the pictures, the tips.',
    body: themed(
      'ocean',
      '## :plane: Our trip {.title}\n\n- Where · When · Who',
      '## :map: The route\n\n- First stop\n- Second stop\n- Third stop',
      '## :camera: Highlights\n\n- The best day\n- The best meal\n- The view nobody will believe',
      '## :thumbs-up: Tips for next time\n\n- What to bring\n- What to skip\n- Where to stay',
    ),
  },
];

export const TEMPLATES: Record<string, Template[]> = { write: WRITE, sheet: SHEET, deck: DECK };

/** The templates an app can start from; none for most apps. */
export const templatesOf = (app: string): Template[] => TEMPLATES[app] ?? [];
