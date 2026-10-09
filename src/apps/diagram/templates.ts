/**
 * Diagram's templates, kind by kind: each kind's blank page first, then a real one or two. Each is canonical
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
title: The new library, 2027
kind: timeline
---
- 2027-01-11: Plans approved
- 2027-02-01: Ground broken
- 2027-05-14: Roof on
- 2027-08-02: Shelves in
- 2027-09-20: Books moved
- 2027-10-04: Doors open
- 2027-02-01 – 2027-08-02: Builders on site
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

/** A kind's blank page: the head naming it, nothing else. */
const blank = (kind: KindId): Template => ({ id: kind, name: t('Blank {kind}', { kind: kindName(kind).toLowerCase() }), blurb: t('An empty {kind}: tap to add the first thing.', { kind: kindName(kind).toLowerCase() }), doc: `---\nkind: ${kind}\n---\n` });

export const templates = (): Template[] => [
  blank('mind'),
  { id: 'mind-launch', name: t('Launch plan'), blurb: t('A launch and everything that branches from it: product, marketing, support.'), doc: LAUNCH },
  { id: 'mind-garden', name: t('The garden this year'), blurb: t('What to grow and the jobs to do, as a mind map.'), doc: GARDEN },
  blank('org'),
  { id: 'org-company', name: t('A small company'), blurb: t('Seven people, who reports to whom, and one dotted line.'), doc: COMPANY },
  blank('family'),
  { id: 'family-hales', name: t('Three generations'), blurb: t('Grandparents, their children and grandchildren, with the years.'), doc: FAMILY },
  blank('lanes'),
  { id: 'lanes-order', name: t('From order to doorstep'), blurb: t('A parcel through a shop, a warehouse and a courier, with one decision.'), doc: ORDER },
  { id: 'lanes-hiring', name: t('Hiring someone'), blurb: t('From the job description to a yes, lane by lane.'), doc: HIRING },
  blank('timeline'),
  { id: 'timeline-computing', name: t('Computing, briefly'), blurb: t('From Lovelace to now, spaced as the years fell, with an era along the foot.'), doc: COMPUTING },
  { id: 'timeline-project', name: t('A building project'), blurb: t('A year of dates, from plans approved to doors open.'), doc: PROJECT },
  blank('venn'),
  { id: 'venn-triangle', name: t('Fast, cheap, good'), blurb: t('Three sets and every overlap, with what belongs where.'), doc: TRIANGLE },
  { id: 'venn-pets', name: t('Cats and dogs'), blurb: t('Two sets and what they share.'), doc: PETS },
  blank('seating'),
  { id: 'seating-wedding', name: t('A wedding dinner'), blurb: t('Four tables and who sits round each.'), doc: WEDDING },
  blank('net'),
  { id: 'net-webapp', name: t('How an app hangs together'), blurb: t('A browser, an API, a database, a cache and a worker, and how they talk.'), doc: WEBAPP },
];
