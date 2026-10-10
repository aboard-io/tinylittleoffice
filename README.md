# Tiny Little Office

**Tiny Little Office is a free office suite where your document is the link. There's no account, nothing is
stored anywhere, and whoever has the link has the document.**

Open it and start typing. A letter, a spreadsheet, a presentation, a drawing, a to-do list, a website. When
you want to share it, copy the link. The whole document lives inside that link, so sending it is like
handing someone the paper itself. Nothing is uploaded, there's no sign-up, and we never see what you write.
If you want to keep working on it, keep the link; if you want it to stay private, don't share it. It works on
a phone, works offline once you keep a copy, and it's free, with the code open for anyone to read.

## What it is not

- **Not a server that holds your documents.** A document is one text, written in TLO (Markdown with a few
  additions, docs/tlo.md), compressed into the part of the address after `#`, which browsers never send to
  any server. The site is static files; there is no database of documents to breach, subpoena or leak.
- **Not an account.** There is nothing to sign up for. "Saved", a switch in the menu, keeps documents on your
  own device, and only there; "Private", the default, keeps nothing.
- **Not watching.** No analytics, no error reporting, no fonts or scripts from anyone else, no request you
  did not cause. Everything the site can ask of the web, and when, is listed in docs/network.md, and the
  Content-Security-Policy (`public/_headers`) refuses anything else.

Two small services exist, both optional, both in this repository: **tinier**, which makes a short link out
of ciphertext it cannot read (the key stays in the link's fragment), and **media**, a picture proxy that
logs nothing, so a picture's site never learns who read a document.

## Running it

Node 24 or later.

```sh
npm ci && npm run dev    # http://localhost:4178, every app
```

```sh
npm run lint            # the type check (tsc is the lint); npm run typecheck adds the Workers
npm run i18n:check      # every t('…') in src/ is in src/i18n/en.ts, placeholders matching
npm run i18n:extract    # append the missing keys to en.ts, at the end, to be sorted by hand
npm test                # unit (node) and browser (Chromium) tests
npm run test:e2e        # every e2e spec, on a fresh build; SHOTS=<dir> saves the smoke's screenshots
npm run build           # typecheck, then dist/ with a page per app, the CSP hashes, files.json, sw.js
npm run docs:exports    # docs/exports.md, from the apps' definitions
npm run docs:network   # docs/network.md and /network, from src/kit/network.ts (the build runs it first)
npm run docs:deps       # docs/dependencies.md, from package.json and the lockfile (-- --sizes measures a build)
npm run tinier:dev      # the link shortener on this machine (see "Living short links")
npm run media:dev       # the picture proxy on this machine, port 8788; VITE_MEDIA_URL=/media uses it through the dev server
npm run skill           # skill/tinyoffice/SKILL.md and public/llms.txt, from the template and the registry
npm run cards           # public/og/<app>.png, each app's share card (Chromium through Playwright)
npm run tinyoffice -- link todo list.md   # the command line (packages/doc/README.md)
npm run deploy          # build, then the site, tinier and media to Cloudflare (docs/self-host.md)
```

## How it is built

Three layers, each small enough to read.

- **The kernel** (`src/doc/`, docs/kernel.md): one typed model of a document, a head of fields and a list of
  blocks (headings, paragraphs of rich runs, list items, tables with typed and named columns, embeds,
  pictures, fences), with TLO as its one reader and writer, byte-stable through a parse and a write. Edits
  are operations on the model, undone from one op log; the formula engine evaluates a table block.
- **The kit** (`src/kit/`): the shell, the bar, Insert ▾, the menu, dialogs, the router, the codec, the
  store, privacy (passwords, signatures, what the device holds), short links, exports, strings, icons; and
  the one rich-text editor, `<to-text>`, over the kernel: every `beforeinput` becomes operations, and only
  the blocks that changed are drawn again. There is no contenteditable anywhere else.
- **The apps** (`src/apps/<id>/`): definitions on the kit. Each is a view of the kernel's document and the
  commands it adds: the Word Processor, Spreadsheet, Presentation Builder, Outliner, To-Do List, Kanban
  Board, Calculator, Calendar, Drawing Tool, Animator, Diagram Maker, Trip Planner and Website Builder.
  Each is a chunk of its own; the home page loads the kit and nothing else.

The plan of the rebuild is docs/rebuild.md; every document in `docs/` is listed in docs/README.md.

## The standards it keeps

- **docs/editing.md:** every app edits the way the editors people already use do, by keyboard, pointer and
  finger; words are edited where they are drawn.
- **docs/kernel.md:** one model, one parser, one editor, one undo; apps as definitions on one kit.
- **Phone first,** at 390 pixels in WebKit; dark mode through tokens; accessible, checked with axe in light
  and dark.
- **Native web APIs first:** each dependency names the native API it beat and why (docs/dependencies.md).
- **Nothing leaves the browser** that docs/network.md does not list.

CONTRIBUTING.md says how to work to them.

## Running your own copy

`npm run deploy` against your own Cloudflare account puts up the site, the short-link service and the
picture proxy, the same code as ours. docs/self-host.md takes about thirty minutes.

## Reporting a security problem

Write to security@tinylittleoffice.com, not an issue. SECURITY.md says what happens next.

## Licence

MIT (LICENSE). Contributors keep the code of conduct (CODE_OF_CONDUCT.md).

## History

This is the rebuilt tree. The first tree, the one that came before the rebuild, keeps its whole history in
this repository, tagged `v0-before-rebuild`.

## Details

### Layout

```
src/doc/        the document kernel (docs/kernel.md, src/doc/README.md)
src/kit/        the kit: shell, bar, insert, menu, dialog, toast, drawer, home, routing, codec, store,
                privacy (Private or Saved, the password, the signature, the key, what the device holds),
                privacy-dialog (<to-privacy>), crypt (a password: PBKDF2 to AES-GCM), sign (Ed25519, P-256 where
                there is none), envelope (by, created, key, sig, and the signed message), link-guard (links
                that leave ask first), pictures (web pictures asked for first), media (the picture proxy's
                address, the whitelist, an export's picture bytes), preview (a kept document's first page,
                small), mark (the Office mark), offline (and Add to home screen), search (the library, by its
                words), find (Find in this document, Mod+F), keys (the shortcuts dialog), zoom (the size of
                everything), steps (a document presented a part at a time), qr-picture (a document's QR code
                as a fence), locked and locked-doc (a document locked with a password placed in another: the
                locked card, and opened with its password in an editor), share, short (links), links (the owner links kept), library (the documents
                kept), exports, i18n, theme, icons (the UI set and the starter library; a document may name
                any Lucide icon, the rest arriving in one lazy load, icons-full, that views and exports wait
                for), icons-search (keywords, suggestions, search; no DOM), icons-picker (the library in a
                dialog, with icons-meta, its tags and categories, and the Emoji set: emoji and emoji-data,
                Unicode's and CLDR's names written by scripts/emoji.ts), app (the
                AppDef contract), apps (registry), element (DocElement: every editor's base, with the op-log
                undo), draw (pages, the palette), tile (a repeating background tile in one head field:
                `tile: 8:a..a/.a.a`), chart (bars, lines, pie, Sankey), csv, ics (iCalendar, RFC 5545: folded
                lines, escaped text), zip, xlsx (a table block as a workbook), embeds (a thing from the web by
                its address: the providers and the click-to-load <to-embed> card); the editor: text
                (<to-text>), textops (its maths), clipboard, history (the op log), notes (<to-notes>:
                footnotes typed where they are drawn), link-pop
dev/            text.html: the editor alone, in its three shapes, at /dev/text.html on the dev server (not built)
src/apps/<id>/  an app: def.ts (its definition), editor.ts (its element, a lazy chunk), style.css
                (wrapped in @layer apps), templates.ts, tests/
src/i18n/       the strings: en.ts is every key, by hand; a sibling file is a language
src/styles.css  declares the cascade: @layer tokens, kit, apps, responsive, a11y; src/styles/ holds each
src/sw.ts       the service worker, for the copy kept on the device
public/         _headers (the Content-Security-Policy), manifest, icons, theme.js, network.html (written by scripts/network-doc.ts)
scripts/        offline-files.ts (what the device keeps), i18n-extract.ts (the strings, checked), deploy.mjs (the
                checks, then Cloudflare), check-build.ts (files.json, the worker's version, the policy's
                hashes), exports-doc.ts, dependencies.ts and network-doc.ts (the generated pages in docs/)
test/           unit tests under node; test/browser/ the shell in a real Chromium (Vitest browser mode)
e2e/            the Playwright specs on the built site, desktop Chromium and iPhone-sized WebKit: the smoke, the
                keyboard alone, axe over every app light and dark, the offline copy, and each app's own
tinier/         the link shortener: a Worker, its D1 schema, its page (see "Living short links")
media/          the picture proxy at media.tinylittleoffice.com: a Worker, no storage, no logs (docs/network.md)
src/api.ts      the API for programs, served as /api.js (a build of its own: vite.api.config.ts)
packages/doc/   the `tinyoffice` command line, over src/api.ts
skill/          the agent skill (SKILL.md, written from SKILL.tpl.md by scripts/make-skill.ts; also /llms.txt)
.github/        CI (every check on every push and pull request), the issue and pull request templates
```

The editor: `<to-text>` (src/kit/text.ts) is the one rich-text editor, model-driven over the kernel: every
`beforeinput` becomes operations fired as `text-ops`, the host applies them and hands the blocks back, and only the
blocks whose identity changed are drawn again. Undo is an op log (src/kit/history.ts). See docs/kernel.md §4 and §8.

The home page: every app as its icon and name (open it blank), its templates ▾, and under it the documents of that
app kept on this device, newest first, only while the drawer's switch says Saved (`src/kit/library.ts`, through
`src/kit/store.ts`); under Private nothing is kept and the list is not there.
Each kept document shows its first page small at its left (`src/kit/preview.ts`), drawn only as its row comes into
sight and kept in memory by its link.

Privacy, links and pictures: a link that leaves Tiny Little Office never opens by itself. One catcher on the page
(`src/kit/link-guard.ts`, installed by the shell) asks first, in a dialog with the site's name in large type and the
whole address under it, a red Cancel (the default) and a green Go (a new tab, no opener, no referrer); a link to
anything but a web page, an email or a phone number does not open at all. A picture a document holds by its
address on another site is a tracking pixel for whoever reads it, so no picture is ever fetched from its own site:
every one comes through the picture proxy at media.tinylittleoffice.com (`media/`, a Worker that keeps a week's
cache and logs nothing; `src/kit/media.ts` `pictureSrc`). A picture from a host on the whitelist (Wikimedia, the
Internet Archive, Unsplash, Pexels, Flickr, GitHub: public, licensed pictures; docs/network.md says why each) shows
at once; any other is not fetched until the reader asks: `src/kit/pictures.ts` draws it as a card with the site's
name and "Show pictures from the web" (every picture of that document, for the visit); a picture the author put in
this visit shows at once; under Saved a switch in the menu shows them always; a preview never fetches one; exports
hold the pictures' bytes, fetched through the proxy; every `<img>` sends no referrer. `VITE_MEDIA_URL` names a
self-hoster's own proxy; empty, pictures load directly and every host asks first.

Password and signature, for every app (the shell's, `src/kit/privacy.ts`). Share holds **Password…**: the text is
encrypted in the browser (AES-256-GCM under a key PBKDF2-SHA-256 derives from the password, 600,000 iterations,
`src/kit/crypt.ts`) and the link carries `E<salt | iv | ciphertext>`; while a password is set every change is sealed
again before it reaches the address bar, so the link, the library and a short link only ever hold ciphertext. A
sealed link opens with the unlock dialog and nothing of the document, not even its title; a wrong password is said
so; the password is never kept, but what opened a document opens it again for the rest of the visit. Share also
holds **Sign**: the document is signed with this browser's key (Ed25519, ECDSA P-256 where Ed25519 is missing,
`src/kit/sign.ts`), made the first time and kept through `src/kit/store.ts` (under Private for the visit, under Saved
on the device); the name asked once and kept. The head carries `by`, `created` (stamped to the minute at the first
change), `key` and `sig` (`src/kit/envelope.ts`, docs/kernel.md §1); the signature is checked on open and after every
change. Beside the title, the state: Unsigned (quiet), Signed by a name (green, the key's fingerprint on hover),
Changed since signed or Signature does not match (red), Locked; it opens the Privacy dialog
(`src/kit/privacy-dialog.ts`, also "Privacy and keys" in the menu): the document's state, the key with Export
(a file and the text), Import and Forget, what this device holds item by item with Forget and Forget everything,
and Download everything, every kept document as its .tlo text in one zip (a locked one as its link), the key
if asked. A signature proves who holds the key and that nothing changed; the name and the time are the signer's word.
A locked document placed inside another goes in as its sealed link (a ```` ```locked ```` fence, `src/kit/locked.ts`)
and is drawn everywhere as a locked card: the lock, "Locked with a password", its app; in an editor a tap asks for the
password and the card draws the document for the rest of the visit, while the outer link goes on holding only the
seal (Edit seals the changes again under the same password). Its embed view is the locked card with Unlock.

The Office mark (`src/kit/mark.ts`) is the menu button, the drawer's heading and the favicon; `npm run icons`
(`scripts/icons.ts`, through sharp) draws the app icons and the share card from it into `public/`.

Strings: every string a person sees is `t('English words')`; English is the key, `{name}` a placeholder,
`{n|one slide|# slides}` a plural (the forms in the language's own order, `#` the number). See `src/kit/i18n.ts`.

Deploy: `node scripts/deploy.mjs` ships a commit, never a working tree. It runs the types, the strings,
the unit and the browser tests, then the build, then checks what the build wrote after the bundler
(scripts/check-build.ts: every file in `dist/files.json` there and none left out, `sw.js` carrying its version, the
Content-Security-Policy in `dist/_headers` holding the hash of every page script and inline script); when something
on screen changed since the last deploy (`.wrangler/deployed`), the smoke run on the built site instead of the bare
build: e2e/smoke, keyboard, a11y (axe over every app at phone size, light and dark) and offline. Then
`wrangler deploy` for the site (`wrangler.jsonc`: `dist/` as static assets with its `_headers`), for tinier and
for the picture proxy. `--dry-run` checks and stops, `--visual` runs the smoke whatever changed, `--full` every e2e
spec. `npm run deploy` is the same script; a self-hoster runs it against their own account (docs/self-host.md).

The shortener (`tinier/`) and the picture proxy (`media/`) are Workers of their own, each with its wrangler config; nothing deploys by itself.

### Link and Display Link

Share → **Copy link** copies the editing link; **Copy display link** copies the same link with `?d` after the payload
(`#/v1/<app>/<payload>?d`, never inside it), which opens the document as its pages, one under another, to
read or print, with an Edit button that drops the flag. The QR code and a short link can carry either.

A new document is named at once, "New Spreadsheet 2026-10-09 #1" (the app's noun, the local date, and the
first number the device's library leaves free that day); the name goes into the head with the first change.

### Living short links

Share opens one dialog: the document's title and, in one line, where its link fits ("This link: 1,240
characters, too long for an NFC sticker"); **Copy link** (opens in the editor) and **Copy display link** (opens
as pages to read), and the device's own share sheet where there is one; a short link that expires; the QR code,
drawn in place when the link fits in one; and, folded, the short links kept on this device.

A short link comes from tinier.tinylittleoffice.com and lives an hour, a day, a week (the default, and the
choice is remembered under Saved), a month or a year, chosen in one row; it opens the editor or the pages. The
long link is encrypted in the browser with a random AES-256-GCM key; only the ciphertext goes to the service,
and the key travels in the short link's fragment (`#…`), which browsers never send to any server. Opening a
short link fetches the ciphertext, decrypts it on the page, and goes to the document with `?s=<id>&x=<expires>`
after it, so whoever arrives sees a banner above the bar, green over a week, amber within one, red on the last
day: "This link expires in 12 days", with **Copy into a new document** (the same document, "Copy of …", as a
plain link of its own in a new tab).

A short link comes as two links. The **public** one, `…/<id>#<key>`, is for sharing; it always opens the
latest version, and is shown big with Copy beside it. The **owner's**, `…/<id>#<key>.<o>`, is folded under it
("Keep the owner link, to update it later"): `o` is 32 random bytes made beside the key, and the service stores
only `sha256(o)`. Opened, the owner link arrives at the document as `#/v1/<app>/<payload>?s=<id>&k=<key>&o=<o>&x=<expires>`;
the query stays in the address while the owner edits (so a reload keeps it) and is stripped from every link the
shell shares, copies or shows as a code. The dialog then says "You own this short link", with **Update** (once
the document has changed: a new ciphertext under the same id, with the same key), the lifetimes with
**Extend** (a longer life from now, never a shorter one), and **Forget**; the banner's Extend opens it there. A
document that has just made a short link owns it the same way. Under "Saved on this device" the owner link can
be kept in the device's list (`src/kit/links.ts`); under Private it is offered to copy and nothing is written.

What the service knows: ciphertext, an IV, a hash of the owner key, timestamps, and that a request came. It
cannot read a link, cannot tell one version from another, and cannot forge an update. `o` is never in a public
link, a log, or any request but the PUT or DELETE that proves it, over TLS, by hashing it and comparing in
constant time. An unknown id (404) and a wrong key (403) carry the same body and take the same time; ids are
seven random letters. PUT and DELETE are braked like POST.

```
POST   /api        {c, iv, ttl, owner}   → 201 {id, exp}             owner = base64url(sha256(o))
GET    /api/<id>                         → {c, iv, exp, ver, updated}
PUT    /api/<id>   {c, iv, o, ttl?}      → {id, exp, ver, updated}   ver one more; ttl extends exp
DELETE /api/<id>   {o}                   → 204
GET    /<id>       the page that decrypts and redirects; "#<key>.<o>" hands o on to the document's hash
```

The service is `tinier/`: one file of logic (`tinier.ts`, tested against a Map) run as a Cloudflare Worker
(`worker.ts`, the D1 rows) with `schema.sql` (idempotent for a fresh D1: the service launches with the owner,
version and updated columns, so there is no ALTER path), a rate-limit binding as the brake on one address, and
an hourly cron that forgets expired links (a read of one forgets it sooner). A link holds 16 KiB of
ciphertext; `src/kit/short.ts` carries the same cap and refuses before sending, and the room meter has a
"Short link" row.

To run it on this machine, beside `npm run dev`, with `VITE_TINIER=/tinier/` in `.env.development`:

```sh
SITE=https://pefdev.exe.xyz:4178 npm run tinier:dev   # local D1 in .wrangler/, schema applied, port 8787
```

The dev server hands everything under `/tinier/` to it, so short links come out as the dev server's own
address. `SITE` is that address as the browser sees it: the only place a local short link may lead.
`npm run typecheck` generates the Worker's types (`tinier/worker-configuration.d.ts`, not committed) and
checks `tinier/` with them.

### Documents by URL, for agents and programs

A document can be written as a plain link, by a person or an agent, with no codec: `/<app>/#title=…&doc=…`
(`by=` says who made it, `view=` asks for a file or a deck's show; `md=` is `doc=` by another name, a text when no
app is named). The shell turns it into the packed `#/v1/…` link on arrival (`src/kit/plain.ts`): one letter and
base64url bytes, with `~` for 62 where RFC 4648 has `-`, since a hyphen is where a pasted link breaks across a
line (`-` is still read). The guide to every
app's format is the agent skill, `skill/tinyoffice/SKILL.md`, served as `/llms.txt`; every example in it is one of
an app's templates, checked to round-trip (`npm run skill`, `test/skill.test.ts`).

Programs import `/api.js` (`link`, `plain`, `read`, `encode`/`decode`, `parse`/`write`, `compare`, `apps`,
`templates`, `file`); `packages/doc/tinyoffice.ts` is the same from the command line: links from files and files
from links. A page of anyone's can import `/tinyoffice.js` (`link()` for a plain link, `embed()` for the frame), with
no build and no other code.

A `.tlo` file is a document's text with `app:` in its head: Download → Text (TLO) makes one, and dropping one on the
page, or Open a file… in the menu, opens it as its own app (a `.md` or `.txt` opens in the app at hand). Every app
also downloads Markdown and a `.pdf` file (its pages as JPEGs, `src/kit/pdf.ts`; Print saves a PDF whose words stay
words); the Outliner's `.pdf` is its words, as sections and bullets (`src/kit/textpdf.ts`). Download is a row per
format, each with View (a new tab, where the browser shows the file), Share (the share sheet, where the device takes
it), Download, and Copy link: a link that downloads the file as it opens (`#/v1/<app>.<ext>/…`).

Compare… in the menu (`#/compare/<app>/<payload>/<app>/<payload>`) puts two links side by side, block by block,
with what the second changed marked (`src/kit/compare.ts`, `src/kit/diff.ts`). Share posts the link to Bluesky,
Mastodon (its server asked once), X, LinkedIn or email, each through the link guard; copies a deck's show link
(`…?show`, which opens presenting); and copies the embed code: a lazy, no-referrer frame of `/embed/#/v1/<app>.embed/…`,
the pages alone with Open in Tiny Little Office, the one address `public/_headers` lets another site frame. Each
app's own page previews with its card, `public/og/<app>.png` (`npm run cards`); the home page's is the Office mark.

