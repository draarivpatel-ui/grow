export const MODEL_PLAN = {
  product: 'A tool that does a thing.',
  buyers: 'Small agencies that build sites for clients. They lose hours on setup.',
  pitch: 'Set up a client site in minutes.',
  today: 'Write to five agencies.',
  places: [{ name: 'r/webdev', why: 'Agency developers', url: 'https://www.reddit.com/r/webdev/' }, { name: 'Bad <b>place</b>', why: 'x', url: 'javascript:alert(1)' }],
  emails: [{ to: 'Agency owner', subject: 'Quick question', body: 'Hi,\nshort note.\n[your name]' }],
  posts: [{ where: 'X', title: 'Shipped', body: 'It is out.' }, { where: 'Mastodon', title: 'Other', body: 'b' }],
};

// A fetch that answers the page, Citable and the model, and records what was called.
export function fakeFetch({ model = MODEL_PLAN, modelStatus = 200, modelError } = {}) {
  const calls = [];
  const fn = async (u, init = {}) => {
    const url = String(u);
    calls.push({ url, init });
    if (url.startsWith('https://citable.flisk.si/')) return Response.json({ score: 62, grade: 'C', checks: [{ status: 'fail', title: 'No llms.txt', summary: 'Add one.' }, { status: 'pass', title: 'ok' }] });
    if (url.startsWith('https://inference.flisk.si/')) {
      if (modelStatus !== 200) return Response.json({ error: { message: modelError || 'boom' } }, { status: modelStatus });
      return Response.json({ choices: [{ message: { content: '```json\n' + JSON.stringify(model) + '\n```' } }] });
    }
    return new Response('<html><head><title>Thing</title><meta name="description" content="Does a thing"></head><body><script>x()</script><p>Hello &amp; welcome</p></body></html>', { headers: { 'content-type': 'text/html' } });
  };
  fn.calls = calls;
  return fn;
}

// The Cache API, in memory.
export function fakeCache() {
  const m = new Map();
  return { match: async (k) => (m.has(k.url) ? new Response(m.get(k.url)) : undefined), put: async (k, r) => { m.set(k.url, await r.text()); } };
}
