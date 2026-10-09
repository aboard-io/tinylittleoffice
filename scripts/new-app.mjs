// Scaffolds a new app:  npm run new-app <id> "<Name>"
// Writes the definition, the editor and a test, and adds the app to the menu.
// After that, `npm run dev` shows it working: a list you can add lines to.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const [id, name = id && id[0].toUpperCase() + id.slice(1)] = process.argv.slice(2);
if (!id || !/^[a-z][a-z0-9]*$/.test(id)) {
  console.error('Usage: npm run new-app <id> "<Name>"   (id: lower-case letters and digits, e.g. notes)');
  process.exit(1);
}
const at = (path) => new URL(`../${path}`, import.meta.url);
if (existsSync(at(`src/apps/${id}.def.ts`))) {
  console.error(`There is already an app called "${id}".`);
  process.exit(1);
}
const Class = id[0].toUpperCase() + id.slice(1);

writeFileSync(
  at(`src/apps/${id}.def.ts`),
  `/**
 * ${name}: what the shell needs to know. Everything it offers for a document
 * (title, pictures, PDF, web page, previews inside other documents, share
 * cards) comes from this definition. Keep it free of the DOM so it can be
 * tested with node.
 *
 * Document format: one line of text per item.
 */
import { defineApp, listPage, utf8 } from '../kit/core.ts';

export const parse${Class} = (text: string): string[] => (text ? text.split('\\n') : []);
export const serialize${Class} = (items: string[]): string => items.map((i) => i.replace(/\\n/g, ' ')).join('\\n');

export default defineApp({
  id: '${id}',
  name: '${name}',
  icon: 'write', // any key of UI in src/lib/icons.ts
  blurb: 'One line that says what ${name} is for.',
  title: (body) => parse${Class}(body)[0] ?? '',
  outline: (body) => parse${Class}(body).filter(Boolean),
  // How a document looks as a picture: used for .png, .pdf, previews and slides.
  view: (body) => [listPage(parse${Class}(body)[0] || '${name}', parse${Class}(body).slice(1))],
  // Formats beyond the ones every app gets for free (.pdf, .png, .html).
  downloads: [{ ext: 'txt', label: 'Plain text', mime: 'text/plain;charset=utf-8', build: (body) => utf8(body + '\\n') }],
  shortcuts: [{ keys: 'Enter', does: 'Add the line being typed' }],
});
`,
);

writeFileSync(
  at(`src/apps/${id}.ts`),
  `/** <to-${id}>: the ${name} editor. Everything it needs comes from the kit. */
import { DocElement, defineElement, html, state, tool } from '../kit.ts';
import { parse${Class}, serialize${Class} } from './${id}.def.ts';

export class To${Class} extends DocElement<string[]> {
  @state() private draft = '';

  protected parse = parse${Class};
  protected serialize = serialize${Class};

  private add() {
    if (!this.draft.trim()) return;
    this.commit([...this.doc, this.draft.trim()]); // commit() redraws and updates the link
    this.draft = '';
  }

  render() {
    return html\`
      <div class="to-toolbar">
        <sl-input size="small" class="sr-label" label="New line" placeholder="Add a line" .value=\${this.draft} @sl-input=\${(e: Event) => (this.draft = (e.target as HTMLInputElement).value)} @keydown=\${(e: KeyboardEvent) => e.key === 'Enter' && this.add()}></sl-input>
        \${tool('Add', 'plus', () => this.add(), { text: true })}
      </div>
      <ul class="todo-list">
        \${this.doc.map((line, i) => html\`<li>
          <input class="text" aria-label="Line \${i + 1}" .value=\${line} @input=\${(e: Event) => this.commit(this.doc.map((l, j) => (j === i ? (e.target as HTMLInputElement).value : l)))} />
          \${tool('Delete', 'close', () => this.commit(this.doc.filter((_, j) => j !== i)))}
        </li>\`)}
      </ul>
    \`;
  }
}
defineElement('${id}', To${Class});
`,
);

writeFileSync(
  at(`test/${id}.test.ts`),
  `import { test } from 'node:test';
import assert from 'node:assert/strict';
import def, { parse${Class}, serialize${Class} } from '../src/apps/${id}.def.ts';

test('${id}: round trip, title and picture', () => {
  const items = ['First', 'Second'];
  assert.deepEqual(parse${Class}(serialize${Class}(items)), items);
  assert.equal(def.title('First\\nSecond'), 'First');
  assert.ok(def.view('First\\nSecond')[0].svg.includes('Second'));
});
`,
);

const index = at('src/apps/index.ts');
if (!readFileSync(index, 'utf8').includes(`./${id}.def.ts`)) appendFileSync(index, `import './${id}.def.ts';\n`);
const editors = at('src/apps/editors.ts');
if (!readFileSync(editors, 'utf8').includes(`./${id}.ts`)) writeFileSync(editors, readFileSync(editors, 'utf8').replace("import { apps }", `import './${id}.ts';\nimport { apps }`));

console.log(`Created ${name}:
  src/apps/${id}.def.ts   name, title, picture, downloads
  src/apps/${id}.ts       the editor
  test/${id}.test.ts
and added it to src/apps/index.ts and src/apps/editors.ts. Run "npm run dev" and open #/v0/${id}.
For a share card of its own, add a sketch to scripts/make-icons.mjs and run "npm run icons".`);
