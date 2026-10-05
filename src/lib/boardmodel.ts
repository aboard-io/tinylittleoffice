/**
 * Board (kanban) document model: the stages of a workflow, each holding cards.
 * Format: a line starting with "#" opens a stage ("#Name" or "#Name|<limit>",
 * the limit being the most cards the stage should hold at once). Every other
 * line is a card in the stage above it; a card that itself starts with "#" or
 * "\" is written with a leading "\".
 */
export interface Stage {
  name: string;
  /** Work-in-progress limit, 0 for none. */
  limit: number;
  cards: string[];
}

export const DEFAULT_STAGES = ['To do', 'Doing', 'Done'];
export const MAX_STAGES = 8;

export function emptyBoard(): Stage[] {
  return DEFAULT_STAGES.map((name) => ({ name, limit: 0, cards: [] }));
}

export function parseBoard(text: string): Stage[] {
  if (!text) return emptyBoard();
  const stages: Stage[] = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('#')) {
      const m = /^#(.*?)(?:\|(\d+))?$/.exec(line)!;
      stages.push({ name: m[1], limit: m[2] ? parseInt(m[2], 10) : 0, cards: [] });
    } else if (line !== '') {
      if (!stages.length) stages.push({ name: DEFAULT_STAGES[0], limit: 0, cards: [] });
      stages[stages.length - 1].cards.push(line.startsWith('\\') ? line.slice(1) : line);
    }
  }
  return stages.length ? stages : emptyBoard();
}

export function serializeBoard(stages: Stage[]): string {
  // An untouched board costs nothing.
  if (stages.length === DEFAULT_STAGES.length && stages.every((s, i) => s.name === DEFAULT_STAGES[i] && !s.limit && !s.cards.length)) return '';
  const lines: string[] = [];
  for (const s of stages) {
    lines.push('#' + s.name.replace(/[\n|]/g, ' ') + (s.limit > 0 ? '|' + Math.round(s.limit) : ''));
    for (const c of s.cards) {
      const card = c.replace(/\n/g, ' ');
      if (card.trim() === '') continue;
      lines.push(/^[#\\]/.test(card) ? '\\' + card : card);
    }
  }
  return lines.join('\n');
}
