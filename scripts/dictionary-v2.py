# /// script
# requires-python = ">=3.11"
# dependencies = ["zstandard==0.25.0"]
# ///
"""How the v2 link dictionary was made (src/kit/core/dictionary-v2.ts). Dev only; nothing here ships.

    uv run scripts/dictionary-v2.py            # writes src/kit/core/dictionary-v2.ts

The dictionary is FROZEN the day v2 ships: every "w" link depends on its exact bytes. This script is the record of
where they came from, not a way to change them; a better dictionary is a new flag. Run again on a later corpus, it
makes a different dictionary, which must never replace this one.

The method is Oskar Austegard's (github.com/oaustegard/experiments, tlo-link-v2, MIT; issue #23):
- the training text is every document in test/doc/corpus (the templates, the guides' and the skill's examples, the
  apps' examples), less any of the held-out samples/*.tlo, which measure it;
- zstd's COVER trainer (libzstd's ZDICT_trainFromBuffer_cover, k=48, d=6, chosen among k 16 to 128 and d 6 or 8 by
  the samples) picks the content, 32 KB of it; the content is the tail of zstd's dictionary, after its header and
  entropy tables, from the first byte where every 8-byte window over the next 64 is training text;
- v1's dictionary (kit/core/codec.ts DICTIONARY) goes last, so TLO's commonest words sit nearest the document, which
  deflate names most cheaply, and the whole is cut to its last 16 KB (Paul, 2026-11-28: 16 KB);
- a UTF-8 character cut at the start is dropped, so the dictionary is a string in the source.

Measured on 2026-11-28 against v1's links (each the shortest packing, v2 with its checksum and base62): the 35
held-out samples 12.3% shorter in all (median 12.1%, none longer); the 204 templates 13.5% (median 15.0%).
"""
import glob
import json
import subprocess
from pathlib import Path

import zstandard

ROOT = Path(__file__).resolve().parent.parent
SIZE, TRAINED, K, D = 16384, 32768, 48, 6

samples = {Path(f).read_text(encoding="utf-8") for f in glob.glob(f"{ROOT}/samples/**/*.tlo", recursive=True)}
docs: list[str] = []
for f in sorted(glob.glob(f"{ROOT}/test/doc/corpus/**/*.json", recursive=True)):
    d = json.loads(Path(f).read_text(encoding="utf-8"))
    for x in d.get("docs", []) if isinstance(d, dict) else []:
        t = x.get("text") if isinstance(x, dict) else None
        if t and len(t) > 20 and t not in samples:
            docs.append(t)
raw = [t.encode("utf-8") for t in dict.fromkeys(docs)]
text = b"\n".join(raw)

v1 = subprocess.run(
    ["node", "-e", "import('./src/kit/core/codec.ts').then((m) => process.stdout.write(m.DICTIONARY))"],
    cwd=ROOT, check=True, capture_output=True,
).stdout

trained = zstandard.train_dictionary(TRAINED, raw, k=K, d=D).as_bytes()
start = next(i for i in range(len(trained)) if all(trained[j : j + 8] in text for j in range(i, min(i + 64, len(trained) - 8))))
words = (trained[start:] + v1)[-SIZE:].decode("utf-8", errors="ignore")

out = ROOT / "src/kit/core/dictionary-v2.ts"
out.write_text(
    "// The v2 link dictionary: FROZEN, every \"w\" link depends on these exact bytes (kit/core/codec.ts).\n"
    "// Made once by scripts/dictionary-v2.py, which says how; never edit it, and never make it again.\n"
    f"export const DICTIONARY_V2_TEXT = {json.dumps(words, ensure_ascii=False)};\n",
    encoding="utf-8",
)
subprocess.run(["npx", "prettier", "--write", str(out)], cwd=ROOT, check=True, capture_output=True)
print(f"{len(raw)} documents, {len(text)} bytes; dictionary {len(words.encode('utf-8'))} bytes -> {out.relative_to(ROOT)}")
