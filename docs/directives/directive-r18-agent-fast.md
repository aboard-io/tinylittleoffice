# R18-agent-fast: an agent told "go to tinylittleoffice.com and do something" is working in one fetch

**Paul, 2026-10-11:** *"Do LLMs have a complete understanding of this system as quickly as possible when told 'go to tinylittleoffice.com and do something'? Speed is so important and LLMs can be so slow."* Measured on 2026-10-11: an agent that fetches the home page gets a `<noscript>` of two sentences and no pointer to anything; `/llms.txt` is 56 KB (about 14,000 tokens), the whole skill, so the first useful thing is a long way down. An agent needs the shape of a link and one working example within its first thousand tokens.

## The design

- **Two files.** `/llms.txt` becomes short (under 6 KB): what it is in two sentences, the link shape, the API import line (`import { link, read, lint } from 'https://tinylittleoffice.com/api.js'`), one complete example per app in one line each (the smallest document that shows the shape), the three rules an agent breaks first (the two-space link rule, a title slide alone, commas in a list), and the line 'The whole description: /llms-full.txt'. `/llms-full.txt` is today's file. Both written by `scripts/make-skill.ts` from the one template, so they cannot drift; the skill's SKILL.md stays the full one.
- **The home page points the way for a fetcher.** `index.html` gets `<link rel="alternate" type="text/plain" href="/llms.txt" title="For agents">` and the `<noscript>` gains one line: 'Agents: https://tinylittleoffice.com/llms.txt says how to make a document as a link.' The site's `_headers` serves `/llms.txt` as `text/plain; charset=utf-8` with a short cache. Also `/.well-known/llms.txt` → the same file (a copy in the build), since some agents look there.
- **The API answers fast.** `api.js` stays an entry of its own with no app code in it (check the chunk: `apps()` and `templates()` lazy); a test holds `api.js` under 25 KB gzipped so an import is one small fetch.
- **A measure in the tests.** `test/llms.test.ts`: `/llms.txt` under 6 KB, contains the API line and one example per app, each example lints clean through `lint()`; a count of tokens by a simple 4-characters-a-token estimate under 1,500 for the part above the first `##`.
- docs/transparency.md or the README's agents paragraph names both files.

## Proof

- The tests above; `npm run skill` writes both files; `scripts/check-build.ts` sees both in dist.

## Not this

- No content negotiation at `/` (serving text to non-browsers): a stranger's `curl` of the home page gets the HTML and its pointer.
