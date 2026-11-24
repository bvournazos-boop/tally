// GET /api/holidays?c=ae|us|kr → public holidays as JSON, refreshed from Google's public holiday
// calendars for the UAE, the US and South Korea (updated when dates are announced or moved).
'use strict';
const { parseIcs, toHolidays } = require('./_holidays');

const SOURCES = {
  ae: 'https://calendar.google.com/calendar/ical/en.ae%23holiday%40group.v.calendar.google.com/public/basic.ics',
  us: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
  kr: 'https://calendar.google.com/calendar/ical/en.south_korea%23holiday%40group.v.calendar.google.com/public/basic.ics'
};

module.exports = async function handler(req, res) {
  const c = new URL(req.url, 'http://x').searchParams.get('c') || 'ae';
  const SOURCE = SOURCES[c];
  if (!SOURCE) { res.statusCode = 404; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ error: 'Unknown country' })); }
  try {
    const r = await fetch(SOURCE, { headers: { 'User-Agent': 'Tally/1.0' } });
    if (!r.ok) throw new Error('source ' + r.status);
    const holidays = toHolidays(parseIcs(await r.text()));
    if (!holidays.length) throw new Error('empty');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=86400'); // Vercel caches 12h
    res.statusCode = 200;
    res.end(JSON.stringify({ source: 'google', country: c, fetchedAt: new Date().toISOString(), holidays }));
  } catch (e) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Holiday source unavailable' }));
  }
};
