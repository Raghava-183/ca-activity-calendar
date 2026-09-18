import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is not set. Connect the Neon database in Vercel.');
}

export const sql = neon(process.env.DATABASE_URL);

/** The six proof documents that came with the 2026-27 workbook. */
const WORKBOOK_PROOFS = [
  ['2026-27-1', 'e002', 'Deep Learning & Agentic Tools',
   'https://docs.google.com/document/d/17W5_oZ4781eXpi_PPi0aS4sFRcvvZQCo/edit?usp=drive_link&ouid=114858272988243998364&rtpof=true&sd=true'],
  ['2026-27-1', 'e004', 'Training program on Agentic Tools for Non-Teaching Staff',
   'https://docs.google.com/document/d/135F1Rl5q71f96NhXspKaGYfCCwmtnwML/edit?usp=sharing&ouid=114858272988243998364&rtpof=true&sd=true'],
  ['2026-27-1', 'e005', 'The Digital Balance: Are You Controlling Technology or Being Controlled?',
   'https://docs.google.com/document/d/1qe-2a2wrVFAue3IfZvQ_s8f29dH7bWjh/edit?usp=sharing&ouid=114858272988243998364&rtpof=true&sd=true'],
  ['2026-27-1', 'e007', '3-Day Hands-on Workshop on Google Cloud Infrastructure, Data Analytics & AI — Cloud Sphere 360',
   'https://drive.google.com/file/d/1SNQMkZr_BJRq0Qud-B8VZTHy2bgz6ZBU/view?usp=sharing'],
  ['2026-27-1', 'e009', 'Agentic Day Events',
   'https://drive.google.com/file/d/1TzJdHfCuBAPSHqK4TavlZ-C3YUrFXvI3/view?usp=drive_link'],
  ['2026-27-1', 'e010', 'AI Talk',
   'https://docs.google.com/document/d/1tn4o_qippr1Omq1TPyEo71H7z0_shYE9/edit?usp=drive_link&ouid=114858272988243998364&rtpof=true&sd=true']
];

let ready = false;

/** Creates the tables on first request, and seeds the workbook proofs once. */
export async function ensure() {
  if (ready) return;

  await sql`
    CREATE TABLE IF NOT EXISTS proofs (
      id        BIGSERIAL PRIMARY KEY,
      term      TEXT NOT NULL,
      event_id  TEXT NOT NULL,
      title     TEXT DEFAULT '',
      label     TEXT DEFAULT 'Supporting document',
      url       TEXT NOT NULL,
      added_by  TEXT DEFAULT '',
      added_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS activity_status (
      term       TEXT NOT NULL,
      event_id   TEXT NOT NULL,
      title      TEXT DEFAULT '',
      status     TEXT NOT NULL DEFAULT 'planned',
      notes      TEXT NOT NULL DEFAULT '',
      updated_by TEXT DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (term, event_id)
    )`;

  await sql`CREATE INDEX IF NOT EXISTS proofs_event ON proofs (term, event_id)`;

  // Changes organisers make to the calendar itself: rescheduled dates,
  // corrected titles, cancelled activities, and activities added later.
  await sql`
    CREATE TABLE IF NOT EXISTS event_edits (
      term       TEXT NOT NULL,
      event_id   TEXT NOT NULL,
      start_date DATE,
      end_date   DATE,
      category   TEXT,
      kind       TEXT,
      title      TEXT,
      audience   TEXT DEFAULT '',
      cancelled  BOOLEAN NOT NULL DEFAULT false,
      custom     BOOLEAN NOT NULL DEFAULT false,
      updated_by TEXT DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (term, event_id)
    )`;

  const [{ count }] = await sql`SELECT count(*)::int AS count FROM proofs`;
  if (count === 0) {
    for (const [term, id, title, url] of WORKBOOK_PROOFS) {
      await sql`
        INSERT INTO proofs (term, event_id, title, label, url, added_by)
        VALUES (${term}, ${id}, ${title}, 'Event report', ${url}, 'Department workbook')`;
      await sql`
        INSERT INTO activity_status (term, event_id, title, status, updated_by)
        VALUES (${term}, ${id}, ${title}, 'completed', 'Department workbook')
        ON CONFLICT (term, event_id) DO NOTHING`;
    }
  }

  ready = true;
}

const fmt = d => new Date(d).toLocaleDateString('en-GB',
  { day: 'numeric', month: 'short', year: 'numeric' });

/** Everything the page needs: proof/status records, plus calendar edits. */
export async function readAll() {
  const rows = await sql`
    SELECT term, event_id, label, url, added_by, added_at
    FROM proofs ORDER BY added_at`;
  const st = await sql`
    SELECT term, event_id, status, notes FROM activity_status`;
  const ed = await sql`
    SELECT term, event_id, start_date, end_date, category, kind, title,
           audience, cancelled, custom, updated_by
    FROM event_edits`;

  const records = {};
  const rec = k => (records[k] ||= { proofs: [], notes: '', status: 'planned' });

  for (const r of rows) {
    rec(`${r.term}/${r.event_id}`).proofs.push({
      label: r.label || 'Supporting document',
      url: r.url,
      added: fmt(r.added_at),
      by: r.added_by || ''
    });
  }
  for (const r of st) {
    const x = rec(`${r.term}/${r.event_id}`);
    x.status = r.status || 'planned';
    x.notes = r.notes || '';
  }
  const edits = {};
  const day = d => (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 10);
  for (const r of ed) {
    const e = { cancelled: r.cancelled, custom: r.custom, by: r.updated_by || '' };
    if (r.start_date) e.start = day(r.start_date);
    if (r.end_date)   e.end   = day(r.end_date);
    if (r.category)   e.category = r.category;
    if (r.kind)       e.kind = r.kind;
    if (r.title)      e.title = r.title;
    if (r.audience !== null && r.audience !== undefined) {
      e.audience = r.audience ? r.audience.split('|').filter(Boolean) : [];
    }
    edits[`${r.term}/${r.event_id}`] = e;
  }

  return { records, edits };
}

export function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => { raw += c; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error('Could not read the request')); }
    });
    req.on('error', reject);
  });
}
