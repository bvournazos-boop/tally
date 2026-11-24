// Turns a holiday iCalendar feed into date ranges: [{ start, end, name, expected }]. Pure function.
'use strict';

function unfold(text) { return text.replace(/\r?\n[ \t]/g, ''); }
function unesc(s) { return String(s || '').replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1').trim(); }
const iso = v => v.slice(0, 4) + '-' + v.slice(4, 6) + '-' + v.slice(6, 8);
function addDay(d, n) { const [y, m, dd] = d.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, dd + n)); return t.toISOString().slice(0, 10); }

function parseIcs(text) {
  const out = [];
  const blocks = unfold(text).split('BEGIN:VEVENT').slice(1);
  for (const b of blocks) {
    const body = b.split('END:VEVENT')[0];
    const get = k => { const m = body.match(new RegExp('^' + k + '(?:;[^:\\r\\n]*)?:(.*)$', 'mi')); return m ? m[1].trim() : ''; };
    const ds = get('DTSTART').replace(/[^0-9]/g, '').slice(0, 8);
    if (ds.length !== 8) continue;
    let de = get('DTEND').replace(/[^0-9]/g, '').slice(0, 8);
    const start = iso(ds);
    const end = de.length === 8 ? addDay(iso(de), -1) : start; // DTEND is exclusive for all-day events
    out.push({ start, end: end < start ? start : end, name: unesc(get('SUMMARY')), desc: unesc(get('DESCRIPTION')) });
  }
  return out;
}

// Keep public holidays (not "observances"), then merge consecutive days of the same holiday.
function toHolidays(events) {
  const anyTyped = events.some(e => /public holiday|observance/i.test(e.desc));
  let list = anyTyped ? events.filter(e => /public holiday/i.test(e.desc)) : events;
  const key = n => n.toLowerCase().replace(/\(.*?\)/g, '').replace(/\b(holiday|holidays|tentative|day\s*\d+|eve|break)\b/g, '').replace(/[^a-z]+/g, ' ').trim().split(' ').slice(0, 2).join(' ');
  list = list.map(e => ({ start: e.start, end: e.end, name: e.name.replace(/\s*\(tentative\)\s*/i, '').replace(/\s+holiday$/i, '').trim(), expected: /tentative/i.test(e.name), k: key(e.name) }))
    .sort((a, b) => a.start.localeCompare(b.start));
  const merged = [];
  for (const h of list) {
    const last = merged[merged.length - 1];
    if (last && last.k === h.k && h.start <= addDay(last.end, 1)) { if (h.end > last.end) last.end = h.end; last.expected = last.expected || h.expected; if (h.name.length < last.name.length) last.name = h.name; }
    else merged.push(Object.assign({}, h));
  }
  return merged.map(({ start, end, name, expected }) => ({ start, end, name, expected }));
}

module.exports = { parseIcs, toHolidays };
