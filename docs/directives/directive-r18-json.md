# R18-json: the document as JSON, in and out, with a schema

**Paul, 2026-10-11:** *"The JSON export is a good idea."* The kernel's document (`src/doc`: a head of string fields and a list of blocks with runs, tables with typed columns and cells, fences) is plain data already; `api.parse` and `api.write` go between it and TLO text. What is missing is the door and the contract.

## The design

- **The API** (`src/api.ts`): `toJson(text): string` (the parsed document as JSON, stable key order, two-space indent) and `fromJson(json): string` (the document written back as canonical TLO; a document that does not fit the schema throws with the path of the fault). `read(url).json` beside `.text`.
- **The CLI** (`packages/doc/tinyoffice.ts`): `tinyoffice json <link|file>` prints the JSON; `tinyoffice read --json`; `tinyoffice link <app> --json <file.json>` makes a link from JSON; `tinyoffice file … json` is the same as the `.json` download.
- **A download format** `.json` for every app (`src/kit/exports.ts` formats, `docs/exports.md` regenerated), and Open a file… accepts a `.json` that fits the schema.
- **The schema**: `packages/doc/schema/tlo.schema.json` (JSON Schema 2020-12), generated from the kernel's types by a script (`scripts/schema.ts`, from the TypeScript with a small generator, no new runtime dependency; a dev dependency is allowed if it names the native alternative considered) and checked in; a test regenerates it and fails on a diff. `fromJson` validates against it with the kit's own small validator (the schema is simple: objects, arrays, enums, strings, numbers), not a library.
- **Docs**: docs/tlo.md gains a section 'The document as JSON' with the schema's link and a short example; the skill and llms.txt say it in two lines (an agent that prefers structure can send JSON).

## Proof

- `test/doc/json.test.ts`: for every template of every app, `fromJson(toJson(text))` is `write(parse(text))` byte for byte (spaces never lost); a JSON missing a required field throws naming the path.
- The schema test above; a CLI test for `json` and `--json`.

## Not this

- No second model: JSON is the kernel's document, nothing added or renamed.
