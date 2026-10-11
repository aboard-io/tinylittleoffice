# R5-C: text in the Drawing Tool and the Animator can be left, centred or right

Read first: directive-r4-common.md, docs/editing.md (shortcuts; §8), src/apps/draw/model.ts (the header comment: the Style column is fill digit + colour letter + size digit; Shape; wordsOver ~300: `left = s.k === 't'`), src/apps/draw/view.ts (~140-156: anchor start/middle), src/apps/draw/editor.ts (contextItems ~998, the contextual bar), src/apps/anim (it shares Draw's shapes and bar: find where), src/apps/draw/templates.ts and src/apps/anim/templates.ts (the builders placed titles "by estimate" and put captions in boxes because text was always left-aligned), the draw and anim tests.

Paul (2026-10-10) approved: a text shape gets an alignment, so titles in Draw and Animator templates can be centred.

Build:
1. Model: `Shape` gets `al?: 'c' | 'r'` (absent: left). In the Style cell, one optional trailing character after the size digit: `=` centred, `>` right (Style "1b3=", "0>"); read leniently anywhere in the cell, written last, written only for 't' shapes, absent for left. Byte-stable; every existing document unchanged. `alignOp(shape, al)` as a pure command like the others.
2. Drawing (view.ts): for a 't' shape, anchor start / middle / end at the box's left+4 / centre / right-4; an icon mark before the words stays attached to the words (centred as one, or against the right edge). The words editor laid over them (wordsOver) takes the same alignment (text-align on the editor box). The Animator draws through the same code.
3. Interface: for a text shape in hand, the contextual bar gets one Align item next to the text size, showing the current state's icon (lucide align-left / align-center / align-right) and cycling left → centre → right on tap, with the label "Align: left/centre/right"; keyboard: Mod+Shift+L / E / R as the Word Processor's block alignment (check docs/editing.md; if those keys are taken in Draw, say so and use the standard's alternative; add the row to §4/§8). Undoable, in history as one step.
4. Templates: go through the Drawing Tool's and the Animator's templates and centre the titles, captions and labels that were placed by estimate or boxed to look centred (title cards, memes, logo captions, the spinner's caption, the café sign…). Byte-stable through the corpus test.

Tests: model (read/write of `=` and `>`, lenient forms, never written for a non-text shape, alignOp); view (anchor and x per alignment, with and without an icon); DOM test of the bar item cycling and the shortcuts; the Animator shows the same item; corpus still byte-stable. PW_PORT=4431.
