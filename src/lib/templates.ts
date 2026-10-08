

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

const DECK: Template[] = [
  {
    id: 'talk',
    name: 'A talk',
    blurb: 'Title, agenda, three points, and a close.',
    body: [':rocket:t\nTalk title\nYour name · Where · Date', ':compass\nAgenda\nThe first point\nThe second point\nThe third point\n> Say what the talk is for, and how long it takes.', ':lightbulb\nThe first point\nWhat it is\nWhy it matters\nAn example', ':target\nThe second point\nWhat it is\nWhy it matters\nAn example', ':trending-up\nThe third point\nWhat it is\nWhy it matters\nAn example', ':flag\nTo close\nThe one thing to remember\nWhat happens next\nThank you'].join('\n\n'),
  },
  {
    id: 'status',
    name: 'Status update',
    blurb: 'Done and next side by side, then risks, then asks.',
    body: [':calendar:t\nStatus update\nProject · Week of', '::2\nThis week and next\nDone: the first thing\nDone: the second thing\n|\nNext: the third thing\nNext: the fourth thing\n> Left, what shipped; right, what is planned.', ':warning\nRisks and blockers\nWhat is in the way\nWho can clear it', ':help\nAsks\nWhat we need\nFrom whom\nBy when'].join('\n\n'),
  },
  {
    id: 'pitch',
    name: 'A pitch',
    blurb: 'Problem, solution, why now, the team, the ask.',
    body: [':rocket:t\nCompany\nWhat it is, for whom, in a line', ':puzzle\nThe problem\nWho has it\nWhat it costs them\nHow they cope today', ':lightbulb\nThe solution\nWhat we do\nWhy it works\nWhy now', ':bar-chart\nWhere we are\nCustomers, revenue, growth\nWhat we have learned', ':users\nThe team\nWho, and why these people\nWho is missing', ':dollar\nThe ask\nHow much\nWhat it buys\nWhen we are back'].join('\n\n'),
  },
  {
    id: 'lesson',
    name: 'A lesson',
    blurb: 'What you will learn, a starter, the idea, a task, a recap.',
    body: [':graduation:t\nLesson title\nSubject · Class · Date', ':target\nWhat you will learn\nThe first goal\nThe second goal', ':help\nStarter\nA question to think about\n> Two minutes, in pairs.', ':book\nThe idea\nThe main point, plainly\nAn example\nAnother example', ':puzzle\nTry it\nA task to do now\nHow long it takes', ':check\nRecap\nWhat we learned\nWhat to do before next time'].join('\n\n'),
  },
  {
    id: 'kickoff',
    name: 'Project kickoff',
    blurb: 'Why, who, how, when, and the open questions.',
    body: [':flag:t\nProject name\nKickoff · Date', ':target\nWhy\nThe problem this project solves\nWhat success looks like', ':users\nWho\nName · role\nName · role\nName · role', ':map\nHow\nPhase one\nPhase two\nPhase three', ':calendar\nWhen\nMilestone · date\nMilestone · date\nMilestone · date', ':help\nOpen questions\nWhat is still to decide\nWho decides it'].join('\n\n'),
  },
];

export const TEMPLATES: Record<string, Template[]> = { write: WRITE, sheet: SHEET, deck: DECK };

/** The templates an app can start from; none for most apps. */
export const templatesOf = (app: string): Template[] => TEMPLATES[app] ?? [];
