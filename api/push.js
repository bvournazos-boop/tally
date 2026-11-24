// Reminders when Tally is closed.
//   GET  /api/push?key=1   → the public key devices need to sign up for notifications
//   POST /api/push         → Supabase calls this every minute; sends any reminders due now
'use strict';
const webpush = require('web-push');
const { dueNow } = require('./_reminders');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tvygsmhbrjsjgnnvdgns.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Ni3DpOM242PEEpRIa-Ss9w_tMCjInmR';
const PUB = process.env.VAPID_PUBLIC_KEY || '';
const PRIV = process.env.VAPID_PRIVATE_KEY || '';
const SECRET = process.env.PUSH_SECRET || '';

async function rpc(name, args) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + name, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  const text = await r.text();
  if (!r.ok) throw new Error(name + ' failed (' + r.status + '): ' + text.slice(0, 200));
  return text ? JSON.parse(text) : null;
}

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, max-age=300');
    return send(res, 200, { key: PUB || null });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST' });
  if (!PUB || !PRIV || SECRET.length < 32) return send(res, 503, { error: 'Push keys are not set up in Vercel yet' });
  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (auth !== SECRET) return send(res, 401, { error: 'Not allowed' });

  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://tally-ntqo.vercel.app', PUB, PRIV);
    const work = await rpc('push_work', { p_secret: SECRET });
    const due = dueNow(work, Date.now());
    const sent = [], gone = new Set(), failed = [];
    await Promise.all(due.map(async d => {
      if (gone.has(d.endpoint)) return;
      try {
        await webpush.sendNotification(d.sub, JSON.stringify(d.payload), { TTL: 3600, urgency: 'high', topic: String(d.taskId).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) || undefined });
        sent.push([d.endpoint, d.taskId, d.at]);
      } catch (e) {
        if (e && (e.statusCode === 404 || e.statusCode === 410)) gone.add(d.endpoint); // device unsubscribed or app removed
        else failed.push(String((e && (e.statusCode || e.message)) || e)); // tried again next minute while still in the window
      }
    }));
    if (sent.length || gone.size) await rpc('push_done', { p_secret: SECRET, p_sent: sent, p_gone: [...gone] });
    return send(res, 200, { devices: (work.subs || []).length, due: due.length, sent: sent.length, removed: gone.size, failed });
  } catch (e) {
    return send(res, 500, { error: String(e.message || e) });
  }
};
