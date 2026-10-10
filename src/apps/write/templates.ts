/**
 * Write's templates: Blank is the app's own page; these are the rest, each a real document in TLO with
 * real sample data (the studio by the harbour), canonical as the kernel writes it so each round-trips byte
 * for byte (the corpus test holds every one). The contract ends in a signatures fence, a table of
 * Name | Key | Signature | Signed that Sign this contract fills (contract.ts). The invoice is a text whose fields are head
 * fields and whose lines are a table block the formula engine works out in place: Amount is =Qty×Price
 * and locked, the blank row under the lines is inside the subtotal's reach so a line added there is
 * summed, and the tax rate sits in its own row's Qty cell, where a formula can read it.
 */
import type { Template } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';

const LETTER = `Mara Quill {.right}
Harbor Studio, 14 Quay Street {.right}
Portland, ME 04101 {.right}
mara@harborstudio.example {.right}

2 October 2026

Dear Ms Okafor,

Thank you for coming to see the studio last week. I am writing to set down what we agreed, so that we both have it in one place.

We will design and build the new site for Acme Ltd between October and December, for the fee in the invoice that comes with this letter. You will send the words for the six pages by 16 October, and we will show you a first version by 6 November.

If anything here is not as you remember it, do say, and I will put it right. I look forward to the work.

Yours sincerely,

<br>

Mara Quill
`;

const MEETING = `# Launch meeting {.title}

*Monday 5 October 2026 · The studio · Mara, Sam, Dee*

## Agenda

1. Where the site stands
2. The words for the pages
3. Launch day

## Notes

The build is on time: four of the six pages are done. Sam has the words for the home page; the other five are still with Acme.

## Decisions

- We launch on Friday 4 December at ten in the morning.
- Dee owns the launch checklist.

## Actions

- [ ] Sam: chase Acme for the five pages by 16 October
- [ ] Mara: send the invoice for the first half
- [x] Dee: book the launch call
`;

const RESUME = `# Ada Lovelace {.title}

London · ada@example.com · example.com/ada

## Experience

**Analyst, Analytical Engine** (1842 to 1843)

- Wrote the first published program, for computing Bernoulli numbers
- Translated and annotated Menabrea's paper, tripling its length

## Education

Tutored in mathematics by Mary Somerville and Augustus De Morgan

## Skills

- Mathematics, music, French, explaining machines to people
`;

const CONTRACT = `# Dog-walking agreement {.title}

Between Paul Ford and Sam Reyes, from Monday 2 November 2026.

## What is agreed

- Sam walks Biscuit every weekday at noon, for half an hour.
- Paul pays $20 a walk, on Fridays, by transfer.
- Either can end this with a week's notice.

## Signed

\`\`\`signatures
Name | Key | Signature | Signed
--- | --- | --- | ---
\`\`\`
`;

const INVOICE = `---
from: Harbor Studio | 14 Quay Street | Portland, ME 04101
to: Acme Ltd | Accounts payable | 9 High Street, Bath
number: 0042
date: 2026-10-02
due: 2026-11-01
currency: $
terms: Payment within 30 days by bank transfer.
---
# Invoice {.title}

What | Qty:number | Units | Price:money | Amount:money
--- | --- | --- | --- | ---
Design | 12 | hours | 150 | =B1*D1
Build | 20 | hours | 140 | =B2*D2
Hosting for a year | 1 |  | 480 | =B3*D3
| |  |  |  |
Subtotal |  |  |  | =SUM(E1:E4)
Tax | 8 | % |  | =E5*B6/100
Total |  |  |  | =E5+E6
{lock=E1:E7}

Thank you for your business.
`;

const MEMO = `# Memo {.title}

**To:** Everyone at Harbor Studio
**From:** Mara Quill
**Date:** Monday 12 October 2026
**Subject:** The studio closes early on Fridays from November

## In short

From Friday 6 November the studio shuts at three on Fridays. Nobody works fewer hours; we move them to the other four days.

## Why

Over the summer, Friday afternoons brought us 4% of our billed hours and most of our late-night mistakes.^[From the time sheets for June to September: 61 of 1,480 billed hours fell after three on a Friday.] A short Friday is cheaper than a weekend spent putting them right.

## What changes

- Core hours Monday to Thursday become 9:30 to 5:30.
- Client calls are not booked after noon on Fridays.
- The phone goes to Dee's mobile from three until six.

## What we need from you

Move any Friday afternoon calls you have in November by **Wednesday 21 October**, and tell Dee if the new hours do not work for you.
`;

const COVER = `---
look: mixed
---
Priya Raman {.right}
22 Elm Row, Edinburgh EH7 4AA {.right}
priya.raman@example.com · 07700 900481 {.right}

Thursday 15 October 2026

Hiring team
Northlight Books
5 Canongate, Edinburgh EH8 8AA

Dear hiring team,

I am writing to apply for the post of **production editor**, which I saw on the Society of Young Publishers' board on 9 October.

For the last four years I have been an assistant editor at Brae Press, where I saw thirty-two books from manuscript to print. I kept the schedules, briefed the typesetters and proofreaders, and caught a missing chapter on the press proofs of *The Salt Roads* two days before it went to the printer.

Northlight's list is the one I buy from. I would bring the same care to it, and I would like to help with your plan to publish in Gaelic as well as English: I read and write it, and I have edited two short books in it for Brae.

I have attached my CV and would be glad to talk at any time that suits you.

Yours faithfully,

<br>

Priya Raman
`;

const CV = `---
look: mono
---
# Tomás Ferreira {.title}

Lisbon · tomas@ferreira.example · +351 912 345 678

## Now

**Senior backend engineer, Marés Logistics** (2022 to now)

- Rebuilt the route planner that sends 400 vans out each morning; plans now take 9 seconds, not 4 minutes
- Look after the payments service: 1.2 million transfers a month, no lost ones since 2023

## Before

**Engineer, Quinta Digital** (2018 to 2022)

- Built booking systems for eleven hotels on the Algarve
- Ran the team's training: one new hire a quarter, each shipping in their first week

## Education

BSc Computer Science, Universidade de Coimbra, 2018

## Languages and tools

Portuguese, English, Spanish · Go, PostgreSQL, TypeScript, Linux
`;

const PRESS = `# Riverside Library reopens with a makerspace and longer hours {.title}

**FOR IMMEDIATE RELEASE** · Tuesday 20 October 2026

**Hartford, CT.** Riverside Library reopens on Saturday 7 November after a fourteen-month renovation that added a makerspace, a teen room and sixteen more opening hours a week.

The $3.2 million project, paid for by the city and the Friends of Riverside Library, replaced the 1962 roof, made every floor step-free, and turned the old periodicals room into a workshop with two 3D printers, a laser cutter and six sewing machines.

> "People asked for a place to make things and a place to stay late. Now they have both." Lena Ortiz, branch manager

## New hours

Days | Hours
--- | ---
Monday to Thursday | 9 am to 9 pm
Friday and Saturday | 9 am to 6 pm
Sunday | noon to 5 pm

## Opening day

The doors open at ten. There is a ribbon-cutting at eleven, makerspace taster sessions every hour, and cake.

## For the press

Lena Ortiz · lena.ortiz@hartfordlib.example · (860) 555 0142

Photographs of the new rooms: hartfordlib.example/press
`;

const MINUTES = `# Minutes of the Linden Street Tenants' Association {.title}

*Thursday 8 October 2026, 7 pm · Community room, 41 Linden Street*

**Present:** Grace Mbeki (chair), Ray Donnelly (treasurer), Hana Sato (secretary), and 23 members
**Apologies:** Luis Ortega, Bea Kowalski

## 1. Minutes of the last meeting

The minutes of 10 September were read and agreed.

## 2. Treasurer's report

Ray reported the association's money at the end of September.

Item | Amount:money
--- | ---
Balance on 1 September | 1240
Dues received | 315
Printing and postage | -62
Hall hire | -40
Balance on 30 September | =SUM(B1:B4)
{lock=B5}

## 3. The lift at number 43

The lift has been out of service for 19 days. Grace read the landlord's letter promising a repair "in the coming weeks".

**Motion:** that the association writes to the city's housing inspector, asking for an inspection. Proposed by Hana Sato, seconded by Ray Donnelly.

For | Against | Abstained
--- | --- | ---
22 | 1 | 3

The motion was carried.

## 4. Actions

- [ ] Hana: write to the housing inspector by Wednesday 14 October
- [ ] Ray: open the new savings account
- [x] Grace: book the room for November

**Next meeting:** Thursday 12 November 2026, 7 pm, same room.
`;

const RECIPE = `---
look: inverse
---
# Saturday shakshuka {.title}

*Serves 4 · 15 minutes to get ready, 25 to cook*

Eggs poached in a spiced tomato and pepper sauce, eaten from the pan with warm bread. The sauce keeps for three days, so double it.

## What you need

Ingredient | For 4:number | Unit | For 6:number
--- | --- | --- | ---
Olive oil | 3 | tbsp | =B1*1.5
Onion, sliced | 1 | large | =B2*1.5
Red peppers, sliced | 2 |  | =B3*1.5
Garlic, crushed | 3 | cloves | =B4*1.5
Ground cumin | 1 | tsp | =B5*1.5
Smoked paprika | 2 | tsp | =B6*1.5
Chopped tomatoes | 800 | g | =B7*1.5
Eggs | 6 |  | =B8*1.5
Feta | 100 | g | =B9*1.5
{lock=D1:D9}

## How

1. Warm the oil in a wide pan over a medium heat. Cook the onion and peppers for 10 minutes, until soft and sweet.
2. Stir in the garlic and spices for a minute, then the tomatoes and a pinch of salt. Simmer for 10 minutes.
3. Make a hollow in the sauce for each egg and crack one into each. Cover and cook for 6 to 8 minutes, until the whites are set.^[If you like the yolks firm, give them two minutes more with the lid on.]
4. Crumble over the feta, scatter with parsley, and bring the pan to the table.

> Leftover sauce makes a good pasta for Sunday.
`;

const FAQ = `# Questions about the Eastside Community Garden {.title}

*Updated Friday 2 October 2026*

## How do I get a plot?

Put your name on the waiting list at the shed on any Saturday morning, or email plots@eastsidegarden.example. Plots come free in March, and we offer them in the order names went on the list.

## How much does it cost?

A plot is $45 a year, or $15 if you receive SNAP or Medicaid. The money pays for water, tools and the compost delivery.

## What size is a plot?

Four feet by twelve: a raised bed you can reach across from either side. Two people may share one.

## What may I grow?

Vegetables, herbs and flowers. No trees, nothing that spreads by runners (mint goes in a pot), and nothing over six feet tall.

## What do I have to do?

- Keep your plot weeded and planted from April to October.
- Give **four hours a season** to the shared beds and the paths.
- Come to one of the two work days, in April and October.

## Who do I ask about anything else?

Ines Carvalho, the coordinator: ines@eastsidegarden.example, or find her at the shed on Saturdays from nine.
`;

const TERMS = `# Terms of service for Paws on Penn dog walking {.title}

*These terms apply from Sunday 1 November 2026. Paws on Penn is run by Sam Reyes, 210 Penn Avenue, Pittsburgh, PA 15222.*

## 1. What we do

We walk your dog for the length of time you book, in a group of no more than four dogs, within a mile of your home.

## 2. Booking and cancelling

1. Book by 8 pm the day before, by text or on the website.
2. Cancel by 7 am on the day and you pay nothing. Later, you pay half.
3. When we cancel, for weather or illness, you pay nothing.

## 3. Prices

Walk | Price:money
--- | ---
Half an hour | 20
An hour | 32
Puppy visit, 20 minutes | 15

You pay at the end of each week, by transfer. Prices stay the same until at least 1 May 2027.

## 4. Keys and your home

We keep your key in a locked box, labelled with a number and not your address. We go into your home only to collect and return your dog.

## 5. If something goes wrong

We carry insurance for injury to your dog and damage to your home.^[Public liability up to $1,000,000 with Keystone Pet Insurance, policy KPI-55210.] If your dog is hurt or unwell on a walk we call you first and, if we cannot reach you, take your dog to the vet on your form.

## 6. Ending this

Either of us can end this agreement with a week's notice, by text or email.
`;

const NEWSLETTER = `---
look: mixed
---
# The Maple Street News {.title}

*October 2026 · the newsletter of the Maple Street Block Association*

## :calendar: Coming up

Date:date | What | Where
--- | --- | ---
2026-10-17 | Fall clean-up, 9 am to noon | Meet at the corner of Maple and 4th
2026-10-31 | Halloween on the block, 5 to 8 pm | The whole street, closed to cars
2026-11-12 | Association meeting | St Luke's hall, 7 pm

## :heart: Welcome

Welcome to the Adeyemi family at number 38, and to Pepper, their beagle, who has already met everyone.

## :lightbulb: The new streetlights

The city replaces the eight streetlights between 2nd and 6th the week of 26 October. Expect the sidewalk outside your house to be closed for an hour or two. The new lights are LEDs pointed at the ground: brighter on the pavement, darker in your bedroom.

## :coffee: Thank you

To Rosa at the corner bakery, who gave us two hundred cookies for the September potluck, and to the fourteen people who stayed to stack the chairs.

## Get in touch

Write to mailbox@maplestreet.example, or put a note through the door of number 12.
`;

const THESIS = `---
look: book
---
# Tidal Commons: Shellfish Licences and Local Knowledge in Casco Bay, 1990 to 2025 {.title}

A thesis submitted for the degree of Master of Arts in Environmental Studies {.center}

Elena Brandt
University of Southern Maine · May 2026 {.center}

## Abstract

Since 1990 the towns of Casco Bay have kept their clam flats open by limiting how many people may dig on them. This thesis asks how they set those limits, and finds that the number of licences follows the diggers' own counts of the flats far more closely than the state's surveys. It argues that a commons managed from below can be measured, and that the measuring is itself a kind of management.

---

## Chapter 1. The flats

At low tide the mud of Casco Bay holds more soft-shell clams than any other stretch of the Maine coast. Each town owns the flats in front of it, and each decides who may dig there.^[Under the shellfish conservation programme of 12 M.R.S. § 6671, a town that adopts an approved ordinance may limit licences for its own flats.]

Hardin's famous parable predicts what should follow: every digger takes as much as they can, and the flats are ruined. Ostrom's work suggests otherwise: that people who share a resource, and can see one another use it, make and keep rules of their own.^[Ostrom, *Governing the Commons*, 1990, chapter 3.] The towns of Casco Bay are a test of which of them is right.

## Chapter 2. Counting clams

I collected the licence numbers of four towns from their clerks' annual reports, and the diggers' own counts from the minutes of their shellfish committees.

Town | In 1990:number | In 2025:number | Change:percent
--- | --- | --- | ---
Brunswick | 120 | 85 | =ROUND((C1-B1)/B1, 3)
Freeport | 64 | 52 | =ROUND((C2-B2)/B2, 3)
Harpswell | 98 | 90 | =ROUND((C3-B3)/B3, 3)
Yarmouth | 40 | 26 | =ROUND((C4-B4)/B4, 3)
All four | =SUM(B1:B4) | =SUM(C1:C4) | =ROUND((C5-B5)/B5, 3)
{lock=D1:D5}

In every town the licences fell, but they fell least where the diggers counted most often. Harpswell's committee walks its flats every month; Yarmouth's, twice a year.

## Chapter 3. What the diggers know

The diggers I interviewed could say which flats had been seeded, which were closed after rain, and which were "tired". None of this appears in the state's surveys, which visit each flat once every three years.^[Interviews with eleven diggers, January to March 2026, recorded with their consent.]

## Conclusion

The towns that let their diggers count, and listened to the counts, kept the most of their flats open. The commons did not need to be saved from the people who use it; it needed them to be asked.

## Bibliography

Acheson, James M. *The Lobster Gangs of Maine.* Hanover: University Press of New England, 1988.

Hardin, Garrett. "The Tragedy of the Commons." *Science* 162, no. 3859 (1968): 1243 to 1248.

Ostrom, Elinor. *Governing the Commons: The Evolution of Institutions for Collective Action.* Cambridge: Cambridge University Press, 1990.
`;

const BOOK_REVIEW = `---
look: serif
---
# A town that knows everything, and a heroine who knows too little {.title}

*Middlemarch*, by George Eliot. First published in eight parts, 1871 to 1872. Penguin Classics, 880 pages.

*Reviewed by Jonah Akers for the Fairview Library book club, Wednesday 21 October 2026*

★★★★★ {.center}

Dorothea Brooke wants to do something great with her life, and she marries a dry old scholar because she thinks his great work will be hers. It is not a spoiler to say that it is not. What makes *Middlemarch* more than a sad marriage plot is everyone around her: a young doctor with new ideas and expensive tastes, a banker with a secret, a family waiting for a rich uncle to die, and a whole town that watches, judges and gossips.

Eliot moves between them like a camera that can also read minds. She is funny about all of them and cruel to none. When she stops to tell you what a character does not know about themselves, it stings, because you recognise it.

## What worked

- The doctor's story, Lydgate's, is the best account of money trouble I have read.
- The last page, which I will not quote here, made two of our members cry.

## What did not

It is long, and the middle drags while the town argues about a railway. Our group read it in four sittings across a month, which helped.

> "What do we live for, if it is not to make life less difficult to each other?"

**For the club:** read it. Start in November; you will want the winter.
`;

const NEWS = `---
look: news
---
# Ferry fares to fall by a third as island service is brought back in house {.title}

**By Anna Kowal, transport reporter** · Portland, Maine · Thursday 8 October 2026

Fares on the Casco Bay ferries will fall by a third from January, after the city voted on Tuesday night to stop paying a private company to run the boats and run them itself.

A return trip to Peaks Island, now $11.50, will cost $7.70. Island residents will pay $4.

The council voted 7 to 2 for the change, after a year in which the service was late more often than not. Figures given to the council show the ferries ran on time on fewer than half of their trips in August.

\`\`\`sheet
---
title: Ferries on time, 2026
chart: bar
---
Month | On time:percent
--- | ---
May | 0.71
Jun | 0.63
Jul | 0.52
Aug | 0.47
Sep | 0.55
\`\`\`

"People on the islands set their whole day by that boat," said Councilor Mai Tran, who proposed the change. "It has to come when it says it will."

The city will buy the company's three boats for $6.4 million, paid for by a bond, and take on its 38 crew. Running costs are expected to fall because the city will no longer pay a profit margin, and because it can borrow more cheaply than the company did.

Not everyone is convinced. Councilor Brian Hale, who voted against, said the city had "no experience running boats and no plan for when one breaks down".

The handover is set for Friday 1 January. Season tickets bought before then will be honoured until they run out.
`;

const INTERVIEW = `---
look: mixed
---
# "The kiln decides": a conversation with potter Aiko Mori {.title}

*Interviewed by Felix Grant for* Clay Quarterly *at Mori's studio in Asheville, North Carolina, on Monday 14 September 2026. Edited for length.*

Aiko Mori has fired a wood kiln in the hills outside Asheville for twenty years. Her first solo show in New York opens at the Hedda Gallery on Friday 6 November.

**Felix Grant:** You fire the kiln only twice a year. Why so rarely?

**Aiko Mori:** It takes five days and four people, and eight cords of wood. You cannot do that every weekend. And I need the six months in between to make enough pots to fill it: about four hundred.

**Felix Grant:** What happens in those five days?

**Aiko Mori:** We feed it every few minutes, day and night. The ash flies through the kiln and lands on the pots and melts into glaze. Where a pot sits decides how much ash it gets, so I place every one, but after that the kiln decides.

**Felix Grant:** Do you ever lose a whole firing?

**Aiko Mori:** Once, in 2014. A wall cracked on the third night. We lost almost everything. I kept one bowl from that firing, the only one that survived, and I eat my breakfast from it.

**Felix Grant:** What will people see in New York?

**Aiko Mori:** Sixty pots from the last two firings, mostly jars and tea bowls. And for the first time some large platters, which I have been afraid to make for years because they crack so easily.

**Felix Grant:** What changed?

**Aiko Mori:** I got older. I lose fewer of them to worry now.
`;

const MUSIC = `---
look: inverse
---
# Harbour Lights: *Low Tide Radio* {.title}

**Album review** · Driftwood Records · 11 tracks, 43 minutes · out Friday 16 October 2026

*By Cass Molina*

★★★★☆ {.center}

The Halifax four-piece made their name on loud, fast songs about leaving town. Their third album is about staying, and it is quieter, slower and better.

The opener, "Slack Water", is just Nora Bell's voice and an organ for two minutes before the band come in. It sets the pattern: songs that take their time, and then open out. "Ferry Schedule" is the single and the catchiest thing here, all chiming guitars and a chorus about missing the last boat on purpose.

The middle of the record is its heart. "Mother's Kitchen Radio" was recorded in one take in, as the title says, a kitchen, and you can hear the kettle. "Fog Bank" runs to seven minutes and earns every one.

Not all of it works. "Northern Lights (Reprise)" is a minute of noise that goes nowhere, and the closing track borrows its melody a little too openly from the opener.

## Best tracks

1. Slack Water
2. Fog Bank
3. Ferry Schedule

**For fans of:** The Weakerthans, Big Thief, a long walk by cold water.
`;

const COMPLAINT = `Ruth Abernathy {.right}
7 Orchard Close {.right}
Bristol BS9 3PT {.right}

Wednesday 14 October 2026

Customer Relations Manager
Westway Rail
Temple Gate House
Bristol BS1 6PL

Dear Customer Relations Manager,

**Formal complaint: train 07:42 Bristol Temple Meads to London Paddington, Monday 5 October 2026. Booking reference WR-58821K.**

I am writing to complain about the cancellation of this train, the way it was handled, and my journey afterwards.

## What happened

1. The train was cancelled at 07:38, four minutes before it was due to leave. No reason was given on the boards or by the staff.
2. I was told to take the 08:12, which was so full that I stood for the whole journey of an hour and forty minutes, with a broken wrist in a cast.
3. I arrived in London 52 minutes late and missed a hospital appointment that had taken me eleven weeks to get.

## What I would like

- A full refund of my ticket, £87.40, under your Delay Repay scheme, which covers delays of more than an hour.^[My claim was refused online because the delay "was under 60 minutes". It was 52 minutes to Paddington; it was more than an hour to my appointment, which I missed.]
- The £35 cancellation fee the hospital has charged me.
- A written explanation of why the train was cancelled.

I enclose copies of my ticket, the hospital's letter and its invoice. I would be grateful for a reply within **14 days**, by Wednesday 28 October 2026. If I do not hear from you by then I will take my complaint to the Rail Ombudsman.

Yours faithfully,

<br>

Ruth Abernathy
`;

const POLITICIAN = `---
look: serif
---
Marcus Bell {.right}
1180 Garfield Avenue {.right}
Duluth, MN 55805 {.right}

Monday 19 October 2026

The Honorable Dana Whitfield
State Representative, District 8A
100 Rev. Dr. Martin Luther King Jr. Blvd.
St. Paul, MN 55155

Dear Representative Whitfield,

I live in your district and I am writing to ask you to vote **for** House File 2210, the Safe Routes to School bill, when it comes to the floor next month.

My two children walk to Lincoln Park Elementary. To get there they cross Grand Avenue at 21st, where there is no crossing signal, four lanes of traffic, and a speed limit of 40. Last winter a fourth-grader was hit there. She is recovering, but it could have been either of mine.

HF 2210 would pay for signals and narrower crossings near 140 schools across the state, including Lincoln Park, from money already set aside for roads. It would not raise taxes.

Two hundred and eight parents at our school have signed a letter in support, which I enclose. Our PTA would be glad to show you the crossing at drop-off any morning you are in Duluth.

Will you tell me how you intend to vote? I would be grateful for a reply.

Yours sincerely,

<br>

Marcus Bell
`;

const LOVE = `---
look: serif
---
Lisbon, Saturday 24 October 2026 {.right}

My dear Ana,

It has been eleven days since the airport, and I have started counting the trams instead of the days, because there are more of them and they go faster.

I keep finding you in this city. The café on Rua da Rosa still has your cup by the window; I have not let anyone else use it, which has made me unpopular with the waiter. Last night I walked up to the miradouro where we watched the boats, and a man was playing that song you hum when you think no one is listening. I hummed it too. No one was listening.

I want to tell you the ordinary things, because they are the ones I miss. That the fig tree in the courtyard has dropped all its leaves. That I finally fixed the shelf. That I bought the good olive oil and then could not open it without you there to laugh at me.

Seven weeks until December. I have bought the ticket, and I have kept the receipt in my wallet like a promise.

Write back soon, and tell me something ordinary.

All my love, always,

*Daniel*
`;

const GRANT = `---
look: mixed
---
# Fix-It Saturdays: a repair café for Ashford {.title}

*A proposal to the Kent Community Foundation's Small Grants Fund · from Ashford Repair Collective · Friday 30 October 2026*

## Summary

We ask for **£4,800** to run a free repair café in Ashford's library on the first Saturday of every month for a year. Volunteers will mend the things people bring, from toasters to trousers, and teach them how to do it themselves.

## The need

Ashford households send about 1,900 tonnes of electrical goods and textiles to landfill each year.^[Kent County Council, *Household Waste Report 2025*, table 4.] Many of them could be fixed with a screwdriver and twenty minutes. Our three trial cafés this summer mended 71 of the 96 things brought in.

## What we will do

- Run twelve cafés from January to December 2027, from 10 am to 1 pm.
- Train six new volunteers in safe electrical testing.
- Keep a record of every repair, and share it with the Council.

## The budget

Item | Cost:money
--- | ---
Room hire, 12 sessions at £60 | 720
Tools and spare parts | 1600
Electrical safety tester and training | 1250
Insurance for the year | 480
Publicity and printing | 350
Tea, coffee and biscuits | 400
Total | =SUM(B1:B6)
{lock=B7}

## How we will know it worked

Our aim is 600 items brought in over the year and two in three of them mended. We will report to the Foundation after six months and at the end.

## Contact

Mo Hassan, coordinator · mo@ashfordrepair.example · 07700 900612
`;

const SYLLABUS = `---
look: mixed
---
# HIST 214: Cities and the Sea, 1500 to 1900 {.title}

*Fall 2026 · Tuesdays and Thursdays, 10:30 to 11:45 · Harlow Hall 112*

**Instructor:** Dr. Amara Okonkwo · aokonkwo@college.example
**Office hours:** Wednesdays 2 to 4 pm, Harlow Hall 305, or by appointment

## What this course is about

How did the sea make cities? We follow Lisbon, Amsterdam, Lagos, Boston and Singapore through four centuries of trade, empire, migration and disease, reading what people at the time wrote about them.

## What you will be able to do

- Read a primary source closely and say what it can and cannot tell us.
- Compare two port cities across time.
- Write a short, clear argument backed by evidence.

## Schedule

Week | Dates | Topic | Reading
--- | --- | --- | ---
1 | Sep 1 to 3 | Why ports? | Braudel, extracts
2 | Sep 8 to 10 | Lisbon and the spice trade | Pearson, ch. 1
3 | Sep 15 to 17 | Amsterdam's exchange | De Vries, ch. 4
4 | Sep 22 to 24 | Lagos and the Atlantic | Mann, ch. 2
5 | Sep 29 to Oct 1 | Boston: harbour and revolution | Primary sources pack
6 | Oct 6 to 8 | Midterm week | No reading
7 | Oct 13 to 15 | Cholera and the waterfront | Snow, 1855
8 | Oct 20 to 22 | Singapore, a free port | Huff, ch. 3

## How you are graded

Work | Weight:percent
--- | ---
Two source papers | 0.3
Midterm | 0.2
Final project | 0.35
Participation | 0.15
Total | =SUM(B1:B4)
{lock=B5}

## Policies

Late work loses a third of a grade a day unless you ask for more time before it is due. I will always say yes to a reasonable request.
`;

const ZINE = `---
look: mono
---
# NOTES FROM THE NIGHT BUS {.title}

*an essay for Last Stop #7 · by R. Okafor · October 2026*

The N29 leaves Trafalgar Square at 2:14 and I have been on it most Fridays for three years. I know the drivers by their braking.

Everyone on the night bus is going home from somewhere they would rather not talk about. Cleaners at the end of a shift. Nurses at the start of one. A man in a full suit who always carries a cake box, and has never once opened it.

==Nobody talks, and everybody notices.== When the girl with the green coat stopped coming, three of us looked at her seat for a month.

What I like is that nobody is performing. In the day, a bus is a stage: phones out, faces arranged. At three in the morning the faces come off. People sleep with their mouths open. People cry, a bit, and nobody minds.

The city sells itself on what happens in the light. But it runs on the night bus: on the people it carries to the hospitals and the bakeries and the offices that have to be clean by seven.

So here is my small proposal. Next time you are out late, skip the cab. Sit upstairs at the front. Watch the city do its quiet work.

You will not be the only one watching.

*R.* {.right}
`;

const EULOGY = `---
look: serif
---
# For Margaret Ellen Doyle, 1938 to 2026 {.title}

*Read by her granddaughter, Siobhan, at St Brigid's, Galway, on Saturday 10 October 2026*

Thank you all for coming. Gran would have counted you, and then worried there were not enough sandwiches.

Margaret Doyle was born in Clifden in 1938, the fourth of seven children. She left school at fourteen to work in the hotel on the square, where she met my grandfather, Tom, when he came in to fix the boiler and stayed for forty-eight years.

She raised five children on a postman's wage in a house with one fire, and none of them remember being cold. She taught every one of her eleven grandchildren to play twenty-five, and then beat us at it, without mercy, until the very end.

She was not soft. She told you exactly what she thought of your haircut. But if you were in trouble she was the first one at the door, with a casserole and a plan.

What I will miss most are the Sunday phone calls. She rang at six, every week, for twenty years, and always began the same way: "It's only me." It was never only her. It was the whole family, held together by a woman who refused to let anyone drift.

Gran, it was never only you.

We will keep the cards on the table and the kettle on.
`;

const WEDDING = `# A speech for Jess and Omar {.title}

*The best woman's speech · Saturday 17 October 2026 · The Old Granary, Norfolk*

Good evening, everyone. For those I have not met, I am Hannah, and I have known Jess since we were eleven and she asked to copy my French homework. I said no. She copied it anyway. That is Jess.

## How they met

Omar and Jess met in 2021 at a pub quiz in Norwich, on rival teams. Omar's team won by one point, on a question about the capital of Burkina Faso. Jess demanded a recount. Omar offered to buy her a drink instead. She is still, I am told, disputing the recount.

## What I have seen since

I have seen Omar learn to make Jess's mum's lasagne, badly and then well. I have seen Jess drive four hours in the rain to bring him soup when he had flu. I have seen the two of them assemble a wardrobe without a single argument, which is the strongest evidence of true love I know.

## A word to Omar

Omar, she will always be late. She will always say she is "five minutes away" when she has not left the house. She is worth every one of those minutes.

## The toast

So please stand, and raise your glasses, to the best quiz team I know.

**To Jess and Omar.** {.center}
`;

const PETITION = `# Keep the Westgate pool open {.title}

*A petition to Cherwell Valley Council · started Monday 5 October 2026 by the Westgate Swimmers*

## We, the undersigned, ask the Council to

1. Withdraw its plan to close Westgate Pool on 31 March 2027.
2. Publish the survey of the building that the plan relies on.
3. Meet the pool's users before any decision is made.

## Why

Westgate is the only public pool within six miles. Every week it teaches 340 children to swim, holds aqua classes for 120 older people, and opens early for the hospital's rehabilitation patients.

The Council says the repairs would cost £1.9 million. It has not published the survey that figure comes from. The pool's own engineer, who inspected it in July, put the urgent work at £410,000.^[Report by H. Patel CEng, 14 July 2026, available from the Westgate Swimmers.]

## Signatures

Name | Postcode | Date:date
--- | --- | ---
Joan Whitaker | OX16 4AB | 2026-10-05
Kwame Asante | OX16 9JD | 2026-10-05
Lucy Fairbairn | OX15 6HT | 2026-10-06
Derek Mills | OX16 3PX | 2026-10-06
Fatima Noor | OX17 1QR | 2026-10-07

*We will hand this petition to the Council at its meeting on Wednesday 18 November 2026.*
`;

export const templates = (): Template[] => [
  // The everyday ones.
  { id: 'letter', name: t('A letter'), blurb: t('Your address, the date, the greeting, the point, the sign-off.'), doc: LETTER },
  { id: 'cover', name: t('Cover letter'), blurb: t('Applying for a job: the post, what you have done, why them, in four short paragraphs.'), doc: COVER },
  { id: 'memo', name: t('Memo'), blurb: t('To, from, date and subject; the change in a sentence, why, and what you need back.'), doc: MEMO },
  { id: 'meeting', name: t('Meeting notes'), blurb: t('Agenda, what was said, what was decided, who does what.'), doc: MEETING },
  { id: 'minutes', name: t('Minutes'), blurb: t('A formal meeting: who came, the treasurer\'s sums, a motion and its vote, the actions.'), doc: MINUTES },
  { id: 'resume', name: t('Résumé'), blurb: t('Name and contact, experience, education, skills: a résumé fitted to a page.'), doc: RESUME },
  { id: 'cv', name: t('One-page CV'), blurb: t('A typewriter-set CV: now, before, education, languages and tools.'), doc: CV },
  { id: 'invoice', name: t('Invoice'), blurb: t('Who, what and how much, the sums done in the table; printed as paper to send.'), doc: INVOICE },
  { id: 'contract', name: t('Contract'), blurb: t('A plain-words agreement, with room at the end for each party to sign.'), doc: CONTRACT },
  { id: 'newsletter', name: t('Newsletter'), blurb: t('A block association\'s month: dates in a table, welcomes, news and thanks.'), doc: NEWSLETTER },
  { id: 'recipe', name: t('Recipe'), blurb: t('What you need, in a table that scales from four to six, and how, step by step.'), doc: RECIPE },
  { id: 'faq', name: t('Questions and answers'), blurb: t('The questions people ask, each a heading with its answer under it.'), doc: FAQ },
  { id: 'press', name: t('Press release'), blurb: t('The news in the first line, the detail, a quote, the hours, and who to call.'), doc: PRESS },
  // Writing with a shape of its own.
  { id: 'news', name: t('News article'), blurb: t('A headline, a byline, the story in two columns on paper, and a chart of the figures.'), doc: NEWS },
  { id: 'interview', name: t('Interview'), blurb: t('An introduction, then questions and answers, each speaker named.'), doc: INTERVIEW },
  { id: 'book-review', name: t('Book review'), blurb: t('The book, the stars, what it is about, what worked and what did not.'), doc: BOOK_REVIEW },
  { id: 'music-review', name: t('Music review'), blurb: t('An album: the label and length, the stars, the songs, the best tracks.'), doc: MUSIC },
  { id: 'thesis', name: t('Thesis'), blurb: t('Title page, abstract, chapters with footnotes and a table, and a bibliography, set like a book.'), doc: THESIS },
  { id: 'grant', name: t('Grant proposal'), blurb: t('The ask, the need, the plan, a budget that adds up, and how you will know it worked.'), doc: GRANT },
  { id: 'syllabus', name: t('Syllabus'), blurb: t('A course: when and where, what it is about, the weeks, and grades that add up to 100%.'), doc: SYLLABUS },
  { id: 'complaint', name: t('Formal complaint'), blurb: t('What happened, in order; what you want; and by when, before you go further.'), doc: COMPLAINT },
  { id: 'politician', name: t('Letter to a politician'), blurb: t('Ask your representative for a vote: who you are, why it matters here, and a question.'), doc: POLITICIAN },
  { id: 'love', name: t('Love letter'), blurb: t('Ordinary things, missed: a letter across the distance, in a serif.'), doc: LOVE },
  { id: 'wedding', name: t('Wedding speech'), blurb: t('How they met, what you have seen since, a word to each, and the toast.'), doc: WEDDING },
  { id: 'eulogy', name: t('Eulogy'), blurb: t('A life in a few minutes: where it began, who they were, what you will miss.'), doc: EULOGY },
  { id: 'zine', name: t('Zine essay'), blurb: t('A personal essay for a small magazine, typewritten.'), doc: ZINE },
  { id: 'petition', name: t('Petition'), blurb: t('What you ask, why, and the names of those who agree.'), doc: PETITION },
  { id: 'terms', name: t('Terms of service'), blurb: t('A small business\'s terms in plain words: booking, prices, keys, what if, ending.'), doc: TERMS },
];
