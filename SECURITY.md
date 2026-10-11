# Security

Tiny Little Office keeps a document in its link, and the link is the only copy. No server holds documents,
so there is nothing there to breach; what is left to get wrong is in this repository: the code that runs
in your browser, the short-link service (`tinier/`) and the picture proxy (`media/`). If you find a way
that code lets someone read, change or forge a document they should not, or learn who is reading one,
please tell us before anyone else.

## How to report

Write to **security@tinylittleoffice.com**. (Paul: this address must exist, and reach you, before the
repository goes public.)

Say what you found, how to see it happen (a link, the steps, the browser), and what you think it allows. A
document that shows the problem is best sent as its link; if the link holds anything private, say so and we
will treat it as such. Please do not open a public issue, a discussion or a pull request for a security
problem.

## What happens next

- **Within 72 hours** a person answers, to say the report arrived and who is looking at it.
- We work out whether it is real and how far it reaches, and tell you what we find. If we disagree with
  you, we say why.
- We fix it, and tell you before the fix ships, so you can check it.
- **Coordinated disclosure:** we ask you to keep it to yourself until the fix is live, or for 90 days from
  your report, whichever comes first; if we need longer we will ask, and say why. Once it is fixed we
  publish what it was, in the changelog and the release notes, with your name if you want it there.

## What counts

In scope: the site at tinylittleoffice.com and everything in this repository: the codec and the link
format, the password (`src/kit/crypt.ts`), short links
(`src/kit/short.ts`, `tinier/`), the picture proxy (`media/`), the Content-Security-Policy
(`public/_headers`), the link guard, the offline copy (`src/sw.ts`), and any request the site makes that
docs/network.md does not list.

Out of scope: someone you gave a link to passing it on (a link is the document); a compromised device,
browser or extension; a weak password; the security of Cloudflare, OpenStreetMap or a site a document
links to; denial of service by sheer volume; reports from automated scanners without a way the problem
can be used.

## No bounty, yet

There is no paid bounty programme. We can offer thanks, in public if you like, and a fix.

## Thanks

People who have reported a security problem, with their permission:

- (nobody yet)
