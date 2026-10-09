# Tiny Little Office

A tiny office suite that lives entirely in the URL. Every document is one text, written in TLO (Markdown
with a few additions), compressed into the part of the address after `#`, which no server ever sees. Copy
the link and you have copied the file. No accounts, no saving, nothing sent anywhere unless you share it.

This tree is the rebuild (branch `next`): one kit, apps as definitions on it, a document kernel at the
heart and one editor over it. The plan is `docs/rebuild.md`, the kernel's design `docs/kernel.md`, the
format `docs/tlo.md` in the old tree until it moves here.

## Layout

```
src/kit/        the kit: shell, bar, insert, menu, dialog, toast, drawer, home, routing, codec, store,
                privacy (Private or Saved, the password, the signature, the key, what the device holds),
                privacy-dialog (<to-privacy>), crypt (a password: PBKDF2 to AES-GCM), sign (Ed25519, P-256 where
                there is none), envelope (by, created, key, sig, and the signed message), link-guard (links that leave ask first), pictures (web pictures asked for first),
                preview (a kept document's first page, small), mark (the Office mark), offline, share, short (links), links (the owner links kept), library (the documents kept), exports, i18n, theme,
                icons (the UI set and the starter library a document may name), icons-search (keywords,
                suggestions, search; no DOM), icons-picker (the library in a dialog: a lazy chunk that brings
                the rest of Lucide and icons-meta, its tags and categories), app (the AppDef contract), apps
                (registry), element (DocElement: every editor's base, with the op-log undo), draw (pages, the
                palette), tile (a repeating background tile in one head field: `tile: 8:a..a/.a.a`), chart
                (bars, lines, pie, Sankey), csv, ics (iCalendar, RFC 5545: folded lines, escaped text), zip, xlsx (a table block as a workbook), embeds (a thing from the web by
                its address: the providers and the click-to-load <to-embed> card); the editor: text (<to-text>), textops
                (its maths), clipboard, history (the op log), note-pop, link-pop
src/doc/        the document kernel (docs/kernel.md)
dev/            text.html: the editor alone, in its three shapes, at /dev/text.html on the dev server (not built)
src/apps/<id>/  an app: def.ts (its definition), editor.ts (its element, a lazy chunk), style.css
                (wrapped in @layer apps), templates.ts, tests/
src/i18n/       the strings: en.ts is every key, by hand; a sibling file is a language
src/styles.css  declares the cascade: @layer tokens, kit, apps, responsive, a11y; src/styles/ holds each
src/sw.ts       the service worker, for the copy kept on the device
public/         _headers (the Content-Security-Policy), manifest, icons, theme.js
scripts/        offline-files.ts (what the device keeps), i18n-extract.ts (the strings, checked)
test/           unit tests under node; test/browser/ the shell in a real Chromium (Vitest browser mode)
e2e/            the small Playwright smoke on the built site, desktop Chromium and iPhone-sized WebKit
tinier/         the link shortener: a Worker, its D1 schema, its page (see "Living short links")
src/api.ts      the API for programs, served as /api.js (a build of its own: vite.api.config.ts)
packages/doc/   the `tinyoffice` command line, over src/api.ts
skill/          the agent skill (SKILL.md, written from SKILL.tpl.md by scripts/make-skill.ts; also /llms.txt)
```

## Commands

```sh
npm ci
npm run dev           # 0.0.0.0:4178 (pefdev.exe.xyz allowed)
npm run build         # typecheck, then dist/ with a page per app, the CSP hashes, files.json, sw.js
npm run typecheck     # tsc is the lint
npm test              # unit (node) and browser (Chromium) tests
npm run test:e2e      # the smoke, on a fresh build; SHOTS=<dir> saves screenshots
npm run i18n:check    # every t('…') in src/ is in src/i18n/en.ts, placeholders matching
npm run i18n:extract  # append the missing keys to en.ts, at the end, to be sorted by hand
npm run tinier:dev    # the link shortener on this machine (see "Living short links")
npm run skill         # skill/tinyoffice/SKILL.md and public/llms.txt, from the template and the registry
npm run cards         # public/og/<app>.png, each app's share card (Chromium through Playwright)
npm run tinyoffice -- link todo list.md   # the command line (packages/doc/README.md)
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
address on another site is a tracking pixel for whoever reads it, so it is not fetched until the reader asks:
`src/kit/pictures.ts` draws it as a card with the site's name and "Show pictures from the web" (every picture of
that document, for the visit); a picture the author put in this visit shows at once; under Saved a switch in the
menu shows them always; a preview never fetches one; exports include them; every `<img>` sends no referrer.

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

The Office mark (`src/kit/mark.ts`) is the menu button, the drawer's heading and the favicon; `npm run icons`
(`scripts/icons.ts`, through sharp) draws the app icons and the share card from it into `public/`.

Strings: every string a person sees is `t('English words')`; English is the key, `{name}` a placeholder,
`{n|one slide|# slides}` a plural (the forms in the language's own order, `#` the number). See `src/kit/i18n.ts`.

Deploy: `wrangler.jsonc` serves `dist/` as static assets on Cloudflare with `public/_headers`; the build
output is deployable, but nothing here deploys.

## Link and Display Link

Share → **Copy link** copies the editing link; **Copy display link** copies the same link with `?d` after the payload
(`#/v1/<app>/<payload>?d`, never inside it), which opens the document as its pages, one under another, to
read or print, with an Edit button that drops the flag. The QR code and a short link can carry either.

A new document is named at once, "New Spreadsheet 2026-10-09 #1" (the app's noun, the local date, and the
first number the device's library leaves free that day); the name goes into the head with the first change.

## Living short links

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

## Documents by URL, for agents and programs

A document can be written as a plain link, by a person or an agent, with no codec: `/<app>/#title=…&doc=…`
(`by=` says who made it, `view=` asks for a file or a deck's show; `md=` is `doc=` by another name, a text when no
app is named). The shell turns it into the packed `#/v1/…` link on arrival (`src/kit/plain.ts`). The guide to every
app's format is the agent skill, `skill/tinyoffice/SKILL.md`, served as `/llms.txt`; every example in it is one of
an app's templates, checked to round-trip (`npm run skill`, `test/skill.test.ts`).

Programs import `/api.js` (`link`, `plain`, `read`, `encode`/`decode`, `parse`/`write`, `compare`, `apps`,
`templates`, `file`); `packages/doc/tinyoffice.ts` is the same from the command line: links from files and files
from links. A page of anyone's can import `/tinyoffice.js` (`link()` for a plain link, `embed()` for the frame), with
no build and no other code.

A `.tlo` file is a document's text with `app:` in its head: Download → Text (TLO) makes one, and dropping one on the
page, or Open a file… in the menu, opens it as its own app (a `.md` or `.txt` opens in the app at hand). Every app
also downloads Markdown and a `.pdf` file (its pages as JPEGs, `src/kit/pdf.ts`; Print saves a PDF whose words stay
words); the Outliner's `.pdf` is its words, as sections and bullets (`src/kit/textpdf.ts`). Download's last group
copies a link that downloads a file as it opens (`#/v1/<app>.<ext>/…`).

Compare… in the menu (`#/compare/<app>/<payload>/<app>/<payload>`) puts two links side by side, block by block,
with what the second changed marked (`src/kit/compare.ts`, `src/kit/diff.ts`). Share posts the link to Bluesky,
Mastodon (its server asked once), X, LinkedIn or email, each through the link guard; copies a deck's show link
(`…?show`, which opens presenting); and copies the embed code: a lazy, no-referrer frame of `/embed/#/v1/<app>.embed/…`,
the pages alone with Open in Tiny Little Office, the one address `public/_headers` lets another site frame. Each
app's own page previews with its card, `public/og/<app>.png` (`npm run cards`); the home page's is the Office mark.

