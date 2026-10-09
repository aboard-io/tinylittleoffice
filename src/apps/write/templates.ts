/**
 * Write's templates: Blank is the app's own page; these are the rest, each a real document in TLO with
 * real sample data (the studio by the harbour), canonical as the kernel writes it so each round-trips byte
 * for byte (the corpus test holds every one). The contract ends in a signatures fence, a table of
 * Name | Key | Signature that signing (a later phase) fills. The invoice is a text whose fields are head
 * fields and whose lines are a table block the formula engine works out in place: Amount is =Qty×Price
 * and locked, the blank row under the lines is inside the subtotal's reach so a line added there is
 * summed, and the tax rate sits in its own row's Qty cell, where a formula can read it.
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';

const LETTER = `Mara Quill {.right}
Harbor Studio, 14 Quay Street {.right}
Portland, ME 04101 {.right}
mara@harborstudio.example {.right}

1 March 2027

Dear Ms Okafor,

Thank you for coming to see the studio last week. I am writing to set down what we agreed, so that we both have it in one place.

We will design and build the new site for Acme Ltd between March and May, for the fee in the invoice that comes with this letter. You will send the words for the six pages by 15 March, and we will show you a first version by 1 April.

If anything here is not as you remember it, do say, and I will put it right. I look forward to the work.

Yours sincerely,

<br>

Mara Quill
`;

const MEETING = `# Launch meeting {.title}

*2 March 2027 · The studio · Mara, Sam, Dee*

## Agenda

1. Where the site stands
2. The words for the pages
3. Launch day

## Notes

The build is on time: four of the six pages are done. Sam has the words for the home page; the other five are still with Acme.

## Decisions

- We launch on Friday 1 May at ten in the morning.
- Dee owns the launch checklist.

## Actions

- [ ] Sam: chase Acme for the five pages by 15 March
- [ ] Mara: send the invoice for the first half
- [x] Dee: book the launch call
`;

const RESUME = `# Ada Lovelace {.title}

London · ada@example.com · example.com/ada

## Experience

**Analyst, Analytical Engine** (1842 to 1843)

- Wrote the first published program, for computing Bernoulli numbers
- Translated and annotated Menabrea's paper, tripling its length

## Education

Tutored in mathematics by Mary Somerville and Augustus De Morgan

## Skills

- Mathematics, music, French, explaining machines to people
`;

const CONTRACT = `# Dog-walking agreement {.title}

Between Paul Ford and Sam Reyes, from 1 March 2027.

## What is agreed

- Sam walks Biscuit every weekday at noon, for half an hour.
- Paul pays $20 a walk, on Fridays, by transfer.
- Either can end this with a week's notice.

## Signed

\`\`\`signatures
Name | Key | Signature
--- | --- | ---
\`\`\`
`;

const INVOICE = `---
from: Harbor Studio | 14 Quay Street | Portland, ME 04101
to: Acme Ltd | Accounts payable | 9 High Street, Bath
number: 0042
date: 2027-03-01
due: 2027-03-31
currency: $
terms: Payment within 30 days by bank transfer.
---
# Invoice {.title}

What | Qty:number | Units | Price:money | Amount:money
--- | --- | --- | --- | ---
Design | 12 | hours | 150 | =B1*D1
Build | 20 | hours | 140 | =B2*D2
Hosting for a year | 1 |  | 480 | =B3*D3
| |  |  |  |  |
Subtotal |  |  |  | =SUM(E1:E4)
Tax | 8 | % |  | =E5*B6/100
Total |  |  |  | =E5+E6
{lock="E1:E7"}

Thank you for your business.
`;

export const templates = (): Template[] => [
  { id: 'letter', name: t('A letter'), blurb: t('Your address, the date, the greeting, the point, the sign-off.'), doc: LETTER },
  { id: 'meeting', name: t('Meeting notes'), blurb: t('Agenda, what was said, what was decided, who does what.'), doc: MEETING },
  { id: 'resume', name: t('Résumé'), blurb: t('Name and contact, experience, education, skills: a résumé fitted to a page.'), doc: RESUME },
  { id: 'contract', name: t('Contract'), blurb: t('A plain-words agreement, with room at the end for each party to sign.'), doc: CONTRACT },
  { id: 'invoice', name: t('Invoice'), blurb: t('Who, what and how much, the sums done in the table; printed as paper to send.'), doc: INVOICE },
];
