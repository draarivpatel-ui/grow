// Finds where a site is already listed, so the cabinet can fill "Where you listed it" by itself.
// Hacker News through its public search; directories by opening the likely page and keeping it only
// when the page names the site's domain. Product Hunt, AlternativeTo and BetaList block servers, so
// those stay manual.

const UA = 'Mozilla/5.0 (compatible; FliskGrow/1.0; +https://grow.flisk.si)';
const PROBES = [
  { place: 'SaaSHub', url: (s) => `https://www.saashub.com/${s}` },
  { place: 'Toolradar', url: (s) => `https://toolradar.com/tools/${s}` },
  { place: 'Uneed', url: (s) => `https://www.uneed.best/tool/${s}` },
  { place: 'DevHunt', url: (s) => `https://devhunt.org/tool/${s}` },
  { place: 'FoundrList', url: (s) => `https://www.foundrlist.com/product/${s}` },
  { place: 'LaunchAmp', url: (s) => `https://launchamp.eu/tools/${s}` },
  { place: 'ToolPotion', url: (s) => `https://toolpotion.ai/en/ai-apps/${s}` },
];

export function siteName(url) {
  try { const h = new URL(url).hostname.replace(/^www\./, ''); return { host: h, name: h.split('.')[0] }; } catch { return { host: '', name: '' }; }
}

async function text(fetchImpl, url) {
  try {
    const r = await fetchImpl(url, { headers: { 'user-agent': UA, accept: 'text/html,application/json' }, redirect: 'follow', signal: AbortSignal.timeout(8000) });
    return r.ok ? await r.text() : '';
  } catch { return ''; }
}

export async function findHN(name, host, fetchImpl) {
  if (!name) return null;
  const raw = await text(fetchImpl, `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(host)}&tags=story&typoTolerance=false&hitsPerPage=30`);
  let hits = [];
  try { hits = JSON.parse(raw).hits || []; } catch { /* no hits */ }
  // Only a story that links to this exact domain is yours. A "Show HN" title with the same word is not.
  const at = new RegExp(`^https?://(www\\.)?${host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([/:?#]|$)`, 'i');
  const hit = hits.find((h) => at.test(String(h.url || '')));
  return hit ? { place: 'Hacker News (Show HN)', link: `https://news.ycombinator.com/item?id=${hit.objectID}` } : null;
}

export async function findListings(siteUrl, { fetch: fetchImpl } = {}) {
  const { host, name } = siteName(siteUrl);
  if (!name) return [];
  const slugs = [...new Set([name, `${name}-cli`, `${name}-sh`, host.replace(/\./g, '-')])];
  const probe = async (p) => {
    for (const s of slugs) {
      const u = p.url(s);
      if ((await text(fetchImpl, u)).toLowerCase().includes(host)) return { place: p.place, link: u };
    }
    return null;
  };
  return (await Promise.all([findHN(name, host, fetchImpl), ...PROBES.map(probe)])).filter(Boolean);
}
