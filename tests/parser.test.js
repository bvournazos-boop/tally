// Regression tests for quick add. Run: node tests/parser.test.js
const P = require('../src/parser.js');
const lists = [{ id: 'b', name: 'Bills' }, { id: 'h', name: 'Home' }, { id: 't', name: 'Trip' }];
const now = new Date(2026, 10, 23, 7, 50); // Mon Nov 23 2026
const cases = [
  ['Pay rent every month on the 1st 9am #bills', { title: 'Pay rent', due: '2026-12-01', time: '09:00', recur: 'Every month on the 1st', list: 'Bills' }],
  ['Call mom tomorrow at 6pm', { title: 'Call mom', due: '2026-11-24', time: '18:00' }],
  ['Standup every weekday 9:30', { title: 'Standup', due: '2026-11-23', recur: 'Every weekday' }],
  ['Gym every mon, wed and fri 7am', { title: 'Gym', recur: 'Every Mon, Wed, Fri' }],
  ['Water plants every 3 days #trip', { title: 'Water plants', recur: 'Every 3 days', list: 'Trip' }],
  ['Clean every other week sat', { title: 'Clean', due: '2026-11-28', recur: 'Every 2 weeks' }],
  ['Phone bill monthly', { title: 'Phone bill', recur: 'Every month' }],
  ['Rent every 15th', { title: 'Rent', due: '2026-12-15', recur: 'Every month on the 15th' }],
  ['Car registration mar 12 every year', { title: 'Car registration', due: '2027-03-12', recur: 'Every year' }],
  ['Long walk every weekend', { title: 'Long walk', recur: 'Every weekend' }],
  ['Submit form 12/5', { title: 'Submit form', due: '2026-12-05' }],
  ['Dentist dec 5 3pm', { title: 'Dentist', due: '2026-12-05', time: '15:00' }],
  ['Team review next week', { title: 'Team review', due: '2026-11-30' }],
  ['Buy ink @errands tomorrow', { title: 'Buy ink @errands', due: '2026-11-24' }], // tags removed: @ stays in the title
  ['Ali vacation dec 20 - dec 31', { title: 'Ali vacation', due: '2026-12-20', end: '2026-12-31' }],
  ['Sara leave jan 5 to jan 9', { title: 'Sara leave', due: '2027-01-05', end: '2027-01-09' }],
  ['Team offsite from fri until next week', { title: 'Team offsite', due: '2026-11-27', end: '2026-11-30' }],
  ['Holiday dec 28 - jan 2', { title: 'Holiday', due: '2026-12-28', end: '2027-01-02' }],
  ['Ali vacation nov 20 - nov 27', { title: 'Ali vacation', due: '2026-11-20', end: '2026-11-27' }], // already under way
  ['Drive to work tomorrow', { title: 'Drive to work', due: '2026-11-24' }],
  ['Talk to Mike - fri', { due: '2026-11-27' }],
  ['Renew passport start next week due dec 20', { title: 'Renew passport', due: '2026-12-20', start: '2026-11-30' }],
  ['Email from Sara tomorrow', { title: 'Email from Sara', due: '2026-11-24' }],
  ['Call bank tomorrow 10am remind 30m before', { title: 'Call bank', reminder: '2026-11-24T09:30' }],
  ['Fix leak p1', { title: 'Fix leak p1' }], // priority removed: stays in title
];
let fail = 0;
for (const [input, exp] of cases) {
  const r = P.parseQuick(input, lists, now);
  const got = { title: r.title, due: r.due, time: r.time, recur: r.recur ? P.recurText(r.recur) : undefined, list: r.listName || undefined, tags: r.tags.join(',') || undefined, end: r.end || undefined, start: r.start || undefined, reminder: r.reminder || undefined };
  for (const k in exp) if (got[k] !== exp[k]) { fail++; console.log('FAIL', JSON.stringify(input), k, 'expected', exp[k], 'got', got[k]); }
}
console.log(fail ? fail + ' failures' : 'all ' + cases.length + ' quick-add cases pass');
process.exit(fail ? 1 : 0);
