# Media Plan Importer — Google Sheets add-on

An Apps Script project, bound to one specific Google Sheet, that imports a
Boostr export directly into a new tab — no copy/paste through the standalone
web tool required.

This is a separate, independent tool from the root [index.html](../index.html)
site. The website keeps working exactly as-is; this is an alternate front-end
for the same parsing logic.

**Bound sheet:** https://docs.google.com/spreadsheets/d/15_AOIjtwidQdKuUquz7xe5zweD5f8bHSgXShcJkSATQ/edit

## How it works

1. Open the bound sheet above.
2. A **Media Plan Importer** menu appears in the menu bar (next to Help). If
   it's not there yet, reload the page — the menu is added by an `onOpen()`
   trigger that only runs once the sheet is opened through the normal Sheets
   UI.
3. Click **Media Plan Importer > Import Boostr export…**.
4. Paste the export, click **Parse export**, uncheck any groups you don't
   want, then click **Generate plan**.
5. A new tab is created (named after the advertiser) with the same output
   shape as the website's "Copy for Sheets" button — header meta block, one
   row per package, then a Total row — except Impressions/Total are written
   as real numbers with cell formatting, not formatted text, so they're
   usable in downstream formulas.

The first time you run it, Google will show a one-time "Authorization
required" prompt — that's normal for any Apps Script project acting on its
own container, not something specific to this tool.

## Files

- `Code.gs` — server-side logic. `parseExport`, `toSentenceCase`,
  `consolidateUnits`, `splitLine`, and `parseNum` are ported **verbatim**
  from the root `index.html` — see the root [README.md](../README.md) for
  the hard rules this logic encodes. Keep both copies in sync; if you fix a
  bug in one, port the fix to the other.
- `Dialog.html` — the paste → select groups → generate UI shown in a modal
  dialog. Plain JS, no React (Apps Script's `HtmlService` dialog doesn't need
  the extra dependency).
- `appsscript.json` — the project manifest (timezone, runtime).
- `.clasp.json` — points at the bound script's ID. Not a secret, just an
  identifier.

## Making changes

This project is managed with [clasp](https://github.com/google/clasp), Google's
official Apps Script CLI, so changes can be made locally and pushed like any
other code.

```sh
cd sheets-addon
npm install          # installs clasp locally
npm run login        # one-time Google OAuth login (opens a browser)
# edit Code.gs / Dialog.html
npm run push         # pushes local files to the live Apps Script project
npm run open         # opens the project in the Apps Script web editor
```

If `clasp login` fails with a network error like `Premature close` while
exchanging the OAuth token, it's a known incompatibility between clasp and
very new Node versions (seen on Node 24) — install and use Node 20 instead
for clasp commands (`brew install node@20`, then prefix commands with
`PATH="$(brew --prefix node@20)/bin:$PATH"`).
