import { describe, expect, test } from 'bun:test';
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
  test('/next is the app shell with the Flisk bar and no sign-in', async () => {
    const r = await setup().get('/next');
    expect(r.status).toBe(200);
    const t = await r.text();
    expect(t).toContain('https://flisk.si/assets/bar.js');
    expect(t).toContain(NEXT_JS_PATH);
    expect(t).toContain(NEXT_CSS_PATH);
    expect(t).not.toMatch(/\/auth\/|Sign in/);
    expect(r.headers.get('content-security-policy')).toContain("font-src 'self'");
  });

  test('a shared /next/p/<id> link names the site, and the old page is untouched', async () => {
    const s = setup();
    const j = await (await s.post('https://a.com/')).json();
    expect(await (await s.get('/next/p/' + j.id)).text()).toContain('<meta property="og:title" content="Grow plan for a.com">');
    expect(await (await s.get('/p/' + j.id)).text()).toContain('Share this plan');
    expect((await s.get('/next/example')).status).toBe(200);
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
