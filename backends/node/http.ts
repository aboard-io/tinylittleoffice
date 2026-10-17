/**
 * node:http as the Fetch API the Workers are written to: a request in as a Request, a Response out (toRequest, send),
 * and the built site's files as the ASSETS binding serves them on Cloudflare (assets): the headers dist/_headers gives
 * each path, read by the one reading the build and the preview use (scripts/headers.ts headersFor), so the
 * Content-Security-Policy reaches the browser as the file says it; a folder's page at its address with a slash
 * (auto-trailing-slash), and dist/404.html for what is not there (404-page).
 */
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { Readable } from 'node:stream';
import { createGzip } from 'node:zlib';
import { headersFor } from '../../scripts/headers.ts';

/** The most a request may carry: a preview card's picture (400 KB, as base64) and its words, with room to spare. */
export const MAX_BODY = 1024 * 1024;

/**
 * A node request as a Request at `origin`, its body read whole (null when it is over MAX_BODY). The address that
 * asked goes in cf-connecting-ip, where Cloudflare puts it and the brake reads it (backends/tinier/brake.ts): the socket's,
 * or `ipHeader`'s when a proxy in front names it; whatever the client sent under that name is dropped.
 */
export async function toRequest(req: IncomingMessage, origin: string, ipHeader = ''): Promise<Request | null> {
  const headers = new Headers();
  for (let i = 0; i < req.rawHeaders.length; i += 2) headers.append(req.rawHeaders[i], req.rawHeaders[i + 1]);
  const ip = (ipHeader && headers.get(ipHeader)?.split(',')[0].trim()) || req.socket.remoteAddress || '';
  headers.set('cf-connecting-ip', ip);
  const method = req.method ?? 'GET';
  let body: Uint8Array<ArrayBuffer> | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req as AsyncIterable<Buffer>) {
      size += chunk.length;
      if (size > MAX_BODY) return null;
      chunks.push(chunk);
    }
    body = new Uint8Array(Buffer.concat(chunks));
  }
  return new Request(new URL(req.url ?? '/', origin), { method, headers, body });
}

const TEXT = /^(text\/|application\/(json|javascript|manifest\+json|xml)|image\/svg)/;

/** A Response written to node, gzipped when the client takes it and the body is text. */
export async function send(res: ServerResponse, response: Response, acceptEncoding = ''): Promise<void> {
  const headers = new Headers(response.headers);
  const zip = response.body && !headers.has('content-encoding') && TEXT.test(headers.get('content-type') ?? '') && /\bgzip\b/.test(acceptEncoding);
  if (zip) {
    headers.set('content-encoding', 'gzip');
    headers.delete('content-length');
    headers.append('vary', 'accept-encoding');
  }
  const out: Record<string, string | string[]> = {};
  headers.forEach((v, k) => (out[k] = v));
  if (headers.has('set-cookie')) out['set-cookie'] = headers.getSetCookie();
  res.writeHead(response.status, out);
  if (!response.body) return void res.end();
  const body = Readable.fromWeb(response.body as import('node:stream/web').ReadableStream);
  await new Promise<void>((done) => (zip ? body.pipe(createGzip()) : body).pipe(res).on('finish', done).on('error', done));
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.pdf': 'application/pdf',
};

/** The built site in `dir` as Cloudflare's ASSETS binding: fetch(request) → the file, with its _headers. */
export function assets(dir: string): { fetch(req: Request): Promise<Response> } {
  const rules = readFileSync(join(dir, '_headers'), 'utf8');
  const file = (path: string) => {
    try {
      return statSync(path).isFile() ? path : null;
    } catch {
      return null;
    }
  };
  const serve = (req: Request, path: string, at: string, status = 200): Response => {
    const st = statSync(at);
    const etag = `"${createHash('sha1').update(`${st.size}:${st.mtimeMs}:${at}`).digest('base64url')}"`;
    const headers = new Headers({ 'content-type': TYPES[extname(at)] ?? 'application/octet-stream', etag });
    for (const [k, v] of Object.entries(headersFor(rules, path))) headers.set(k, v);
    if (status === 200 && req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });
    headers.set('content-length', String(st.size));
    return new Response(req.method === 'HEAD' ? null : readFileSync(at), { status, headers });
  };
  return {
    async fetch(req) {
      const url = new URL(req.url);
      let path: string;
      try {
        path = decodeURIComponent(url.pathname);
      } catch {
        path = '';
      }
      const local = normalize(join(dir, path));
      // Cloudflare never serves the headers file itself; nor is anything outside the build.
      const inside = path.startsWith('/') && !path.includes('\0') && (local + sep).startsWith(normalize(dir + sep)) && !/^\/_(headers|redirects)$/.test(path);
      if (inside && (req.method === 'GET' || req.method === 'HEAD')) {
        if (path.endsWith('/')) {
          const index = file(join(local, 'index.html'));
          if (index) return serve(req, path, index);
        } else {
          const exact = file(local);
          if (exact) return serve(req, path, exact);
          if (file(join(local, 'index.html'))) return new Response(null, { status: 307, headers: { location: `${url.pathname}/${url.search}` } });
          const html = file(`${local}.html`);
          if (html) return serve(req, path, html);
        }
      }
      const missing = file(join(dir, '404.html'));
      return missing ? serve(req, url.pathname, missing, 404) : new Response('Not found', { status: 404 });
    },
  };
}
