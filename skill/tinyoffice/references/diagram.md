# diagram: a diagram drawn from a few lines

`kind:` in the head says which, and each is a list:

- `mind`: a nested list, the center then its branches. In `mind`, `org`, `family`, `lanes` and `net` a class gives a thing a shape: `- Ask {.diamond}` (rectangle, rounded, ellipse, diamond, hexagon, parallelogram, cylinder, note).
- `org`: a nested list of `Name | Role`; a dotted line between two people is `~ Ben -- Eve: advises`.
- `family`: a nested list, a person or a couple each, `Rose + Albert Hale | m. 1948`.
- `lanes`: `- Who: what they do`, in order; a step ending in `?` is a decision. Steps indented under one are its branches, rejoining at the next step on the margin; `{label=Yes}` on one words its line; `~ A -> B` joins any two. A step is named by its words, or `Who: words` where two match.
- `timeline`: `- When: what happened`; dates or years are spaced as they fell, and a span (`- 2027-02-01 – 2027-08-02: Builders on site`) is a band.
- `venn`: `- Set: thing, thing` for two or three sets, `- A & B: thing` for what they share.
- `seating`: `- Table: Ann, Bob, Cy`.
- `net`: `~ A -> B: label` connections; `- name` a thing on its own.

What each is good for: `mind` ideas branching from one, `org` who reports to whom, `family` generations, `lanes` a process passed between people, `timeline` dates spaced as they fell, `venn` what two or three sets share, `seating` who sits where, `net` what talks to what.

The rules, before they are broken: a thing is a name, short (two to four words; a box holds no more), and its other words go in a child, in a connection's label, or in the notes. A connection's ends are names in the list, written exactly as the line writes them (the words before ` | `); in a tree an end naming no thing is not drawn, and a network makes a second thing of it. In a `net` a line is one thing named by the whole line: `- Header: the logo` is a thing called "Header: the logo", so write `- Header` and put "the logo" in a label. In `venn` and `seating` a comma separates things, a comma in a number too: "2,000 cases" is two things, so write 2000 or two thousand. A label is a few words: longer ones lie over each other. `timeline`, `venn` and `seating` draw no connections.

A small company:

```
---
title: Who reports to whom
kind: org
---
- Ada Diaz | Chief executive
  - Ben Okoro | Engineering
    - Cy Lund | Platform
    - Di Shah | Apps
  - Eve Marsh | Design
  - Flo Reyes | Sales
    - Gus Patel | Accounts

~ Cy Lund -- Eve Marsh: design partner
```

As a link: <https://tinylittleoffice.com/diagram/#doc=---%0Atitle%3A+Who+reports+to+whom%0Akind%3A+org%0A---%0A-+Ada+Diaz+%7C+Chief+executive%0A++-+Ben+Okoro+%7C+Engineering%0A++++-+Cy+Lund+%7C+Platform%0A++++-+Di+Shah+%7C+Apps%0A++-+Eve+Marsh+%7C+Design%0A++-+Flo+Reyes+%7C+Sales%0A++++-+Gus+Patel+%7C+Accounts%0A%0A~+Cy+Lund+--+Eve+Marsh%3A+design+partner>

Cats and dogs:

```
---
title: Cats and dogs
kind: venn
---
- Cats: purr, climb curtains, use a litter box
- Dogs: fetch, need walks, guard the house
- Cats & Dogs: shed on the sofa, love a warm spot, wake you at six
```

As a link: <https://tinylittleoffice.com/diagram/#doc=---%0Atitle%3A+Cats+and+dogs%0Akind%3A+venn%0A---%0A-+Cats%3A+purr%2C+climb+curtains%2C+use+a+litter+box%0A-+Dogs%3A+fetch%2C+need+walks%2C+guard+the+house%0A-+Cats+%26+Dogs%3A+shed+on+the+sofa%2C+love+a+warm+spot%2C+wake+you+at+six>

Templates: Mind map, Launch plan, The garden this year, Moving abroad, Studying for an exam, Org chart, A small company, An elementary school, A restaurant kitchen, Family tree, Three generations, The Brontës, A family with a godmother, Swimlanes, From order to doorstep, Hiring someone, An expense report, Timeline, Computing, briefly, A building project, Apollo 11, Venn, Fast, cheap, good, Cats and dogs, Who can do what, Seating chart, A wedding dinner, Board game night, A classroom, Network, How an app hangs together, The water cycle, The house network. Its own files: `.svg`.
