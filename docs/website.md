# Website: a site of little pages, in a link

Website makes a one-page site today: `# Name`, a line about it, `## Section`,
`- Point | detail` cards, `> Label | url` buttons. This makes it a site of
several pages, still a few lines of text, still under a link's budget, still
one HTML file when downloaded. Nothing already written changes meaning.

## The format

Everything today's format says still holds. Three lines are new.

```
# Harbor Coffee
Small-batch coffee, roasted on the quay.
theme: amber serif
> See the menu | #menu
- :coffee Roasted daily | Never more than a week old
=== Menu
Espresso, filter, and a pastry case.
## Coffee
- Espresso | 3.00
=== Find us
14 Quay Street, open 7 to 3.
@@trip/YXQAA...
> Email us | mailto:hello@example.com
```

- `=== Title` starts a page. What comes before the first one is the home
  page; its `# Name` is the site's name. Pages get a nav in the header, in
  the order written, with the name as "Home". A site with no `===` is
  navigated by its `## Section`s, exactly as now.
- `@@app/payload` (the part of a TinyLittleOffice link after `#/v2/`) puts
  another document on the page, drawn as it is in Write: a chart, a map, a
  timeline, with a caption that opens it. An embed costs its own link's
  length, so one or two small ones fit; a big one does not.
- `theme: amber serif dark` picks the look. One word each, any order, all
  optional: a colour (`indigo` the default, `teal`, `rose`, `amber`, `ink`),
  `sans` or `serif`, `light` or `dark`.

Two things need no new syntax. A line that is only a picture's address
(`https://.../ada.jpg`) is a picture: round on the home page's hero, wide in a
section. A line that is only `:icon-name` is a big icon. A button may carry
an icon too: `> :instagram Instagram | https://...`.

Links: `#menu` goes to the page (or the section) with that name, from any
page. `> Shop | #shop` is a page link; `https://...` and `mailto:` go out.

### Link in bio

A page of buttons is a link-in-bio page, with nothing to learn:

```
# Ada Diaz
https://example.com/ada.jpg
Potter in Lisbon. Mugs, bowls, the odd lamp.
theme: rose serif
> :shopping-bag Shop | https://example.com/shop
> :instagram Instagram | https://instagram.com/ada
> :mail Email me | mailto:ada@example.com
```

A hero with three or more buttons stacks them full width, centred, under
the picture and the line of words; one or two sit side by side as now.
That is the whole rule.

### Size

The example above is about 300 characters of text, which packs to roughly
250 of link. A five-page site of a name, a tagline, a dozen cards and a
dozen buttons is under 1,000 characters of text and fits a link with half
the budget to spare. The status bar shows the rest.

## The download, and the preview

The Web page download is one HTML file holding every page, which hosts
anywhere a file can be put. Each page is a `<section>`; a short fixed script
shows the one named in the hash (`#menu`), or the page holding the section
named, and marks it in the nav (`aria-current`). It also sets the tab's
title and moves focus to the page's heading when the page changes. Without
JavaScript the file is the pages one under another, which still reads. The
preview in the editor is the very same file in its frame, so what you see
is what downloads. The script is a fixed text registered with
`pageScript()` and hashed into the CSP like the store's cart; the site's
words never enter it.

Semantic HTML throughout: `<header>` with `<nav aria-label="Pages">`,
`<main>` of `<section>`s, the home page's name an `<h1>`, each page's title
an `<h1>` of its own, sections `<h2>`, cards a `<ul>`. Keyboard: the nav is
plain links; pages are reached by hash so Back works. Responsive: one
column on a phone; a long nav scrolls sideways.

## Markdown, and friendly input

Out: `# Name`, then the home page; each other page as `# Title` with its
`## Section`s; cards as `- :icon: Heading | detail`; buttons as
`[Label](url)`; pictures as `![](url)`; embeds as `[Title](#/v2/...)`;
`**Theme:** amber serif`. In: the same read back, forgivingly, so a Markdown
document with several `#` headings becomes a site of that many pages.

`read()` (plain-parameter links, `&doc=`): a line that is a whole
TinyLittleOffice link becomes `@@app/payload`; `[Label](url)` on a line of
its own becomes a button; `![alt](url)` a picture. Text already in the
format passes through.

## The editor

The picture is the site, in its frame, edited in place as now: tap words
to change them, Enter for another row, the bar along the bottom adds a
page, a section, a card, a button, a paragraph, a document. What is added
goes where you are: a card after the one you tapped, a page after the page
on show, a section at the end of the page on show.

Page-level actions, in the same bar: when a page (or a section) is on
show, "Move page earlier", "Move page later" and "Remove page" act on it,
and on everything in it. The frame is sandboxed, so these are messages
back to the editor, like the words typed. The editor remembers which page
the frame is showing and puts the redrawn frame back on it, so editing the
Menu page does not keep bouncing you home. The List view (the form) shows
pages, their sections and the sections' cards nested, and Alt+↑/↓ moves a
page with everything in it.

One change in the shared lines toolkit: an app may have more than one
heading kind, and they nest in the order given (a page, then its
sections), so moving or removing a page carries its sections and cards.
Every other app has one heading kind and is unchanged.

## Not doing

- No pictures in cards, no galleries, no columns, no custom CSS: the look
  is a theme word, and a link cannot carry an image, only its address.
- No forms, comments, analytics, or anything needing a server. A `mailto:`
  button is the contact form.
- No nested pages or sections within sections: three levels (site, page,
  section) is what fits a few lines.
- No per-page theme, no per-page title tags beyond the page's name.
- No path routing (`/menu`): one file, hash routing, hosts anywhere. A
  single-file site has no server to route for it.
- No reordering by drag on the picture: the buttons do it, and the List
  does it with the keyboard.
