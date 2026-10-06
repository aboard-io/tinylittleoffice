"""
TinyLittleOffice for Python: documents that live in links, without a browser.

    >>> from tinylittleoffice import link, parse
    >>> url = link("todo", "- Book flights\\nx Renew passport", title="Trip", by="planner-agent")
    >>> parse(url).env.body
    '- Book flights\\nx Renew passport'

A document is a link: the body (in the app's own plain-text format) is
deflated against a dictionary both sides know, base64url'd, and put after
the "#", where no server sees it. This module makes and reads those links,
byte for byte as the site does. Formats for each app are in the guide at
https://tinylittleoffice.com/llms.txt (the same text as `tinyoffice apps`).

Shaping Markdown or CSV into an app's format, evaluating a sheet, and
signing live in the JavaScript package (@tinylittleoffice/doc); here a
link made from Markdown is made by handing the Markdown to the site:
`link_from_markdown` writes a plain link the page reads on opening.
"""
from __future__ import annotations

import base64
import re
import time
import zlib
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import quote, unquote_plus

from .dicts import APP_DICTS, DICTIONARY

SITE = "https://tinylittleoffice.com/"
CREATED_EPOCH_MS = 1577836800000  # 2020-01-01T00:00Z
MAX_DOC_BYTES = 4 * 1024 * 1024

__all__ = ["Envelope", "Parsed", "link", "link_from_markdown", "parse", "encode", "decode", "SITE"]


@dataclass
class Envelope:
    body: str
    created: Optional[int] = None  # ms since the Unix epoch
    title: Optional[str] = None
    by: Optional[str] = None
    key: Optional[str] = None
    sig: Optional[str] = None


@dataclass
class Parsed:
    app: str
    view: str
    sealed: bool
    env: Envelope


# ---------- base64url and deflate ----------

def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode("ascii").rstrip("=")


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _deflate(data: bytes, zdict: Optional[bytes] = None) -> bytes:
    kw = {"zdict": zdict} if zdict else {}
    c = zlib.compressobj(9, zlib.DEFLATED, -15, 9, zlib.Z_DEFAULT_STRATEGY, **kw)
    return c.compress(data) + c.flush()


def _inflate(data: bytes, zdict: Optional[bytes] = None) -> bytes:
    d = zlib.decompressobj(-15, zdict=zdict) if zdict else zlib.decompressobj(-15)
    out = d.decompress(data, MAX_DOC_BYTES + 1)
    if len(out) > MAX_DOC_BYTES:
        raise ValueError("document too large")
    return out


def _dict_for(app: Optional[str]) -> Optional[bytes]:
    own = APP_DICTS.get(app or "")
    return DICTIONARY + ("\n" + own).encode("utf-8") if own else None


def _pack(text: str, app: Optional[str] = None) -> tuple[str, bytes]:
    """The shortest of: raw (r), deflated (z), with the shared dictionary (y), with the app's (w)."""
    raw = text.encode("utf-8")
    best = ("r", raw)
    for flag, zdict in (("z", None), ("y", DICTIONARY), ("w", _dict_for(app))):
        if flag == "w" and zdict is None:
            continue
        packed = _deflate(raw, zdict)
        if len(packed) < len(best[1]):
            best = (flag, packed)
    return best


def _unpack(flag: str, data: bytes, app: Optional[str] = None) -> str:
    if flag == "w":
        zdict = _dict_for(app)
        if zdict is None:
            raise ValueError('a "w" link needs its app')
        return _inflate(data, zdict).decode("utf-8")
    if flag == "y":
        return _inflate(data, DICTIONARY).decode("utf-8")
    if flag == "z":
        return _inflate(data).decode("utf-8")
    if flag == "r":
        return data.decode("utf-8")
    raise ValueError("unknown flag")


# ---------- the envelope ----------

def _b36(n: int) -> str:
    digits = "0123456789abcdefghijklmnopqrstuvwxyz"
    out = ""
    while True:
        n, r = divmod(n, 36)
        out = digits[r] + out
        if n == 0:
            return out


def encode(env: Envelope, app: Optional[str] = None) -> str:
    """The payload (flag + base64url) for an envelope. Uppercase flags carry an envelope; lowercase a bare body."""
    if env.created is None and not env.key and not env.title and not env.by:
        if not env.body:
            return ""
        flag, data = _pack(env.body, app)
        return flag + _b64(data)
    head = []
    if env.created is not None:
        head.append("c" + _b36(max(0, round((env.created - CREATED_EPOCH_MS) / 60000))))
    if env.title:
        head.append("t" + env.title.replace("\n", " "))
    if env.by:
        head.append("b" + env.by.replace("\n", " "))
    if env.key and env.sig:
        head += ["k" + env.key, "s" + env.sig]
    flag, data = _pack("\n".join(head) + "\n\n" + env.body, app)
    return flag.upper() + _b64(data)


def decode(payload: str, app: Optional[str] = None) -> Envelope:
    """The envelope in a payload. Unreadable payloads come back empty rather than raising."""
    if not payload:
        return Envelope("")
    try:
        flag, data = payload[0], _unb64(payload[1:])
        if flag not in "WYZR":
            return Envelope(_unpack(flag, data, app))
        text = _unpack(flag.lower(), data, app)
    except Exception:
        return Envelope("")
    split = text.find("\n\n")
    if split < 0:
        return Envelope("")
    env = Envelope(text[split + 2:])
    for line in text[:split].split("\n"):
        v = line[1:]
        if line[:1] == "c" and v:
            env.created = CREATED_EPOCH_MS + int(v, 36) * 60000
        elif line[:1] == "t" and v:
            env.title = v
        elif line[:1] == "b" and v:
            env.by = v
        elif line[:1] == "k":
            env.key = v
        elif line[:1] == "s":
            env.sig = v
    if not (env.key and env.sig):
        env.key = env.sig = None
    return env


# ---------- links ----------

def link(app: str, body: str, *, title: Optional[str] = None, by: Optional[str] = None, created: Optional[int] = -1, view: str = "", site: str = SITE) -> str:
    """The link for a document in the app's own format. `created` is ms since the epoch; now by default; None for none."""
    env = Envelope(body, created=int(time.time() * 1000) if created == -1 else created, title=title, by=by)
    return f"{site.rstrip('/')}/{app}/#/v2/{app}{'.' + view if view else ''}/{encode(env, app)}"


def link_from_markdown(app: str, markdown: str, *, title: Optional[str] = None, by: Optional[str] = None, site: str = SITE) -> str:
    """A plain link carrying Markdown (or CSV): the page shapes it into the app's format when opened and rewrites itself to a compact link."""
    q = [("md", markdown)]
    if title:
        q.append(("title", title))
    if by:
        q.append(("by", by))
    return f"{site.rstrip('/')}/{app}/#" + "&".join(f"{k}={quote(v, safe='')}" for k, v in q)


_ROUTE = re.compile(r"#/(?:v(\d+)/)?([a-z0-9-]+)(?:\.([A-Za-z0-9]+))?(?:/(.*))?$")


def parse(url: str) -> Parsed:
    """Read a link (or just its fragment): the app, the view and the document. Sealed links come back with `sealed=True` and an empty body."""
    frag = url[url.index("#"):] if "#" in url else "#" + url.lstrip("#")
    m = _ROUTE.search(frag)
    if not m:
        # A plain link: /<app>/#title=…&doc=… (or &md=…: Markdown, which only the page shapes).
        q = dict(p.split("=", 1) if "=" in p else (p, "") for p in frag[1:].split("&"))
        app_m = re.search(r"/([a-z0-9-]+)/#", url)
        app = q.get("app") or (app_m.group(1) if app_m else "")
        if not app:
            raise ValueError("Not a TinyLittleOffice link")
        body = unquote_plus(q.get("doc", q.get("md", "")))
        return Parsed(app, q.get("view", ""), False, Envelope(body, title=unquote_plus(q["title"]) if q.get("title") else None, by=unquote_plus(q["by"]) if q.get("by") else None))
    app, view, payload = m.group(2), m.group(3) or "", m.group(4) or ""
    if payload[:1] == "E":
        return Parsed(app, view, True, Envelope(""))
    return Parsed(app, view, False, decode(payload, app))
