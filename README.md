# Betches Media Plan Builder

A single-file, no-build, no-backend tool that turns a Boostr export into a
client-facing media plan you can paste into Google Sheets.

**Live tool:** https://MannyBetches.github.io/media-plan-builder/

There's also an in-progress [Google Sheets add-on](sheets-addon/) that imports
a Boostr export directly into a sheet tab, no copy/paste needed — a separate,
independent tool built on the same parsing logic. The website above is
unaffected by it and keeps working as the primary tool in the meantime.

## What it does

1. You paste a full Boostr export (copy the whole sheet, or export a CSV) into
   the textarea.
2. The tool finds the "Campaign Package" header row, parses every line item
   underneath it, and groups them by Boostr's top-level groups.
3. You pick which groups to include in the client plan.
4. It generates one row per group with combined Impressions and Total, plus a
   consolidated bullet-point description of what's inside that group.
5. "Copy for Sheets" copies a tab-separated block you can paste directly into
   a Google Sheet, formatted to match the standard Betches plan layout
   (Date / Agency / Advertiser / Partner header block, then one row per
   package, then a Total row).

Everything runs client-side in the browser. There is no backend and no data
ever leaves your machine — the only network requests are the two `<script>`
tags that load React from a CDN.

## How to use it

1. Open the [live tool](https://MannyBetches.github.io/media-plan-builder/).
2. In Boostr, select and copy the entire export (or open the exported CSV and
   select all).
3. Paste it into the textarea and click **Parse export**.
4. Review the detected groups, uncheck any you don't want in the client plan,
   and click **Generate plan**.
5. Click **Copy for Sheets**, then paste into the client-facing Google Sheet.

If parsing fails, the most common cause is that the pasted text doesn't
include the row containing the literal text `Campaign Package` — make sure
you copy the whole export, including the header row.

## Hard rules for the parsing logic — read before changing anything

The parsing and grouping logic in `index.html` encodes several real bugs that
were already found and fixed. If you (or an AI assistant) are asked to
"simplify" or "clean up" this logic, **don't**, without first flagging the
specific change being proposed. Each rule below exists because the naive
version was wrong in production.

1. **Groups vs. items.** Each Boostr export has top-level "groups" — rows
   where a name is present in the leftmost column but Start Date and
   Impressions are blank. Every row below a group, down to the next group or
   the `Total` row, belongs to that group.

2. **Template rows can double-count if mishandled.** Within a group, most
   rows are simple standalone line items. But some rows are "templates" — a
   single row whose own Impressions/Total already equal the *sum* of several
   rows listed right after it (Boostr pre-aggregates bundled products this
   way). Those following rows must NOT also be counted separately, or the
   group total gets inflated.

3. **Detecting a template requires BOTH signals — either alone is unsafe:**
   - (a) Its own description text contains `+` (real templates narrate
     themselves as multiple joined sub-items, e.g. *"Always On Meme Package:
     (1) Custom In-Feed Meme + (1) Story Share + Targeted Amplification"*).
   - (b) The following 2 or more rows sum exactly (within float rounding) to
     its own Impressions AND Total.

   Relying on the sum-match alone caused a real bug: two unrelated standalone
   products (e.g. two separate video assets) coincidentally summed to the
   same total as a third, unrelated product, which caused that third product
   to be wrongly treated as a "template" and the other two silently dropped
   from the grand total. Requiring the `+` text signal as well eliminates
   that false positive, because real templates always narrate their own
   bundle in the description — coincidental sum matches between unrelated
   single-line items never do.

4. **Minimum matched children is 2, not 1.** A single row whose value happens
   to equal the next row's value is almost always just two separate,
   coincidentally-identical line items (e.g. two identical $750 banner ads),
   not a parent/child relationship. Requiring 2+ matched children avoids that
   false positive too.

5. **Output shape.** The final output has ONE row per top-level group, with
   Impressions and Total being the sum of every item in that group —
   standalone items counted once each, template rows counted once each using
   their own already-correct number, and their absorbed children not counted
   again.

6. **Duplicate consolidation.** Boostr appends " Copy 1", " Copy 2", etc. to
   repeated identical products. These should be consolidated into a count
   (e.g. "4x Creator Posts Amplified via Dark Posts") rather than shown as 4
   separate bullet lines.

7. **Delimiter auto-detection.** Input parsing must accept both
   tab-separated (what you get pasting from Google Sheets) and
   comma-separated (a real `.csv` file) input — detected by checking whether
   the pasted text contains a tab character.

8. **Header row is found by content, not position.** The header row is
   located by searching for the literal text `Campaign Package` anywhere in
   the data, not by assuming a fixed row/column number — real exports have a
   variable number of blank leading rows and columns.

9. **No external API calls.** The tool must keep working with no internet
   connection except for the two CDN `<script>` tags that load React (those
   are fine — they're static JS libraries, not API calls). Don't add any
   fetch/XHR calls to a backend.

10. **Sentence-casing only touches shouty fields, and preserves acronyms.**
    Group names and line-item descriptions are run through `toSentenceCase()`,
    but only when a field is fully uppercase (`isShouty()`) — text that's
    already reasonably cased (e.g. "Custom In-Feed Meme") is left untouched so
    we don't flatten intentional capitalization. Before lowering a shouty
    field, known acronyms in `PRESERVE_ACRONYMS` (IG, CTV, OLV, TV, Q1–Q4,
    etc.) are matched case-insensitively and forced back to uppercase, so
    "IG STORY" becomes "IG story", not "Ig story". If a real export surfaces
    another acronym getting lowercased, add it to `PRESERVE_ACRONYMS` rather
    than disabling the whole feature.

## Reporting bugs or requesting changes

This tool is maintained by pasting real Boostr export data and describing
what's wrong or what you want changed — the same way the hard rules above
were originally found and fixed. When asking for a change, it helps to
include:

- **A real (or realistic, anonymized) export snippet** that reproduces the
  issue — at minimum the group name, the row(s) involved, and their
  Impressions/Total values.
- **What you expected** the output row(s) to look like, vs. **what you
  actually got**.
- Whether the issue is about *parsing* (wrong grouping/totals), *display*
  (something looks wrong in the table), or *copy output* (what lands in
  Google Sheets is malformed).

Avoid asking for "cleanup" or "simplification" of the parsing logic without
also confirming the specific hard rule above isn't being violated — several
of these rules look redundant or overly defensive in isolation, but each one
prevents a specific, previously-observed silent data error.
