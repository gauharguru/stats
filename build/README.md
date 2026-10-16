# Building the AHS Global Hospital pages

All inner pages are generated so they share one header, footer and booking dialog.

- `build/partials/header.html`, `footer.html`, `tail.html` hold the shared parts.
- `build/content.py` holds the text of every inner page in English and Hindi, grouped by type:
  treatment, service, about and empanelment (scheme).
- `build/build.py` renders each page to `<slug>.html` in the repo root and refreshes the
  shared parts of `index.html` (between the `<!--cms:...-->` markers).

To change a menu item, a footer link or page text, edit the partial or `content.py`, then run:

```
python3 build/build.py
```

Commit the regenerated `.html` files along with your edit.
