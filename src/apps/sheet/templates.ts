/**
 * Sheet's templates: Blank is the app's own page; these are the rest, each a real document written by the
 * kernel (so each is canonical and round-trips byte for byte). The four models are flows of From | To |
 * Amount drawn as a Sankey, the assumptions beside them as named cells to play with, the formulas locked
 * so a reader changes the numbers and not the model, and a headline (`{big=…}`) drawn large.
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';
import { column, write, type Block, type Doc } from '../../doc/index.ts';

const table = (head: string[], rows: string[][], big?: string): Block => ({ k: 'table', cols: head.map(column), rows: rows.map((r) => head.map((_, c) => r[c] ?? '')), ...(big ? { a: { kv: { big } } } : {}) });
const doc = (head: Doc['head'], block: Block): string => write({ head, blocks: [block] });
const sheet = (chart: string, head: string[], ...rows: string[][]) => doc(chart ? { chart } : {}, table(head, rows));

const MODEL_HEAD = ['From', 'To', 'Amount:number', 'Assumption:name', 'Value:number'];
const model = (lock: string, big: string, ...rows: string[][]) => doc({ chart: 'sankey', lock }, table(MODEL_HEAD, rows, big));
/** A total named for a stock is what flows into it (SUMIF over the To column), which a formula may then use by name. */
const into = (name: string) => `=SUMIF(B1:B20, "${name}", C1:C20)`;

export const templates = (): Template[] => [
  {
    id: 'budget',
    name: t('Budget'),
    blurb: t('Planned against actual, a line each, with the difference and totals.'),
    doc: sheet('', ['Item', 'Planned:money', 'Actual:money', 'Difference:money'], ['Rent', '1200', '1200', '=C1-B1'], ['Groceries', '500', '540', '=C2-B2'], ['Transport', '150', '120', '=C3-B3'], ['Utilities', '180', '175', '=C4-B4'], ['Fun', '200', '260', '=C5-B5'], ['Savings', '400', '400', '=C6-B6'], ['Total', '=SUM(B1:B6)', '=SUM(C1:C6)', '=SUM(D1:D6)']),
  },
  {
    id: 'expenses',
    name: t('Expense log'),
    blurb: t('Date, what, how much, which kind; a running total at the foot.'),
    doc: sheet('', ['Date:date', 'What', 'Amount:money', 'Category'], ['2027-03-01', 'Coffee with a client', '14.50', 'Meals'], ['2027-03-02', 'Train to the city', '38', 'Travel'], ['2027-03-03', 'Notebook', '6.25', 'Supplies'], ['Total', '', '=SUM(C1:C3)']),
  },
  {
    id: 'training',
    name: t('Training log'),
    blurb: t('What you did and how much, a line a time; a total for each kind of thing.'),
    doc: doc(
      { lock: 'F1:F3' },
      table(
        ['Date:date', 'What', 'How much:number', 'Unit', 'Kind', 'Total:number'],
        [
          ['2027-03-01', 'Run', '5', 'km', 'Run', '=SUMIF(B1:B30, E1, C1:C30)'],
          ['2027-03-02', 'Piano', '30', 'min', 'Piano', '=SUMIF(B1:B30, E2, C1:C30)'],
          ['2027-03-03', 'Run', '7.5', 'km', 'Swim', '=SUMIF(B1:B30, E3, C1:C30)'],
          ['2027-03-05', 'Swim', '40', 'lengths', '', ''],
          ['2027-03-06', 'Piano', '45', 'min', '', ''],
          ['2027-03-07', 'Run', '10', 'km', '', ''],
        ],
      ),
    ),
  },
  {
    id: 'tracker',
    name: t('Project tracker'),
    blurb: t('Tasks with owners, start and due dates counted from today, days each, how each is going, and a tick when done.'),
    doc: sheet(
      '',
      ['Task', 'Owner', 'Start:date', 'Due:date', 'Days:number', 'Status:option', 'Done:check'],
      ['Brief', 'Ana', '=TODAY()', '=C1+4', '=D1-C1+1', 'Done', 'x'],
      ['Design', 'Ben', '=D1+1', '=C2+13', '=D2-C2+1', 'Going well'],
      ['Build', 'Cy', '=D2+1', '=C3+27', '=D3-C3+1', 'Not started'],
      ['Launch', 'Ana', '=D3+1', '=C4', '=D4-C4+1', 'Not started'],
    ),
  },
  {
    id: 'loan',
    name: t('Loans compared'),
    blurb: t('Amount, rate and years for each loan; the monthly payment (PMT), what it costs in all, and the interest.'),
    doc: sheet('', ['Loan:money', 'Rate:percent', 'Years:number', 'Monthly:money', 'Total paid:money', 'Interest:money'], ['20000', '6.5%', '5', '=PMT(B1/12,C1*12,-A1)', '=D1*C1*12', '=E1-A1'], ['15000', '7.9%', '3', '=PMT(B2/12,C2*12,-A2)', '=D2*C2*12', '=E2-A2'], ['30000', '5.5%', '7', '=PMT(B3/12,C3*12,-A3)', '=D3*C3*12', '=E3-A3']),
  },
  {
    id: 'subscription',
    name: t('A subscription business'),
    blurb: t('Visitors who sign up, pay and stay: a model as flows, with the assumptions beside it to change.'),
    doc: model(
      'C1:C6, E6:E9',
      'Retained',
      ['Visitors', 'Signups', '=visitors*signup_rate/100', 'Visitors', '20000'],
      ['Visitors', 'Bounced', '=visitors-signups', 'Signup rate', '6'],
      ['Signups', 'Paying', '=signups*paid_rate/100', 'Paid rate', '25'],
      ['Signups', 'Free', '=signups-paying', 'Churn', '8'],
      ['Paying', 'Churned', '=paying*churn/100'],
      ['Paying', 'Retained', '=paying-churned', 'Signups', into('Signups')],
      ['', '', '', 'Paying', into('Paying')],
      ['', '', '', 'Churned', into('Churned')],
      ['', '', '', 'Retained', into('Retained')],
    ),
  },
  {
    id: 'cafe',
    name: t('A café'),
    blurb: t('Customers a day, what they spend, and where the month’s takings go: supplies, rent, wages, profit.'),
    doc: model(
      'C1:C5, E8:E10',
      'Profit',
      ['Customers', 'Revenue', '=customers_a_day*average_spend*days_open', 'Customers a day', '85'],
      ['Revenue', 'Supplies', '=revenue*supplies_share/100', 'Average spend', '6.5'],
      ['Revenue', 'Rent', '=rent', 'Days open', '26'],
      ['Revenue', 'Wages', '=wages', 'Supplies share', '30'],
      ['Revenue', 'Profit', '=revenue-supplies-rent-wages', 'Rent', '2400'],
      ['', '', '', 'Wages', '5200'],
      [],
      ['', '', '', 'Revenue', into('Revenue')],
      ['', '', '', 'Supplies', into('Supplies')],
      ['', '', '', 'Profit', into('Profit')],
    ),
  },
  {
    id: 'freelancer',
    name: t('A freelancer'),
    blurb: t('Hours, rate and weeks make the year’s invoices; expenses and tax come off; what is left is take-home.'),
    doc: model(
      'C1:C4, E7:E9',
      'Take-home',
      ['Clients', 'Invoiced', '=hours_a_week*rate*weeks_a_year', 'Hours a week', '25'],
      ['Invoiced', 'Expenses', '=expenses', 'Rate', '85'],
      ['Invoiced', 'Tax', '=(invoiced-expenses)*tax_rate/100', 'Weeks a year', '46'],
      ['Invoiced', 'Take-home', '=invoiced-expenses-tax', 'Expenses', '6000'],
      ['', '', '', 'Tax rate', '28'],
      [],
      ['', '', '', 'Invoiced', into('Invoiced')],
      ['', '', '', 'Tax', into('Tax')],
      ['', '', '', 'Take-home', into('Take-home')],
    ),
  },
  {
    id: 'fund',
    name: t('A mutual aid fund'),
    blurb: t('Monthly donors and one-off gifts fill the fund; grants, a little admin and a reserve come out of it.'),
    doc: model(
      'C1:C5, E7:E9',
      'Grants',
      ['Monthly donors', 'Fund', '=monthly_donors*average_gift', 'Monthly donors', '120'],
      ['One-off gifts', 'Fund', '=one_off_gifts', 'Average gift', '15'],
      ['Fund', 'Grants', '=fund*grant_share/100', 'One-off gifts', '900'],
      ['Fund', 'Admin', '=admin', 'Grant share', '80'],
      ['Fund', 'Reserve', '=fund-grants-admin', 'Admin', '150'],
      [],
      ['', '', '', 'Fund', into('Fund')],
      ['', '', '', 'Grants', into('Grants')],
      ['', '', '', 'Reserve', into('Reserve')],
    ),
  },
  {
    id: 'months',
    name: t('Month by month, with a chart'),
    blurb: t('This year against last, a line a month, drawn as lines.'),
    doc: sheet('line', ['Month', 'This year:money', 'Last year:money'], ['Jan', '1200', '980'], ['Feb', '1350', '1010'], ['Mar', '1100', '1200'], ['Apr', '1600', '1150'], ['May', '1750', '1300'], ['Jun', '1900', '1420']),
  },
];
