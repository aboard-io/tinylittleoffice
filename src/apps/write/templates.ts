/**
 * Write's templates: Blank is the app's own page; these are the rest, each the shape of a document and a hint at
 * each part (Paul, 2026-10-11: "just little summaries and hints to what they might say rather than the content
 * themselves"). The shape is the headings in order, the address block's lines, the date line, the greeting and
 * sign-off, the title's attributes, the page breaks, one footnote where a template teaches footnotes; every
 * paragraph of prose is one hint in italics, saying what goes there. The numeric parts keep their numbers: the
 * invoice's lines, the recipe's scaling, the thesis's table, the grant's budget, the newsletter's dates, the
 * minutes' sums. Each is canonical as the kernel writes it, so it round-trips byte for byte (the corpus test holds
 * every one). The contract ends in a signatures fence, a table of Name | Key | Signature | Signed that Sign this
 * contract fills (contract.ts). The invoice is a text whose fields are head fields and whose lines are a table
 * block the formula engine works out in place: Amount is =Qty×Price and locked, the blank row under the lines is
 * inside the subtotal's reach so a line added there is summed, and the tax rate sits in its own row's Qty cell,
 * where a formula can read it.
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';

const LETTER = `*Your name*
*Street and number*
*Town and postcode*
*you@example.com* {.right}

*The date*

Dear …,

*Why you are writing, in a sentence.*

*What you have to say, in order.*

*What happens next, and by when.*

Yours sincerely,

<br>

*Your name*
`;

const MEETING = `# Meeting {.title}

*The date · where · who came*

## Agenda

1. *First item*
2. *Second item*

## Notes

*What was said, briefly.*

## Decisions

- *What was decided.*

## Actions

- [ ] *Who does what, by when*
`;

const RESUME = `# *Your name* {.title}

*Where you live · email · website*

## Experience

**The job, where** *the years*

- *What you did, with a number if you can*

## Education

*Where you studied, and what*

## Skills

- *What you are good at*
`;

const CONTRACT = `# *What this agreement is about* {.title}

*Between whom, and from when.*

## What is agreed

- *What one of you does, and when.*
- *What the other pays or does in return.*
- *How either of you can end it.*

## Signed

\`\`\`signatures
Name | Key | Signature | Signed
--- | --- | --- | ---
\`\`\`
`;

const INVOICE = `---
from: Your name | Street and number | Town and postcode
to: Who pays | Street and number | Town and postcode
number: 0042
date: 2026-10-02
due: 2026-11-01
currency: $
terms: Payment within 30 days by bank transfer.
---
# Invoice {.title}

What | Qty:number | Units | Price:money | Amount:money
--- | --- | --- | --- | ---
Design | 12 | hours | 150 | =B1*D1
Build | 20 | hours | 140 | =B2*D2
Hosting for a year | 1 |  | 480 | =B3*D3
| |  |  |  |
Subtotal |  |  |  | =SUM(E1:E4)
Tax | 8 | % |  | =E5*B6/100
Total |  |  |  | =E5+E6
{lock=E1:E7}

*A line of thanks.*
`;

const MEMO = `# Memo {.title}

**To:** *Who reads it*
**From:** *You*
**Date:** *The date*
**Subject:** *The change*

## In short

*The change, in a sentence.*

## Why

*The reason, and the fact that shows it.*^[*Its source.*]

## What changes

- *Each change on its own line.*

## What we need from you

*What each reader does, and by when.*
`;

const COVER = `---
look: mixed
---
*Your name*
*Your address*
*Email · phone* {.right}

*The date*

*Who you are writing to*
*The company*
*Its address*

Dear …,

*The job, and where you saw it.*

*What you have done that fits, with an example.*

*Why them, and what you would bring.*

*What you enclose, and when you can talk.*

Yours faithfully,

<br>

*Your name*
`;

const CV = `---
look: mono
---
# *Your name* {.title}

*Town · email · phone*

## Now

**Job, where** *years*

- *What came of it*

## Before

*The jobs before, shorter*

## Education

*Degree, where, year*

## Languages and tools

*What you speak and use*
`;

const PRESS = `# *The news, as a headline* {.title}

**FOR IMMEDIATE RELEASE** · *The date*

**Town.** *The news in one sentence: who, what, when.*

*The detail and the numbers.*

> *A quote, and who said it.*

## Hours

Days | Hours
--- | ---
Weekdays | 9 am to 5 pm
Weekends | 10 am to 4 pm

## Opening day

*What happens, and when.*

## For the press

*A name, email and phone*
`;

const MINUTES = `# Minutes {.title}

*The date · where*

**Present:** *Who came*
**Apologies:** *Who sent them*

## 1. The last minutes

*Agreed, or changed.*

## 2. Treasurer's report

*What the treasurer reported.*

Item | Amount:money
--- | ---
Balance on 1 September | 1240
Dues received | 315
Printing and postage | -62
Hall hire | -40
Balance on 30 September | =SUM(B1:B4)
{lock=B5}

## 3. *An item*

**Motion:** *What it asks; who proposed it.*

For | Against | Abstained
--- | --- | ---
22 | 1 | 3

*Carried or lost.*

## 4. Actions

- [ ] *Who does what, by when*

**Next meeting:** *When, where*
`;

const RECIPE = `---
look: inverse
---
# *The dish* {.title}

*Serves 4 · how long to get ready and to cook*

*What it is, in a sentence.*

## What you need

Ingredient | For 4:number | Unit | For 6:number
--- | --- | --- | ---
Olive oil | 3 | tbsp | =B1*1.5
Onion, sliced | 1 | large | =B2*1.5
Red peppers, sliced | 2 |  | =B3*1.5
Garlic, crushed | 3 | cloves | =B4*1.5
Ground cumin | 1 | tsp | =B5*1.5
Smoked paprika | 2 | tsp | =B6*1.5
Chopped tomatoes | 800 | g | =B7*1.5
Eggs | 6 |  | =B8*1.5
Feta | 100 | g | =B9*1.5
{lock=D1:D9}

## How

1. *The first step, and for how long.*
2. *The next.*
3. *And so on, a step a line.*^[*A tip for this step.*]

> *A note for next time.*
`;

const FAQ = `# Questions about *the subject* {.title}

*When it was last updated*

## *The question people ask most*

*The answer, short and plain.*

## *How much it costs*

*The price, and who pays less.*

## *What they have to do*

- *One thing on each line.*

## *Who to ask about anything else*

*A name, and how to reach them.*
`;

const TERMS = `# Terms of service for *your business* {.title}

*When these apply, and who runs this.*

## 1. What we do

*The service, and its limits.*

## 2. Booking and cancelling

1. *How to book, and by when.*
2. *How to cancel, and what it costs.*

## 3. Prices

Service | Price:money
--- | ---
Half an hour | 20
An hour | 32
A first visit | 15

*When and how people pay.*

## 4. Keys

*How you keep them safe.*

## 5. If something goes wrong

*Your insurance, and what you do first.*^[*The policy.*]

## 6. Ending this

*How either side ends it.*
`;

const NEWSLETTER = `---
look: mixed
---
# *The newsletter's name* {.title}

*The month · who it is from*

## :calendar: Coming up

Date:date | What | Where
--- | --- | ---
2026-10-17 | Clean-up, 9 am to noon | Where to meet
2026-10-31 | Party, 5 to 8 pm | The street
2026-11-12 | Meeting, 7 pm | The hall

## :heart: Welcome

*Who is new.*

## :lightbulb: *A piece of news*

*What is changing, and what it means for readers.*

## :coffee: Thank you

*Who helped, and with what.*

## Get in touch

*How to reach you*
`;

const THESIS = `---
look: book
---
# *The title: the subject, the place, the years* {.title}

*The degree it is submitted for* {.center}

*Your name*

*The university · month and year* {.center}

## Abstract

*The question, what you found, and why it matters, in a paragraph.*

---

## Chapter 1. *The setting*

*Where and what you studied, and who decides.*^[*The law or source for it.*]

## Chapter 2. *The evidence*

*How you gathered it.*

Town | In 1990:number | In 2025:number | Change:percent
--- | --- | --- | ---
Brunswick | 120 | 85 | =ROUND((C1-B1)/B1, 3)
Freeport | 64 | 52 | =ROUND((C2-B2)/B2, 3)
Harpswell | 98 | 90 | =ROUND((C3-B3)/B3, 3)
Yarmouth | 40 | 26 | =ROUND((C4-B4)/B4, 3)
All four | =SUM(B1:B4) | =SUM(C1:C4) | =ROUND((C5-B5)/B5, 3)
{lock=D1:D5}

*What the table shows.*

## Chapter 3. *Findings*

*What the evidence and the people say.*

## Conclusion

*The answer to the question.*

## Bibliography

*Author. Title. Place: publisher, year.*
`;

const BOOK_REVIEW = `---
look: serif
---
# *A headline that says what you thought* {.title}

*Title*, by *author* · *publisher, year, pages*

*Reviewed by whom, for what, and when*

★★★★★ {.center}

*What the book is about, without the ending.*

*How it is written, and what that does to a reader.*

## What worked

- *A thing that worked, and why.*

## What did not

*What did not, fairly.*

> *A line from the book worth quoting.*

**In short:** *Read it or not, in a sentence.*
`;

const NEWS = `---
look: news
---
# *The headline: the news in a line* {.title}

**By** *the reporter* · *where* · *the date*

*The news in a sentence: what happened, and to whom.*

*The number or detail that matters most.*

*Why it happened, and what came before.*

\`\`\`sheet
---
title: The figures
chart: bar
---
Month | On time:percent
--- | ---
May | 71
Jun | 63
Jul | 52
Aug | 47
Sep | 55
\`\`\`

*A quote from someone involved, and who they are.*

*What it costs, and how it works.*

*Someone who disagrees, in their own words.*

*What happens next, and when.*
`;

const INTERVIEW = `---
look: mixed
---
# *"A line from the interview": a conversation with whom* {.title}

*Interviewed by whom, for what, where and when. Edited for length.*

*Who they are, and why now.*

**Interviewer:** *A question.*

**Guest:** *Their answer, in their words.*

**Interviewer:** *The next question, following the answer.*

**Guest:** *And so on, the best answers kept.*
`;

const MUSIC = `---
look: inverse
---
# *The artist: the album* {.title}

**Album review** · *The label · how long · out when*

*By whom*

★★★★☆ {.center}

*Who they are, and what this album is.*

*The opening track, and what it sets up.*

*The heart of the record.*

*What does not work.*

## Best tracks

1. *A track*
2. *Another*
3. *A third*

**For fans of:** *Two or three artists like them.*
`;

const COMPLAINT = `*Your name*
*Street and number*
*Town and postcode* {.right}

*The date*

*Who handles complaints*
*The company*
*Its address*

Dear …,

**Formal complaint:** *what, when, and any reference number.*

*What you are complaining about, in a sentence.*

## What happened

1. *The first thing that went wrong.*
2. *What happened next.*
3. *What it cost you.*

## What I would like

- *Each thing you ask for, with its amount.*^[*What they said, if they refused already.*]

*What you enclose, and when you want a reply.*

Yours faithfully,

<br>

*Your name*
`;

const POLITICIAN = `---
look: serif
---
*Your name*
*Street and number*
*Town and postcode* {.right}

*The date*

*Their title and name*
*Their office*
*Its address*

Dear …,

*Who you are, and the vote you ask for.*

*Why it matters here, in one story.*

*What the bill does, and what it costs.*

*Who else supports it.*

*The question: how will they vote?*

Yours sincerely,

<br>

*Your name*
`;

const LOVE = `---
look: serif
---
*Where you are, and the date* {.right}

My dear …,

*How long it has been, in your own measure.*

*Where you keep finding them.*

*The ordinary things you miss.*

*When you will see them next.*

*What you want back.*

All my love,

*Your name*
`;

const GRANT = `---
look: mixed
---
# *The project, and what it does* {.title}

*To whom · from whom · when*

## Summary

*What you ask for, and what it pays for.*

## The need

*The problem, with a figure.*^[*Where the figure comes from.*]

## What we will do

- *One thing you will do, and when.*

## The budget

Item | Cost:money(£)
--- | ---
Room hire, 12 sessions at £60 | 720
Tools and spare parts | 1600
Electrical safety tester and training | 1250
Insurance for the year | 480
Publicity and printing | 350
Tea, coffee and biscuits | 400
Total | =SUM(B1:B6)
{lock=B7}

## How we will know it worked

*What you will count, and when.*

## Contact

*A name · email · phone*
`;

const SYLLABUS = `---
look: mixed
---
# *The course: its name* {.title}

*Term · days · room*

**Instructor:** *Name · email*
**Office hours:** *When, where*

## What this course is about

*The question it asks.*

## What you will be able to do

- *A skill a line.*

## Schedule

Week | Dates | Topic | Reading
--- | --- | --- | ---
1 |  |  |
2 |  |  |
3 |  |  |

## How you are graded

Work | Weight:percent
--- | ---
Two source papers | 30
Midterm | 20
Final project | 35
Participation | 15
Total | =SUM(B1:B4)
{lock=B5}

## Policies

*Late work.*
`;

const ZINE = `---
look: mono
---
# *A TITLE IN CAPITALS* {.title}

*an essay for which zine · by whom · when*

*Where you are, and how often.*

*Who else is there.*

*==The line you want people to remember.==*

*What you notice that others do not.*

*What it says about the place.*

*Your small proposal.*

*A last line.*

*Your initial.* {.right}
`;

const EULOGY = `---
look: serif
---
# For *their name*, *the years* {.title}

*Read by whom · where · when*

*A word of thanks, and something they would have said.*

*Where and when they were born, and how their life began.*

*Who they loved, and the life they made.*

*What they were like, the hard edges too.*

*What you will miss most: one small habit.*

*A last word to them.*
`;

const WEDDING = `# A speech for *the couple* {.title}

*Whose speech · the date · where*

*Who you are, and how you know them, with a short story.*

## How they met

*The story, told as a story.*

## What I have seen since

*Two or three small things that show who they are together.*

## A word to *one of them*

*One kind tease, and one true thing.*

## The toast

*Ask everyone to stand, glasses up.*

**To the couple.** {.center}
`;

const PETITION = `# *What you want, as a headline* {.title}

*A petition to whom · started when*

## We, the undersigned, ask *them* to

1. *The first thing you ask.*
2. *The second.*

## Why

*Who it affects, and how many.*

*The facts, and where they come from.*^[*The source.*]

## Signatures

Name | Postcode | Date:date
--- | --- | ---

*When you will hand it in.*
`;

export const templates = (): Template[] => [
  // The everyday ones.
  { id: 'letter', name: t('A letter'), blurb: t('Your address, the date, the greeting, the point, the sign-off.'), doc: LETTER },
  { id: 'cover', name: t('Cover letter'), blurb: t('Applying for a job: the post, what you have done, why them, in four short paragraphs.'), doc: COVER },
  { id: 'memo', name: t('Memo'), blurb: t('To, from, date and subject; the change in a sentence, why, and what you need back.'), doc: MEMO },
  { id: 'meeting', name: t('Meeting notes'), blurb: t('Agenda, what was said, what was decided, who does what.'), doc: MEETING },
  { id: 'minutes', name: t('Minutes'), blurb: t("A formal meeting: who came, the treasurer's sums, a motion and its vote, the actions."), doc: MINUTES },
  { id: 'resume', name: t('Résumé'), blurb: t('Name and contact, experience, education, skills: a résumé fitted to a page.'), doc: RESUME },
  { id: 'cv', name: t('One-page CV'), blurb: t('A typewriter-set CV: now, before, education, languages and tools.'), doc: CV },
  { id: 'invoice', name: t('Invoice'), blurb: t('Who, what and how much, the sums done in the table; printed as paper to send.'), doc: INVOICE },
  { id: 'contract', name: t('Contract'), blurb: t('A plain-words agreement, with room at the end for each party to sign.'), doc: CONTRACT },
  { id: 'newsletter', name: t('Newsletter'), blurb: t("A block association's month: dates in a table, welcomes, news and thanks."), doc: NEWSLETTER },
  { id: 'recipe', name: t('Recipe'), blurb: t('What you need, in a table that scales from four to six, and how, step by step.'), doc: RECIPE },
  { id: 'faq', name: t('Questions and answers'), blurb: t('The questions people ask, each a heading with its answer under it.'), doc: FAQ },
  { id: 'press', name: t('Press release'), blurb: t('The news in the first line, the detail, a quote, the hours, and who to call.'), doc: PRESS },
  // Writing with a shape of its own.
  { id: 'news', name: t('News article'), blurb: t('A headline, a byline, the story in two columns on paper, and a chart of the figures.'), doc: NEWS },
  { id: 'interview', name: t('Interview'), blurb: t('An introduction, then questions and answers, each speaker named.'), doc: INTERVIEW },
  { id: 'book-review', name: t('Book review'), blurb: t('The book, the stars, what it is about, what worked and what did not.'), doc: BOOK_REVIEW },
  { id: 'music-review', name: t('Music review'), blurb: t('An album: the label and length, the stars, the songs, the best tracks.'), doc: MUSIC },
  { id: 'thesis', name: t('Thesis'), blurb: t('Title page, abstract, chapters with footnotes and a table, and a bibliography, set like a book.'), doc: THESIS },
  { id: 'grant', name: t('Grant proposal'), blurb: t('The ask, the need, the plan, a budget that adds up, and how you will know it worked.'), doc: GRANT },
  { id: 'syllabus', name: t('Syllabus'), blurb: t('A course: when and where, what it is about, the weeks, and grades that add up to 100%.'), doc: SYLLABUS },
  { id: 'complaint', name: t('Formal complaint'), blurb: t('What happened, in order; what you want; and by when, before you go further.'), doc: COMPLAINT },
  { id: 'politician', name: t('Letter to a politician'), blurb: t('Ask your representative for a vote: who you are, why it matters here, and a question.'), doc: POLITICIAN },
  { id: 'love', name: t('Love letter'), blurb: t('Ordinary things, missed: a letter across the distance, in a serif.'), doc: LOVE },
  { id: 'wedding', name: t('Wedding speech'), blurb: t('How they met, what you have seen since, a word to each, and the toast.'), doc: WEDDING },
  { id: 'eulogy', name: t('Eulogy'), blurb: t('A life in a few minutes: where it began, who they were, what you will miss.'), doc: EULOGY },
  { id: 'zine', name: t('Zine essay'), blurb: t('A personal essay for a small magazine, typewritten.'), doc: ZINE },
  { id: 'petition', name: t('Petition'), blurb: t('What you ask, why, and the names of those who agree.'), doc: PETITION },
  { id: 'terms', name: t('Terms of service'), blurb: t("A small business's terms in plain words: booking, prices, keys, what if, ending."), doc: TERMS },
];
