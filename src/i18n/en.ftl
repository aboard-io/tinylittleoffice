### The strings, in English: every one a person sees, each a message t() looks up by its id. The id is stable: a
### wording changes under it, and a new meaning is a new id. To translate, copy this file to <code>.ftl (es.ftl,
### pt-br.ftl: a BCP 47 tag, lowercase) and put the words of that language after each "=", keeping the id. Keep every
### { $placeholder }; a plural is a select on its number, a variant for each of your language's plural categories
### (zero, one, two, few, many, other: those it has), *[other] the default, { $n } the number. In these groups; a
### comment only where the English is ambiguous. `npm run i18n:check` reports anything missing or mismatched;
### `npm run i18n:extract` lands new ids at the end, under a "sort me" group, for a hand to word and place;
### `npm run i18n:gaps -- <code>` prints the messages a language lacks, in English, to translate and paste in; where the
### language still has a message this file has dropped whose English was the new one less a few words, its old
### translation comes as a draft, marked "# draft from <old id>": read it, make it right, take the mark off (the check
### fails while it is in). A message left the same as its English fails the check unless its comment has a line
### "# same" (a name, a loanword): a decision per language and per message. Each translation's comment has a line
### "# en: <sha1>", the English it was translated from: change a message's English here and the check names every
### translation behind it, to translate again (docs/translation.md).
###
### Length: measured, not counted. test/browser/label-widths.test.ts measures every command's words in its slot, in
### each language, with the font it is drawn in: a bar button's words a third wider than the English at most, a menu
### row's within the menu, a dialog button's within the room its row leaves it. Everything else is free. The same
### product term is said one way throughout a language (test/i18n-glossary.test.ts).

## the shell: header

shell-menu = Menu
common-title = Title
# A new document of the app, and one not yet named; { $noun } is the app's noun: "New presentation".
common-new-noun = New { $noun }
common-untitled-noun = Untitled { $noun }
shell-download = Download
shell-loading = Loading…
shell-this-link-holds-something-that = This link can’t be read. It may have been cut off when it was copied.
shell-n-of-max-link-characters = { $n } of { $max } link characters left
shell-n-characters-over-link-limit = { $n ->
        [one] { $n } character over the link limit
       *[other] { $n } characters over the link limit
    }
shell-n-characters-over-link-limit-short-link-holds-max = { $n } characters over the link limit; a short link holds { $max }
shell-n-characters-over-what-short = { $n } characters over what a short link holds
# Before a document that lives nowhere but its link (Private, changed) is left for another place: the question and its three answers.
shell-this-document-lives-in-its = This document isn’t saved
shell-nothing-is-saved-on-this = It exists only in its link. Copy the link to keep it, or save it in this browser. Back will also return to it.
shell-copy-link-and-go = Copy link and leave
shell-turn-on-save-in-browser = Save in browser and leave
shell-go-without = Leave without saving
shell-save-in-browser-is-on = Save in browser is on. Documents you open are saved here. Turn it off in the menu.
shell-another-version = Another saved version
shell-kept-on-this-device = Saved on this device
shell-keyboard-shortcuts = Keyboard shortcuts
shell-nothing-to-keep-yet = Nothing to save yet
shell-open-it = Open it
shell-save-in-browser-is-off = Save in browser is off, so nothing is saved. Turn it on in the menu.
shell-skip-to-apps = Skip to the apps
shell-skip-to-document = Skip to the document
shell-this-device-keeps-another-version = A different version of “{ $title }” from { $when } is saved on this device.
shell-this-link-was-made-by = This link needs a newer version. Reload the page.

## the home page

home-blank = Blank
common-templates = Templates
# The button under an app's tile, naming the template list: "Start Text from"
# The list of an app's documents kept on this device, under its tile: "Write documents"
home-app-documents = { $app } documents
common-forget = Delete
# The button that forgets one kept document: "Forget Launch notes"
home-forget-title = Delete { $title }
# Under an app's documents, the rest folded away: "3 more"
home-n-more = { $n } more
# The home page's foot: { $aboard } is the name Aboard, a link to aboard.com, said as it is in every language
home-aboard-project-made-with-respect = An { $aboard } project. Made with respect in New York City.
home-beta-version = Beta version
# The foot's link to the repository on GitHub
home-email = Email
home-templates-for-app = Templates for { $app }
home-app-templates = { $app } Templates
home-templates-for-app-name = Templates for { $app }: { $name }
# Offline, where the templates' file was never kept by the service worker (kit/ui/home.ts).
home-templates-are-not-saved-in = The templates are not saved in this browser yet. Connect to the internet to see them.
home-documents-found = Documents found
home-no-document-here-has-those = No documents match
home-search-your-documents = Search your documents
home-n-documents-found = { $n ->
        [one] One document found
       *[other] { $n } documents found
    }

## the drawer (hamburger menu)

drawer-apps = Apps
common-close = Close
# The language select's first option: { $name } is the device's own language, named in itself and never translated ("Default: Français").
drawer-default-name = Default: { $name }
# The switch that keeps files and settings in this browser (off by default), and the line under it, on or off.
drawer-save-in-browser = Save in browser
# The manual's row above the switch: a deck kept in the tree (kit/ui/manual.tlo), compiled into its link.
drawer-what-is-this = What is this?
drawer-turn-on-to-save-files = Turn on to save files in your browser.
drawer-turn-off-to-remove-all = Turn off to remove all files and settings.
common-nothing-saved-in-this-browser = Nothing saved in this browser
common-saving-in-this-browser = Saving in this browser
drawer-remove-all-files-and-settings = Remove all files and settings from this browser?
drawer-language = Language
common-theme = Theme
drawer-match-device = Match device
drawer-light = Light
drawer-dark = Dark
drawer-about = About
# The name itself is translated too (Paul, 2026-10-10): each language says it in its own words.
common-tiny-little-office = Tiny Little Office
drawer-about-tiny-little-office = About Tiny Little Office
# About's words (Paul, 2026-10-13, verbatim): { $aboard } is the name Aboard, a link to aboard.com; { $email } is "email us", a link that writes to hello+tlo@aboard.com; { $github } is "GitHub repository", a link to the repository's issues. "GitHub" is a name, said as it is in every language.
drawer-tiny-little-office-is-experiment = Tiny Little Office is an experiment by { $aboard }, a digital and AI strategy and software development firm in New York City.
drawer-to-reach-out-with-questions = To reach out with questions, { $email }.
drawer-email-us = email us
drawer-if-you-find-bugs-please = If you find bugs, please file them in our { $github }.
drawer-github-repository = GitHub repository
# About's closing words (Paul, 2026-10-13): Ionesco's, from his Découvertes of 1969, and the line beneath naming him and the book ({ $book }, in italics).
drawer-all-of-these-notes-these = All of these notes, these drawings, and these sentences written with a marker fade over time. Only the ephemeral lasts.
drawer-eugene-ionesco-book = Eugène Ionesco, { $book }
drawer-discoveries = Discoveries
drawer-documents = Documents
drawer-find-app-template-or-command = Find app, template, or command
drawer-commands = Commands
drawer-nothing-by-that-name = No results
drawer-add-to-home-screen = Add to home screen
drawer-size-of-everything = Zoom
drawer-to-add-tiny-little-office = To add Tiny Little Office to the home screen: Share, then Add to Home Screen.

## links that leave the site (kit/ui/link-guard.ts)

# The menu button's tooltip: the Office mark is the menu.
leave-tiny-little-office-menu = Tiny Little Office menu
# The question before a link that leaves the site: "You are leaving Tiny Little Office for" over the site's name, large.
leave-do-you-trust-this-link = Do you trust this link?
leave-you-are-leaving-tiny-little = You are leaving Tiny Little Office for
leave-this-link-writes-email-to = This link writes an email to
leave-this-link-calls = This link calls
leave-not-secure-address-what-you = Not a secure (HTTPS) address. Anything you send could be read in transit.
leave-whole-address = The whole address:
leave-someone-wrote-this-link-into = This link was added by whoever wrote the document. Link text can differ from the address. Continue only if you trust it.
leave-go = Go
leave-links-of-this-kind-do = This type of link can’t be opened here.
# About's last line, a link to the source of the build the site runs: "Running commit abc1234".
leave-running-commit-commit = Running commit { $commit }
leave-this-link-hides-characters-in = This link’s address contains hidden characters.

## the copy kept on the device (status lines under the switch)

## sharing: the Share dialog (kit/core/shell.ts), where the link fits (kit/share/limits.ts), the arrival banner

share-copy-opened-in-new-tab = A copy opened in a new tab
share-edit-link = Edit link
share-present-link = Present link
share-copy-into-new-document = Copy into a new document
share-copy-link = Copy link
share-copy-of-title = Copy of { $title }
share-encrypted-here-service-holds-only = Encrypted in your browser. Our server stores only the encrypted link and deletes it when it expires.
share-expires-in-n-days-date = Expires in { $n ->
        [one] { $n } day
       *[other] { $n } days
    } ({ $date })
share-expires-in-n-hours-date = Expires in { $n ->
        [one] { $n } hour
       *[other] { $n } hours
    } ({ $date })
share-expires-in-n-minutes-date = Expires in { $n ->
        [one] { $n } minute
       *[other] { $n } minutes
    } ({ $date })
share-opens-as-pages-to-read = Opens as pages to read
share-opens-in-editor = Opens in the editor
common-whoever-opens-this-link-gets = Anyone who opens this link gets their own copy. Their changes won’t appear in yours. Ask them to send their link back.
share-short-link-that-expires = Short link that expires
share-this-link-expires-in-n = This link expires in { $n ->
        [one] { $n } day
       *[other] { $n } days
    }
share-this-link-expires-in-n-hours = This link expires in { $n ->
        [one] { $n } hour
       *[other] { $n } hours
    }
share-this-link-expires-in-n-minutes = This link expires in { $n ->
        [one] { $n } minute
       *[other] { $n } minutes
    }
share-this-link-n-characters-fits = This link: { $n } characters, fits in a text message
share-this-link-n-characters-too = This link: { $n } characters, too long for { $where }
share-discord-message = a Discord message
share-a-qr-code = a QR code
share-link-in-google-docs = a link in Google Docs
share-telegram-message = a Telegram message
share-a-short-link = a short link
share-small-nfc-sticker = a small NFC sticker
share-text-message = a text message
# A row of the table: Chrome, and Edge, which is built on it; the names are said as they are in every language.
share-chrome-and-edge = Chrome and Edge
share-nfc-sticker = an NFC sticker
# A row of the table, and the end of "too long for …": browsers before today's, which stopped near 2,048 characters.
share-some-browsers = older browsers
share-n-short-links-kept-here = { $n ->
        [one] { $n } short link kept here
       *[other] { $n } short links kept here
    }
share-display-link = Display Link
share-opens = Opens
share-link-copied = Link copied
share-could-not-copy = Could not copy
common-share = Share…
common-qr-code = QR code
common-qr-code-of-this-document = QR code of this document
share-this-document-is-n-bytes = This document is { $n } bytes; the largest QR code holds { $max }. Shorten it by { $over } bytes and it will fit.
share-this-document-is-n-characters = This document is { $n } characters; a short link holds { $max }. Shorten it by { $over } and it will fit.
share-expires-after = Expires after
share-hour = An hour
share-day = A day
share-week = A week
share-month = A month
share-make-short-link = Make a short link
share-making = Creating…
share-hundred-links-day-from-one = Limit reached: 100 short links a day per address. Try again tomorrow.
share-short-link-cannot-be-changed = A short link can’t be edited or deleted. It expires automatically.
share-could-not-shorten-link = Could not shorten the link.
share-this-document-is-too-long = This document is too long for a short link.
share-up-to-hundred-links-day = Up to 100 short links a day per address.
share-remove = Remove
common-link = Link
common-short-link = Short link
share-new-noun-date-n = New { $noun } { $date } #{ $n }
# Files, compare, posting and embedding: the agent and sharing surface.
share-mastodon-server-like-mastodon-social = A Mastodon server, like mastodon.social
share-change = Change
share-copy-embed-code = Copy embed code
share-copy-show-link = Copy show link
share-embed = Embed
share-embed-code-copied = Embed code copied
share-opens-deck-already-presenting = Opens the deck already presenting.
share-post = Post
share-post-link = Post the link
share-show-preview-of-first-page = Show a preview of the first page
share-picture-of-first-page-and = A picture of the first page and the title are kept readable on our server for a month so the network can fetch them. The document itself is not.
share-shared-without-preview-reason = Shared without a preview: { $reason }
share-making-preview = Making the preview…
share-page-could-not-be-drawn = the page could not be drawn
share-picture-is-over-400-kb = the picture is over 400 KB
share-server-could-not-be-reached = the server could not be reached
share-hundred-previews-day-from-one = a hundred previews a day from one address
share-server-refused-picture = the server refused the picture
share-pages-in-frame-on-another = The pages, in a frame on another site, with a link to open them here.
share-your-mastodon-server = Your Mastodon server
# The table of where the link fits: its caption, the link's own size counted both ways ("This link: 1,240 characters, 1,240 bytes").
share-this-link-n-characters-n-bytes = This link: { $n ->
        [one] { $n } character
       *[other] { $n } characters
    }, { $bytes ->
        [one] { $bytes } byte
       *[other] { $bytes } bytes
    }
share-where = Where
# The dialog of every place's limit beside this link's size (the header's meter opens it; so does Share's head line).
share-max-link-sizes = Max Link Sizes
# The table's column heads: the most each place holds, and whether this link fits in it.
share-limit = Limit
share-fits = Fits?
# A row's limit, counted in characters or in bytes as that place counts it: "2,097,152 characters", "2,953 bytes".
share-n-characters = { $n ->
        [one] { $n } character
       *[other] { $n } characters
    }
share-n-bytes = { $n ->
        [one] { $n } byte
       *[other] { $n } bytes
    }
# Safari's limit: Apple states no longest link.
share-no-published-limit = None published
# The Fits? column: yes, and the room left; no, and how much too long; a site that counts any link as a set number of characters.
share-yes = Yes
share-yes-n-left = Yes, { $n } left
share-no-n-over = No, { $n } over
# At a post: what the link counts of the post's size, however long the link is (Mastodon and X count 23, Bluesky its host and 16 characters).
share-yes-counts-as-n-of-max = Yes, counts as { $n } of { $max }

## privacy (kit/share/privacy.ts, kit/ui/privacy-dialog.ts): the password, what the device holds

# The Share dialog's head line: "Created 9 Oct 2026, 14:03 · by Paul".
privacy-anyone-with-link-will-need = Anyone with the link will need the password to open it. It can’t be reset. If you lose it, the document is gone.
privacy-change-password = Change password
privacy-created-date = Created { $date }
privacy-enter-password-to-open-this = Enter the password to open this document.
privacy-forget-everything = Delete everything
privacy-preview-sent-with-link-to = A preview sent with a link to a network is a picture of the first page, the title and the first words, readable on our server for a month. The document itself never goes there.
privacy-forget-everything-this-site-keeps = Delete everything saved in this browser and stop saving? Your documents still exist in their links.
privacy-locked = Locked
common-locked-document = Locked document
privacy-new-password = New password
privacy-no-password = No password
privacy-none = None
privacy-opening = Opening…
common-password = Password
privacy-password-removed = Password removed
privacy-password-set-link-holds-only = Password set. The link is now encrypted.
privacy-password-ellipsis = Password…
privacy-preferences = Preferences
privacy-privacy = Privacy
privacy-nothing-saved-in-this-browser = Nothing is saved in this browser. The items listed last only for this visit.
privacy-protected-by-password = Protected by a password
privacy-remove-password = Remove password
privacy-sealing = Encrypting…
privacy-set-password = Set password
privacy-short-links = Short links
privacy-set-password-in-share = Set a password, in Share
privacy-short-links-made-here-until = The short links made here, until they expire.
privacy-their-names-and-links-for = Names and links, shown on the home page.
privacy-theme-lifetime-of-short-links = Theme and short-link settings.
privacy-this-document-has-password-link = This document has a password. The link, and any short link made from it, is encrypted.
common-this-document-is-locked = This document is locked
privacy-this-document-is-locked-with = This document is locked with a password.
privacy-unlock = Unlock
common-unlock-ellipsis = Unlock…
privacy-what-this-device-holds = Stored on this device
privacy-your-documents = Your documents
privacy-your-browsers-history = Your browser’s history
privacy-every-document-opened-here-in = Every document you open, in full, unless it has a password.
privacy-not-ours-to-clear = We can’t clear this
privacy-by-name = by { $name }
common-n-documents = { $n ->
        [one] { $n } document
       *[other] { $n } documents
    }
privacy-n-links = { $n ->
        [one] { $n } link
       *[other] { $n } links
    }
privacy-n-set = { $n } set
privacy-copy-this-and-send-it = Copy this password and send it separately from the link. It won’t be shown again.
privacy-make-another = Make another
privacy-password-copied = Password copied

## a document locked with a password, placed inside another (kit/share/locked.ts, kit/ui/locked-doc.ts)

# The card drawn where it sits; { $app } is the app's name: "A Spreadsheet document, locked with a password".
common-with-password = Locked with a password
locked-app-document-locked-with-password = A { $app } document, locked with a password
locked-with-password-unlock = Locked with a password. Unlock…
locked-document-locked-with-password = A document locked with a password
# What one of them is called in running text, as an app's noun is.
locked-document = locked document
# A placed document whose link cannot be read (cut short when it was copied).
locked-this-document-cannot-be-read = This document cannot be read.
# A password that does not open a sealed link: wrong, or the link cut short in a chat (the two cannot be told apart).
locked-that-password-does-not-open = That password doesn’t open this link. If you’re sure it’s right, the link may have been cut off when it was copied. Ask for it again, or for a short link.

## words several apps share

# A menu of what can be done to the document as a whole (the Presentation Builder's submenu).
common-this-document = This document
# { $task } is the task's words.
common-done-task = Done: { $task }
common-drag-to-move-tap-to = Drag to move, tap to select
common-move-left = Move left
common-move-right = Move right
# The group heading the Calendar and the Trip Planner sit under on the home page.
common-plan = Plan
common-chosen-tasks = Selected tasks
# A link that opens the document (kit/ui/compare.ts).
common-open = Open
common-task = Task
common-tasks = Tasks
common-find-app-doc-template-or = Find app, doc, template, or command
common-in-this-document = Find in this document
common-indent-or-bring-out-in = Indent or outdent a list item; next cell in a table
common-move-selected-items-up-or = Move the selected items up or down
common-nudge-shapes-in-hand = Nudge selected shapes
common-select-all-words-of-box = Select all (this field first, then the whole document)
common-back-to-words = Back to text
common-extend-selection = Extend selection
common-next-or-one-before = Next or previous
common-step-out-close-collapse-let = Close or deselect
common-check-or-uncheck-task = Check or uncheck a task
common-too-long-for-qr-code = Too long for a QR code: shorten the document, or share a short link.
common-n-of-count = { $n } of { $count }

## downloads

download-print = Print
common-print-or-save-as-pdf = Print, or save as PDF
download-picture-png = Picture (PNG)
common-web-page-html = Web page (HTML)
download-text-tlo = Text (TLO)
download-data-json = Data (JSON)
download-downloaded-name = Downloaded { $name }
download-failed = Download failed
common-open-in-tiny-little-office = Open in Tiny Little Office
# Under a document cut off at a slide's foot: a link that opens it whole, in its own app.
download-see-more = See more

## the bar, shared by every app

common-insert = Insert
bar-bold = Bold
bar-italic = Italic
bar-underline = Underline
bar-strikethrough = Strikethrough
bar-highlight = Highlight
bar-heading = Heading
bar-bulleted-list = Bulleted list
bar-numbered-list = Numbered list
common-table = Table
bar-footnote = Footnote
common-date = Date
bar-undo = Undo
bar-redo = Redo
common-today = Today

## the editor (<to-text>): chips, cards and the bubbles

# A footnote's mark, and its words where the notes are drawn, by its number: spoken.
common-footnote-n = Footnote { $n }
# A card standing for another document held in this one, of a kind no app here reads: "abc document".
common-app-document = { $app } document
# The same card when its app is known; { $noun } is the app's noun: "A spreadsheet".
common-noun = A { $noun }
editor-code = Code
editor-connection = Connection
editor-n-rows = { $n ->
        [one] one row
       *[other] { $n } rows
    }
editor-notes-words = Note text
common-done = Done
editor-address = Address
editor-not-address = Not an address
editor-set-link = Set link
editor-open-link = Open link
editor-change-link = Change link
editor-remove-link = Remove link
# The selection bubble's name: what can be done to the words selected.
common-format = Format
# A task item's state, said before its words by a screen reader: "done, Buy milk"; "not done, Call the plumber".
editor-done-lowercase = done
editor-not-done = not done
editor-bold-italic-and-links = Bold, italic and links
editor-one-of-words-column-holds = One of the words the column holds, or a new one
editor-option = Option
editor-this-browser-lets-page-paste = This browser only allows pasting from the keyboard or the Paste menu.

## the example in the kit's own documentation

example-n-slides = { $n ->
        [one] one slide
       *[other] { $n } slides
    }

## the Word Processor

common-word-processor = Word Processor
# What one of its documents is called, in running text: "Untitled document"; each app's noun is in its section.
write-document-lowercase = document
# The group heading the Word Processor sits under on the home page.
common-words = Words
write-words-on-page-headings-lists = Words on a page: headings, lists, links and notes, a table that adds up, printed on letter or A4.
write-document = Document
write-here = Write here.
write-subheading = Subheading
write-paragraph = Paragraph
common-bring-out = Outdent
common-indent = Indent
write-align = Align
write-align-left = Align left
write-center = Center
write-align-right = Align right
write-justify = Justify
write-paper-paper = Paper: { $paper }
# The Look menu: each look's name, then a line about it drawn in its own type.
write-sans = Sans
write-clean-and-plain-throughout = Clean and plain throughout
write-bookish-serif-throughout = A bookish serif throughout
write-monospace-ragged-right = Monospace, ragged right
write-serif-and-sans = Serif and sans
write-serif-headings-sans-text = Serif headings, sans text
write-sans-and-serif = Sans and serif
write-sans-headings-serif-text = Sans headings, serif text
write-book = Book
write-justified-indented-small-caps = Justified, indented, small caps
write-newspaper = Newspaper
write-narrow-headline-two-columns = A narrow headline, two columns
# Insert ▾'s horizontal rule in a document: a light line across the page, nothing more.
write-horizontal-rule = Horizontal rule
# Insert ▾'s rule in a document: what follows starts the next page.
write-page-break = Page break
common-ok = OK
write-this-card = This card
write-open-in-app = Open in { $app }
write-locked-worked-out-for-you = Locked: calculated
common-footnotes = Footnotes
write-back-to-footnote-n-in = Back to footnote { $n } in the text
write-back-to-text = Back to the text
write-n-words = { $n ->
        [one] one word
       *[other] { $n } words
    }
write-word-docx = Word (DOCX)
common-markdown = Markdown
write-rich-text-rtf = Rich Text (RTF)
# A table in the text: its heads, its handle, its column menu.
write-add-column-before = Add a column before
write-column-c-what-it-holds = Column { $c }: type, name, add or remove
write-table-move-copy-or-take = Table: move, copy or delete
# The templates
write-a-letter = A letter
write-your-address-date-greeting-point = Your address, the date, the greeting, the point, the sign-off.
write-meeting-notes = Meeting notes
write-agenda-what-was-said-what = Agenda, what was said, what was decided, who does what.
write-resume = Résumé
write-name-and-contact-experience-education = Name and contact, experience, education, skills: a résumé fitted to a page.
write-contract = Contract
write-plain-words-agreement-what-each = A plain-words agreement: what each of you does, and how it ends.
write-invoice = Invoice
write-who-what-and-how-much = Who, what and how much, the sums done in the table; printed as paper to send.
write-cover-letter = Cover letter
write-applying-for-job-position-what = Applying for a job: the position, what you have done, why them, in four short paragraphs.
write-memo = Memo
write-to-from-date-and-subject = To, from, date and subject; the change in a sentence, why, and what you need back.
write-minutes = Minutes
write-formal-meeting-who-came-treasurers = A formal meeting: who came, the treasurer's sums, a motion and its vote, the actions.
write-one-page-cv = One-page CV
write-typewriter-set-cv-now-before = A typewriter-set CV: now, before, education, languages and tools.
write-newsletter = Newsletter
write-block-associations-month-dates-in = A block association's month: dates in a table, welcomes, news and thanks.
write-recipe = Recipe
write-what-you-need-in-table = What you need, in a table that scales from four to six, and how, step by step.
write-questions-and-answers = Questions and answers
write-questions-people-ask-each-heading = The questions people ask, each a heading with its answer under it.
write-press-release = Press release
write-news-in-first-line-detail = The news in the first line, the detail, a quote, the hours, and who to call.
write-news-article = News article
write-headline-byline-story-in-two = A headline, a byline, the story in two columns on paper, and a chart of the figures.
write-interview = Interview
write-introduction-then-questions-and-answers = An introduction, then questions and answers, each speaker named.
write-book-review = Book review
write-book-stars-what-it-is = The book, the stars, what it is about, what worked and what did not.
write-music-review = Music review
write-album-label-and-length-stars = An album: the label and length, the stars, the songs, the best tracks.
write-thesis = Thesis
write-title-page-abstract-chapters-with = Title page, abstract, chapters with footnotes and a table, and a bibliography, set like a book.
write-grant-proposal = Grant proposal
write-ask-need-plan-budget-that = The ask, the need, the plan, a budget that adds up, and how you will know it worked.
write-syllabus = Syllabus
write-course-when-and-where-what = A course: when and where, what it is about, the weeks, and grades that add up to 100%.
write-formal-complaint = Formal complaint
write-what-happened-in-order-what = What happened, in order; what you want; and by when, before you go further.
write-letter-to-politician = Letter to a politician
write-ask-your-representative-for-vote = Ask your representative for a vote: who you are, why it matters here, and a question.
write-love-letter = Love letter
write-ordinary-things-missed-letter-across = Ordinary things, missed: a letter across the distance, in a serif.
write-wedding-speech = Wedding speech
write-how-they-met-what-you = How they met, what you have seen since, a word to each, and the toast.
write-eulogy = Eulogy
write-life-in-few-minutes-where = A life in a few minutes: where it began, who they were, what you will miss.
write-zine-essay = Zine essay
write-personal-essay-for-small-magazine = A personal essay for a small magazine, typewritten.
write-petition = Petition
write-what-you-ask-why-and = What you ask, why, and the names of those who agree.
write-terms-of-service = Terms of service
write-small-businesss-terms-in-plain = A small business's terms in plain words: booking, prices, keys, what if, ending.
write-open-as-outline = Open as an outline
write-a4 = A4
write-letter = Letter
write-name-this-column = Name this column

## Insert's dialog (kit/ui/insert-dialogs.ts): Tiny Little Office Doc

insert-tiny-little-office-link = A Tiny Little Office link
insert-opening-short-link = Opening the short link…
insert-paste-link-of-another-tiny = Paste the link of another Tiny Little Office document, long or short: its first page shows here.
insert-this-is-not-tiny-little = This is not a Tiny Little Office link, or it has expired.
insert-tiny-little-office-doc = Tiny Little Office Doc
common-tiny-little-office-doc-ellipsis = Tiny Little Office Doc…
# Insert ▾'s group of the apps a new document can be made in, inside this one.
common-new-document = A new document

## another document edited in place (kit/ui/doc-dialog.ts); a table's size is Rows × Columns

common-cancel = Cancel
doc-rows = Rows

## charts (kit/draw/chart.ts)

chart-empty-chart = An empty chart
chart-bars = Bars
chart-flows-sankey = Flows (Sankey)
chart-flows-list = Flows: { $list }.
common-lines = Lines
chart-nothing-to-chart-yet = Nothing to chart yet
chart-nothing-to-chart-yet-rows = Nothing to chart yet: rows of From | To | Amount
chart-pie = Pie
chart-series = Series
chart-kind-chart-data = { $kind } chart. { $data }

## the Spreadsheet

sheet-clear-these-cells = Clear cells
sheet-fit-this-column-to-its = Fit this column to its text
sheet-cells-in-hand = Selected cells
sheet-check-ref = Check { $ref }
# The column type that holds words as typed.
common-text = Text
common-spreadsheet = Spreadsheet
sheet-spreadsheet-lowercase = spreadsheet
common-numbers = Numbers
sheet-spreadsheet-with-formulas-named-cells = A spreadsheet with formulas, named cells and charts; three columns to start, more as you need them.
sheet-budget = Budget
sheet-planned-against-actual-line-each = Planned against actual, a line each, with the difference and totals.
sheet-expense-log = Expense log
sheet-date-what-how-much-which = Date, what, how much, which kind; a running total at the foot.
sheet-training-log = Training log
sheet-what-you-did-and-how = What you did and how much, a line a time; a total for each kind of thing.
sheet-project-tracker = Project tracker
sheet-tasks-with-owners-start-and = Tasks with owners, start and due dates counted from today, days each, how each is going, and a check when done.
sheet-loans-compared = Loans compared
sheet-amount-rate-and-years-for = Amount, rate and years for each loan; the monthly payment (PMT), what it costs in all, and the interest.
sheet-subscription-business = A subscription business
sheet-visitors-who-sign-up-pay = Visitors who sign up, pay and stay: a model as flows, with the assumptions beside it to change.
sheet-cafe = A café
sheet-customers-day-what-they-spend = Customers a day, what they spend, and where the month’s revenue goes: supplies, rent, wages, profit.
sheet-freelancer = A freelancer
sheet-hours-rate-and-weeks-make = Hours, rate and weeks make the year’s invoices; expenses and tax come off; what is left is take-home.
sheet-mutual-aid-fund = A mutual aid fund
sheet-monthly-donors-and-one-off = Monthly donors and one-off gifts fill the fund; grants, a little admin and a reserve come out of it.
sheet-month-by-month-with-chart = Month by month, with a chart
sheet-this-year-against-last-line = This year against last, a line a month, drawn as lines.
sheet-household-budget-by-month = Household budget by month
sheet-six-months-of-homes-bills = Six months of a home’s bills and spending, a column a month, totalled both ways against the pay.
sheet-savings-goal = Savings goal
sheet-what-went-in-each-month = What went in each month, what is saved so far and what is still to go, the goal beside it to change.
sheet-habit-tracker = Habit tracker
sheet-four-habits-checked-off-day = Four habits checked off day by day for two weeks; how much of each day was kept, and how many days each.
sheet-reading-list = Reading list
sheet-books-read-being-read-and = Books read, being read and next, with the days each took and the pages read this year.
sheet-workout-log = Workout log
sheet-sets-reps-and-weight-for = Sets, reps and weight for each lift, the volume worked out, and how each felt.
sheet-time-sheet = Time sheet
sheet-weeks-hours-by-client-and = A week’s hours by client and task; the billable ones priced at their rate, and the totals.
sheet-trip-costs-split = Trip costs split
sheet-who-paid-for-what-on = Who paid for what on a trip for four; each one’s fair share, and what each owes (a minus is money back).
sheet-schedule-with-dates = Schedule with dates
sheet-job-in-steps-each-starting = A job in steps, each starting when the last one ends: who, how many days, the end date and the working days.
sheet-grade-book = Grade book
sheet-classs-grades-for-essays-quizzes = A class’s grades for essays, quizzes and a project; each student’s average and letter, and the class average.
sheet-membership-roll = Membership roll
sheet-who-belongs-their-plot-and = Who belongs, their plot and job, when they paid and when they renew, who holds a key, and the dues in.
sheet-seating-count = Seating count
sheet-tables-for-wedding-seats-guests = Tables for a wedding: seats, guests, places free and the meals chosen, with a check that the meals add up.
sheet-poll-results = Poll results
sheet-answers-and-votes-for-each = The answers and the votes for each, drawn as a pie above them.
sheet-fundraising-thermometer = Fundraising thermometer
sheet-what-has-come-in-week = What has come in, week by week, against the goal: a chart above, the total so far drawn large.
sheet-invoice-ledger = Invoice ledger
sheet-every-invoice-sent-when-to = Every invoice sent: when, to whom, for how much, when it was paid, what is still owed and how late.
sheet-inventory = Inventory
sheet-stock-on-hand-against-point = Stock on hand against the point to reorder at; what to order, what it is worth, and a flag when it is low.
sheet-petty-cash = Petty cash
sheet-money-in-and-out-of = Money in and out of the cash box, who spent it and on what, the balance after each, and a check for a receipt.
sheet-rate-card = Rate card
sheet-freelancers-services-with-hours-each = A freelancer’s services with the hours each takes; prices and rush prices worked out from one hourly rate.
sheet-mortgages-compared = Mortgages compared
sheet-four-offers-on-one-house = Four offers on one house: the loan after the down payment, the monthly payment, all in with tax, and the interest.
sheet-unit-converter = Unit converter
sheet-miles-and-kilometers-pounds-and = Miles and kilometers, pounds and kilograms, ovens, cups and gallons: type an amount, read the other unit.
sheet-tournament-bracket = Tournament bracket
sheet-eight-teams-single-elimination-each = Eight teams, single elimination: each match’s score, the winner worked out, and the winners carried on to the final.
sheet-excel-xlsx = Excel (XLSX)
common-csv = CSV
sheet-chart-svg = Chart (SVG)
sheet-chart-png = Chart (PNG)
sheet-empty-sheet = Empty sheet
sheet-n-of-max-shown = ({ $n } of { $max } shown)
sheet-50-more-rows = 50 more rows
common-add-column = Add a column
common-add-column-after = Add a column after
sheet-chart = Chart
sheet-chart-of-table = Chart of the table
sheet-checkbox = Checkbox
sheet-column-after = Column after
common-column-c = Column { $c }
common-column-c-holds = Column { $c } type
sheet-column-c-type-what-it = Column { $c }: { $type }. Type, sort, add or remove
common-columns = Columns
common-delete-which = Delete { $which }
common-drag-to-fill = Drag to fill
sheet-abc-or-123-for-this = Column type
sheet-drag-to-resize-double-click = Drag to resize, double-click to fit
sheet-fill-down-from-top-row = Fill down from the top row
sheet-fill-right-from-first-column = Fill right from the first column
common-fill-drag-to-carry-these = Drag to fill
sheet-fit-columns-to-page = Fit the columns to the page
sheet-formula = Formula
sheet-function = Function
sheet-high-to-low = High to low
common-insert-n-rows-above = Insert { $n ->
        [one] a row
       *[other] { $n } rows
    } above
common-insert-n-rows-below = Insert { $n ->
        [one] a row
       *[other] { $n } rows
    } below
sheet-letters-keyboard = Letters keyboard
sheet-lock-these-cells-so-reader = Lock these cells so readers can’t change them
sheet-locked-part-of-model = Locked: part of the model’s formulas
sheet-low-to-high = Low to high
sheet-money = Money
common-name = Name
common-name-of-column-c = Name of column { $c }
sheet-names-cell-to-its-right = Name for the cell to the right
# A money column's currency (Money picked in a column's menu): the field's hint, and what it says of words it cannot read.
sheet-symbol-like-or-code-like = A symbol, like $, or a code, like USD. Empty is the document’s own.
sheet-symbol-of-up-to-three = A symbol of up to three characters, or a code of three letters.
sheet-no-chart = No chart
sheet-number = Number
sheet-open-link = Open { $link }
sheet-opens-when-clicked = Opens on click
sheet-percent = Percent
common-remove-this-column = Remove this column
sheet-resize-column-c = Resize column { $c }
sheet-rich-text = Rich text
sheet-row-above = Row above
sheet-row-below = Row below
common-row-n = Row { $n }
common-row-n-lowercase = row { $n }
common-row-n-insert-or-delete = Row { $n }: insert or delete rows
common-rows-b = rows { $a }–{ $b }
sheet-selected-cells = Selected cells
sheet-show-all-text = Show all the text
sheet-shown-as-typed = Plain text
sheet-sort-rows-by-it = Sort by
sheet-suggested = suggested
sheet-is-as-wide-as-it = The sheet is at its maximum of 26 columns.
sheet-is-full-its-last-rows = Can’t add rows: the last rows aren’t empty.
sheet-three-at-least = Minimum 3
sheet-unlock-these-cells = Unlock these cells
sheet-what-it-holds-sort-columns = Type, sort, columns
# The Spreadsheet: any column removed, the Option column, rich cells, a chart put in from Insert.
sheet-keeps-one-column = A sheet needs at least one column
sheet-choices = Choices
sheet-choices-for-ref = Choices for { $ref }
sheet-has-one = The sheet already has a chart
sheet-edit-cell-caret-at-its = Edit cell with cursor at end
sheet-put-back-what-cell-held = Restore cell value
sheet-put-dated-rows-on-calendar = Put the dated rows on a calendar

## downloads: hand-offs to another app (kit/file/exports.ts)

export-open-in = Open in
export-pdf-file = PDF file
export-copy-link-that-downloads-ext = Copy a link that downloads the .{ $ext }
export-could-not-share-ext = Could not share the .{ $ext }
export-could-not-show-ext = Could not show the .{ $ext }
export-download-ext = Download the .{ $ext }
export-share-ext = Share the .{ $ext }…
export-view-ext = View the .{ $ext }

## the icon library (kit/ui/icons-picker.ts)

common-icon = Icon
icons-favorites = Favorites
icons-search-icons = Search icons
icons-suggested = Suggested
common-icons = Icons
icons-no-icons-match-q = No icons match “{ $q }”.
icons-search-by-name-or-by = Search by name or by what it means (“money”, “weather”, “ai”) to find any of { $n } icons.
icons-no-icon = No icon
common-icon-or-emoji = Icon or emoji
# The list "@" opens while typing: the people sharing the document, to name one in the words.
common-people = People
icons-search-icons-and-emoji = Search icons and emoji
icons-or-emoji = Icons or emoji
icons-emoji = Emoji
icons-no-icons-or-emoji-match = No icons or emoji match “{ $q }”.
# Unicode's emoji groups, as the picker's Emoji set names them.
icons-smileys-emotion = Smileys & Emotion
icons-people-body = People & Body
icons-animals-nature = Animals & Nature
icons-food-drink = Food & Drink
icons-travel-places = Travel & Places
icons-activities = Activities
icons-objects = Objects
icons-symbols = Symbols
icons-flags = Flags

## the Drawing Tool

# The group heading the Drawing Tool sits under on the home page: Design. 'Draw' is the Animator's mode for drawing.
draw-draw = Draw
common-drawing-tool = Drawing Tool
draw-drawing = drawing
common-design = Design
draw-boxes-arrows-icons-and-labels = Boxes, arrows, icons and labels on a grid; or pixel art, which can become a background tile.
draw-request-flow = Request flow
draw-browser-asks-server-which-reads = A browser asks a server, which reads the data: boxes joined by arrows.
draw-flowchart = Flowchart
draw-three-tiers = Three tiers
draw-phone-and-laptop-api-database = Phone and laptop, an API, a database and a cache: a system drawn with icons and joins.
draw-floor-plan = Floor plan
draw-one-bedroom-apartment-from-above = A one-bedroom apartment from above: rooms as rectangles, labeled, with the doors as gaps.
draw-pixel-heart = Pixel heart
draw-16-by-16-heart-in = A 16 by 16 heart in pixels, to color in or start over from.
draw-background-tile = Background tile
draw-8-by-8-pattern-that = An 8 by 8 pattern that repeats: use it as the background of a drawing, or any page.
draw-card-for-ninetieth-tilted-on = A card for a ninetieth, tilted on a background of confetti: big words, flowers, love from everyone.
draw-phone-screen-sketched-in-boxes = A phone screen sketched in boxes before anyone builds it, with notes on why each part is there.
draw-rosette-with-ribbons-for-volunteer = A rosette with ribbons for the volunteer of the year, to print, cut out and pin on.
draw-block-party-from-above-stage = A block party from above: the stage, the booths, first aid and where to meet if you are lost.
draw-badge = Badge
common-birthday-card = Birthday card
draw-can-we-refund-it-stores = Can we refund it? A store’s return policy as questions, answers and what to do.
draw-event-map = Event map
draw-four-16-by-16-icons = Four 16 by 16 icons on one grid, sun, cloud, rain and storm, to copy for a forecast or a button.
draw-game-sprite = Game sprite
draw-logo-sketch = Logo sketch
draw-order-to-doorstep = Order to doorstep
draw-pip-frog-32-by-32 = Pip the frog, a 32 by 32 hero in a red scarf, outlined and ready to animate.
draw-room-plan = Room plan
draw-living-room-rearranged-sofa-rug = The living room rearranged: sofa, rug, bookcase and desk to scale, the door’s swing drawn in.
draw-three-ideas-for-coffee-roasters = Three ideas for a coffee roaster’s mark side by side, the name set large, and a date to choose by.
draw-weather-icons = Weather icons
draw-what-happens-to-package-from = What happens to a package from the moment it is bought: a process in steps, with icons and joins.
draw-wireframe = Wireframe
common-picture-svg = Picture (SVG)
draw-background-tile-svg = Background tile (SVG)
draw-background-tile-png = Background tile (PNG)
draw-animate-this-drawing = Animate this drawing
draw-drawing-of-things = A drawing of { $things }.
draw-drawing-of-n-unlabeled-shapes = A drawing of { $n ->
        [one] one unlabeled shape
       *[other] { $n } unlabeled shapes
    }.
draw-leads-to-b = { $a } leads to { $b }
draw-joins-b = { $a } joins { $b }
draw-empty-drawing = An empty drawing
draw-pixel-art-n-by-n-filled-squares-filled = Pixel art, { $n } by { $n }: { $filled ->
        [one] one square filled
       *[other] { $filled } squares filled
    }.
draw-pixel-art-n-by-n = Pixel art, { $n } by { $n }
draw-select = Select
draw-rectangle = Rectangle
draw-ellipse = Ellipse
draw-diamond = Diamond
draw-line = Line
draw-arrow = Arrow
draw-join-two-shapes = Join two shapes
draw-pen = Pen
draw-any-shape-tap-for-each = Polygon: tap each corner
draw-freehand = Freehand
draw-drag-to-draw-line-or = Drag to draw a line or a shape
draw-rounded-box = Rounded box
draw-hexagon = Hexagon
draw-parallelogram = Parallelogram
draw-cylinder = Cylinder
common-note = Note
common-black = Black
common-red = Red
common-orange = Orange
common-green = Green
common-blue = Blue
common-purple = Purple
common-indigo = Indigo
common-yellow = Yellow
draw-sky = Sky
draw-pink = Pink
draw-clear = clear
draw-shapes = Shapes
draw-more = More
draw-icon = Icon…
draw-background = Background
draw-remove-background-tile = Remove background
draw-color = Color
draw-arrange = Arrange
draw-no-fill = No fill
draw-fill = Fill
draw-bring-to-front = Bring to front
draw-send-to-back = Send to back
common-duplicate = Duplicate
common-edit = Edit
common-delete = Delete
draw-put-icon-on-this-shape = Put an icon on this shape
draw-place-icon = Place an icon
common-zoom-in = Zoom in
common-zoom-out = Zoom out
draw-alt = Alt
draw-alt-text = Alt text
draw-alt-text-alt = Alt text: { $alt }
draw-add-alt-text-describe-this = Add alt text: describe this drawing for people who cannot see it
draw-what-does-this-drawing-show = What does this drawing show?
draw-diagram-of = A diagram of…
draw-read-aloud-to-people-who = Read aloud to people who cannot see it, and kept with the drawing wherever it is embedded or downloaded.
draw-describe-from-shapes = Generate from shapes
draw-tap-or-drag-to-paint = Tap or drag to paint; the arrow keys move, Enter paints.
draw-tap-each-corner-tap-first = Tap each corner; tap the first again, or press Enter, to close it.
draw-drag-to-draw-end-where = Drag to draw; end where you began to close it into a shape.
draw-press-on-one-shape-and-let-go-on-another = Press on one shape and let go on another.
draw-now-other-shape-tap-it = Now the other shape: tap it, or choose it with the arrows and press Enter.
draw-drag-to-move-them-together = Drag to move them together. Shift+tap adds or removes a shape.
draw-press-on-one-shape-and = Press on one shape and let go on another
draw-tap-where-icon-goes = Tap where the icon goes.
draw-drag-on-canvas-to-draw = Drag on the canvas to draw it, or tap to place one.
draw-eraser = Eraser
draw-pencil = Pencil
draw-clear-grid = Clear the grid
draw-use-as-background = Use as background
draw-grid-is-now-background-download = The grid is now the background. Download it as a tile, or use it on any page with tile:.
draw-pixel-grid-n-by-n = Pixel grid, { $n } by { $n }. Arrow keys move; Enter paints with the current color.
draw-row-y-column-x-ink = Row { $y }, column { $x }: { $ink }
draw-as-repeating-background = As a repeating background
# The contextual bar under a shape, and its words typed on it.
draw-dashed-line = Dashed line
draw-dotted-line = Dotted line
common-edit-words = Edit text
draw-extra-large-text = Extra large text
draw-gray-fill = Gray fill
draw-l = L
draw-large-text = Large text
draw-m = M
draw-medium-text = Medium text
draw-s = S
draw-small-text = Small text
draw-solid-fill = Solid fill
draw-solid-line = Solid line
draw-shape-in-hand = Selected shape
draw-words-of-shape = Shape text
draw-type-words-enter-is-done = Type the text. Enter finishes, Shift+Enter adds a line, Escape cancels.
draw-xl = XL

draw-drag-to-move-corner-handle = Drag to move. Corner handle resizes, round handle rotates. Enter or double-tap edits text.
draw-drawing-canvas-v-selects-r = Drawing canvas. V selects; R, E, D, L, A, T draw; arrows nudge; [ and ] rotate; Enter edits text; Delete removes.
draw-tap-shape-to-select-it = Tap a shape to select it, or drag around several. Pick a tool to draw.
draw-rotate-left = Rotate left
draw-rotate-right = Rotate right
draw-pixels-n-n = Pixels { $n }×{ $n }
draw-align-center = Align: center
draw-align-left = Align: left
draw-align-right = Align: right

## the Animator

anim-animation = animation
# The templates: what each motion is, in a line.
anim-lift-off = Lift off
anim-rocket-climbs-away-with-its = A rocket climbs away with its shadow as the words rise: two shapes, two keys each.
anim-bouncing-ball = Bouncing ball
anim-ball-falls-faster-and-faster = A ball falls faster and faster to the floor as its shadow grows under it; played forward and back, it bounces forever.
anim-loading-spinner = Loading spinner
anim-eight-dots-in-ring-each = Eight dots in a ring, each swelling in turn, so a bright spot runs around while a page saves.
anim-title-card = Title card
anim-red-curtains-part-on-opening = Red curtains part on opening night and the festival’s name comes forward: played once, it rests on the title.
anim-present-hops-stars-and-hearts = A present hops, stars and hearts sway around it, and the greeting shines in rainbow letters.
anim-quick-standup = Quick standup
anim-meme-with-caption-above-and = A meme with a caption above and one below, and a clock that spins and wobbles in between.
anim-build-is-green = Build is green
anim-meme-in-two-lines-of = A meme in two lines of impact type, and a trophy that spins in, lands and glows.
anim-flash-card = Flash card
anim-card-shows-spanish-word-turns = A card shows a Spanish word, turns over to give the English, and turns back: a turn about its upright axis.
anim-weather-this-week = Weather this week
anim-four-days-of-weather-in = Four days of weather in Lisbon, each icon alive: the sun turns, the cloud drifts, the lightning jolts.
anim-new-year-countdown = New Year countdown
anim-three-two-one-second-each = Three, two, one, a second each, then the new year arrives in rainbow letters: played once, it rests on the greeting.
anim-flight-path = Flight path
anim-plane-crosses-dotted-route-from = A plane crosses a dotted route from New York to Lisbon, climbing as it goes, with the flight’s times above.
anim-neon-sign = Neon sign
anim-cafes-sign-at-night-name = A café’s sign at night: the name flickers, the hours stand out below, and the cup glows and swells.
anim-sunrise = Sunrise
anim-sun-comes-up-from-behind = The sun comes up from behind the hills and the morning slides in: depth, size and a pen-drawn skyline.
# A key is a moment a shape is set at; between keys it travels. The effects (Impact … Blur) are meme looks.
anim-animated-gif = Animated GIF
anim-video-webm = Video (WebM)
anim-animated-svg = Animated SVG
anim-empty-stage = An empty stage
anim-3d = 3D
anim-add-key-here = Add keyframe
anim-blur = Blur
anim-depth = Depth
anim-effects = Effects
anim-frame-n-s-s = Frame { $n }, { $s } s
anim-impact = Impact
anim-key-at-s-s = Keyframe at { $s } s
anim-mirror = Mirror
anim-mode = Mode
anim-moments = Keyframes
anim-move = Move
anim-neon = Neon
anim-pause = Pause
anim-play = Play
anim-pixel-art-is-made-in = Pixel art is made in the Drawing Tool; the Animator moves shapes.
anim-rainbow = Rainbow
anim-remove-this-key = Remove keyframe
anim-shadow = Shadow
common-size = Size
anim-spin = Spin
anim-stage-alt-arrow-keys-move = Stage: { $alt }. Arrow keys move the selected shape (or the time). Comma and period step a frame. Space plays. K adds a keyframe.
anim-shapes-in-hand = Selected shapes
anim-time = Time
anim-wobble = Wobble
anim-now-s-of-all-s = { $now } s of { $all } s
# The filmstrip's menu for the frame in hand, and Settings in the bar (the length, the speed and the repeat).
anim-settings = Settings
anim-this-frame = Current frame
anim-duplicate-this-frame = Duplicate this frame
anim-frame-earlier = A frame earlier
anim-frame-later = A frame later
anim-delete-this-frame = Delete this frame
anim-draw-shapes-move-sets-them = Draw shapes, then use Move to animate them.
anim-nothing-here-yet-draw-something = Nothing here yet: draw something first.
anim-tap-shape-then-drag-it = Tap a shape, then drag it to where it goes.
anim-drag-it-to-where-it = Drag it to where it goes at { $s } s.

anim-anything-from-drawing-tool-moving = Anything from the Drawing Tool, moving: position, depth, size, spin and turn over time, with effects for memes.
anim-back-and-forth = Back and forth
anim-forward-then-back = Forward, then back
anim-frames = Frames
anim-frames-second = Frames per second
anim-how-large-shape-is-drawn = How large the shape is drawn: 1× is as drawn.
anim-length-speed-and-repeat = Length, speed and repeat
anim-loop-forever = Loop forever
anim-play-once = Play once
anim-turn = Turn
anim-turns-shape-about-its-upright = Turns the shape about its upright axis, like a card: edge on at 90°, mirrored past it.
anim-turns-shape-around-in-plane = Turns the shape around in the plane of the stage, like a wheel.
anim-which-shape-is-in-front = Which shape is in front: a nearer shape is drawn over a farther one, and a far one a little dimmer. Depth never changes the size.
anim-n-times = { $n } times
anim-s-s = { $s } s
anim-frame-back-frame-on = Previous or next frame
anim-nudge-shapes-in-hand-with = Nudge selected shapes, or step one frame
anim-play-or-pause = Play or pause
anim-first-frame-last = First or last frame

## the Outliner

# The bullet is the line to the parent; a join between any two items is a connection. { $from } and { $to } are items' words.
outline-named-label = , named “{ $label }”
outline-book = A book
outline-decision = A decision
common-talk = A talk
outline-empty-outline = An empty outline
outline-outliner-ideas-under-ideas-folded = An outliner: ideas under ideas, folded and unfolded, moved around and joined; the same tree a deck or a mind map reads.
outline-arrow-from-from-to-to = Arrow from { $from } to { $to }
outline-arrows-both-ways = Arrows both ways
outline-as-page = As a page
common-calculator = Calculator
common-calendar = Calendar
outline-cancel-connecting = Cancel connecting
outline-change-it = Edit
common-chosen-items = Selected items
outline-connect = Connect
outline-connect-from-words = Connect from “{ $words }”
outline-connect-from-to-to = Connect “{ $from }” to “{ $to }”
outline-connection-from-from-to-to = Connection from { $from } to { $to }
common-connections = Connections
common-copy = Copy
# Comment on the words selected (a button in the selection's bar, where a host takes comments).
common-comment = Comment
common-presentation-builder = Presentation Builder
common-diagram-maker = Diagram Maker
common-drag-to-move = Drag to move
outline-draw-as-mind-map = Draw as a mind map
outline-draw-as-network = Draw as a network
outline-draw-as-org-chart = Draw as an org chart
outline-empty = Empty
outline-everything = Everything
outline-fold = Collapse
outline-fold-all = Collapse all
outline-item = Item
outline-item-n = Item { $n }
outline-kind-of-line = Line style
common-launch-plan = Launch plan
outline-line-from-from-to-to = Line from { $from } to { $to }
outline-line-named-label-change-it = Line labeled “{ $label }”: edit
common-animator = Animator
common-move-down = Move down
outline-move-this-item-drag-it = Move this item: drag it onto another
common-move-up = Move up
outline-name-of-line = Line label
outline-numbered = Numbered
outline-opml-for-outliners = OPML (for outliners)
common-open-in-new-tab = Open in a new tab
common-outline = Outline
outline-outliner = Outliner
outline-outline-lowercase = outline
common-paste = Paste
outline-plain-line = Plain line
outline-plain-text = Plain text
common-show-as-slides = Show as slides
outline-show-as-outline = Show as outline
outline-take-away-connection-from-from = Remove the connection from { $from } to { $to }
outline-take-it-away = Remove
# The compound bullet (Paul, 2026-10-15): the statuses a document sets in its head, a status's pill, a due day's chip.
outline-statuses = Statuses
outline-status = Status
outline-no-status = No status
outline-status-status-tap-for-next = { $status }. Tap to change the status
outline-due-date = Due date
outline-due-date-ellipsis = Due date…
outline-due-date-change-it = Due { $date }. Tap to change
outline-remove-due-date = Remove due date
# The compound bullet's views (View as ▾ and the dialogs' titles) and the statuses' dialog. { $parent } is a few words of the parent item.
outline-agenda = Agenda
outline-by-status = By status
outline-nothing-to-do-yet = Nothing to do yet. Items with a task, a status or a due date appear here.
outline-line-to-parent = Line to “{ $parent }”
outline-arrow-to-parent-item = Arrow to “{ $parent }”
outline-arrow-from-parent-item = Arrow from “{ $parent }”
outline-edit-statuses = Edit statuses…
outline-add-status = Add a status
# A status's color.
outline-gray = Gray
outline-last-status-means-done = The last status means done. Tasks with that status are checked off.
outline-take-connection-away = Remove connection
outline-tap-item-to-connect-from = Tap the item to connect from.
outline-tap-item-to-connect-words = Tap the item to connect “{ $words }” to.
outline-question-options-under-it-and = The question, the options under it, and for each what speaks for it and against it.
common-trip-planner = Trip Planner
outline-twenty-minutes-in-three-parts = Twenty minutes in three parts: the problem, the idea, what it means; a slide a top item when shown as a deck.
outline-unfold-all = Expand all
outline-unfold-n-inside = Expand ({ $n ->
        [one] { $n } item
       *[other] { $n } items
    })
common-untitled = Untitled
outline-view-as = View as
outline-zoomed-in-on = Focused on
outline-a-plain-line = a plain line
outline-arrow-from-parent = an arrow from the parent
outline-arrow-to-parent = an arrow to the parent
outline-arrows-both-ways-lowercase = arrows both ways
outline-e-g-owns-feeds-reports = e.g. owns, feeds, reports to
outline-item-above = the item above
outline-this-item = this item
# The templates: their names and blurbs (templates.md says what each is for).
outline-company = A company
outline-decision-tree = A decision tree
outline-family = A family
outline-five-minute-retirement-toast-opening = A five-minute retirement toast: an opening, three stories, the toast, each part timed on its line.
outline-novel = A novel
outline-product-launch-product-marketing-and = A product launch: the product, the marketing and the support under it, with joins between the branches.
outline-research-plan = A research plan
outline-speech = A speech
outline-syllabus = A syllabus
outline-ten-week-course-when-and = A ten-week course: when and where, a numbered topic a week, how it is graded, and what to read.
outline-thesis-two-arguments-with-their = A thesis, two arguments with their evidence, the objection and the answer to it, and the way out.
outline-essay-plan = An essay plan
outline-draw-as-family-tree = Draw as a family tree
outline-five-days-in-lisbon-packed = Five days in Lisbon, packed by category, with what to do before the door shuts.
outline-indoors-or-out-for-saturday = Indoors or out for a Saturday market: each question’s answers on its lines, yes and no.
outline-no-internet-at-home-question = No internet at home: a question at each step, yes or no, down to the call to make.
outline-packing-list = Packing list
outline-parts-and-chapters-of-book = Parts and chapters of a book of ideas, with a line under each chapter for what it argues.
outline-people-and-three-acts-of = The people and three acts of chapters, each with what happens in it, joined where a person changes a chapter.
outline-question-method-budget-that-adds = The question, the method, a budget that adds itself up, a timeline, the risks and the reading.
outline-three-generations-and-next-each = Three generations and the next, each with their years, drawn as a family tree from the menu.
outline-troubleshooting = Troubleshooting
outline-who-works-for-whom-at = Who works for whom at a bakery of nine, each with their role, drawn as an org chart from the menu.
outline-pdf-sections-and-bullets = PDF: sections and bullets
outline-fold-unfold = Collapse or expand
outline-name-line = Label

## the Presentation Builder

# Its templates: the occasions and a second of each printed format.
deck-choirs-winter-concert-welcome-both = A choir's winter concert: the welcome, both halves, notes on the music, the singers, and the words to sing along.
deck-lesson = A lesson
deck-lost-pet-poster-in-red = A lost-pet poster in red: the name, what she looks like, where she was seen, a number to call.
deck-morning-workshop-schedule-checklist-of = A morning workshop: the schedule, a checklist of what to bring, the steps, and where to go next.
deck-pick-your-own-farm-what = A pick-your-own farm: what grows when, how it works, the prices, the barn and how to find it.
deck-pitch = A pitch
deck-product-in-sentence-what-it = A product in a sentence, what it does, prices in a table, the launch dates and the press contact.
deck-trivia-night-in-four-rounds = A trivia night in four rounds, a score table, and the answers on the last slide.
deck-residents-meeting-about-new-playground = A residents' meeting about a new playground: why, what is proposed, the budget as a pie, when, how to have a say.
deck-science-lesson-on-chalkboard-aims = A science lesson on the chalkboard: aims, what they know, the model, a check, homework; the teacher's notes under each.
deck-seed-pitch-in-eight-slides = A seed pitch in eight slides: the problem, the product, traction on a chart, the business, the team, the ask.
deck-bike-shops-quarter-for-its = A bike shop's quarter for its partners: revenue on a chart, wins and misses, the numbers that matter, next quarter.
deck-small-story-in-panels-about = A small story in panels about lending something to a neighbor.
deck-twenty-minute-talk-with-speaker = A twenty-minute talk with speaker notes on every slide, a chart of the results, a footnote and the lessons.
deck-badges-for-conference-each-with = Badges for a conference, each with a role and where they are from, on the Ocean look.
deck-comic-umbrella = Comic: the umbrella
deck-concert-program = Concert program
deck-conference-badges = Conference badges
deck-conference-talk = Conference talk
deck-farm-brochure = Farm brochure
deck-lost-cat-poster = Lost cat poster
deck-product-launch = Product launch
deck-quarterly-review = Quarterly review
deck-recipe-zine = Recipe zine
deck-seven-soups-for-cold-week = Seven soups for a cold week, one a page, in a zine folded from one sheet.
deck-their-story-for-reception-from = Their story for the reception, from how they met to the question, with a timeline and a thank-you.
deck-town-hall-notice = Town-hall notice
deck-trivia-night = Trivia night
deck-wedding-slideshow = Wedding slideshow
deck-workshop-agenda = Workshop agenda
deck-presentation-lowercase = presentation
deck-slides = Slides
deck-chosen-slides = Selected slides
deck-move-this-slide-drag-it = Move this slide: drag it onto another
deck-slides-titles-bullets-two-columns = Slides: titles, bullets, two columns, big icons, other documents on a slide; or a zine, booklet, brochure, comic, poster or name badges to print and fold.

# The layouts, the transitions, the formats
deck-bullets = Bullets
deck-two-columns = Two columns
deck-big-icon = Big icon
deck-fade = Fade
# The transition: a hard switch from one slide to the next, no fade (not the clipboard's Cut).
deck-cut = Cut
# The clipboard's Cut (Mod+X), in every app's menus.
common-cut = Cut
deck-slide = Slide
deck-zoom = Zoom
deck-zine = Zine
deck-booklet = Booklet
deck-brochure = Brochure
deck-comic = Comic
deck-poster = Poster
deck-name-badges = Name badges

# The themes (the Look menu) and the icon colors
deck-plain = Plain
deck-boardroom = Boardroom
deck-ivory = Ivory
deck-midnight = Midnight
deck-graphite = Graphite
deck-confetti = Confetti
deck-sunset = Sunset
deck-ocean = Ocean
deck-bubblegum = Bubblegum
deck-arcade = Arcade
deck-chalkboard = Chalkboard
deck-fun = Fun
deck-themes-color = The theme's color

# The bar
common-present = Present
deck-see-sheets-to-print = Print layout
deck-back-to-pages = Back to pages
deck-headline = Headline
deck-layout-layout = Layout: { $layout }
common-look-theme = Look: { $theme }
deck-transition-transition = Transition: { $transition }
deck-format-format = Format: { $format }
deck-printing = Printing
deck-one-sided = One-sided
deck-fold-and-cut = Fold and cut
deck-two-sided = Two-sided
deck-cut-and-nest = Cut and nest
deck-end-with-qr-code-of = End with a QR code of this deck
deck-move-slide-up = Move slide up
deck-move-slide-down = Move slide down
deck-delete-slide = Delete slide
deck-move-page-up = Move page up
deck-move-page-down = Move page down
deck-delete-page = Delete page

# Insert
deck-bullets-slide = Bullets slide
deck-title-slide = Title slide
deck-two-column-slide = Two-column slide
deck-big-icon-slide = Big icon slide
deck-page = Page
deck-title-page = Title page
deck-two-column-page = Two-column page
deck-big-icon-page = Big icon page
deck-four-more-pages = Four more pages
deck-on-slide = On the slide
deck-on-page = On the page
common-pages = Pages

# The canvas
deck-add-icon = Add an icon
common-change-icon = Change the icon
deck-pick-icon = Pick an icon
deck-left-column = Left column
deck-right-column = Right column
deck-one-bullet-line = One bullet a line.
deck-one-bullet-line-tab-steps = One bullet a line. Tab steps it in.
deck-line-or-two-under-title = A line or two under the title
deck-what-this-page-says-type = Page text. It shrinks to fit the page.
deck-panel-line-what-is-said = A panel a line: what is said | the caption. Icon gives it a picture.
deck-speaker-notes = Speaker notes
deck-n-total = { $n } / { $total }
deck-document-on-slide = A document on the slide
deck-remove-from-slide = Remove from slide

# The rail and the sheets
deck-slide-n = Slide { $n }
deck-front-cover = Front cover
deck-back-cover = Back cover
common-page-n = Page { $n }
deck-front = Front
deck-inside-left = Inside left
deck-inside-middle = Inside middle
deck-inside-right = Inside right
deck-inside-flap = Inside flap
deck-back = Back
deck-badge-n = Badge { $n }
deck-last-slide-added-for-you = Final slide: a QR code of this deck
deck-ends-with-qr-code-of = The deck ends with a QR code so the audience can take it with them. The QR button turns this off.
deck-qr-code-of-this-deck = QR code of this deck
deck-sheet-side-n = Sheet, side { $n }
deck-cut-along-dashes-this-half = cut along the dashes · this half goes outside
deck-print-on-back-flipped-on = print on the back, flipped on the long edge
deck-cut-along-dashes-fold-along = cut along the dashes · fold along the dots
deck-print-it-double-sided-on = Print it double-sided on letter paper, flipping on the long edge, at actual size. Cut along the dashes, lay the top half over the bottom half, and fold them together down the middle.
deck-print-it-on-one-side = Print it on one side of letter paper, at actual size. Fold it in half the long way, then into quarters; cut the dashes in the middle; push the ends together and fold it into a book.
deck-print-it-double-sided-on-letter-paper-flipping-on-short-edge-at-actual-size-stack-sheets-in-order-first-on-outside-and-fold-them-together-down-middle = Print it double-sided on letter paper, flipping on the short edge, at actual size. Stack the sheets in order, first on the outside, and fold them together down the middle.
deck-print-it-double-sided-on-letter-paper-flipping-on-short-edge-at-actual-size-fold-right-third-in-then-left-third-over-it-front-is-on-top = Print it double-sided on letter paper, flipping on the short edge, at actual size. Fold the right third in, then the left third over it: the front is on top.
deck-print-it-on-letter-paper = Print it on letter paper, at actual size.
deck-print-it-on-letter-paper-at-actual-size-cut-along-dashes-six-badges-sheet = Print it on letter paper, at actual size. Cut along the dashes: six badges a sheet.

# Presenting, and the closing slide
deck-presentation = Presentation
common-previous = Previous
common-next = Next
common-stop-presenting = Stop presenting
deck-slide-n-of-total = Slide { $n } of { $total }
common-notes = Notes
deck-n-hides-them = N hides them
deck-take-this-deck-home = Take this deck with you
deck-take-this-deck-home-title = Take this deck with you: { $title }
deck-scan-code-whole-deck-is = Scan the code: the whole deck is in the link.
deck-a-qr-code-of-this-deck = A QR code of this deck

# Downloads
deck-powerpoint-pptx = PowerPoint (PPTX)
deck-picture-of-every-slide-zip = A picture of every slide (ZIP of PNGs)
deck-animation-of-deck-gif = An animation of the deck (GIF)
deck-film-of-deck-webm = A film of the deck (WebM)

# The templates
deck-title-agenda-three-points-with = Title, agenda, three points with notes for the speaker, and a close.
deck-status-update = Status update
deck-done-and-next-side-by = Done and next side by side, then risks, then asks.
deck-proposal = A proposal
deck-what-you-heard-what-you = What you heard, what you propose, when, what it costs.
deck-eight-small-pages-from-one = Eight small pages from one sheet of paper: print, fold and cut, or read it by tapping on a phone.
deck-booklet-of-half-letter-pages = A booklet of half-letter pages, eight to twenty, laid out to print, nest and fold.
deck-trifold-brochure-six-panels-on = A trifold brochure: six panels on two sides of a sheet, each where the fold needs it.
deck-mini-comic-panels-with-picture = A mini comic: panels with a picture, a speech bubble and a caption, folded from one sheet.
deck-poster-or-flyer-headline-and = A poster or flyer: a headline and a few lines, as big as one page allows.
deck-name-badges-for-meetup-one = Name badges for a meetup, one page per person, six to a sheet, ready to cut.
deck-edit-this-deck = Edit this deck
deck-new-slide = A new slide
deck-presenting-back = Back (presenting)
deck-presenting-next-line-or-slide = Next line or slide (presenting)
deck-presenting-whole-slide = Whole slide (presenting)
deck-slide-before-slide-after-on = Previous or next slide

## the Calendar app

cal-calendar = calendar
# A span is an event on the calendar or a task on the schedule (the Gantt view); { $every } is "Every week" and the like.
cal-name-yours-say = A name (yours, say)
cal-schedule-phases-with-their-tasks = A schedule: phases with their tasks under them, how far along each is, the launch at the end.
cal-week-earlier = A week earlier
cal-week-later = A week later
cal-weekend-of-sessions-at-set = A weekend of sessions at set times, a late set past midnight.
cal-all-day = All day
cal-chart-scrolls-sideways = Chart (scrolls sideways)
cal-color-for-new-color = Color for new: { $color }
cal-days = Days
cal-days-and-times-on-month = Days and times on a month, a year or a schedule, in any time zone.
cal-done = Done %
cal-edit-event = Edit event
cal-edit-task = Edit task
cal-choose-task = Select { $task }
cal-day-earlier = A day earlier
cal-day-later = A day later
cal-dates = Edit dates…
cal-end = End
cal-end-date = End date
cal-end-time = End time
cal-ends = Ends
common-event = Event
cal-every-day = Every day
cal-every-month = Every month
cal-every-week = Every week
cal-every-year = Every year
cal-family-calendar = Family calendar
cal-festival-weekend = Festival weekend
cal-how-many-times = How many times
cal-icalendar-ics = iCalendar (ICS)
cal-its-own-zone = Calendar’s time zone
cal-last-day = Last day
cal-lessons-birthdays-and-holidays-color = Lessons, birthdays and holidays, a color for each person, the weekly things repeating.
cal-level = Level
cal-month = Month
cal-my-zone = My time zone
cal-never = Never
cal-new-event = New event
cal-new-event-on-day = New event on { $day }
cal-new-task = New task
cal-next-month = Next month
cal-next-year = Next year
cal-no-tasks-yet = No tasks yet
cal-no-tasks-yet-insert-task = No tasks yet. Insert a task.
cal-nothing-on-calendar-yet-tap = Nothing on the calendar yet. Tap a day, or drag across several.
cal-nothing-this-month = Nothing this month.
cal-previous-month = Previous month
cal-previous-year = Previous year
cal-project-plan = Project plan
cal-repeats = Repeats
cal-schedule = Schedule
cal-show-times-in = Show times in
cal-start = Start
cal-start-date = Start date
cal-start-time = Start time
cal-starts = Starts
# When a repeating event stops (ends), a field beside Starts.
cal-stops = Stops
cal-same-dates-as-gantt-chart = The same dates as a Gantt chart
cal-this-calendar-is-written-in = This calendar is written in { $zone } time.
cal-this-calendar-names-no-time = This calendar has no time zone, so times are shown in yours ({ $zone }).
cal-this-month = This month
cal-time-zone = Time zone
cal-times-in-zone = Times in { $zone }
cal-times-or-on = times, or until
cal-view = View
cal-what = What
cal-year = Year
cal-color-stands-for = { $color } means
cal-every-until-date = { $every } until { $date }
cal-every-n-times = { $every }, { $n } times
cal-n-days = { $n ->
        [one] one day
       *[other] { $n } days
    }
cal-n-done = { $n }% done
# The templates: each name, then its line on the home page.
cal-bakerys-posts-and-newsletters-through = A bakery’s posts and newsletters through the winter, an advent story every day.
cal-youth-soccer-season-practice-every = A youth soccer season: practice every week, home and away in their colors, the playoffs.
cal-small-teams-time-off-public = A small team’s time off, the public holidays and the Christmas closing on one calendar.
cal-community-garden-plots-year-when = A community garden plot’s year: when to sow, plant, harvest and prune, coming around every year.
cal-fall-term-from-first-day = A fall term from the first day to Christmas: closings, clubs, the trip, parent-teacher conferences.
cal-bills-and-renewals = Bills and renewals
cal-conference-agenda = Conference agenda
cal-content-schedule = Content schedule
cal-editorial-calendar = Editorial calendar
cal-every-autopay-on-its-day = Every autopay on its day each month, the yearly renewals and the tax deadlines.
cal-garden-calendar = Garden calendar
cal-vacation-planner = Vacation planner
cal-league-schedule = League schedule
cal-school-term = School term
cal-training-plan = Training plan
cal-twelve-weeks-to-half-marathon = Twelve weeks to a half marathon as a schedule: base, build, peak, taper, race.
cal-two-days-of-talks-and = Two days of talks and workshops by the hour, a color for each room.
cal-two-issues-of-quarterly-from = Two issues of a quarterly from copy to sale, the monthly meeting and the launch.
cal-volunteer-schedule = Volunteer schedule
cal-who-does-which-shift-color = Who does which shift, a color for each person, at a food bank before Christmas.

## the Diagram Maker

diagram-diagram = diagram
# One app, eight kinds (mind map, org chart…); a 'thing' is whatever the kind is made of: an idea, a person, a step.
diagram-mind-maps-org-charts-family = Mind maps, org charts, family trees, swimlanes, timelines, Venns, seating charts and networks, drawn from a few lines.
diagram-empty-diagram = An empty diagram
# The kinds, one of each kind's things (Insert's item), and how a line of each is written
diagram-mind-map = Mind map
diagram-org-chart = Org chart
diagram-family-tree = Family tree
diagram-swimlanes = Swimlanes
diagram-timeline = Timeline
diagram-venn = Venn
diagram-seating-chart = Seating chart
diagram-network = Network
diagram-idea = Idea
diagram-person = Person
diagram-step = Step
diagram-set = Set
diagram-thing = Item
# The picture, and the line editor over a thing
diagram-tap-empty-space-for-thing = Tap empty space to add an item. To connect two, press Join and tap both, or drag one onto the other.
diagram-tap-here-to-add-first = Tap here to add the first { $thing }.
diagram-tap-in-lane-to-add = Tap in a lane to add a step. Tap a step to edit it. Drag it to another lane, or onto a step to follow it.
diagram-tap-thing-to-join-name = Tap the item to connect { $name } to. Tap empty space to cancel.
diagram-tap-first-thing-to-join = Tap the first item, then the other. Tap empty space to cancel.
diagram-this-thing = This item
diagram-add-under-it = Add below
diagram-add-one-more = Add another
diagram-add-after-it = Add after
diagram-add-step = Add a step
diagram-join = Join
diagram-make-it-plain-line = Plain line
diagram-make-it-arrow = Arrow
diagram-what-connection-says = Connection label
diagram-who = Who
diagram-connection = a connection
diagram-empty = empty
# The templates
diagram-empty-kind-to-start-from = An empty { $kind } to start from.
diagram-browser-api-database-cache-and = A browser, an API, a database, a cache and a worker, and how they talk.
diagram-building-project = A building project
diagram-launch-and-everything-that-branches = A launch and everything that branches from it: product, marketing, support.
diagram-package-through-store-warehouse-and = A package through a store, a warehouse and a carrier, with one decision.
diagram-small-company = A small company
diagram-wedding-dinner = A wedding dinner
diagram-year-of-dates-from-plans = A year of dates, from plans approved to doors open.
diagram-cats-and-dogs = Cats and dogs
diagram-computing-briefly = Computing, briefly
diagram-fast-cheap-good = Fast, cheap, good
diagram-four-tables-and-who-sits = Four tables and who sits around each.
diagram-from-lovelace-to-now-spaced = From Lovelace to now, spaced as the years fell, with an era along the foot.
diagram-from-order-to-doorstep = From order to doorstep
diagram-from-job-description-to-yes = From the job description to a yes, lane by lane.
diagram-grandparents-their-children-and-grandchildren = Grandparents, their children and grandchildren, with the years.
diagram-hiring-someone = Hiring someone
diagram-how-app-hangs-together = How an app hangs together
diagram-seven-people-who-reports-to = Seven people, who reports to whom, and one dotted line.
diagram-garden-this-year = The garden this year
diagram-three-generations = Three generations
diagram-three-sets-and-every-overlap = Three sets and every overlap, with what belongs where.
diagram-two-sets-and-what-they = Two sets and what they share.
diagram-what-to-grow-and-jobs = What to grow and the jobs to do, as a mind map.
diagram-biology-final-in-december-topic = A biology final in December, topic by topic, and how the studying gets done.
diagram-classroom = A classroom
diagram-family-with-godmother = A family with a godmother
diagram-principal-her-assistant-principals-classroom = A principal, her assistant principals, the classroom teachers and the custodian.
diagram-move-to-lisbon-by-march = A move to Lisbon by March: papers, an apartment, work and life, and what has to come first.
diagram-elementary-school = An elementary school
diagram-restaurant-kitchen = A restaurant kitchen
diagram-router-and-everything-on-it = A router and everything on it: laptop, phone, printer, television and doorbell.
diagram-team-by-its-skills-design = A team by its skills: design, writing and code, and who does more than one.
diagram-expense-report = An expense report
diagram-apollo-11 = Apollo 11
diagram-board-game-night = Board game night
diagram-class-4b-at-four-tables = Class 4B at four tables by color, and the reading corner.
diagram-eight-days-in-july-1969 = Eight days in July 1969, day by day, from launch to splashdown.
diagram-four-games-table-each-and = Four games, a table each, and who is playing what.
diagram-from-photo-of-receipt-to = From a photo of the receipt to the pay stub, past a manager and finance.
diagram-moving-abroad = Moving abroad
diagram-patrick-and-maria-their-six = Patrick and Maria, their six children with the years they lived, and the aunt who raised them.
diagram-studying-for-exam = Studying for an exam
diagram-sea-clouds-mountains-rivers-groundwater = Sea, clouds, mountains, rivers, groundwater and plants, and how the water moves between them.
diagram-brontes = The Brontës
diagram-brigade-under-head-chef-front = The brigade under the head chef, front of house beside it.
diagram-house-network = The house network
diagram-water-cycle = The water cycle
diagram-three-generations-of-morenos-and = Three generations of the Morenos, and a dotted line to a godchild.
diagram-who-can-do-what = Who can do what
diagram-tap-empty-space-for-branch = Tap empty space to add a branch. Tap an idea to edit it, Enter for the next. Drag one onto another to nest it. Join connects two across the map.
diagram-place-cards = Place cards
diagram-print-place-cards = Print place cards
diagram-print-place-cards-card-guest = Print place cards: a card a guest, eight to a letter sheet, to cut out
diagram-guest = Guest
diagram-new-idea = New idea
diagram-tap-empty-space-for-person = Tap empty space to add a person. Tap one to edit, Shift+Enter for their role, Enter for the next. Drag one onto another to put them under.
diagram-tap-empty-space-for-event = Tap empty space to add an event. Type the date, Shift+Enter, then what happened. Dates are spaced to scale, and a range shows as a band.
diagram-lanes-name = The lane's name
diagram-when = When
diagram-tap-person-to-type-on = Tap a person to edit. Add + and a name for a partner, Shift+Enter for years, Enter for the next. Drag one onto another to put them under. Join draws a dotted line.
diagram-tap-empty-space-for-table = Tap empty space to add a table. Tap a table or a person to edit. A comma starts the next guest. Drag a person to another table.
diagram-tap-inside-circles-to-add = Tap inside a circle to add an item. A comma starts the next. Tap a set’s name to rename it. Drag an item between circles.

## the Trip Planner

trip-trip = trip
# A stop is a place on the route; { $n } is its number, { $time } a drive such as "1 hr 38 min". 'Trip Planner' and 'Plan' are above.
trip-route-on-map-stops-in = A route on a map: stops in order, each with a note, and how far between them.
trip-gpx-route = GPX route
trip-geojson = GeoJSON
# The bar and the map
trip-a-place-by-name = A place by name…
trip-stop-at-middle-of-map = Add a stop at the map’s center
trip-measure-in = Measure in
trip-hours-of-driving = Hours of driving
trip-miles = Miles
trip-kilometers = Kilometers
trip-join-stops-in-order = Connect stops in order
trip-show-whole-route = Show the whole route
trip-where-i-am = Where I am
trip-map = Map
trip-map-tap-to-add-stop = Map: tap to add a stop
trip-map-comes-from-openfreemap = Map tiles are loaded from OpenFreeMap while the map is open.
trip-your-location-is-asked-for = Your location is used only to center the map and is never stored.
trip-n-stops = { $n ->
        [one] one stop
       *[other] { $n } stops
    }
trip-stop-n = Stop { $n }
# A stop's number is its handle; the bar under stops chosen whole.
trip-stop-n-tap-chooses-it = Stop { $n }: tap to select, drag to move
trip-chosen-stops = Selected stops
# The trip's list of stops, for screen readers (a noun).
trip-stops = Stops
trip-show-on-map = Show on the map
trip-name-of-stop-n = Name of stop { $n }
trip-note-for-stop-n = Note for stop { $n }
trip-about-time-by-car = about { $time } by car
trip-tap-map-to-add-first = Tap the map to add the first stop, or Insert a place by name.
trip-insert-place-by-name = Insert a place by name.
# Finding a place by name
trip-place-by-name = A place by name
trip-find-place = Find a place
trip-town-address-museum = A town, an address, a museum
trip-search = Search
trip-searching = Searching…
trip-searching-sends-words-you-type = Searching sends only what you type to OpenStreetMap’s Nominatim.
trip-places-found = Places found
trip-nothing-found = Nothing found.
# The templates
trip-week-in-portugal = A week in Portugal
trip-lisbon-to-porto-by-car = Lisbon to Porto by car, in kilometers, a tip at every stop.
trip-down-pacific-coast = Down the Pacific coast
trip-san-francisco-to-los-angeles = San Francisco to Los Angeles on Highway 1, in miles.
trip-scottish-highlands = The Scottish Highlands
trip-loop-from-edinburgh-each-leg = A loop from Edinburgh, each leg in hours of driving.
trip-rome-places-to-see = Rome, the places to see
trip-places-as-dots-not-route = Places as dots, not a route: what to see and when to go.
trip-weekend-in-copenhagen = A weekend in Copenhagen
trip-friday-night-to-sundays-train = Friday night to Sunday’s train, on foot, in kilometers.
trip-icelands-ring-road = Iceland’s Ring Road
trip-ten-days-around-island-by = Ten days around the island by car, each leg in hours of driving.
trip-dublin-food-crawl = A Dublin food crawl
trip-seven-places-to-eat-in = Seven places to eat in one afternoon, west to east, a short walk between each.
trip-yosemites-mist-trail-loop = Yosemite’s Mist Trail loop
trip-two-waterfalls-on-day-hike = Two waterfalls on a day hike from Happy Isles and back, in miles.
trip-loire-by-bike = The Loire by bike
trip-orleans-to-saumur-in-six = Orléans to Saumur in six days, château to château, in kilometers.
trip-college-tour = A college tour
trip-six-campuses-in-new-england = Six campuses in New England in a week, a tour booked at each.
trip-japan-by-rail = Japan by rail
trip-tokyo-to-miyajima-in-cherry = Tokyo to Miyajima in the cherry blossom, by bullet train.
trip-last-100-km-of-camino = The last 100 km of the Camino
trip-sarria-to-santiago-on-foot = Sarria to Santiago on foot, a stage a day.
trip-new-york-in-movies = New York in the movies
trip-seven-film-and-tv-locations = Seven film and TV locations, uptown to downtown, in a day.
trip-wedding-on-lake-como = A wedding on Lake Como
trip-for-guests-where-wedding-is = For the guests: where the wedding is, where to sleep, how to get there.
trip-presenting-trip = Presenting the trip
trip-presenting-next-stop = Next stop (presenting)
trip-presenting-stop-before = Previous stop (presenting)
trip-put-stops-on-calendar-day = Put the stops on a calendar, a day each
trip-first-last = First or last
trip-next-stop = Next stop
trip-stop-before = Previous stop

## shared: the Word Processor's looks, the header's Home, a money column's currency

looks-typewriter = Typewriter
looks-serif = Serif
common-home = Home
looks-currency = Currency

## the Calculator app

calc-calculation = calculation
# The tape is the list of lines worked out, as on a printing calculator. 'Calculator' and 'Numbers' are above.
calc-calculator-that-shows-its-work = A calculator that shows its work: names, units and conversions, and graphs of y = f(x).
calc-tape-text = Tape as text
# The bar
calc-graph = Graph
calc-clear-tape = Clear the tape
calc-clear-graph = Clear the graph
# Insert: functions, and what the second engine reads
calc-functions = Functions
calc-sine = Sine
calc-cosine = Cosine
calc-tangent = Tangent
calc-natural-log = Natural log
calc-log-base-ten = Log base ten
calc-square-root = Square root
calc-absolute-value = Absolute value
calc-factorial = Factorial
calc-e-number = e, the number
calc-x-for-graph = x, for a graph
calc-units-and-algebra = Units and algebra
calc-convert-to = Convert to
calc-derivative = Derivative
calc-simplify = Simplify
# The tape, the line being typed, the keys; { $answer } is a result such as 42 or 7.62 cm
calc-tape = Tape
calc-line-n = Line { $n }
calc-put-answer-in-line = Insert { $answer }
calc-no-answer = No answer
calc-take-away-line-n = Delete line { $n }
calc-sum = Sum
calc-type-or-tap = Type or tap
calc-y = y =
calc-y-equals-ellipsis = y = …
calc-at-x-1-answer = at x = 1: { $answer }
calc-keys = Keys
calc-backspace = Backspace
calc-clear-line = Clear the line
calc-answer-before = Previous answer
calc-type-sum-or-3-inch = Type a calculation, or 3 inch to cm, and press Enter. a = 12 saves an answer by name.
calc-type-curve-in-x-such = Type a curve in x, such as x^2 or sin(x), and press Enter to draw it.
# The templates
calc-splitting-bill = Splitting the bill
calc-food-drinks-and-18-tip = Food, drinks and an 18% tip, shared six ways, each step kept by name.
calc-shopping-total = A shopping total
calc-tape-of-market-apples-and = A tape of the market: apples and cheese by weight, the total, and the change from $60.
calc-tax-on-price = Tax on a price
calc-new-york-city-sales-tax = New York City sales tax added to a price, and taken back out of a receipt.
calc-percentage-change = Percentage change
calc-rent-up-from-1-450 = The rent up from $1,450 to $1,595: by how much, by what percent, and against a raise.
calc-kitchen-conversions = Kitchen conversions
calc-cups-ovens-spoons-and-weights = Cups, ovens, spoons and weights, from one measure to another.
calc-scaling-recipe = Scaling a recipe
calc-banana-bread-for-eight-made = Banana bread for eight made for twelve: every amount times one and a half.
calc-unit-conversions = Unit conversions
calc-feet-to-centimeters-miles-to = Feet to centimeters, miles to kilometers, pounds to kilograms, Fahrenheit to Celsius.
calc-currency-at-rate-you-type = Currency at a rate you type
calc-trip-priced-in-euros-and = A trip priced in euros and turned into dollars, with the card fee on top.
calc-fuel-for-trip = Fuel for a trip
calc-boston-to-montreal-and-back = Boston to Montreal and back: miles, miles per gallon, the price, four ways.
calc-paint-for-room = Paint for a room
calc-walls-less-door-and-windows = Walls less the door and windows, two coats, in gallon cans.
calc-time-zones = Time zones
calc-one-call-at-9-in = One call at 9 in New York, and the hour it is in London, Berlin, Mumbai, Tokyo and Sydney.
calc-running-pace = Running pace
calc-10k-in-52-30-minutes = A 10K in 52:30: minutes a kilometer and a mile, and the half and full marathon at that pace.
calc-body-mass-index = Body mass index
calc-weight-over-height-squared-in = Weight over height squared, in kilograms and meters or in pounds and inches.
calc-dose-by-weight = Dose by weight
calc-milligrams-kilogram-turned-into-milliliters = Milligrams a kilogram, turned into milliliters of a syrup; check every dose with a pharmacist.
calc-electricity-for-appliance = Electricity for an appliance
calc-watts-hours-day-and-price = Watts, hours a day and the price of a kilowatt-hour: what a heater costs a month.
calc-loan-payment = Loan payment
calc-24-000-at-6-9 = $24,000 at 6.9% over sixty months: the monthly payment and the interest in all.
calc-compound-interest = Compound interest
calc-5-000-and-200-month = $5,000 and $200 a month at 5% for ten years, against what went in.
calc-break-even = Break-even
calc-costs-against-sales-for-coffee = Costs against sales for a coffee cart: where the lines cross is the cups a day it needs.
calc-curve-and-its-slope = A curve and its slope
calc-x3-3x-its-derivative-and = x³ − 3x, its derivative, and the flat tangent at the bottom of the dip.
calc-waves-adding-up = Waves adding up
calc-sine-waves-summed-on-their = Sine waves summed, on their way to a square wave.
# The grip on a line of the tape; the bar under lines chosen whole.
calc-choose-line-n-drag-it = Select line { $n }, drag to move
calc-chosen-lines = Selected lines

## two links compared (kit/ui/compare.ts)

compare-changes = Changes
compare-compare = Compare
compare-no-difference = No difference
compare-not-link-to-tiny-little = Not a link to a Tiny Little Office document
compare-paste-second-link-to-see = Paste a second link to see what changed.
compare-paste-link-to-document-as = Paste the link to the document as it is now
compare-paste-link-to-document-as-it-was = Paste the link to the document as it was
compare-put-in = Added:
compare-swap = Swap
compare-taken-out = Removed:
compare-first-link = The first link
compare-second-link = The second link
compare-two-links-to-documents-side = Two links to documents, side by side: what the second changed is marked. Nothing leaves this page.
compare-different-apps = different apps
compare-n-blocks-taken-out = { $n ->
        [one] { $n } block removed
       *[other] { $n } blocks removed
    }
compare-n-put-in = { $n ->
        [one] { $n } added
       *[other] { $n } added
    }

## files and zips dropped on the page (kit/file/open.ts)

open-opened-name = Opened { $name }
open-that-file-is-not-words = Tiny Little Office can’t read that file.
open-that-file-is-too-large = That file is too large.
open-keep-them-on-this-device = Save them to this device
open-nothing-is-saved-on-this = Nothing is saved on this device. Save them here, or open one.
open-first = Open the first
open-saving-in-this-browser-n = Saving in this browser: { $n ->
        [one] { $n } document kept
       *[other] { $n } documents kept
    }
open-that-zip-holds-no-documents = No readable documents found in that zip.
open-n-documents-kept = { $n ->
        [one] { $n } document kept
       *[other] { $n } documents kept
    }

## a document's QR code (kit/draw/qr-picture.ts)

# Restored around the document: search, Find in this document, the shortcuts and the apps' keys, Mod+S, the size of
# everything, Add to home screen, another version kept here, where the link fits, Open in another app, the QR code
# of this document, Insert narrowed by typing, Trip presenting, a seating chart's place cards
qr-code-of-this-document = A QR code of this document

## the keys, the shortcuts and the size of everything (kit/core/keys.ts, kit/ui/zoom.ts)

keys-normal-size = Reset zoom
keys-everything-larger = Zoom in
keys-everything-smaller = Zoom out
keys-keep-this-document-on-device = Save to this device
keys-show-these-shortcuts = Show these shortcuts
keys-this-page = This page

## Find in this document (kit/ui/find.ts)

find-not-found = Not found

## a menu narrowed by typing (kit/ui/menu.ts)

menu-nothing-starts-q = No matches for “{ $q }”
menu-starting-q = Matches for “{ $q }”
