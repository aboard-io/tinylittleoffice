# Security

Tiny Little Office keeps a document in its link, and the link is the only copy. No server holds documents, so
there is nothing there to breach; what is left to get wrong is in this repository. If you find a way it lets
someone read, change or forge a document they should not, or learn who is reading one, please tell us before
anyone else.

## How to report

Privately, through GitHub: **[report a vulnerability](https://github.com/aboard-io/tinylittleoffice/security/advisories/new)**
(the Security tab, then "Report a vulnerability"). Only the maintainers see it. Please do not open a public
issue or pull request for a security problem.

Say what you found, how to see it happen (the steps, the browser, a link if it shows it), and what you think it
allows. A link holds its whole document: if one holds anything private, say so.

## What happens next

- **Within 72 hours** a person answers, to say the report arrived and who is looking at it.
- We work out whether it is real and how far it reaches, and tell you. If we disagree, we say why.
- We fix it, and tell you before the fix ships, so you can check it.
- **Coordinated disclosure:** please keep it to yourself until the fix is live, or for 90 days from your report,
  whichever comes first. Once it is fixed we publish an advisory saying what it was, with your name if you want
  it there.

## What is in scope

- **The site** at tinylittleoffice.com and the code in `src/` that runs it: the password, the link guard, the
  Content-Security-Policy (`public/_headers`), and any request it makes that docs/network.md does not list.
- **tinier**, the short-link service (`tinier/`): what it stores, what it can read, who can change a link.
- **The format**: the link and its codec, and TLO, the text a document is (docs/tlo.md), read by every app and
  by the command line (`packages/doc/`).

Out of scope: someone you gave a link to passing it on (a link is the document); a compromised device, browser
or extension; a weak password; the security of Cloudflare or of a site a document links to; denial of service by
sheer volume; a scanner's report without a way the problem can be used.

What the site protects against, and what it does not, is the threat model:
[docs/threat-model.md](docs/threat-model.md).

There is no paid bounty. We can offer thanks, in public if you like, and a fix.
