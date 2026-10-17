// The keys one press reaches two commands with, allowed, each with why (test/commands.test.ts fails on any other):
// the words' commands inside an app's, an app's own at one place in turn, and the page's search (Mod+K) under Link.

/** In a one-line box (an outline's row, a task, a stop, a headline) the words' Tab, Alt+Up/Down and Mod+Enter are off (they act on the items of a list in a document or a slide's words), so the row's own have the key; in a box of several lines the words' have it, and the row's let it go by. */
const LINE = 'in a one-line box the words leave Tab, Alt+Up/Down and Mod+Enter to the row they are in';

export const SHADOWS: Record<string, string> = {
  'kit.search ~ text.link': 'in words Mod+K is Link (Docs’ key, and every editor’s); the drawer’s search for anything is Mod+K everywhere else, and the menu button opens it',
  'outline.indent ~ text.indent': LINE,
  'outline.outdent ~ text.outdent': LINE,
  'cal.task.nest ~ text.indent': LINE,
  'cal.task.nest ~ text.outdent': LINE,
  'outline.up ~ text.up': LINE,
  'outline.down ~ text.down': LINE,
  'deck.up ~ text.up': `${LINE}: the headline's moves the slide; the slide's words move their items`,
  'deck.down ~ text.down': `${LINE}: the headline's moves the slide; the slide's words move their items`,
  'cal.task.move ~ text.up': LINE,
  'cal.task.move ~ text.down': LINE,
  'text.up ~ trip.move': LINE,
  'text.down ~ trip.move': LINE,
  'board.move ~ text.up': LINE,
  'board.move ~ text.down': LINE,
  'deck.onto ~ text.tick': `${LINE}: Mod+Enter in the headline goes on to the words, a line's "done"`,
  'diagram.done ~ text.tick': `${LINE}: Mod+Enter is done with a thing's words`,
  'cal.task.tick ~ text.tick': LINE,
  'outline.tick ~ text.tick': `${LINE}: Mod+Enter in a row checks its task's box, and its status follows (the compound bullet, 2026-10-15)`,
  'sheet.cancel ~ sheet.letgo': 'Escape lets a block of cells go first (one step a press), then puts back what the cell held',
  'draw.pen.close ~ draw.words': 'Enter closes a pen’s shape while one is being drawn; otherwise it opens the words of the shape in hand',
  'draw.joinkeys ~ draw.words': 'with the Join tool in hand Enter takes an end of the join; otherwise it opens the words',
  'draw.joinkeys ~ draw.pen.close': 'the Join tool and the pen are never in hand together',
  'draw.delete ~ draw.pen.back': 'Backspace takes the pen’s last corner back while a shape is being drawn; otherwise it deletes the shapes in hand',
  'draw.out ~ draw.pen.cancel': 'Escape lets the pen’s shape go first (one step a press), then steps out of the rest',
  'draw.joinkeys ~ draw.nudge': 'with the Join tool in hand the arrows go from shape to shape; otherwise they nudge the shapes in hand',
};
