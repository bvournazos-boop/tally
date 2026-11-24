// Which Supabase project this copy of Tally uses.
// A copy of Tally sets SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in Vercel → Settings → Environment Variables.
// The built-in values belong to the original site only, so a copy without its own settings never talks to someone else's data.
const ORIGINAL_HOST = 'tally-ntqo.vercel.app';
const ORIGINAL = { url: 'https://tvygsmhbrjsjgnnvdgns.supabase.co', key: 'sb_publishable_Ni3DpOM242PEEpRIa-Ss9w_tMCjInmR' };

function supabaseFor(req) {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY) return { url: process.env.SUPABASE_URL.replace(/\/+$/, ''), key: process.env.SUPABASE_PUBLISHABLE_KEY };
  const host = String((req && req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || '').toLowerCase();
  if (host === ORIGINAL_HOST || process.env.VERCEL_PROJECT_PRODUCTION_URL === ORIGINAL_HOST) return ORIGINAL;
  return { url: '', key: '' };
}
module.exports = { supabaseFor };
