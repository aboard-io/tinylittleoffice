# TinyLittleOffice from the command line, and the API

[TinyLittleOffice](https://tinylittleoffice.com/) without a browser. A document is a link: the whole thing (a sheet, a deck, a plan, a contract…) is packed into the part of the URL after `#`, which no server ever sees. This package makes those links, reads them, turns them to and from Markdown and CSV, evaluates sheets and models, compares two versions, and signs and seals them. It runs in Node 20+ and anywhere else with Web Crypto. No dependencies.

It is the office suite for agents chatting: an agent writes a document by writing a link, hands it to another agent or a person in whatever channel they already share, and the next agent reads it, changes it, and emits a new link. Documents are values, so there is nothing to lock, nothing to sync, and the history is the sequence of links.

The same code is served by the site, with nothing to install:

```js
import { link, parse } from 'https://tinylittleoffice.com/api.js';
```

This folder is the command-line tool built from it. In a clone of the repository: `npm ci && npm run build:api`, then `node packages/doc/bin/tinyoffice.js …` (or `npm link` here for a `tinyoffice` command).

## In code

```js
import { link, linkFromMarkdown, parse, compare, evaluateSheet, runModel, lint, signed, verified, sealed, open, createSigner, memoryStore } from '@tinylittleoffice/doc';

// Make a document. The body is in the app's own plain-text format…
const budget = link('sheet', 'Item\tCost\nRent\t1200\nFood\t600\nTotal\t=SUM(B2:B3)', { title: 'Budget', by: 'planner-agent' });
// …or Markdown / CSV, shaped the way the app reads it.
const chores = linkFromMarkdown('todo', '- [x] Sweep\n- [ ] Shop', { by: 'chores-agent' });

// Read one: the app, the envelope (title, by, created) and the document as Markdown.
const p = parse(budget);
p.app;          // 'sheet'
p.env.by;       // 'planner-agent'
p.markdown;     // '# Budget\n\n| Item | Cost |\n| --- | --- |\n| Rent | 1200 | …'

// Compute. A sheet gives its shown values; a model (a sheet with named cells) runs with the assumptions you set, by name.
evaluateSheet(p.env.body);                  // [['Item','Cost'],['Rent','1200'],['Food','600'],['Total','1800']]
runModel(modelBody, { visitors: 10000 });   // { flows: [{ from, to, value }…], values: { visitors, signups, … } }

// Compare two versions: what the second changed.
compare(budget, revised).changes;           // [{ kind: ' ' | '-' | '+', line }…]

// Check it before sending: unknown icons, a layout that does not exist, a link too long for a QR code.
await lint('deck', body);                    // [{ level: 'warning', line: 5, message: 'Icon "brainz" is not in the library…' }]

// Prove who made it. The signature covers the app, time, body, title and author.
const signer = createSigner(memoryStore());  // or your own KeyStore: a file, a secret manager
const proven = await signed(budget, signer);
await verified(proven);                      // { ok: true, by: '<fingerprint>' }

// Keep it private: only someone with the password can read the link.
const secret = await sealed(budget, 'hunter2');
await open(secret, 'hunter2');
```

Every app's format is in the guide at <https://tinylittleoffice.com/llms.txt>; `apps()` lists them and `example(app)` gives a body to start from.

## On the command line

```sh
tinyoffice apps                                  # every app, with a line on each
tinyoffice example deck                          # an example body in the app's format
echo "- [x] Sweep" | tinyoffice link todo --md --by chores-agent --title Chores
tinyoffice read <link>                           # the document as Markdown (--json, --body)
tinyoffice eval <link>                           # a sheet computed as CSV; a model run (--set visitors=10000)
tinyoffice diff <link> <link>                    # what the second changed
tinyoffice lint <app> [file]                     # what a browser would not tell you: unknown icons, length
tinyoffice sign <link> [--key file]              # signed (the key is made and kept; ~/.tinyoffice/key by default)
tinyoffice verify <link>                         # exit 0 valid, 1 invalid, 2 unsigned
tinyoffice seal <link> --password P              # sealed
tinyoffice open <link> --password P              # a sealed link, read
tinyoffice render <link> --out plan.pdf          # the document as a file: .pdf .png .html .pptx .xlsx .md (needs playwright, except .md)
```

Rendering opens the public site headlessly and takes the download; the document stays in the link and is never sent anywhere else. Pass `--site` to use your own copy of the site.

## The shape of a link

```
https://tinylittleoffice.com/<app>/#/v0/<app>[.<view>]/<payload>
```

The payload is one flag letter and base64url: the body (with a small envelope of created time, title, author and optional signature) deflated against a dictionary both sides know. Lengths: a link is kept under about 2,000 characters; `URL_LIMIT`. `v0` is the link format that launches; until then it changes freely. Once it has, the dictionaries are frozen and every link ever written still decodes.

MIT.
