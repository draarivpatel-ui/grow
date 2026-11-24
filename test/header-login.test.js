import { describe, expect, test } from 'bun:test';
import { handle } from '../src/index.js';
import { fakeD1 } from './fake-d1.js';

// The org bar (flisk.si/assets/bar.js) reads the signed-in login from [data-flisk-login]: the element's whole trimmed text, a leading @ stripped,
// must match ^[A-Za-z0-9][A-Za-z0-9-]{0,38}$. The cabinet builds it in the browser, so the test runs the page's own helper against a fake `el`.
const O = 'https://grow.flisk.si';
const BAR_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

const page = async () => {
  const res = await handle(new Request(`${O}/classic/me`), { DB: fakeD1(), SESSION_SECRET: 'test-secret' }, { cache: null });
  expect(res.status).toBe(200);
  return res.text();
};
const line = (html, start) => {
  const l = html.split('\n').find((x) => x.startsWith(start));
  if (!l) throw new Error(`missing in /classic/me script: ${start}`);
  return l;
};
const el = (tag, cls, txt) => ({ tag, cls, text: txt ?? '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } });
const load = async () => { const html = await page(); return { html, whoNodes: new Function('el', `${line(html, 'const GH_LOGIN')}\n${line(html, 'const whoNodes')}\nreturn whoNodes;`)(el) }; };
const barReads = (n) => (typeof n === 'object' && 'data-flisk-login' in n.attrs ? (n.text.trim().replace(/^@/, '').match(BAR_PATTERN)?.[0] ?? '') : '');
const read = (nodes) => nodes.map(barReads).find(Boolean) ?? '';

describe('org bar login hook', () => {
  test('the login is in its own marked span, with no other text', async () => {
    const { whoNodes } = await load();
    const nodes = whoNodes({ login: 'octo-cat' });
    const marked = nodes.filter((n) => typeof n === 'object' && 'data-flisk-login' in n.attrs);
    expect(marked.length).toBe(1);
    expect(marked[0].text).toBe('octo-cat');
    expect(read(nodes)).toBe('octo-cat');
    expect(nodes[0].text).toBe('Signed in as ');
    expect('data-flisk-login' in nodes[0].attrs).toBe(false);
  });

  test('a value that is not a GitHub login is never marked', async () => {
    const { whoNodes } = await load();
    for (const login of ['', 'a b', '-x', 'a'.repeat(40), '<b>x</b>', undefined, 'a_1f2e3d4c5b6a7988']) {
      expect(read(whoNodes({ login }))).toBe('');
    }
  });

  test('the sentence that failed the bar pattern is gone, and the anonymous cabinet has no hook', async () => {
    const { html } = await load();
    expect(html).not.toContain("'Signed in as ' + ME.user.login");
    expect(html).toContain('who.append(...whoNodes(ME.user))');
    expect(html.match(/data-flisk-login/g).length).toBe(2); // the comment and the one setAttribute
    expect(html).not.toMatch(/<[a-z]+[^>]* data-flisk-login/); // never in the served HTML: client-rendered, only for ME.user
  });
});
