// GET /feed/<token>.ics  →  your dated Tally tasks as a calendar Outlook/Google can subscribe to.
'use strict';
const { buildIcs } = require('./_ics');

// Public project settings (same as in the app). Access is limited by the secret token.
const { supabaseFor } = require('./_cfg');
let SUPABASE_URL = '', SUPABASE_KEY = ''; // set per request (see api/_cfg.js)

module.exports = async function handler(req, res) {
  ({ url: SUPABASE_URL, key: SUPABASE_KEY } = supabaseFor(req));
  const url = new URL(req.url, 'http://x');
  // Link forms: /feed/TOKEN.ics (everything), /feed/TOKEN-work.ics, /feed/TOKEN-personal.ics
  const [token, suffix] = (url.searchParams.get('t') || '').replace(/\.ics$/, '').split('-');
  const pick = suffix || url.searchParams.get('scope');
  const scope = ['personal', 'work'].includes(pick) ? pick : 'all';
  if (!/^[A-Za-z0-9]{24,}$/.test(token || '')) { res.statusCode = 404; return res.end('Not found'); }
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/feed_items', {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: token })
    });
    if (!r.ok) { res.statusCode = 502; return res.end('Calendar source unavailable'); }
    const body = await r.json();
    const rows = Array.isArray(body) ? body : [];
    if (!rows.length || !rows.some(x => x.kind === 'meta')) { res.statusCode = 404; return res.end('This calendar link was reset or doesn\u2019t exist'); }
    const meta = rows.find(x => x.kind === 'meta').data || {};
    const name = scope === 'all' ? 'Tally tasks' : scope === 'work' ? 'Tally work tasks' : 'Tally personal tasks';
    const ics = buildIcs(rows, { tz: meta.tz || 'UTC', scope, name });
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="tally.ics"');
    res.setHeader('Cache-Control', 'no-store');
    res.statusCode = 200;
    res.end(ics);
  } catch (e) {
    res.statusCode = 500; res.end('Something went wrong');
  }
};
