/**
 * Calendar's templates: Blank is the app's own page (an empty calendar on this month); these are the rest,
 * each a real calendar in TLO, canonical as the kernel writes it so each round-trips byte for byte (the
 * corpus test holds every one). The order is the dropdown's: the household first, then groups of people,
 * then the year's seasons, then the work, then the events. templates.md says what each is for.
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';

const FAMILY = `---
title: The Okafor family
zone: Europe/London
green: Sam
orange: Ana
blue: Everyone
---
- 2026-11-03 16:30-17:15: Swimming lesson, Sam {color=green every=week times=10}
- 2026-11-04: Bins out, garden waste too {every=week}
- 2026-11-05 18:30-20:00: Bonfire night at Victoria Park, bring gloves {color=blue}
- 2026-11-07 10:00-11:30: Football, under-10s home game {color=green every=week until=2026-12-12}
- 2026-11-09: Ana's birthday {color=orange every=year}
- 2026-11-12 08:40-09:20: Dentist, Dr Patel, both children {color=blue}
- 2026-11-21 to 2026-11-22: Grandma visits from Leeds {color=blue}
- 2026-11-26 19:30-22:00: Book club at Jo's {color=orange every=month}
- 2026-12-19 to 2027-01-04: Christmas holidays {color=green}
`;

const SCHOOL = `---
title: Hillside Primary, autumn term 2026
zone: Europe/London
red: School closed
blue: Maple class (Year 4)
orange: PTA
green: Clubs
---
- 2026-09-01: INSET day {color=red}
- 2026-09-02: **First day of term**, gates open 8:40
- 2026-09-07 15:15-16:15: Chess club, room 6 {color=green every=week until=2026-12-14}
- 2026-09-10 15:15-16:15: Football club, the top field {color=green every=week until=2026-12-17}
- 2026-09-17 18:00-19:00: Meet the teacher {color=blue}
- 2026-09-25: Harvest festival: bring a tin for the food bank
- 2026-10-09 15:30-17:00: Cake sale in the playground {color=orange}
- 2026-10-26 to 2026-10-30: Half term {color=red}
- 2026-11-02: INSET day {color=red}
- 2026-11-11 15:40-18:30: Parents' evening ^[Ten-minute slots: book one with the office by Friday 6 November.] {color=blue}
- 2026-11-20: Children in Need: wear something spotty, £1
- 2026-11-24: Trip to the Roman Baths, packed lunch {color=blue}
- 2026-12-05 11:00-14:00: Christmas fair {color=orange}
- 2026-12-15 14:00-15:00: Nativity, Key Stage 1, in the hall
- 2026-12-18: Last day of term, 1:30 finish
- 2026-12-21 to 2027-01-01: Christmas holidays {color=red}
- 2027-01-05: Spring term starts
`;

const BILLS = `---
title: Bills and renewals, 12 Ash Grove
blue: Direct debits
orange: Renewals
red: Deadlines
---
- 2026-11-01: Rent, £1,250 to Mr Harris {color=blue every=month}
- 2026-11-03: Council tax, £148 (the last of ten in January) {color=blue every=month times=3}
- 2026-11-12: Phone, £18 {color=blue every=month}
- 2026-11-15: Gas and electricity, £96 {color=blue every=month}
- 2026-11-20: Broadband, £29, until the contract ends {color=blue every=month until=2027-05-20}
- 2026-11-28: Car insurance renews: get three quotes first ^[Last year's was £412; the renewal letter came at £498.] {color=orange every=year}
- 2026-11-30: Boiler service: ring Kev Doyle on 0117 496 0321 {color=orange every=year}
- 2026-12-01: TV licence, £174.50 {color=orange every=year}
- 2027-01-31: Self Assessment: the tax return and the payment {color=red every=year}
- 2027-03-14: MOT for the Fiesta {color=red every=year}
`;

const ROTA = `---
title: Northside Food Bank volunteers
zone: Europe/London
green: Priya
blue: Tom
orange: Mags
purple: Dev
---
- 2026-11-04 17:30-19:30: Packing parcels: Mags {color=orange}
- 2026-11-07 09:30-12:30: Sorting donations: Priya {color=green}
- 2026-11-07 12:30-15:30: Handing out: Tom {color=blue}
- 2026-11-11 17:30-19:30: Packing parcels: Dev {color=purple}
- 2026-11-14 09:30-12:30: Sorting donations: Tom {color=blue}
- 2026-11-14 12:30-15:30: Handing out: Mags {color=orange}
- 2026-11-18 17:30-19:30: Packing parcels: Priya {color=green}
- 2026-11-21 09:30-12:30: Sorting donations: Dev {color=purple}
- 2026-11-21 12:30-15:30: Handing out: Priya {color=green}
- 2026-11-25 17:30-19:30: Packing parcels: Tom {color=blue}
- 2026-11-28 09:30-12:30: Sorting donations: Mags {color=orange}
- 2026-11-28 12:30-15:30: Handing out: Dev {color=purple}
- 2026-12-02 17:30-19:30: Packing parcels: Mags {color=orange}
- 2026-12-05 09:30-12:30: Sorting donations: Priya {color=green}
- 2026-12-05 12:30-15:30: Handing out: Tom {color=blue}
- 2026-12-12 10:00-13:00: Supermarket collection at the Co-op, everyone
- 2026-12-23 10:00-14:00: **Christmas hampers**, everyone, mince pies after
`;

const HOLIDAYS = `---
title: Fernhill Design, time off 2026 to 2027
green: Lena
blue: Marcus
orange: Joy
purple: Priya
red: Studio closed
---
- 2026-12-07 to 2026-12-11: Lena, Lisbon {color=green}
- 2026-12-14 to 2026-12-15: Marcus, moving flat {color=blue}
- 2026-12-18: Christmas dinner, the Anchor, 7 pm
- 2026-12-24 to 2027-01-01: Studio closed, back Monday 4 January ^[The three days between the bank holidays come out of everyone's twenty-five.] {color=red}
- 2027-01-18 to 2027-01-29: Joy, Kerala {color=orange}
- 2027-02-15 to 2027-02-19: Marcus, half term with the children {color=blue}
- 2027-03-26: Good Friday {color=red}
- 2027-03-29: Easter Monday {color=red}
- 2027-04-06 to 2027-04-09: Lena {color=green}
- 2027-05-03: Early May bank holiday {color=red}
- 2027-05-31: Spring bank holiday {color=red}
- 2027-06-21 to 2027-07-02: Priya, Japan {color=purple}
`;

const FIXTURES = `---
title: Riverside Netball, winter league
zone: Europe/London
green: Home
blue: Away
red: County cup
---
- 2026-10-13 19:00-20:30: Training, Riverside Leisure Centre, court 2 {every=week until=2026-12-15}
- 2026-10-17 10:00-11:00: v Hartcliffe Hawks {color=green}
- 2026-10-24 11:30-12:30: at Kingswood Comets, minibus from the car park at 10:15 {color=blue}
- 2026-11-07 10:00-11:00: v Bedminster Belles {color=green}
- 2026-11-14 14:00-15:00: at Clifton Swifts {color=blue}
- 2026-11-21 10:00-11:00: Round two v Yate Flyers {color=red}
- 2026-11-28 10:00-11:00: v Southmead Stars {color=green}
- 2026-12-05 12:00-13:00: at Fishponds Foxes {color=blue}
- 2026-12-12 19:00-23:00: **Christmas do and awards**, the Red Lion, upstairs
`;

const GARDEN = `---
title: Plot 14, Elm Vale allotments
zone: Europe/London
green: Sow
blue: Plant
orange: Harvest
purple: Jobs
---
- 2026-10-10 to 2026-11-30: Lift parsnips and leeks, sweeter after a frost {color=orange every=year}
- 2026-10-17 to 2026-10-31: Plant garlic, Germidour, 15 cm apart {color=blue every=year}
- 2026-10-24: Order seeds and seed potatoes ^[Charlotte and Pink Fir Apple potatoes; Sungold tomatoes; Crimson Flowered broad beans.] {color=purple every=year}
- 2026-11-07: Tulip bulbs along the path {color=blue every=year}
- 2026-11-14 to 2026-11-15: Clear the beans, compost the haulm, mulch the beds {color=purple every=year}
- 2026-12-05 to 2026-12-20: Winter-prune the apple trees {color=purple every=year}
- 2027-01-01: Plot rent due, £45 to the secretary {every=year}
- 2027-02-20 to 2027-03-06: Chit the seed potatoes on the windowsill {color=purple every=year}
- 2027-03-13 to 2027-03-27: Sow tomatoes and chillies indoors {color=green every=year}
- 2027-03-20 to 2027-04-03: Sow broad beans, peas and beetroot outside {color=green every=year}
- 2027-04-03 to 2027-04-17: Plant the first earlies {color=blue every=year}
- 2027-05-15 to 2027-05-29: Plant out tomatoes and courgettes, the last frost past {color=blue every=year}
- 2027-06-15 to 2027-07-31: Broad beans and new potatoes {color=orange every=year}
- 2027-07-15 to 2027-09-30: Tomatoes, runner beans, courgettes {color=orange every=year}
- 2027-08-21 10:00-16:00: Open day and show: the heaviest marrow wins a cup {every=year}
`;

const CONTENT = `---
title: Crumb & Co., posts for the winter
zone: Europe/London
orange: Instagram
blue: Newsletter
green: Blog
purple: In the shop
red: Closed
---
- 2026-11-02: Bake of the week, a photo at opening {color=orange every=week until=2026-12-21}
- 2026-11-05 07:00: Newsletter: what's in the oven this month {color=blue every=month times=2}
- 2026-11-12: Blog: feeding a sourdough starter, step by step {color=green}
- 2026-11-19: Reel: laminating the croissant dough, in forty seconds {color=orange}
- 2026-11-23 to 2026-11-29: Christmas pre-orders open: pin the post, a sign at the till {color=purple}
- 2026-11-26: Blog: Oma's stollen, the recipe at last {color=green}
- 2026-12-01: Advent: a door a day on stories {color=orange every=day times=24}
- 2026-12-12 09:00-15:00: Market stall, Kingsdown Square {color=purple}
- 2026-12-19 07:00: Newsletter: last orders for Christmas, by Tuesday noon {color=blue}
- 2026-12-24 to 2026-12-27: Closed: an out-of-office post and a thank-you {color=red}
`;

const EDITORIAL = `---
title: Field Notes, issues 14 and 15
zone: Europe/London
blue: Winter, No. 14
green: Spring, No. 15
---
- 2026-10-02: Winter: copy in from the writers {color=blue}
- 2026-10-05 to 2026-10-16: Winter: edit and fact-check {color=blue}
- 2026-10-06 10:00-11:30: Editorial meeting, the back room {every=month times=6}
- 2026-10-19 to 2026-10-30: Winter: layout and pictures {color=blue}
- 2026-11-02 to 2026-11-06: Winter: proofs out to the writers ^[Three working days to reply; no reply is a yes.] {color=blue}
- 2026-11-02: Spring: pitches close {color=green}
- 2026-11-10: Winter: files to Hartley Print {color=blue}
- 2026-11-16 to 2026-11-20: Spring: commission the features {color=green}
- 2026-11-26 18:30-21:00: Winter launch at the Bell, three readings {color=blue}
- 2026-12-01: **Winter issue on sale** {color=blue}
- 2027-01-15: Spring: copy in from the writers {color=green}
- 2027-01-18 to 2027-02-05: Spring: edit, layout and proofs {color=green}
- 2027-02-16: Spring: files to Hartley Print {color=green}
- 2027-03-01: **Spring issue on sale** {color=green}
`;

const TRAINING = `---
title: Twelve weeks to the Valley Half
view: gantt
orange: Hard weeks
red: Race
---
- 2026-09-21 to 2026-10-18: Base: easy miles
  - [x] 2026-09-21 to 2026-09-27: Week 1: three easy runs, 20 km
  - [x] 2026-09-28 to 2026-10-04: Week 2: 23 km, long run 8 km
  - 2026-10-05 to 2026-10-11: Week 3: 26 km, long run 10 km {done=70%}
  - 2026-10-12 to 2026-10-18: Week 4: an easy week, 20 km
- 2026-10-19 to 2026-11-15: Build: hills and tempo
  - 2026-10-19 to 2026-11-01: Weeks 5 and 6: hills, 6 × 90 seconds; long run 12 km {color=orange}
  - 2026-11-02 to 2026-11-15: Weeks 7 and 8: tempo, 20 minutes; long run 15 km {color=orange}
- 2026-11-16 to 2026-12-06: Peak: race pace
  - 2026-11-16 to 2026-11-29: Weeks 9 and 10: 8 km at race pace; long run 18 km {color=orange}
  - 2026-11-30 to 2026-12-06: Week 11: parkrun flat out, long run 14 km
- 2026-12-07 to 2026-12-12: Taper: short, easy, early nights
- 2026-12-13: Race day: 9 am start, 1:55 the goal {color=red}
`;

const PROJECT = `---
title: A website for Hollow Pine Coffee
view: gantt
---
- 2026-09-28 to 2026-10-09: Discovery
  - [x] 2026-09-28 to 2026-09-30: Interviews with the staff and six regulars
  - [x] 2026-10-01 to 2026-10-02: Analytics review
  - 2026-10-05 to 2026-10-09: Content audit {done=80%}
- 2026-10-12 to 2026-10-30: Design
  - 2026-10-12 to 2026-10-16: Wireframes
  - 2026-10-16: The logo chosen {color=red}
  - 2026-10-19 to 2026-10-30: Visual design
- 2026-11-02 to 2026-11-20: Build
  - 2026-11-02 to 2026-11-13: Pages and the menu {color=blue}
  - 2026-11-09 to 2026-11-13: Ordering ahead {color=blue}
  - 2026-11-16 to 2026-11-20: Testing on phones {color=blue}
- 2026-11-24: Launch {color=red}
`;

const CONFERENCE = `---
title: Open Data North 2026, Manchester
zone: Europe/London
blue: Main hall
orange: Workshop room
green: Breaks
---
- 2026-11-18 19:00-21:00: Speakers' drinks, the Briton's Protection
- 2026-11-19 08:30-09:15: Registration and coffee {color=green}
- 2026-11-19 09:15-10:15: Welcome, Aisha Rahman; keynote: the bus timetable as public data, Dr Owen Price {color=blue}
- 2026-11-19 10:30-11:15: Mapping every bench in Salford, Tomasz Nowak {color=blue}
- 2026-11-19 10:30-12:00: Workshop: cleaning a council spreadsheet {color=orange}
- 2026-11-19 12:00-13:00: Lunch in the atrium ^[Vegetarian and vegan by default; say at registration if you need something else.] {color=green}
- 2026-11-19 13:00-14:30: Panel: who owns what a city knows {color=blue}
- 2026-11-19 14:45-16:15: Workshop: your first open map {color=orange}
- 2026-11-19 16:30-17:00: Lightning talks, five minutes each {color=blue}
- 2026-11-19 18:30-21:30: Conference dinner, Ancoats
- 2026-11-20 09:00-09:45: Keynote: open data people use, Mei Lin {color=blue}
- 2026-11-20 10:00-12:00: Hack morning, teams of four {color=orange}
- 2026-11-20 12:00-13:00: Lunch {color=green}
- 2026-11-20 13:00-14:30: Demos from the hack {color=blue}
- 2026-11-20 14:30-15:00: Prizes and close {color=blue}
`;

const FESTIVAL = `---
title: Lisbon makers' weekend
zone: Europe/Lisbon
blue: Main stage
orange: Workshops
---
- 2027-06-18 18:00-19:00: Doors open, welcome drinks
- 2027-06-18 19:30-21:00: Opening concert: Lisbon Brass {color=blue}
- 2027-06-19 10:00-12:00: Screen printing workshop {color=orange}
- 2027-06-19 14:00-15:30: Panel: making things in small cities
- 2027-06-19 22:00 to 2027-06-20 02:00: Late set, DJ Marta {color=blue}
- 2027-06-20 11:00-12:30: Bread workshop {color=orange}
- 2027-06-20 17:00: Close and thanks
`;

export const templates = (): Template[] => [
  { id: 'family', name: t('Family calendar'), blurb: t('Lessons, birthdays and holidays, a colour for each person, the weekly things repeating.'), doc: FAMILY },
  { id: 'school', name: t('School term'), blurb: t('An autumn term from the first day to Christmas: closures, clubs, the trip, parents’ evening.'), doc: SCHOOL },
  { id: 'bills', name: t('Bills and renewals'), blurb: t('Every direct debit on its day each month, the yearly renewals and the tax deadline.'), doc: BILLS },
  { id: 'rota', name: t('Volunteer rota'), blurb: t('Who does which shift, a colour for each person, at a food bank before Christmas.'), doc: ROTA },
  { id: 'holidays', name: t('Holiday planner'), blurb: t('A small team’s time off, the bank holidays and the Christmas closure on one calendar.'), doc: HOLIDAYS },
  { id: 'fixtures', name: t('League fixtures'), blurb: t('A netball season: training every week, home and away in their colours, the cup.'), doc: FIXTURES },
  { id: 'garden', name: t('Garden calendar'), blurb: t('An allotment’s year: when to sow, plant, harvest and prune, coming round every year.'), doc: GARDEN },
  { id: 'content', name: t('Content schedule'), blurb: t('A bakery’s posts and newsletters through the winter, an advent story every day.'), doc: CONTENT },
  { id: 'editorial', name: t('Editorial calendar'), blurb: t('Two issues of a quarterly from copy to sale, the monthly meeting and the launch.'), doc: EDITORIAL },
  { id: 'training', name: t('Training plan'), blurb: t('Twelve weeks to a half marathon as a schedule: base, build, peak, taper, race.'), doc: TRAINING },
  { id: 'project', name: t('Project plan'), blurb: t('A schedule: phases with their tasks under them, how far along each is, the launch at the end.'), doc: PROJECT },
  { id: 'conference', name: t('Conference agenda'), blurb: t('Two days of talks and workshops by the hour, a colour for each room.'), doc: CONFERENCE },
  { id: 'festival', name: t('Festival weekend'), blurb: t('A weekend of sessions at set times in their own time zone, a late set past midnight.'), doc: FESTIVAL },
];
