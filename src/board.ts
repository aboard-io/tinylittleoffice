/**
 * The Board for a page (docs/library.md, The library's own apps): cards in lanes over a table, an app of the library's
 * that the site does not list. The npm package serves it as `tinylittleoffice/board` (dist/board.js), beside the
 * editors' file it imports its kit from, so it joins the page's one Lit and one registry; its stylesheet is
 * `tinylittleoffice/board.css`, and its model alone, with no DOM, `tinylittleoffice/board/model`.
 *
 *   import { registerBoard } from 'tinylittleoffice/board';
 *   import { mount } from 'tinylittleoffice/editors';
 *   import 'tinylittleoffice/editors.css';
 *   import 'tinylittleoffice/board.css';
 *   registerBoard();
 *   const { editor, applyRemote } = await mount('board', text, main, (next) => save(next), { onOps: send });
 *
 * `registerBoard()` is what a page does once, before anything draws a board: the definition registered after the
 * suite's apps (kit/core/apps.ts `registerApp`), so `mount('board', …)` draws it, `appOf('board')` finds it and a
 * board placed in another document is drawn by its own view. Called again it does nothing, where `registerApp` would
 * throw; another app registered as "board" before it is still the registry's error. `install` is the same function by
 * the name the Board's package of its own gave it, before the Board came into the library, so a page that called that
 * calls this. The Board's
 * words are the library's own messages (src/i18n/, `board-…`), in the editors' files with every language's, so there
 * is nothing to add.
 *
 * Beside it, everything `tinylittleoffice/board/model` serves (apps/board/model.ts), for a page that builds or changes
 * a board itself; and the types of the editor (`ToBoardEditor`, `<to-board-editor>`) and of a pick (`PickedCard`).
 */
import { appOf, registerApp } from './kit/core/apps.ts';
import board from './apps/board/def.ts';
import './apps/board/editor.ts';

export { board };
export * from './apps/board/model.ts';
export type { PickedCard, ToBoardEditor } from './apps/board/editor.ts';

/** The Board put beside the suite's apps. Once: a second call does nothing. */
export function registerBoard(): void {
  if (appOf(board.id) !== board) registerApp(board);
}
/** `registerBoard`, by the name the Board's own package gave it. */
export const install = registerBoard;
