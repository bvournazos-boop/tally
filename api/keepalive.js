// GET /api/keepalive — run once a day by Vercel (see "crons" in vercel.json).
// Free Supabase projects pause after a week without activity; this small daily query keeps
// sync awake even when no device opens Tally (long vacations). It reads nothing private:
// it asks the calendar-feed lookup for a token that doesn't exist.
'use strict';
const { supabaseFor } = require('./_cfg');
let SUPABASE_URL = '', SUPABASE_KEY = ''; // set per request (see api/_cfg.js)

module.exports = async function handler(req, res) {
  ({ url: SUPABASE_URL, key: SUPABASE_KEY } = supabaseFor(req));
  try {
    // The calendar-feed lookup is open to the public key; an unknown token simply returns nothing
    const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/feed_items', { method: 'POST', headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_token: 'keepalive-no-such-token' }) });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ ok: r.ok, status: r.status, at: new Date().toISOString() }));
  } catch (e) {
    res.statusCode = 502; res.end(JSON.stringify({ ok: false, error: String(e && e.message || e) }));
  }
};
