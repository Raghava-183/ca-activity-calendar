import { ensure, readAll } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Use GET' });
    return;
  }
  try {
    await ensure();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(Object.assign({ ok: true }, await readAll()));
  } catch (err) {
    console.error('records:', err);
    res.status(500).json({ ok: false, error: String(err.message || err) });
  }
}
