# Threat model

What Tiny Little Office protects against, what it does not, and which part of the design answers which
threat. Written for someone deciding whether to trust it with something. Where a protection depends on a
condition, the condition is stated. The crypto is described byte by byte in `docs/crypto/`; every request
the site can make is listed in `docs/network.md`.

## The shape of it

A document is its link. The whole of it, compressed, sits after the `#` of
`https://tinylittleoffice.com/<app>/#/v1/<app>/<payload>`, and a browser never sends the part after `#` to
any server. The site is static files on Cloudflare; there is no account, no database of documents and no
server code that receives one. Three services exist besides the files: the short-link service (`tinier/`),
the picture proxy (`media/`), and nothing else of ours. Everything else the site can reach belongs to
someone else and is reached only after a person asks (the map, an embed), as `docs/network.md` lists.

Two consequences follow, and the rest of this page is mostly their detail:

- **Whoever has the link has the document.** That is the design, not a flaw in it. Everything that holds
  the link (a chat, an email, a browser's history, a person) holds the document, unless it has a password.
- **Whoever serves the code can read the document.** The page that reads the fragment is code the site
  sends. The host cannot see a document while it serves the code in this repository; a host that served
  other code (compromised, coerced, or simply changed) could send the fragment anywhere. The answer to that
  is being able to check that the live site is this repository's build (docs/transparency.md §1 item 3,
  reproducible and attested builds), which is not built yet. Until it is, this is trust in the operator.

## What it protects against

**The host learning a document.** The document is in the fragment, which the browser keeps to itself; the
host gets requests for the same static files every visitor gets. The site sends `Referrer-Policy:
no-referrer`, so a link followed out of a document does not carry the document's address with it. Conditions:
the code is this repository's (above), and the person did not choose a feature that sends something (a
short link sends ciphertext; a picture's address goes to the proxy; see below).

**The short-link service reading a document.** A short link is the long link encrypted in the browser with
AES-256-GCM under a random key that travels only in the short link's own fragment
(`…/<id>#<key>`). The service stores the ciphertext, an IV, an expiry and a hash of the owner's key, and
cannot decrypt any of it. It can see that a link was made, when, from which address, and how long the
ciphertext is. Details: `docs/crypto/short-links.md`. The same condition applies: the page at
`tinier.tinylittleoffice.com/<id>` that decrypts is served by the service.

**Someone updating or deleting a short link they do not own.** An update or a delete must present `o`, 32
random bytes that exist only in the owner's link (`#<key>.<o>`); the service keeps only `sha256(o)`. A wrong
`o` and an unknown id get the same answer in the same time.

**A shared link altered on the way.** Two different protections, for two different cases:
- A document with a password is authenticated by AES-GCM's tag: a changed byte, a cut-short link or a
  forged payload does not open, and says nothing about why. Someone who knows the password can of course
  write a new sealed document.
- A signed document carries a public key and a signature over its app, creation time, words, title and the
  name it was signed under (`docs/crypto/signing.md`). Any change to those shows the signature as not
  matching. A forger can remove the signature, or sign the altered document with their own key under the
  same name; what tells the reader is the key. A key this device does not know is never shown green: it
  reads "Signed as “name” · key …" in a neutral tone, with the advice to check the key with the person
  another way. A name the reader has marked as known ("I know this key", under Saved) that comes with another
  key reads in amber: "A different key from the one name used before". A document with neither a password nor a signature has no protection against alteration: anyone who
  passes it on can change it.

**A scam link inside a document.** Words in a document can say one address and link to another. No link that
leaves the site opens without first showing, large, the site it goes to and the whole address, with Cancel
as the default (`src/kit/link-guard.ts`); a link to anything but a web page, an email address or a phone
number never opens. That holds inside a website shown here (the Display Link, the editor's Preview): its page
cannot leave its sandboxed frame, and a link out of it is handed to the guard. The address is drawn left to
right, set apart from the words round it, in every language, and an email address or a phone number that hides
reversing or invisible characters is refused rather than drawn. This shows where a link goes; it does not judge
whether the place is honest. (A website downloaded as a file is a page of its own, outside Tiny Little Office.)

**A tracking picture inside a document.** A picture held by its address on another site would tell that site
who read the document, when and from where. Such a picture is drawn as a card until the reader asks
(`src/kit/pictures.ts`), except from a short list of hosts of public, licensed pictures (`docs/network.md`
lists them with a reason each), and every web picture shown is fetched through the picture proxy, never from
its own site. A picture shown without asking is followed through its redirects only to hosts on that list
(`media/media.ts`), so an open redirect on a listed host is no way round the question.

**A reader fetching a picture and revealing their address.** The proxy fetches the picture and hands it back,
so the picture's site sees Cloudflare, not the reader. The proxy itself does see the reader's address and the
picture's address; it writes neither down (no logs: observability is off and there is no console call in
`media/`, both held by `test/media-worker.test.ts`). Exports carry the picture's bytes, so reading an
exported file fetches nothing.

**A lost phone with Saved on.** Private is the default and writes nothing to the device but three preferences
that say nothing of a document: the language (`tinyoffice.lang`), the size of everything (`tinyoffice.size`) and
the theme (`to-theme`), all three cleared by Forget everything. With Saved on, the
device keeps the preferences, the documents opened there (`src/kit/library.ts`),
the owner links of short links made there, and the signing key. A document under a password is kept as its
ciphertext with no title and no first words, so the library does not give away even its name. Nothing else
is encrypted by Tiny Little Office: the rest is as safe as the phone's lock and the operating system's own
storage encryption. See the next section for what that leaves open.

**Telemetry.** There is none: no analytics, no error reporting, no fonts or scripts from another site. The
Content-Security-Policy's `connect-src`, `img-src` and `frame-src` name the only places the browser will let
the site reach (`public/_headers`, held by `test/csp.test.ts`), and the pages are served `no-transform` so
Cloudflare does not add its analytics beacon (which the policy would block anyway).

## What it does not protect against

**Someone you gave the link to passing it on.** A link is a copy of the document. It cannot be recalled. A
short link can be deleted or left to expire, but whoever opened it has the long link in their address bar.

**Everything the link passes through.** A chat service, an email provider, a link-preview robot, a
clipboard manager, a note-taking app: each holds the document if it holds the link. A password is the
answer, and only if the password is not sent the same way.

**The browser's own history and sync.** The address bar holds the document, so the browser's history does,
and so does its sync service if that is on. An owner arriving by an owner link has the owner key in the
history too (`?s=…&k=…&o=…` in the fragment). Private does not change what the browser itself records.

**A compromised device, browser or extension.** An extension allowed to read the site's pages reads the
document as it is shown, the password as it is typed, and the signing key from storage. So does malware on
the device. Nothing in a web page can defend against the browser it runs in.

**A weak password.** The link carries everything needed to try passwords offline, at the attacker's own
speed, with no limit and no lockout. The key derivation is slow on purpose (600,000 rounds of PBKDF2-SHA-256)
but a short or common password falls anyway. `docs/crypto/password.md` gives the cost.

**A screenshot**, a photograph of the screen, a printout, an export. Once shown, it is shown.

**The size of a document.** Encryption hides the words, not their number: a password's ciphertext and a short
link's are as long as the compressed document plus a fixed overhead.

**Which app a document is.** The app's name is in the path (`/text/`), which the host sees, and in the
route (`#/v1/text/…`). A signature covers the app; a password's tag does not. Someone who changes a sealed
link's app name changes what opens it, not what it says.

**A lost phone, in full.** With Saved on, a person holding the unlocked phone can read every document in the
library that has no password, use the owner links to change or delete those short links, and sign as you
with your key. There is no remote wipe and no way to revoke a signing key: a key's fingerprint is all a
reader checks, and a stolen key makes a signature that checks. Turning Saved off (from the phone) removes
all of it.

**A determined forger matching a fingerprint.** The fingerprint is 100 bits of the key's SHA-256, twenty base32
characters in four groups, short enough to read out. Finding a different key with the same fingerprint takes
about 2^100 key generations: out of reach (at 40 bits, as it was until round sixteen, one rented GPU found a
match in hours). A forger's way in is not a matching key but a reader who never checks one: hence the neutral
"Signed as" words for a key the device does not know.

**After a tap, the provider.** An embed (a video, a post, a song) loads from its provider once the reader
taps it, and the map's tiles and place search go to OpenStreetMap directly while a map is shown
(`docs/network.md` says why). Those requests carry the reader's address to those providers.

**The operator and the platform themselves.** See "What the host can see"; and above, the code.

## Each design choice, and the threat it answers

| Choice | Threat |
|---|---|
| The document in the fragment, not the path or a query | The host, its logs and every proxy on the way learning the document |
| No accounts, no server storage of documents | A breach, a subpoena or a leak of stored documents: there are none to give |
| Private by default; Saved only when switched on, and switched off erases | A shared or lost device holding what was done on it |
| Password: PBKDF2-SHA-256, 600,000 rounds, random salt; AES-256-GCM with a fresh IV per edit | The link's holders, and anything it passes through, reading a document they were not told the password of; alteration of a sealed document |
| A password never stored; the key held in memory for the visit, non-extractable | A device or a backup giving the password away |
| A sealed document kept in the library with no title or first words | The library telling what a sealed document is |
| A locked document's title reaches nothing but its own page: not the tab title or history, the library, a kept short link, a post, the embed, the QR file, or the share sheet (which gets no picture either) | History, tab sync and the apps a link is shared to telling what a sealed document is |
| Ed25519 signatures over app, time, words, title and name; P-256 where Ed25519 is missing | A shared document altered, or its name or date changed, without the reader being able to tell |
| Short link: AES-256-GCM, the key only in the fragment | The short-link service reading documents |
| Owner key: the service keeps only its SHA-256; wrong key and no row answered alike, in the same time | Others changing or deleting a short link; probing for which ids have owners |
| Short links expire (an hour to a year), are swept hourly, extend only on purpose | Ciphertext kept indefinitely by a service |
| No logs in the site, the shortener or the proxy (observability off, no console calls, tests hold both) | A record of who asked for what |
| The link guard before every link that leaves | A scam link disguised by its words |
| Web pictures asked first, through the proxy, no referrer | Tracking pixels; a picture's site learning who reads |
| Content-Security-Policy listing every host; no third-party scripts or fonts | Telemetry, and code injected through a document running at all |
| WebCrypto, no crypto library | A dependency's bug or compromise in the part that matters most; and code a reader can check in an hour |

## What the host can see

The site, the shortener and the proxy run on Cloudflare, on one account. Cloudflare terminates TLS, so
whatever reaches any of them, Cloudflare and the account's operator could see.

- **The site.** Requests for the static files: the reader's IP address, the time, the user agent, the
  path (which names the app: `/sheet/`), and the files the page then loads. Not the fragment, so never the document, its title, its password or its signature.
  Cloudflare keeps its own aggregate traffic counts for the account, as for any site it serves; per-request
  Worker logs are off (`wrangler.jsonc`, held by `test/tinier.test.ts`).
- **The shortener.** For each short link: the ciphertext, its IV, its expiry, its version count, when it
  was last updated, and the hash of its owner key, kept in Cloudflare D1 until it expires; the IP address of
  each request, counted in memory by the rate limit and not written down. Not the key, so never the long
  link, and not `o` except in the one update or delete that proves it (in the body, over TLS). D1 keeps its
  own point-in-time history of the database for a limited window (Cloudflare's Time Travel); a row deleted
  from the table can be restored from that history by the account's operator until the window passes.
  Details: `docs/crypto/short-links.md`.
- **The proxy.** The address of each web picture a reader is shown, and the reader's IP address, for the
  length of the request; the picture itself, cached at the edge for a week. Nothing written down. A picture's
  address can itself say something about the document it is in.

What none of them can see: a document's words, a password, a signing key, who a link was sent to, or that a
given person opened a given document, beyond the timing and address of requests that a person could try to
match up.

## If you find a hole

Report it privately, as `SECURITY.md` at the root of the repository says, not in a public issue.
