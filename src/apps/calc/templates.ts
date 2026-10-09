/**
 * The calculator's templates: Blank is the app's own page (an empty tape); these are the rest, each a real
 * piece of working in TLO, canonical as the kernel writes it so each round-trips byte for byte (the corpus
 * test holds every one).
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';

const BILL = `---
title: Dinner for six
---
food = 164.50
drinks = 58
tip = (food + drinks) * 18%
total = food + drinks + tip
total / 6
`;

const PAINT = `---
title: Painting the front room
---
walls = 2 * (4.2 + 3.6) * 2.4
doors = 0.9 * 2.1
windows = 1.4 * 1.2 * 2
area = walls - doors - windows
litres = area * 2 / 12
ceil(litres / 2.5)
`;

const KITCHEN = `---
title: Kitchen conversions
---
2 cups to ml
180 celsius to fahrenheit
3 tbsp + 2 tsp to ml
450 g to lb
8 floz to ml
`;

const BREAK_EVEN = `---
title: Break-even for a coffee cart
mode: graph
---
x from 0 to 400
1200 + 1.1x
4.5x
`;

const WAVES = `---
title: Waves adding up
mode: graph
---
x from -6.3 to 6.3
sin(x)
sin(3x)/3
sin(x) + sin(3x)/3 + sin(5x)/5
`;

export const templates = (): Template[] => [
  { id: 'bill', name: t('Splitting the bill'), blurb: t('Food, drinks and an 18% tip, shared six ways, each step kept by name.'), doc: BILL },
  { id: 'paint', name: t('Paint for a room'), blurb: t('Walls less the door and windows, two coats, in 2.5 litre tins.'), doc: PAINT },
  { id: 'kitchen', name: t('Kitchen conversions'), blurb: t('Cups, ovens, spoons and weights, from one measure to another.'), doc: KITCHEN },
  { id: 'break-even', name: t('Break-even'), blurb: t('Costs against takings for a coffee cart: where the lines cross is the cups a day it needs.'), doc: BREAK_EVEN },
  { id: 'waves', name: t('Waves adding up'), blurb: t('Sine waves summed, on their way to a square wave.'), doc: WAVES },
];
