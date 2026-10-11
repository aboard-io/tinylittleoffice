# The documents

Every current page in this folder, one line each. Start with the repository's [README](../README.md) for what
Tiny Little Office is; start here for how it is made and why.

## Design

- [kernel.md](kernel.md): the document kernel, the one editor and the shell: the model, TLO as the one parser, the operations, the formula engine.
- [editing.md](editing.md): the one editing standard every app keeps, by keyboard, pointer and finger.
- [tlo.md](tlo.md): the document format, as a person or a language model learns it.
- [exports.md](exports.md): the files each app's documents become, and the apps they open in (generated).
- [translation.md](translation.md): the nineteen languages: how a string is written, translated and checked, and the type each is set in.

Each app's templates are described beside its code, in [src/apps/write/templates.md](../src/apps/write/templates.md) and its
siblings, one an app; the kit's and the kernel's files each begin by saying what they do.

## Trust

- [threat-model.md](threat-model.md): what the defaults, passwords and short links protect against, and what they do not.
- [crypto/password.md](crypto/password.md): a password on a document, byte by byte, with test vectors.
- [crypto/short-links.md](crypto/short-links.md): a short link, byte by byte: the cipher, the key in the fragment, what the service stores and for how long.
- [network.md](network.md): what leaves your browser: every request the site can make, when, what it carries, what stops it (generated).
- [dependencies.md](dependencies.md): every package, its version and license, the native API it beat, and the bytes it adds (generated).
- [transparency.md](transparency.md): the checks that make the promises verifiable by a stranger, and how to say what this is.

## Running it

- [self-host.md](self-host.md): running your own copy on your own Cloudflare account, in about thirty minutes.
- [github-setup.md](github-setup.md): the repository's settings in the aboard-io organization, set by hand on GitHub.

## History

- [history/README.md](history/README.md): the record of how the tree was built (the rebuild's plan, the gap analysis, the directives, the reviews); not maintained.
