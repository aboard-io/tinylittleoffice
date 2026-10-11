# Tiny Little Office from the command line, and the API

A document is a link: the whole thing is packed into the part of the URL after `#`, which no server ever sees.
`tinyoffice` makes those links from files and files from those links, over `src/api.ts`, the module the site
serves at `/api.js`. Node 24 runs it as it is, with no build: in a clone, `npm ci`, then
`node packages/doc/tinyoffice.ts …` (or `npm run tinyoffice -- …`, or `npm link` here for a `tinyoffice` command).

```sh
tinyoffice apps                                  # every app, with a line on each
tinyoffice templates deck                        # a deck's templates; `template deck talk` prints one
echo "- [ ] Sweep" | tinyoffice link write --title Chores --by chores-agent
tinyoffice link plan.tlo                         # a .tlo file names its app in its head
tinyoffice link deck talk.md --view show         # a deck that opens presenting
tinyoffice link sheet budget.md --plain          # the readable form: /sheet/#title=…&doc=…
tinyoffice read <link>                           # the document's TLO text (--json for app, title, by)
tinyoffice file <link>                           # <title>.tlo; --as md|csv|ics|docx|… for the app's own formats
tinyoffice diff <old link> <new link>            # what the second changed, block by block; exit 1 when they differ
tinyoffice lint talk.tlo                         # what the eye would have seen, a line a finding; exit 1 on one
tinyoffice measure <link>                        # the sizes the layouts chose, slide by slide, and failing formulas, as JSON
```

Check a document with `lint` and `measure`, never by opening it: they read the same layout code that draws the
pages (a connection naming no thing, a comma splitting a number, a label too long for its box, bullets under a
chart that are not drawn, a headline shrunk or cut, a link too long to paste, a formula that works out to an error
such as `#CIRC`), so no browser is needed.

`file` makes what needs no browser: `.tlo` and `.md` for every app, and the app's own formats that are text or
zipped XML (a sheet's `.csv` and `.xlsx`, a calendar's `.ics`, a text's `.docx`…). Pictures and the `.pdf` are
drawn by a browser: open the link with `view=pdf` (or `#/v1/<app>.pdf/…`) to have it downloaded on arrival.

## In code

```js
import { link, plain, read, compare, encode, decode, parse, write, apps, templates, file, lint, measure } from 'https://tinylittleoffice.com/api.js';

const url = link('sheet', 'Item | Cost:money\n--- | ---\nRent | 1200\n', { title: 'Budget', by: 'planner-agent' });
read(url);               // { app: 'sheet', view: '', text: '---\ntitle: Budget\nby: planner-agent\n---\n…', title, by, display }
compare(url, revised);   // { same, removed, added, changes: [{ kind: ' ' | '-' | '+', line }…] }
parse(read(url).text);   // the kernel's document: { head, blocks }; write() gives the text back
await templates('deck'); // [{ id, name, blurb, text }…]
await lint('deck', text); // [{ app, at: 'slide 3', block, kind, words, fix }…]; [] when clean
await measure('deck', text); // { app, length, slides: [{ slide, title: { px, lines, cut }, body: { px, over }, hidden }…] }
```

The guide to every app's format is the skill, `skill/tinyoffice/SKILL.md`, served as `/llms.txt`.
