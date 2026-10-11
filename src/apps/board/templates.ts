/**
 * Board's templates: Blank is the app's own page (To do, Doing, Done); these are the rest, each a real board
 * with real cards, its own title, and what a board has where it fits: a color for each stage, a limit on what
 * a stage holds, a checklist on a card, a link or a note in a card's words, and the stages as rows. The
 * everyday ones come first (a project, a week, a move), then work (hiring, a content calendar, an editorial
 * board, sales, bugs), then the school and the street. Each is canonical TLO, so it round-trips byte for byte
 * (the corpus test holds every one); what each is for is in templates.md.
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';

const PROJECT = `---
title: The Harbor Studio website
---
## To do {color=b}

- Write the words for the **About** page
  - [x] Interview Mara about the first ten years
  - [ ] First draft, about 400 words
  - [ ] Dee reads it
- Photograph the studio on a bright morning
- Set up the contact form

## Doing {limit=2 color=g}

- Build the home page
  - [x] Layout
  - [x] Header and footer
  - [ ] The gallery of twelve projects
- Choose the typeface: a serif or a sans

## Waiting on {color=y}

- Pellow & Sons to send the logo as a vector file

## Done {color=p}

- Pick the domain name
- Sign off on the budget: $4,800, live by Monday, November 2
`;

const WEEK = `---
title: This week
---
## This week {limit=5 color=s}

- Book the furnace tune-up before the cold comes
- Return the library books, due Thursday the 15th
- Call Grandma on Saturday: she is **90**
- Find a present for Grandma
  - [x] Ask Sam what she said she wanted
  - [ ] The garden center on Friday

## Today {limit=3 color=o}

- Pay the water bill, $148
- Collect the dry cleaning, ticket 4471

## Waiting on {color=y}

- The plumber’s quote for the bathroom faucet
- A refund from the airline, $212

## Done {color=g}

- Renew the car insurance
- Dentist, 8:40 on Tuesday
`;

const MOVING = `---
title: Moving to Astoria
---
## Before the move {color=b}

- Give notice on the apartment by Wednesday, October 21
- Book the truck for 8 am on Saturday, November 21
  - [x] Three quotes
  - [x] Queensboro Movers, $640, $100 paid
  - [ ] A parking permit for the truck, from the city
- Forward the mail for twelve months
- Measure the new bedroom door for the dresser

## Packing {limit=3 color=y}

- The kitchen
  - [x] Plates and bowls
  - [ ] Glasses, wrapped in dish towels
  - [ ] The pans, last
- Books: eleven boxes, labeled by room

## Moving day {color=o}

- Meter readings at both apartments, photographed
- Keys to the super by noon
- Coffee maker, mugs, coffee and the toilet paper in the car, not the truck

## Settled in {color=g}

- Find a doctor on Steinway Street
- New address to the bank, the DMV and work
- Internet in on Tuesday, November 24^[The router goes by the front window; the jack is in the hall.]
`;

const HIRING = `---
title: Hiring a designer
---
## Applied {color=b}

- Ada Okafor, designer, eight years in packaging
- Ben Ruiz, designer, from the portfolio review
- Caro Lindqvist, illustrator, recommended by Dee

## Phone call {limit=3 color=s}

- Dev Patel, designer
  - [x] Call on Tuesday, October 13, 10 am
  - [ ] Send the three questions

## Studio visit {limit=2 color=o}

- Eli Moss, illustrator
  - [x] Show the portfolio
  - [ ] Lunch with the team on Friday
  - [ ] Two references

## Offer {limit=1 color=g}

- Fay Adeyemi, designer: $72,000, starting Monday, January 4, 2027

## Not this time {color=r}

- Gus Hale: wants a remote role, and we are in the studio
`;

const CONTENT = `---
title: Crumb & Co. posts, October
---
## Ideas {color=p}

- How the sourdough starter is fed, in a minute of film
- Meet Ilse, who comes in at 4 am
- Five things to do with yesterday’s loaf

## Drafted {limit=3 color=y}

- The new rye, with the farm it comes from
  - [x] Words
  - [x] Photos of the field
  - [ ] Ask the farm to share it

## Scheduled {color=b}

- Friday, October 16, 8 am: the pumpkin loaf is back
- Tuesday, October 20, noon: the after-school baking class, $15 a child

## Posted {color=g}

- Saturday, October 10: **2,140** views of the croissant lamination
- Monday, October 5: the new hours
`;

const EDITORIAL = `---
title: The Long Field, winter 2026
---
## Pitched {color=s}

- A year of the river, by the man who rows it every morning
- The last hand-set print shop in the county
- Recipes from the community garden: winter roots

## Commissioned {limit=4 color=b}

- Sheep and the stone wall, 2,500 words, Nell Pryce
  - [x] Contract sent
  - [ ] Photographer booked
- The bus that still stops at every town, 1,800 words, Tom Ashby

## With the editor {limit=3 color=o}

- The orchard that came back, 3,000 words, Ruth Okonjo
  - [x] Structural edit
  - [ ] Fact-check the dates
  - [ ] Pictures chosen

## Copy-edited {color=p}

- Letters page: nine letters, cut to fit
- The cover essay, *On fog*, by Ivor Lane

## In the issue {color=g}

- The contents page and the editor’s note
- Out on Thursday, December 3; to the printer on November 16
`;

const SALES = `---
title: Calder Print, sales
---
## Leads {color=s}

- Marsh Lane Elementary: flyers for the holiday fair
- Hobbs Cycles: a spring catalog, 24 pages
- Firth Brewery: labels for a new pale ale

## Talking {limit=4 color=b}

- Calder Bakery: 2,000 menus, **$1,180**^[Two-sided on heavy uncoated card, folded to 5.5 × 8.5 inches; delivered in two weeks.]
  - [x] Samples mailed
  - [ ] Visit on Wednesday, October 14
- The Kestrel Hotel: room cards and a new letterhead

## Quote sent {limit=5 color=o}

- Northgate Theater: posters for the holiday show, 300 at 18 × 24 inches, $640
- Ward & Lyle, attorneys: business cards for twelve, $290

## Won {color=g}

- Harrow Books: 500 bookmarks, $185, paid
- St. Anne’s Hospice: the gala program, $2,350

## Lost {color=r}

- Penny’s Café: went with an online printer on price
`;

const BUGS = `---
title: Fieldnote 2.0.1
---
## Reported {color=r}

- Dark mode: the date picker is white on white
- Export to PDF cuts the last line of a long page
- A note shared by link opens empty on Android 15

## Confirmed {limit=5 color=o}

- Notes vanish when the phone locks mid-sentence
  - [x] Seen on an iPhone 15 and an iPhone 13
  - [ ] Find the build that broke it
- Search misses words with accents: *café*, *naïve*

## Fixing {limit=2 color=b}

- Sync stalls on attachments over 20 MB (Priya)
  - [x] Upload in pieces
  - [ ] Resume after the network drops

## In review {limit=2 color=p}

- The tag list scrolls back to the top after a delete (Tom)

## Fixed {color=g}

- The reminder fires an hour late after the clocks change
- Crash on opening a note with an empty title
`;

const CLASSROOM = `---
title: Grade 8 science fair projects
---
## Choosing a question {color=s}

- Grace and Noor: does music change how fast bean sprouts grow?
- Kai: which ball bounces highest when it is cold?

## Experimenting {limit=4 color=y}

- Amir and Lucy: which paper towel soaks up the most?
  - [x] Five brands bought
  - [x] Method written
  - [ ] Three repeats of each
- Theo and Jun: how far does a paper plane fly with a paperclip on the nose?

## Writing up {limit=4 color=o}

- Maya: do plants grow toward the color of the light?
  - [x] Results table
  - [ ] Bar chart
  - [ ] Conclusion, one paragraph

## Ready for the fair {color=g}

- Femi and Rosa: the fastest way to cool a cup of tea
- Isla: how much sugar is in a can of soda? (seven teaspoons)
`;

const MUTUAL = `---
title: Elm Road mutual aid
look: rows
---
## Needs {color=r}

- Groceries for Mrs. Clarke at no. 14, Tuesday mornings
- A ride to the hospital for Dennis, Thursday, October 22, at 9:30
- Someone to walk Biscuit while Jo’s ankle mends

## Offers {color=b}

- Ana, no. 31: a car on weekdays after 3 pm
- Pete: can fix a bike or a leaky faucet
- The Hendersons: soup on Sundays for four more

## Matched {limit=5 color=y}

- Mrs. Clarke’s groceries: Ana from this week
  - [x] Numbers swapped
  - [ ] The first list on Tuesday
- Biscuit: Pete and his daughter, mornings and evenings

## Done {color=g}

- The fence at no. 7 put back up after the storm
- Twelve bags of clothes to the refugee drop-in on Mill Street
`;

export const templates = (): Template[] => [
  { id: 'project', name: t('A project'), blurb: t('A small studio’s website: to do, doing with a limit, waiting on, and done, with checklists on the cards.'), doc: PROJECT },
  { id: 'week', name: t('A week'), blurb: t('A week of errands: what is for this week, what is for today, what is waiting on someone else.'), doc: WEEK },
  { id: 'moving', name: t('A move'), blurb: t('A move across town by stage, from giving notice to the internet going in.'), doc: MOVING },
  { id: 'hiring', name: t('Hiring'), blurb: t('Candidates for a design job from the first application to the offer, a stage for each step.'), doc: HIRING },
  { id: 'content', name: t('Content calendar'), blurb: t('A bakery’s posts for October: ideas, drafts, what goes out when, and how the last ones did.'), doc: CONTENT },
  { id: 'editorial', name: t('Editorial board'), blurb: t('A quarterly magazine’s winter issue, from the pitch to the page, each piece with its writer and length.'), doc: EDITORIAL },
  { id: 'sales', name: t('Sales pipeline'), blurb: t('A print shop’s customers from the first lead to won or lost, each with the job and its price.'), doc: SALES },
  { id: 'bugs', name: t('Bug triage'), blurb: t('The bugs for an app’s next release, from reported to fixed, with a limit on what is being fixed at once.'), doc: BUGS },
  { id: 'classroom', name: t('Class projects'), blurb: t('A class’s science fair projects, from choosing the question to ready for the fair.'), doc: CLASSROOM },
  { id: 'mutual-aid', name: t('Mutual aid'), blurb: t('A street’s needs and offers, matched and done, with the stages as rows.'), doc: MUTUAL },
];
