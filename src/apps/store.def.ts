/** Store: a shop window and a cart, from a list of products. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { definePage, htmlPage } from '../lib/diagram.ts';
import { xml } from '../kit/core.ts';

interface Store {
  name: string;
  about: string[];
  currency: string;
  /** Where orders go: an email address, or '' to let the shopper copy their order. */
  orders: string;
  products: { name: string; price: number; about: string; image: string }[];
}

/** "# Name", a line about it, "currency: $", "orders: you@example.com", then products: "Name | 12.50 | about | image address". */
export function parseStore(text: string): Store {
  const store: Store = { name: '', about: [], currency: '$', orders: '', products: [] };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const set = /^(currency|orders)\s*:\s*(.*)$/i.exec(line);
    const parts = line.split('|').map((p) => p.trim());
    if (line.startsWith('# ') && !store.name) store.name = line.slice(2).trim();
    else if (set) store[set[1].toLowerCase() as 'currency' | 'orders'] = set[2].trim();
    else if (parts.length >= 2 && /^\d+(\.\d+)?$/.test(parts[1])) store.products.push({ name: parts[0].replace(/^[-*]\s+/, ''), price: parseFloat(parts[1]), about: parts[2] ?? '', image: /^https?:\/\//.test(parts[3] ?? '') ? parts[3] : '' });
    else store.about.push(line);
  }
  return store;
}

// The cart, in the page itself: no server, nothing stored beyond the visit. Orders go by email, or are copied.
const CART = `
var cart = {}, P = JSON.parse(document.getElementById('products').textContent), S = JSON.parse(document.getElementById('shop').textContent);
function money(n) { return S.currency + n.toFixed(2); }
function count() { return Object.keys(cart).reduce(function (a, k) { return a + cart[k]; }, 0); }
function total() { return Object.keys(cart).reduce(function (a, k) { return a + cart[k] * P[k].price; }, 0); }
function order() { return Object.keys(cart).map(function (k) { return cart[k] + ' x ' + P[k].name + ' = ' + money(cart[k] * P[k].price); }).join('\\n') + '\\nTotal: ' + money(total()); }
function draw() {
  var list = document.getElementById('lines'); list.innerHTML = '';
  Object.keys(cart).forEach(function (k) {
    var li = document.createElement('li');
    var name = document.createElement('span'); name.textContent = P[k].name; li.appendChild(name);
    [['-', -1, 'One fewer ' + P[k].name], ['+', 1, 'One more ' + P[k].name]].forEach(function (b, i) {
      var btn = document.createElement('button'); btn.textContent = b[0]; btn.className = 'q'; btn.setAttribute('aria-label', b[2]);
      btn.onclick = function () { cart[k] += b[1]; if (cart[k] <= 0) delete cart[k]; draw(); };
      if (i === 1) { var n = document.createElement('b'); n.textContent = cart[k]; li.appendChild(n); }
      li.appendChild(btn);
    });
    var sum = document.createElement('span'); sum.className = 'sum'; sum.textContent = money(cart[k] * P[k].price); li.appendChild(sum);
    list.appendChild(li);
  });
  document.getElementById('count').textContent = count();
  document.getElementById('total').textContent = money(total());
  document.getElementById('empty').hidden = count() > 0;
  document.getElementById('send').disabled = count() === 0;
}
[].forEach.call(document.querySelectorAll('[data-add]'), function (b) {
  b.onclick = function () { var k = b.getAttribute('data-add'); cart[k] = (cart[k] || 0) + 1; draw(); document.getElementById('said').textContent = P[k].name + ' added to the cart'; };
});
document.getElementById('send').onclick = function () {
  var text = 'Order from ' + S.name + '\\n\\n' + order();
  if (S.orders) location.href = 'mailto:' + S.orders + '?subject=' + encodeURIComponent('Order from ' + S.name) + '&body=' + encodeURIComponent(text);
  else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { document.getElementById('said').textContent = 'Order copied'; });
};
draw();
`;

function page(text: string): string {
  const s = parseStore(text);
  const name = s.name || 'My store';
  const json = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');
  return htmlPage(
    name,
    s.about[0] ?? name,
    `main{display:grid;grid-template-columns:1fr 20rem;gap:2rem;padding:2rem 0 4rem;align-items:start}
h1{font-size:2.2rem;margin:2rem 0 .3rem}.about{color:#3f3f46;margin:0}
ul{list-style:none;margin:0;padding:0}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(13rem,1fr));gap:1rem}
.grid li{border:1px solid #e4e4e7;border-radius:.9rem;overflow:hidden;display:flex;flex-direction:column}
.grid img,.grid .ph{width:100%;aspect-ratio:4/3;object-fit:cover;background:#f4f4f5;display:block}
.grid div{padding:.9rem;display:flex;flex-direction:column;gap:.3rem;flex:1}.grid span{color:#52525b;font-size:.92rem;flex:1}
.price{font-weight:700}aside{position:sticky;top:1rem;border:1px solid #e4e4e7;border-radius:.9rem;padding:1.1rem}
aside h2{margin:0 0 .6rem;font-size:1.2rem}#lines li{display:flex;align-items:center;gap:.4rem;padding:.35rem 0}#lines span:first-child{flex:1}
.q{padding:0;width:1.7rem;height:1.7rem;border-radius:50%;background:#eef2ff;color:#3730a3}.sum{min-width:4.2rem;text-align:right;font-variant-numeric:tabular-nums}
.tot{display:flex;justify-content:space-between;font-weight:700;border-top:1px solid #e4e4e7;margin-top:.6rem;padding-top:.6rem}
#send{width:100%;margin-top:.8rem}#send:disabled{opacity:.45;cursor:default}#empty{color:#52525b}
@media(max-width:46rem){main{grid-template-columns:1fr}aside{position:static}}`,
    `<div class="wrap"><h1>${xml(name)}</h1>${s.about.map((t) => `<p class="about">${xml(t)}</p>`).join('')}
<main>
<ul class="grid" aria-label="Products">
${s.products.map((p, i) => `<li>${p.image ? `<img src="${xml(p.image)}" alt="" loading="lazy">` : '<div class="ph" aria-hidden="true"></div>'}<div><strong>${xml(p.name)}</strong><span>${xml(p.about)}</span><b class="price">${xml(s.currency)}${p.price.toFixed(2)}</b><button data-add="${i}" aria-label="Add ${xml(p.name)} to the cart">Add to cart</button></div></li>`).join('\n')}
</ul>
<aside aria-label="Cart"><h2>Cart (<span id="count">0</span>)</h2><p id="empty">Nothing in it yet.</p><ul id="lines"></ul><div class="tot"><span>Total</span><span id="total"></span></div><button id="send">${s.orders ? 'Send order by email' : 'Copy order'}</button><p id="said" role="status" aria-live="polite"></p></aside>
</main></div>
<script type="application/json" id="products">${json(s.products)}</script>
<script type="application/json" id="shop">${json({ name, currency: s.currency, orders: s.orders })}</script>
<script>${CART}</script>`,
  );
}

export const spec = {
  form: [
    { name: 'Name', is: '# {Name}', once: true },
    { name: 'Currency', is: 'currency: {Symbol}', once: true },
    { name: 'Orders go to', is: 'orders: {Email}', once: true },
    { name: 'Product', is: '{Name} | {Price}[ | {About}[ | {Picture address}]]' },
    { name: 'About the shop', is: '{Text}' },
  ] as LineKind[],
  hint: '"# Name" and a line about it; a product per line: "Name | price | about | image address". "currency: £" and "orders: you@example.com" set those.',
  example: '# Harbor Coffee Shop\nBeans and things, posted on Fridays.\ncurrency: $\norders: orders@example.com\nHouse blend, 250g | 12.50 | Chocolate and orange. Good for anything.\nQuay espresso, 250g | 14.00 | Dark, syrupy, made for milk.\nFilter papers | 4.00 | A hundred, unbleached.\nTin mug | 9.00 | Enamel. Survives the boat.',
  page,
};

export default definePage({ id: 'store', name: 'Store', icon: 'store', group: 'Publish and sell', blurb: 'A shop page with a working cart, from a list of products. Orders go by email.', title: (body) => parseStore(body).name }, spec);
