/**
 * Website's templates: Blank is the app's own page; these are the rest, each a real site in TLO with real
 * sample data, canonical as the kernel writes it so each round-trips byte for byte (the corpus test holds
 * every one). The Quick Links pages are a set of Website's templates (`look: links`): a picture or a big
 * icon, a name, a line, a stack of buttons and the small links at the foot.
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';

const CAFE = `---
theme: amber
---
# Harbor Coffee

Small-batch coffee, roasted on the quay every morning.

> See the menu | #menu
> Find us | #find-us

- :coffee: Roasted daily | Never more than a week old
- :leaf: Fair trade | From farms we have visited
- :bike: Delivered | By bike, on the day

# Menu

What we pour, and what we bake.

## Coffee

- Espresso | 3.00
- Flat white | 4.20
- Filter, by the cup | 3.50

## Pastry

- Cardamom bun | 3.50
- Sourdough toast, butter and jam | 4.00

# Find us

14 Quay Street, open 7 to 3, every day but Monday.

https://www.openstreetmap.org/?mlat=43.6567&mlon=-70.2484#map=17/43.6567/-70.2484

> Email us | mailto:hello@harborcoffee.example
`;

const SHOP = `---
theme: teal serif
currency: £
orders: orders@quaypottery.example
---
# Quay Pottery

Mugs, bowls and the odd lamp, thrown by hand in a shed by the harbour.

> The shop | #shop
> Classes | #classes

# Shop

Everything is made to order and posted within two weeks.

Name | Price:money | About | Image
--- | --- | --- | ---
Harbour mug | 24 | Holds a big coffee; blue glaze | https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600
Breakfast bowl | 30 | Wide and shallow, speckled white | https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=600
Bud vase | 18 | For one stem from the garden | https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=600

# Classes

## Saturday mornings

Two hours on the wheel, clay and firing included. Six people at most.

- :calendar: Every Saturday | 10 to 12
- :users: Six at most | Beginners welcome
- :gift: A gift card | Good for any class

> Book a class | mailto:classes@quaypottery.example
`;

const EVENT = `---
theme: plum rounded
---
# Quayside Book Fair

Forty small presses, two days, one tent on the harbour. Free to come in.

:book:

> The programme | #programme
> Getting there | #getting-there

## Programme

- :calendar: Saturday 12 June | Stalls 10 to 5; readings at noon and 3
- :calendar: Sunday 13 June | Stalls 10 to 4; the zine workshop at 11
- :music: Saturday night | The Harbour Lights play the tent at 7

## Getting there

The tent is on the green at the end of Quay Street, five minutes from the station. There is no parking at the harbour; the 14 bus stops at the gate.

> Ask us anything | mailto:fair@quayside.example
`;

const MAKER = `---
look: links
theme: rose
---
# Ada Diaz

![](https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400)

Potter in Lisbon. Mugs, bowls, the odd lamp.

> :cart: The shop | https://example.com/shop
> :calendar: Book a class | https://example.com/classes
> :mail: Email me | mailto:ada@example.com

- :camera: Instagram | https://instagram.com/ada
- :film: YouTube | https://youtube.com/@ada
`;

const GROUP = `---
look: links
theme: forest
---
# Quayside Mutual Aid

:heart:

Neighbours helping neighbours, since the flood.

> :message: Ask for help | https://example.com/ask
> :users: Offer help | https://example.com/offer
> :calendar: Next meeting: Thursday at 7 | https://example.com/meet
> :megaphone: Join the group chat | https://example.com/chat

- :camera: Instagram | https://instagram.com/quayside
- :mail: Email | mailto:hello@quayside.example
`;

const BAND = `---
look: links
theme: midnight
---
# The Harbour Lights

![](https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400)

New record, Low Tide, out Friday.

> :headphones: Listen | https://example.com/listen
> :calendar: Tour dates | https://example.com/dates
> :gift: Merch | https://example.com/merch

- :camera: Instagram | https://instagram.com/harbourlights
- :film: YouTube | https://youtube.com/@harbourlights
- :music: Bandcamp | https://harbourlights.bandcamp.com
`;

const BUSINESS = `---
look: links
theme: amber
---
# Harbor Coffee

:coffee:

14 Quay Street. Open 7 to 3, every day but Monday.

> :book: The menu | https://example.com/menu
> :calendar: Book a table | https://example.com/book
> :map-pin: Find us | https://www.openstreetmap.org/?mlat=43.6567&mlon=-70.2484#map=17/43.6567/-70.2484
> :phone: Call | tel:+12075550134

- :camera: Instagram | https://instagram.com/harborcoffee
- :mail: Email | mailto:hello@harborcoffee.example
`;

const WRITER = `---
look: links
theme: paper
---
# Mara Quill

:book:

Essays about small towns and smaller machines.

> :mail: The newsletter | https://example.com/newsletter
> :bookmark: The book | https://example.com/book
> :star: The latest piece | https://example.com/latest
> :message: Say hello | mailto:mara@example.com

- :globe: Bluesky | https://bsky.app/profile/mara.example.com
- :bell: RSS | https://example.com/feed
`;

export const templates = (): Template[] => [
  { id: 'cafe', name: t('A café'), blurb: t('Three pages: the front with what is special, the menu, how to find you.'), doc: CAFE },
  { id: 'shop', name: t('A small shop'), blurb: t('Things for sale with a cart; orders come to you by email.'), doc: SHOP },
  { id: 'event', name: t('An event'), blurb: t('A fair, a festival, a reunion: the dates, the programme, the way there.'), doc: EVENT },
  { id: 'links-maker', name: t('Quick Links: a maker'), blurb: t('A picture, a line, the shop, the classes, the inbox; the places you post at the foot.'), doc: MAKER },
  { id: 'links-group', name: t('Quick Links: a group'), blurb: t('A mutual-aid group or a club: how to join, how to help, the next meeting.'), doc: GROUP },
  { id: 'links-band', name: t('Quick Links: a band'), blurb: t('The new record, the dates, the merch, every place the music is.'), doc: BAND },
  { id: 'links-business', name: t('Quick Links: a small business'), blurb: t('Hours, the menu, a table booked, the way there, the phone.'), doc: BUSINESS },
  { id: 'links-writer', name: t('Quick Links: a writer'), blurb: t('The newsletter, the book, the latest piece, and a way to say hello.'), doc: WRITER },
];
