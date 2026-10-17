# board: cards in lanes by their status

A table, a card a row: the first column of words is its title, the others its fields, and the column named `Status` or `Stage` (else the first `:option` column, else the last) says which lane it is in. `lanes: To do, Doing, Done` in the head puts the lanes in that order and keeps a lane with no cards; a comma in a lane's name is written `\,`. Without it the lanes come in the order the rows first name them. Type the columns as a sheet's (`Value:money`, `Due:date`): a card shows them as the Spreadsheet does, and the same text opens in the Spreadsheet.

Sales pipeline:

```
---
lanes: Inbound, Qualifying, Proposal, Negotiating, Won, Lost
---
Deal | Stage:option | Company | Value:money | Close:date
--- | --- | --- | --- | ---
Website redesign | Inbound | Hudson Bakery | 12000 | 2026-12-15
Office move | Inbound | Greenpoint Dental | 8500 | 2027-01-10
Annual retainer | Qualifying | Atlas Law | 48000 | 2026-12-01
Spring catalog | Proposal | Bowery Outfitters | 22000 | 2026-11-20
Event series | Negotiating | Queens Museum Friends | 30000 | 2026-11-14
Brand refresh | Won | Flatiron Coffee | 18000 | 2026-10-30
App prototype | Lost | Canal Street Labs | 40000 | 2026-10-21
```

As a link: <https://tinylittleoffice.com/board/#doc=---%0Alanes%3A+Inbound%2C+Qualifying%2C+Proposal%2C+Negotiating%2C+Won%2C+Lost%0A---%0ADeal+%7C+Stage%3Aoption+%7C+Company+%7C+Value%3Amoney+%7C+Close%3Adate%0A---+%7C+---+%7C+---+%7C+---+%7C+---%0AWebsite+redesign+%7C+Inbound+%7C+Hudson+Bakery+%7C+12000+%7C+2026-12-15%0AOffice+move+%7C+Inbound+%7C+Greenpoint+Dental+%7C+8500+%7C+2027-01-10%0AAnnual+retainer+%7C+Qualifying+%7C+Atlas+Law+%7C+48000+%7C+2026-12-01%0ASpring+catalog+%7C+Proposal+%7C+Bowery+Outfitters+%7C+22000+%7C+2026-11-20%0AEvent+series+%7C+Negotiating+%7C+Queens+Museum+Friends+%7C+30000+%7C+2026-11-14%0ABrand+refresh+%7C+Won+%7C+Flatiron+Coffee+%7C+18000+%7C+2026-10-30%0AApp+prototype+%7C+Lost+%7C+Canal+Street+Labs+%7C+40000+%7C+2026-10-21>

Templates: Project board, Sales pipeline, Hiring, Content calendar. Its own files: `.csv`.
