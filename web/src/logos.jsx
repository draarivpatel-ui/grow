// A company logo before every name, from the Worker's own /logo/<host> (fetched once and cached, so visitors only talk to grow.flisk.si).
const HOSTS = { instagram: 'instagram.com', tiktok: 'tiktok.com', 'hacker news': 'news.ycombinator.com', 'show hn': 'news.ycombinator.com', bluesky: 'bsky.app', github: 'github.com', reddit: 'reddit.com', 'product hunt': 'producthunt.com', saashub: 'saashub.com', alternativeto: 'alternativeto.net', betalist: 'betalist.com', toolradar: 'toolradar.com', uneed: 'uneed.best', devhunt: 'devhunt.org', foundrlist: 'foundrlist.com', launchamp: 'launchamp.eu', toolpotion: 'toolpotion.ai', aichief: 'aichief.com', sourceforge: 'sourceforge.net', x: 'x.com', twitter: 'x.com', linkedin: 'linkedin.com', 'indie hackers': 'indiehackers.com', 'dev.to': 'dev.to', discord: 'discord.com', youtube: 'youtube.com', 'stack overflow': 'stackoverflow.com', medium: 'medium.com', slack: 'slack.com', mastodon: 'joinmastodon.org', lobsters: 'lobste.rs', chatgpt: 'chatgpt.com', claude: 'claude.ai', perplexity: 'perplexity.ai', gmail: 'mail.google.com', citable: 'citable.flisk.si', 'readme score': 'readme.flisk.si', ranker: 'ranker.flisk.si', 'jobs.flisk.si': 'jobs.flisk.si', flisk: 'flisk.si' };

export function logoHost(name, url) {
  const n = String(name || '').toLowerCase().trim();
  const k = Object.keys(HOSTS).find((x) => n === x || n.startsWith(x + ' ') || n.startsWith(x + ' ·') || (n.startsWith('r/') && x === 'reddit') || (n.startsWith('reddit') && x === 'reddit'));
  if (k) return HOSTS[k];
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

export function Logo({name, url, size = 20}) {
  const h = logoHost(name, url);
  const fallback = <span className="logo logo-fb" style={{width: size, height: size}}>{String(name || '?')[0].toUpperCase()}</span>;
  if (!h) return fallback;
  return <img className="logo" src={'/logo/' + h} alt="" width={size} height={size} loading="lazy"
    onError={(e) => { e.currentTarget.replaceWith(Object.assign(document.createElement('span'), {className: 'logo logo-fb', textContent: String(name || '?')[0].toUpperCase()})); }} />;
}
