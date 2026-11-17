// One growth plan for one link: read the page, ask the free model who would buy and where they are, check whether AI
// search can read the page (Citable), and add the places to list it. Nothing here sends a message for anyone.

export const CITABLE_URL = 'https://citable.flisk.si/api/check?url=';
export const MODEL = 'flisk-wolf-chat';

const str = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, max);
// Email and post bodies keep their line breaks.
const text = (v, max) => String(v ?? '').replace(/\r/g, '').replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ').trim().slice(0, max);

export function httpUrl(v) {
  try {
    const u = new URL(String(v ?? '').trim().slice(0, 300));
    return /^https?:$/.test(u.protocol) && u.hostname.includes('.') ? u.href : '';
  } catch { return ''; }
}

// Where to list a product. Fixed links, checked by hand: the model never makes up a submit page.
export const LISTINGS = [
  { name: 'Hacker News (Show HN)', why: 'Developers and early adopters; post on a weekday morning US time.', url: 'https://news.ycombinator.com/submit' },
  { name: 'Product Hunt', why: 'A launch day with a page people can upvote and comment on.', url: 'https://www.producthunt.com/posts/new' },
  { name: 'SaaSHub', why: 'A software directory people search for alternatives.', url: 'https://www.saashub.com/submit' },
  { name: 'AlternativeTo', why: 'Shows up when people look for an alternative to a known app.', url: 'https://alternativeto.net/manage-item/' },
  { name: 'BetaList', why: 'Early adopters who sign up for new products.', url: 'https://betalist.com/submit' },
  { name: 'Toolradar', why: 'A tool directory that AI assistants read.', url: 'https://toolradar.com/submit' },
  { name: 'Uneed', why: 'A daily launch list for new tools.', url: 'https://www.uneed.best/submit-a-tool' },
  { name: 'DevHunt', why: 'A launch list for developer tools.', url: 'https://devhunt.org/' },
  { name: 'AIChief', why: 'An AI tools directory with a page per tool.', url: 'https://aichief.com/submit-tool/' },
  { name: 'SourceForge', why: 'Mirrors your releases and lists the project for people browsing open source.', url: 'https://sourceforge.net/create/' },
];

// The other free Flisk checks that help a launch.
export const TOOLS = [
  { name: 'Citable', why: 'Can ChatGPT, Claude and Perplexity read and quote your page.', url: 'https://citable.flisk.si' },
  { name: 'README Score', why: 'A score for a GitHub README and a fix for each missing part.', url: 'https://readme.flisk.si' },
  { name: 'Flisk Analytics', why: 'Count visitors without cookies. Invite only for now.', url: 'https://analytics.flisk.si' },
];

// The page as plain text for the model: title, description and the start of the visible text.
export async function readPage(url, fetchImpl) {
  try {
    const r = await fetchImpl(url, { headers: { accept: 'text/html', 'user-agent': 'FliskGrow/1.0 (+https://grow.flisk.si)' }, redirect: 'follow', signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const html = (await r.text()).slice(0, 300_000);
    const title = str(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1], 160);
    const desc = str(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i.exec(html)?.[1], 300);
    const body = html.replace(/<(script|style|noscript|svg|title)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#?\w+;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000);
    return { title, desc, body };
  } catch { return null; }
}

export async function checkCitable(url, call) {
  try {
    const r = await call(CITABLE_URL + encodeURIComponent(url), { headers: { accept: 'application/json', 'user-agent': 'flisk-grow' }, signal: AbortSignal.timeout(20000) });
    const j = r.ok ? await r.json() : null;
    if (!j || typeof j.score !== 'number') return null;
    const fixes = (Array.isArray(j.checks) ? j.checks : []).filter((c) => c && (c.status === 'fail' || c.status === 'warn'))
      .slice(0, 3).map((c) => ({ title: str(c.title, 100), summary: str(c.summary, 220) }));
    return { score: j.score, grade: str(j.grade, 2), fixes, report: `https://citable.flisk.si/${encodeURIComponent(new URL(url).host)}` };
  } catch { return null; }
}

export const SYSTEM = `You help a maker find the first people who would pay for what they made.
You get a link and the text of its page. Answer with ONE JSON object and nothing else:
{"product": "what it is, one short sentence",
 "buyers": "who would pay first: a narrow group, their job, the problem they have today (2 sentences)",
 "pitch": "one line a buyer would care about, no hype",
 "today": "the one step to take today, one sentence",
 "queries": ["2 to 4 short search phrases (2-4 words) a buyer would write in a post when they have the problem"],
 "places": [{"name": "a real community, forum, subreddit, newsletter, event or group where those buyers are", "why": "why there", "url": "its address if you are sure, else empty"}],
 "emails": [{"to": "who to write to (a role, not a made-up name)", "subject": "short", "body": "a short plain email under 90 words: why them, what it does for them, one small ask; sign it [your name]"}],
 "posts": [{"where": "X" | "Reddit" | "Hacker News", "title": "post title", "body": "the post, plain, under 60 words"}]}
Give 5 to 8 places, 5 emails, 3 posts (one for each of X, Reddit and Hacker News). Only real places; never invent an address.
Plain words, no emoji, no hashtags. If the page says little, guess from the link and say so in "product".`;

// A link to a person's or brand's profile on a social network. Its page is behind a login, so it cannot be read and a
// "who would buy it" plan makes no sense: the goal there is followers.
const RESERVED = new Set(['home', 'i', 'search', 'explore', 'intent', 'share', 'login', 'signup', 'settings', 'messages', 'notifications', 'compose', 'hashtag', 'tos', 'privacy']);
export function profileOf(url) {
  try {
    const u = new URL(url);
    if (!/^(www\.|mobile\.)?(x|twitter)\.com$/i.test(u.hostname)) return null;
    const handle = u.pathname.split('/').filter(Boolean)[0] || '';
    if (!/^[A-Za-z0-9_]{1,15}$/.test(handle) || RESERVED.has(handle.toLowerCase())) return null;
    return { network: 'X', handle };
  } catch { return null; }
}

export const FOLLOWERS_SYSTEM = `You help a person grow the followers of their X (Twitter) account, with no ads and no bots.
You get the handle and, maybe, a line from the owner about what the account is for. You cannot open the profile.
If you do not know the account, build the plan from the handle and the owner's line, and say so in "account". Never invent facts about it.
Answer with ONE JSON object and nothing else:
{"account": "what the account is for, one short sentence",
 "audience": "who should follow it: a narrow group, what they care about, why they would follow (2 sentences)",
 "bio": "a bio under 160 characters that says who it is for and what they get",
 "pinned": "a pinned post under 270 characters that makes a stranger press Follow",
 "today": "the one step to take today, one sentence",
 "queries": ["2 to 4 short search phrases (2-4 words) the audience writes in posts, to find them and reply"],
 "accounts": [{"name": "a type of account to follow and reply to, or a real well-known account if you are sure", "why": "why its followers fit"}],
 "week": [{"day": "Day 1", "do": "one concrete task of about 20 minutes"}],
 "posts": [{"title": "angle, 3 to 6 words", "body": "an X post under 270 characters, plain"}],
 "replies": [{"to": "what kind of post to answer", "body": "a useful reply under 240 characters that adds something, no pitch"}]}
Give 5 accounts, 7 week days (Day 1 to Day 7), 10 posts, 5 replies. The posts mix: a short story, a useful tip, a plain opinion, a question, a result with numbers.
Plain words, no emoji, no hashtags, no "follow me" begging, no buying followers. Say what to do again every week after the first.`;

export function cleanFollowers(i, profile) {
  if (!i || typeof i !== 'object') return null;
  const accounts = (Array.isArray(i.accounts) ? i.accounts : []).slice(0, 8).map((a) => ({ name: str(a?.name, 80), why: str(a?.why, 200) })).filter((a) => a.name);
  const week = (Array.isArray(i.week) ? i.week : []).slice(0, 7).map((d, n) => ({ day: str(d?.day, 20) || 'Day ' + (n + 1), do: str(d?.do, 240) })).filter((d) => d.do);
  const posts = (Array.isArray(i.posts) ? i.posts : []).slice(0, 12).map((p) => ({ title: str(p?.title, 80), body: text(p?.body, 290) })).filter((p) => p.body);
  const replies = (Array.isArray(i.replies) ? i.replies : []).slice(0, 8).map((r) => ({ to: str(r?.to, 120), body: text(r?.body, 260) })).filter((r) => r.body);
  const audience = str(i.audience, 500);
  if (!audience || !posts.length || !week.length) return null;
  const queries = (Array.isArray(i.queries) ? i.queries : []).map((q) => str(q, 60)).filter((q) => q.length >= 3).slice(0, 4);
  return { kind: 'followers', network: profile.network, handle: profile.handle, account: str(i.account, 200), audience, bio: str(i.bio, 200), pinned: text(i.pinned, 300), today: str(i.today, 240), queries, accounts, week, posts, replies };
}

// Used when the free model is out of budget: the same shape, from a fixed playbook, so a profile link never dead-ends.
export function genericFollowers(profile, about = '') {
  const line = str(about, 120);
  const topic = line || 'what your account is about';
  return {
    kind: 'followers', generic: true, network: profile.network, handle: profile.handle,
    account: line ? 'An account about: ' + line : 'A general playbook. Press the button again tomorrow for a plan written for your account.',
    audience: 'People who have the problem your account talks about and read posts about ' + topic + ' every day. Pick one narrow group and write only for them.',
    bio: 'Who this is for, what they get from following, one proof. Under 160 characters, no emoji.',
    pinned: 'One post that says who the account is for, shows your best result or story, and ends with what you post each week.',
    today: 'Write the bio and pin one post that says who the account is for.',
    queries: line ? [str(line, 60)] : [],
    accounts: [
      { name: 'Accounts one size bigger than you in your topic', why: 'Their readers already want what you post. Reply under their posts first.' },
      { name: 'People who post questions about your topic', why: 'A useful answer gets read by everyone who follows them.' },
      { name: 'Small accounts that reply to everyone', why: 'They follow back people who help and the circle grows.' },
    ],
    week: [
      { day: 'Day 1', do: 'Write the bio, pick a clear photo and pin one post for one narrow group.' },
      { day: 'Day 2', do: 'Follow 20 accounts your group reads and reply usefully to 5 of their posts.' },
      { day: 'Day 3', do: 'Post one short story from your own work: what you tried, what happened.' },
      { day: 'Day 4', do: 'Answer 5 questions on your topic with something specific, no link.' },
      { day: 'Day 5', do: 'Post one tip someone can use in 5 minutes.' },
      { day: 'Day 6', do: 'Post a plain opinion about your topic and answer every reply.' },
      { day: 'Day 7', do: 'Look at your 3 best posts, write the next 3 in the same shape.' },
    ],
    posts: [
      { title: 'A short story', body: 'Last week I tried [one thing] on [your topic]. What I expected: [x]. What happened: [y]. What I do now: [z].' },
      { title: 'A useful tip', body: 'One thing that saves time on ' + topic + ': [the tip, in one or two lines]. It takes 5 minutes.' },
      { title: 'A plain opinion', body: 'Unpopular opinion on ' + topic + ': [your view]. Here is why: [one reason].' },
      { title: 'A question', body: 'People who work on ' + topic + ': what is the one thing that still wastes your week?' },
      { title: 'A result with numbers', body: 'This month: [number] [what you measured]. What moved it most: [one thing].' },
    ],
    replies: [
      { to: 'A post asking for help on your topic', body: 'What worked for me: [one specific step]. It helps because [reason]. Happy to say more.' },
      { to: 'A post from a bigger account in your topic', body: 'Adding one thing from my own work: [a real detail they did not say].' },
    ],
  };
}

export function parseJson(s) {
  const t = String(s ?? '').replace(/```(?:json)?/g, '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
}

// Keep only what the page can draw safely. Returns null when the model gave too little to be useful.
export function cleanPlan(i) {
  if (!i || typeof i !== 'object') return null;
  const places = (Array.isArray(i.places) ? i.places : []).slice(0, 10)
    .map((p) => ({ name: str(p?.name, 80), why: str(p?.why, 200), url: httpUrl(p?.url) })).filter((p) => p.name);
  const emails = (Array.isArray(i.emails) ? i.emails : []).slice(0, 8)
    .map((e) => ({ to: str(e?.to, 80), subject: str(e?.subject, 120), body: text(e?.body, 1500) })).filter((e) => e.subject && e.body);
  const posts = (Array.isArray(i.posts) ? i.posts : []).slice(0, 5)
    .map((p) => ({ where: ['X', 'Reddit', 'Hacker News'].includes(p?.where) ? p.where : 'X', title: str(p?.title, 120), body: text(p?.body, 600) }))
    .filter((p) => p.title || p.body);
  const buyers = str(i.buyers, 500);
  if (!buyers || !places.length || !emails.length) return null;
  const queries = (Array.isArray(i.queries) ? i.queries : []).map((q) => str(q, 60)).filter((q) => q.length >= 3).slice(0, 4);
  return { product: str(i.product, 200), queries, buyers, pitch: str(i.pitch, 200), today: str(i.today, 240), places, emails, posts };
}

// The whole plan. `model` and `citable` are fetch-like functions (service bindings in production).
export async function makePlan(url, { fetch: fetchImpl, model, citable, key, about: ownerLine = '' }) {
  const profile = profileOf(url);
  const [page, check] = profile ? [null, null] : await Promise.all([readPage(url, fetchImpl), checkCitable(url, citable || fetchImpl)]);
  const about = profile
    ? `Handle: @${profile.handle}\nOwner says: ${str(ownerLine, 300) || '(nothing)'}`
    : page ? `Title: ${page.title}\nDescription: ${page.desc}\nText: ${page.body}` : '(the page could not be read)';
  let r;
  try {
    r = await model('https://inference.flisk.si/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODEL, temperature: 0.4, max_tokens: profile ? 3500 : 2048, messages: [{ role: 'system', content: profile ? FOLLOWERS_SYSTEM : SYSTEM }, { role: 'user', content: `Link: ${url}\n${about}` }] }),
    signal: AbortSignal.timeout(60000),
  });
  } catch (e) {
    return { error: e?.name === 'TimeoutError' || e?.name === 'AbortError' ? 'timeout' : 'model', message: str(e?.message, 300) || 'model call failed' };
  }
  const j = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = str(j?.error?.message, 300);
    return { error: /daily|budget|limit/i.test(msg) ? 'busy' : 'model', message: msg || `model answered ${r.status}` };
  }
  const raw = parseJson(j?.choices?.[0]?.message?.content);
  if (profile) {
    const f = cleanFollowers(raw, profile);
    return f ? { plan: { url, ...f, tools: TOOLS } } : { error: 'model', message: 'the model did not give a usable plan' };
  }
  const plan = cleanPlan(raw);
  if (!plan) return { error: 'model', message: 'the model did not give a usable plan' };
  return { plan: { url, ...plan, check, listings: LISTINGS, tools: TOOLS } };
}
