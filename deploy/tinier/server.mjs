// tinier: a link shortener that never sees a link. The page encrypts the
// long link with a key it keeps in the short link's fragment (which browsers
// never send); this server stores only the ciphertext, for as long as it was
// told to, and hands it back. Opening a short link fetches the ciphertext,
// decrypts it in the browser, and goes there.
//
//   POST /api            {c: <base64url ciphertext>, iv: <base64url>, ttl: <seconds>}  -> {id, exp}
//   GET  /api/<id>       -> {c, iv, exp}   (404 once gone)
//   GET  /<id>           the page that decrypts and redirects
//   GET  /               what this is
//
// No logs are kept. Node, no dependencies. Files under DIR, one per link.
import { createServer } from 'node:http';
import { mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';

const PORT = +(process.env.PORT ?? 8010);
const DIR = process.env.TINIER_DIR ?? '/var/lib/tinier';
const MAX_BYTES = 8 * 1024;
const TTLS = new Set([3600, 86400, 7 * 86400, 30 * 86400]);
mkdirSync(DIR, { recursive: true });

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
const newId = () => Array.from(randomBytes(7), (b) => ALPHABET[b % ALPHABET.length]).join('');
const valid = (s) => /^[a-z0-9]{7}$/.test(s);
const b64 = /^[A-Za-z0-9_-]+$/;

/** Expired links go, every hour and at start. */
function sweep() {
  const now = Date.now();
  for (const f of readdirSync(DIR)) {
    try {
      const { exp } = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
      if (exp < now) unlinkSync(join(DIR, f));
    } catch {
      unlinkSync(join(DIR, f));
    }
  }
}
sweep();
setInterval(sweep, 3600_000).unref();

/** A gentle brake on one address making many links: 60 an hour. */
const made = new Map();
function allowed(ip) {
  const now = Date.now();
  const list = (made.get(ip) ?? []).filter((t) => now - t < 3600_000);
  list.push(now);
  made.set(ip, list);
  return list.length <= 60;
}

const PAGE = readFileSync(new URL('./page.html', import.meta.url), 'utf8');
const json = (res, code, body) => {
  res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': 'https://tinylittleoffice.com' });
  res.end(JSON.stringify(body));
};
const html = (res, code, body) => {
  res.writeHead(code, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'" });
  res.end(body);
};

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const ip = (req.headers['x-forwarded-for'] ?? '').toString().split(',').pop()?.trim() || req.socket.remoteAddress || '';
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'access-control-allow-origin': 'https://tinylittleoffice.com', 'access-control-allow-methods': 'POST, GET', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' });
    return res.end();
  }
  if (req.method === 'POST' && url.pathname === '/api') {
    if (!allowed(ip)) return json(res, 429, { error: 'Too many links from here this hour.' });
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > MAX_BYTES * 2) req.destroy();
    });
    req.on('end', () => {
      try {
        const { c, iv, ttl } = JSON.parse(data);
        if (typeof c !== 'string' || typeof iv !== 'string' || !b64.test(c) || !b64.test(iv) || c.length > MAX_BYTES || iv.length > 32 || !TTLS.has(ttl)) return json(res, 400, { error: 'Bad request' });
        let id = newId();
        while (exists(id)) id = newId();
        const exp = Date.now() + ttl * 1000;
        writeFileSync(join(DIR, id), JSON.stringify({ c, iv, exp }), { mode: 0o600 });
        json(res, 201, { id, exp });
      } catch {
        json(res, 400, { error: 'Bad request' });
      }
    });
    return;
  }
  if (req.method === 'GET' && url.pathname.startsWith('/api/')) {
    const id = url.pathname.slice(5);
    const rec = valid(id) && read(id);
    if (!rec) return json(res, 404, { error: 'No such link, or it has expired.' });
    return json(res, 200, rec);
  }
  if (req.method === 'GET' && url.pathname === '/') return html(res, 200, PAGE.replace('{{id}}', ''));
  if (req.method === 'GET' && valid(url.pathname.slice(1))) {
    const id = url.pathname.slice(1);
    return html(res, read(id) ? 200 : 404, PAGE.replace('{{id}}', read(id) ? id : ''));
  }
  html(res, 404, PAGE.replace('{{id}}', ''));
}).listen(PORT, '127.0.0.1', () => console.log(`tinier on ${PORT}, links in ${DIR}`));

function exists(id) {
  try {
    statSync(join(DIR, id));
    return true;
  } catch {
    return false;
  }
}
function read(id) {
  try {
    const rec = JSON.parse(readFileSync(join(DIR, id), 'utf8'));
    if (rec.exp < Date.now()) {
      unlinkSync(join(DIR, id));
      return null;
    }
    return rec;
  } catch {
    return null;
  }
}
