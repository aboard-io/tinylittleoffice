/**
 * The Deck's templates: Blank is the app's own page; these are the rest, each a real deck or printed thing
 * in TLO with real words, canonical as the kernel writes it so each round-trips byte for byte (the corpus
 * test holds every one). The decks people make most come first (a talk, a status, a proposal, a pitch, a
 * lesson), then the occasions (a conference talk with its notes, a quarterly review, a workshop, a launch,
 * a town hall, a quiz, a wedding); then the printed things, two of each format. Every theme
 * a deck uses is a different one where it can be, so the list shows what the Look menu does. One line a
 * template on what it is for: templates.md.
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';

const slides = (...each: string[]) => each.join('\n\n---\n\n') + '\n';
const headed = (head: Record<string, string>, ...each: string[]) =>
  `---\n${Object.entries(head)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')}\n---\n${slides(...each)}`;

const TALK = headed(
  { theme: 'midnight' },
  '## :rocket: Small sites, made by hand {.title}\n\n- Mara Quill · Harbor Studio · Portland Web Meetup, November 12, 2026',
  '## :compass: Tonight\n\n- Why a six-page site is the right size\n- How we build one in two weeks\n- What goes wrong, and what we do about it\n\n> Twenty minutes, then questions. Say the three parts and move on.',
  '## :lightbulb: The right size\n\n- Most small businesses need six pages: home, about, work, prices, contact, news\n- A page a day of writing is a week of words\n- Every page answers one question a customer asked us\n\n> The bakery on Quay Street: six pages, four hundred visitors a week, one phone number.',
  '## :wrench: The two weeks {.two}\n\n- Week one: words first, in a shared text\n- A sketch of every page on paper\n- Photographs taken on a bright morning\n\n|\n\n- Week two: the pages built from the words\n- A read-through with the owner, aloud\n- Live on Friday, with the old address pointing home',
  '## :warning: What goes wrong\n\n- The words arrive late: so we write the first draft ourselves^[Sam drafts from a half-hour conversation; the owner corrects it in an afternoon.]\n- The photographs are dark: so we take them\n- The owner wants an online store: so we add one small table of products, not a platform',
  '## :flag: To close\n\n- Small is a size, not a compromise\n- Words before pictures, pictures before code\n- harborstudio.example — come and say hello',
);

const STATUS = headed(
  { theme: 'boardroom' },
  '## :calendar: Acme Inc. site: status {.title}\n\n- Week of November 2, 2026 · Harbor Studio',
  '## This week and next {.two}\n\n- Done: the six pages sketched and agreed\n- Done: words for home, about and contact\n- Done: hosting set up, the old address kept\n\n|\n\n- Next: words for work, prices and news\n- Next: photographs on Thursday morning, weather allowing\n- Next: first build shown on Friday, November 13\n\n> Left, what shipped; right, what is planned. Keep it to the facts.',
  '## :warning: Risks\n\n- The price list is still being decided by Acme: the prices page waits on it\n- Thursday may rain: Saturday is the fallback for photographs',
  '## :help: Asks\n\n- Dee Okafor to send the final prices by Wednesday, November 11\n- Someone from Acme at the Friday read-through, an hour',
);

const PROPOSAL = headed(
  { theme: 'ivory' },
  '## :building: A new site for Acme Inc. {.title}\n\n- A proposal from Harbor Studio · October 2026',
  '## :target: What you told us\n\n- Customers call to ask what you charge, and whether you deliver\n- The current site was built in 2019 and nobody can change it\n- You would like to list the twelve products you actually sell',
  '## :lightbulb: What we propose\n\n- Six pages, written with you, in plain words\n- A small online store: twelve products in one table, with a cart\n- A site you can edit yourselves, from a link, in any browser',
  '## :calendar: When\n\n1. October: words and sketches\n2. November: the build, shown to you every Friday\n3. December 1: live, with the old address pointing home',
  '## :dollar: What it costs\n\n- Design and build: $6,400, half at the start and half when it is live\n- Hosting: $12 a month, paid directly to the host\n- Changes after launch: an hour a month is included for a year',
  '## :heart: Thank you\n\n- Mara Quill · mara@harborstudio.example · 14 Quay Street, Portland',
);

const ZINE = headed(
  { format: 'zine' },
  '## :coffee: Small Joys\n\nIssue one · Fall 2026\n\nEight small pages about the things that make a morning.',
  '## The first cup\n\nThe kettle takes four minutes, and in those four minutes nothing is asked of you. Stand at the window. The harbor is gray, then not.\n\nThe first cup is the only one that is really about the coffee.',
  '## The harbor at six\n\nThe fishing boats go out before the light does. From Quay Street you hear them before you see them: the engines, then a gull, then the water settling back.\n\nBy seven the tourists have the place. At six it is yours.',
  '## A letter\n\nNot an email. A letter, with a stamp, that someone chose a pen for. It can say almost nothing and still mean a great deal.\n\nWrite one this week. The mailbox on Quay Street is picked up at five.',
  "## The dog\n\nBiscuit is eleven and has opinions about the morning walk. The route is not up for discussion. Neither is the bench by the harbor master's office, where we sit for exactly as long as he decides.",
  '## Bread\n\nThe bakery opens at seven and the first loaves are on the counter by ten past. The crust cracks when you press it. Buy the one that is still warm; eat the end of it on the way home.',
  '## Doing nothing\n\nTen minutes with no phone and no plan. Look at the ceiling. Listen to the building. It is harder than it sounds and worth more than it costs.',
  '## :heart: Until next time\n\nMade by hand at Harbor Studio, Portland.\n\nSend us your small joys: hello@harborstudio.example',
);

const BOOKLET = headed(
  { format: 'booklet' },
  '## :compass: How we work\n\nThe Harbor Studio handbook · 2026',
  '## Why this exists\n\nWe are four people and we work with small businesses. Most of what we know is in our heads, and when someone new joins they have to ask. This booklet is the asking, done once.\n\nIt is short because our way of working is short.',
  '## Words first\n\nEvery project begins with a text, not a design. We sit with the owner for half an hour and write down what they say. That draft, corrected by them, becomes the site.\n\nA page is six pages because that is how many questions a customer has.',
  '## Then pictures\n\nPhotographs are taken on a bright morning, by us, with the owner there. Stock pictures are not used. If the store is small, we photograph the small store.\n\nIcons stand in where there is nothing to photograph.',
  '## Then the build\n\nThe site is built from the words in a week. We show it on Friday, in a browser, and read every page aloud. What sounds wrong is wrong.\n\nIt goes live the Friday after, with the old address pointing home.',
  '## Afterwards\n\nThe owner can edit the site from a link. We show them how, twice. For a year, an hour of changes a month is included.\n\nWe ask them, after three months, what customers still call to ask.',
  '## What we do not do\n\n- Platforms, plug-ins and anything that needs updating\n- Sites that cannot be read without a script\n- Work we would not put our name on',
  '## :heart: Contact\n\nHarbor Studio\n\n14 Quay Street, Portland, ME 04101\n\nhello@harborstudio.example',
);

const BROCHURE = headed(
  { format: 'brochure' },
  '## :building: Harbor Studio\n\nSmall sites, made by hand, in Portland.',
  '## What we make\n\nWebsites of six pages for shops, cafés, trades and studios. Written with you, in plain words, with your own photographs.\n\nA small online store where you need one: a dozen products, a cart, no platform.',
  '## How it goes\n\nA half-hour conversation becomes a first draft. A bright morning becomes the photographs. Two weeks become the site.\n\nYou see it every Friday and read it aloud with us.',
  '## What it costs\n\n- A six-page site: $6,400\n- A small online store: $1,800 more\n- Hosting: $12 a month, paid to the host\n- Changes: an hour a month, for a year, included',
  '## Who we are\n\nMara Quill writes and designs. Sam Reyes builds. Dee Okafor keeps the books and the calendar. Biscuit greets.',
  '## :mail: Say hello\n\nhello@harborstudio.example\n\n14 Quay Street, Portland, ME 04101\n\nOpen Monday to Friday, nine to five.',
);

const COMIC = headed(
  { format: 'comic' },
  '## :dog: Biscuit Goes Out\n\nA comic in six pages',
  '## Monday\n\n- :dog: Walk? | Seven in the morning.\n- :coffee: After coffee. | He knows what coffee means.\n- :dog: WALK. | He does not care.',
  "## The route\n\n- :map-pin: Left at the gate. Always left. | Right has never been tried.\n- :bird: A gull. | Discussions follow.\n- :home: The harbor master's bench. | Here we sit.",
  '## The bench\n\n- :clock: How long do we sit? | As long as he decides.\n- :sun: The sun comes over the warehouses. | Worth it.',
  '## The bakery\n\n- :cart: The bakery is not on the route. | It is now.\n- :smile: The end of the loaf, on the way home. | Shared, under protest.',
  '## Home\n\n- :home: Back by eight. | Tail going.\n- :coffee: Now the second cup. | Nothing is asked of you.\n- :dog: Walk? | Tomorrow.',
  '## :heart: The end\n\nBiscuit is eleven and lives at Harbor Studio.',
);

const POSTER = headed({ format: 'poster' }, '## :music: Open mic night {.title}\n\n- Friday, November 13, 8 pm\n- The Anchor, 14 Quay Street\n- Free. Bring a song, a poem, or just your ears.');

const BADGES = headed(
  { format: 'badges' },
  '## Mara Quill {.title}\n\n- Harbor Studio · she/her',
  '## Sam Reyes {.title}\n\n- Harbor Studio · he/him',
  '## Dee Okafor {.title}\n\n- Acme Inc. · she/her',
  '## Jonah Price {.title}\n\n- The Anchor · he/him',
  '## Priya Nair {.title}\n\n- Quay Street Bakery · she/her',
  '## Tom Aldous {.title}\n\n- Portland Web Meetup · he/him',
);

/* ---------- more decks ---------- */

const PITCH = headed(
  { theme: 'graphite', transition: 'slide' },
  '## :truck: Loop {.title}\n\n- Laundry picked up from the lobby, back folded by six\n- Seed round · October 2026 · Priya Raman and Dev Okonkwo',
  '## :frown: The problem\n\n- Four in ten renters in Columbus have no washer at home^[Columbus Housing Survey, 2025: 41% of rented apartments have no machine in the unit.]\n- The nearest laundromat is a bus ride with a bag\n- A Saturday a week, gone\n\n> Start with Maria: two children, a third-floor walk-up, four loads every Saturday.',
  '## :lightbulb: What Loop does {.two}\n\n- A locker in the lobby\n- Drop a bag before nine\n- Back the same evening, folded\n\n|\n\n- $1.60 a pound, no subscription\n- Paid by the building, or by the tenant\n- Tracked by text: picked up, washed, back',
  '## :compass: How it works\n\n1. The tenant drops a bag in the Loop locker\n2. A driver collects every locker on a morning loop\n3. The laundry is washed at our plant on Kenny Road\n4. The same driver brings it back by six',
  '## :trending-up: Traction\n\nMonth | Bags a month\n--- | ---\nMay | 410\nJun | 690\nJul | 1120\nAug | 1730\nSep | 2480\n{chart=line}\n\n> 17 buildings, 2,480 bags in September. Every building that tried it kept it.',
  '## :dollar: The business {.two}\n\n- $18 a bag on average\n- $7.40 of it is wash, fold and driving\n- A building pays for itself at 60 bags a month\n\n|\n\n- Buildings sign for a year\n- Landlords add it as an amenity\n- Two building managers have already referred us on',
  '## :users: Who we are\n\n- Priya Raman ran operations for a 40-van courier in Cincinnati\n- Dev Okonkwo built the routing at a meal-kit company\n- Ana Lucero runs the plant: eleven years in commercial laundry',
  '## :target: The ask\n\n- $900,000 for eighteen months\n- A second plant on the east side, and 60 more buildings\n- priya@loop.example · (614) 555-0182\n\n> Stop here. Let them ask about the plant.',
);

const LESSON = headed(
  { theme: 'chalkboard' },
  '## :moon: Why the Moon has phases {.title}\n\n- Seventh-grade science · Ms. Achterberg · Thursday, October 15, 2026',
  "## :target: By the end of today\n\n- You can name the eight phases in order\n- You can explain why we see them\n- You can say why it is not the Earth's shadow\n\n> Read these out. Ask them to copy the first line only.",
  '## :help: What do you already know?\n\n- How long from one full Moon to the next?\n- Is the Moon making its own light?\n- Have you seen the Moon in the daytime?\n\n> Two minutes with a partner, then hands up. Write the answers on the side whiteboard; we come back to them at the end.',
  '## :sun: The model\n\n1. The Sun lights half of the Moon, always\n2. The Moon goes around the Earth once in about 29.5 days\n3. From the Earth we see a different share of the lit half\n4. That share is the phase\n\n> Lamp at the front, a foam ball on a pencil each. Lights off.',
  '## :moon: The eight phases {.two}\n\n- New Moon\n- Waxing crescent\n- First quarter\n- Waxing gibbous\n\n|\n\n- Full Moon\n- Waning gibbous\n- Last quarter\n- Waning crescent',
  "## :warning: Not the shadow {.icon}\n\n- The Earth's shadow only touches the Moon in an eclipse\n- That happens a couple of times a year, not every month\n- A phase is about where we stand, not what is in the way",
  '## :check: Check\n\n- Draw the Moon at first quarter: which side is lit?\n- Why can you sometimes see the Moon at breakfast?\n- What phase comes after full?\n\n> Exit tickets on the way out.',
  "## :book: For Tuesday\n\n- Look at the Moon three nights this week and draw it\n- Write the date and the time beside each drawing\n- Bring it in: we will put the class's together on the wall",
  '## :check: Answers\n\n- First quarter: the right side is lit\n- At breakfast: the Moon is up in the daytime for half the month\n- After full: waning gibbous',
);

const CONFERENCE = headed(
  { theme: 'ocean' },
  '## :database: Ten thousand forms, no signal {.title}\n\n- Offline-first records at a rural clinic\n- Inês Carvalho · Offline Camp, Lisbon · Saturday, November 14, 2026',
  "## :map-pin: Where this happened\n\n- Mértola, Alentejo: one clinic, four villages, two nurses on the road\n- Cell signal on about half the route\n- Every visit was a paper form, typed up on Friday\n\n> Show of hands: who has typed up somebody else's handwriting? That was our Friday.\n> Pause on the map. Say how far: the farthest village is 24 miles on a road you cannot hurry.",
  '## :target: What we wanted\n\n- A form that works with no signal at all\n- Nothing lost if the tablet dies mid-visit\n- The clinic sees it the moment the car is back in range\n\n> Three sentences, and every decision after this slide goes back to one of them.',
  "## :wrench: What we built {.two}\n\n- The form saves on every keystroke, on the tablet\n- Each visit is its own small record\n- A queue sends them when there is signal\n\n|\n\n- No accounts on the tablet: it is the clinic's, not the nurse's\n- Conflicts are rare: one nurse, one visit\n- The rare ones go to a person, not a rule\n\n> The point to land: we made the conflict case boring by giving each visit one author.",
  '## :bar-chart: Visits that waited for signal\n\nMonth | Visits | Waited | Lost\n--- | --- | --- | ---\nMay | 812 | 371 | 0\nJun | 864 | 402 | 0\nJul | 905 | 455 | 0\nAug | 790 | 368 | 0\nSep | 930 | 417 | 0\n{chart=bar}\n\n> Nearly half of all visits were written with no signal. None lost. That last column is the talk.\n> If asked: the longest wait was 31 hours, a tablet left in a car over a weekend.',
  "## :warning: What went wrong\n\n- Tablets set to the wrong clock: visits dated 1970^[We now take the time from the clinic when the visit is sent, and keep the tablet's as a second opinion.]\n- A software update emptied one queue in July: 14 visits typed up again from memory\n- Nurses did not trust the green check mark for a month\n\n> Be honest about July. It is the slide people remember.",
  '## :lightbulb: What we would tell you\n\n- Save first, send later, and show which is which\n- Give every record one author if you can\n- Test with the battery at four percent\n- Ask the nurses what the check mark should look like\n\n> These are the four things to write down. Slow down.',
  '## :heart: Obrigada\n\n- ines@saudemertola.example\n- The form and the queue are open source: search for "mertola-forms"\n- Questions, please\n\n> Leave this up through the questions.',
);

const WEDDING = headed(
  { theme: 'bubblegum', color: 'red', qr: 'no' },
  '## :heart: Ana and Theo {.title}\n\n- Saturday, September 19, 2026 · Quinta do Vale, Sintra',
  '## :book: How they met {.icon}\n\n- A used bookstore in Porto, March 2019\n- One copy of "The Summer Book", two hands on it\n- Theo let her have it. She made him read it anyway.',
  '## :plane: The first trip\n\n- Six days in the Azores, on a budget of one rental car\n- It rained for five of them\n- Ana says it was the best vacation of her life. Theo agrees, now.',
  '## :home: The apartment on Rua da Rosa\n\n- Moved in together, fall 2021\n- Forty-one stairs, no elevator\n- One cat, Pimenta, who chose them at the shelter',
  "## :star: The question\n\n- New Year's Eve 2025, on the roof, in a coat\n- Theo had practiced the speech for a month\n- He forgot all of it. She said yes before he finished.",
  '## :calendar: Seven years {.two}\n\n- 2019: the bookstore\n- 2020: the Azores\n- 2021: Rua da Rosa\n- 2022: Pimenta\n\n|\n\n- 2024: Theo learns to cook\n- 2025: the roof\n- 2026: today\n- And everything after',
  '## :gift: Thank you {.title}\n\n- For coming from Lisbon, London and Luanda\n- The dancing starts at nine. The bus back is at one.',
);

const QUARTERLY = headed(
  { color: 'green' },
  '## :bike: Fernhill Bikes: the third quarter {.title}\n\n- July to September 2026 · For the partners, Thursday, October 15',
  '## The quarter in a line\n\n- Revenue $412,600, up 14% on last year\n- Repairs grew fastest: the workshop is now a third of the business\n- Cargo bikes are the surprise: 46 sold, against 18 last year\n\n> Say the three numbers, then the slides behind them.',
  '## :bar-chart: Revenue by month\n\nMonth | Bikes:money | Repairs:money | Parts:money\n--- | --- | --- | ---\nJul | 88400 | 41200 | 19800\nAug | 79100 | 46900 | 21300\nSep | 61700 | 34800 | 19400\n{chart=bar}\n\n> September is always quieter; the drop in bikes is school starting, not the market.',
  '## Wins and misses {.two}\n\n- Win: the second workshop bay paid for itself in eleven weeks\n- Win: cargo bikes, 46 sold, most to families\n- Win: the e-bike service plan, 212 sign-ups\n\n|\n\n- Miss: the online store, still under 5% of sales\n- Miss: three weeks waiting on Shimano parts in August\n- Miss: we hired the fourth mechanic a month late',
  '## :users: The numbers that matter\n\nMeasure | Q3 2025 | Q3 2026\n--- | --- | ---\nRevenue | $361,900 | $412,600\nGross margin | 34% | 37%\nRepairs a week | 96 | 138\nAverage wait for a repair | 4.1 days | 2.6 days\nStaff | 7 | 9\n\n> The wait is the one customers notice. It is down by a day and a half.',
  '## :target: The fourth quarter\n\n1. Stock cargo bikes before the December rush: 30 on order\n2. Order the parts we waited on, two months ahead\n3. Move the online store to repairs booking, which people do want\n4. Close the 24th to the 27th, and say so early',
  '## :help: For the partners\n\n- Agree the cargo bike order, $54,000, by October 23\n- Decide whether the store opens on Sundays in December',
);

const WORKSHOP = headed(
  { theme: 'confetti' },
  '## :wrench: Fix your own bike {.title}\n\n- A free workshop · Saturday, November 7, 2026, 10 am to 1 pm\n- Southside Library, the community room',
  '## :clock: The morning\n\nTime | What | Who\n--- | --- | ---\n10:00 | Coffee, and a look at your bike | Everyone\n10:20 | A flat tire, start to finish | Rosa\n11:00 | Brakes that stop | Kwame\n11:40 | Break | Cookies\n11:50 | Gears that change | Rosa\n12:30 | Your own bike, with help | Everyone\n\n> Keep to the times: the room is booked by the knitting group at one.',
  '## :package: What to bring\n\n```outline\n- Your bike, with its wheels on\n- Its lock and key\n- Clothes that can get oily\n- A spare inner tube, if you have one\n```\n\n> We bring the tools. The library lends gloves and aprons; ask at the desk.',
  '## :wrench: A flat tire in five steps\n\n1. Wheel off: open the brake, then the quick release\n2. Tire off with two levers, never a screwdriver\n3. Find the hole, and what made it\n4. New tube in, a little air first\n5. Tire back on with your thumbs, then pump it hard\n\n> Rosa does it once at speed, then once slowly, then everyone does their own.',
  '## :shield: Brakes that stop {.two}\n\n- Squeeze the lever: it should stop before it touches the bar\n- Look at the pads: worn past the line, change them\n- Wheel spinning, brake on: no rubbing, no squeal\n\n|\n\n- Too slack: the barrel adjuster, a turn at a time\n- Rubbing: center the caliper, two bolts\n- Squealing: clean the rim with soap and water',
  '## :heart: Afterwards {.title}\n\n- Southside Bike Kitchen is open every Wednesday, 6 to 8 pm\n- Tools, a stand and someone who knows: all free\n- Thank you to Southside Library for the room',
);

const LAUNCH = headed(
  { color: 'orange', transition: 'zoom' },
  '## :coffee: Tern {.title}\n\n- The kettle that tells you when it is ready\n- On sale Thursday, November 26, 2026',
  '## :lightbulb: In one sentence {.icon}\n\n- Tern boils, then holds the water at the heat you chose, and your phone chimes once',
  '## :settings: What it does {.two}\n\n- Five heats: green tea to a French press\n- Holds the heat for forty minutes\n- One chime, on the phone or the kettle\n\n|\n\n- 1.25 quarts, a window to see it\n- Boils a cup in 64 seconds\n- No app needed: the dial does everything',
  '## :dollar: Price and where\n\nModel | Price:money | Where\n--- | --- | ---\nTern, white | 89 | Online and in stores\nTern, slate | 89 | Online and in stores\nTern, copper | 119 | Online only\n\n> Stores: Hearth & Co, Kitchen Table, and the John Street store.',
  '## :calendar: The launch\n\n1. Monday, November 16: reviewers get their kettles\n2. Thursday, November 19: the reviews may go out\n3. Thursday, November 26: on sale, online and in stores\n4. Saturday, November 28: tea tasting at the John Street store, 11 to 3',
  '## :megaphone: For the press\n\n- Pictures and the fact sheet: tern.example/press\n- Interviews with the designer, Halvard Moe, on request\n- Lena Sato · press@tern.example · (503) 555-0147',
);

const TOWNHALL = headed(
  { theme: 'sunset' },
  '## :trees: Riverside Park: a new playground {.title}\n\n- A meeting for everyone who lives nearby\n- Wednesday, November 18, 2026, 7 pm · Riverside Community Hall',
  '## :info: Why we are meeting\n\n- The playground by the river was closed in June: the frame was unsafe\n- The city has set aside money to replace it\n- Before anything is ordered, we want to hear from you',
  '## :lightbulb: What is proposed {.two}\n\n- A new frame, for ages two to twelve\n- A sandbox, with a cover\n- Two benches in the shade\n\n|\n\n- A path that a wheelchair or a stroller can use\n- A water fountain\n- The fence moved back from the river',
  '## :dollar: Where the money goes\n\nPart | Cost:money\n--- | ---\nPlay frame | 64000\nSafety surface | 21500\nPath and fence | 18200\nBenches and fountain | 7300\nDesign and fees | 9000\n{chart=pie}\n\n> $120,000 in all, from the parks budget for 2026 and 2027.',
  '## :calendar: When\n\n1. November: this meeting, and the survey open until December 4\n2. January: three designs shown in the hall\n3. March: building starts\n4. June 2027: the playground opens',
  '## :message: Have your say\n\n- Come to the meeting, or send a note to parks@riverside.example\n- The survey is at the library and online\n- The hall is wheelchair accessible and has a hearing loop; there will be juice and cookies',
);

const TRIVIA = headed(
  { theme: 'arcade', transition: 'slide', qr: 'no' },
  '## :trophy: Trivia night at the Riverside Library {.title}\n\n- Thursday, November 19, 2026 · Four rounds, teams of up to six\n- $5 a head, all of it to the library’s book fund',
  "## :info: The rules\n\n- No phones on the table: a phone seen is a point lost\n- Answers on the sheet, team name at the top\n- The quizmaster's spelling is final\n\n> Read these slowly. Hand out the sheets and pens now.",
  '## :globe: Round one: the world\n\n1. What is the capital of Australia?\n2. Which river flows through Cairo?\n3. How many countries share a border with Germany?\n4. In which country is the city of Porto?',
  '## :music: Round two: music\n\n1. Which band was Freddie Mercury the singer of?\n2. How many strings does a standard violin have?\n3. Which Beatles album has a crosswalk on the cover?\n4. What does "forte" tell a musician to do?',
  '## :fish: Round three: the sea\n\n1. What is the largest ocean?\n2. How many arms does an octopus have?\n3. What is a baby seal called?\n4. Which ocean lies between New York and Europe?',
  '## :star: Picture round, without pictures\n\n1. What has keys but cannot open a lock?\n2. What gets wetter the more it dries?\n3. What has a neck but no head?\n4. What can you catch but not throw?',
  '## :trophy: The scores\n\nTeam | One | Two | Three | Four | Total\n--- | --- | --- | --- | --- | ---\nQuiz Team Aguilera | 4 | 3 | 3 | 4 | =SUM(B1:E1)\nThe Library Regulars | 3 | 4 | 4 | 2 | =SUM(B2:E2)\nLess Than Pointless | 2 | 3 | 2 | 4 | =SUM(B3:E3)\nKnow It Owls | 3 | 2 | 3 | 3 | =SUM(B4:E4)\n\n> Fill this in as the sheets come back. Winners get the $25 bookstore gift card.',
  '## :check: Answers {.two}\n\n- Round one: Canberra; the Nile; nine; Portugal\n- Round two: Queen; four; Abbey Road; play loudly\n\n|\n\n- Round three: the Pacific; eight; a pup; the Atlantic\n- Round four: a piano; a towel; a bottle; a cold',
);

/* ---------- more printed things ---------- */

const SOUPS = headed(
  { format: 'zine' },
  '## :flame: Soup for a cold week\n\nSeven soups, one a day, from one big grocery run.\n\nThe Garden Kitchen · Winter 2026',
  '## Monday: leek and potato\n\nThree leeks, four potatoes, a pat of butter. Soften the leeks for ten minutes before anything else goes in; that is the whole secret.\n\nBlend half of it. Leave the rest in pieces.',
  '## Tuesday: red lentil\n\nA cup of lentils, an onion, a carrot, a spoon of cumin. Twenty minutes and no blender. Lemon at the end, more than you think.',
  '## Wednesday: minestrone\n\nWhatever is left from Monday and Tuesday, a can of tomatoes, a handful of small pasta. Parmesan rind in the pot if you have one.',
  '## Thursday: miso and greens\n\nA spoon of miso in hot water, never boiling. Scallions, a nest of noodles, spinach wilted on top. Ten minutes, start to bowl.',
  '## Friday: roast squash\n\nHalf a squash, roasted with garlic until it is brown at the edges. Blend with stock and a little cream. Toast the seeds.',
  '## Saturday: chicken and barley\n\nA leftover roast, its bones simmered for an hour. Barley, celery, a bay leaf. This is the one to share.',
  '## :heart: Sunday: no soup\n\nYou made six. Have some bread and cheese.\n\nThe Garden Kitchen meets on Thursdays at the Hartley Road gardens.',
);

const PROGRAM = headed(
  { format: 'booklet' },
  "## :music: Winter Concert\n\nEastside Community Choir\n\nSaturday, December 12, 2026, 7:30 pm · St. Anne's Church, Mill Road",
  '## Welcome\n\nThank you for coming out on a December night. We are forty-two singers from Eastside, and most of us could not read music when we joined.\n\nTonight is the end of our sixth year. The intermission is about twenty minutes; cookies and hot cider are at the back, by donation.\n\nJoanna Pike, director',
  '## The first half\n\n1. In the Bleak Midwinter, Holst\n2. Shenandoah, arranged by James Erb\n3. The Rose, Ola Gjeilo\n4. Lay a Garland, Pearsall\n5. Hallelujah, Leonard Cohen, arranged for the choir by Tom Ashby',
  '## The second half\n\n1. Ding Dong! Merrily on High\n2. Bogoroditse Devo, Rachmaninov\n3. Sound the Trumpet, Purcell, with the Eastside Youth Brass\n4. Fix You, Coldplay\n5. Silent Night, with you singing too: the words are on the back cover',
  '## About the music\n\nShenandoah is a river song from the 1800s, sung by traders on the Missouri. The Erb arrangement keeps the tune in the altos and lets everyone else wander.\n\nThe Gjeilo is new to us this year and the hardest thing we have learned. The sopranos would like you to listen for the top G^[Measure 41. They have been practicing it since August.].',
  '## The singers\n\nSopranos: Aisha, Brenda, Carys, Della, Fen, Grace, Hannah, Imogen, Jas, Kath, Lou, Maya\n\nAltos: Nell, Olu, Pat, Queenie, Rhi, Sue, Tash, Uma, Val, Wendy\n\nTenors: Ade, Bryn, Colm, Dafydd, Eli, Femi\n\nBasses: Gus, Huw, Idris, Jon, Kofi, Lars, Mo, Nick, Owen, Raj, Stan, Tom',
  "## Thank you\n\nTo St. Anne's for the church and the heating. To Eastside Youth Brass and their teacher, Lindy Moss. To Mill Road Bakery for the cookies.\n\nTonight's collection goes to the Mill Road food bank.\n\nThe choir rehearses on Tuesdays at 7 pm in St. Anne's hall. No audition: come and try us in January.",
  '## Silent Night\n\nSilent night, holy night,\n\nAll is calm, all is bright,\n\nRound yon virgin mother and child,\n\nHoly infant so tender and mild,\n\nSleep in heavenly peace,\n\nSleep in heavenly peace.',
);

const FARM = headed(
  { format: 'brochure' },
  '## :apple: Hollow Oak Farm\n\nPick your own fruit, from June to October, ten minutes from Ashby.',
  '## What grows when\n\n- June: strawberries\n- July: raspberries and cherries\n- August: blueberries and plums\n- September: apples, early pears\n- October: apples, pumpkins',
  '## How it works\n\nTake a basket at the barn. Pick as much as you like; we weigh it on the way out.\n\nRows are marked with what is ripe today. Children are welcome, and so is eating one or two as you go.',
  '## Prices\n\n- Strawberries: $4.50 a pound\n- Raspberries and blueberries: $6 a pound\n- Cherries: $5.50 a pound\n- Apples and pears: $2.25 a pound\n- Pumpkins: $8 each, any size',
  '## The barn\n\nCoffee, apple cake and our own cider (sweet, not hard) in the barn from ten.\n\nRestrooms and a picnic field by the parking lot. Dogs on a leash, please, and not in the rows.',
  '## :map-pin: Find us\n\n4120 Hollow Oak Road, Ashby\n\nOpen Wednesday to Sunday, 9 am to 5 pm, June to October.\n\nWhat is ripe today: (978) 555-0119, or hollowoak.example',
);

const UMBRELLA = headed(
  { format: 'comic' },
  '## :cloud: The Umbrella\n\nA comic in eight pages, about lending something',
  "## Tuesday\n\n- :cloud: Rain. | Of course.\n- :user: Take mine. | Mrs. Okafor, from number 9.\n- :smile: I'll bring it back tomorrow! | He meant it.",
  '## Wednesday\n\n- :briefcase: Late for the bus. | No umbrella needed.\n- :sun: Sun all day. | The umbrella stays by the door.',
  '## Thursday\n\n- :bell: Knock on number 9? | Nobody in.\n- :clock: Later, then. | Later never comes.',
  '## The next week\n\n- :cloud: Rain again. | He takes it.\n- :user: Is that mine? | Mrs. Okafor, also wet.\n- :frown: Ah. | Ah.',
  '## Sharing\n\n- :users: Under it together. | It is a small umbrella.\n- :home: All the way to number 9. | She talks about her garden.',
  '## The door\n\n- :coffee: Tea? | He has never been inside.\n- :heart: Keep it. | I have three.',
  '## :cloud: The end\n\nHe still has the umbrella. He goes to number 9 on Thursdays.',
);

const LOST = headed(
  { format: 'poster', color: 'red' },
  '## :cat: Lost cat: Pepper {.title}\n\n- Gray with white paws, very friendly, a green collar\n- Last seen Saturday, October 31, on Linden Avenue\n- Please check your sheds and garages\n- Call or text Sam: (617) 555-0164',
);

const SPEAKERS = headed(
  { format: 'badges', theme: 'ocean' },
  '## Inês Carvalho {.title}\n\n- Speaker · Saúde Mértola',
  '## Tomás Ferreira {.title}\n\n- Speaker · Lisbon Transit Lab',
  '## Hana Kobayashi {.title}\n\n- Speaker · Field Notes Co.',
  '## Rui Almeida {.title}\n\n- Organizer · Offline Camp',
  '## Grace Mensah {.title}\n\n- Volunteer · ask me anything',
  '## Lukas Brandt {.title}\n\n- Attendee · Kiel Ferries',
);

export const templates = (): Template[] => [
  { id: 'talk', name: t('A talk'), blurb: t('Title, agenda, three points with notes for the speaker, and a close.'), doc: TALK },
  { id: 'status', name: t('Status update'), blurb: t('Done and next side by side, then risks, then asks.'), doc: STATUS },
  { id: 'proposal', name: t('A proposal'), blurb: t('What you heard, what you propose, when, what it costs.'), doc: PROPOSAL },
  { id: 'pitch', name: t('A pitch'), blurb: t('A seed pitch in eight slides: the problem, the product, traction on a chart, the business, the team, the ask.'), doc: PITCH },
  { id: 'lesson', name: t('A lesson'), blurb: t("A science lesson on the chalkboard: aims, what they know, the model, a check, homework; the teacher's notes under each."), doc: LESSON },
  { id: 'conference', name: t('Conference talk'), blurb: t('A twenty-minute talk with speaker notes on every slide, a chart of the results, a footnote and the lessons.'), doc: CONFERENCE },
  { id: 'quarterly', name: t('Quarterly review'), blurb: t("A bike shop's quarter for its partners: revenue on a chart, wins and misses, the numbers that matter, next quarter."), doc: QUARTERLY },
  { id: 'workshop', name: t('Workshop agenda'), blurb: t('A morning workshop: the schedule, a checklist of what to bring, the steps, and where to go next.'), doc: WORKSHOP },
  { id: 'launch', name: t('Product launch'), blurb: t('A product in a sentence, what it does, prices in a table, the launch dates and the press contact.'), doc: LAUNCH },
  { id: 'townhall', name: t('Town-hall notice'), blurb: t("A residents' meeting about a new playground: why, what is proposed, the budget as a pie, when, how to have a say."), doc: TOWNHALL },
  { id: 'trivia', name: t('Trivia night'), blurb: t('A trivia night in four rounds, a score table, and the answers on the last slide.'), doc: TRIVIA },
  { id: 'wedding', name: t('Wedding slideshow'), blurb: t('Their story for the reception, from how they met to the question, with a timeline and a thank-you.'), doc: WEDDING },
  { id: 'zine', name: t('Zine'), blurb: t('Eight small pages from one sheet of paper: print, fold and cut, or read it by tapping on a phone.'), doc: ZINE },
  { id: 'soups', name: t('Recipe zine'), blurb: t('Seven soups for a cold week, one a page, in a zine folded from one sheet.'), doc: SOUPS },
  { id: 'booklet', name: t('Booklet'), blurb: t('A booklet of half-letter pages, eight to twenty, laid out to print, nest and fold.'), doc: BOOKLET },
  { id: 'program', name: t('Concert program'), blurb: t("A choir's winter concert: the welcome, both halves, notes on the music, the singers, and the words to sing along."), doc: PROGRAM },
  { id: 'brochure', name: t('Brochure'), blurb: t('A trifold brochure: six panels on two sides of a sheet, each where the fold needs it.'), doc: BROCHURE },
  { id: 'farm', name: t('Farm brochure'), blurb: t('A pick-your-own farm: what grows when, how it works, the prices, the barn and how to find it.'), doc: FARM },
  { id: 'comic', name: t('Comic'), blurb: t('A mini comic: panels with a picture, a speech bubble and a caption, folded from one sheet.'), doc: COMIC },
  { id: 'umbrella', name: t('Comic: the umbrella'), blurb: t('A small story in panels about lending something to a neighbor.'), doc: UMBRELLA },
  { id: 'poster', name: t('Poster'), blurb: t('A poster or flyer: a headline and a few lines, as big as one page allows.'), doc: POSTER },
  { id: 'lost', name: t('Lost cat poster'), blurb: t('A lost-pet poster in red: the name, what she looks like, where she was seen, a number to call.'), doc: LOST },
  { id: 'badges', name: t('Name badges'), blurb: t('Name badges for a meetup, one page per person, six to a sheet, ready to cut.'), doc: BADGES },
  { id: 'speakers', name: t('Conference badges'), blurb: t('Badges for a conference, each with a role and where they are from, on the Ocean look.'), doc: SPEAKERS },
];
