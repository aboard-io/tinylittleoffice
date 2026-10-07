/**
 * Secret Santa, with one person trusted: the organiser. Their document is
 * the list of names; its page gives them a link for each person, and that
 * link is a document holding only that one draw ("Ada gives to Grace"), so
 * the person who opens it learns their own and nobody else's. The list's
 * own link shows every draw, so the organiser keeps it to themselves.
 */
import type { Kind as LineKind } from '../lib/lines.ts';
import { definePage, htmlPage, h1, rest, js, seed } from '../lib/diagram.ts';
import { xml } from '../kit/core.ts';
import { makeRef } from '../kit/embed.ts';

/** Everyone gives to the next person round a shuffled ring: nobody draws themselves, and the draw is the same every time the link is opened. */
export function draw(names: string[]): Record<string, string> {
  const ring = names.map((n) => [seed(n + names.join('|')), n] as const).sort((a, b) => a[0] - b[0]).map(([, n]) => n);
  return Object.fromEntries(ring.map((n, i) => [n, ring[(i + 1) % ring.length]]));
}

/** One person's draw, as their own document: "= Ada > Grace". */
export const ownDraw = (line: string) => /^=\s*(.+?)\s*>\s*(.+?)\s*$/.exec(line);

/** The link for one person's own draw. */
export function linkFor(title: string, giver: string, to: string): string {
  const site = (import.meta.env?.VITE_SITE_URL as string | undefined) ?? '';
  return `${site}santa/#/v2/${makeRef('santa', `${title ? `# ${title}\n` : ''}= ${giver} > ${to}`)}`;
}

function page(body: string): string {
  const title = h1(body) || 'Secret Santa';
  const lines = rest(body);
  const own = lines.map(ownDraw).find(Boolean);
  const css = `main{max-width:32rem;margin:0 auto;padding:2.5rem 1.25rem;text-align:center}h1{font-size:1.8rem}p{color:#52525b}
button{font:inherit;padding:.6rem 1.2rem;border:1px solid #e4e4e7;border-radius:999px;background:#fff;cursor:pointer}button:hover{background:#f4f4f5}
#who{font-size:1.5rem;font-weight:700;color:#18181b;min-height:2.2rem}
.links{text-align:left;margin:1.5rem 0;padding:0;list-style:none}.links li{display:flex;gap:.6rem;align-items:center;padding:.5rem 0;border-top:1px solid #e4e4e7}.links b{min-width:7rem}
.links a{color:#4338ca;word-break:break-all;font-size:.85rem}.links a:focus,.links a:hover{text-decoration:underline}.note{background:#fef3c7;color:#78350f;border-radius:.6rem;padding:.6rem 1rem;font-size:.9rem}`;
  if (own) {
    // One person's page: their draw, shown when they ask, and hidden again after a moment.
    const [, giver, to] = own;
    const hidden = [...to].map((c) => c.charCodeAt(0) + 7);
    return htmlPage(
      title,
      `${giver}'s draw.`,
      css,
      `<main><h1>${xml(title)}</h1><p>${xml(giver)}, this link is yours alone.</p>
<p><button id="show">Show me who I give to</button></p>
<p id="who" role="status" aria-live="polite"></p></main>
<script>
var H = ${js(hidden)}, t, who = document.getElementById('who');
document.getElementById('show').onclick = function () {
  who.textContent = 'You give to ' + H.map(function (c) { return String.fromCharCode(c - 7); }).join('') + '.';
  clearTimeout(t); t = setTimeout(function () { who.textContent = ''; }, 8000);
};
</script>`,
    );
  }
  // The organiser's page: a link for each person.
  const names = [...new Set(lines.filter((l) => !ownDraw(l)))];
  const gives = names.length > 1 ? draw(names) : {};
  return htmlPage(
    title,
    `${names.length} people.`,
    css,
    `<main><h1>${xml(title)}</h1>
<p>Send each person their own link, and only theirs: it says who they give to, and nothing else. Keep this page to yourself; it shows every draw.</p>
${names.length > 1 ? `<ul class="links">${names.map((n) => `<li><b>${xml(n)}</b> <a href="${xml(linkFor(title === 'Secret Santa' && !h1(body) ? '' : title, n, gives[n]))}" target="_blank" rel="noopener">their link</a></li>`).join('')}</ul>` : '<p class="note">Add at least two names.</p>'}
<p class="note">Each link holds one draw. Anyone who opens it can see that one; no link shows the others.</p></main>`,
  );
}

export const spec = {
  form: [
    { name: 'Title', is: '# {Title}', once: true },
    { name: 'Person', is: '{Name}' },
    { name: 'One draw', is: '= {Who} > {Gives to}' },
  ] as LineKind[],
  hint: '"# Title", then a name per line. The page gives you a link for each person that shows only their own draw. Send each theirs; keep this link to yourself.',
  example: '# Office Secret Santa\nAda\nGrace\nAlan\nMargaret\nLinus',
  page,
};

export default definePage({ id: 'santa', name: 'Secret Santa', icon: 'santa', group: 'Collaborate', blurb: 'Secret Santa: names in; a private link out for each person, showing only who they give to.', title: h1 }, spec);
