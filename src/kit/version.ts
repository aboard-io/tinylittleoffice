/**
 * Which build this is: /version.json, written by the build (scripts/version.ts) and read lazily by About,
 * which says "Running commit abc1234" with a link to that commit's source. The commit, its tag (or ""), the
 * commit's own date (not the clock's: two builds of one commit are the same bytes, scripts/reproducible.ts)
 * and the Content-Security-Policy's script hashes, so a reader can check a running site against its source
 * (scripts/verify-deploy.ts). The fetch is the site's own file, made when About opens; never a request to
 * GitHub, which is a link (kit/network.ts `source`).
 */
import { origin } from './network.ts';

export interface Version {
  /** The full commit id. */
  commit: string;
  /** The tag at that commit ("v1.0.0"), or "". */
  tag: string;
  /** The commit's date, ISO 8601. */
  built: string;
  csp: { scripts: string[] };
}

/** The repository the source is published in, on the host kit/network.ts names. */
export const REPO = 'aboard-io/tinylittleoffice';

/** The repository's own page: the home page's "Open source". */
export const repoUrl = () => `${origin('source')}/${REPO}`;

/** The page for a commit (or a tag) in the published source. */
export const commitUrl = (commit: string) => `${repoUrl()}/commit/${commit}`;

/** A file of the source as main holds it ("docs/threat-model.md"). */
export const sourceFile = (path: string) => `${repoUrl()}/blob/main/${path}`;

/** Whether a value has the shape of /version.json. */
export function isVersion(v: unknown): v is Version {
  const o = v as Version;
  return (
    !!o &&
    typeof o === 'object' &&
    typeof o.commit === 'string' &&
    typeof o.tag === 'string' &&
    typeof o.built === 'string' &&
    !!o.csp &&
    Array.isArray(o.csp.scripts) &&
    o.csp.scripts.every((s) => typeof s === 'string')
  );
}

let asked: Promise<Version | null> | null = null;

/** This site's /version.json (under `root`), kept once read; null where there is none (the dev server) or it cannot be read, asked again next time. */
export function running(root: string): Promise<Version | null> {
  asked ??= fetch(new URL('version.json', root), { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .then((v: unknown) => (isVersion(v) && v.commit ? v : null))
    .catch(() => null)
    .then((v) => ((asked = v ? asked : null), v));
  return asked;
}
