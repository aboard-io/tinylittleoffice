/**
 * Todo's templates: Blank is the app's own page (one empty task); these are the rest, each a real list in TLO,
 * canonical as the kernel writes it so each round-trips byte for byte (the corpus test holds every one).
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';

const WEEK = `- [x] Send the invoice to Acme
- [ ] Call the printer about the proofs {.star due=2027-03-03}
- [ ] Reply to Dee about the launch call {due=2027-03-04}
- [ ] Renew the studio insurance {.star due=2027-03-12}
- [ ] Order paper samples
- [ ] Water the plants
`;

const SHOPPING = `- [x] Oat milk
- [x] Coffee beans
- [ ] Lemons
- [ ] Sourdough
- [ ] Eggs
- [ ] Olive oil
- [ ] Basil, the live kind
`;

const TRIP = `- [x] Passport {.star}
- [x] Tickets, on the phone and on paper
- [ ] Charger and the adapter
- [ ] Rain jacket
- [ ] Walking shoes
- [ ] Medicines
- [ ] Tell the neighbour about the cat {due=2027-04-09}
- [ ] Put the bins out {due=2027-04-10}
`;

export const templates = (): Template[] => [
  { id: 'week', name: t('This week'), blurb: t('A few things to do by a day, the important ones starred, one already done.'), doc: WEEK },
  { id: 'shopping', name: t('Shopping'), blurb: t('What to buy, ticked off in the shop.'), doc: SHOPPING },
  { id: 'trip', name: t('Packing for a trip'), blurb: t('What to take and what to do before you go.'), doc: TRIP },
];
