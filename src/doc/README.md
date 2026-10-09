# src/doc: the document kernel

The kernel lands here, per docs/kernel.md: one typed model of a document (head fields and blocks), TLO as its
one serialisation and only parser, and edits as operations on it. Until it does, the kit passes a document
about as its TLO text (`Doc` in src/kit/app.ts is a string), and no file in this folder but this one exists.
