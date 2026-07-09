// ============================================================================
// Parsing logic below is ported verbatim from index.html at the repo root.
// Keep it in sync with that file's HARD RULES (see README.md) — the template
// detection, sentence-casing, and dedup logic all encode real bugs that were
// already found and fixed. Don't "simplify" this without checking the README.
// ============================================================================

// Betches pink wordmark (260x53 true-color PNG), embedded directly rather
// than fetched from Drive at runtime -- DriveApp.getFileById is unreliable
// for files whose parent is a Shared Drive root, which this Sheet's Drive
// folder is, and caused "image could not be inserted" errors. Also switched
// from an indexed/palette PNG to true-color -- Sheets rejected the palette
// version with the same error. Split into chunks because pasting the full
// string in one piece silently truncated it.
const LOGO_B64_0 = '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';
const LOGO_B64_1 = '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';
const LOGO_B64_2 = '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';
const LOGO_B64_3 = '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';
const LOGO_BASE64 = LOGO_B64_0 + LOGO_B64_1 + LOGO_B64_2 + LOGO_B64_3;

function splitLine(line, delim) {
  const row = []; let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; continue; }
      inQ = !inQ; continue;
    }
    if (c === delim && !inQ) { row.push(cur); cur = ''; continue; }
    cur += c;
  }
  row.push(cur);
  return row.map(s => s.trim());
}

function parseNum(s) {
  if (!s) return null;
  const n = parseFloat(s.replace(/[",$]/g, ''));
  return isNaN(n) ? null : n;
}

// Words/abbreviations that must stay fully uppercase when we sentence-case a
// shouty field. Boostr salespeople sometimes type whole rows in all-caps, and
// a blind sentence-case pass would otherwise turn "IG STORY" into "Ig story".
// Add to this list if a real export surfaces another acronym getting mangled.
const PRESERVE_ACRONYMS = [
  'IG', 'FB', 'TT', 'YT', 'CTV', 'OLV', 'OOH', 'VOD', 'TV', 'URL',
  'US', 'UK', 'ROI', 'CPM', 'CPC', 'CPA', 'KPI', 'UGC', 'VIP', 'PR', 'API',
  'Q1', 'Q2', 'Q3', 'Q4',
];
const PRESERVE_RE = new RegExp('\\b(' + PRESERVE_ACRONYMS.join('|') + ')\\b', 'gi');

// Only rewrite fields that are actually shouty (fully uppercase). Text that's
// already reasonably cased (e.g. "Custom In-Feed Meme") is left untouched so
// we don't flatten intentional capitalization.
function isShouty(s) {
  return /[A-Z]/.test(s) && s === s.toUpperCase() && s !== s.toLowerCase();
}

function toSentenceCase(s) {
  if (!s || !isShouty(s)) return s;
  let out = s.toLowerCase();
  out = out.replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, m => m.toUpperCase());
  out = out.replace(PRESERVE_RE, m => m.toUpperCase());
  return out;
}

function parseExport(text) {
  const lines = text.split(/\r?\n/);
  const delim = text.includes('\t') ? '\t' : ',';
  const rows = lines.map(l => splitLine(l, delim));
  const meta = { date: '', agency: '', advertiser: '', partnerName: '', sellerName: '', email: '' };

  let hdrRow = -1, hdrCol = -1;
  for (let i = 0; i < rows.length; i++) {
    const j = rows[i].findIndex(c => c === 'Campaign Package');
    if (j >= 0) { hdrRow = i; hdrCol = j; break; }
  }
  if (hdrRow < 0) return { meta, groups: [], debug: 'Header row "Campaign Package" not found' };
  const descCol = hdrCol + 1, startCol = hdrCol + 2, endCol = hdrCol + 3, impCol = hdrCol + 4, totCol = hdrCol + 5;

  for (let i = 0; i < hdrRow; i++) {
    const r = rows[i];
    for (let j = 0; j < r.length; j++) {
      const v = r[j], next = (r[j + 1] || '').trim();
      if (v === 'Date' && next) meta.date = next;
      if (/^Agency Name:?\s*$/.test(v) && next) meta.agency = next;
      if (/^Advertiser:?\s*$/.test(v) && next) meta.advertiser = next;
      if (/^Partner Name:?\s*$/.test(v) && next) meta.partnerName = next;
      if (/^Seller Name:?\s*$/.test(v) && next) meta.sellerName = next;
      if (/^Email Address:?\s*$/.test(v) && next) meta.email = next;
    }
  }

  const entries = [];
  for (let i = hdrRow + 1; i < rows.length; i++) {
    const r = rows[i];
    const get = j => (r[j] || '').trim();
    let name = '';
    for (let j = 0; j <= hdrCol; j++) { if (get(j)) { name = get(j); break; } }
    if (name === 'Total') break;
    if (!name && !get(descCol)) continue;
    const start = get(startCol), end = get(endCol);
    const imp = parseNum(get(impCol)), bud = parseNum(get(totCol));
    if (name && !start && imp === null) {
      entries.push({ kind: 'GROUP', name: toSentenceCase(name) });
    } else if (name && start) {
      entries.push({ kind: 'ITEM', name, desc: toSentenceCase(get(descCol) || name), start, end, imp: imp || 0, bud: bud || 0 });
    }
  }

  // Group into top-level Boostr groups. Within each group, detect nested templates:
  // a row only counts as a template if BOTH (a) its own description bundles multiple
  // sub-items (contains "+", like "Always On Meme Package: (1) X + (1) Y + Targeted
  // Amplification"), AND (b) the following 2+ rows sum exactly to its own numbers.
  // Requiring the "+" bundle signal prevents false positives where unrelated standalone
  // items coincidentally add up to the same total as another standalone item (this was
  // a real bug: "Hero video" $200k was wrongly absorbed as a template because two other
  // unrelated videos happened to sum to $200k too, even though neither is a sub-part of it).
  const MIN_CHILDREN = 2;
  const looksLikeBundle = desc => desc.includes('+');
  const groups = [];
  let cur = null, i = 0;
  while (i < entries.length) {
    const e = entries[i];
    if (e.kind === 'GROUP') {
      cur = { name: e.name, units: [] };
      groups.push(cur);
      i++;
      continue;
    }
    let matchedEnd = -1;
    if (looksLikeBundle(e.desc)) {
      let j = i + 1, sumImp = 0, sumBud = 0;
      while (j < entries.length && entries[j].kind === 'ITEM') {
        sumImp += entries[j].imp; sumBud += entries[j].bud;
        const nchild = j - i;
        if (nchild >= MIN_CHILDREN && Math.abs(sumImp - e.imp) < 0.5 && Math.abs(sumBud - e.bud) < 0.5) {
          matchedEnd = j; break;
        }
        if (sumBud > e.bud + 0.5 && sumImp > e.imp + 0.5) break;
        j++;
      }
    }
    if (matchedEnd >= 0) {
      cur.units.push({ type: 'TEMPLATE', desc: e.desc, imp: e.imp, bud: e.bud, start: e.start, end: e.end });
      i = matchedEnd + 1;
    } else {
      cur.units.push({ type: 'STANDALONE', desc: e.desc, imp: e.imp, bud: e.bud, start: e.start, end: e.end });
      i++;
    }
  }
  return { meta, groups };
}

function consolidateUnits(units) {
  const counts = {}; const order = [];
  for (const u of units) {
    const clean = u.desc.replace(/\s*Copy\s*\d+\s*$/i, '').trim();
    const key = u.type + '|' + clean;
    if (!counts[key]) { counts[key] = { type: u.type, desc: clean, n: 0 }; order.push(key); }
    counts[key].n += 1;
  }
  return order.map(k => counts[k]);
}

// ============================================================================
// Sheet-specific wiring — menu, dialog, and writing the result into a tab.
// ============================================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Media Plan Importer')
    .addItem('Import Boostr export…', 'showImportDialog')
    .addToUi();
}

function showImportDialog() {
  const html = HtmlService.createHtmlOutputFromFile('Dialog')
    .setWidth(640)
    .setHeight(560);
  SpreadsheetApp.getUi().showModalDialog(html, 'Import Boostr Export');
}

// Called from Dialog.html step 1. Throwing here surfaces as withFailureHandler
// on the client, same as the web tool's inline parse error.
function parseForReview(text) {
  const result = parseExport(text);
  if (!result.groups.length) {
    throw new Error(result.debug || 'No groups found. Paste the whole export including the Campaign Package header row.');
  }
  return result;
}

// Called from Dialog.html step 2 with the same `meta`/`groups` parseForReview
// returned, plus the list of group names the user left checked. Builds one
// row per selected group (rule #5: standalone + template units summed, never
// double-counting absorbed template children) and writes it into a new tab.
function generatePlan(meta, groups, selectedNames) {
  const selected = {};
  selectedNames.forEach(n => { selected[n] = true; });

  const rows = groups.filter(g => selected[g.name]).map(g => {
    const totalImp = g.units.reduce((s, u) => s + u.imp, 0);
    const totalBud = g.units.reduce((s, u) => s + u.bud, 0);
    const starts = g.units.map(u => u.start).filter(Boolean);
    const ends = g.units.map(u => u.end).filter(Boolean);
    const consolidated = consolidateUnits(g.units);
    const descLines = consolidated.map(c => (c.n > 1 ? c.n + 'x ' : '1x ') + c.desc);
    return {
      name: g.name, description: descLines.join('\n\n'),
      totalImp, totalBud, start: starts[0] || '', end: ends[ends.length - 1] || '',
    };
  });

  if (!rows.length) throw new Error('No groups selected — check at least one group before generating.');

  const totI = rows.reduce((s, r) => s + r.totalImp, 0);
  const totB = rows.reduce((s, r) => s + r.totalBud, 0);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tabName = makeUniqueSheetName(ss, suggestTabName(meta, totB));
  const sheet = ss.insertSheet(tabName);

  const values = [];
  values.push(['Date', '', meta.date || '', 'Partner', '', '']);
  values.push(['', '', '', 'Partner Name:', meta.partnerName || '', '']);
  values.push(['Advertiser', '', '', 'Seller Name:', meta.sellerName || '', '']);
  values.push(['Agency Name:', meta.agency || '', '', 'Email Address:', meta.email || '', '']);
  values.push(['Advertiser:', meta.advertiser || '', '', '', '', '']);
  // Boostr doesn't provide these — blank on every import, for the team to
  // fill in by hand, matching the fields in the reference template.
  values.push(['Billing Contact:', '', '', '', '', '']);
  values.push(['Phone:', '', '', '', '', '']);
  values.push(['State:', '', '', '', '', '']);
  values.push(['City:', '', '', '', '', '']);
  values.push(['Zip:', '', '', '', '', '']);
  values.push(['', '', '', '', '', '']);
  values.push(['', '', '', '', '', '']);
  values.push(['Campaign Package', 'Description', 'Start Date', 'End Date', 'Impressions', 'Total']);
  const headerRowIdx = values.length;

  // A group whose only line items are flat-fee/sponsorship (no impression
  // count) shows "NA" rather than 0, matching the web tool's copy-for-sheets
  // output — mixing "NA" text with numeric impressions in the same column is
  // intentional here, not an oversight.
  rows.forEach(r => {
    values.push([r.name, r.description, r.start, r.end, r.totalImp === 0 ? 'NA' : r.totalImp, r.totalBud]);
  });
  const firstDataRow = headerRowIdx + 1;
  const lastDataRow = values.length;

  values.push(['Total', '', '', '', totI, totB]);
  const totalRowIdx = values.length;

  // Rows 1-6 are left blank for the Betches logo; everything else shifts
  // down by this amount.
  const TOP_OFFSET = 6;

  sheet.getRange(1 + TOP_OFFSET, 1, values.length, 6).setValues(values);

  sheet.getRange(firstDataRow + TOP_OFFSET, 5, lastDataRow - firstDataRow + 1, 1).setNumberFormat('#,##0');
  sheet.getRange(totalRowIdx + TOP_OFFSET, 5, 1, 1).setNumberFormat('#,##0');
  sheet.getRange(firstDataRow + TOP_OFFSET, 6, lastDataRow - firstDataRow + 1, 1).setNumberFormat('$#,##0.00');
  sheet.getRange(totalRowIdx + TOP_OFFSET, 6, 1, 1).setNumberFormat('$#,##0.00');

  sheet.getRange(headerRowIdx + TOP_OFFSET, 1, 1, 6).setFontWeight('bold').setBackground('#F59ED8').setFontColor('#4B1528');
  sheet.getRange(totalRowIdx + TOP_OFFSET, 1, 1, 6).setFontWeight('bold').setBackground('#f7f7f7');

  // Only the three section headers (Date, Advertiser, Partner) get the pink
  // background — individual field labels (Agency Name:, Partner Name:, etc.)
  // stay plain, matching the reference template. (+TOP_OFFSET rows.)
  sheet.getRangeList(['A7', 'C7', 'D7', 'A9'])
    .setBackground('#F59ED8')
    .setFontColor('#4B1528')
    .setFontWeight('bold');

  // Date value and Partner get merged across two columns since C:D and D:E
  // aren't oversized. Date's label and Advertiser stay single-column instead
  // of merging into column B, which needs to stay wide for the package
  // table's Description column below — merging into it would balloon these
  // boxes to match that width, which is the bug this replaced.
  sheet.getRange(1 + TOP_OFFSET, 1, 1, 1).setFontLine('underline');
  sheet.getRange(1 + TOP_OFFSET, 3, 1, 2).merge().setFontLine('underline');
  sheet.getRange(3 + TOP_OFFSET, 1, 1, 1).setFontLine('underline');
  sheet.getRange(1 + TOP_OFFSET, 4, 1, 2).merge().setFontLine('underline');

  sheet.getRange(firstDataRow + TOP_OFFSET, 1, rows.length, 1).setFontWeight('bold');
  sheet.getRange(firstDataRow + TOP_OFFSET, 2, rows.length, 1).setWrap(true);
  // insertImage was throwing "The image could not be inserted" here — a known
  // Apps Script quirk where the call fails if issued before the sheet's
  // pending writes (all the setValues/merge/formatting above) have been
  // flushed to the backend. Flushing first resolves it; kept in a try/catch
  // as a safety net so a logo failure still can't block the whole import.
  try {
    SpreadsheetApp.flush();
    const logoBlob = Utilities.newBlob(Utilities.base64Decode(LOGO_BASE64), 'image/png', 'betches-logo.png');
    sheet.insertImage(logoBlob, 1, 1);
  } catch (e) {
    console.error('Logo insertion failed: ' + e.message);
  }
  sheet.setColumnWidth(2, 420);
  sheet.autoResizeColumns(1, 1);
  sheet.autoResizeColumns(3, 4);
  sheet.setFrozenRows(headerRowIdx + TOP_OFFSET);

  // Hide the default gridlines sheet-wide, then draw a visible border only
  // around the two blocks that actually have content — the info header and
  // the package table — so blank areas read as clean white space instead of
  // a spreadsheet grid.
  sheet.setHiddenGridlines(true);
  const BORDER_COLOR = '#d9d9d9';
  sheet.getRange(1 + TOP_OFFSET, 1, headerRowIdx - 3, 6)
    .setBorder(true, true, true, true, false, false, BORDER_COLOR, SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(headerRowIdx + TOP_OFFSET, 1, totalRowIdx - headerRowIdx + 1, 6)
    .setBorder(true, true, true, true, true, true, BORDER_COLOR, SpreadsheetApp.BorderStyle.SOLID);

  const tcLastRow = addTermsAndConditions(sheet, totalRowIdx + TOP_OFFSET, BORDER_COLOR);

  sheet.getRange(1 + TOP_OFFSET, 1, tcLastRow - TOP_OFFSET, 6).setVerticalAlignment('middle');

  ss.setActiveSheet(sheet);
  return { tabName, rowCount: rows.length, totalImp: totI, totalBud: totB };
}

// Standard legal boilerplate appended to every generated plan tab. Edit this
// list to change the wording — it's the same text on every import, not
// derived from the Boostr export.
const TERMS_AND_CONDITIONS = [
  '*Custom elements 100% non-cancellable upon signature of contract',
  '*All impressions and views are estimated only, not guaranteed and may include paid promotion on organic media (Age/Demo Only EX: F18-34)',
  '*All custom concepts pending final approval from Betches x Client creative ideas provided for inspiration only and are subject to change',
  '*Min spends apply: $75K min spend for content (Ex: Memes/IG Stories) on any vertical account',
  '*Min spends apply: $150K min spend for any content (Ex: Memes/IG Stories) on Betches Main account',
  '*Min spends apply: $250K min spend per custom video on any vertical',
  '*Payment: Net 30 Days upon receipt of the invoice from Betches Media - upfront production may be required',
];

// Writes a "Terms and Conditions" block a couple rows below the package
// table: a pink underlined header, then one full-width merged row per term
// with a white fill and border — same shape as the Betches template. Returns
// the last row number used, so the caller can extend formatting (e.g.
// vertical alignment) to cover this block too.
function addTermsAndConditions(sheet, afterRow, borderColor) {
  const GAP_ROWS = 2;
  const headerRow = afterRow + GAP_ROWS + 1;
  const allRows = ['Terms and Conditions', ...TERMS_AND_CONDITIONS];

  sheet.getRange(headerRow, 1, allRows.length, 1).setValues(allRows.map(t => [t]));
  for (let i = 0; i < allRows.length; i++) {
    sheet.getRange(headerRow + i, 1, 1, 6).merge();
  }

  sheet.getRange(headerRow, 1, 1, 6)
    .setFontWeight('bold')
    .setFontLine('underline')
    .setBackground('#F59ED8');
  sheet.getRange(headerRow + 1, 1, TERMS_AND_CONDITIONS.length, 6)
    .setBackground('#ffffff')
    .setWrap(true);
  sheet.getRange(headerRow, 1, allRows.length, 6)
    .setBorder(true, true, true, true, true, true, borderColor, SpreadsheetApp.BorderStyle.SOLID);

  return headerRow + allRows.length - 1;
}

// Builds a suggested tab name from the export's own data: advertiser, the
// selected groups' total budget, and the date. The budget is included
// specifically so that re-running the same advertiser's export at a
// different budget tier (a different subset of groups selected) produces a
// distinguishable tab name instead of colliding on advertiser name alone —
// makeUniqueSheetName's "(2)", "(3)" suffix is a fallback for genuine ties,
// not the primary way plans get told apart.
function suggestTabName(meta, totalBudget) {
  const parts = [];
  if (meta.advertiser) parts.push(meta.advertiser);
  if (totalBudget > 0) parts.push('$' + Math.round(totalBudget / 1000) + 'K');
  if (meta.date) parts.push(meta.date);
  const name = parts.length ? parts.join(' – ') : 'Plan';
  // Sheet tab names can't contain [ ] * ? : / \ — the date (e.g. "07/09/2026")
  // would otherwise break insertSheet on the slashes.
  return name.replace(/[[\]*?:/\\]/g, '-');
}

function makeUniqueSheetName(ss, base) {
  let name = base, n = 1;
  while (ss.getSheetByName(name)) {
    n += 1;
    name = base + ' (' + n + ')';
  }
  return name;
}
