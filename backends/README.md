# The backends

Everything of Tiny Little Office that runs on a server, in one folder: a folder a service, pure (a request in, a
response out, and an interface for where its rows live), and a folder a platform, which wires the services to a
runtime and a database. The site itself is static files and needs none of them; a document lives in its link, and the
services are for what a link alone cannot do.

| folder | what |
|---|---|
| [tinier/](tinier/) | the short-link service: the long link encrypted in the browser under a key kept in the short link's fragment, stored as ciphertext until it expires (docs/crypto/short-links.md); the daily brake both Workers keep (brake.ts); the rows in SQL (d1.ts, D1's few calls, which node's SQLite runs too); the database's tables (migrations/); the landing page that decrypts (page.html) |
| [cards/](cards/) | the preview cards a person sends with a link to a network: the model and the store (cards.ts), and the site's own paths, `/card` and `/c/<id>` (site.ts) |
| [cloudflare/](cloudflare/) | the services on Cloudflare: a Worker each (`tinier/`, `site/`), with its `wrangler.jsonc`, its types and its secret; the rows in D1 (docs/self-host.md) |
| [node/](node/) | the services on one machine: one Node process on two ports over one SQLite file, `node:http` and `node:sqlite` and nothing else (docs/self-host.md, "Without Cloudflare"; the Dockerfile) |

A service never names its platform: `tinier/tinier.ts` takes a `Store`, `cards/site.ts` a `Site`, and the tests give
them Maps (test/memstore.ts) and node's SQLite (test/tinier.test.ts), so every statement the Workers run on D1 runs under
the tests too. A platform is the wiring alone: `cloudflare/tinier/worker.ts` is twenty lines.

The threat model (docs/threat-model.md) says what each service can see; docs/network.md says every request the site
makes to them, and test/tinier.test.ts holds that no file here logs anything.
