/**
 * Generated is generated (directive r9-common): a file a script writes from the code is never edited by hand, and a
 * test fails when the committed copy is not what the script would write. Every generating script ends in `generate`,
 * so each has the same two modes and the same words when a file is stale:
 *
 *   node scripts/<script>.ts           write its files
 *   node scripts/<script>.ts --check   write nothing; print each stale file and exit 1
 *
 * test/lints.test.ts runs each script with --check (npm run lint, and the build, run that test).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

/** The files (paths from the root) whose committed text is not `files`' text. */
export function staleFiles(files: Record<string, string>, root = ROOT): string[] {
  return Object.entries(files)
    .filter(([path, want]) => (existsSync(resolve(root, path)) ? readFileSync(resolve(root, path), 'utf8') : null) !== want)
    .map(([path]) => path);
}

/** A script's files written, or with --check in `argv` held against what is committed: a stale one is named with `by`, the command that writes it, and the process exits 1. */
export function generate(files: Record<string, string>, by: string, argv = process.argv.slice(2), root = ROOT): void {
  if (argv.includes('--check')) {
    const stale = staleFiles(files, root);
    for (const path of stale) console.error(`${path} is out of date: run ${by} (it is generated; never edit it by hand).`);
    if (stale.length) process.exit(1);
    return;
  }
  for (const [path, text] of Object.entries(files)) writeFileSync(resolve(root, path), text);
}
