/**
 * Diagram's templates, kind by kind: each kind's blank page first, then two to four real ones. Each is canonical
 * TLO, as the kernel writes it, so it round-trips byte for byte (the corpus test holds every template).
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';
import type { KindId } from './model.ts';
import { kindName } from './kinds.ts';

const LAUNCH = `---
title: Launch plan
kind: mind
---
- Launch :rocket:
  - Product
    - Pricing
    - Onboarding
    - The first ten customers
  - Marketing
    - Press
    - Social
    - A launch-day post
  - Support
    - Help pages
    - Who answers, and when

~ A launch-day post -> Help pages: links to
`;

const GARDEN = `---
title: The garden this year
kind: mind
---
- The garden
  - Vegetables
    - Tomatoes against the south wall
    - Beans up the old trellis
    - Salad in the shade
  - Flowers
    - Sweet peas for cutting
    - Dahlias
  - Jobs
    - Fix the water butt
    - Compost bay
    - A path to the shed
`;

const COMPANY = `---
title: Who reports to whom
kind: org
---
- Ada Diaz | Chief executive
  - Ben Okoro | Engineering
    - Cy Lund | Platform
    - Di Shah | Apps
  - Eve Marsh | Design
  - Flo Reyes | Sales
    - Gus Patel | Accounts

~ Cy Lund -- Eve Marsh: design partner
`;

const FAMILY = `---
title: The Hales
kind: family
---
- Rose + Albert Hale | m. 1948
  - Helen + Tom Price | m. 1975
    - Paul | b. 1978
    - Sam | b. 1981
  - David Hale | b. 1952
    - Ada | b. 1985
`;

const ORDER = `---
title: From order to doorstep
kind: lanes
---
- Customer: Places an order
- Shop: Checks the stock
- Shop: In stock?
- Warehouse: Picks and packs it
- Courier: Collects the parcel
- Courier: Delivers it
- Customer: Signs for it
`;

const HIRING = `---
title: Hiring someone
kind: lanes
---
- Manager: Writes the job description
- People team: Posts the job
- Candidate: Applies
- People team: Shortlists five
- Manager: Interviews
- Manager: The right one?
- People team: Makes the offer
- Candidate: Says yes
`;

const COMPUTING = `---
title: Computing, briefly
kind: timeline
---
- 1843: Lovelace publishes her notes
- 1936: Turing describes his machine
- 1945: ENIAC is switched on
- 1969: The first ARPANET message
- 1976: The Apple I
- 1989: The web is proposed
- 2007: The phone becomes a computer
- 2022: Everyone talks to a machine
- 1969–2007: The network grows
`;

const PROJECT = `---
title: The new library, 2026
kind: timeline
---
- 2026-02-09: Plans approved
- 2026-03-02: Ground broken
- 2026-06-15: Roof on
- 2026-09-07: Shelves in
- 2026-10-19: Books moved
- 2026-11-02: Doors open
- 2026-03-02 – 2026-09-07: Builders on site
`;

const TRIANGLE = `---
title: Fast, cheap, good
kind: venn
---
- Fast: sprinting, espresso
- Cheap: instant noodles, walking
- Good: slow cooking
- Fast & Cheap: fast food
- Cheap & Good: home cooking
- Fast & Good: a great takeaway
- Fast & Cheap & Good: toast
`;

const PETS = `---
title: Cats and dogs
kind: venn
---
- Cats: purr, climb curtains, use a litter tray
- Dogs: fetch, need walks, guard the house
- Cats & Dogs: shed on the sofa, love a warm spot, wake you at six
`;

const WEDDING = `---
title: Jo and Sam's wedding dinner
kind: seating
---
- Top table: Jo, Sam, Maria, Dev, Lin, Tom
- Table 2: Aunt Pat, Uncle Ray, Gran, Cousin Amy, Ben
- Table 3: Priya, Marco, Hannah, Leo, Zoe, Kit
- Table 4: Mr and Mrs Okafor, Ellie, Josh, Ruth
`;

const WEBAPP = `---
title: How the app hangs together
kind: net
---
- Monitoring

~ Browser -> API: requests
~ API -> Database: queries
~ API -> Cache
~ Worker -> Database
~ API -- Worker: queue
`;

const LISBON = `---
title: Moving to Lisbon
kind: mind
---
- Lisbon by March :plane:
  - Paperwork
    - A NIF tax number
    - Visa appointment, 14 January
    - Register with the parish
  - A flat
    - Alfama or Campo de Ourique
    - Under €1,400 a month
    - Viewings from 2 February
  - Work
    - Tell the London office by 30 November
    - A desk at a coworking space
  - Life
    - Portuguese lessons, twice a week
    - A bank account
    - Find a doctor

~ Register with the parish -> Find a doctor: needed first
~ A NIF tax number -> A bank account: needed first
`;

const REVISION = `---
title: Revising for the biology mock
kind: mind
---
- Biology mock, 8 December :graduation:
  - Cells
    - Organelles and what they do
    - Mitosis
    - Diffusion and osmosis
  - The body
    - The heart and blood
    - Enzymes and digestion
    - Hormones
  - Ecology
    - Food webs
    - The carbon cycle
  - How
    - A past paper every Sunday
    - Flashcards on the bus
    - Ask Ms Shah about osmosis

~ Diffusion and osmosis -> Ask Ms Shah about osmosis
`;

const SCHOOL = `---
title: Hillside Primary staff
kind: org
---
- Joan Achebe | Head teacher
  - Tom Reilly | Deputy head
    - Priya Nair | Year 5
    - Owen Price | Year 6
  - Laura Kim | Early years
    - Ana Silva | Reception
    - Dan Hughes | Year 1
  - Grace Obi | Business manager
    - Rob Lane | Site manager

~ Priya Nair -- Dan Hughes: maths leads
`;

const KITCHEN = `---
title: The kitchen at Marlow's
kind: org
---
- Nadia Haddad | Head chef
  - Luca Bianchi | Sous chef
    - Sam Wright | Sauce
    - Mei Chen | Fish
    - Jonah Ellis | Garnish
    - Rosa Duarte | Pastry
  - Kemi Adeyemi | Restaurant manager
    - Theo Marsh | Head waiter
    - Ivy Cole | Bar

~ Rosa Duarte -- Ivy Cole: dessert wines
`;

const BRONTES = `---
title: The Brontës of Haworth
kind: family
---
- Patrick Brontë + Maria Branwell | m. 1812
  - Maria | 1814–1825
  - Elizabeth | 1815–1825
  - Charlotte + Arthur Bell Nicholls | m. 1854
  - Branwell | 1817–1848
  - Emily | 1818–1848
  - Anne | 1820–1849
- Elizabeth Branwell | 1776–1842

~ Elizabeth Branwell -- Patrick Brontë + Maria Branwell: kept house from 1821
`;

const MORENOS = `---
title: The Morenos
kind: family
---
- Luis + Carmen Moreno | m. 1971
  - Elena + Mark Davies | m. 1998
    - Sofia | b. 2001
    - Leo | b. 2004
  - Javier + Amira Moreno | m. 2003
    - Nadia | b. 2008
    - Omar | b. 2011
  - Pilar Moreno | b. 1979
    - Rosa | b. 2015

~ Pilar Moreno -- Sofia: godmother
`;

const EXPENSES = `---
title: An expenses claim
kind: lanes
---
- Employee: Photographs the receipts
- Employee: Fills in the claim
- Manager: Within the policy?
- Manager: Approves it
- Finance: Checks the receipts
- Finance: Pays it with the next salary
- Employee: Sees it on the payslip
`;

const APOLLO = `---
title: Apollo 11, eight days in July
kind: timeline
---
- 1969-07-16: Launch from Florida
- 1969-07-19: Into orbit round the Moon
- 1969-07-20: Eagle lands
- 1969-07-21: Armstrong steps out
- 1969-07-22: Home from the Moon
- 1969-07-24: Splashdown in the Pacific
- 1969-07-16 – 1969-07-24: The mission
`;

const SKILLS = `---
title: Who can do what
kind: venn
---
- Design: Mira, Jonas
- Writing: Esther
- Code: Ravi, Tom
- Design & Writing: Ines
- Design & Code: Kai
- Writing & Code: Ola
- Design & Writing & Code: Bea
`;

const GAMES = `---
title: Board game night, 14 November
kind: seating
---
- Catan: Ruth, Ollie, Priya, Ade
- Codenames: Jess, Tom, Mo, Sara, Fin, Lou
- Ticket to Ride: Hana, Ben, Iris
- Chess: Gus, Wren
`;

const CLASS = `---
title: Class 4B, autumn term
kind: seating
---
- Blue table: Amara, Jack, Zainab, Leo, Ella
- Green table: Noah, Maya, Isaac, Ruby, Kofi
- Red table: Freya, Arjun, Lily, Sam, Hana
- Yellow table: Oscar, Chloe, Yusuf, Grace, Theo
- Reading corner: Mrs Patel, Evie
`;

const WATER = `---
title: The water cycle
kind: net
---
- Sea :fish:
- Clouds :cloud:
- Mountains :mountain:
- Rivers
- Groundwater
- Plants :leaf:

~ Sea -> Clouds: evaporation
~ Clouds -> Mountains: rain and snow
~ Mountains -> Rivers: meltwater
~ Rivers -> Sea: flow
~ Rivers -> Groundwater: soaks in
~ Groundwater -> Plants: roots
~ Plants -> Clouds: transpiration
`;

const HOUSE = `---
title: The house network
kind: net
---
- Router :server:
- Laptop :laptop:
- Phone :phone2:
- Printer :printer:
- Television :film:
- Doorbell :bell:

~ Fibre line -> Router
~ Router -- Laptop: wifi
~ Router -- Phone: wifi
~ Router -- Printer: wifi
~ Router -- Television: cable
~ Router -- Doorbell: wifi
~ Laptop -> Printer: prints
`;

/** A kind's blank page: the head naming it, nothing else. */
const blank = (kind: KindId): Template => ({ id: kind, name: t('Blank {kind}', { kind: kindName(kind).toLowerCase() }), blurb: t('An empty {kind}: tap to add the first thing.', { kind: kindName(kind).toLowerCase() }), doc: `---\nkind: ${kind}\n---\n` });

export const templates = (): Template[] => [
  blank('mind'),
  { id: 'mind-launch', name: t('Launch plan'), blurb: t('A launch and everything that branches from it: product, marketing, support.'), doc: LAUNCH },
  { id: 'mind-garden', name: t('The garden this year'), blurb: t('What to grow and the jobs to do, as a mind map.'), doc: GARDEN },
  { id: 'mind-move', name: t('Moving abroad'), blurb: t('A move to Lisbon by March: papers, a flat, work and life, and what has to come first.'), doc: LISBON },
  { id: 'mind-revision', name: t('Revising for an exam'), blurb: t('A biology mock in December, topic by topic, and how the revising gets done.'), doc: REVISION },
  blank('org'),
  { id: 'org-company', name: t('A small company'), blurb: t('Seven people, who reports to whom, and one dotted line.'), doc: COMPANY },
  { id: 'org-school', name: t('A primary school'), blurb: t('A head teacher, her deputies, the class teachers and the site manager.'), doc: SCHOOL },
  { id: 'org-kitchen', name: t('A restaurant kitchen'), blurb: t('The brigade under the head chef, front of house beside it.'), doc: KITCHEN },
  blank('family'),
  { id: 'family-hales', name: t('Three generations'), blurb: t('Grandparents, their children and grandchildren, with the years.'), doc: FAMILY },
  { id: 'family-brontes', name: t('The Brontës'), blurb: t('Patrick and Maria, their six children with the years they lived, and the aunt who raised them.'), doc: BRONTES },
  { id: 'family-morenos', name: t('A family with a godmother'), blurb: t('Three generations of the Morenos, and a dotted line to a godchild.'), doc: MORENOS },
  blank('lanes'),
  { id: 'lanes-order', name: t('From order to doorstep'), blurb: t('A parcel through a shop, a warehouse and a courier, with one decision.'), doc: ORDER },
  { id: 'lanes-hiring', name: t('Hiring someone'), blurb: t('From the job description to a yes, lane by lane.'), doc: HIRING },
  { id: 'lanes-expenses', name: t('An expenses claim'), blurb: t('From a photo of the receipt to the payslip, past a manager and finance.'), doc: EXPENSES },
  blank('timeline'),
  { id: 'timeline-computing', name: t('Computing, briefly'), blurb: t('From Lovelace to now, spaced as the years fell, with an era along the foot.'), doc: COMPUTING },
  { id: 'timeline-project', name: t('A building project'), blurb: t('A year of dates, from plans approved to doors open.'), doc: PROJECT },
  { id: 'timeline-apollo', name: t('Apollo 11'), blurb: t('Eight days in July 1969, day by day, from launch to splashdown.'), doc: APOLLO },
  blank('venn'),
  { id: 'venn-triangle', name: t('Fast, cheap, good'), blurb: t('Three sets and every overlap, with what belongs where.'), doc: TRIANGLE },
  { id: 'venn-pets', name: t('Cats and dogs'), blurb: t('Two sets and what they share.'), doc: PETS },
  { id: 'venn-skills', name: t('Who can do what'), blurb: t('A team by its skills: design, writing and code, and who does more than one.'), doc: SKILLS },
  blank('seating'),
  { id: 'seating-wedding', name: t('A wedding dinner'), blurb: t('Four tables and who sits round each.'), doc: WEDDING },
  { id: 'seating-games', name: t('Board game night'), blurb: t('Four games, a table each, and who is playing what.'), doc: GAMES },
  { id: 'seating-class', name: t('A classroom'), blurb: t('Class 4B at four tables by colour, and the reading corner.'), doc: CLASS },
  blank('net'),
  { id: 'net-webapp', name: t('How an app hangs together'), blurb: t('A browser, an API, a database, a cache and a worker, and how they talk.'), doc: WEBAPP },
  { id: 'net-water', name: t('The water cycle'), blurb: t('Sea, clouds, mountains, rivers, groundwater and plants, and how the water moves between them.'), doc: WATER },
  { id: 'net-house', name: t('The house network'), blurb: t('A router and everything on it: laptop, phone, printer, television and doorbell.'), doc: HOUSE },
];
