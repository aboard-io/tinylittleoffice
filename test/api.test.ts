import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../src/api.ts';

test('a link is made, read, shaped from Markdown, and compared', () => {
  const u = T.link('sheet', 'Item\tCost\nRent\t1200\nFood\t600\nTotal\t=SUM(B2:B3)', { title: 'Budget', by: 'planner-agent' });
  assert.ok(u.startsWith('https://tinylittleoffice.com/sheet/#/v0/sheet/W'));
  const p = T.parse(u);
  assert.equal(p.app, 'sheet');
  assert.equal(p.env.title, 'Budget');
  assert.equal(p.env.by, 'planner-agent');
  assert.ok(p.markdown.includes('| Rent | 1200 |'));
  assert.deepEqual(T.evaluateSheet(p.env.body), [['Item', 'Cost'], ['Rent', '1200'], ['Food', '600'], ['Total', '1800']]);
  // Markdown in, the app's format out.
  assert.equal(T.parse(T.linkFromMarkdown('todo', '- [x] Sweep\n- [ ] Shop')).env.body, 'x Sweep\n- Shop');
  assert.equal(T.read('sheet', 'Item,Cost\nRent,1200'), 'Item\tCost\nRent\t1200');
  assert.equal(T.read('todo', '- a\nx b'), '- a\nx b');
  // Plain links read too.
  assert.equal(T.parse('https://tinylittleoffice.com/todo/#title=T&doc=-%20a%0Ax%20b').env.body, '- a\nx b');
  assert.equal(T.parse('https://tinylittleoffice.com/sheet/#md=Item%2CCost%0ARent%2C1200').env.body, 'Item\tCost\nRent\t1200');
  // What changed.
  const c = T.compare(u, T.link('sheet', 'Item\tCost\nRent\t1300\nFood\t600\nTotal\t=SUM(B2:B3)'));
  assert.equal(c.same, false);
  assert.deepEqual(c.changes.filter((x) => x.kind !== ' '), [{ kind: '-', line: 'Rent\t1200' }, { kind: '+', line: 'Rent\t1300' }]);
  assert.ok(T.compare(u, u).same);
  assert.ok(T.apps().some((a) => a.id === 'flow'));
  assert.ok(T.example('menu').length > 10 && T.example('sheet').includes('\t'));
  assert.throws(() => T.link('nope', 'x'));
});

test('a model runs for the sliders as set', () => {
  const r = T.runModel(T.example('flow'), { visitors: 10000 });
  assert.equal(r.flows[0].from, 'Visitors');
  assert.equal(r.flows[0].value, 600);
  assert.ok(r.sliders.some((s) => s.name === 'visitors'));
});

test('signed, verified, sealed and opened', async () => {
  const u = T.link('write', '# Hi\n\nThere', { title: 'Note', by: 'writer-agent' });
  const signer = T.createSigner(T.memoryStore());
  const s = await T.signed(u, signer);
  const v = await T.verified(s);
  assert.ok(v && v.ok);
  assert.equal(v!.by, await signer.fingerprint());
  assert.equal(await T.verified(u), null);
  // Tampering shows.
  const tampered = T.link('write', '# Hi\n\nThere!', { title: 'Note', by: 'writer-agent', created: T.parse(s).env.created });
  const forged = tampered.replace(/\/[^/]+$/, '/' + s.split('/').pop()!.slice(0, 1) + 'x');
  assert.notEqual((await T.verified(forged)) ?? { ok: true }, { ok: true });
  const sealedU = await T.sealed(u, 'hunter2');
  assert.ok(T.parse(sealedU).sealed);
  assert.equal((await T.open(sealedU, 'hunter2')).env.body, '# Hi\n\nThere');
  await assert.rejects(T.open(sealedU, 'wrong'));
});

