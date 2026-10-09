import { test } from 'node:test';
import '../src/apps/index.ts';
import { specOf } from '../src/lib/diagram.ts';
test('dbg', () => {
  const html = specOf('site')!.page!('# A\n\n![](https://x.y/a.jpg)\n\nhttps://x.y/b.png', { edit: true });
  console.log('OUT ' + html.slice(html.indexOf('<main>'), html.indexOf('<main>') + 700).replace(/\n/g, ' '));
  console.log('RD ' + specOf('site')!.page!(specOf('site')!.example).includes('lf-'));
});
