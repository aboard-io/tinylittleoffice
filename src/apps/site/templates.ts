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

const PORTFOLIO = `---
theme: ink serif
currency: £
orders: prints@ionareid.example
---
# Iona Reid

Photographs of the Highlands and the islands, taken on foot, mostly before breakfast.

![](https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200)

> See the work | #work
> Buy a print | #prints
> Commission me | #about

# Work

## Skye, October

![](https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200)

The Fairy Glen at first light, the day after the storm. Four hours of waiting for six minutes of sun.

## Glen Affric

![](https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200)

Old Caledonian pine on the north shore path, in the rain that never quite stopped.

# Prints

Printed on cotton rag paper in Inverness, signed, and posted flat in a box within ten days.

Name | Price:money | About | Image
--- | --- | --- | ---
Fairy Glen, first light | 85 | A3, edition of 50 | https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=600
Affric pines | 85 | A3, edition of 50 | https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600
Loch, before the boats | 140 | A2, edition of 25 | https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600

# About

I have walked and photographed the north of Scotland for twelve years. Before that I printed other people's pictures in a darkroom in Leith.

- :camera: Commissions | Hotels, estates, books and the odd wedding
- :mountain: Workshops | Two days on Skye in May, six people at most
- :award: Shown at | Inverness Museum and Art Gallery, 2025

> :mail: Write to me | mailto:iona@ionareid.example
`;

const WEDDING = `---
theme: rose
---
# Priya & Sam

Saturday 5 December 2026, at Larkhill Barn, near Hebden Bridge.

![](https://images.unsplash.com/photo-1519741497674-611481863552?w=1200)

> :mail: Say you are coming | #rsvp
> :map-pin: Getting there | #travel

# The day

Come as you are, but bring a coat: the barn is warm, the yard is not.

- :clock: 1.30 pm | The ceremony, in the barn
- :coffee: 2.30 pm | Drinks and photographs in the orchard
- :heart: 4.00 pm | The wedding breakfast and the speeches
- :music: 7.30 pm | The ceilidh, with the Calder Valley Band

### Food

Everything is vegetarian and made by Rosa's kitchen in Todmorden. Tell us anything you cannot eat when you reply.

# Travel

Larkhill Barn is two miles up the hill from Hebden Bridge station. A minibus leaves the station at 12.45 pm and comes back at 11.30 pm.

https://www.openstreetmap.org/?mlat=53.7420&mlon=-2.0120#map=14/53.7420/-2.0120

## Where to stay

- :home: The White Lion | Hebden Bridge, £120 a night; we have held ten rooms
- :trees: Hebden Hostel | Twelve beds, £32 a night, ten minutes' walk from the minibus

# RSVP

Please tell us by Saturday 31 October, and tell us who is coming with you.

> :mail: Reply by email | mailto:priyaandsam@example.com
> :phone: Or ring Priya | tel:+441632960481

## Gifts

You coming is the gift. If you would like to, there is a fund for the honeymoon: a fortnight walking in the Picos de Europa.
`;

const BAND_SITE = `---
theme: midnight
currency: £
orders: merch@harbourlights.example
---
# The Harbour Lights

Four friends from Falmouth who play loud songs about the sea. The new record, Low Tide, is out on 6 November 2026.

![](https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200)

> :headphones: Listen to Low Tide | https://harbourlights.bandcamp.com
> :calendar: On tour | #tour

# Tour

Ten nights in November and December. Tickets are from each venue.

- :map-pin: [Fri 13 Nov, Bristol, The Louisiana](https://example.com/tickets/bristol) | £14, doors at 7.30
- :map-pin: [Sat 14 Nov, Cardiff, Clwb Ifor Bach](https://example.com/tickets/cardiff) | £14, doors at 7.30
- :map-pin: [Thu 19 Nov, Leeds, Brudenell Social Club](https://example.com/tickets/leeds) | £15, doors at 7
- :map-pin: [Sat 5 Dec, Falmouth, The Poly](https://example.com/tickets/falmouth) | £12, the home show; sold out

# Merch

Posted from Falmouth every Monday.

Name | Price:money | About
--- | --- | ---
Low Tide, vinyl | 24 | Blue vinyl, with a lyric sheet
Low Tide, CD | 10 | In a card sleeve
Lighthouse T-shirt | 20 | Navy, organic cotton, S to XXL

# About

![](https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200)

Jess sings and plays guitar, Tom plays bass, Kit plays drums, Ollie plays everything else. They met at the sailing club in 2019.

> :mail: Booking and press | mailto:hello@harbourlights.example
`;

const CLINIC = `---
theme: ocean
---
# Shore Road Health Centre

A family practice in Leith: four doctors, two nurses, a midwife on Thursdays.

![](https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200)

> :phone: Call 0131 496 0712 | tel:+441314960712
> :calendar: Book online | https://example.com/appointments

- :clock: Open | Monday to Friday, 8 am to 6.30 pm
- :phone: Out of hours | Call NHS 24 on 111
- :warning: In an emergency | Call 999, or go to A&E at the Royal Infirmary

# Services

## For everyone

- :user: Appointments with a doctor | Same day if you ring before 10 am
- :help: Nurse clinics | Blood tests, dressings, travel jabs, smear tests
- :baby: Mother and baby | Midwife on Thursdays; baby checks at eight weeks
- :check: Flu jabs | Saturdays in October and November, no appointment needed

## Repeat prescriptions

Order online or put the slip in the box by the door. Allow two working days; the pharmacy next door collects at 3 pm.^[Two working days means a prescription ordered on Friday is ready on Tuesday.]

# Find us

12 Shore Road, Leith, EH6 6RA. Step-free from the street, with a loop in reception. The 16 and 22 buses stop outside.

https://www.openstreetmap.org/?mlat=55.9756&mlon=-3.1723#map=17/55.9756/-3.1723

> :mail: Write to the practice manager | mailto:manager@shoreroadhealth.example
`;

const CAMPAIGN = `---
theme: sunset
---
# Keep the Branch Library Open

The library on Munjoy Hill closes on 31 December unless the city funds it for one more year. We think it should.

![](https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1200)

> :megaphone: Sign the petition | https://example.com/petition
> :calendar: Come to the hearing | #the-hearing

- :users: 2,400 visits a month | Most of them children and people over seventy^[The library's own count, January to August 2026.]
- :laptop: 14 computers | The only free ones on the hill
- :book: 31,000 books | And a seed library in the spring

# The money

What one more year costs, from the city's own budget papers:

What | Cost:money
--- | ---
One librarian and two part-time staff | 118000
Heat, light and the building | 26500
New books and the computers | 14000
A year | =SUM(B1:B3)

## Where we are

We have raised $9,200 towards the books from neighbours and the bakery's tip jar. The rest has to come from the city.

# The hearing

The city council's finance committee meets on **Tuesday 17 November at 6 pm**, in Room 209 of City Hall. Anyone may speak for three minutes. Come early: there are 80 seats.

- :message: What to say | Tell them what the library is to you, in your own words
- :check: What to bring | Nothing; sign the sheet at the door

> :mail: Ask us anything | mailto:friends@munjoylibrary.example

\`\`\`qr
https://example.com/petition
\`\`\`
`;

const MUTUAL_AID = `---
theme: forest
---
# Elm Street Neighbours

Help with food, lifts and errands for anyone on Elm Street, Cedar Row and the flats by the park. Nobody has to explain why.

> :message: Ask for help | #ask
> :heart: Offer help | #offer

- :apple: The pantry | Thursdays 4 to 7, in the church hall
- :car: Lifts | To the hospital, the surgery and the big supermarket
- :phone: A phone tree | Someone rings every morning, if you would like it

# Ask

Text or ring Marcus on 07700 900417, or email. We will find someone the same day and tell you their name.

> :phone: Ring Marcus | tel:+447700900417
> :mail: Email the group | mailto:help@elmstreet.example

# Offer

Tell us what you can do and when. An hour a month is a real help.

- :car: Drivers | Weekday mornings most of all
- :package: The pantry | Sorting on Wednesdays, opening on Thursdays
- :phone: Callers | Ten minutes, five mornings a week

\`\`\`todo
- [x] Fifty tins of soup from the school harvest festival
- [x] A second freezer for the hall
- [ ] Two more Thursday volunteers before Christmas
- [ ] Nappies, sizes 4 and 5
- [ ] A driver for Tuesday mornings
\`\`\`

> :heart: Say you can help | mailto:offer@elmstreet.example
`;

const CLUB = `---
theme: candy
currency: £
orders: robots@northfieldschool.example
---
# Northfield Robotics Club

Years 7 to 9 build robots out of kits and junk, and then make them race. Tuesdays after school, in the D&T room.

![](https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200)

> :rocket: Join the club | #join
> :trophy: The competition | #the-competition

- :clock: Tuesdays | 3.20 to 4.45 pm, from 3 November
- :users: Twenty places | Ten are left this term
- :gift: Free | The school pays for the kits

# The competition

On **Saturday 20 March 2027** our three teams take their robots to the regional final at the university. Parents are welcome to come and cheer.

- :target: The maze | Out in under two minutes, without a hand on it
- :zap: The sprint | Five metres in a straight line, which is harder than it sounds
- :lightbulb: The idea | A robot that helps someone at school

## Help us get there

The coach costs £340. We are selling club T-shirts, and Year 8 is baking.

Name | Price:money | About
--- | --- | ---
Club T-shirt | 12 | Pink, with the robot on the back
Box of six brownies | 5 | Collect on Friday at the gate

# Join

Fill in the permission slip with a grown-up and bring it to Mr Adeyemi in D3.

> :mail: Ask Mr Adeyemi | mailto:t.adeyemi@northfieldschool.example

\`\`\`todo
- [ ] The signed permission slip
- [ ] Old clothes: there is glue
- [ ] A snack for after school
\`\`\`
`;

const NEWSLETTER = `---
theme: olive
---
# The Allotment Letter

A letter every other Sunday from plot 14 at Fernside Allotments: what to sow, what went wrong, what to do with forty courgettes.

![](https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200)

> :mail: Send it to me | mailto:letter@plot14.example?subject=Subscribe
> :book: Read the last one | #recent-letters

- :leaf: Every other Sunday | Short enough to read with the first cup of tea
- :gift: Free | Always; there is a jar for seed money if you like it
- :x: Leave whenever | One word back to the letter and you are off the list

# Recent letters

- :bookmark: [Garlic goes in now](https://example.com/letters/garlic) | Sunday 4 October 2026
- :bookmark: [The great slug summer](https://example.com/letters/slugs) | Sunday 20 September 2026
- :bookmark: [What to do with forty courgettes](https://example.com/letters/courgettes) | Sunday 6 September 2026

## Who writes it

Hannah Price has had plot 14 since 2019 and has lost to the pigeons every single year.
`;

const COTTAGE = `---
theme: teal serif
---
# Gull Cottage

A fisherman's cottage for four, two minutes up the hill from the harbour at Port Isaac, Cornwall.

![](https://images.unsplash.com/photo-1449844908441-8829872d2607?w=1200)

> :calendar: Ask about dates | #book
> :map-pin: Where it is | #where-it-is

- :home: Sleeps four | A double and a twin, one bathroom
- :dog: Dogs welcome | One well-behaved dog, no charge
- :flame: A wood stove | The first basket of logs is on us

# The cottage

![](https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200)

Downstairs is one room with the kitchen, the stove and a window on the sea. Upstairs, the double looks over the harbour; the twin looks at the hill. There is wifi, a washing machine, and a parking permit for the top car park.

## Prices for a week

Week | Price:money(£) | Per night:money(£)
--- | --- | ---
Winter, November to March | 520 | =B1/7
Spring and autumn | 780 | =B2/7
Summer, July and August | 1150 | =B3/7

Short breaks of three nights from November to March, from £260.

# Book

Changeover is Saturday. Tell us your dates and who is coming; we reply within a day.

> :mail: Email Jenny | mailto:jenny@gullcottage.example
> :phone: Ring Jenny | tel:+441632960227

# Where it is

Trewetha Lane, Port Isaac, PL29 3RU. The nearest station is Bodmin Parkway, forty minutes by taxi.

https://www.openstreetmap.org/?mlat=50.5928&mlon=-4.8292#map=16/50.5928/-4.8292
`;

const TRADES = `---
theme: slate
---
# Pellow & Sons

Plumbing and heating in Truro and twenty miles round, since 1987. Gas Safe registered, number 551203.

![](https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=1200)

> :phone: Call 01872 960 330 | tel:+441872960330
> :mail: Ask for a quote | mailto:quotes@pellowandsons.example

- :wrench: Repairs | Leaks, taps, toilets, the same week
- :flame: Boilers | Fitted, serviced and mended
- :shield: Guaranteed | Two years on every job we do

# Prices

What most jobs cost, with VAT. A quote for anything bigger is free.

Job | Price:money(£)
--- | ---
Call-out and the first hour | 85
Every hour after | 60
Boiler service | 95
Gas safety certificate | 75

## Emergencies

Water coming through the ceiling, or no heat with a baby or someone over eighty in the house: ring any time, day or night.

# About us

Jack Pellow started the firm in 1987. His sons Danny and Rob run it now, with two apprentices from Truro College.

- :star: Rated 4.9 | From 212 reviews on the council's trusted trader list
- :truck: Three vans | So someone is usually near you
`;

const YOGA = `---
theme: plum rounded
currency: £
orders: hello@stillwateryoga.example
---
# Still Water Yoga

A small studio over the bike shop on Gloucester Road, Bristol. Twelve mats, slow classes, no mirrors.

![](https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200)

> :calendar: The timetable | #timetable
> :cart: Buy a class pass | #passes

# Timetable

Every class is an hour and a quarter. Come ten minutes early the first time.

- :sun: Monday and Wednesday, 7 am | Wake-up flow, gentle
- :moon: Tuesday and Thursday, 7.30 pm | Slow flow and a long rest
- :heart: Saturday, 10 am | Yoga for beginners, a four-week course
- :baby: Friday, 11 am | Pregnancy yoga, with Amira

# Passes

Mats, blocks and blankets are here; bring water. Passes last three months.

Name | Price:money | About
--- | --- | ---
One class | 12 | Drop in any time there is a mat
Five classes | 55 | £11 a class
Ten classes | 100 | £10 a class
Beginners' course | 40 | Four Saturdays, starting 7 November

## Teachers

Ruth has taught here since the studio opened in 2018. Amira is a midwife and teaches the pregnancy class.

> :mail: Ask about a class | mailto:hello@stillwateryoga.example
`;

const ONE_LINK = `---
look: links
theme: candy
---
# Dee's leaving do

:gift:

Friday 20 November from 6 pm, upstairs at the Ship Inn. Twelve years at the library, and off to Lisbon.

> :mail: Say you are coming | mailto:deesleavingdo@example.com?subject=I%20am%20coming
`;

export const templates = (): Template[] => [
  { id: 'cafe', name: t('A café'), blurb: t('Three pages: the front with what is special, the menu, how to find you.'), doc: CAFE },
  { id: 'shop', name: t('A small shop'), blurb: t('Things for sale with a cart; orders come to you by email.'), doc: SHOP },
  { id: 'event', name: t('An event'), blurb: t('A fair, a festival, a reunion: the dates, the programme, the way there.'), doc: EVENT },
  { id: 'portfolio', name: t('A portfolio'), blurb: t('A photographer’s work page by page, prints for sale, and a way to commission her.'), doc: PORTFOLIO },
  { id: 'wedding', name: t('A wedding'), blurb: t('The day hour by hour, the way there with a map, where to stay, and how to reply.'), doc: WEDDING },
  { id: 'band', name: t('A band'), blurb: t('The new record, the tour with a ticket link for each night, the merch with a cart.'), doc: BAND_SITE },
  { id: 'clinic', name: t('A clinic'), blurb: t('Opening hours, what to do out of hours, the services, and the way in.'), doc: CLINIC },
  { id: 'campaign', name: t('A campaign'), blurb: t('Why it matters in three numbers, what it costs added up, the hearing, and a QR code for the petition.'), doc: CAMPAIGN },
  { id: 'mutual-aid', name: t('A mutual-aid group'), blurb: t('How to ask, how to offer, and what the group needs this month as a list.'), doc: MUTUAL_AID },
  { id: 'club', name: t('A school club'), blurb: t('When it meets, the big day, T-shirts for the coach fund, and what to bring.'), doc: CLUB },
  { id: 'newsletter', name: t('A newsletter sign-up'), blurb: t('What the letter is, one button to subscribe, and the last three letters.'), doc: NEWSLETTER },
  { id: 'cottage', name: t('A holiday cottage'), blurb: t('The rooms, the prices by season worked out per night, how to book, a map.'), doc: COTTAGE },
  { id: 'trades', name: t('A plumber'), blurb: t('A tradesperson’s page: what they do, what it costs, the number to ring in an emergency.'), doc: TRADES },
  { id: 'studio', name: t('A yoga studio'), blurb: t('The week’s classes, passes to buy with a cart, and the teachers.'), doc: YOGA },
  { id: 'links-maker', name: t('Quick Links: a maker'), blurb: t('A picture, a line, the shop, the classes, the inbox; the places you post at the foot.'), doc: MAKER },
  { id: 'links-group', name: t('Quick Links: a group'), blurb: t('A mutual-aid group or a club: how to join, how to help, the next meeting.'), doc: GROUP },
  { id: 'links-band', name: t('Quick Links: a band'), blurb: t('The new record, the dates, the merch, every place the music is.'), doc: BAND },
  { id: 'links-business', name: t('Quick Links: a small business'), blurb: t('Hours, the menu, a table booked, the way there, the phone.'), doc: BUSINESS },
  { id: 'links-writer', name: t('Quick Links: a writer'), blurb: t('The newsletter, the book, the latest piece, and a way to say hello.'), doc: WRITER },
  { id: 'links-one', name: t('Quick Links: one link'), blurb: t('One thing to say and one button: a party, a petition, a sign-up.'), doc: ONE_LINK },
];
