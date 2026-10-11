# Tiny Little Office

Tiny Little Office is an office suite in which the document is the link. Write a letter, a spreadsheet, a
presentation or a calendar, and the whole of it is in the address of the page: copy the link and you have copied
the document. Open it on another phone or computer and it is there; send it to someone and they have it, to read
and to change. Whoever has the link has the document. There is no account and nothing to sign up for.

Private is the default: nothing is kept on your device and nothing on any server; the link is the document.
Saved is a choice, a switch in the menu: it keeps your documents and your short links on your own device, in the
browser's own storage, never on a server. A short link is the one thing a server holds: the document, encrypted
with a key the server never sees, until the link expires. Apart from that, no document ever reaches us.

## What is in it

Ten apps, each with templates to start from:

- **Word Processor:** words on a page, with headings, lists, links, footnotes and a table that adds up.
- **Outliner:** ideas under ideas, folded, unfolded and moved around.
- **Presentation Builder:** slides, or a zine, a booklet, a brochure, a comic, a poster or name badges to print.
- **Spreadsheet:** formulas, named cells and charts.
- **Calculator:** a calculator that shows its work, with units, conversions and graphs.
- **Drawing Tool:** boxes, arrows, icons and labels on a grid, and pixel art.
- **Diagram Maker:** mind maps, org charts, family trees, timelines, seating charts and more, from a few lines.
- **Animator:** a drawing that moves.
- **Calendar:** days and times on a month, a year or a schedule, in any time zone.
- **Trip Planner:** a route on a map, its stops in order.

Around them: nineteen languages, chosen in the menu and carried in the link; the **Display Link**, which opens a
document as pages to read or print rather than to edit; a **password** on any document; **short links** that
expire after an hour, a day, a week or a month; a QR code; files in the formats other programs read (PDF, Word,
PowerPoint, Excel, iCalendar, Markdown and more); and **Download everything**, every document kept on your device
in one file.

## What it is not

- **Not collaborative.** Every link is a copy. The person who opens a link you sent has their own document: what
  they change is in their link, not in yours, and nothing changed in one copy ever reaches another.
- **Not a cloud.** No server keeps your documents, apart from a short link you make, encrypted with a key the server
  never sees, until it expires. There is no account to sign in to.
- **Not a place where anything of yours is kept,** unless you choose Saved, and then only on your own device.

## Privacy and security

A link reveals its document to whoever holds it, and to everything it passes through: a chat service, an email
provider, the browser's own history. A password encrypts the document in your browser (AES-256-GCM, under a key
derived from the password), so the link holds only ciphertext, and nobody without the password sees anything of
it, not even its title. The short-link service holds a document encrypted under a key that travels only in the
short link itself, which the service never receives, and forgets it when it expires. A document asks the web for
nothing: it holds no pictures or frames from other sites, and the one thing that reaches another site by itself
is a trip's map, whose tiles come from OpenStreetMap while it is shown. What this protects against, and what it
does not, is [docs/threat-model.md](docs/threat-model.md); the cryptography, byte by byte, is in `docs/crypto/`
([passwords](docs/crypto/password.md), [short links](docs/crypto/short-links.md)); every request the site can
make is listed in [docs/network.md](docs/network.md).

## For agents

An agent makes a document by writing its link, with no code: `https://tinylittleoffice.com/<app>/#doc=…` holds
the document as text, in TLO, which is Markdown with a few additions. The guide to every app's format, with one
of its templates as each example, is the skill, [skill/tinyoffice/SKILL.md](skill/tinyoffice/SKILL.md), served
to any agent as [/llms.txt](public/llms.txt). A program can import the site's API, `/api.js`, to write and read
links, check a document and make its files; [packages/doc](packages/doc/README.md) is the same from the command
line.

## For developers

Node 24 or later.

```sh
npm install
npm run dev          # the site at http://localhost:4178
```

```sh
npm test             # every test: the pure code under Node, the kit and every editor in Chromium
npm run lint         # the types, Prettier and the lints of the code
npm run test:browser # the browser tests alone, in Vitest's browser mode
npm run test:e2e     # the built site in Chromium and an iPhone-sized WebKit, axe in light and dark
npm run build        # the site as it ships, its chunks held to their budgets
npm run deploy       # the checks, then the site and the short-link service to Cloudflare
```

Running a copy of your own on your own Cloudflare account is [docs/self-host.md](docs/self-host.md). How it is
made: the document kernel and the one editor, [docs/kernel.md](docs/kernel.md); the editing standard every app
keeps, [docs/editing.md](docs/editing.md); the document format, [docs/tlo.md](docs/tlo.md); the languages,
[docs/translation.md](docs/translation.md). Every document in `docs/` is listed in
[docs/README.md](docs/README.md). To contribute, read [CONTRIBUTING.md](CONTRIBUTING.md); to report a security
problem, privately, read [SECURITY.md](SECURITY.md).

## Who made it

Tiny Little Office is made by [Aboard](https://aboard.com). The code is at
[github.com/aboard-io/tinylittleoffice](https://github.com/aboard-io/tinylittleoffice), under the MIT License
([LICENSE](LICENSE)). Everyone who takes part keeps the [code of conduct](CODE_OF_CONDUCT.md).
