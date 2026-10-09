/**
 * The Deck's templates: Blank is the app's own page; these are the rest, each a real deck or printed thing
 * in TLO with real words (the studio by the harbour), canonical as the kernel writes it so each round-trips
 * byte for byte (the corpus test holds every one). Three decks, then one of each printed format: a zine of
 * eight pages, a booklet, a brochure, a comic of panels, a poster and the name badges for a meetup.
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';

const slides = (...each: string[]) => each.join('\n\n---\n\n') + '\n';
const headed = (head: Record<string, string>, ...each: string[]) => `---\n${Object.entries(head).map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n${slides(...each)}`;

const TALK = headed(
  { theme: 'midnight' },
  '## :rocket: Small sites, made by hand {.title}\n\n- Mara Quill · Harbor Studio · Portland Web Meetup, 12 March 2027',
  '## :compass: Tonight\n\n- Why a six-page site is the right size\n- How we build one in a fortnight\n- What goes wrong, and what we do about it\n\n> Twenty minutes, then questions. Say the three parts and move on.',
  '## :lightbulb: The right size\n\n- Most small businesses need six pages: home, about, work, prices, contact, news\n- A page a day of writing is a week of words\n- Every page answers one question a customer asked us\n\n> The bakery on Quay Street: six pages, four hundred visitors a week, one phone number.',
  '## :wrench: The fortnight {.two}\n\n- Week one: words first, in a shared text\n- A sketch of every page on paper\n- Photographs taken on a bright morning\n\n|\n\n- Week two: the pages built from the words\n- A read-through with the owner, aloud\n- Live on Friday, with the old address pointing home',
  '## :warning: What goes wrong\n\n- The words arrive late: so we write the first draft ourselves^[Sam drafts from a half-hour conversation; the owner corrects it in an afternoon.]\n- The photographs are dark: so we take them\n- The owner wants a shop: so we add one small table of products, not a platform',
  '## :flag: To close\n\n- Small is a size, not a compromise\n- Words before pictures, pictures before code\n- harborstudio.example — come and say hello',
);

const STATUS = headed(
  { theme: 'boardroom' },
  '## :calendar: Acme Ltd site: status {.title}\n\n- Week of 9 March 2027 · Harbor Studio',
  '## This week and next {.two}\n\n- Done: the six pages sketched and agreed\n- Done: words for home, about and contact\n- Done: hosting set up, the old address kept\n\n|\n\n- Next: words for work, prices and news\n- Next: photographs on Thursday morning, weather allowing\n- Next: first build shown on Friday 20 March\n\n> Left, what shipped; right, what is planned. Keep it to the facts.',
  '## :warning: Risks\n\n- The price list is still being decided by Acme: the prices page waits on it\n- Thursday may rain: Saturday is the fallback for photographs',
  '## :help: Asks\n\n- Dee Okafor to send the final prices by Wednesday 18 March\n- Someone from Acme at the Friday read-through, an hour',
);

const PROPOSAL = headed(
  { theme: 'ivory' },
  '## :building: A new site for Acme Ltd {.title}\n\n- A proposal from Harbor Studio · March 2027',
  '## :target: What you told us\n\n- Customers ring to ask what you charge, and whether you deliver\n- The current site was built in 2019 and nobody can change it\n- You would like to list the twelve products you actually sell',
  '## :lightbulb: What we propose\n\n- Six pages, written with you, in plain words\n- A small shop: twelve products in one table, with a cart\n- A site you can edit yourselves, from a link, in any browser',
  '## :calendar: When\n\n1. March: words and sketches\n2. April: the build, shown to you every Friday\n3. 1 May: live, with the old address pointing home',
  '## :dollar: What it costs\n\n- Design and build: $6,400, half at the start and half when it is live\n- Hosting: $12 a month, paid directly to the host\n- Changes after launch: an hour a month is included for a year',
  '## :heart: Thank you\n\n- Mara Quill · mara@harborstudio.example · 14 Quay Street, Portland',
);

const ZINE = headed(
  { format: 'zine' },
  '## :coffee: Small Joys\n\nIssue one · Spring 2027\n\nEight small pages about the things that make a morning.',
  '## The first cup\n\nThe kettle takes four minutes, and in those four minutes nothing is asked of you. Stand at the window. The harbour is grey, then not.\n\nThe first cup is the only one that is really about the coffee.',
  '## The harbour at six\n\nThe fishing boats go out before the light does. From Quay Street you hear them before you see them: the engines, then a gull, then the water settling back.\n\nBy seven the tourists have the place. At six it is yours.',
  '## A letter\n\nNot an email. A letter, with a stamp, that someone chose a pen for. It can say almost nothing and still mean a great deal.\n\nWrite one this week. The post box on Quay Street is emptied at five.',
  '## The dog\n\nBiscuit is eleven and has opinions about the morning walk. The route is not up for discussion. Neither is the bench by the harbour master\'s office, where we sit for exactly as long as he decides.',
  '## Bread\n\nThe bakery opens at seven and the first loaves are on the counter by ten past. The crust cracks when you press it. Buy the one that is still warm; eat the end of it on the way home.',
  '## Doing nothing\n\nTen minutes with no phone and no plan. Look at the ceiling. Listen to the building. It is harder than it sounds and worth more than it costs.',
  '## :heart: Until next time\n\nMade by hand at Harbor Studio, Portland.\n\nSend us your small joys: hello@harborstudio.example',
);

const BOOKLET = headed(
  { format: 'booklet' },
  '## :compass: How we work\n\nThe Harbor Studio handbook · 2027',
  '## Why this exists\n\nWe are four people and we work with small businesses. Most of what we know is in our heads, and when someone new joins they have to ask. This booklet is the asking, done once.\n\nIt is short because our way of working is short.',
  '## Words first\n\nEvery project begins with a text, not a design. We sit with the owner for half an hour and write down what they say. That draft, corrected by them, becomes the site.\n\nA page is six pages because that is how many questions a customer has.',
  '## Then pictures\n\nPhotographs are taken on a bright morning, by us, with the owner there. Stock pictures are not used. If the shop is small, we photograph the small shop.\n\nIcons stand in where there is nothing to photograph.',
  '## Then the build\n\nThe site is built from the words in a week. We show it on Friday, in a browser, and read every page aloud. What sounds wrong is wrong.\n\nIt goes live the Friday after, with the old address pointing home.',
  '## Afterwards\n\nThe owner can edit the site from a link. We show them how, twice. For a year, an hour of changes a month is included.\n\nWe ask them, after three months, what customers still ring to ask.',
  '## What we do not do\n\n- Platforms, plug-ins and anything that needs updating\n- Sites that cannot be read without a script\n- Work we would not put our name on',
  '## :heart: Contact\n\nHarbor Studio\n\n14 Quay Street, Portland, ME 04101\n\nhello@harborstudio.example',
);

const BROCHURE = headed(
  { format: 'brochure' },
  '## :building: Harbor Studio\n\nSmall sites, made by hand, in Portland.',
  '## What we make\n\nWebsites of six pages for shops, cafés, trades and studios. Written with you, in plain words, with your own photographs.\n\nA small shop where you need one: a dozen products, a cart, no platform.',
  '## How it goes\n\nA half-hour conversation becomes a first draft. A bright morning becomes the photographs. A fortnight becomes the site.\n\nYou see it every Friday and read it aloud with us.',
  '## What it costs\n\n- A six-page site: $6,400\n- A small shop: $1,800 more\n- Hosting: $12 a month, paid to the host\n- Changes: an hour a month, for a year, included',
  '## Who we are\n\nMara Quill writes and designs. Sam Reyes builds. Dee Okafor keeps the books and the calendar. Biscuit greets.',
  '## :mail: Say hello\n\nhello@harborstudio.example\n\n14 Quay Street, Portland, ME 04101\n\nOpen Monday to Friday, nine to five.',
);

const COMIC = headed(
  { format: 'comic' },
  '## :dog: Biscuit Goes Out\n\nA comic in six pages',
  '## Monday\n\n- :dog: Walk? | Seven in the morning.\n- :coffee: After coffee. | He knows what coffee means.\n- :dog: WALK. | He does not care.',
  '## The route\n\n- :map-pin: Left at the gate. Always left. | Right has never been tried.\n- :bird: A gull. | Discussions follow.\n- :home: The harbour master\'s bench. | Here we sit.',
  '## The bench\n\n- :clock: How long do we sit? | As long as he decides.\n- :sun: The sun comes over the warehouses. | Worth it.',
  '## The bakery\n\n- :cart: The bakery is not on the route. | It is now.\n- :smile: The end of the loaf, on the way home. | Shared, under protest.',
  '## Home\n\n- :home: Back by eight. | Tail going.\n- :coffee: Now the second cup. | Nothing is asked of you.\n- :dog: Walk? | Tomorrow.',
  '## :heart: The end\n\nBiscuit is eleven and lives at Harbor Studio.',
);

const POSTER = headed(
  { format: 'poster' },
  '## :music: Open mic night {.title}\n\n- Friday 12 March, 8pm\n- The Anchor, 14 Quay Street\n- Free. Bring a song, a poem, or just your ears.',
);

const BADGES = headed(
  { format: 'badges' },
  '## Mara Quill {.title}\n\n- Harbor Studio · she/her',
  '## Sam Reyes {.title}\n\n- Harbor Studio · he/him',
  '## Dee Okafor {.title}\n\n- Acme Ltd · she/her',
  '## Jonah Price {.title}\n\n- The Anchor · he/him',
  '## Priya Nair {.title}\n\n- Quay Street Bakery · she/her',
  '## Tom Aldous {.title}\n\n- Portland Web Meetup · he/him',
);

export const templates = (): Template[] => [
  { id: 'talk', name: t('A talk'), blurb: t('Title, agenda, three points with notes for the speaker, and a close.'), doc: TALK },
  { id: 'status', name: t('Status update'), blurb: t('Done and next side by side, then risks, then asks.'), doc: STATUS },
  { id: 'proposal', name: t('A proposal'), blurb: t('What you heard, what you propose, when, what it costs.'), doc: PROPOSAL },
  { id: 'zine', name: t('Zine'), blurb: t('Eight small pages from one sheet of paper: print, fold and cut, or read it by tapping on a phone.'), doc: ZINE },
  { id: 'booklet', name: t('Booklet'), blurb: t('A booklet of half-letter pages, eight to twenty, laid out to print, nest and fold.'), doc: BOOKLET },
  { id: 'brochure', name: t('Brochure'), blurb: t('A trifold brochure: six panels on two sides of a sheet, each where the fold needs it.'), doc: BROCHURE },
  { id: 'comic', name: t('Comic'), blurb: t('A mini comic: panels with a picture, a speech bubble and a caption, folded from one sheet.'), doc: COMIC },
  { id: 'poster', name: t('Poster'), blurb: t('A poster or flyer: a headline and a few lines, as big as one page allows.'), doc: POSTER },
  { id: 'badges', name: t('Name badges'), blurb: t('Name badges for a meetup, one page per person, six to a sheet, ready to cut.'), doc: BADGES },
];
