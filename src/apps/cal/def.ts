/**
 * Calendar: labelled spans of time on a month, a year or a schedule. The document is a list of dated items
 * (model.ts); the same items drawn as a Gantt chart when the head says `view: gantt`. The editor is
 * editor.ts, the drawing and the files view.ts.
 */
import { CalendarDays } from 'lucide';
import { apply, parse, write } from '../../doc/index.ts';
import { defineApp, type Doc } from '../../kit/app.ts';
import { csvSeparator } from '../../kit/csv.ts';
import { utf8 } from '../../kit/draw.ts';
import { t } from '../../kit/i18n.ts';
import { templates } from './templates.ts';
import { calPages, calToCsv, calToIcs } from './view.ts';

export const titleOf = (doc: Doc): string => parse(doc).head.title ?? '';
export const retitle = (doc: Doc, title: string): Doc => write(apply(parse(doc), { op: 'head', key: 'title', value: title.replace(/\n/g, ' ').trim() || undefined }));

export default defineApp({
  id: 'cal',
  get name() {
    return t('Calendar');
  },
  get group() {
    return t('Plan');
  },
  icon: CalendarDays,
  get blurb() {
    return t('Days and times on a month, a year or a schedule, in any time zone.');
  },
  // Nothing yet: the editor opens on this month.
  blank: () => '',
  get templates() {
    return templates();
  },
  editor: () => import('./editor.ts'),
  title: titleOf,
  retitle,
  view: (doc, opts) => calPages(parse(doc), !!opts?.small),
  exports: [
    { ext: 'ics', label: () => t('iCalendar (ICS)'), mime: 'text/calendar;charset=utf-8', build: (doc) => utf8(calToIcs(parse(doc), Date.now())) },
    { ext: 'csv', label: () => t('CSV'), mime: 'text/csv;charset=utf-8', build: (doc) => utf8('﻿' + calToCsv(parse(doc), csvSeparator())) },
  ],
});
