# pinboard: notes, pictures, frames and arrows on a board

A table `Id | Kind | X | Y | W | H | Color | Words`, a row per thing, in whole pixels on a board without edges (X and Y may be negative). Every row has a short id of its own (`n1`, `act1`). Kinds: `note` (a sticky note), `text` (words on nothing), `frame` (a titled region drawn behind everything; what lies inside it moves with it), `picture`, `pen` (a stroke: its Words are its corners, `x:y` pairs as hundredths of its box, `;` between), and `arrow` and `line`, which join two things: their X and Y are the ids of the two things joined, their W and H blank. Color is `yellow`, `orange`, `pink`, `purple`, `blue` or `green`, or blank for the kind's own (a yellow note, black ink, a gray frame). Words are one line of inline Markdown, wrapped where drawn. A picture's bytes are its host's: an image fence after the table, `{#<the row's id> alt="…"}`, holding the host's reference, and the site keeps none, so write no picture for the site.

Retro:

```
---
title: Retro: the subway shoot
---
Id | Kind | X | Y | W | H | Color | Words
--- | --- | --- | --- | --- | --- | --- | ---
well | frame | 0 | 0 | 440 | 560 | green | Went well
not | frame | 480 | 0 | 440 | 560 | pink | Didn’t go well
next | frame | 960 | 0 | 440 | 560 | blue | Try next
w1 | note | 24 | 56 | 184 | 140 | green | Call sheet out two days early
w2 | note | 232 | 56 | 184 | 140 | green | Sound was clean even on the platform
w3 | note | 24 | 216 | 184 | 140 | green | Everyone fed by noon
d1 | note | 504 | 56 | 184 | 140 | pink | Lost an hour finding the permit
d2 | note | 712 | 56 | 184 | 140 | pink | Batteries died in the second setup
d3 | note | 504 | 216 | 184 | 140 | pink | Too many takes of the wide shot
t1 | note | 984 | 56 | 184 | 140 | blue | One folder for permits, shared with everyone
t2 | note | 1192 | 56 | 184 | 140 | blue | A battery check on the call sheet
t3 | note | 984 | 216 | 184 | 140 | blue | Three takes of the wide, then move on
who | text | 24 | 400 | 392 | 52 |  | Owners: Ana (permits), Kofi (batteries)
r1 | arrow | d1 | t1 |  |  |  |
r2 | arrow | d2 | t2 |  |  |  |
r3 | arrow | d3 | t3 |  |  |  |
```

As a link: <https://tinylittleoffice.com/pinboard/#doc=---%0Atitle%3A+Retro%3A+the+subway+shoot%0A---%0AId+%7C+Kind+%7C+X+%7C+Y+%7C+W+%7C+H+%7C+Color+%7C+Words%0A---+%7C+---+%7C+---+%7C+---+%7C+---+%7C+---+%7C+---+%7C+---%0Awell+%7C+frame+%7C+0+%7C+0+%7C+440+%7C+560+%7C+green+%7C+Went+well%0Anot+%7C+frame+%7C+480+%7C+0+%7C+440+%7C+560+%7C+pink+%7C+Didn%E2%80%99t+go+well%0Anext+%7C+frame+%7C+960+%7C+0+%7C+440+%7C+560+%7C+blue+%7C+Try+next%0Aw1+%7C+note+%7C+24+%7C+56+%7C+184+%7C+140+%7C+green+%7C+Call+sheet+out+two+days+early%0Aw2+%7C+note+%7C+232+%7C+56+%7C+184+%7C+140+%7C+green+%7C+Sound+was+clean+even+on+the+platform%0Aw3+%7C+note+%7C+24+%7C+216+%7C+184+%7C+140+%7C+green+%7C+Everyone+fed+by+noon%0Ad1+%7C+note+%7C+504+%7C+56+%7C+184+%7C+140+%7C+pink+%7C+Lost+an+hour+finding+the+permit%0Ad2+%7C+note+%7C+712+%7C+56+%7C+184+%7C+140+%7C+pink+%7C+Batteries+died+in+the+second+setup%0Ad3+%7C+note+%7C+504+%7C+216+%7C+184+%7C+140+%7C+pink+%7C+Too+many+takes+of+the+wide+shot%0At1+%7C+note+%7C+984+%7C+56+%7C+184+%7C+140+%7C+blue+%7C+One+folder+for+permits%2C+shared+with+everyone%0At2+%7C+note+%7C+1192+%7C+56+%7C+184+%7C+140+%7C+blue+%7C+A+battery+check+on+the+call+sheet%0At3+%7C+note+%7C+984+%7C+216+%7C+184+%7C+140+%7C+blue+%7C+Three+takes+of+the+wide%2C+then+move+on%0Awho+%7C+text+%7C+24+%7C+400+%7C+392+%7C+52+%7C++%7C+Owners%3A+Ana+%28permits%29%2C+Kofi+%28batteries%29%0Ar1+%7C+arrow+%7C+d1+%7C+t1+%7C++%7C++%7C++%7C%0Ar2+%7C+arrow+%7C+d2+%7C+t2+%7C++%7C++%7C++%7C%0Ar3+%7C+arrow+%7C+d3+%7C+t3+%7C++%7C++%7C++%7C>

Templates: Film board, Mood board, Retro. Its own files: `.svg`.
