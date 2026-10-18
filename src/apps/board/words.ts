/**
 * The words the model is given in the reader's language: the names a board's table is born with (its title column, the
 * suite's own word for a title, and its status column) and a new board's three lanes. The model speaks no language
 * (model.ts, so a program under Node uses it with English), and the definition and the editor ask here, at the moment
 * they need them, so a board made after the language changes is made in the new one. Every id is a message of
 * src/i18n/<lang>.ftl, the Board's (`board-…`) or the suite's (`common-title`).
 */
import { t } from '../../kit/core/i18n.ts';
import type { ColumnNames } from './model.ts';

/** The title column's and the status column's names, as the reader says them. */
export const columnNames = (): ColumnNames => ({ title: t('common-title'), status: t('board-status') });

/** A new board's lanes, as the reader says them: what is still to do, what is being done, what is finished. */
export const blankLanes = (): string[] => [t('board-to-do'), t('board-doing'), t('board-done')];
