// Growth gaps that a bot on jobs.flisk.si really does: the AI search check of the site (Citable) and the README score
// of its GitHub repo. Free-text gaps (submit to Product Hunt, answer a thread) are left out on purpose: no bot does
// them today, so posting them would only fill the board with jobs nobody takes.
export const JOBS_URL = 'https://jobs.flisk.si';

// The site's GitHub repo: the site itself when it is a repo, else the first github.com/owner/repo link on its home page.
export async function findRepo(siteUrl, { fetch: f = fetch } = {}) {
  const own = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/?$/.exec(siteUrl);
  if (own) return `${own[1]}/${own[2].replace(/\.git$/, '')}`;
  const html = await f(siteUrl, { headers: { 'user-agent': 'flisk-grow' } }).then((r) => (r.ok ? r.text() : '')).catch(() => '');
  const skip = /^(sponsors|orgs|features|topics|login|about|marketplace|settings|apps)$/;
  for (const m of html.matchAll(/https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+)/g)) {
    if (!skip.test(m[1])) return `${m[1]}/${m[2].replace(/\.git$/, '')}`;
  }
  return '';
}

export function jobsFor(siteUrl, repo) {
  const host = new URL(siteUrl).host + new URL(siteUrl).pathname.replace(/\/$/, '');
  const out = [{ kind: 'ai-findable', title: `Can AI search find ${host}?`, input: { url: siteUrl } }];
  if (repo) out.push({ kind: 'readme-score', title: `Score the README of ${repo}`, input: { repo } });
  return out;
}

// Posts each job with autoAccept, so the bot's answer is accepted once it checks out. Returns [{kind, title, id, link}].
export async function postJobs(jobs, key, { fetch: f = fetch } = {}) {
  return Promise.all(jobs.map(async (j) => {
    const r = await f(`${JOBS_URL}/api/jobs`, { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify({ ...j, autoAccept: true }) });
    const body = await r.json().catch(() => ({}));
    const id = body.job?.id ?? body.id;
    if (!r.ok || !id) throw new Error(body.error || `jobs.flisk.si answered ${r.status}`);
    return { kind: j.kind, title: j.title, id, link: `${JOBS_URL}/job/${id}` };
  }));
}
