/**
 * The command registry for a program rather than a page (docs/library.md): what declares commands, runs them, and
 * says them to a program that serves them (an API, an assistant's tools, an MCP server, the documentation). A command
 * is declared as the site's are (kit/core/commands.ts), and may carry its program's half: `input` and `output` as JSON
 * Schema objects, `who` may run it, `reads` when it changes nothing, and `doc`, one sentence saying what it does.
 * Nothing that draws is here (the bars and menus are `tinylittleoffice/editors`'), and nothing names the DOM: it runs in
 * Node, a Worker or a page as it is. The npm package serves it as `tinylittleoffice/commands`.
 *
 *   import { command, register, registered, run, tools, docsOf } from 'tinylittleoffice/commands';
 *   const create = command<Ctx>({ id: 'lead.create', scope: 'records', label: () => 'New lead', where: ['keys-only'],
 *     input: { type: 'object', properties: { company: { type: 'string' } }, required: ['company'] },
 *     output: { type: 'object', properties: { lead_id: { type: 'string' } } },
 *     who: ['team', 'assistant'], doc: 'Create a lead for a company.', does: (ctx) => ctx.createLead() });
 *   register([create]);
 *   tools(registered(), 'team');  // [{ name: 'lead.create', description: 'Create a lead for a company.', inputSchema }]
 *   docsOf(registered());         // the commands as Markdown, in the order registered
 *
 * A label that is a message's id is said by t() (kit/core/i18n.ts) in the language in use, and a program chooses
 * none: it gets English, whose messages ride in this file as they ride in the site's (en.ftl, read when the module
 * loads), so `labelOf` and a tool without a `doc` say "Bold" for 'bar-bold' with nothing set up. Keys are spelled by
 * `keysText` as on Windows unless it is asked for a Mac's (`keysText(keys, true)`). This file's registry is its own:
 * a page that draws commands with `tinylittleoffice/editors` declares them there.
 */
export { command, docsOf, inScope, keysText, labelOf, live, register, registered, run, tools, type Command, type Schema, type Where, type Words } from './kit/core/commands.ts';
