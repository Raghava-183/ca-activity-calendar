/**
 * Activity Calendar — shared store
 * Department of Computer Applications, School of Computing & Informatics
 *
 * Paste this into Extensions → Apps Script inside your Google Sheet,
 * change EDIT_CODE below, then deploy it as a web app.
 * Full steps are in SETUP-google-sheet.md
 */

// ── Change this to something only your organisers know ──────────────
const EDIT_CODE = 'change-this-code';

const PROOF_HEAD  = ['Term', 'Event ID', 'Activity', 'Document', 'Link', 'Added by', 'Added on'];
const STATUS_HEAD = ['Term', 'Event ID', 'Activity', 'Status', 'Notes', 'Updated by', 'Updated on'];

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function tab_(name, head) {
  let sh = ss_().getSheetByName(name);
  if (!sh) {
    sh = ss_().insertSheet(name);
    sh.appendRow(head);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, head.length).setFontWeight('bold');
    sh.setColumnWidth(3, 320);
    sh.setColumnWidth(5, 360);
  }
  return sh;
}

const proofs_ = () => tab_('Proofs', PROOF_HEAD);
const status_ = () => tab_('Status', STATUS_HEAD);

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
                       .setMimeType(ContentService.MimeType.JSON);
}

function when_(v) {
  if (!v) return '';
  try { return Utilities.formatDate(new Date(v), Session.getScriptTimeZone(), 'd MMM yyyy'); }
  catch (e) { return String(v); }
}

/** Everything the site needs, keyed by event id. */
function readAll_() {
  const records = {};
  const rec = id => records[id] || (records[id] = { proofs: [], notes: '', status: 'planned' });

  proofs_().getDataRange().getValues().slice(1).forEach(r => {
    if (!r[1]) return;
    rec(String(r[1])).proofs.push({
      label: String(r[3] || 'Supporting document'),
      url:   String(r[4] || ''),
      added: when_(r[6]),
      by:    String(r[5] || '')
    });
  });

  status_().getDataRange().getValues().slice(1).forEach(r => {
    if (!r[1]) return;
    const x = rec(String(r[1]));
    x.status = String(r[3] || 'planned').toLowerCase();
    x.notes  = String(r[4] || '');
  });

  return { ok: true, records: records };
}

function doGet() {
  return out_(readAll_());
}

function doPost(e) {
  let b;
  try { b = JSON.parse(e.postData.contents); }
  catch (err) { return out_({ ok: false, error: 'Could not read the request' }); }

  if (b.action === 'check') {
    return out_(b.code === EDIT_CODE
      ? { ok: true }
      : { ok: false, error: 'That edit code is not correct' });
  }
  if (b.code !== EDIT_CODE) {
    return out_({ ok: false, error: 'That edit code is not correct' });
  }

  const lock = LockService.getScriptLock();
  try { lock.waitLock(20000); }
  catch (err) { return out_({ ok: false, error: 'The sheet is busy, try again' }); }

  try {
    const who   = String(b.who || 'Unknown').slice(0, 60);
    const now   = new Date();
    const id    = String(b.id || '');
    const term  = String(b.term || '');
    const title = String(b.title || '');

    if (b.action === 'addProof') {
      proofs_().appendRow([term, id, title, String(b.label || 'Supporting document'),
                           String(b.url || ''), who, now]);

    } else if (b.action === 'removeProof') {
      const sh = proofs_(), v = sh.getDataRange().getValues();
      for (let i = v.length - 1; i >= 1; i--) {
        if (String(v[i][1]) === id && String(v[i][4]) === String(b.url)) { sh.deleteRow(i + 1); break; }
      }

    } else if (b.action === 'setStatus' || b.action === 'setNotes') {
      const sh = status_(), v = sh.getDataRange().getValues();
      let row = -1;
      for (let i = 1; i < v.length; i++) { if (String(v[i][1]) === id) { row = i + 1; break; } }
      if (row < 0) {
        sh.appendRow([term, id, title, String(b.status || 'planned'), String(b.notes || ''), who, now]);
      } else {
        if (b.action === 'setStatus') sh.getRange(row, 4).setValue(String(b.status || 'planned'));
        else                          sh.getRange(row, 5).setValue(String(b.notes || ''));
        sh.getRange(row, 6).setValue(who);
        sh.getRange(row, 7).setValue(now);
      }

    } else {
      return out_({ ok: false, error: 'Unknown action' });
    }

    return out_(readAll_());

  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Run this ONCE from the Apps Script editor to load the six proof links
 * that came with the 2026-27 workbook. Running it twice would duplicate them.
 */
function seedWorkbookProofs() {
  const T = '2026-27-1';
  const rows = [
    [T, 'e002', 'Deep Learning & Agentic Tools', 'Event report',
     'https://docs.google.com/document/d/17W5_oZ4781eXpi_PPi0aS4sFRcvvZQCo/edit?usp=drive_link&ouid=114858272988243998364&rtpof=true&sd=true'],
    [T, 'e004', 'Training program on Agentic Tools for Non-Teaching Staff', 'Event report',
     'https://docs.google.com/document/d/135F1Rl5q71f96NhXspKaGYfCCwmtnwML/edit?usp=sharing&ouid=114858272988243998364&rtpof=true&sd=true'],
    [T, 'e005', 'The Digital Balance: Are You Controlling Technology or Being Controlled?', 'Event report',
     'https://docs.google.com/document/d/1qe-2a2wrVFAue3IfZvQ_s8f29dH7bWjh/edit?usp=sharing&ouid=114858272988243998364&rtpof=true&sd=true'],
    [T, 'e007', '3-Day Hands-on Workshop on Google Cloud Infrastructure, Data Analytics & AI — Cloud Sphere 360', 'Event report',
     'https://drive.google.com/file/d/1SNQMkZr_BJRq0Qud-B8VZTHy2bgz6ZBU/view?usp=sharing'],
    [T, 'e009', 'Agentic Day Events', 'Event report',
     'https://drive.google.com/file/d/1TzJdHfCuBAPSHqK4TavlZ-C3YUrFXvI3/view?usp=drive_link'],
    [T, 'e010', 'AI Talk', 'Event report',
     'https://docs.google.com/document/d/1tn4o_qippr1Omq1TPyEo71H7z0_shYE9/edit?usp=drive_link&ouid=114858272988243998364&rtpof=true&sd=true']
  ];

  const ps = proofs_(), st = status_(), now = new Date();
  const existing = ps.getDataRange().getValues().slice(1).map(r => String(r[4]));

  rows.forEach(r => {
    if (existing.indexOf(r[4]) === -1) {
      ps.appendRow([r[0], r[1], r[2], r[3], r[4], 'Department workbook', now]);
    }
  });

  const done = st.getDataRange().getValues().slice(1).map(r => String(r[1]));
  rows.forEach(r => {
    if (done.indexOf(r[1]) === -1) {
      st.appendRow([r[0], r[1], r[2], 'completed', '', 'Department workbook', now]);
    }
  });

  SpreadsheetApp.getUi().alert('Seeded ' + rows.length + ' proof links from the 2026-27 workbook.');
}
