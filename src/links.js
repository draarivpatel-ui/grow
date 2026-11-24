// Links the model writes for "Where to find them" are checked here before a page shows them. The model glues two
// subreddits into one address ("reddit.com/r/docker%20and%20r/k8s"), stops a Reddit link at "/comments/" with no post,
// and writes spaces into paths. Each place keeps one link that opens, or none.

const SUB = /^[A-Za-z0-9_]{2,21}$/;
const REDDIT = /^((www|old|new|m)[.])?reddit[.]com$/i;

// One link, made safe to open, or '' when it cannot be.
export function cleanLink(v) {
  let u;
  try { u = new URL(String(v ?? '').trim()); } catch { return ''; }
  if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.') || /\s|%20|%2520/i.test(u.pathname + u.hostname)) return '';
  if (/(^|\/)https?:/i.test(u.pathname.slice(1))) return ''; // a second address glued into the path
  if (REDDIT.test(u.hostname)) {
    const seg = u.pathname.split('/').filter(Boolean);
    if (seg[0] !== 'r') return seg.length ? '' : 'https://www.reddit.com/';
    if (!SUB.test(seg[1] || '')) return '';
    const base = 'https://www.reddit.com/r/' + seg[1] + '/';
    // A post link keeps its id; a bare "/comments/" or any other sub-page becomes the subreddit.
    if (seg[2] === 'comments' && /^[a-z0-9]{4,10}$/i.test(seg[3] || '')) return base + 'comments/' + seg[3] + '/';
    return base;
  }
  // A list path with nothing after it ("/comments/", "/questions/") is not a page; keep the part before it.
  u.pathname = u.pathname.replace(/\/(comments|posts|threads|t|questions)\/?$/i, '/');
  u.hash = '';
  return u.href;
}

// Subreddit names in a text: "r/docker and r/k8s" -> ['docker', 'k8s'].
export const subreddits = (t) => [...String(t ?? '').matchAll(/(?:^|[^\w/])\/?r\/([A-Za-z0-9_]{2,21})\b/g)].map((m) => m[1]);
const subUrl = (s) => 'https://www.reddit.com/r/' + s + '/';

// Split one model place into the places it names, each with one clean link.
export function splitPlace(p) {
  const name = String(p.name || ''), raw = String(p.url || '');
  let decoded = raw; try { decoded = decodeURIComponent(raw); } catch { /* keep raw */ }
  // Every address in the url field, and every subreddit named in the url or the name.
  const urls = [...decoded.matchAll(/https?:\/\/[^\s,;]+/g)].map((m) => m[0].replace(/[.)]+$/, ''));
  const subs = [...new Set([...subreddits(decoded.replace(/https?:\/\/(www[.])?reddit[.]com/gi, '')), ...subreddits(name)])];
  const glued = urls.length > 1 || subs.length > 1 || /\s|%20/.test(raw.trim());
  if (!glued) return [{ ...p, url: cleanLink(raw) || (subs.length === 1 ? subUrl(subs[0]) : '') }];
  const out = [];
  const add = (n, u) => { if (u && !out.some((x) => x.url === u)) out.push({ ...p, name: n, url: u }); };
  for (const s of subs) add('r/' + s, subUrl(s));
  for (const u of urls) { const c = cleanLink(u); if (c && !/reddit[.]com\/r\//.test(c)) add(name, c); }
  return out.length ? out : [{ ...p, url: '' }];
}

// All places: split glued ones, clean every link, drop repeats of the same link.
export function cleanPlaces(places, max = 10) {
  const out = [];
  for (const p of places) for (const q of splitPlace(p)) {
    if (q.url && out.some((x) => x.url === q.url)) continue;
    out.push(q);
  }
  return out.slice(0, max);
}

// Ask each place's address once; a page that is gone (404, 410, no such host) loses its link. Sites that refuse
// servers (Reddit answers 403) and slow sites keep theirs: only a clear "not there" drops one.
export async function checkPlaceLinks(places, fetchImpl, ms = 4000) {
  await Promise.all(places.map(async (p) => {
    if (!p.url || /reddit[.]com\/r\/[^/]+\/$/.test(p.url)) return;
    try {
      const r = await fetchImpl(p.url, { method: 'GET', redirect: 'follow', headers: { 'user-agent': 'FliskGrow/1.0 (+https://grow.flisk.si)' }, signal: AbortSignal.timeout(ms) });
      if (r.status === 404 || r.status === 410) p.url = '';
      r.body?.cancel?.();
    } catch (e) {
      if (e?.name !== 'TimeoutError' && e?.name !== 'AbortError') p.url = '';
    }
  }));
  return places;
}

// Communities for makers who share what they built. A "find them" line that sends a DevOps-buyer email there is wrong.
const MAKER_PLACES = /\b(r\/(SideProject|startups|Entrepreneur|alphaandbetausers|SaaS|indiehackers|IMadeThis)|Indie ?Hackers|Show HN|Product Hunt|BetaList)\b/i;
const MAKER_BUYERS = /\b(makers?|founders?|indie ?hackers?|side projects?|solo (developers?|devs?)|bootstrapp\w*|startups?|launch\w*)\b/i;
// Lines from the prompt's own examples that small models copy word for word.
export const ECHOES = [/under 50 stars/i, /posted Show HN this week/i, /how to get first users on r\/SideProject/i];

const words = (t) => new Set(String(t).toLowerCase().match(/[a-z0-9]{4,}/g) || []);
function bestPlace(text, places, used) {
  const w = words(text); let best = -1, score = -1;
  places.forEach((p, i) => {
    if (!p.url) return;
    let host = ''; try { host = new URL(p.url).hostname; } catch { /* no host */ }
    let s = 0; for (const x of words(p.name + ' ' + p.why + ' ' + host.replace(/[.]/g, ' '))) if (w.has(x)) s++;
    s -= (used.get(i) || 0) * 0.5; // spread emails over the places
    if (s > score) { score = s; best = i; }
  });
  return best;
}

// Tie each email's "find them" to a place in the plan that fits its reader. Returns the emails that still fit the
// buyers: one written to the prompt's example reader instead of the real buyers is dropped (unless it is the last).
export function tieFinds(emails, places, buyers) {
  const makers = MAKER_BUYERS.test(buyers || '');
  const used = new Map();
  const kept = emails.filter((e) => makers || !ECHOES.some((re) => re.test(e.to || '')) || emails.length === 1);
  for (const e of kept) {
    const f = (e.find || '').toLowerCase(), subs = subreddits(e.find).map((x) => '/r/' + x.toLowerCase() + '/');
    const named = places.findIndex((p) => p.url && (f.includes(p.name.toLowerCase()) || subs.some((x) => p.url.toLowerCase().includes(x))));
    const wrong = !e.find || ECHOES.some((re) => re.test(e.find)) || (!makers && MAKER_PLACES.test(e.find));
    const i = named >= 0 && !wrong ? named : bestPlace((e.to || '') + ' ' + (e.find || ''), places, used);
    if (i < 0) { if (wrong) e.find = ''; continue; }
    used.set(i, (used.get(i) || 0) + 1);
    e.place = i;
    if (wrong) e.find = 'Look for people like this in ' + places[i].name + ': ' + places[i].why;
  }
  return kept;
}
