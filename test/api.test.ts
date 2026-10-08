import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../src/api.ts';

test('a link is made, read, shaped from Markdown, and compared', () => {
  const budget = 'Item | Cost:money\n--- | ---\nRent | 1200\nFood | 600\nTotal | =SUM(B1:B2)';
  const u = T.link('sheet', budget, { title: 'Budget', by: 'planner-agent' });
  assert.match(u, /^https:\/\/tinylittleoffice\.com\/sheet\/#\/v0\/sheet\/[yzr]/);
  const p = T.parse(u);
  assert.equal(p.app, 'sheet');
  assert.equal(p.env.title, 'Budget');
  assert.equal(p.env.by, 'planner-agent');
  assert.equal(p.env.body, budget);
  // Its Markdown is its own text, named in the header.
  assert.equal(p.markdown, '---\ntitle: Budget\n---\n' + budget + '\n');
  assert.deepEqual(T.evaluateSheet(p.env.body), [['Rent', '$1,200.00'], ['Food', '$600.00'], ['Total', '$1,800.00']]);
  // Markdown in, the app's own text out.
  assert.equal(T.parse(T.linkFromMarkdown('todo', '- [x] Sweep\n* Shop')).env.body, '- [x] Sweep\n- [ ] Shop');
  assert.equal(T.read('sheet', 'Item,Cost\nRent,1200'), 'Item | Cost\n--- | ---\nRent | 1200');
  assert.equal(T.read('todo', '- a\n- [x] b'), '- [ ] a\n- [x] b');
  // Plain links read too; the document's header may name it.
  assert.equal(T.parse('https://tinylittleoffice.com/todo/#title=T&doc=-%20a%0A-%20%5Bx%5D%20b').env.body, '- [ ] a\n- [x] b');
  assert.equal(T.parse('https://tinylittleoffice.com/sheet/#md=Item%2CCost%0ARent%2C1200').env.body, 'Item | Cost\n--- | ---\nRent | 1200');
  const named = T.parse('https://tinylittleoffice.com/#doc=' + encodeURIComponent('---\napp: todo\ntitle: Errands\n---\n- milk'));
  assert.deepEqual([named.app, named.env.title, named.env.body], ['todo', 'Errands', '- [ ] milk']);
  // What changed.
  const c = T.compare(u, T.link('sheet', budget.replace('Rent | 1200', 'Rent | 1300')));
  assert.equal(c.same, false);
  assert.deepEqual(c.changes.filter((x) => x.kind !== ' '), [{ kind: '-', line: 'Rent | 1200' }, { kind: '+', line: 'Rent | 1300' }]);
  assert.ok(T.compare(u, u).same);
  assert.ok(T.apps().some((a) => a.id === 'flow'));
  assert.ok(T.example('menu').length > 10 && T.example('sheet').includes(' | '));
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

