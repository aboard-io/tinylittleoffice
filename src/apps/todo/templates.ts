/**
 * Todo's templates: Blank is the app's own page (one empty task); these are the rest, each a real list in TLO,
 * canonical as the kernel writes it so each round-trips byte for byte (the corpus test holds every one). The
 * everyday lists first, then the ones for a project or an occasion; templates.md says what each is for.
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';

const WEEK = `---
title: The week of 12 October
---
- [x] Send the October invoice to Harlow & Finch
- [ ] Call Pressworks about the proofs {.star due=2026-10-12}
- [ ] Reply to Dee about the launch call {due=2026-10-13}
- [ ] Renew the studio insurance, £214 with Ashby Mutual {.star due=2026-10-15}
- [ ] Book the van in for its MOT {due=2026-10-16}
- [ ] Order paper samples: Munken Pure in 120 and 150 gsm
- [ ] Water the plants
`;

const DAILY = `---
title: Every day
---
- [x] A glass of water before the coffee
- [x] Ten minutes of stretching
- [ ] Walk Juno round Victoria Park, twenty minutes {.star}
- [ ] Look at the calendar and pick the one thing that matters today {.star}
- [ ] Email done by 10, then closed till 4
- [ ] Lunch away from the desk
- [ ] Thirty pages of the book
- [ ] Lay out tomorrow's clothes
- [ ] Phone on the charger in the hall by 10.30 pm
`;

const SHOPPING = `---
title: Shopping
---
- [x] Oat milk
- [x] Coffee beans
- [ ] Lemons
- [ ] Sourdough
- [ ] A dozen eggs
- [ ] Olive oil
- [ ] Basil, the live kind
- [ ] Candles for Mira's cake on Saturday {.star due=2026-10-17}
`;

const GROCERIES = `---
title: The big shop
---
- [x] **Fruit and veg:** 6 lemons and a bag of spinach
- [x] **Fruit and veg:** bananas, a bulb of garlic, 3 red onions
- [ ] **Fruit and veg:** 2 kg of potatoes
- [ ] **Bakery:** a sourdough loaf and 6 bagels
- [ ] **Dairy:** 2 litres of whole milk, butter, Greek yoghurt
- [ ] **Dairy:** a block of mature cheddar {.star}
- [ ] **Fish:** 2 salmon fillets for Thursday
- [ ] **Tins and jars:** chickpeas ×3, chopped tomatoes ×4, peanut butter
- [ ] **Pasta and rice:** 1 kg of basmati, rigatoni
- [ ] **Frozen:** peas and a tub of vanilla ice cream
- [ ] **Household:** washing-up liquid and bin bags {.star}
`;

const READING = `---
title: Reading, autumn 2026
---
- [x] *Tomorrow, and Tomorrow, and Tomorrow*, Gabrielle Zevin
- [x] *The Remains of the Day*, Kazuo Ishiguro {.star}
- [ ] *Piranesi*, Susanna Clarke, for book club at Ruth's {.star due=2026-10-28}
- [ ] *Small Things Like These*, Claire Keegan, before the film night {due=2026-11-20}
- [ ] *Braiding Sweetgrass*, Robin Wall Kimmerer
- [ ] *The Overstory*, Richard Powers
- [ ] *A Gentleman in Moscow*, Amor Towles
- [ ] *The Years*, Annie Ernaux
`;

const TRIP = `---
title: Lisbon, 23 to 27 October
---
- [x] Passport, good until 2031 {.star}
- [x] Boarding passes, on the phone and on paper
- [ ] Charger and the European adapter
- [ ] Rain jacket
- [ ] Walking shoes for the hills of Alfama
- [ ] Medicines and plasters
- [ ] Ask Ana next door to feed Miso {due=2026-10-21}
- [ ] Put the bins out {due=2026-10-22}
- [ ] Taxi to the airport at 5.15 am {.star due=2026-10-23}
`;

const GARDEN = `---
title: The garden, by season
---
- [x] **Autumn:** lift the dahlias and store them in the shed
- [ ] **Autumn:** plant 40 tulip bulbs along the front path {due=2026-10-25}
- [ ] **Autumn:** sow Aquadulce broad beans in bed 2 {due=2026-11-01}
- [ ] **Autumn:** rake the leaves into the leaf-mould cage
- [ ] **Winter:** prune the apple tree while it sleeps {.star due=2027-01-16}
- [ ] **Winter:** order seed potatoes, Charlotte and Pink Fir Apple {due=2027-01-31}
- [ ] **Spring:** chit the potatoes on the kitchen sill {due=2027-02-20}
- [ ] **Spring:** sow Sungold tomatoes indoors {.star due=2027-03-14}
- [ ] **Spring:** mulch every bed with a barrow of compost {due=2027-04-04}
- [ ] **Summer:** water in the evening, from the butts first
- [ ] **Summer:** pick the beans every other day
`;

const LAUNCH = `---
title: Fieldnotes launch, 3 November
---
- [x] Freeze the features
- [x] App Store screenshots in all six sizes
- [ ] Final test pass on iPhone and Android {.star due=2026-10-20}
- [ ] Privacy policy read by Maya's lawyer {due=2026-10-22}
- [ ] Submit for review, with a week in hand {.star due=2026-10-27}
- [ ] Press kit to the twelve writers on the list {due=2026-10-27}
- [ ] Launch post drafted, Dee to edit {due=2026-10-29}
- [ ] Support inbox staffed for launch week {due=2026-11-02}
- [ ] Go live at 9 am Pacific {.star due=2026-11-03}
- [ ] Thank-you cake for the team {due=2026-11-04}
`;

const ONBOARDING = `---
title: Priya's first two weeks
---
- [x] Laptop, badge and the door code
- [x] Lunch with the team on the first day
- [ ] Set up email, the calendar and the shared drive
- [ ] Read the handbook, the parts on leave and expenses first {due=2026-11-03}
- [ ] Coffee with Sam, your buddy for the first month {due=2026-11-04}
- [ ] Sit in on two support calls {due=2026-11-05}
- [ ] Payroll and pension forms to Jo in HR {.star due=2026-11-06}
- [ ] Fire safety walk-round with Kofi {due=2026-11-10}
- [ ] First one-to-one with Alex {.star due=2026-11-13}
`;

const MOVEOUT = `---
title: Moving out of 18 Albion Road
---
- [x] A month's notice to the landlord, in writing
- [x] Book the van for Saturday 28 November
- [ ] Redirect the post to Elm Street {due=2026-11-20}
- [ ] New address to the council, the bank and the surgery
- [ ] Defrost the freezer {due=2026-11-26}
- [ ] Clean the oven and the fridge {due=2026-11-27}
- [ ] Fill the picture-hook holes and touch up the hall
- [ ] Meter readings and a photo of every room {.star due=2026-11-29}
- [ ] Hand back both keys and the fob {.star due=2026-11-30}
- [ ] Ask for the £1,150 deposit back {due=2026-12-01}
`;

const WEDDING = `---
title: Ines and Tom, 19 December
---
- [x] Book Hartwell Barn
- [x] Save-the-dates to everyone on the list
- [ ] Invitations out to all 84 guests {.star due=2026-10-24}
- [ ] Menu tasting with Fennel & Fig {due=2026-10-31}
- [ ] The second dress fitting {due=2026-11-14}
- [ ] Collect the rings from Abbott's {due=2026-11-28}
- [ ] Final numbers to the barn^[Two weeks before, with every dietary need and the children's meals.] {.star due=2026-12-04}
- [ ] The seating plan, with Gran near the fire
- [ ] The first dance, and the playlist for after
- [ ] The photographer's balance, £900 {due=2026-12-12}
`;

export const templates = (): Template[] => [
  { id: 'week', name: t('This week'), blurb: t('A few things to do by a day, the important ones starred, one already done.'), doc: WEEK },
  { id: 'daily', name: t('Daily routine'), blurb: t('The habits that hold a day together, from the first glass of water to the phone put away.'), doc: DAILY },
  { id: 'shopping', name: t('Shopping'), blurb: t('What to buy, ticked off in the shop.'), doc: SHOPPING },
  { id: 'groceries', name: t('Groceries by aisle'), blurb: t('The weekly shop in the order of the aisles, so nothing means walking back.'), doc: GROCERIES },
  { id: 'reading', name: t('Reading list'), blurb: t('Books to read, the favourites starred and the book-club one dated.'), doc: READING },
  { id: 'trip', name: t('Packing for a trip'), blurb: t('What to take and what to do before you go.'), doc: TRIP },
  { id: 'garden', name: t('Garden by season'), blurb: t('A year in the garden from autumn on, each job dated to its season.'), doc: GARDEN },
  { id: 'launch', name: t('Project launch'), blurb: t('Everything between the feature freeze and launch day, in the order it falls due.'), doc: LAUNCH },
  { id: 'onboarding', name: t('Onboarding'), blurb: t("A new starter's first two weeks, from the door code to the first one-to-one."), doc: ONBOARDING },
  { id: 'moveout', name: t('Moving out'), blurb: t('From notice to the keys handed back: the van, the post, the cleaning and the deposit.'), doc: MOVEOUT },
  { id: 'wedding', name: t('Wedding checklist'), blurb: t('The last months before a December wedding, the deadlines starred.'), doc: WEDDING },
];
