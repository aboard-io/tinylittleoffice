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
green: Sam
orange: Ana
blue: Everyone
---
- 2026-11-03 16:30-17:15: Swim lesson, Sam {color=green every=week times=10}
- 2026-11-04: Trash and recycling out tonight {every=week}
- 2026-11-05 18:30-20:00: Parent-teacher night, bring the reading log {color=blue}
- 2026-11-07 10:00-11:30: Soccer, under-10s home game {color=green every=week until=2026-12-12}
- 2026-11-09: Ana's birthday {color=orange every=year}
- 2026-11-12 08:40-09:20: Dentist, Dr. Patel, both kids {color=blue}
- 2026-11-21 to 2026-11-22: Grandma visits from Philadelphia {color=blue}
- 2026-11-26: Thanksgiving at Aunt Jo's, bring the pies {color=blue every=year}
- 2026-12-03 19:30-22:00: Book club at Jo's {color=orange every=month}
- 2026-12-23 to 2027-01-01: Winter break {color=green}
`;

const SCHOOL = `---
title: P.S. 84, fall semester 2026
red: School closed
blue: Class 4-201
orange: PTA
green: Clubs
---
- 2026-09-10: **First day of school**, doors open 8:00
- 2026-09-14 14:50-15:50: Chess club, room 6 {color=green every=week until=2026-12-14}
- 2026-09-17 14:50-15:50: Soccer club, the yard {color=green every=week until=2026-12-17}
- 2026-09-21: Yom Kippur {color=red}
- 2026-09-24 18:00-19:00: Back-to-school night {color=blue}
- 2026-10-09 14:30-16:00: Bake sale in the lobby {color=orange}
- 2026-10-12: Indigenous Peoples' Day {color=red}
- 2026-10-30: Halloween parade on the yard, costumes welcome
- 2026-11-03: Election Day, no classes {color=red}
- 2026-11-11: Veterans Day {color=red}
- 2026-11-12 13:00-19:00: Parent-teacher conferences ^[Ten-minute slots: sign up with the office by Friday, November 6.] {color=blue}
- 2026-11-18: Picture day: retakes in December
- 2026-11-20: Food drive: bring a can for the food bank
- 2026-11-24: Field trip to the American Museum of Natural History, bag lunch {color=blue}
- 2026-11-26 to 2026-11-27: Thanksgiving break {color=red}
- 2026-12-05 11:00-14:00: Winter fair {color=orange}
- 2026-12-17 13:00-14:00: Winter concert, grades K to 2, in the auditorium
- 2026-12-23 to 2027-01-01: Winter break {color=red}
- 2027-01-04: Classes start again
`;

const BILLS = `---
title: Bills and renewals, 12 Ashford Street
blue: Autopay
orange: Renewals
red: Deadlines
---
- 2026-11-01: Rent, $2,150 to Mr. Harris {color=blue every=month}
- 2026-11-05: Car payment, $312 (the last of 36 in January) {color=blue every=month times=3}
- 2026-11-12: Cell phone, $45 {color=blue every=month}
- 2026-11-15: Gas and electric, $118 {color=blue every=month}
- 2026-11-20: Internet, $60, until the promo price ends {color=blue every=month until=2027-05-20}
- 2026-11-28: Car insurance renews: get three quotes first ^[Last year's was $1,240; the renewal notice came at $1,496.] {color=orange every=year}
- 2026-11-30: Furnace tune-up: call Kev Doyle at (718) 555-0132 {color=orange every=year}
- 2026-12-01: Renters insurance, $174 {color=orange every=year}
- 2027-01-15: Quarterly estimated tax, the last for 2026 {color=red every=year}
- 2027-04-15: Taxes due: federal and state returns {color=red every=year}
`;

const SHIFTS = `---
title: Northside Food Bank volunteers, the Bronx
green: Priya
blue: Tom
orange: Mags
purple: Dev
---
- 2026-11-04 17:30-19:30: Packing bags: Mags {color=orange}
- 2026-11-07 09:30-12:30: Sorting donations: Priya {color=green}
- 2026-11-07 12:30-15:30: Handing out: Tom {color=blue}
- 2026-11-11 17:30-19:30: Packing bags: Dev {color=purple}
- 2026-11-14 09:30-12:30: Sorting donations: Tom {color=blue}
- 2026-11-14 12:30-15:30: Handing out: Mags {color=orange}
- 2026-11-18 17:30-19:30: Packing bags: Priya {color=green}
- 2026-11-21 09:30-12:30: Sorting donations: Dev {color=purple}
- 2026-11-21 12:30-15:30: Turkey giveaway: Priya {color=green}
- 2026-11-25 17:30-19:30: Packing bags: Tom {color=blue}
- 2026-11-28 09:30-12:30: Sorting donations: Mags {color=orange}
- 2026-11-28 12:30-15:30: Handing out: Dev {color=purple}
- 2026-12-02 17:30-19:30: Packing bags: Mags {color=orange}
- 2026-12-05 09:30-12:30: Sorting donations: Priya {color=green}
- 2026-12-05 12:30-15:30: Handing out: Tom {color=blue}
- 2026-12-12 10:00-13:00: Food drive at the supermarket on Grand Concourse, everyone
- 2026-12-23 10:00-14:00: **Holiday boxes**, everyone, cocoa after
`;

const HOLIDAYS = `---
title: Fernhill Design, time off 2026 to 2027
green: Lena
blue: Marcus
orange: Joy
purple: Priya
red: Studio closed
---
- 2026-11-26 to 2026-11-27: Thanksgiving {color=red}
- 2026-12-07 to 2026-12-11: Lena, Lisbon {color=green}
- 2026-12-14 to 2026-12-15: Marcus, moving apartments {color=blue}
- 2026-12-18: Holiday dinner, the Anchor, 7 pm
- 2026-12-24 to 2027-01-01: Studio closed, back Monday, January 4 ^[The days between the holidays come out of everyone's fifteen.] {color=red}
- 2027-01-18: Martin Luther King Jr. Day {color=red}
- 2027-01-18 to 2027-01-29: Joy, Kerala {color=orange}
- 2027-02-15: Presidents' Day {color=red}
- 2027-02-16 to 2027-02-19: Marcus, the kids' winter recess {color=blue}
- 2027-04-06 to 2027-04-09: Lena {color=green}
- 2027-05-31: Memorial Day {color=red}
- 2027-06-21 to 2027-07-02: Priya, Japan {color=purple}
- 2027-07-05: Independence Day, observed {color=red}
`;

const FIXTURES = `---
title: Riverside Rockets, fall soccer league
green: Home
blue: Away
red: Playoffs
---
- 2026-09-15 18:00-19:30: Practice, Riverside Park, field 2 {every=week until=2026-11-17}
- 2026-09-19 10:00-11:00: vs. Harlem Hawks {color=green}
- 2026-09-26 11:30-12:30: at Inwood Comets, carpool from the school at 10:15 {color=blue}
- 2026-10-03 10:00-11:00: vs. Morningside Bees {color=green}
- 2026-10-10 14:00-15:00: at Hudson Heights Swifts {color=blue}
- 2026-10-17 10:00-11:00: vs. Washington Heights Flyers {color=green}
- 2026-10-24 12:00-13:00: at Randall's Island Foxes {color=blue}
- 2026-11-07 10:00-11:00: Playoffs, round one {color=red}
- 2026-11-21 17:00-20:00: **End-of-season party and trophies**, the pizzeria on Broadway, back room
`;

const GARDEN = `---
title: Plot 14, Elm Street community garden
green: Sow
blue: Plant
orange: Harvest
purple: Jobs
---
- 2026-10-10 to 2026-11-30: Pull the carrots and leeks, sweeter after a frost {color=orange every=year}
- 2026-10-17 to 2026-10-31: Plant garlic, a hardneck, 6 inches apart {color=blue every=year}
- 2026-10-24: Order seeds and seed potatoes ^[Yukon Gold and fingerling potatoes; Sungold tomatoes; Kentucky Wonder pole beans.] {color=purple every=year}
- 2026-11-07: Tulip bulbs along the path {color=blue every=year}
- 2026-11-14 to 2026-11-15: Clear the beans, compost the vines, mulch the beds {color=purple every=year}
- 2026-12-05 to 2026-12-20: Prune the apple trees for winter {color=purple every=year}
- 2027-01-01: Plot dues, $45 to the treasurer {every=year}
- 2027-02-20 to 2027-03-06: Sprout the seed potatoes on the windowsill {color=purple every=year}
- 2027-03-13 to 2027-03-27: Start tomatoes and peppers indoors {color=green every=year}
- 2027-03-20 to 2027-04-03: Sow peas, spinach and beets outside {color=green every=year}
- 2027-04-03 to 2027-04-17: Plant the early potatoes {color=blue every=year}
- 2027-05-15 to 2027-05-29: Set out tomatoes and zucchini, the last frost past {color=blue every=year}
- 2027-06-15 to 2027-07-31: Peas and new potatoes {color=orange every=year}
- 2027-07-15 to 2027-09-30: Tomatoes, pole beans, zucchini {color=orange every=year}
- 2027-08-21 10:00-16:00: Harvest fair: the biggest pumpkin wins a ribbon {every=year}
`;

const CONTENT = `---
title: Crumb & Co., posts for the winter
orange: Instagram
blue: Newsletter
green: Blog
purple: In the bakery
red: Closed
---
- 2026-11-02: Bake of the week, a photo at opening {color=orange every=week until=2026-12-21}
- 2026-11-05 07:00: Newsletter: what's in the oven this month {color=blue every=month times=2}
- 2026-11-12: Blog: feeding a sourdough starter, step by step {color=green}
- 2026-11-19: Reel: laminating the croissant dough, in forty seconds {color=orange}
- 2026-11-23 to 2026-11-29: Holiday preorders open: pin the post, a sign at the register {color=purple}
- 2026-11-26: Blog: Oma's stollen, the recipe at last {color=green}
- 2026-12-01: Advent: a door a day on stories {color=orange every=day times=24}
- 2026-12-12 09:00-15:00: Holiday market booth, Union Square {color=purple}
- 2026-12-19 07:00: Newsletter: last orders for Christmas, by Tuesday noon {color=blue}
- 2026-12-24 to 2026-12-27: Closed: an out-of-office post and a thank-you {color=red}
`;

const EDITORIAL = `---
title: Field Notes, issues 14 and 15
blue: Winter, No. 14
green: Spring, No. 15
---
- 2026-10-02: Winter: copy in from the writers {color=blue}
- 2026-10-05 to 2026-10-16: Winter: edit and fact-check {color=blue}
- 2026-10-06 10:00-11:30: Editorial meeting, the back room {every=month times=6}
- 2026-10-19 to 2026-10-30: Winter: layout and pictures {color=blue}
- 2026-11-02 to 2026-11-06: Winter: proofs out to the writers ^[Three business days to reply; no reply is a yes.] {color=blue}
- 2026-11-02: Spring: pitches close {color=green}
- 2026-11-10: Winter: files to Hartley Print {color=blue}
- 2026-11-16 to 2026-11-20: Spring: assign the features {color=green}
- 2026-11-24 18:30-21:00: Winter launch at the Bell House, three readings {color=blue}
- 2026-12-01: **Winter issue on sale** {color=blue}
- 2027-01-15: Spring: copy in from the writers {color=green}
- 2027-01-18 to 2027-02-05: Spring: edit, layout and proofs {color=green}
- 2027-02-16: Spring: files to Hartley Print {color=green}
- 2027-03-01: **Spring issue on sale** {color=green}
`;

const TRAINING = `---
title: Twelve weeks to the Brooklyn Half
view: gantt
orange: Hard weeks
red: Race
---
- 2026-09-21 to 2026-10-18: Base: easy miles
  - [x] 2026-09-21 to 2026-09-27: Week 1: three easy runs, 12 miles
  - [x] 2026-09-28 to 2026-10-04: Week 2: 14 miles, long run 5
  - 2026-10-05 to 2026-10-11: Week 3: 16 miles, long run 6 {done=70%}
  - 2026-10-12 to 2026-10-18: Week 4: an easy week, 12 miles
- 2026-10-19 to 2026-11-15: Build: hills and tempo
  - 2026-10-19 to 2026-11-01: Weeks 5 and 6: hills, 6 × 90 seconds; long run 8 miles {color=orange}
  - 2026-11-02 to 2026-11-15: Weeks 7 and 8: tempo, 20 minutes; long run 9 miles {color=orange}
- 2026-11-16 to 2026-12-06: Peak: race pace
  - 2026-11-16 to 2026-11-29: Weeks 9 and 10: 5 miles at race pace; long run 11 miles {color=orange}
  - 2026-11-30 to 2026-12-06: Week 11: a 5K all out, long run 9 miles
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
title: Open Data NYC 2026
blue: Main hall
orange: Workshop room
green: Breaks
---
- 2026-11-18 19:00-21:00: Speakers' drinks, a bar on Stone Street
- 2026-11-19 08:30-09:15: Registration and coffee {color=green}
- 2026-11-19 09:15-10:15: Welcome, Aisha Rahman; keynote: the bus schedule as public data, Dr. Owen Price {color=blue}
- 2026-11-19 10:30-11:15: Mapping every bench in the Bronx, Tomasz Nowak {color=blue}
- 2026-11-19 10:30-12:00: Workshop: cleaning a city spreadsheet {color=orange}
- 2026-11-19 12:00-13:00: Lunch in the atrium ^[Vegetarian and vegan by default; say at registration if you need something else.] {color=green}
- 2026-11-19 13:00-14:30: Panel: who owns what a city knows {color=blue}
- 2026-11-19 14:45-16:15: Workshop: your first open map {color=orange}
- 2026-11-19 16:30-17:00: Lightning talks, five minutes each {color=blue}
- 2026-11-19 18:30-21:30: Conference dinner, the Lower East Side
- 2026-11-20 09:00-09:45: Keynote: open data people use, Mei Lin {color=blue}
- 2026-11-20 10:00-12:00: Hack morning, teams of four {color=orange}
- 2026-11-20 12:00-13:00: Lunch {color=green}
- 2026-11-20 13:00-14:30: Demos from the hack {color=blue}
- 2026-11-20 14:30-15:00: Prizes and close {color=blue}
`;

const FESTIVAL = `---
title: Brooklyn makers' weekend
blue: Main stage
orange: Workshops
---
- 2027-06-18 18:00-19:00: Doors open, welcome drinks
- 2027-06-18 19:30-21:00: Opening concert: the Gowanus Brass {color=blue}
- 2027-06-19 10:00-12:00: Screen printing workshop {color=orange}
- 2027-06-19 14:00-15:30: Panel: making things in a big city
- 2027-06-19 22:00 to 2027-06-20 02:00: Late set, DJ Marta {color=blue}
- 2027-06-20 11:00-12:30: Bread workshop {color=orange}
- 2027-06-20 17:00: Close and thanks
`;

export const templates = (): Template[] => [
  { id: 'family', name: t('Family calendar'), blurb: t('Lessons, birthdays and holidays, a color for each person, the weekly things repeating.'), doc: FAMILY },
  { id: 'school', name: t('School term'), blurb: t('A fall term from the first day to Christmas: closings, clubs, the trip, parent-teacher conferences.'), doc: SCHOOL },
  { id: 'bills', name: t('Bills and renewals'), blurb: t('Every autopay on its day each month, the yearly renewals and the tax deadlines.'), doc: BILLS },
  { id: 'volunteers', name: t('Volunteer schedule'), blurb: t('Who does which shift, a color for each person, at a food bank before Christmas.'), doc: SHIFTS },
  { id: 'holidays', name: t('Vacation planner'), blurb: t('A small team’s time off, the public holidays and the Christmas closing on one calendar.'), doc: HOLIDAYS },
  { id: 'fixtures', name: t('League schedule'), blurb: t('A youth soccer season: practice every week, home and away in their colors, the playoffs.'), doc: FIXTURES },
  { id: 'garden', name: t('Garden calendar'), blurb: t('A community garden plot’s year: when to sow, plant, harvest and prune, coming around every year.'), doc: GARDEN },
  { id: 'content', name: t('Content schedule'), blurb: t('A bakery’s posts and newsletters through the winter, an advent story every day.'), doc: CONTENT },
  { id: 'editorial', name: t('Editorial calendar'), blurb: t('Two issues of a quarterly from copy to sale, the monthly meeting and the launch.'), doc: EDITORIAL },
  { id: 'training', name: t('Training plan'), blurb: t('Twelve weeks to a half marathon as a schedule: base, build, peak, taper, race.'), doc: TRAINING },
  { id: 'project', name: t('Project plan'), blurb: t('A schedule: phases with their tasks under them, how far along each is, the launch at the end.'), doc: PROJECT },
  { id: 'conference', name: t('Conference agenda'), blurb: t('Two days of talks and workshops by the hour, a color for each room.'), doc: CONFERENCE },
  { id: 'festival', name: t('Festival weekend'), blurb: t('A weekend of sessions at set times, a late set past midnight.'), doc: FESTIVAL },
];
