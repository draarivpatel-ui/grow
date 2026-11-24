import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { handle } from '../src/index.js';
import { NEXT_CSS_PATH, NEXT_FONTS, NEXT_JS_PATH } from '../src/next-app.generated.js';
import { fakeD1 } from './fake-d1.js';
import { fakeCache, fakeFetch } from './fixtures.js';

const setup = () => {
  const env = { DB: fakeD1(), INFERENCE_KEY: 'k' };
  const deps = { fetch: fakeFetch(), cache: fakeCache() };
  return { get: (p) => handle(new Request('https://grow.flisk.si' + p), env, deps), post: (url) => handle(new Request('https://grow.flisk.si/api/plan', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '1.1.1.1' }, body: JSON.stringify({ url }) }), env, deps) };
};

describe('the Astryx pages', () => {
  test('/ is the app shell with the Flisk bar and no sign-in', async () => {
    const r = await setup().get('/');
    expect(r.status).toBe(200);
    const t = await r.text();
    expect(t).toContain('https://flisk.si/assets/bar.js');
    expect(t).toContain(NEXT_JS_PATH);
    expect(t).toContain(NEXT_CSS_PATH);
    expect(t).not.toMatch(/\/auth\/|Sign in/);
    expect(r.headers.get('content-security-policy')).toContain("font-src 'self'");
  });

  test('/next and its sub-paths redirect to the same page at /', async () => {
    const s = setup();
    for (const [from, to] of [['/next', '/'], ['/next/example', '/example'], ['/next/p/0123456789ab', '/p/0123456789ab']]) {
      const r = await s.get(from);
      expect(r.status).toBe(301);
      expect(r.headers.get('location')).toBe(to);
    }
  });

  test('a shared /p/<id> link names the site', async () => {
    const s = setup();
    const j = await (await s.post('https://a.com/')).json();
    expect(await (await s.get('/p/' + j.id)).text()).toContain('<meta property="og:title" content="Grow plan for a.com">');
    expect((await s.get('/example')).status).toBe(200);
  });

  test('the built files are served long-cached, fonts as woff2', async () => {
    const s = setup();
    const js = await s.get(NEXT_JS_PATH);
    expect(js.headers.get('content-type')).toContain('javascript');
    expect(js.headers.get('cache-control')).toContain('immutable');
    expect((await s.get(NEXT_CSS_PATH)).headers.get('content-type')).toContain('css');
    const font = Object.keys(NEXT_FONTS)[0];
    expect((await s.get(font)).headers.get('content-type')).toBe('font/woff2');
    expect((await s.get('/_app/nope.js')).status).toBe(404);
  });
});

describe('the cabinet in the new design', () => {
  const src = readFileSync(new URL('../web/src/Cabinet.jsx', import.meta.url), 'utf8');
  test('/me serves the Astryx app shell and still sets the cabinet cookie', async () => {
    const res = await handle(new Request('https://grow.flisk.si/me'), { DB: fakeD1(), SESSION_SECRET: 'test-secret' }, { cache: null });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<div id="root">');
    expect(html).toMatch(/\/_app\/app\.[0-9a-f]{12}\.js/);
    expect(html).toContain('noindex');
    expect(html).not.toContain("data-next-cta"); // the old cabinet header is gone
    expect(res.headers.get('set-cookie')).toMatch(/^grow_s=a_/);
    expect(res.headers.get('content-security-policy')).toContain("font-src 'self'");
  });
  test('the old cabinet stays at /classic/me', async () => {
    const res = await handle(new Request('https://grow.flisk.si/classic/me'), { DB: fakeD1(), SESSION_SECRET: 'test-secret' }, { cache: null });
    expect(await res.text()).toContain('My cabinet');
  });
  test('the new cabinet keeps the standard sign-in button and marks the login for the org bar once', () => {
    expect(src).toContain('Start free with GitHub');
    expect(src).toContain('No card. Free to start.');
    expect(src).toContain('/auth/start?utm_source=grow&utm_medium=cta&utm_campaign=free-key');
    expect(src.match(/data-flisk-login/g).length).toBe(2); // the comment and the one attribute
    expect(src).toContain('GH_LOGIN.test(');
  });
});
