# tinylittleoffice (Python)

Make and read [TinyLittleOffice](https://tinylittleoffice.com/) documents: links that carry the whole document after the `#`, where no server sees it. Byte for byte the same links the site and the JavaScript package (`@tinylittleoffice/doc`) make. No dependencies.

```sh
pip install "git+https://github.com/ftrain/tinyoffice#subdirectory=packages/python"
```

```python
from tinylittleoffice import link, link_from_markdown, parse

# A document in the app's own plain-text format (see https://tinylittleoffice.com/llms.txt).
url = link("todo", "- Book flights\nx Renew passport", title="Trip", by="planner-agent")

# Read any link back: app, title, who made it, when, and the body.
p = parse(url)
p.app, p.env.title, p.env.by, p.env.body

# Markdown or CSV: a plain link the page shapes into the app's format when it opens.
link_from_markdown("sheet", "Item,Cost\nRent,1200\nFood,600", title="Budget")
```

Shaping Markdown offline, evaluating sheets and models, diffing, signing and sealing are in the JavaScript API the site serves at https://tinylittleoffice.com/api.js and its `tinyoffice` command line; this port covers the codec, which is what an agent needs to pass documents about.

MIT.
