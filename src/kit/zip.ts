/**
 * A zip of text and binary files: what the Office formats (.xlsx, .docx, .pptx) are. fflate, where the
 * platform has no zip writer (CompressionStream makes a gzip stream, not an archive).
 */
import { strToU8, zipSync, type Zippable } from 'fflate';

export function zip(files: Record<string, string | Uint8Array>, created: number | null = null): Uint8Array {
  const tree: Zippable = {};
  for (const [path, data] of Object.entries(files)) tree[path] = typeof data === 'string' ? strToU8(data) : data;
  // A fixed timestamp keeps the same document producing the same bytes.
  return zipSync(tree, { level: 9, mtime: new Date(created ?? Date.UTC(2020, 0, 1)) });
}

export const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
