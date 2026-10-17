// The commands entry (src/commands.ts, `tinylittleoffice/commands`) as a program uses it, under node with no page: a
// command declared with its program's half (input, output, who, doc), registered, served as tools to one actor and not
// another, and documented. These commands are registered in this file's own registry: Vitest gives each test file its
// modules afresh, so the site's registry that test/commands.test.ts loads (scripts/commands.ts) never holds them.
import { describe, expect, test } from 'vitest';
import { command, docsOf, labelOf, register, registered, run, tools, type Schema } from '../src/commands.ts';

interface Board {
  made: string[];
}
const input: Schema = { type: 'object', properties: { company: { type: 'string' } }, required: ['company'] };
const output: Schema = { type: 'object', properties: { lead_id: { type: 'string' } } };
const create = command<Board>({
  id: 'records.create',
  scope: 'records',
  label: () => 'New lead',
  where: ['keys-only'],
  input,
  output,
  who: ['team', 'atlas'],
  doc: 'Create a lead for a company.',
  does: (b) => b.made.push('lead'),
});
// No doc: its description is its label, a message of en.ftl said in English.
const bold = command<Board>({ id: 'records.bold', scope: 'records', label: 'bar-bold', where: ['bar'], who: ['team'], reads: true, does: () => true });
// No who: a page's own, served to no program.
const pageOnly = command<Board>({ id: 'records.page', scope: 'records', label: () => 'Only on the page', where: ['bar'], does: () => true });
register([create, bold, pageOnly]);

describe('the commands entry', () => {
  test('registers and runs a command declared with its program’s half', () => {
    expect(registered().map((c) => c.id)).toStrictEqual(['records.create', 'records.bold', 'records.page']);
    const board: Board = { made: [] };
    run(create, board);
    expect(board.made).toStrictEqual(['lead']);
  });

  test('tools() serves an actor the commands it may run, as MCP names a tool’s fields', () => {
    expect(tools(registered(), 'atlas')).toStrictEqual([{ name: 'records.create', description: 'Create a lead for a company.', inputSchema: input }]);
    expect(tools(registered(), 'team')).toStrictEqual([
      { name: 'records.create', description: 'Create a lead for a company.', inputSchema: input },
      { name: 'records.bold', description: 'Bold', inputSchema: { type: 'object' } },
    ]);
    expect(tools(registered(), 'guest')).toStrictEqual([]);
  });

  test('a label that is a message’s id is said in English with nothing set up', () => {
    expect(labelOf(bold)).toBe('Bold');
  });

  test('docsOf() names every command, in order, with its scope, who, whether it reads, and its schemas', () => {
    const md = docsOf(registered());
    expect(md.indexOf('## `records.create`')).toBeLessThan(md.indexOf('## `records.bold`'));
    expect(md.indexOf('## `records.bold`')).toBeLessThan(md.indexOf('## `records.page`'));
    const one = md.slice(md.indexOf('## `records.create`'), md.indexOf('## `records.bold`'));
    expect(one).toContain('Create a lead for a company.');
    expect(one).toContain('- Scope: `records`');
    expect(one).toContain('- Who: `team`, `atlas`');
    expect(one).toContain('- Reads: no, it writes');
    expect(one).toContain(JSON.stringify(input, null, 2));
    expect(one).toContain(JSON.stringify(output, null, 2));
    const two = md.slice(md.indexOf('## `records.bold`'), md.indexOf('## `records.page`'));
    expect(two).toContain('Bold');
    expect(two).toContain('- Reads: yes, and changes nothing');
    expect(md.slice(md.indexOf('## `records.page`'))).toContain('- Who: no program (a page’s alone)');
  });
});
