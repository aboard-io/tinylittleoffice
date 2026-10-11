# R5-G: the Word Processor's table gets the column type menu; the shop's cart uses the price column's currency

Read first: directive-r4-common.md, the merged currency work (git log -1 11619aa; src/doc/model.ts Column.currency, src/doc/tlo.ts money(...) parsing, src/doc/formula.ts formatCell/currencyAt, src/apps/sheet/editor.ts: the column type menu and the Money form), src/apps/write/table.ts (to-write-table: its column menu has no "Holds…" types), src/apps/write/model.ts (money() and the head's currency), src/apps/site/model.ts and view.ts (the shop and cart: the head's `currency:` used as a prefix, so a code shows as "GBP12.00"), docs/tlo.md.

Follow-ups the currency builder left for Paul (2026-10-10); Fable decided both yes:
1. The Word Processor's table column menu gets the column types ("Holds: Words, Number, Money, Percent, Date, Time, Check, Option…", the Spreadsheet's list and names), including Money with its currency form, Option with its datalist, shared with the Spreadsheet's code (move it to the kit if it lives in the sheet's editor; one implementation). The head `currency:` stays the default for a money column that names none.
2. The Website Builder's shop and cart format a price with the Price column's own currency when it has one (a code through Intl.NumberFormat, a symbol as a prefix), the head's `currency:` otherwise; the cart's total the same; the order email's lines the same. A code never shows as "GBP12.00".

Tests: a Write table DOM test picking Money with GBP from the column menu and the cells showing the formatted value; a site model/view test for a shop whose Price column is money(GBP) and one whose head is `currency: €`. PW_PORT=4435.
