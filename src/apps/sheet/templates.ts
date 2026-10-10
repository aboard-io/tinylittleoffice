/**
 * Sheet's templates: Blank is the app's own page; these are the rest, each a real document written by the
 * kernel (so each is canonical and round-trips byte for byte, and the corpus test holds every one). The
 * everyday ones come first (money, habits, logs, lists), then the ones for work and groups, then the
 * calculators, and last the four models: flows of From | To | Amount drawn as a Sankey, the assumptions
 * beside them as named cells to play with, the formulas locked so a reader changes the numbers and not the
 * model, and a headline (`{big=…}`) drawn large. What each is for is in templates.md.
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';
import { column, write, type Block, type Doc } from '../../doc/index.ts';

const table = (head: string[], rows: string[][], big?: string): Block => ({
  k: 'table',
  cols: head.map(column),
  rows: rows.map((r) => head.map((_, c) => r[c] ?? '')),
  ...(big ? { a: { kv: { big } } } : {}),
});
const doc = (head: Doc['head'], block: Block): string => write({ head, blocks: [block] });
/** A sheet with a title, and a chart, a lock and a headline where it asks for them. */
const sheet = (head: Doc['head'], cols: string[], rows: string[][], big?: string) => doc(head, table(cols, rows, big));

const MODEL_HEAD = ['From', 'To', 'Amount:number', 'Assumption:name', 'Value:number'];
const model = (title: string, lock: string, big: string, ...rows: string[][]) => doc({ title, chart: 'sankey', lock }, table(MODEL_HEAD, rows, big));
/** A total named for a stock is what flows into it (SUMIF over the To column), which a formula may then use by name. */
const into = (name: string) => `=SUMIF(B1:B20, "${name}", C1:C20)`;

/** Rows written by their row's number (from 1), so each row's formulas can point at its own cells. */
const numbered = (rows: ((n: number) => string[])[]): string[][] => rows.map((row, i) => row(i + 1));
/** A column's letter, A for 0. */
const L = (c: number) => String.fromCharCode(65 + c);

/** Six months of a household, a column a month: each line totalled across, each month totalled down, and what is left of the pay. */
function household(): string {
  const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const lines: [string, number[]][] = [
    ['Rent', [1850, 1850, 1850, 1850, 1850, 1850]],
    ['Groceries', [612, 585, 640, 598, 621, 705]],
    ['Electric and gas', [94, 118, 103, 79, 88, 131]],
    ['Internet and phones', [145, 145, 145, 145, 145, 145]],
    ['Transport', [140, 128, 152, 135, 140, 160]],
    ['After-school clubs', [0, 0, 260, 260, 260, 195]],
    ['Eating out', [180, 240, 150, 165, 140, 310]],
    ['Gifts', [0, 45, 25, 60, 30, 420]],
    ['Savings', [300, 300, 300, 300, 300, 300]],
  ];
  const n = lines.length;
  const across = (r: number) => `=SUM(B${r}:G${r})`;
  const rows = [
    ...lines.map(([what, xs], i) => [what, ...xs.map(String), across(i + 1)]),
    ['Spent', ...months.map((_, c) => `=SUM(${L(c + 1)}1:${L(c + 1)}${n})`), across(n + 1)],
    ['Take-home pay', ...months.map(() => '4600'), across(n + 2)],
    ['Left over', ...[...months, ''].map((_, c) => `=${L(c + 1)}${n + 2}-${L(c + 1)}${n + 1}`)],
  ];
  return sheet({ title: 'Household, July to December 2026', lock: `H1:H${n + 2}, B${n + 1}:G${n + 1}, B${n + 3}:H${n + 3}` }, ['Item', ...months.map((m) => `${m}:money`), 'Six months:money'], rows);
}

export const templates = (): Template[] => [
  {
    id: 'budget',
    name: t('Budget'),
    blurb: t('Planned against actual, a line each, with the difference and totals.'),
    doc: sheet(
      { title: 'Budget, October 2026' },
      ['Item', 'Planned:money', 'Actual:money', 'Difference:money'],
      [
        ['Rent', '1200', '1200', '=C1-B1'],
        ['Groceries', '500', '540', '=C2-B2'],
        ['Transport', '150', '120', '=C3-B3'],
        ['Utilities', '180', '175', '=C4-B4'],
        ['Fun', '200', '260', '=C5-B5'],
        ['Savings', '400', '400', '=C6-B6'],
        ['Total', '=SUM(B1:B6)', '=SUM(C1:C6)', '=SUM(D1:D6)'],
      ],
    ),
  },
  {
    id: 'household',
    name: t('Household budget by month'),
    blurb: t('Six months of a home’s bills and spending, a column a month, totalled both ways against the pay.'),
    doc: household(),
  },
  {
    id: 'expenses',
    name: t('Expense log'),
    blurb: t('Date, what, how much, which kind; a running total at the foot.'),
    doc: sheet(
      { title: 'Expenses, October 2026' },
      ['Date:date', 'What', 'Amount:money', 'Category:option'],
      [
        ['2026-10-01', 'Coffee with Ruth Okafor, a new client', '14.50', 'Meals'],
        ['2026-10-02', 'Train to Philadelphia and back', '38', 'Travel'],
        ['2026-10-05', 'Notebook and pens', '6.25', 'Supplies'],
        ['2026-10-07', 'Domain renewal', '12', 'Software'],
        ['2026-10-08', 'Lunch at the trade fair', '22.80', 'Meals'],
        ['2026-10-08', 'Taxi from the station', '17.40', 'Travel'],
        ['2026-10-09', 'Printer ink', '31.99', 'Supplies'],
        ['Total', '', '=SUM(C1:C7)'],
      ],
    ),
  },
  {
    id: 'savings',
    name: t('Savings goal'),
    blurb: t('What went in each month, what is saved so far and what is still to go, the goal beside it to change.'),
    doc: sheet(
      { title: 'Saving for Lisbon, May 2027', lock: 'C1:D9, F2:F3' },
      ['Month:date', 'Put in:money', 'Saved:money', 'Still to go:money', 'Plan:name', 'Value:money'],
      [
        ['2026-01-31', '400', '=B1', '=goal-C1', 'Goal', '6000'],
        ['2026-02-28', '400', '=C1+B2', '=goal-C2', 'Saved so far', '=SUM(B1:B9)'],
        ['2026-03-31', '250', '=C2+B3', '=goal-C3', 'Still to go', '=goal-saved_so_far'],
        ['2026-04-30', '500', '=C3+B4', '=goal-C4'],
        ['2026-05-31', '400', '=C4+B5', '=goal-C5'],
        ['2026-06-30', '400', '=C5+B6', '=goal-C6'],
        ['2026-07-31', '600', '=C6+B7', '=goal-C7'],
        ['2026-08-31', '300', '=C7+B8', '=goal-C8'],
        ['2026-09-30', '450', '=C8+B9', '=goal-C9'],
      ],
      'Still to go',
    ),
  },
  {
    id: 'habits',
    name: t('Habit tracker'),
    blurb: t('Four habits ticked off day by day for two weeks; how much of each day was kept, and how many days each.'),
    doc: sheet(
      { title: 'Habits, 21 September to 4 October', lock: 'F1:F14, H1:H4' },
      ['Day:date', 'Walk 30 minutes:check', 'Read 20 pages:check', 'Stretch:check', 'In bed by 11:check', 'Kept:percent', 'Habit:name', 'Days kept:number'],
      numbered(
        [
          ['2026-09-21', 'x', 'x', '', 'x'],
          ['2026-09-22', 'x', '', 'x', 'x'],
          ['2026-09-23', '', 'x', 'x', ''],
          ['2026-09-24', 'x', 'x', 'x', 'x'],
          ['2026-09-25', 'x', 'x', '', ''],
          ['2026-09-26', '', 'x', '', ''],
          ['2026-09-27', 'x', 'x', 'x', 'x'],
          ['2026-09-28', 'x', '', 'x', 'x'],
          ['2026-09-29', 'x', 'x', 'x', 'x'],
          ['2026-09-30', '', 'x', 'x', 'x'],
          ['2026-10-01', 'x', 'x', 'x', ''],
          ['2026-10-02', 'x', 'x', '', 'x'],
          ['2026-10-03', 'x', 'x', 'x', 'x'],
          ['2026-10-04', 'x', 'x', 'x', 'x'],
        ].map((ticks, i) => (n: number) => {
          const tally = [
            ['Walk', '=SUM(B1:B14)'],
            ['Read', '=SUM(C1:C14)'],
            ['Stretch', '=SUM(D1:D14)'],
            ['In bed by 11', '=SUM(E1:E14)'],
          ][i];
          return [...ticks, `=SUM(B${n}:E${n})/4`, ...(tally ?? [])];
        }),
      ),
    ),
  },
  {
    id: 'reading',
    name: t('Reading list'),
    blurb: t('Books read, being read and next, with the days each took and the pages read this year.'),
    doc: sheet(
      { title: 'Reading, 2026' },
      ['Title:rich', 'Author', 'Pages:number', 'Status:option', 'Started:date', 'Finished:date', 'Days:number', 'Notes'],
      [
        ['*Orbital*', 'Samantha Harvey', '136', 'Read', '2026-01-04', '2026-01-09', '=F1-E1', 'Read in two sittings'],
        ['*James*', 'Percival Everett', '303', 'Read', '2026-01-12', '2026-01-27', '=F2-E2', 'Lent to Dad'],
        ['*Braiding Sweetgrass*', 'Robin Wall Kimmerer', '391', 'Read', '2026-02-02', '2026-03-08', '=F3-E3', 'A chapter a night'],
        ['*Piranesi*', 'Susanna Clarke', '272', 'Read', '2026-03-10', '2026-03-21', '=F4-E4', 'From the library'],
        ['*The Overstory*', 'Richard Powers', '502', 'Read', '2026-06-01', '2026-07-19', '=F5-E5', 'On holiday in Maine'],
        ['*Middlemarch*', 'George Eliot', '880', 'Reading', '2026-09-07', '', '=TODAY()-E6', 'Book club, a book of it a month'],
        ['*The Dispossessed*', 'Ursula K. Le Guin', '387', 'Next', '', '', '', 'Maya’s copy'],
        ['*Intermezzo*', 'Sally Rooney', '448', 'Want to read', '', '', '', 'On hold at the library'],
        ['Pages read', '', '=SUMIF(D1:D8, "Read", C1:C8)'],
      ],
    ),
  },
  {
    id: 'workout',
    name: t('Workout log'),
    blurb: t('Sets, reps and weight for each lift, the volume worked out, and how each felt.'),
    doc: sheet(
      { title: 'Lifting, three days a week' },
      ['Date:date', 'Exercise', 'Sets:number', 'Reps:number', 'Pounds:number', 'Volume:number', 'Felt:option'],
      numbered(
        [
          ['2026-09-28', 'Squat', '3', '5', '155', 'Solid'],
          ['2026-09-28', 'Bench press', '3', '5', '115', 'Solid'],
          ['2026-09-28', 'Barbell row', '3', '8', '95', 'Easy'],
          ['2026-09-30', 'Deadlift', '1', '5', '205', 'Hard'],
          ['2026-09-30', 'Overhead press', '3', '5', '75', 'Solid'],
          ['2026-09-30', 'Romanian deadlift', '3', '8', '135', 'Solid'],
          ['2026-10-02', 'Squat', '3', '5', '160', 'Hard'],
          ['2026-10-02', 'Bench press', '3', '5', '117.5', 'Solid'],
          ['2026-10-02', 'Barbell row', '3', '8', '100', 'Easy'],
          ['2026-10-05', 'Deadlift', '1', '5', '215', 'Grind'],
          ['2026-10-05', 'Overhead press', '3', '5', '77.5', 'Hard'],
          ['2026-10-05', 'Romanian deadlift', '3', '8', '140', 'Solid'],
        ].map(([d, what, sets, reps, lb, felt]) => (n: number) => [d, what, sets, reps, lb, `=C${n}*D${n}*E${n}`, felt]),
      ).concat([['Total', '', '', '', '', '=SUM(F1:F12)']]),
    ),
  },
  {
    id: 'training',
    name: t('Training log'),
    blurb: t('What you did and how much, a line a time; a total for each kind of thing.'),
    doc: sheet(
      { title: 'Training, the first week of October', lock: 'F1:F3' },
      ['Date:date', 'What', 'How much:number', 'Unit', 'Kind', 'Total:number'],
      [
        ['2026-10-01', 'Run', '5', 'km', 'Run', '=SUMIF(B1:B30, E1, C1:C30)'],
        ['2026-10-02', 'Piano', '30', 'min', 'Piano', '=SUMIF(B1:B30, E2, C1:C30)'],
        ['2026-10-03', 'Run', '7.5', 'km', 'Swim', '=SUMIF(B1:B30, E3, C1:C30)'],
        ['2026-10-05', 'Swim', '40', 'lengths'],
        ['2026-10-06', 'Piano', '45', 'min'],
        ['2026-10-07', 'Run', '10', 'km'],
      ],
    ),
  },
  {
    id: 'timesheet',
    name: t('Time sheet'),
    blurb: t('A week’s hours by client and task; the billable ones priced at their rate, and the totals.'),
    doc: sheet(
      { title: 'Time sheet, week of 5 October 2026', lock: 'G1:G8' },
      ['Date:date', 'Client', 'Task', 'Hours:number', 'Billable:check', 'Rate:money', 'Amount:money'],
      numbered(
        [
          ['2026-10-05', 'Harbor Dental', 'Booking page copy', '3.5', 'x', '85'],
          ['2026-10-05', 'Northside Books', 'Newsletter template', '2', 'x', '85'],
          ['2026-10-06', 'Harbor Dental', 'Changes after the call', '1.5', 'x', '85'],
          ['2026-10-06', 'Own studio', 'Invoicing and email', '1', '', '85'],
          ['2026-10-07', 'Fernwood Farm', 'Logo ideas', '4', 'x', '95'],
          ['2026-10-08', 'Fernwood Farm', 'Logo, second round', '3', 'x', '95'],
          ['2026-10-08', 'Northside Books', 'Author event flyer', '2.5', 'x', '85'],
          ['2026-10-09', 'Own studio', 'Portfolio update', '2', '', '85'],
        ].map((row) => (n: number) => [...row, `=IF(E${n}, D${n}*F${n}, 0)`]),
      ).concat([['Total', '', '', '=SUM(D1:D8)', '', '', '=SUM(G1:G8)']]),
    ),
  },
  {
    id: 'split',
    name: t('Trip costs split'),
    blurb: t('Who paid for what on a trip for four; each one’s fair share, and what each owes (a minus is money back).'),
    doc: sheet(
      { title: 'Outer Banks weekend, split four ways', lock: 'F1:G5' },
      ['Date:date', 'What', 'Paid by:option', 'Amount:money', 'Who:name', 'Paid:money', 'Owes:money'],
      [
        ['2026-08-14', 'Beach house, three nights', 'Priya', '1260', 'Maya', '=SUMIF(C1:C8, "Maya", D1:D8)', '=each_share-F1'],
        ['2026-08-14', 'Gas on the way down', 'Luis', '64.80', 'Jonah', '=SUMIF(C1:C8, "Jonah", D1:D8)', '=each_share-F2'],
        ['2026-08-14', 'Groceries', 'Maya', '187.35', 'Priya', '=SUMIF(C1:C8, "Priya", D1:D8)', '=each_share-F3'],
        ['2026-08-15', 'Kayaks for the morning', 'Jonah', '140', 'Luis', '=SUMIF(C1:C8, "Luis", D1:D8)', '=each_share-F4'],
        ['2026-08-15', 'Seafood dinner at the pier', 'Priya', '212.60', 'Each share', '=SUM(D1:D8)/4'],
        ['2026-08-16', 'Ice cream and coffee', 'Maya', '38.25'],
        ['2026-08-16', 'Groceries, round two', 'Jonah', '96.40'],
        ['2026-08-17', 'Gas home', 'Luis', '71.20'],
        ['Total', '', '', '=SUM(D1:D8)'],
      ],
    ),
  },
  {
    id: 'tracker',
    name: t('Project tracker'),
    blurb: t('Tasks with owners, start and due dates counted from today, days each, how each is going, and a tick when done.'),
    doc: sheet(
      { title: 'Website relaunch' },
      ['Task', 'Owner', 'Start:date', 'Due:date', 'Days:number', 'Status:option', 'Done:check'],
      [
        ['Write the brief', 'Ana Ruiz', '=TODAY()', '=C1+4', '=D1-C1+1', 'Done', 'x'],
        ['Design the pages', 'Ben Carter', '=D1+1', '=C2+13', '=D2-C2+1', 'Going well'],
        ['Build the site', 'Cy Okafor', '=D2+1', '=C3+27', '=D3-C3+1', 'Not started'],
        ['Launch and tell people', 'Ana Ruiz', '=D3+1', '=C4', '=D4-C4+1', 'Not started'],
      ],
    ),
  },
  {
    id: 'schedule',
    name: t('Schedule with dates'),
    blurb: t('A job in steps, each starting when the last one ends: who, how many days, the end date and the working days.'),
    doc: sheet(
      { title: 'Kitchen redo, autumn 2026', lock: 'C2:C9, E1:F9' },
      ['Step', 'Who', 'Starts:date', 'Days:number', 'Ends:date', 'Workdays:number', 'Done:check'],
      numbered(
        [
          ['Clear out the kitchen', 'Us', '2', 'x'],
          ['Take out the old units', 'Reyes Builders', '3', 'x'],
          ['Plumbing and wiring', 'Reyes Builders', '5', ''],
          ['Walls patched and primed', 'Reyes Builders', '4', ''],
          ['Cabinets in', 'Oak and Iron Joinery', '3', ''],
          ['Countertop measured, cut and fitted', 'Stoneworks', '10', ''],
          ['Tile behind the sink', 'Reyes Builders', '3', ''],
          ['Paint', 'Us', '2', ''],
          ['Fridge and oven in', 'Delivery', '1', ''],
        ].map(([what, who, days, done]) => (n: number) => [what, who, n === 1 ? '2026-10-05' : `=E${n - 1}+1`, days, `=C${n}+D${n}-1`, `=WORKDAYS(C${n}, E${n})`, done]),
      ),
    ),
  },
  {
    id: 'grades',
    name: t('Grade book'),
    blurb: t('A class’s marks for essays, quizzes and a project; each student’s average and letter, and the class average.'),
    doc: sheet(
      { title: 'English 9, fall 2026', lock: 'G1:H10, B11:G11' },
      ['Student', 'Essay 1:number', 'Quiz 1:number', 'Quiz 2:number', 'Essay 2:number', 'Project:number', 'Average:number', 'Grade'],
      numbered(
        [
          ['Amara Osei', '92', '88', '95', '90', '94'],
          ['Ben Whitfield', '78', '72', '80', '75', '85'],
          ['Camila Reyes', '85', '90', '87', '91', '88'],
          ['Daniel Kim', '68', '75', '70', '72', '80'],
          ['Esther Abrams', '95', '93', '98', '96', '97'],
          ['Farah Haddad', '88', '84', '79', '86', '90'],
          ['Gabriel Santos', '72', '65', '74', '70', '78'],
          ['Hana Mori', '90', '95', '92', '89', '93'],
          ['Isaac Turner', '60', '58', '66', '64', '70'],
          ['Jade Nguyen', '83', '80', '85', '88', '82'],
        ].map((row) => (n: number) => [...row, `=ROUND(AVG(B${n}:F${n}), 1)`, `=IF(G${n}>=90, "A", IF(G${n}>=80, "B", IF(G${n}>=70, "C", IF(G${n}>=60, "D", "F"))))`]),
      ).concat([['Class average', ...[1, 2, 3, 4, 5, 6].map((c) => `=ROUND(AVG(${L(c)}1:${L(c)}10), 1)`)]]),
    ),
  },
  {
    id: 'members',
    name: t('Membership roll'),
    blurb: t('Who belongs, their plot and job, when they paid and when they renew, who holds a key, and the dues in.'),
    doc: sheet(
      { title: 'Linden Street Community Garden' },
      ['Name', 'Plot', 'Email', 'Paid on:date', 'Renews:date', 'Dues:money', 'Gate key:check', 'Role:option'],
      numbered(
        [
          ['Rosa Delgado', 'A1', 'rosa.delgado@example.org', '2026-03-01', '40', 'x', 'Coordinator'],
          ['Tom Becker', 'A2', 'tom.becker@example.org', '2026-03-01', '40', 'x', 'Member'],
          ['Aisha Rahman', 'A3', 'aisha.rahman@example.org', '2026-03-14', '40', 'x', 'Treasurer'],
          ['Wen Li', 'B1', 'wen.li@example.org', '2026-03-20', '40', '', 'Member'],
          ['Marcus Hill', 'B2', 'marcus.hill@example.org', '2026-04-02', '25', 'x', 'Member'],
          ['Gloria Santos', 'B3', 'gloria.santos@example.org', '2026-04-11', '40', 'x', 'Tool shed'],
          ['Olu Adeyemi', 'C1', 'olu.adeyemi@example.org', '2026-04-30', '40', '', 'Member'],
          ['Nina Petrova', 'C2', 'nina.petrova@example.org', '2026-05-09', '25', 'x', 'Member'],
          ['Sam O’Connor', 'C3', 'sam.oconnor@example.org', '2026-06-01', '40', 'x', 'Compost'],
          ['Leah Goldberg', 'C4', 'leah.goldberg@example.org', '2026-09-12', '40', '', 'Member'],
        ].map(([name, plot, email, paid, dues, key, role]) => (n: number) => [name, plot, email, paid, `=EDATE(D${n}, 12)`, dues, key, role]),
      ).concat([['Dues in', '', '', '', '', '=SUM(F1:F10)']]),
    ),
  },
  {
    id: 'seating',
    name: t('Seating count'),
    blurb: t('Tables for a wedding: seats, guests, places free and the meals chosen, with a check that the meals add up.'),
    doc: sheet(
      { title: 'Ada and Sam’s wedding, 19 December 2026', lock: 'E1:E9, I1:I9, C9:H9' },
      ['Table', 'Who sits there', 'Seats:number', 'Guests:number', 'Free:number', 'Chicken:number', 'Fish:number', 'Vegetarian:number', 'Meals add up'],
      numbered([
        ...[
          ['Top table', 'Ada, Sam and the wedding party', '10', '10', '4', '3', '3'],
          ['Table 2', 'Ada’s family', '10', '9', '5', '2', '2'],
          ['Table 3', 'Sam’s family', '10', '10', '4', '4', '2'],
          ['Table 4', 'University friends', '10', '8', '3', '2', '3'],
          ['Table 5', 'Work friends', '10', '10', '5', '3', '2'],
          ['Table 6', 'Cousins', '10', '9', '4', '2', '2'],
          ['Table 7', 'Neighbours', '8', '7', '3', '2', '2'],
          ['Table 8', 'The children', '8', '6', '6', '0', '0'],
        ].map(([name, who, seats, guests, ...meals]) => (n: number) => [name, who, seats, guests, `=C${n}-D${n}`, ...meals, `=IF(F${n}+G${n}+H${n}=D${n}, "Yes", "Check")`]),
        (n: number) => ['All tables', '', ...[2, 3, 4, 5, 6, 7].map((c) => `=SUM(${L(c)}1:${L(c)}8)`), `=IF(F${n}+G${n}+H${n}=D${n}, "Yes", "Check")`],
      ]),
    ),
  },
  {
    id: 'poll',
    name: t('Poll results'),
    blurb: t('The answers and the votes for each, drawn as a pie above them.'),
    doc: sheet(
      { title: 'Holiday party: which evening?', chart: 'pie', 'chart-at': 'top' },
      ['Evening', 'Votes:number'],
      [
        ['Friday, December 11', '14'],
        ['Saturday, December 12', '22'],
        ['Thursday, December 17', '6'],
        ['Friday, December 18', '19'],
      ],
    ),
  },
  {
    id: 'fundraising',
    name: t('Fundraising thermometer'),
    blurb: t('What has come in, week by week, against the goal: a chart above, the total so far drawn large.'),
    doc: sheet(
      { title: 'A new roof for the Eastside Youth Center', chart: 'bar', 'chart-at': 'top' },
      ['Week', 'Raised so far:money', 'Goal:money'],
      [
        ['Sep 7', '3150', '25000'],
        ['Sep 14', '5820', '25000'],
        ['Sep 21', '8400', '25000'],
        ['Sep 28', '10275', '25000'],
        ['Oct 5', '13940', '25000'],
        ['Oct 12', '16480', '25000'],
        ['Oct 19', '19905', '25000'],
        ['Oct 26', '21730', '25000'],
      ],
      'B8',
    ),
  },
  {
    id: 'invoices',
    name: t('Invoice ledger'),
    blurb: t('Every invoice sent: when, to whom, for how much, when it was paid, what is still owed and how late.'),
    doc: sheet(
      { title: 'Invoices, 2026', lock: 'D1:D7, G1:H7' },
      ['Invoice', 'Client', 'Sent:date', 'Due:date', 'Amount:money', 'Paid on:date', 'Owed:money', 'Days late:number'],
      numbered(
        [
          ['INV-031', 'Harbor Dental', '2026-06-30', '2380', '2026-07-21'],
          ['INV-032', 'Fernwood Farm', '2026-07-15', '1150', '2026-08-28'],
          ['INV-033', 'Northside Books', '2026-07-31', '640', '2026-08-12'],
          ['INV-034', 'Harbor Dental', '2026-08-31', '1905', '2026-09-24'],
          ['INV-035', 'Cedar and Pine Architects', '2026-09-04', '3600', ''],
          ['INV-036', 'Fernwood Farm', '2026-09-30', '875', ''],
          ['INV-037', 'Northside Books', '2026-10-05', '420', ''],
        ].map(([id, who, sent, amount, paid]) => (n: number) => [id, who, sent, `=C${n}+30`, amount, paid, `=IF(F${n}>0, 0, E${n})`, `=IF(F${n}>0, MAX(0, F${n}-D${n}), MAX(0, TODAY()-D${n}))`]),
      ).concat([['Total', '', '', '', '=SUM(E1:E7)', '', '=SUM(G1:G7)']]),
    ),
  },
  {
    id: 'inventory',
    name: t('Inventory'),
    blurb: t('Stock on hand against the point to reorder at; what to order, what it is worth, and a flag when it is low.'),
    doc: sheet(
      { title: 'Stock at Two Leaves Tea', lock: 'G1:H8' },
      ['Item', 'Code', 'On hand:number', 'Reorder at:number', 'Order:number', 'Unit cost:money', 'Value:money', 'Status'],
      numbered(
        [
          ['Sencha, 100 g tin', 'TL-101', '34', '20', '48', '6.40'],
          ['Assam breakfast, 250 g', 'TL-102', '12', '24', '48', '5.10'],
          ['Earl Grey, 100 g tin', 'TL-103', '41', '20', '48', '6.80'],
          ['Chamomile, 50 g', 'TL-104', '9', '15', '30', '3.95'],
          ['Jasmine pearls, 50 g', 'TL-105', '18', '12', '24', '9.20'],
          ['Rooibos, 100 g', 'TL-106', '22', '15', '30', '4.30'],
          ['Ceramic teapot, 600 ml', 'TL-201', '6', '4', '8', '14.50'],
          ['Paper filters, 100', 'TL-202', '3', '10', '40', '1.85'],
        ].map((row) => (n: number) => [...row, `=C${n}*F${n}`, `=IF(C${n}<=D${n}, "Order now", "OK")`]),
      ).concat([['Stock value', '', '', '', '', '', '=SUM(G1:G8)']]),
    ),
  },
  {
    id: 'pettycash',
    name: t('Petty cash'),
    blurb: t('Money in and out of the tin, who spent it and on what, the balance after each, and a tick for a receipt.'),
    doc: sheet(
      { title: 'Petty cash, Maple Street Clinic, October 2026', lock: 'F1:F8' },
      ['Date:date', 'What', 'Who', 'In:money', 'Out:money', 'Balance:money', 'Receipt:check'],
      numbered(
        [
          ['2026-10-01', 'Float for the month', 'Office', '200', '', 'x'],
          ['2026-10-02', 'Milk and coffee for the staff room', 'Dana', '', '12.40', 'x'],
          ['2026-10-03', 'Stamps', 'Marcus', '', '23.60', 'x'],
          ['2026-10-06', 'Batteries for the scales', 'Dana', '', '8.99', 'x'],
          ['2026-10-07', 'Card and flowers for Ruth’s retirement', 'Priya', '', '34', 'x'],
          ['2026-10-08', 'Parking for the courier', 'Marcus', '', '6', ''],
          ['2026-10-09', 'Top-up from the office account', 'Office', '50', '', 'x'],
          ['2026-10-09', 'Hand soap and paper towels', 'Dana', '', '17.85', 'x'],
        ].map(([d, what, who, cashIn, out, receipt]) => (n: number) => [d, what, who, cashIn, out, n === 1 ? '=D1-E1' : `=F${n - 1}+D${n}-E${n}`, receipt]),
      ).concat([['Total', '', '', '=SUM(D1:D8)', '=SUM(E1:E8)', '=F8']]),
    ),
  },
  {
    id: 'rates',
    name: t('Rate card'),
    blurb: t('A freelancer’s services with the hours each takes; prices and rush prices worked out from one hourly rate.'),
    doc: sheet(
      { title: 'Ines Duarte, illustration and design: rates', lock: 'D1:E7' },
      ['Service', 'What you get', 'Hours:number', 'Price:money', 'Rush:money', 'Setting:name', 'Value:number'],
      numbered(
        [
          ['Spot illustration', 'One drawing, two rounds of changes', '6', 'Hourly rate', '90'],
          ['Editorial illustration', 'A full-page drawing for a magazine', '10', 'Rush extra percent', '25'],
          ['Poster', 'One design, print and social sizes', '12'],
          ['Pattern tile', 'A repeating tile in two colourways', '8'],
          ['Logo and mark', 'Three ideas, one refined, files for print and web', '20'],
          ['Book cover', 'Front, spine and back, ready for the printer', '24'],
          ['Workshop, half a day', 'Up to 12 people, materials included', '5'],
        ].map(([what, gets, hours, ...setting]) => (n: number) => [what, gets, hours, `=C${n}*hourly_rate`, `=D${n}*(1+rush_extra_percent/100)`, ...setting]),
      ),
    ),
  },
  {
    id: 'mortgage',
    name: t('Mortgages compared'),
    blurb: t('Four offers on one house: the loan after the down payment, the monthly payment, all in with tax, and the interest.'),
    doc: sheet(
      { title: 'Mortgages for a $420,000 house', lock: 'D1:D4, G1:G4, I1:J4' },
      ['Offer', 'Price:money', 'Down:percent', 'Loan:money', 'Rate:percent', 'Years:number', 'Monthly:money', 'Tax and insurance:money', 'All in:money', 'Interest:money'],
      numbered(
        [
          ['Lakeshore Credit Union, 30-year fixed', '20%', '6.125%', '30', '610'],
          ['First Harbor Bank, 15-year fixed', '20%', '5.375%', '15', '610'],
          ['Lakeshore, 30-year with 10% down', '10%', '6.25%', '30', '790'],
          ['Pinewood Mortgage, 30-year, a point paid', '20%', '5.875%', '30', '610'],
        ].map(([offer, down, rate, years, tax]) => (n: number) => [
          offer,
          '420000',
          down,
          `=B${n}*(1-C${n})`,
          rate,
          years,
          `=PMT(E${n}/12, F${n}*12, -D${n})`,
          tax,
          `=G${n}+H${n}`,
          `=G${n}*F${n}*12-D${n}`,
        ]),
      ),
    ),
  },
  {
    id: 'loan',
    name: t('Loans compared'),
    blurb: t('Amount, rate and years for each loan; the monthly payment (PMT), what it costs in all, and the interest.'),
    doc: sheet(
      { title: 'Loans compared', lock: 'E1:G4' },
      ['Loan', 'Amount:money', 'Rate:percent', 'Years:number', 'Monthly:money', 'Total paid:money', 'Interest:money'],
      numbered(
        [
          ['Car, Lakeshore Credit Union', '24000', '6.49%', '5'],
          ['Car, dealer finance', '24000', '7.9%', '6'],
          ['New roof, First Harbor Bank', '15000', '8.25%', '3'],
          ['Student loan, refinanced', '32000', '5.5%', '10'],
        ].map((row) => (n: number) => [...row, `=PMT(C${n}/12, D${n}*12, -B${n})`, `=E${n}*D${n}*12`, `=F${n}-B${n}`]),
      ),
    ),
  },
  {
    id: 'converter',
    name: t('Unit converter'),
    blurb: t('Miles and kilometres, pounds and kilograms, ovens, cups and gallons: type an amount, read the other unit.'),
    doc: sheet(
      { title: 'Unit converter', lock: 'C1:D12' },
      ['Unit:name', 'Amount:number', 'Comes to:number', 'In'],
      [
        ['Miles', '26.2', '=ROUND(miles*1.609344, 2)', 'kilometres'],
        ['Kilometres', '10', '=ROUND(kilometres/1.609344, 2)', 'miles'],
        ['Pounds', '150', '=ROUND(pounds*0.45359237, 2)', 'kilograms'],
        ['Kilograms', '5', '=ROUND(kilograms/0.45359237, 2)', 'pounds'],
        ['Fahrenheit', '350', '=ROUND((fahrenheit-32)*5/9, 1)', 'degrees Celsius'],
        ['Celsius', '21', '=ROUND(celsius*9/5+32, 1)', 'degrees Fahrenheit'],
        ['Inches', '55', '=ROUND(inches*2.54, 1)', 'centimetres'],
        ['Feet', '6', '=ROUND(feet*0.3048, 2)', 'metres'],
        ['Cups', '2', '=ROUND(cups*236.588, 0)', 'millilitres'],
        ['Ounces', '8', '=ROUND(ounces*28.3495, 1)', 'grams'],
        ['Gallons', '12', '=ROUND(gallons*3.78541, 2)', 'litres'],
        ['Acres', '0.25', '=ROUND(acres*4046.86, 0)', 'square metres'],
      ],
    ),
  },
  {
    id: 'bracket',
    name: t('Tournament bracket'),
    blurb: t('Eight teams in a knockout: each match’s score, the winner worked out, and the winners carried on to the final.'),
    doc: sheet(
      { title: 'Riverside Rec League cup, autumn 2026', lock: 'C5:C7, E5:E7, G1:G7' },
      ['Round', 'Date:date', 'Home', 'Home goals:number', 'Away', 'Away goals:number', 'Winner'],
      numbered(
        [
          ['Quarter-final 1', '2026-09-19', 'Riverside Rovers', '3', 'Mill Creek United', '1'],
          ['Quarter-final 2', '2026-09-19', 'Eastgate Eagles', '0', 'Harbor Lights FC', '2'],
          ['Quarter-final 3', '2026-09-20', 'Northfield Foxes', '2', 'Pine Hollow', '4'],
          ['Quarter-final 4', '2026-09-20', 'Old Town Athletic', '1', 'Lakeview Strikers', '0'],
          ['Semi-final 1', '2026-09-26', '=G1', '2', '=G2', '1'],
          ['Semi-final 2', '2026-09-27', '=G3', '1', '=G4', '3'],
          ['Final', '2026-10-03', '=G5', '2', '=G6', '3'],
        ].map((row) => (n: number) => [...row, `=IF(D${n}>F${n}, C${n}, E${n})`]),
      ),
    ),
  },
  {
    id: 'months',
    name: t('Month by month, with a chart'),
    blurb: t('This year against last, a line a month, drawn as lines.'),
    doc: sheet(
      { title: 'Sales at the bike shop, 2026 against 2025', chart: 'line' },
      ['Month', 'This year:money', 'Last year:money'],
      [
        ['Jan', '18400', '16900'],
        ['Feb', '17250', '15800'],
        ['Mar', '24600', '21300'],
        ['Apr', '31800', '29400'],
        ['May', '38900', '34100'],
        ['Jun', '42300', '40200'],
        ['Jul', '44150', '41800'],
        ['Aug', '39700', '38900'],
        ['Sep', '33600', '30250'],
      ],
    ),
  },
  {
    id: 'subscription',
    name: t('A subscription business'),
    blurb: t('Visitors who sign up, pay and stay: a model as flows, with the assumptions beside it to change.'),
    doc: model(
      'A subscription business, a month',
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
      'A café, a month',
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
      'A freelancer, a year',
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
      'A mutual aid fund, a month',
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
];
