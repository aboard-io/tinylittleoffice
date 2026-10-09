/**
 * Calendar's templates: Blank is the app's own page (an empty calendar on this month); these are the rest,
 * each a real calendar in TLO, canonical as the kernel writes it so each round-trips byte for byte (the
 * corpus test holds every one).
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';

const FAMILY = `---
zone: Europe/London
green: Sam
orange: Ana
---
- 2027-03-02 16:30-17:15: Swimming lesson {color=green every=week times=10}
- 2027-03-05: Ana's birthday {color=orange every=year}
- 2027-03-09 08:40-09:20: Dentist, Dr Patel {color=green}
- 2027-03-13 10:00-12:00: Football, home game {color=green every=week until=2027-05-22}
- 2027-03-20 to 2027-03-21: Grandma visits
- 2027-03-24: Bins out, garden waste too {every=week}
- 2027-03-29 to 2027-04-09: Easter holidays {color=green}
- 2027-04-01 19:30-22:00: Book club {color=orange every=month}
`;

const PROJECT = `---
view: gantt
---
- 2027-03-01 to 2027-03-12: Discovery
  - [x] 2027-03-01 to 2027-03-03: Stakeholder interviews
  - [x] 2027-03-04 to 2027-03-05: Analytics review
  - 2027-03-08 to 2027-03-12: Content audit {done=60%}
- 2027-03-15 to 2027-04-02: Design
  - 2027-03-15 to 2027-03-19: Wireframes {done=20%}
  - 2027-03-22 to 2027-04-02: Visual design
- 2027-04-05 to 2027-04-23: Build
  - 2027-04-05 to 2027-04-16: Templates and pages {color=blue}
  - 2027-04-19 to 2027-04-23: Testing on phones {color=blue}
- 2027-04-26: Launch {color=red}
`;

const FESTIVAL = `---
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
  { id: 'project', name: t('Project plan'), blurb: t('A schedule: phases with their tasks under them, how far along each is, the launch at the end.'), doc: PROJECT },
  { id: 'festival', name: t('Festival weekend'), blurb: t('A weekend of sessions at set times in their own time zone, a late set past midnight.'), doc: FESTIVAL },
];
