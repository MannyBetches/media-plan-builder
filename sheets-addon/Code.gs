// ============================================================================
// Parsing logic below is ported verbatim from index.html at the repo root.
// Keep it in sync with that file's HARD RULES (see README.md) — the template
// detection, sentence-casing, and dedup logic all encode real bugs that were
// already found and fixed. Don't "simplify" this without checking the README.
// ============================================================================

// Betches pink wordmark, stored in the same Drive folder as this Sheet.
const LOGO_FILE_ID = '1KWiGoy8FOI_CVL9V6dLYtTjw5jIPgpvf';

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

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tabName = makeUniqueSheetName(ss, meta.advertiser || 'Plan');
  const sheet = ss.insertSheet(tabName);

  const values = [];
  values.push(['Date', '', meta.date || '', '', 'Partner', '']);
  values.push(['', '', '', 'Partner Name:', meta.partnerName || '', '']);
  values.push(['Advertiser', '', '', 'Seller Name:', meta.sellerName || '', '']);
  values.push(['Agency Name:', meta.agency || '', '', 'Email Address:', meta.email || '', '']);
  values.push(['Advertiser:', meta.advertiser || '', '', '', '', '']);
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

  const totI = rows.reduce((s, r) => s + r.totalImp, 0);
  const totB = rows.reduce((s, r) => s + r.totalBud, 0);
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
  sheet.getRangeList(['A7', 'C7', 'E7', 'A9'])
    .setBackground('#F59ED8')
    .setFontColor('#4B1528')
    .setFontWeight('bold');

  // Date, Advertiser, and Partner section headers get merged across two
  // columns and underlined, matching the reference template's style. Date's
  // label and value are two separate boxes, same as Advertiser/Partner.
  sheet.getRange(1 + TOP_OFFSET, 1, 1, 2).merge().setFontLine('underline');
  sheet.getRange(1 + TOP_OFFSET, 3, 1, 2).merge().setFontLine('underline');
  sheet.getRange(3 + TOP_OFFSET, 1, 1, 2).merge().setFontLine('underline');
  sheet.getRange(1 + TOP_OFFSET, 5, 1, 2).merge().setFontLine('underline');

  sheet.getRange(firstDataRow + TOP_OFFSET, 1, rows.length, 1).setFontWeight('bold');
  sheet.getRange(firstDataRow + TOP_OFFSET, 2, rows.length, 1).setWrap(true);
  sheet.insertImage(DriveApp.getFileById(LOGO_FILE_ID).getBlob(), 1, 1);
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

function makeUniqueSheetName(ss, base) {
  let name = base, n = 1;
  while (ss.getSheetByName(name)) {
    n += 1;
    name = base + ' (' + n + ')';
  }
  return name;
}
