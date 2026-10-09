/**
 * The strings, in English: every one a person sees, each the key t() looks up. To translate, copy this file
 * to <code>.ts (es.ts, pt-br.ts: a BCP 47 tag, lowercase) and put the words of that language on the right
 * of each line; keep the left side, the key, exactly as it is. Keep every {placeholder}; in a plural
 * {n|one slide|# slides} give the forms your language has, in its order (zero, one, two, few, many, other),
 * "#" standing for the number. One string per line, in these sections; a comment only where the English
 * is ambiguous. `npm run i18n:check` reports anything missing or mismatched; `npm run i18n:extract` lands
 * new keys at the end, under a "sort me" heading, for a hand to place.
 */
import type { Strings } from '../kit/i18n.ts';

export default {
  // ---- the shell: header ----
  'Menu': 'Menu',
  'Title': 'Title',
  'New {app}': 'New {app}',
  'Untitled {app}': 'Untitled {app}',
  'Share': 'Share',
  'Download': 'Download',
  'Loading…': 'Loading…',
  'This link holds something that cannot be read. It may have been cut short when it was copied.': 'This link holds something that cannot be read. It may have been cut short when it was copied.',
  '{n} of {max} link characters left': '{n} of {max} link characters left',
  '{n} characters over the link limit': '{n} characters over the link limit',

  // ---- the home page ----
  'A tiny office suite that lives entirely in the URL. The link is the document.': 'A tiny office suite that lives entirely in the URL. The link is the document.',
  'Blank': 'Blank',
  'Templates': 'Templates',
  // The button under an app's tile, naming the template list: "Start Text from"
  'Start {app} from': 'Start {app} from',

  // ---- the drawer (hamburger menu) ----
  'Apps': 'Apps',
  'Find an app': 'Find an app',
  'No app by that name': 'No app by that name',
  'Close': 'Close',
  'Private': 'Private',
  'Private: nothing saved': 'Private: nothing saved',
  'Nothing is saved on this device: no cookies, no trace.': 'Nothing is saved on this device: no cookies, no trace.',
  'Saved on this device': 'Saved on this device',
  'Saved on this device from now on': 'Saved on this device from now on',
  'Your preferences and the offline copy stay here. Turn off to forget all of it.': 'Your preferences and the offline copy stay here. Turn off to forget all of it.',
  'Save nothing on this device from now on? Your preferences and the offline copy are forgotten (your documents live in their links).': 'Save nothing on this device from now on? Your preferences and the offline copy are forgotten (your documents live in their links).',
  'Keep the app on this device': 'Keep the app on this device',
  'Language': 'Language',
  'Theme': 'Theme',
  'Match the device': 'Match the device',
  'Light': 'Light',
  'Dark': 'Dark',
  'About': 'About',
  'About TinyLittleOffice': 'About TinyLittleOffice',
  'A tiny office suite that lives entirely in the URL. No server, no accounts, no saving: the link is the document.': 'A tiny office suite that lives entirely in the URL. No server, no accounts, no saving: the link is the document.',
  'Nothing you write leaves your browser unless you share the link. Private by default; the switch in this menu keeps your settings on this device.': 'Nothing you write leaves your browser unless you share the link. Private by default; the switch in this menu keeps your settings on this device.',

  // ---- the copy kept on the device (status lines under the switch) ----
  'Only on the built site': 'Only on the built site',
  'Not possible in this browser': 'Not possible in this browser',
  'Saving…': 'Saving…',
  'Ready to work offline': 'Ready to work offline',
  'Updated, reload': 'Updated, reload',
  'Could not save': 'Could not save',
  'Not kept': 'Not kept',
  '{mb} MB': '{mb} MB',

  // ---- sharing ----
  'Copy link': 'Copy link',
  'Link copied': 'Link copied',
  'Could not copy': 'Could not copy',
  'Share…': 'Share…',
  'QR code': 'QR code',
  'QR code of this document': 'QR code of this document',
  'The whole document, {n} bytes, as one code. Anyone who scans it has it.': 'The whole document, {n} bytes, as one code. Anyone who scans it has it.',
  'This document is {n} bytes; the largest QR code holds {max}. Shorten it by {over} bytes and it will fit.': 'This document is {n} bytes; the largest QR code holds {max}. Shorten it by {over} bytes and it will fit.',
  'Shorter link that expires…': 'Shorter link that expires…',
  'A shorter link that expires': 'A shorter link that expires',
  'The link is encrypted here; the key stays in the short link, which browsers never send. The service holds only the ciphertext, until the time you choose.': 'The link is encrypted here; the key stays in the short link, which browsers never send. The service holds only the ciphertext, until the time you choose.',
  'Expires after': 'Expires after',
  'Expires {when}': 'Expires {when}',
  'An hour': 'An hour',
  'A day': 'A day',
  'A week': 'A week',
  'A month': 'A month',
  'Make a short link': 'Make a short link',
  'Making…': 'Making…',
  'Copy short link': 'Copy short link',
  'Too many short links from here this hour.': 'Too many short links from here this hour.',
  'Could not shorten the link.': 'Could not shorten the link.',

  // ---- the document dialog: where the link fits ----
  'This document': 'This document',
  'Link': 'Link',
  '{n} characters': '{n} characters',
  'Where the link fits': 'Where the link fits',
  'Where': 'Where',
  'Limit': 'Limit',
  'This link': 'This link',
  'Left': 'Left',
  '{n} (any length)': '{n} (any length)',
  '{n} over': '{n} over',
  'Any browser': 'Any browser',
  'the classic safe length for a link': 'the classic safe length for a link',
  'shows a short form of any link': 'shows a short form of any link',
  'any link counts as 23': 'any link counts as 23',
  'Text message': 'Text message',
  'one SMS': 'one SMS',
  'one message': 'one message',
  'the largest code there is (version 40)': 'the largest code there is (version 40)',
  'NTAG215 tag': 'NTAG215 tag',
  'an NFC sticker (504 bytes)': 'an NFC sticker (504 bytes)',
  'NTAG216 tag': 'NTAG216 tag',
  'a bigger NFC sticker (888 bytes)': 'a bigger NFC sticker (888 bytes)',

  // ---- downloads ----
  'Print': 'Print',
  'Print, or save as PDF': 'Print, or save as PDF',
  'Picture (PNG)': 'Picture (PNG)',
  'Web page (HTML)': 'Web page (HTML)',
  'Text (TLO)': 'Text (TLO)',
  'Downloaded {name}': 'Downloaded {name}',
  'Download failed': 'Download failed',
  'No .{ext} view here': 'No .{ext} view here',
  'Open in TinyLittleOffice': 'Open in TinyLittleOffice',

  // ---- the bar, shared by every app ----
  'Insert': 'Insert',
  'Bold': 'Bold',
  'Italic': 'Italic',
  'Heading': 'Heading',
  'List': 'List',
  'Table': 'Table',

  // ---- the example in the kit's own documentation ----
  '{n|one slide|# slides}': '{n|one slide|# slides}',

  // ---- the Text app ----
  'Text': 'Text',
  // The group heading Text sits under on the home page.
  'Words': 'Words',
  'Words on a page: headings, lists, links and notes, printed on letter or A4.': 'Words on a page: headings, lists, links and notes, printed on letter or A4.',
  'Write here.': 'Write here.',
  'A page of text': 'A page of text',
  'Meeting notes': 'Meeting notes',
  'Who was there, what was decided, what is next.': 'Who was there, what was decided, what is next.',
} satisfies Strings;
