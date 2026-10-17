# sheet: a spreadsheet, a chart, a model

One table. Its header row names the columns, each optionally typed (`Sales:money`); the rows under it are rows 1, 2, 3, so `=SUM(B1:B3)` adds the first three. Up to 26 columns (A to Z). A cell starting with `=` is a formula: `+ - * / ^`, comparisons, references (`B2`), ranges (`A1:A5`), and these functions: `SUM`, `AVG`, `MIN`, `MAX`, `COUNT`, `SUMIF`, `COUNTIF`, `MEDIAN`, `PRODUCT`, `IF`, `AND`, `OR`, `NOT`, `ROUND`, `ROUNDUP`, `ROUNDDOWN`, `INT`, `ABS`, `SQRT`, `MOD`, `NPV`, `IRR`, `PMT`, `FV`, `PV`, `TODAY`, `DATE`, `DAYS`, `EDATE`, `WORKDAYS`, `YEAR`, `MONTH`, `DAY`, `WEEKDAY`. Words that start with `=`, or would read as a number or a date, take an apostrophe before them to stay words (`'=SUM(1)`, `'007`), as in a spreadsheet. Dates are written `2027-03-01` in a `date` column. `chart: bar` (or `line`, `pie`) in the head draws the first column's labels against the numbers beside them; `chart: sankey` draws rows of `From | To | Amount` as flows.

A model is a sheet: a column typed `name` names the cell to its right, and formulas use the names (`=visitors*signup_rate/100`; a space is `_`); `lock: C1:C6` in the head marks the model's own formulas, so a reader changes the assumptions and not the model.

Budget:

```
---
title: Budget, October 2026
---
Item | Planned:money | Actual:money | Difference:money
--- | --- | --- | ---
Rent | 1200 | 1200 | =C1-B1
Groceries | 500 | 540 | =C2-B2
Transport | 150 | 120 | =C3-B3
Utilities | 180 | 175 | =C4-B4
Fun | 200 | 260 | =C5-B5
Savings | 400 | 400 | =C6-B6
Total | =SUM(B1:B6) | =SUM(C1:C6) | =SUM(D1:D6)
```

As a link: <https://tinylittleoffice.com/sheet/#doc=---%0Atitle%3A+Budget%2C+October+2026%0A---%0AItem+%7C+Planned%3Amoney+%7C+Actual%3Amoney+%7C+Difference%3Amoney%0A---+%7C+---+%7C+---+%7C+---%0ARent+%7C+1200+%7C+1200+%7C+%3DC1-B1%0AGroceries+%7C+500+%7C+540+%7C+%3DC2-B2%0ATransport+%7C+150+%7C+120+%7C+%3DC3-B3%0AUtilities+%7C+180+%7C+175+%7C+%3DC4-B4%0AFun+%7C+200+%7C+260+%7C+%3DC5-B5%0ASavings+%7C+400+%7C+400+%7C+%3DC6-B6%0ATotal+%7C+%3DSUM%28B1%3AB6%29+%7C+%3DSUM%28C1%3AC6%29+%7C+%3DSUM%28D1%3AD6%29>

A subscription business:

```
---
title: A subscription business, a month
chart: sankey
lock: C1:C6, E6:E9
---
From | To | Amount:number | Assumption:name | Value:number
--- | --- | --- | --- | ---
Visitors | Signups | =visitors*signup_rate/100 | Visitors | 20000
Visitors | Bounced | =visitors-signups | Signup rate | 6
Signups | Paying | =signups*paid_rate/100 | Paid rate | 25
Signups | Free | =signups-paying | Churn | 8
Paying | Churned | =paying*churn/100 |  |
Paying | Retained | =paying-churned | Signups | =SUMIF(B1:B20, "Signups", C1:C20)
| |  |  | Paying | =SUMIF(B1:B20, "Paying", C1:C20)
| |  |  | Churned | =SUMIF(B1:B20, "Churned", C1:C20)
| |  |  | Retained | =SUMIF(B1:B20, "Retained", C1:C20)
{big=Retained}
```

As a link: <https://tinylittleoffice.com/sheet/#doc=---%0Atitle%3A+A+subscription+business%2C+a+month%0Achart%3A+sankey%0Alock%3A+C1%3AC6%2C+E6%3AE9%0A---%0AFrom+%7C+To+%7C+Amount%3Anumber+%7C+Assumption%3Aname+%7C+Value%3Anumber%0A---+%7C+---+%7C+---+%7C+---+%7C+---%0AVisitors+%7C+Signups+%7C+%3Dvisitors%2Asignup_rate%2F100+%7C+Visitors+%7C+20000%0AVisitors+%7C+Bounced+%7C+%3Dvisitors-signups+%7C+Signup+rate+%7C+6%0ASignups+%7C+Paying+%7C+%3Dsignups%2Apaid_rate%2F100+%7C+Paid+rate+%7C+25%0ASignups+%7C+Free+%7C+%3Dsignups-paying+%7C+Churn+%7C+8%0APaying+%7C+Churned+%7C+%3Dpaying%2Achurn%2F100+%7C++%7C%0APaying+%7C+Retained+%7C+%3Dpaying-churned+%7C+Signups+%7C+%3DSUMIF%28B1%3AB20%2C+%22Signups%22%2C+C1%3AC20%29%0A%7C+%7C++%7C++%7C+Paying+%7C+%3DSUMIF%28B1%3AB20%2C+%22Paying%22%2C+C1%3AC20%29%0A%7C+%7C++%7C++%7C+Churned+%7C+%3DSUMIF%28B1%3AB20%2C+%22Churned%22%2C+C1%3AC20%29%0A%7C+%7C++%7C++%7C+Retained+%7C+%3DSUMIF%28B1%3AB20%2C+%22Retained%22%2C+C1%3AC20%29%0A%7Bbig%3DRetained%7D>

Templates: Budget, Household budget by month, Expense log, Savings goal, Habit tracker, Reading list, Workout log, Training log, Time sheet, Trip costs split, Project tracker, Schedule with dates, Grade book, Membership roll, Seating count, Poll results, Fundraising thermometer, Invoice ledger, Inventory, Petty cash, Rate card, Mortgages compared, Loans compared, Unit converter, Tournament bracket, Month by month, with a chart, A subscription business, A café, A freelancer, A mutual aid fund. Its own files: `.xlsx`, `.csv`, `.chart.svg`, `.chart.png`.
