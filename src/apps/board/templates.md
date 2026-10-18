# Board templates

Blank comes first (the app's own: To do, Doing and Done, no cards yet); then these, in the order the list shows
them. Each is a table with a status column (typed `option`, named Status or Stage), a title column and two or three
typed fields, its lanes fixed in the head's `lanes:` so they keep their order and an empty lane still shows. Written
by the kernel so each round-trips byte for byte (tests/view.test.ts holds every one), set in New York where
set anywhere.

- **Project board** (`project`): To do, Doing and Done; a task a card, with its owner and the day it is due.
- **Sales pipeline** (`pipeline`): a sales pipeline's stages, Inbound, Qualifying, Proposal, Negotiating, Won and Lost; a deal a card, with the company, its owner, its value in dollars and the day it should close.
- **Hiring** (`hiring`): Applied, Phone screen, Interview, Offer and Hired; a candidate a card, with the role and the day of the next step.
- **Content calendar** (`content`): Ideas, Writing, Editing, Scheduled and Published; a piece a card, with its channel, its author and the day it goes out (an idea has none yet).
