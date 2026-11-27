# Contributing

Thank you for helping. Tiny Little Office is small on purpose, so a short note first saves everyone time.

## Reporting a bug

Open an issue with the steps that show it, what you expected, and the browser and device. A link to the document,
or a screenshot, helps most. A security problem goes through the repository's Security tab, never an issue.

## Proposing a change

For anything larger than a fix, open an issue first and say what you would change and why. Bigger ideas are
gathered under the [v2 milestone](https://github.com/aboard-io/tinylittleoffice/milestone/1).

## Pull requests

- One change per pull request, with a test that fails without it.
- `npm test` and `npm run lint` pass before you open it. CI runs the same checks; for a first-time contributor a
  maintainer starts them after reading the change.
- A new interface string goes into every file in `src/i18n/`. Say which translations were made by machine.
- A new dependency names the browser API that was considered first and why it was not enough
  ([docs/dependencies.md](docs/dependencies.md)).
- Say if an AI tool wrote the change, and how much of it you have read and tested yourself.
- Pull requests are squash-merged, credited to you.

By contributing you agree that your work is released under the [MIT License](LICENSE).
