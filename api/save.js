import { sql, ensure, readAll, readBody } from './_db.js';

const CODE = () => process.env.EDIT_CODE || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Use POST' });
    return;
  }

  let b;
  try { b = await readBody(req); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); return; }

  if (!CODE()) {
    res.status(500).json({ ok: false, error: 'EDIT_CODE is not set on the server' });
    return;
  }
  if (String(b.code || '') !== CODE()) {
    res.status(403).json({ ok: false, error: 'That edit code is not correct' });
    return;
  }
  if (b.action === 'check') { res.status(200).json({ ok: true }); return; }

  const who   = String(b.who   || 'Unknown').slice(0, 60);
  const term  = String(b.term  || '');
  const id    = String(b.id    || '');
  const title = String(b.title || '').slice(0, 300);

  if (!term || !id) {
    res.status(400).json({ ok: false, error: 'Missing term or event' });
    return;
  }

  try {
    await ensure();

    if (b.action === 'addProof') {
      const url = String(b.url || '').slice(0, 2000);
      if (!/^https?:\/\//i.test(url)) {
        res.status(400).json({ ok: false, error: 'That is not a valid link' });
        return;
      }
      await sql`
        INSERT INTO proofs (term, event_id, title, label, url, added_by)
        VALUES (${term}, ${id}, ${title},
                ${String(b.label || 'Supporting document').slice(0, 120)}, ${url}, ${who})`;

    } else if (b.action === 'removeProof') {
      await sql`
        DELETE FROM proofs
        WHERE ctid IN (
          SELECT ctid FROM proofs
          WHERE term = ${term} AND event_id = ${id} AND url = ${String(b.url || '')}
          LIMIT 1)`;

    } else if (b.action === 'setStatus') {
      const status = b.status === 'completed' ? 'completed' : 'planned';
      await sql`
        INSERT INTO activity_status (term, event_id, title, status, updated_by, updated_at)
        VALUES (${term}, ${id}, ${title}, ${status}, ${who}, now())
        ON CONFLICT (term, event_id) DO UPDATE
          SET status = EXCLUDED.status, title = EXCLUDED.title,
              updated_by = EXCLUDED.updated_by, updated_at = now()`;

    } else if (b.action === 'setNotes') {
      const notes = String(b.notes || '').slice(0, 5000);
      await sql`
        INSERT INTO activity_status (term, event_id, title, notes, updated_by, updated_at)
        VALUES (${term}, ${id}, ${title}, ${notes}, ${who}, now())
        ON CONFLICT (term, event_id) DO UPDATE
          SET notes = EXCLUDED.notes, title = EXCLUDED.title,
              updated_by = EXCLUDED.updated_by, updated_at = now()`;

    } else if (b.action === 'editEvent' || b.action === 'addEvent') {
      const iso = v => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : null);
      const start = iso(b.start), end = iso(b.end) || iso(b.start);
      if (!start) {
        res.status(400).json({ ok: false, error: 'A valid start date is needed' });
        return;
      }
      if (end < start) {
        res.status(400).json({ ok: false, error: 'The end date is before the start date' });
        return;
      }
      if (!title) {
        res.status(400).json({ ok: false, error: 'A title is needed' });
        return;
      }
      const aud = Array.isArray(b.audience)
        ? b.audience.map(x => String(x).trim()).filter(Boolean).join('|')
        : String(b.audience || '').split(',').map(x => x.trim()).filter(Boolean).join('|');

      await sql`
        INSERT INTO event_edits (term, event_id, start_date, end_date, category, kind,
                                 title, audience, custom, updated_by, updated_at)
        VALUES (${term}, ${id}, ${start}, ${end},
                ${String(b.category || 'workshop')}, ${String(b.kind || '')},
                ${title}, ${aud}, ${b.action === 'addEvent'}, ${who}, now())
        ON CONFLICT (term, event_id) DO UPDATE
          SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date,
              category = EXCLUDED.category, kind = EXCLUDED.kind,
              title = EXCLUDED.title, audience = EXCLUDED.audience,
              cancelled = false,
              updated_by = EXCLUDED.updated_by, updated_at = now()`;

    } else if (b.action === 'cancelEvent' || b.action === 'restoreEvent') {
      const gone = b.action === 'cancelEvent';
      await sql`
        INSERT INTO event_edits (term, event_id, title, cancelled, updated_by, updated_at)
        VALUES (${term}, ${id}, ${title}, ${gone}, ${who}, now())
        ON CONFLICT (term, event_id) DO UPDATE
          SET cancelled = ${gone}, updated_by = ${who}, updated_at = now()`;

    } else {
      res.status(400).json({ ok: false, error: 'Unknown action' });
      return;
    }

    res.status(200).json(Object.assign({ ok: true }, await readAll()));

  } catch (err) {
    console.error('save:', err);
    res.status(500).json({ ok: false, error: String(err.message || err) });
  }
}
