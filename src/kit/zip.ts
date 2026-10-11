/**
 * A zip of text and binary files: what the Office formats (.xlsx, .docx, .pptx) are, and Download everything; and
 * one read back (a zip of documents opened: kit/open.ts). fflate, where the platform has no zip reader or writer
 * (CompressionStream makes a gzip stream, not an archive).
 */
import { strToU8, unzipSync, zipSync, type Zippable } from 'fflate';

export function zip(files: Record<string, string | Uint8Array>, created: number | null = null): Uint8Array {
  const tree: Zippable = {};
  for (const [path, data] of Object.entries(files)) tree[path] = typeof data === 'string' ? strToU8(data) : data;
  // A fixed timestamp keeps the same document producing the same bytes.
  return zipSync(tree, { level: 9, mtime: new Date(created ?? Date.UTC(2020, 0, 1)) });
}

/** A zip's files by path, in the archive's order; with `want`, only those it takes are inflated. Throws on what is not a zip. */
export function unzip(bytes: Uint8Array, want: (name: string, size: number) => boolean = () => true): Record<string, Uint8Array> {
  return unzipSync(bytes, { filter: (f) => want(f.name, f.originalSize) });
}

export const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
